"""
Copy Summary Builder — Normalizes and extracts channel copy evidence for Reviewer DTO.
"""

import json
from typing import Any, Dict
from utils.review_context.models import CopySummary, ChannelCopyMeta


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


def build_copy_summary(copy_raw: Any) -> CopySummary:
    """Extract per-channel headlines, primary CTAs, body snippets, word counts, and field presence."""
    data = _safe_parse_json(copy_raw)
    if not data:
        return CopySummary(status="EMPTY")

    copies_dict = data.get("copies", {}) or {}
    if not copies_dict and isinstance(data, dict):
        copies_dict = data

    channel_summaries = {}
    known_channels = [
        "email", "linkedin", "instagram", "facebook",
        "twitter", "tiktok", "youtube", "google_ads", "social", "ads"
    ]

    for ch in known_channels:
        ch_data = copies_dict.get(ch)
        if isinstance(ch_data, dict):
            headline = str(ch_data.get("headline") or ch_data.get("subject") or "")[:80]
            ctas = ch_data.get("ctas") or {}
            primary_cta = str(
                ctas.get("hero_cta") or
                ctas.get("primary_cta") or
                (next(iter(ctas.values()), "") if isinstance(ctas, dict) and ctas else "")
            )[:60]
            
            body_raw = str(ch_data.get("body") or ch_data.get("content") or "").strip()
            word_count = len(body_raw.split()) if body_raw else 0
            body_snippet = body_raw[:100]

            channel_summaries[ch] = ChannelCopyMeta(
                headline=headline,
                primary_cta=primary_cta,
                body_snippet=body_snippet,
                word_count=word_count,
            )

    inf_goal = str(data.get("inferred_goal") or "").strip()
    msg_fw = bool(data.get("messaging_framework"))
    strat_align = bool(data.get("strategic_alignment"))
    copy_ready = bool(data.get("copy_readiness"))

    field_presence = {
        "inferred_goal": bool(inf_goal),
        "email": "email" in channel_summaries,
        "linkedin": "linkedin" in channel_summaries,
        "social": any(c in channel_summaries for c in ["instagram", "facebook", "twitter", "tiktok", "youtube", "social"]),
        "ads": any(c in channel_summaries for c in ["google_ads", "ads"]),
        "messaging_framework": msg_fw,
        "strategic_alignment": strat_align,
        "copy_readiness": copy_ready,
    }

    return CopySummary(
        status="VALIDATED",
        inferred_goal=inf_goal,
        channels=list(channel_summaries.keys()),
        channel_copy_summaries=channel_summaries,
        messaging_framework_present=msg_fw,
        strategic_alignment_present=strat_align,
        copy_readiness_present=copy_ready,
        field_presence=field_presence,
    )
