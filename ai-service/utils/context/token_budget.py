"""
Token Budget Manager — Estimates prompt token sizes and trims optional context sections to fit per-agent budgets.
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger("agentmark.token_budget")


class TokenBudgetManager:
    """Estimates character/token bounds and trims optional prompt context sections."""

    DEFAULT_BUDGETS: Dict[str, int] = {
        "manager": 3000,
        "research": 4000,
        "strategy": 5000,
        "copywriter": 6000,
        "image_prompt": 4000,
        "reviewer": 4000,
    }

    @staticmethod
    def estimate_tokens(text: str) -> int:
        """Rough token estimation (approx 4 chars per token for English text & JSON)."""
        if not text:
            return 0
        return len(text) // 4

    @classmethod
    def fit_to_budget(cls, agent_name: str, raw_text: str, max_tokens: Optional[int] = None) -> str:
        """Trim text if estimated token count exceeds the agent's allocated token budget."""
        budget = max_tokens or cls.DEFAULT_BUDGETS.get(agent_name, 4000)
        estimated = cls.estimate_tokens(raw_text)

        if estimated <= budget:
            return raw_text

        max_chars = budget * 4
        logger.warning(
            "⚠️ Token budget exceeded for %s | Estimated: %d tokens | Budget: %d tokens | Trimming to %d chars",
            agent_name, estimated, budget, max_chars
        )

        return raw_text[:max_chars] + "\n...[TRUNCATED TO FIT TOKEN BUDGET]"
