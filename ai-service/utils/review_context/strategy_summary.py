"""
Strategy Summary Builder — Normalizes and extracts strategy positioning for Reviewer.
"""

import json
from typing import Any, Dict
from utils.review_context.models import StrategySummary


def _safe_parse_json(raw: Any) -> Dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return {}


def build_strategy_summary(strategy_raw: Any) -> StrategySummary:
    """Extract positioning, key messaging pillars, and channel priorities."""
    data = _safe_parse_json(strategy_raw)
    if not data:
        return StrategySummary(status="EMPTY")

    channel_strategy = data.get("channel_strategy", {})
    channels_summary = {}
    if isinstance(channel_strategy, dict):
        for ch, plan in channel_strategy.items():
            if isinstance(plan, dict):
                channels_summary[ch] = {
                    "priority": plan.get("priority", "medium"),
                    "rationale": (plan.get("rationale") or "")[:80],
                }

    return StrategySummary(
        status="VALIDATED",
        positioning=data.get("positioning", ""),
        key_messages=(data.get("key_messages") or [])[:3],
        content_pillars=(data.get("content_pillars") or [])[:3],
        audience_segments=(data.get("audience_segments") or [])[:3],
        channel_priorities=channels_summary,
        strategic_approach=(data.get("strategic_approach") or "")[:150],
    )
