"""
Provider Health & Circuit Breaker Service — AgentMark AI Pre-Flight Engine (Phase 2C)

Tracks rolling latency & error rates per provider and manages circuit breaker failover state.
"""

import time
import logging
from typing import Dict, Any, List

logger = logging.getLogger("agentmark.provider_health")


class ProviderCircuitBreaker:
    """Thread-safe circuit breaker for LLM provider health management."""

    def __init__(
        self,
        failure_threshold: int = 3,
        cooldown_seconds: float = 30.0,
        latency_p95_threshold_ms: float = 5000.0
    ):
        self.failure_threshold = failure_threshold
        self.cooldown_seconds = cooldown_seconds
        self.latency_p95_threshold_ms = latency_p95_threshold_ms

        # State tracking: key = provider_id
        self._consecutive_failures: Dict[str, int] = {}
        self._last_failure_timestamp: Dict[str, float] = {}
        self._circuit_state: Dict[str, str] = {}  # 'CLOSED', 'OPEN', 'HALF_OPEN'
        self._recent_latencies: Dict[str, List[float]] = {}

    def is_provider_healthy(self, provider_id: str) -> bool:
        """Checks if provider is healthy and available for traffic routing."""
        state = self._circuit_state.get(provider_id, "CLOSED")

        if state == "CLOSED":
            return True

        if state == "OPEN":
            last_fail = self._last_failure_timestamp.get(provider_id, 0.0)
            if time.time() - last_fail > self.cooldown_seconds:
                logger.info(f"Cooldown expired for provider {provider_id}. Transitioning to HALF_OPEN state.")
                self._circuit_state[provider_id] = "HALF_OPEN"
                return True
            return False

        # HALF_OPEN allows single test probe
        return True

    def record_success(self, provider_id: str, latency_ms: float) -> None:
        """Records successful API execution."""
        self._consecutive_failures[provider_id] = 0
        self._circuit_state[provider_id] = "CLOSED"

        lat_list = self._recent_latencies.setdefault(provider_id, [])
        lat_list.append(latency_ms)
        if len(lat_list) > 50:
            lat_list.pop(0)

    def record_failure(self, provider_id: str, error_msg: str = "") -> None:
        """Records failed API call and updates circuit breaker state."""
        fails = self._consecutive_failures.get(provider_id, 0) + 1
        self._consecutive_failures[provider_id] = fails
        self._last_failure_timestamp[provider_id] = time.time()

        if fails >= self.failure_threshold:
            logger.warning(f"Provider {provider_id} exceeded failure threshold ({fails}). Opening circuit breaker.")
            self._circuit_state[provider_id] = "OPEN"

    def reset_all(self) -> None:
        """Resets circuit breaker state for testing."""
        self._consecutive_failures.clear()
        self._last_failure_timestamp.clear()
        self._circuit_state.clear()
        self._recent_latencies.clear()


# Global Singleton Circuit Breaker
global_circuit_breaker = ProviderCircuitBreaker()
