import datetime
import time
import logging
from typing import Optional
from pydantic import BaseModel, Field
from tavily import TavilyClient
import os
import redis
from config.settings import REDIS_HOST, REDIS_PORT, REDIS_DB

logger = logging.getLogger(__name__)

DAILY_SEARCH_LIMIT = 100

class SearchResult(BaseModel):
    success: bool
    query: str
    snippets: list[str] = Field(default_factory=list)
    error_message: Optional[str] = None

# Initialize once at module level — not per call
_tavily_client: Optional[TavilyClient] = None
_redis_pool: Optional[redis.ConnectionPool] = None

def _get_client() -> Optional[TavilyClient]:
    global _tavily_client
    if _tavily_client is None:
        api_key = os.getenv("TAVILY_API_KEY")
        if not api_key:
            logger.warning("TAVILY_API_KEY not set — search disabled")
            return None
        try:
            _tavily_client = TavilyClient(api_key=api_key)
        except Exception as e:
            logger.error(f"Tavily client init failed: {e}")
            return None
    return _tavily_client

def _get_redis_pool() -> redis.ConnectionPool:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            max_connections=10,
            decode_responses=True,
            socket_connect_timeout=5,  # 5s connection timeout
            socket_timeout=5,           # 5s read/write timeout
            retry_on_timeout=True,
        )
    return _redis_pool

def _check_redis_rate_limit(redis_client) -> bool:
    """Returns True if search is allowed, False if limit exceeded."""
    try:
        key = f"literag:search_count:{datetime.date.today().isoformat()}"
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, 86400)
        if count > DAILY_SEARCH_LIMIT:
            logger.warning(f"Daily search limit {DAILY_SEARCH_LIMIT} reached — skipping")
            return False
        return True
    except Exception as e:
        # Redis failure must not block search
        logger.warning(f"Redis rate limit check failed: {e} — allowing search")
        return True

def search_web(
    query: str,
    redis_client=None,
    max_results: int = 3
) -> SearchResult:
    """
    NEVER raises an exception. Always returns SearchResult.
    Caller needs no try/except around this.
    """
    start = time.monotonic()

    client = _get_client()
    if client is None:
        return SearchResult(
            success=False, query=query,
            error_message="Tavily client not initialized"
        )

    # If no redis_client is provided, try to get one using the shared pool
    if redis_client is None:
        try:
            redis_client = redis.Redis(connection_pool=_get_redis_pool(), decode_responses=True)
        except Exception as e:
            logger.warning(f"Could not initialize Redis client in search_service: {e}")

    if redis_client and not _check_redis_rate_limit(redis_client):
        return SearchResult(
            success=False, query=query,
            error_message="Daily rate limit reached"
        )

    try:
        response = client.search(
            query=query,
            max_results=max_results,
            search_depth="basic",
            timeout=5  # hard 5-second limit
        )
        snippets = [
            r.get("content", "").strip()
            for r in response.get("results", [])
            if r.get("content", "").strip()
        ]
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.info(
            f"Search OK | query='{query[:50]}' | "
            f"snippets={len(snippets)} | latency={latency_ms}ms"
        )
        return SearchResult(success=True, query=query, snippets=snippets)

    except Exception as e:
        latency_ms = int((time.monotonic() - start) * 1000)
        logger.error(f"Search FAILED | query='{query[:50]}' | error={e} | latency={latency_ms}ms")
        return SearchResult(success=False, query=query, error_message=str(e))
