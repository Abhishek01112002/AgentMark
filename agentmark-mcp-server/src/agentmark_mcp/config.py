import os
import logging

logger = logging.getLogger("agentmark-mcp-server")

AGENTMARK_API_URL = os.environ.get("AGENTMARK_API_URL", "http://localhost:5003").rstrip("/")
AGENTMARK_API_KEY = os.environ.get("AGENTMARK_API_KEY")
REDIS_URL = os.environ.get("REDIS_URL", os.environ.get("REDIS_URI"))

# Observability Configuration
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Polling and Timings (Tuned to ensure zero Claude Desktop 4-minute client timeouts)
POLL_INTERVAL_SECS = int(os.environ.get("AGENTMARK_POLL_INTERVAL_SECS", "4"))
CAMPAIGN_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_CAMPAIGN_TIMEOUT_SECS", "180")) # 3 min max polling budget
PUBLISH_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_PUBLISH_TIMEOUT_SECS", "150"))  # 2.5 min max
REVISION_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_REVISION_TIMEOUT_SECS", "150"))  # 2.5 min max

# HTTP Pool Tuning Constants
HTTP_MAX_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_CONNECTIONS", "100"))
HTTP_MAX_KEEPALIVE_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_KEEPALIVE", "20"))
HTTP_CONNECT_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_CONNECT_TIMEOUT", "10.0"))
HTTP_READ_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_READ_TIMEOUT", "45.0"))

if not AGENTMARK_API_KEY:
    logger.warning(
        "AGENTMARK_API_KEY environment variable is not set. "
        "MCP tool calls to protected backend routes will fail."
    )
elif not AGENTMARK_API_KEY.startswith("am_"):
    logger.warning(
        "AGENTMARK_API_KEY does not start with 'am_'. "
        "Expected a Developer API key generated from the AgentMark dashboard "
        "(format: am_<hex>). A JWT session token will not authenticate MCP tool calls. "
        "Generate a Developer API key via POST /api/developer/keys."
    )
