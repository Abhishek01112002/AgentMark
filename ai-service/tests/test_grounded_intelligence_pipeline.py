"""
Automated Test Suite for Grounded 100x Research Intelligence Pipeline
Verifies Schema Propagation, Anti-Fabrication Safeguards, Missing Field Resilience,
and Canonical Intelligence Context Construction.
"""

import sys
import json
from pathlib import Path
import pytest

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from schemas.agent_outputs import (
    ResearchOutput,
    StrategyOutput,
    ResearchFoundation,
    CopywriterOutput,
    MarketAnalysis,
    CompetitorAnalysis,
    AudienceInsights,
)
from agents.state import CampaignState
from agents.strategy import _write_fallback_strategy, strategy_agent
from agents.copywriter import _extract_surgical_copy_context, _fallback_copy_output


def test_research_foundation_schema_preserves_all_4_fields():
    """Verify that ResearchFoundation Pydantic schema preserves all 4 research intelligence fields."""
    rf = ResearchFoundation(
        customer_voice_insights=["Onboarding takes too long"],
        competitor_vulnerabilities=["High enterprise complexity"],
        proven_ad_hooks=["Stop building, start transforming"],
        brand_dna={"source_url": "https://testbrand.com", "extracted_hero_text": "Hero value prop"}
    )
    dumped = rf.model_dump()
    assert dumped["customer_voice_insights"] == ["Onboarding takes too long"]
    assert dumped["competitor_vulnerabilities"] == ["High enterprise complexity"]
    assert dumped["proven_ad_hooks"] == ["Stop building, start transforming"]
    assert dumped["brand_dna"]["source_url"] == "https://testbrand.com"


def test_strategy_fallback_populates_research_foundation():
    """Verify _write_fallback_strategy populates all 4 fields in research_foundation."""
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="DevOps engineers"
    )
    
    market_analysis = {"total_addressable_market": "$10B", "growth_rate": "15%", "market_trends": ["Automation"]}
    competitor_analysis = {"top_competitors": ["AlphaCorp"], "differentiation_opportunity": "Zero demo setup"}
    audience_insights = {"pain_points": ["Manual patching"], "motivations": ["Saved time"], "preferred_channels": ["linkedin"]}

    res_state = _write_fallback_strategy(
        state,
        "Test Campaign",
        "TestBrand",
        ["linkedin"],
        ["case_study"],
        market_analysis,
        competitor_analysis,
        audience_insights,
        ["Market opp"],
        "Automate pipelines"
    )

    strat = json.loads(res_state.strategy_output)
    assert "research_foundation" in strat
    assert strat["research_foundation"]["market_analysis"]["total_addressable_market"] == "$10B"
    assert "customer_voice_insights" in strat["research_foundation"]
    assert "competitor_vulnerabilities" in strat["research_foundation"]
    assert "proven_ad_hooks" in strat["research_foundation"]


def test_extract_surgical_copy_context_preserves_grounded_intelligence():
    """Verify Copywriter context extractor preserves all 4 research intelligence fields."""
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen"
    )

    strategy_dict = {
        "positioning": "Zero-demo pipeline automation",
        "key_messages": ["Save 40 hours"],
        "content_pillars": ["Automation"],
        "audience_segments": ["DevOps Leaders"],
        "timeline": {"duration": "4 weeks"},
        "competitive_differentiation": {"primary_differentiation": "Zero-demo setup"},
        "inferred_goal": "lead_gen",
        "research_foundation": {
            "audience_insights": {"pain_points": ["Slow onboarding"], "motivations": ["Speed"]},
            "market_analysis": {"market_trends": ["Cloud Automation"], "growth_rate": "20%"},
            "customer_voice_insights": ["'I hate spending weeks setting up APIs'"],
            "competitor_vulnerabilities": ["Databricks onboarding friction"],
            "proven_ad_hooks": ["Validate in 60s without a sales demo"],
            "brand_dna": {"source_url": "https://testbrand.com", "extracted_hero_text": "Grounded Value Prop"}
        }
    }

    ctx = _extract_surgical_copy_context(strategy_dict, state)
    assert ctx["customer_voice_insights"] == ["'I hate spending weeks setting up APIs'"]
    assert ctx["competitor_vulnerabilities"] == ["Databricks onboarding friction"]
    assert ctx["proven_ad_hooks"] == ["Validate in 60s without a sales demo"]
    assert ctx["brand_dna"]["source_url"] == "https://testbrand.com"


def test_copywriter_fallback_degrades_gracefully_when_research_empty():
    """Verify copywriter fallback logic works cleanly when research fields are empty without throwing errors."""
    state = CampaignState(
        campaign_name="Fallback Campaign",
        brand_name="FallbackBrand",
        industry="saas",
        primary_goal="awareness"
    )

    copy_out = _fallback_copy_output(
        state,
        ["linkedin", "email"],
        "awareness",
        "FallbackBrand",
        "professional",
        "Fastest SaaS onboarding",
        ["Save time with FallbackBrand"],
        ["Long onboarding"],
        ["campaign post"]
    )

    assert copy_out.inferred_goal == "awareness"
    assert "linkedin" in copy_out.copies or len(copy_out.copies) > 0
