import httpx
import logging
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type, before_sleep_log
from .config import (
    AGENTMARK_API_URL,
    AGENTMARK_API_KEY,
    HTTP_MAX_CONNECTIONS,
    HTTP_MAX_KEEPALIVE_CONNECTIONS,
    HTTP_CONNECT_TIMEOUT_SECS,
    HTTP_READ_TIMEOUT_SECS
)

logger = logging.getLogger("agentmark-mcp-server")

class TransientAPIError(Exception):
    """Exception raised for transient 5xx or 429 status codes that are retryable."""
    pass

class AgentMarkClient:
    def __init__(self):
        self.base_url = AGENTMARK_API_URL
        self.headers = {
            "Content-Type": "application/json"
        }
        if AGENTMARK_API_KEY:
            self.headers["Authorization"] = f"Bearer {AGENTMARK_API_KEY}"
        
        # FAANG level: Configure connection pool limits explicitly to avoid socket starvation
        limits = httpx.Limits(
            max_connections=HTTP_MAX_CONNECTIONS,
            max_keepalive_connections=HTTP_MAX_KEEPALIVE_CONNECTIONS
        )
        
        # FAANG level: Configure granular connect vs read timeouts
        timeout = httpx.Timeout(
            HTTP_READ_TIMEOUT_SECS,
            connect=HTTP_CONNECT_TIMEOUT_SECS
        )
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            limits=limits,
            timeout=timeout
        )

    async def close(self):
        await self.client.aclose()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def post(self, path: str, payload: Dict[str, Any], extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        headers = self.headers.copy()
        if extra_headers:
            headers.update(extra_headers)
            
        try:
            url = f"{self.base_url}{path}"
            logger.info(f"Sending POST request to {url}")
            response = await self.client.post(path, json=payload, headers=headers)
            
            # Raise for retry on rate limiting or upstream gateways errors
            if response.status_code in [429, 502, 503, 504]:
                raise TransientAPIError(f"Transient status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except httpx.RequestError as e:
            raise TransientAPIError(f"Request error: {str(e)}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        before_sleep=before_sleep_log(logger, logging.WARNING),
        reraise=True
    )
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}{path}"
            logger.info(f"Sending GET request to {url}")
            response = await self.client.get(path, params=params, headers=self.headers)
            
            if response.status_code in [429, 502, 503, 504]:
                raise TransientAPIError(f"Transient status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except httpx.RequestError as e:
            raise TransientAPIError(f"Request error: {str(e)}")
