"""
Rate Limiter — proactive RPM tracker per provider/key.
Checks BEFORE calling so we never waste a request on a known-rate-limited key.
"""

import time
import logging
import threading
from collections import defaultdict

logger = logging.getLogger(__name__)

# Known per-key RPM limits (conservative limits for free tier API keys)
RPM_LIMITS: dict[str, int] = {
    "groq": 25,
    "gemini": 12,  # Google Gemini free tier has a strict 15 RPM limit; 12 prevents HTTP 429
    "openai": 200,
}

# Max unique key IDs to track (safety cap against memory leak)
MAX_KEYS_TRACKED = 50


class RateLimiter:
    """
    In-memory sliding-window rate limiter per provider key.
    Tracks timestamps of recent requests and rejects if the window is full.
    Thread-safe (uses Lock for all mutations).
    """

    def __init__(self):
        self._requests: dict[str, list[float]] = {}
        self._cooling: dict[str, float] = {}
        self._lock = threading.Lock()

    def can_make_request(self, key_id: str, provider: str) -> bool:
        now = time.time()
        window_start = now - 60.0

        with self._lock:
            # Check forced cooldown
            cooldown_until = self._cooling.get(key_id, 0.0)
            if now < cooldown_until:
                return False

            # Prune expired timestamps
            existing = self._requests.get(key_id, [])
            pruned = [t for t in existing if t > window_start]
            if pruned:
                self._requests[key_id] = pruned
            elif existing:
                del self._requests[key_id]

            limit = RPM_LIMITS.get(provider, 15)
            return len(pruned) < limit

    def record_request(self, key_id: str):
        now = time.time()
        with self._lock:
            if key_id not in self._requests:
                if len(self._requests) >= MAX_KEYS_TRACKED:
                    oldest = min(self._requests, key=lambda k: self._requests[k][-1] if self._requests[k] else 0)
                    del self._requests[oldest]
                self._requests[key_id] = []
            self._requests[key_id].append(now)

    def mark_cooldown(self, key_id: str, duration: float = 30.0):
        now = time.time()
        with self._lock:
            self._cooling[key_id] = now + duration
            # NOTE: Do NOT fill _requests with fake timestamps.
            # The old code did `self._requests[key_id] = [now] * limit` which
            # double-blocked keys: after the cooldown expired, the fake timestamps
            # were still inside the 60s sliding window, causing continued rejection.

    def soonest_available(self) -> float | None:
        """Return the number of seconds until the soonest cooling key becomes available.
        Returns None if no keys are cooling (meaning something else is wrong)."""
        now = time.time()
        with self._lock:
            if not self._cooling:
                return None
            soonest = min(self._cooling.values())
            wait = soonest - now
            return max(wait, 0.0)

    def clear_cooldowns(self):
        """Emergency reset: clear all cooldown timers."""
        with self._lock:
            self._cooling.clear()


_rate_limiter_instance: RateLimiter | None = None


def get_rate_limiter() -> RateLimiter:
    global _rate_limiter_instance
    if _rate_limiter_instance is None:
        _rate_limiter_instance = RateLimiter()
    return _rate_limiter_instance


def reset_rate_limiter():
    global _rate_limiter_instance
    _rate_limiter_instance = None
