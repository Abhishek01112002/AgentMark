"""
Token Diagnostics — Analyzes prompt token breakdowns, cache eligibility, and estimated cost.
"""

from typing import List, Dict, Any
from pydantic import BaseModel, Field


class PromptTokenReport(BaseModel):
    agent_name: str
    estimated_input_tokens: int
    static_prefix_tokens: int
    dynamic_context_tokens: int
    trimmed_fields: List[str] = Field(default_factory=list)
    cache_eligible: bool
    cache_hit: bool
    estimated_cost_usd: float


class TokenDiagnostics:
    """Provides prompt token diagnostics and cost estimation."""

    INPUT_COST_PER_1K: float = 0.003
    OUTPUT_COST_PER_1K: float = 0.015

    @classmethod
    def analyze_prompt(
        cls,
        agent_name: str,
        system_prefix: str,
        dynamic_context: str,
        trimmed_fields: List[str] = None,
        cache_hit: bool = False
    ) -> PromptTokenReport:
        prefix_tokens = len(system_prefix) // 4
        dynamic_tokens = len(dynamic_context) // 4
        total_tokens = prefix_tokens + dynamic_tokens

        cache_eligible = prefix_tokens >= 1024
        cost = round((total_tokens / 1000.0) * cls.INPUT_COST_PER_1K, 5)

        return PromptTokenReport(
            agent_name=agent_name,
            estimated_input_tokens=total_tokens,
            static_prefix_tokens=prefix_tokens,
            dynamic_context_tokens=dynamic_tokens,
            trimmed_fields=trimmed_fields or [],
            cache_eligible=cache_eligible,
            cache_hit=cache_hit,
            estimated_cost_usd=cost,
        )
