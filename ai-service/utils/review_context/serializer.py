"""
Compact Prompt Serializer — Adapter layer that serializes domain models into minified JSON strings for prompts.

Keeps domain models decoupled from prompt formatting and serialization concerns.
"""

from typing import Dict
from utils.review_context.models import ReviewerContext


class CompactPromptSerializer:
    """Serializes ReviewerContext into compact, minified JSON strings for prompt template injection."""

    @staticmethod
    def serialize(context: ReviewerContext) -> Dict[str, str]:
        """Convert ReviewerContext model domain objects into compact minified JSON strings."""
        return {
            "research_summary": context.research.model_dump_json(exclude_none=True, by_alias=True),
            "strategy_summary": context.strategy.model_dump_json(exclude_none=True, by_alias=True),
            "copy_summary": context.copy.model_dump_json(exclude_none=True, by_alias=True),
            "image_summary": context.image.model_dump_json(exclude_none=True, by_alias=True),
        }
