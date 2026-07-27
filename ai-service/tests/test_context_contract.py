"""
Unit tests for EMOS Phase 1 Context Contract Generator & Schema Validation
"""

import pytest
from workflow.context import build_minimal_context_contract


def test_build_minimal_context_contract_bounds():
    contract = build_minimal_context_contract(
        brand_name="AgentMark",
        tagline="AI Marketing Engine",
        target_persona="Head of Growth",
        journey_stage="Evaluation",
        conversion_intent="Switch_From_Competitor",
        value_props=["Prop 1", "Prop 2", "Prop 3", "Prop 4"],
        forbidden_terms=["bad1", "bad2", "bad3", "bad4"],
        primary_cta="Start Sandbox"
    )

    assert contract["brand_name"] == "AgentMark"
    assert contract["contract_version"] == "v1.0.0"
    assert len(contract["value_props"]) <= 3
    assert len(contract["forbidden_terms"]) <= 3
    assert contract["primary_cta"] == "Start Sandbox"


def test_build_minimal_context_contract_defaults():
    contract = build_minimal_context_contract(
        brand_name=None,
        tagline=None,
        target_persona=None
    )

    assert contract["brand_name"] == "Brand"
    assert contract["journey_stage"] == "Evaluation"
    assert contract["conversion_intent"] == "Switch_From_Competitor"
