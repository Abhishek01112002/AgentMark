"""
Unit tests & 100% synthetic policy intercept compliance tests for EMOS Phase 3
"""

import pytest
from workflow.policy import (
    evaluate_platform_policy,
    evaluate_industry_policy,
    evaluate_tenant_policy,
    evaluate_campaign_policy,
    enforce_layered_policy
)
from agents.evaluator import independent_evaluator_agent


def test_platform_policy_intercept():
    text = "Our competitor is a scam, click here!"
    violations = evaluate_platform_policy(text)
    assert len(violations) > 0
    assert "Platform Safety Violation" in violations[0]


def test_industry_policy_finance_intercept():
    text = "Invest today for guaranteed profit!"
    violations = evaluate_industry_policy(text, industry="finance")
    assert len(violations) > 0
    assert "Finance Policy Violation" in violations[0]


def test_industry_policy_healthcare_intercept():
    text = "Our supplement cures all diseases effortlessly."
    violations = evaluate_industry_policy(text, industry="healthcare")
    assert len(violations) > 0
    assert "Healthcare Policy Violation" in violations[0]


def test_tenant_policy_forbidden_terms_intercept():
    text = "We offer a synergistic game-changer solution."
    violations = evaluate_tenant_policy(text, forbidden_terms=["game-changer", "synergy"])
    assert len(violations) == 1  # 'game-changer' matched
    assert "Tenant Policy Violation" in violations[0]


def test_campaign_policy_discount_intercept():
    text = "Get 50% off your first subscription!"
    violations = evaluate_campaign_policy(text, campaign_rules={"max_discount_percent": 30})
    assert len(violations) > 0
    assert "exceeds campaign limit" in violations[0]


def test_enforce_layered_policy_clean_text():
    clean_text = "Accelerate your marketing workflow with our sub-second engine. Start Free Trial."
    result = enforce_layered_policy(
        text=clean_text,
        industry="saas",
        forbidden_terms=["synergy"],
        campaign_rules={"max_discount_percent": 20}
    )
    assert result["passed"] is True
    assert result["violation_count"] == 0


def test_independent_evaluator_approval():
    context_contract = {
        "forbidden_terms": ["synergy"],
        "primary_cta": "Start Free Trial"
    }
    copy = "Boost performance today. Start Free Trial now."

    eval_res = independent_evaluator_agent(
        generated_copy=copy,
        context_contract=context_contract,
        industry="saas"
    )

    assert eval_res["approved"] is True
    assert eval_res["overall_score"] >= 90.0
    assert eval_res["evaluator_version"] == "v1.0.0_isolated"


def test_independent_evaluator_policy_rejection():
    context_contract = {
        "forbidden_terms": ["game-changer"],
        "primary_cta": "Book Demo"
    }
    copy = "Our game-changer app is guaranteed profit."

    eval_res = independent_evaluator_agent(
        generated_copy=copy,
        context_contract=context_contract,
        industry="finance"
    )

    assert eval_res["approved"] is False
    assert eval_res["overall_score"] < 75.0
    assert len(eval_res["issues"]) > 0
