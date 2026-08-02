"""
Context Enricher — Derives strategic metadata, rankings, and inferred summaries from NormalizedCampaignContext.
"""

from typing import Any, Dict, List
from pydantic import BaseModel, Field
from utils.context.models import NormalizedCampaignContext


class EnrichedContext(BaseModel, frozen=True):
    context: NormalizedCampaignContext
    primary_pain_point: str = "business inefficiencies"
    primary_key_message: str = ""
    goal_keywords: str = "Get Started, Learn More"
    voice_keywords: str = "authentic, natural"
    channel_summary_list: List[str] = Field(default_factory=tuple)
    summary_bullet_points: List[str] = Field(default_factory=tuple)


class ContextEnricher:
    """Enriches NormalizedCampaignContext with derived metadata, keyword mappings, and summary lists."""

    @staticmethod
    def enrich(ctx: NormalizedCampaignContext) -> EnrichedContext:
        brand = ctx.brand
        research = ctx.research
        strategy = ctx.strategy

        primary_pain = research.pain_points[0] if research.pain_points else "key challenges"
        primary_msg = strategy.key_messages[0] if strategy.key_messages else strategy.positioning

        from utils.context.cta_registry import IndustryCTARegistry
        goal_kw = IndustryCTARegistry.get_ctas(brand.industry, brand.primary_goal)

        voice_map = {
            "professional": "industry, data, proven, expertise, results",
            "friendly": "conversational, questions, stories, easy, together",
            "bold": "challenge, disrupt, provocative, dare, game-changer",
            "luxury": "exclusive, premium, sophisticated, curated, elite",
            "casual": "simple, real, honest, straightforward, no-nonsense",
            "inspirational": "uplifting, vision, potential, inspire, future",
            "empathetic": "understand, support, care, community, empathy",
            "trustworthy": "reliable, secure, honest, transparent, verified"
        }
        voice_kw = voice_map.get(brand.brand_voice, f"{brand.brand_voice}, authentic, natural")

        bullets = []
        if strategy.positioning:
            bullets.append(f"Positioning: {strategy.positioning[:80]}")
        if research.top_competitors:
            bullets.append(f"Top Competitors: {', '.join(research.top_competitors[:3])}")
        if research.pain_points:
            bullets.append(f"Key Pain Point: {primary_pain}")

        return EnrichedContext(
            context=ctx,
            primary_pain_point=primary_pain,
            primary_key_message=primary_msg,
            goal_keywords=goal_kw,
            voice_keywords=voice_kw,
            channel_summary_list=list(strategy.channels or ctx.copy_data.channels),
            summary_bullet_points=tuple(bullets),
        )
