"""
EMOS Phase 1 Foundation: Minimal Context Contract Generator & Validator (Python AI Service)
Generates strict, bounded JSON context contracts (< 250 tokens) for downstream agents.
"""

from typing import Dict, Any, List
import json
import logging

logger = logging.getLogger(__name__)


def build_minimal_context_contract(
    brand_name: str,
    tagline: str,
    target_persona: str,
    journey_stage: str = "Evaluation",
    conversion_intent: str = "Switch_From_Competitor",
    value_props: List[str] = None,
    forbidden_terms: List[str] = None,
    primary_cta: str = "Start Free Trial"
) -> Dict[str, Any]:
    """
    Constructs a minimal, < 250 token context contract JSON for downstream agents.
    """
    contract = {
        "brand_name": brand_name or "Brand",
        "tagline": tagline or "Empowering Growth",
        "target_persona": target_persona or "Growth Marketer",
        "journey_stage": journey_stage or "Evaluation",
        "conversion_intent": conversion_intent or "Switch_From_Competitor",
        "value_props": (value_props or ["Sub-second execution", "Zero prompt engineering"])[:3],
        "forbidden_terms": (forbidden_terms or ["synergy", "game-changer"])[:3],
        "primary_cta": primary_cta or "Start Free Trial",
        "contract_version": "v1.0.0"
    }

    # Verify token footprint is within budget (< 250 tokens approx 1000 chars)
    serialized = json.dumps(contract)
    if len(serialized) > 1000:
        logger.warning("Context contract exceeds target budget length (%d chars); pruning...", len(serialized))
        contract["value_props"] = contract["value_props"][:2]

    return contract
