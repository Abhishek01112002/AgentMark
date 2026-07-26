"""
Execution Analyzer — Consumes CampaignTrace and produces SLA performance budget checks,
confidence-tagged diagnostic observations, percentile SLA calculations, and operational alert hooks.
"""

import logging
import math
from typing import List, Dict, Any, Callable
from pydantic import BaseModel
from utils.telemetry.pipeline_tracer import CampaignTrace

logger = logging.getLogger("agentmark.telemetry.analyzer")


class DiagnosticObservation(BaseModel):
    confidence: str = "HIGH"  # HIGH, MEDIUM, LOW
    category: str = "PERFORMANCE"  # PERFORMANCE, BUDGET, CACHE, RETRY
    summary: str
    details: Dict[str, Any] = {}


# Alert Handler Hook Registry
_alert_hooks: List[Callable[[DiagnosticObservation], None]] = []


def register_alert_hook(hook: Callable[[DiagnosticObservation], None]) -> None:
    """Register an operational alert handler hook (e.g. for Slack / PagerDuty / Sentry alerts)."""
    _alert_hooks.append(hook)


def trigger_alerts(observation: DiagnosticObservation) -> None:
    """Dispatch alert observation to registered operational alert hooks."""
    for hook in _alert_hooks:
        try:
            hook(observation)
        except Exception as exc:
            logger.error("Error executing alert hook: %s", exc)


class ExecutionAnalyzer:
    """Produces SLA performance budget checks, percentile SLA metrics, and operational alerts."""

    # SLA Performance Budgets per agent (in ms)
    AGENT_BUDGETS_MS: Dict[str, float] = {
        "manager": 5000.0,
        "research": 10000.0,
        "strategy": 10000.0,
        "copywriter": 25000.0,
        "image_prompt": 8000.0,
        "reviewer": 6000.0,
    }

    # 7-day Historical Baselines (in ms)
    HISTORICAL_BASELINES_MS: Dict[str, float] = {
        "manager": 3500.0,
        "research": 7500.0,
        "strategy": 6800.0,
        "copywriter": 18000.0,
        "image_prompt": 4500.0,
        "reviewer": 4200.0,
    }

    @staticmethod
    def calculate_percentiles(durations: List[float]) -> Dict[str, float]:
        """Calculate P50, P95, P99 percentile metrics from execution duration samples."""
        if not durations:
            return {"p50": 0.0, "p95": 0.0, "p99": 0.0}
        s = sorted(durations)
        n = len(s)

        def pct(p: float) -> float:
            idx = int(math.ceil(p * n)) - 1
            return s[max(0, min(idx, n - 1))]

        return {
            "p50": round(pct(0.50), 2),
            "p95": round(pct(0.95), 2),
            "p99": round(pct(0.99), 2),
        }

    @classmethod
    def analyze(cls, trace: CampaignTrace) -> List[DiagnosticObservation]:
        """Produce structured diagnostic observations with confidence levels and trigger alert hooks if budgets fail."""
        observations: List[DiagnosticObservation] = []

        if trace.total_duration_ms <= 0:
            return [DiagnosticObservation(confidence="HIGH", category="PERFORMANCE", summary="No execution timing data recorded.")]

        # 1. Performance Budget & Historical Drift Checks
        for name, ag in trace.agent_traces.items():
            budget = cls.AGENT_BUDGETS_MS.get(name, 10000.0)
            baseline = cls.HISTORICAL_BASELINES_MS.get(name, 5000.0)

            if ag.duration_ms > budget:
                obs = DiagnosticObservation(
                    confidence="HIGH",
                    category="BUDGET",
                    summary=f"Stage '{name}' exceeded performance budget! ({ag.duration_ms}ms vs budget {budget}ms)",
                    details={"actual_ms": ag.duration_ms, "budget_ms": budget}
                )
                observations.append(obs)
                trigger_alerts(obs)

            if ag.duration_ms > (baseline * 1.25):
                drift_pct = round(((ag.duration_ms - baseline) / baseline) * 100, 1)
                observations.append(
                    DiagnosticObservation(
                        confidence="MEDIUM",
                        category="PERFORMANCE",
                        summary=f"Stage '{name}' detected performance drift (+{drift_pct}% vs baseline of {baseline}ms)",
                        details={"actual_ms": ag.duration_ms, "baseline_ms": baseline, "drift_pct": drift_pct}
                    )
                )

        # 2. Prompt Cache Eligibility & Hit Observation
        if trace.cache_hit_rate >= 80.0:
            observations.append(
                DiagnosticObservation(
                    confidence="HIGH",
                    category="CACHE",
                    summary=f"Prompt cache hit rate optimal at {trace.cache_hit_rate}%.",
                    details={"cache_hit_rate": trace.cache_hit_rate}
                )
            )
        elif trace.cache_hit_rate < 50.0:
            obs = DiagnosticObservation(
                confidence="HIGH",
                category="CACHE",
                summary=f"Prompt cache hit rate degraded ({trace.cache_hit_rate}% hit rate).",
                details={"cache_hit_rate": trace.cache_hit_rate}
            )
            observations.append(obs)
            trigger_alerts(obs)

        # 3. Retries Check
        total_retries = sum(ag.retry_count for ag in trace.agent_traces.values())
        if total_retries == 0:
            observations.append(
                DiagnosticObservation(
                    confidence="HIGH",
                    category="RETRY",
                    summary="No retries detected — execution pipeline ran cleanly.",
                    details={"total_retries": 0}
                )
            )
        else:
            obs = DiagnosticObservation(
                confidence="HIGH",
                category="RETRY",
                summary=f"Detected {total_retries} total retry event(s) across agent invocations.",
                details={"total_retries": total_retries}
            )
            observations.append(obs)
            trigger_alerts(obs)

        return observations
