"""
EMOS Phase 3: Independent Evaluator Agent
Operates with strict prompt isolation — evaluates generated copy strictly against
Brand Evidence & Schema Contracts without access to Generator internal chain-of-thought tokens.
"""

from typing import Dict, Any, List
import json
import logging
from workflow.policy import enforce_layered_policy

logger = logging.getLogger(__name__)


def independent_evaluator_agent(
    generated_copy: str,
    context_contract: Dict[str, Any],
    industry: str = "other",
    campaign_rules: Dict[str, Any] = None
) -> Dict[str, Any]:
    """
    Evaluates generated campaign copy independently.
    
    Checks:
    1. Schema contract compliance (CTA presence, forbidden terms avoidance).
    2. Layered Policy Engine compliance (Platform, Industry, Tenant, Campaign).
    3. Independent Quality Score (0-100).
    """
    if not generated_copy or not isinstance(generated_copy, str):
        return {
            "approved": False,
            "overall_score": 0.0,
            "issues": ["Empty or invalid copy string provided to evaluator"],
            "policy_result": {"passed": False, "violations": ["Invalid input"]}
        }

    forbidden_terms = context_contract.get("forbidden_terms", [])
    primary_cta = context_contract.get("primary_cta", "")

    # Step 1: Run Layered Policy Check
    policy_res = enforce_layered_policy(
        text=generated_copy,
        industry=industry,
        forbidden_terms=forbidden_terms,
        campaign_rules=campaign_rules or {}
    )

    issues = list(policy_res["violations"])
    score = 100.0

    # Step 2: Deduct score for policy violations
    if not policy_res["passed"]:
        score -= (len(issues) * 25.0)

    # Step 3: Verify CTA alignment
    if primary_cta and primary_cta.lower() not in generated_copy.lower():
        issues.append(f"CTA Alignment Warning: Primary CTA '{primary_cta}' is missing from copy")
        score -= 10.0

    score = max(0.0, score)
    approved = policy_res["passed"] and score >= 75.0

    return {
        "approved": approved,
        "overall_score": round(score, 1),
        "issues": issues,
        "policy_result": policy_res,
        "evaluator_version": "v1.0.0_isolated"
    }
