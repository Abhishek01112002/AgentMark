"""
Strategy Summary Builder — Normalizes and extracts strategy positioning for Reviewer.
"""

import json
from typing import Any, Dict, List
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


def _summarize_audience_segments(raw_segments: Any) -> List[str]:
    """Normalize strategy audience segments into compact reviewer-readable strings."""
    if not isinstance(raw_segments, list):
        return []

    summaries: List[str] = []
    for segment in raw_segments[:3]:
        if isinstance(segment, str):
            text = segment.strip()
        elif isinstance(segment, dict):
            name = segment.get("segment_name") or segment.get("name") or "Audience segment"
            pain_point = segment.get("pain_point") or segment.get("pain_points") or ""
            motivation = segment.get("motivation") or segment.get("motivations") or ""
            messaging = segment.get("messaging") or segment.get("key_message") or ""
            parts = [str(name).strip()]
            for label, value in (
                ("pain", pain_point),
                ("motivation", motivation),
                ("message", messaging),
            ):
                if isinstance(value, list):
                    value = ", ".join(str(item).strip() for item in value if str(item).strip())
                value_text = str(value).strip()
                if value_text:
                    parts.append(f"{label}: {value_text}")
            text = " | ".join(parts)
        else:
            text = str(segment).strip()

        if text:
            summaries.append(text[:240])

    return summaries


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
        audience_segments=_summarize_audience_segments(data.get("audience_segments")),
        channel_priorities=channels_summary,
        strategic_approach=(data.get("strategic_approach") or "")[:150],
    )
