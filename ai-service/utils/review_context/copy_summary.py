"""
Copy Summary Builder — Normalizes and extracts channel copy headlines/CTAs for Reviewer.
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
    """Extract per-channel headlines and primary CTAs (omitting long body text)."""
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
            headline = ch_data.get("headline") or ch_data.get("subject") or ""
            ctas = ch_data.get("ctas") or {}
            primary_cta = (
                ctas.get("hero_cta") or
                ctas.get("primary_cta") or
                (next(iter(ctas.values()), "") if isinstance(ctas, dict) and ctas else "")
            )
            channel_summaries[ch] = ChannelCopyMeta(
                headline=headline,
                primary_cta=primary_cta,
            )

    return CopySummary(
        status="VALIDATED",
        channels=list(channel_summaries.keys()),
        channel_copy_summaries=channel_summaries,
    )
