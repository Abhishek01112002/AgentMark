"""
Strategy Summary Builder — Normalizes and extracts strategy evidence for Reviewer DTO.
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
            name = segment.get("segment_name") or segment.get("name") or "Segment"
            pain_point = segment.get("pain_point") or segment.get("pain_points") or ""
            messaging = segment.get("messaging") or segment.get("key_message") or ""
            if isinstance(pain_point, list):
                pain_point = ", ".join(str(item) for item in pain_point[:2])
            text = f"{name}: {pain_point} -> {messaging}".strip(" ->")
        else:
            text = str(segment).strip()

        if text:
            summaries.append(text[:120])

    return summaries


def build_strategy_summary(strategy_raw: Any) -> StrategySummary:
    """Extract positioning, key messaging pillars, timeline summary, and field presence."""
    data = _safe_parse_json(strategy_raw)
    if not data:
        return StrategySummary(status="EMPTY")

    channel_strategy = data.get("channel_strategy", {})
    raw_timeline = data.get("timeline") or data.get("content_calendar") or {}
    
    if isinstance(raw_timeline, dict):
        phase_count = len(raw_timeline)
        duration = raw_timeline.get("duration") or raw_timeline.get("phase_1", {}).get("duration", "4 weeks")
        timeline_summary = f"{phase_count} phases ({duration})"
    elif isinstance(raw_timeline, list):
        timeline_summary = f"{len(raw_timeline)} phases"
    else:
        timeline_summary = str(raw_timeline)[:40] or "4 phases"

    raw_metrics = data.get("success_metrics") or data.get("kpis") or []
    comp_diff = str(data.get("competitive_differentiation") or "N/A")[:100]
    res_foundation = data.get("research_foundation", {}) if isinstance(data, dict) else {}
    res_found = bool(res_foundation)
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
        "customer_voice_insights": bool(res_foundation.get("customer_voice_insights")),
        "competitor_vulnerabilities": bool(res_foundation.get("competitor_vulnerabilities")),
        "proven_ad_hooks": bool(res_foundation.get("proven_ad_hooks")),
        "brand_dna": bool(res_foundation.get("brand_dna")),
    }

    return StrategySummary(
        status="VALIDATED",
        positioning=str(data.get("positioning") or "")[:150],
        key_messages=[str(m)[:80] for m in (data.get("key_messages") or [])[:3]],
        content_pillars=[str(p)[:60] for p in (data.get("content_pillars") or [])[:4]],
        audience_segments=_summarize_audience_segments(data.get("audience_segments")),
        timeline_summary=timeline_summary,
        competitive_differentiation=comp_diff,
        inferred_goal=inf_goal,
        customer_voice_insights=[str(q)[:100] for q in (res_foundation.get("customer_voice_insights") or [])[:3]],
        competitor_vulnerabilities=[str(v)[:100] for v in (res_foundation.get("competitor_vulnerabilities") or [])[:3]],
        proven_ad_hooks=[str(h)[:100] for h in (res_foundation.get("proven_ad_hooks") or [])[:3]],
        brand_dna=res_foundation.get("brand_dna"),
        research_foundation_present=res_found,
        execution_present=exec_plan,
        field_presence=field_presence,
    )
