"""
Raw Normalizer — Pure canonicalization, JSON parsing, and metadata deduplication from CampaignState.
"""

import json
from typing import Any, Dict, List, Tuple

from agents.state import CampaignState
from utils.context.models import (
    BrandMetadata,
    ChannelCopyContent,
    NormalizedCampaignContext,
    NormalizedCopy,
    NormalizedImage,
    NormalizedResearch,
    NormalizedStrategy,
)


def _safe_parse(raw: Any) -> Dict[str, Any]:
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


def _dedupe_list(items: Any) -> Tuple[str, ...]:
    if not items or not isinstance(items, list):
        return ()
    seen = set()
    result = []
    for item in items:
        val = str(item).strip()
        if val and val.lower() not in seen:
            seen.add(val.lower())
            result.append(val)
    return tuple(result)


def normalize_brand_metadata(state: CampaignState) -> BrandMetadata:
    """Extract and deduplicate core brand metadata from CampaignState."""
    return BrandMetadata(
        campaign_id=getattr(state, "campaign_id", "") or "",
        campaign_name=(getattr(state, "campaign_name", "") or "").strip(),
        brand_name=(getattr(state, "brand_name", "") or "").strip(),
        brand_voice=(getattr(state, "brand_voice", "") or "professional").strip(),
        target_audience=(getattr(state, "target_audience", "") or "General target audience").strip(),
        industry=(getattr(state, "industry", "") or "other").strip(),
        primary_goal=(getattr(state, "primary_goal", "") or "awareness").strip(),
        brief=(getattr(state, "brief", "") or "").strip(),
        additional_context=(getattr(state, "client_memory_context", "") or "None").strip(),
    )


def normalize_research(raw_research: Any) -> NormalizedResearch:
    """Canonicalize raw research output."""
    data = _safe_parse(raw_research)
    if not data:
        return NormalizedResearch(status="EMPTY")

    market = data.get("market_analysis", {})
    competitors = data.get("competitor_analysis", {})
    audience = data.get("audience_insights", {})

    top_comps = [
        c.get("name") if isinstance(c, dict) else str(c)
        for c in (competitors.get("top_competitors") or [])
    ]

    return NormalizedResearch(
        status="VALIDATED",
        market_trends=_dedupe_list(market.get("market_trends")),
        growth_rate=str(market.get("growth_rate") or "N/A"),
        top_competitors=_dedupe_list(top_comps),
        pain_points=_dedupe_list(audience.get("pain_points")),
        motivations=_dedupe_list(audience.get("motivations")),
        competitive_advantage=str(data.get("competitive_advantage") or "").strip(),
    )


def normalize_strategy(raw_strategy: Any) -> NormalizedStrategy:
    """Canonicalize raw strategy output."""
    data = _safe_parse(raw_strategy)
    if not data:
        return NormalizedStrategy(status="EMPTY")

    execution = data.get("execution", {}) or {}

    return NormalizedStrategy(
        status="VALIDATED",
        positioning=str(data.get("positioning") or "").strip(),
        inferred_goal=str(data.get("inferred_goal") or "awareness").strip(),
        key_messages=_dedupe_list(data.get("key_messages")),
        content_pillars=_dedupe_list(data.get("content_pillars")),
        audience_segments=_dedupe_list(data.get("audience_segments")),
        channel_priorities=data.get("channel_strategy", {}) if isinstance(data.get("channel_strategy"), dict) else {},
        timeline=tuple(data.get("timeline") or []),
        competitive_differentiation=data.get("competitive_differentiation", {}) if isinstance(data.get("competitive_differentiation"), dict) else {},
        strategic_approach=str(data.get("strategic_approach") or "").strip(),
        channels=_dedupe_list(execution.get("channels")),
        deliverables=_dedupe_list(execution.get("deliverables")),
    )


def normalize_copy(raw_copy: Any) -> NormalizedCopy:
    """Canonicalize raw copywriter output."""
    data = _safe_parse(raw_copy)
    if not data:
        return NormalizedCopy(status="EMPTY")

    copies_dict = data.get("copies", {}) or {}
    if not copies_dict and isinstance(data, dict):
        copies_dict = data

    channel_map = {}
    known_channels = [
        "email", "linkedin", "instagram", "facebook",
        "twitter", "tiktok", "youtube", "google_ads", "social", "ads"
    ]

    for ch in known_channels:
        ch_data = copies_dict.get(ch)
        if isinstance(ch_data, dict):
            headline = ch_data.get("headline") or ch_data.get("subject") or ""
            body = ch_data.get("body") or ""
            ctas = ch_data.get("ctas") or {}
            primary_cta = (
                ctas.get("hero_cta") or
                ctas.get("primary_cta") or
                (next(iter(ctas.values()), "") if isinstance(ctas, dict) and ctas else "")
            )
            channel_map[ch] = ChannelCopyContent(
                headline=headline.strip(),
                body=body.strip(),
                primary_cta=primary_cta.strip(),
            )

    return NormalizedCopy(
        status="VALIDATED",
        channels=_dedupe_list(list(channel_map.keys())),
        channel_copy=channel_map,
    )


def normalize_image(raw_image: Any) -> NormalizedImage:
    """Canonicalize raw image prompt output."""
    data = _safe_parse(raw_image)
    if not data:
        return NormalizedImage(status="EMPTY")

    visual_dir = data.get("visual_direction", {}) or {}
    prompts = data.get("image_prompts", []) or []

    return NormalizedImage(
        status="VALIDATED",
        overall_style=str(visual_dir.get("overall_style") or "").strip(),
        mood=str(visual_dir.get("mood") or "").strip(),
        visual_themes=_dedupe_list(visual_dir.get("key_visual_themes")),
        prompt_count=len(prompts),
    )


class RawNormalizer:
    """Entry point for converting CampaignState into an immutable NormalizedCampaignContext."""

    @staticmethod
    def normalize(state: CampaignState) -> NormalizedCampaignContext:
        """Parse, deduplicate, and canonicalize CampaignState into NormalizedCampaignContext."""
        return NormalizedCampaignContext(
            brand=normalize_brand_metadata(state),
            research=normalize_research(state.research_output),
            strategy=normalize_strategy(state.strategy_output),
            copy=normalize_copy(state.copy_output),
            image=normalize_image(state.image_output),
        )
