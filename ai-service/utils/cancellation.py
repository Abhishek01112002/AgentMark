import logging
from typing import Optional
import redis

from config.settings import REDIS_HOST, REDIS_PORT, REDIS_DB

logger = logging.getLogger("agentmark.cancellation")

# Module-level connection pool and client initialized on demand
_pool: Optional[redis.ConnectionPool] = None
_client: Optional[redis.Redis] = None


def _get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            max_connections=5,
            decode_responses=True,
            socket_connect_timeout=2,  # 2s connect timeout
            socket_timeout=2,          # 2s read/write timeout
        )
    return _pool


def is_campaign_cancelled(campaign_id: Optional[str]) -> bool:
    """
    Check if the campaign has been cancelled via Redis.
    Fail-open: returns False if Redis is down or unreachable, 
    so the campaign continues rather than incorrectly stopping.
    """
    if not campaign_id:
        return False
        
    try:
        global _client
        if _client is None:
            _client = redis.Redis(connection_pool=_get_pool(), decode_responses=True)
        val = _client.get(f"cancel:{campaign_id}")
        return val == "true"
    except Exception as exc:
        logger.warning(
            "Failed to check campaign cancellation status for %s (fail-open) | error=%s",
            campaign_id,
            exc,
        )
        return False
