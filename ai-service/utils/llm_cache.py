"""
LLM Response Cache — in-memory, SHA256-keyed, 1-hour TTL.
Avoids duplicate LLM calls when the same agent runs with identical inputs.
"""

import time
import hashlib
import json
import logging

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[any, float]] = {}
CACHE_TTL = 3600  # 1 hour
MAX_CACHE_SIZE = 1000  # safety cap to prevent unbounded memory growth
_cache_order: list[str] = []  # LRU tracking — front = most recent


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
    while len(_cache) >= MAX_CACHE_SIZE:
        oldest_key = _cache_order.pop(0)
        _cache.pop(oldest_key, None)


def get(key: str) -> object | None:
    if key not in _cache:
        return None
    data, ts = _cache[key]
    if time.time() - ts > CACHE_TTL:
        del _cache[key]
        if key in _cache_order:
            _cache_order.remove(key)
        return None
    # Move to front (most recently used)
    if key in _cache_order:
        _cache_order.remove(key)
    _cache_order.append(key)
    return data


def set(key: str, value: any):
    _cache[key] = (value, time.time())
    if key in _cache_order:
        _cache_order.remove(key)
    _cache_order.append(key)
    _evict_lru()


def clear():
    _cache.clear()
    _cache_order.clear()
