import httpx
import logging
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from .config import AGENTMARK_API_URL, AGENTMARK_API_KEY

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
        
        self.client = httpx.AsyncClient(
            base_url=self.base_url,
            headers=self.headers,
            timeout=300.0  # Long timeout for multi-agent execution loops
        )

    async def close(self):
        await self.client.aclose()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
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
            
            # If rate limited or server error, raise TransientAPIError for retry
            if response.status_code in [429, 502, 503, 504]:
                logger.warning(f"Transient status {response.status_code} received from {path}. Retrying...")
                raise TransientAPIError(f"Status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except httpx.RequestError as e:
            logger.warning(f"Connection failure calling {path}: {str(e)}. Retrying...")
            raise TransientAPIError(f"Request error: {str(e)}")

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(TransientAPIError),
        reraise=True
    )
    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}{path}"
            logger.info(f"Sending GET request to {url}")
            response = await self.client.get(path, params=params, headers=self.headers)
            
            # If rate limited or server error, raise TransientAPIError for retry
            if response.status_code in [429, 502, 503, 504]:
                logger.warning(f"Transient status {response.status_code} received from {path}. Retrying...")
                raise TransientAPIError(f"Status {response.status_code}: {response.text}")
                
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except httpx.RequestError as e:
            logger.warning(f"Connection failure calling {path}: {str(e)}. Retrying...")
            raise TransientAPIError(f"Request error: {str(e)}")
