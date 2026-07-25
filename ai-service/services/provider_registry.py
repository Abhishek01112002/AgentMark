"""
Provider Registry — AgentMark AI Pre-Flight Engine (Phase 2C)

Central configuration for LLM providers, model tiers, pricing, max context limits, and priorities.
"""

from typing import Dict, Any, List
from pydantic import BaseModel, Field


class ProviderConfig(BaseModel):
    """LLM Provider Configuration Specification."""
    provider_id: str
    model_name: str
    tier: int = Field(description="Tier 1 (Fast/Cheap), Tier 2 (Balanced), Tier 3 (Highest Quality)")
    cost_per_1k_input_tokens_usd: float
    cost_per_1k_output_tokens_usd: float
    max_context_tokens: int
    rate_limit_tpm: int
    priority: int = Field(description="Lower number = higher priority")


# Central Provider Registry Matrix
PROVIDER_REGISTRY: Dict[str, ProviderConfig] = {
    "groq_llama": ProviderConfig(
        provider_id="groq",
        model_name="llama-3.1-70b",
        tier=1,
        cost_per_1k_input_tokens_usd=0.0001,
        cost_per_1k_output_tokens_usd=0.0002,
        max_context_tokens=128000,
        rate_limit_tpm=300000,
        priority=1
    ),
    "gemini_flash": ProviderConfig(
        provider_id="google",
        model_name="gemini-2.0-flash",
        tier=1,
        cost_per_1k_input_tokens_usd=0.0001,
        cost_per_1k_output_tokens_usd=0.0004,
        max_context_tokens=1000000,
        rate_limit_tpm=400000,
        priority=2
    ),
    "gpt_4o_mini": ProviderConfig(
        provider_id="openai",
        model_name="gpt-4o-mini",
        tier=2,
        cost_per_1k_input_tokens_usd=0.00015,
        cost_per_1k_output_tokens_usd=0.0006,
        max_context_tokens=128000,
        rate_limit_tpm=200000,
        priority=1
    ),
    "gemini_pro": ProviderConfig(
        provider_id="google",
        model_name="gemini-1.5-pro",
        tier=2,
        cost_per_1k_input_tokens_usd=0.00125,
        cost_per_1k_output_tokens_usd=0.005,
        max_context_tokens=2000000,
        rate_limit_tpm=100000,
        priority=2
    ),
    "gpt_4o": ProviderConfig(
        provider_id="openai",
        model_name="gpt-4o-2024-08-06",
        tier=3,
        cost_per_1k_input_tokens_usd=0.0025,
        cost_per_1k_output_tokens_usd=0.010,
        max_context_tokens=128000,
        rate_limit_tpm=150000,
        priority=1
    )
}


def get_providers_by_tier(tier: int) -> List[ProviderConfig]:
    """Returns list of active providers matching a target tier sorted by priority."""
    providers = [p for p in PROVIDER_REGISTRY.values() if p.tier == tier]
    return sorted(providers, key=lambda p: p.priority)
