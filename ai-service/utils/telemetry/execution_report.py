"""
Campaign Execution Report — Generates structured execution summaries, classifications, and SLA diagnostics.
"""

from typing import Dict, Any, List
from utils.telemetry.pipeline_tracer import CampaignTrace


def classify_execution(trace: CampaignTrace) -> List[str]:
    """Classify execution run status based on latency, retries, cost, and cache efficiency."""
    classifications = []

    total_retries = sum(ag.retry_count for ag in trace.agent_traces.values())
    if total_retries > 0:
        classifications.append("RETRY_HEAVY")

    if trace.total_duration_ms > 60000.0:
        classifications.append("SLOW")

    if trace.estimated_cost_usd > 0.50:
        classifications.append("COSTLY")

    if trace.cache_hit_rate >= 80.0:
        classifications.append("CACHE_EFFICIENT")

    if not classifications:
        classifications.append("HEALTHY")

    return classifications


class CampaignExecutionReport:
    """Formats CampaignTrace into a structured execution diagnostic report with execution classifications."""

    @staticmethod
    def generate_report(trace: CampaignTrace) -> Dict[str, Any]:
        """Generate structured execution summary dictionary from CampaignTrace."""
        slowest_agent = "N/A"
        max_duration = 0.0
        largest_prompt_agent = "N/A"
        max_tokens = 0

        for name, ag in trace.agent_traces.items():
            if ag.duration_ms > max_duration:
                max_duration = ag.duration_ms
                slowest_agent = name
            if ag.input_tokens > max_tokens:
                max_tokens = ag.input_tokens
                largest_prompt_agent = name

        return {
            "telemetry_schema_version": getattr(trace, "telemetry_schema_version", "1.0.0"),
            "campaign_id": trace.campaign_id,
            "trace_id": trace.trace_id,
            "execution_classification": classify_execution(trace),
            "total_runtime_seconds": round(trace.total_duration_ms / 1000.0, 2),
            "total_input_tokens": trace.total_input_tokens,
            "total_output_tokens": trace.total_output_tokens,
            "estimated_cost_usd": trace.estimated_cost_usd,
            "slowest_stage": slowest_agent,
            "slowest_stage_duration_ms": round(max_duration, 2),
            "largest_prompt_stage": largest_prompt_agent,
            "largest_prompt_tokens": max_tokens,
            "cache_hit_rate_pct": trace.cache_hit_rate,
            "agent_node_breakdown": {
                name: {
                    "duration_ms": ag.duration_ms,
                    "llm_latency_ms": ag.llm_latency_ms,
                    "prompt_build_ms": ag.prompt_build_ms,
                    "input_tokens": ag.input_tokens,
                    "output_tokens": ag.output_tokens,
                    "cache_hit": ag.cache_hit,
                    "retry_count": ag.retry_count,
                    "model_name": ag.model_name,
                }
                for name, ag in trace.agent_traces.items()
            }
        }
