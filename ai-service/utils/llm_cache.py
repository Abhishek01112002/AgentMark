"""
LLM Response Cache — in-memory, SHA256-keyed, 1-hour TTL.
Avoids duplicate LLM calls when the same agent runs with identical inputs.
"""

import time
import hashlib
import json
import logging
from collections import OrderedDict

logger = logging.getLogger(__name__)

# Use OrderedDict to track insertion order directly (LRU)
# Keys are SHA256 hashes, values are (cached_data, timestamp)
_cache: OrderedDict[str, tuple[any, float]] = OrderedDict()
CACHE_TTL = 3600  # 1 hour
MAX_CACHE_SIZE = 1000  # safety cap to prevent unbounded memory growth


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
    if key not in _cache:
        return None
    data, ts = _cache[key]
    if time.time() - ts > CACHE_TTL:
        del _cache[key]
        return None
    # Move key to end to mark it as most recently used (O(1))
    _cache.move_to_end(key)
    return data


def set(key: str, value: any):
    if key in _cache:
        del _cache[key]
    _cache[key] = (value, time.time())
    _evict_lru()


def clear():
    _cache.clear()
