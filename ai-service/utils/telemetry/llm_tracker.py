"""
OpenTelemetry & Prometheus-compatible Telemetry Tracker for LLM Operations.

Tracks cached token efficiency, minification byte savings, pre-validation repairs,
and schema enum drift alerts across all LLM providers.
"""

import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Dict

logger = logging.getLogger(__name__)


@dataclass
class TelemetryMetrics:
    total_prompt_tokens: int = 0
    total_completion_tokens: int = 0
    cached_prompt_tokens: int = 0
    minification_saved_bytes: int = 0
    pre_validation_repairs: int = 0
    schema_drift_alerts: int = 0
    provider_calls: Dict[str, int] = field(default_factory=dict)


class LLMTelemetryTracker:
    """Thread-safe singleton metrics collector for LLM operations."""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._metrics = TelemetryMetrics()
            return cls._instance

    def record_usage(self, provider: str, prompt_tokens: int, completion_tokens: int, cached_tokens: int = 0) -> None:
        """Record provider token usage including cached prompt tokens."""
        with self._lock:
            self._metrics.total_prompt_tokens += prompt_tokens
            self._metrics.total_completion_tokens += completion_tokens
            self._metrics.cached_prompt_tokens += cached_tokens
            self._metrics.provider_calls[provider] = self._metrics.provider_calls.get(provider, 0) + 1
            
            logger.info(
                f"[TELEMETRY] Provider: {provider} | Prompt Tokens: {prompt_tokens} "
                f"(Cached: {cached_tokens}) | Completion Tokens: {completion_tokens}"
            )

    def record_minification_saving(self, saved_bytes: int) -> None:
        """Record byte savings from BPE minification."""
        if saved_bytes > 0:
            with self._lock:
                self._metrics.minification_saved_bytes += saved_bytes

    def record_schema_drift(self, field_name: str, invalid_value: Any) -> None:
        """Record schema enum drift alert when unmapped code triggers fallback."""
        with self._lock:
            self._metrics.schema_drift_alerts += 1
            logger.warning(
                f"[SCHEMA DRIFT ALERT] Unmapped code/enum on field '{field_name}': {invalid_value} "
                f"(Total Drift Alerts: {self._metrics.schema_drift_alerts})"
            )

    def record_pre_validation_repair(self, agent_name: str, repair_details: str) -> None:
        """Record local deterministic repair action."""
        with self._lock:
            self._metrics.pre_validation_repairs += 1
            logger.info(f"[LOCAL REPAIR] Agent: {agent_name} | Action: {repair_details}")

    def get_summary(self) -> Dict[str, Any]:
        """Return current snapshot of telemetry metrics."""
        with self._lock:
            cache_hit_pct = (
                round((self._metrics.cached_prompt_tokens / self._metrics.total_prompt_tokens) * 100, 2)
                if self._metrics.total_prompt_tokens > 0
                else 0.0
            )
            return {
                "total_prompt_tokens": self._metrics.total_prompt_tokens,
                "total_completion_tokens": self._metrics.total_completion_tokens,
                "cached_prompt_tokens": self._metrics.cached_prompt_tokens,
                "cache_hit_pct": cache_hit_pct,
                "minification_saved_bytes": self._metrics.minification_saved_bytes,
                "pre_validation_repairs": self._metrics.pre_validation_repairs,
                "schema_drift_alerts": self._metrics.schema_drift_alerts,
                "provider_calls": dict(self._metrics.provider_calls),
            }


# Global helper instance getter
def get_telemetry_tracker() -> LLMTelemetryTracker:
    return LLMTelemetryTracker()
