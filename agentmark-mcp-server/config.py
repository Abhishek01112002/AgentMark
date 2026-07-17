import os
import logging

logger = logging.getLogger("agentmark-mcp-server")

AGENTMARK_API_URL = os.environ.get("AGENTMARK_API_URL", "http://localhost:5000").rstrip("/")
AGENTMARK_API_KEY = os.environ.get("AGENTMARK_API_KEY")

if not AGENTMARK_API_KEY:
    logger.warning(
        "⚠️  AGENTMARK_API_KEY environment variable is not set. "
        "MCP tool calls to protected backend routes will fail."
    )
