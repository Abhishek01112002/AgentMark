"""
Research Summary Builder — Normalizes and extracts key research insights for Reviewer.
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
    """Extract key market findings, top competitors, and pain points."""
    data = _safe_parse_json(research_raw)
    if not data:
        return ResearchSummary(status="EMPTY")

    market = data.get("market_analysis", {})
    competitors = data.get("competitor_analysis", {})
    audience = data.get("audience_insights", {})

    top_competitors = [
        c.get("name") if isinstance(c, dict) else str(c)
        for c in (competitors.get("top_competitors") or [])[:3]
    ]

    return ResearchSummary(
        status="VALIDATED",
        market_trends=(market.get("market_trends") or [])[:3],
        growth_rate=market.get("growth_rate", "N/A"),
        top_competitors=top_competitors,
        pain_points=(audience.get("pain_points") or [])[:3],
        motivations=(audience.get("motivations") or [])[:3],
    )
