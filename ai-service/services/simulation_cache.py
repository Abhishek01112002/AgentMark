"""
Deterministic Simulation Cache Service — AgentMark AI Pre-Flight Engine (Phase 2C)

Caches deterministic agent outputs with configurable TTL.
Does NOT cache personalized user metadata or real-time telemetry inputs.
"""

import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("agentmark.simulation_cache")

_LOCAL_CACHE_STORE: Dict[str, str] = {}


def get_cached_agent_output(cache_key: str, organization_id: str = "org_default") -> Optional[Dict[str, Any]]:
    """Retrieves cached agent output with strict organization_id tenant isolation."""
    if not organization_id:
        return None

    full_key = f"cache:agent:{organization_id}:{cache_key}"
    try:
        from services.redis_client import get_redis_client
        redis_client = get_redis_client()
        if redis_client:
            val = redis_client.get(full_key)
            if val:
                return json.loads(val)
    except Exception:
        pass

    raw_val = _LOCAL_CACHE_STORE.get(full_key)
    if raw_val:
        return json.loads(raw_val)
    return None


def store_cached_agent_output(cache_key: str, data: Dict[str, Any], organization_id: str = "org_default", ttl_seconds: int = 86400) -> None:
    """Stores deterministic agent output with strict organization_id tenant isolation."""
    if not organization_id:
        return

    full_key = f"cache:agent:{organization_id}:{cache_key}"
    payload_str = json.dumps(data)
    try:
        from services.redis_client import get_redis_client
        redis_client = get_redis_client()
        if redis_client:
            redis_client.set(full_key, payload_str, ex=ttl_seconds)
    except Exception:
        pass

    _LOCAL_CACHE_STORE[full_key] = payload_str


def clear_simulation_cache() -> None:
    """Clears simulation cache store for tests."""
    _LOCAL_CACHE_STORE.clear()
