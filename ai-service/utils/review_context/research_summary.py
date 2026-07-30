"""
Research Summary Builder — Normalizes and extracts key research evidence for Reviewer DTO.
"""

import json
from typing import Any, Dict
from utils.review_context.models import ResearchSummary


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


def build_research_summary(research_raw: Any) -> ResearchSummary:
    """Extract key market findings, top competitors, pain points, and field presence."""
    data = _safe_parse_json(research_raw)
    if not data:
        return ResearchSummary(status="EMPTY")

    market = data.get("market_analysis", {})
    competitors = data.get("competitor_analysis", {})
    audience = data.get("audience_insights", {})
    rec_approach = str(data.get("recommended_approach") or "N/A")

    top_competitors = []
    for c in (competitors.get("top_competitors") or [])[:3]:
        if isinstance(c, dict):
            name = c.get("name") or "Competitor"
            weakness = c.get("weakness") or c.get("key_weakness") or ""
            top_competitors.append(f"{name} ({weakness[:40]})".strip(" ()"))
        else:
            top_competitors.append(str(c)[:50])

    field_presence = {
        "total_addressable_market": bool(market.get("total_addressable_market")),
        "growth_rate": bool(market.get("growth_rate")),
        "market_trends": bool(market.get("market_trends")),
        "top_competitors": bool(competitors.get("top_competitors")),
        "differentiation_opportunity": bool(competitors.get("differentiation_opportunity")),
        "pain_points": bool(audience.get("pain_points")),
        "motivations": bool(audience.get("motivations")),
        "preferred_channels": bool(audience.get("preferred_channels")),
        "market_opportunities": bool(data.get("market_opportunities")),
        "recommended_approach": bool(data.get("recommended_approach")),
    }

    return ResearchSummary(
        status="VALIDATED",
        total_addressable_market=str(market.get("total_addressable_market") or "N/A")[:30],
        growth_rate=str(market.get("growth_rate") or "N/A")[:30],
        market_trends=[str(t)[:60] for t in (market.get("market_trends") or [])[:3]],
        top_competitors=top_competitors,
        differentiation_opportunity=str(competitors.get("differentiation_opportunity") or "N/A")[:100],
        pain_points=[str(p)[:80] for p in (audience.get("pain_points") or [])[:4]],
        motivations=[str(m)[:80] for m in (audience.get("motivations") or [])[:3]],
        preferred_channels=[str(ch)[:40] for ch in (audience.get("preferred_channels") or [])[:3]],
        recommended_approach=rec_approach[:100],
        field_presence=field_presence,
    )
