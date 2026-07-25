"""
Idempotency & Request Hashing Utility — AgentMark AI Pre-Flight Engine

Generates deterministic request hashes and prevents duplicate simulation processing.
"""

import hashlib
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("agentmark.idempotency")

_SIMULATION_CACHE: Dict[str, Any] = {}


def generate_request_hash(copy_text: str, brand_name: str, target_audience: str) -> str:
    """
    Computes deterministic SHA-256 hash of simulation input parameters.
    """
    raw_key = f"{copy_text.strip()}::{brand_name.strip().lower()}::{target_audience.strip().lower()}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()


def get_cached_simulation(request_hash: str) -> Optional[Any]:
    """Retrieves cached simulation result if available."""
    return _SIMULATION_CACHE.get(request_hash)


def store_cached_simulation(request_hash: str, report: Any) -> None:
    """Caches simulation result under request_hash."""
    _SIMULATION_CACHE[request_hash] = report


def clear_idempotency_cache() -> None:
    """Clears cache state for testing."""
    _SIMULATION_CACHE.clear()
