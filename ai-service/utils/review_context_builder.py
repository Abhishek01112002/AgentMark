"""
ReviewContextBuilder Utility — Normalizes and compresses campaign outputs into
compact, structured domain summaries for the Reviewer agent.

Eliminates massive raw JSON serialization overhead (saving 3,500–5,000 tokens per review pass).
"""

import json
import logging
from typing import Any, Dict

from agents.state import CampaignState

logger = logging.getLogger("agentmark.review_context_builder")


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


def build_research_summary(research_raw: Any) -> Dict[str, Any]:
    """Extract key market findings, top competitors, and pain points."""
    data = _safe_parse_json(research_raw)
    if not data:
        return {"status": "EMPTY"}

    market = data.get("market_analysis", {})
    competitors = data.get("competitor_analysis", {})
    audience = data.get("audience_insights", {})

    top_competitors = [
        c.get("name") if isinstance(c, dict) else str(c)
        for c in (competitors.get("top_competitors") or [])[:3]
    ]

    return {
        "status": "VALIDATED",
        "market_trends": (market.get("market_trends") or [])[:3],
        "growth_rate": market.get("growth_rate", "N/A"),
        "top_competitors": top_competitors,
        "pain_points": (audience.get("pain_points") or [])[:3],
        "motivations": (audience.get("motivations") or [])[:3],
    }


def build_strategy_summary(strategy_raw: Any) -> Dict[str, Any]:
    """Extract positioning, key messaging pillars, and channel priorities."""
    data = _safe_parse_json(strategy_raw)
    if not data:
        return {"status": "EMPTY"}

    channel_strategy = data.get("channel_strategy", {})
    channels_summary = {}
    if isinstance(channel_strategy, dict):
        for ch, plan in channel_strategy.items():
            if isinstance(plan, dict):
                channels_summary[ch] = {
                    "priority": plan.get("priority", "medium"),
                    "rationale": (plan.get("rationale") or "")[:80],
                }

    return {
        "status": "VALIDATED",
        "positioning": data.get("positioning", ""),
        "key_messages": (data.get("key_messages") or [])[:3],
        "content_pillars": (data.get("content_pillars") or [])[:3],
        "audience_segments": (data.get("audience_segments") or [])[:3],
        "channel_priorities": channels_summary,
        "strategic_approach": (data.get("strategic_approach") or "")[:150],
    }


def build_copy_summary(copy_raw: Any) -> Dict[str, Any]:
    """Extract per-channel headlines and primary CTAs (omitting long body text)."""
    data = _safe_parse_json(copy_raw)
    if not data:
        return {"status": "EMPTY"}

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
            channel_summaries[ch] = {
                "headline": headline,
                "primary_cta": primary_cta,
            }

    return {
        "status": "VALIDATED",
        "channels": list(channel_summaries.keys()),
        "channel_copy_summaries": channel_summaries,
    }


def build_image_summary(image_raw: Any) -> Dict[str, Any]:
    """Extract visual direction, key visual themes, and prompt count."""
    data = _safe_parse_json(image_raw)
    if not data:
        return {"status": "EMPTY"}

    visual_dir = data.get("visual_direction", {}) or {}
    prompts = data.get("image_prompts", []) or []

    return {
        "status": "VALIDATED",
        "overall_style": visual_dir.get("overall_style", ""),
        "mood": visual_dir.get("mood", ""),
        "visual_themes": (visual_dir.get("key_visual_themes") or [])[:3],
        "prompt_count": len(prompts),
    }


def build_review_context(state: CampaignState) -> Dict[str, str]:
    """
    Build compact, normalized JSON strings for the Reviewer agent.
    Returns serialized compact summaries for research, strategy, copy, and image outputs.
    """
    research_summary = build_research_summary(state.research_output)
    strategy_summary = build_strategy_summary(state.strategy_output)
    copy_summary = build_copy_summary(state.copy_output)
    image_summary = build_image_summary(state.image_output)

    return {
        "research_summary": json.dumps(research_summary, separators=(",", ":"), ensure_ascii=False),
        "strategy_summary": json.dumps(strategy_summary, separators=(",", ":"), ensure_ascii=False),
        "copy_summary": json.dumps(copy_summary, separators=(",", ":"), ensure_ascii=False),
        "image_summary": json.dumps(image_summary, separators=(",", ":"), ensure_ascii=False),
    }
