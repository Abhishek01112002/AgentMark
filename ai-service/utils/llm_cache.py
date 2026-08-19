"""
LLM Response Cache — backed by Redis with 24-hour TTL, falling back to in-memory 1-hour TTL.
Avoids duplicate LLM calls when the same agent runs with identical inputs.
"""

import time
import hashlib
import json
import logging
from collections import OrderedDict
import redis

from config.settings import get_redis_pool

logger = logging.getLogger(__name__)

# Use OrderedDict to track insertion order directly (LRU)
# Keys are SHA256 hashes, values are (cached_data, timestamp)
_cache: OrderedDict[str, tuple[any, float]] = OrderedDict()
CACHE_TTL = 3600  # 1 hour in-memory
MAX_CACHE_SIZE = 1000  # safety cap to prevent unbounded memory growth

_redis_client = None
_redis_pool = None


def _get_redis():
    """Lazily initialize Redis client connection pool."""
    global _redis_client, _redis_pool
    if _redis_client is not None:
        return _redis_client
    try:
        if _redis_pool is None:
            _redis_pool = get_redis_pool(
                max_connections=10,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
        _redis_client = redis.Redis(connection_pool=_redis_pool, decode_responses=True)
        return _redis_client
    except Exception as exc:
        logger.debug("Redis not available for LLM caching: %s", exc)
        return None


def make_key(agent_name: str, **params) -> str:
    """Deterministic cache key from agent name + all prompt parameters."""
    hasher = hashlib.sha256()
    hasher.update(agent_name.encode())
    for k in sorted(params.keys()):
        hasher.update(k.encode())
        val = params[k]
        if isinstance(val, str):
            hasher.update(val.encode())
        else:
            hasher.update(json.dumps(val, sort_keys=True, default=str).encode())
    return hasher.hexdigest()


def _evict_lru():
    """Remove oldest entries until under MAX_CACHE_SIZE."""
    while len(_cache) > MAX_CACHE_SIZE:
        _cache.popitem(last=False)


def get(key: str) -> object | None:
    # 1. Check in-memory cache first
    if key in _cache:
        data, ts = _cache[key]
        if time.time() - ts <= CACHE_TTL:
            _cache.move_to_end(key)
            return data
        else:
            del _cache[key]

    # 2. Check Redis cache
    r = _get_redis()
    if r:
        try:
            cached_raw = r.get(f"llm:cache:{key}")
            if cached_raw:
                data = json.loads(cached_raw)
                # Store in-memory LRU cache for fast subsequent hits
                if key in _cache:
                    del _cache[key]
                _cache[key] = (data, time.time())
                _evict_lru()
                logger.debug("LLM cache hit (Redis) | key=%s", key[:15])
                return data
        except Exception as exc:
            logger.warning("Failed to read from Redis cache (non-fatal): %s", exc)

    return None


def set(key: str, value: any):
    # 1. Save in memory cache
    if key in _cache:
        del _cache[key]
    _cache[key] = (value, time.time())
    _evict_lru()

    # 2. Save in Redis with 24 hours TTL (86400 seconds)
    r = _get_redis()
    if r:
        try:
            r.set(f"llm:cache:{key}", json.dumps(value), ex=86400)
        except Exception as exc:
            logger.warning("Failed to write to Redis cache (non-fatal): %s", exc)


def clear():
    _cache.clear()
    r = _get_redis()
    if r:
        try:
            keys = r.keys("llm:cache:*")
            if keys:
                r.delete(*keys)
        except Exception as exc:
            logger.warning("Failed to clear Redis cache: %s", exc)
