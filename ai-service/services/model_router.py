"""
Hybrid Model Router — AgentMark AI Pre-Flight Engine (Phase 2C)

Routes simulation tasks across Tier 1 (Cheap/Fast), Tier 2 (Balanced), and Tier 3 (Highest Quality)
models based on task type, organization plan, remaining token budget, and provider health.
"""

import os
import logging
from typing import Dict, Any, Optional
from services.provider_registry import PROVIDER_REGISTRY, get_providers_by_tier, ProviderConfig
from services.provider_health import global_circuit_breaker
from services.budget_manager import get_budget_status

logger = logging.getLogger("agentmark.model_router")

ENABLE_HYBRID_MODEL_ROUTING = os.getenv("ENABLE_HYBRID_MODEL_ROUTING", "false").lower() in ("true", "1")

# Default task type to tier mapping
TASK_TIER_MAP = {
    "persona_critique": 1,      # Tier 1: Fast/Cheap for simple reviews
    "trust_analysis": 2,        # Tier 2: Balanced for signal detection
    "devils_advocate": 2,       # Tier 2: Balanced for adversarial analysis
    "analyst_synthesis": 3      # Tier 3: High quality synthesis
}


def route_model_request(
    task_type: str,
    organization_id: str = "org_default",
    feature_flag_override: bool | None = None
) -> Dict[str, Any]:
    """
    Selects optimal LLM provider & model matching task requirement, budget, and health.
    """
    is_enabled = feature_flag_override if feature_flag_override is not None else ENABLE_HYBRID_MODEL_ROUTING

    # If feature flag disabled, return baseline default model
    if not is_enabled:
        return {
            "provider": "openai",
            "model_name": "gpt-4o-2024-08-06",
            "tier": 3,
            "routing_reason": "feature_flag_disabled_baseline_fallback"
        }

    # Step 1: Check Budget Status for Tier Downgrade
    budget_status = get_budget_status(organization_id)
    target_tier = TASK_TIER_MAP.get(task_type, 2)
    routing_reason = f"standard_task_tier_{target_tier}"

    if budget_status["requires_downgrade"]:
        target_tier = 1
        routing_reason = "budget_threshold_exceeded_downgrade_tier_1"
        logger.info(f"Budget threshold exceeded for org {organization_id}. Downgrading task {task_type} to Tier 1.")

    # Step 2: Retrieve Provider Candidates for Target Tier
    candidate_providers = get_providers_by_tier(target_tier)

    # Step 3: Find First Healthy Provider in Tier
    selected_config: Optional[ProviderConfig] = None
    for candidate in candidate_providers:
        if global_circuit_breaker.is_provider_healthy(candidate.provider_id):
            selected_config = candidate
            break

    # Step 4: Fallback to Tier 1 if all target tier providers are unhealthy
    if not selected_config:
        logger.warning(f"All Tier {target_tier} providers unhealthy. Falling back to Tier 1 candidates.")
        tier_1_candidates = get_providers_by_tier(1)
        for candidate in tier_1_candidates:
            if global_circuit_breaker.is_provider_healthy(candidate.provider_id):
                selected_config = candidate
                routing_reason = "unhealthy_provider_failover_tier_1"
                break

    # Absolute baseline fallback if everything is unhealthy
    if not selected_config:
        selected_config = PROVIDER_REGISTRY["gpt_4o"]
        routing_reason = "absolute_baseline_fallback"

    return {
        "provider": selected_config.provider_id,
        "model_name": selected_config.model_name,
        "tier": selected_config.tier,
        "routing_reason": routing_reason
    }
