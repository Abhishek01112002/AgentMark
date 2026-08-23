"""
Configuration and environment variable management
"""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Groq Configuration (Optional)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Redis Configuration
#
# REDIS_URL takes priority over REDIS_HOST/REDIS_PORT/REDIS_DB when set.
# Managed providers (e.g. Upstash) supply a single TLS URL (rediss://...).
# Local Docker Compose leaves REDIS_URL unset and uses the host/port/db fallback.
DEFAULT_REDIS_URL = "rediss://default:gQAAAAAAAmk1AAIgcDIzNjdiYzViMTJiMzI0ZjIyOGQyOTk3YzE3MDY4NDE3Zg@intense-iguana-158005.upstash.io:6379"

REDIS_URL = os.getenv("REDIS_URL") or os.getenv("UPSTASH_REDIS_URL")
if not REDIS_URL and (os.getenv("ENV") == "production" or os.getenv("RENDER") or os.getenv("PORT")):
    REDIS_URL = DEFAULT_REDIS_URL

if REDIS_URL and "upstash.io" in REDIS_URL and REDIS_URL.startswith("redis://"):
    REDIS_URL = "rediss://" + REDIS_URL[len("redis://"):]

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))


def get_redis_pool(
    max_connections: int = 10,
    decode_responses: bool = True,
    **kwargs,
) -> "redis.ConnectionPool":
    """
    Create a redis.ConnectionPool from REDIS_URL (TLS) or HOST/PORT/DB.

    Pass extra kwargs (e.g. socket_connect_timeout, retry_on_timeout) as needed.
    All Redis clients in the AI service call this factory so TLS support is
    centralised here rather than duplicated across each module.
    """
    import redis as _redis

    if REDIS_URL:
        pool_kwargs = {
            "max_connections": max_connections,
            "decode_responses": decode_responses,
            **kwargs,
        }
        if REDIS_URL.startswith("rediss://"):
            pool_kwargs.setdefault("ssl_cert_reqs", None)
        return _redis.ConnectionPool.from_url(
            REDIS_URL,
            **pool_kwargs,
        )
    return _redis.ConnectionPool(
        host=REDIS_HOST,
        port=REDIS_PORT,
        db=REDIS_DB,
        max_connections=max_connections,
        decode_responses=decode_responses,
        **kwargs,
    )

# Service Configuration
SERVICE_PORT = int(os.getenv("SERVICE_PORT", os.getenv("PORT", 5002)))
SERVICE_HOST = os.getenv("SERVICE_HOST", os.getenv("HOST", "0.0.0.0"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Backend Service URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5003")

# WebSocket Configuration
WS_URL = os.getenv("WS_URL", "ws://localhost:5002")

# Feature Flags
ENABLE_CREATIVE_HOOK_MATRIX = os.getenv("ENABLE_CREATIVE_HOOK_MATRIX", "false").lower() in ("true", "1")

# Quality and Revision Threshold Constants (Single Source of Truth)
MAX_AUTO_REVISIONS: int = 3
MAX_HUMAN_REVISIONS: int = 3
MIN_AGENT_SCORE: int = 60
MIN_QUALITY_SCORE: int = 70

# Keys are optional now; the frontend can supply them per request.
