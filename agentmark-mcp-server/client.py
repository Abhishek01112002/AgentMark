import httpx
import logging
from typing import Dict, Any, Optional
from config import AGENTMARK_API_URL, AGENTMARK_API_KEY

logger = logging.getLogger("agentmark-mcp-server")

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

    async def post(self, path: str, payload: Dict[str, Any], extra_headers: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
        headers = self.headers.copy()
        if extra_headers:
            headers.update(extra_headers)
            
        try:
            url = f"{self.base_url}{path}"
            logger.info(f"Sending POST request to {url}")
            response = await self.client.post(path, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except Exception as e:
            logger.error(f"Request connection error calling {path}: {str(e)}")
            raise RuntimeError(f"Failed to reach AgentMark API: {str(e)}")

    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}{path}"
            logger.info(f"Sending GET request to {url}")
            response = await self.client.get(path, params=params, headers=self.headers)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            status_code = e.response.status_code
            error_text = e.response.text
            logger.error(f"API status error {status_code} calling {path}: {error_text}")
            raise RuntimeError(f"AgentMark API returned error {status_code}: {error_text}")
        except Exception as e:
            logger.error(f"Request connection error calling {path}: {str(e)}")
            raise RuntimeError(f"Failed to reach AgentMark API: {str(e)}")
