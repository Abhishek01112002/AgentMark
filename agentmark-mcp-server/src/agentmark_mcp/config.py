import os
import logging

logger = logging.getLogger("agentmark-mcp-server")

AGENTMARK_API_URL = os.environ.get("AGENTMARK_API_URL", "http://localhost:5000").rstrip("/")
AGENTMARK_API_KEY = os.environ.get("AGENTMARK_API_KEY")

# Observability Configuration
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()

# Polling and Timings (Staff/FAANG configurable overrides)
POLL_INTERVAL_SECS = int(os.environ.get("AGENTMARK_POLL_INTERVAL_SECS", "5"))
CAMPAIGN_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_CAMPAIGN_TIMEOUT_SECS", "900")) # 15 min default
PUBLISH_TIMEOUT_SECS = int(os.environ.get("AGENTMARK_PUBLISH_TIMEOUT_SECS", "450"))  # 7.5 min default

# HTTP Pool Tuning Constants
HTTP_MAX_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_CONNECTIONS", "100"))
HTTP_MAX_KEEPALIVE_CONNECTIONS = int(os.environ.get("AGENTMARK_HTTP_MAX_KEEPALIVE", "20"))
HTTP_CONNECT_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_CONNECT_TIMEOUT", "10.0"))
HTTP_READ_TIMEOUT_SECS = float(os.environ.get("AGENTMARK_HTTP_READ_TIMEOUT", "300.0"))

if not AGENTMARK_API_KEY:
    logger.warning(
        "⚠️  AGENTMARK_API_KEY environment variable is not set. "
        "MCP tool calls to protected backend routes will fail."
    )
