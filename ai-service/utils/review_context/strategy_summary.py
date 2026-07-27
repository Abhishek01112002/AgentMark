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
    """Extract positioning, key messaging pillars, timeline, success metrics, and field presence."""
    data = _safe_parse_json(strategy_raw)
    if not data:
        return StrategySummary(status="EMPTY")

    channel_strategy = data.get("channel_strategy", {})
    channels_summary = {}
    if isinstance(channel_strategy, dict):
        for ch, plan in channel_strategy.items():
            if isinstance(plan, dict):
                channels_summary[ch] = {
                    "priority": str(plan.get("priority", "medium")),
                    "rationale": str(plan.get("rationale") or "")[:120],
                }

    raw_timeline = data.get("timeline") or data.get("content_calendar") or {}
    timeline_summary = {}
    if isinstance(raw_timeline, dict):
        timeline_summary = {k: str(v)[:80] for k, v in list(raw_timeline.items())[:4]}
    elif isinstance(raw_timeline, list):
        timeline_summary = {f"phase_{i+1}": str(v)[:80] for i, v in enumerate(raw_timeline[:4])}

    raw_metrics = data.get("success_metrics") or data.get("kpis") or []
    metrics_summary = []
    if isinstance(raw_metrics, list):
        metrics_summary = [str(m)[:100] for m in raw_metrics[:3]]
    elif isinstance(raw_metrics, dict):
        metrics_summary = [f"{k}: {str(v)[:80]}" for k, v in list(raw_metrics.items())[:3]]

    comp_diff = str(data.get("competitive_differentiation") or "N/A")[:120]
    inf_goal = str(data.get("inferred_goal") or "").strip()
    res_found = bool(data.get("research_foundation"))
    exec_plan = bool(data.get("execution"))

    field_presence = {
        "positioning": bool(data.get("positioning")),
        "key_messages": bool(data.get("key_messages")),
        "content_pillars": bool(data.get("content_pillars")),
        "channel_strategy": bool(channel_strategy),
        "audience_segments": bool(data.get("audience_segments")),
        "timeline": bool(raw_timeline),
        "success_metrics": bool(raw_metrics),
        "competitive_differentiation": bool(data.get("competitive_differentiation")),
        "market_opportunities": bool(data.get("market_opportunities")),
        "strategic_approach": bool(data.get("strategic_approach")),
        "inferred_goal": bool(inf_goal),
        "research_foundation": res_found,
        "execution": exec_plan,
    }

    return StrategySummary(
        status="VALIDATED",
        positioning=str(data.get("positioning") or ""),
        key_messages=(data.get("key_messages") or [])[:3],
        content_pillars=(data.get("content_pillars") or [])[:3],
        audience_segments=_summarize_audience_segments(data.get("audience_segments")),
        channel_priorities=channels_summary,
        timeline=timeline_summary,
        success_metrics=metrics_summary,
        competitive_differentiation=comp_diff,
        strategic_approach=str(data.get("strategic_approach") or "")[:150],
        inferred_goal=inf_goal,
        research_foundation_present=res_found,
        execution_present=exec_plan,
        field_presence=field_presence,
    )

