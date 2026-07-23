import os
import logging

logger = logging.getLogger("agentmark-mcp-server")

AGENTMARK_API_URL = os.environ.get("AGENTMARK_API_URL", "http://localhost:5003").rstrip("/")
AGENTMARK_API_KEY = os.environ.get("AGENTMARK_API_KEY")

# Observability Configuration
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Polling and Timings (Staff/FAANG configurable overrides)
POLL_INTERVAL_SECS = int(os.environ.get("AGENTMARK_POLL_INTERVAL_SECS", "5"))
CAMPAIGN_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_CAMPAIGN_TIMEOUT_SECS", "900")) # 15 min default
PUBLISH_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_PUBLISH_TIMEOUT_SECS", "450"))  # 7.5 min default
REVISION_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_REVISION_TIMEOUT_SECS", "600"))  # 10 min default (copywriter only)

# HTTP Pool Tuning Constants
HTTP_MAX_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_CONNECTIONS", "100"))
HTTP_MAX_KEEPALIVE_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_KEEPALIVE", "20"))
HTTP_CONNECT_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_CONNECT_TIMEOUT", "10.0"))
HTTP_READ_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_READ_TIMEOUT", "300.0"))

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
