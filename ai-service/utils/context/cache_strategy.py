"""
Capability-Based Provider Prompt Cache Strategy Interface.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict
from utils.context.models import PromptContext


class PromptCacheStrategy(ABC):
    """Abstract capability interface for provider prompt caching."""

    @abstractmethod
    def supports_prefix_cache(self) -> bool:
        """Return True if provider supports static system prompt prefix caching (e.g. Anthropic / OpenAI)."""
        pass

    @abstractmethod
    def supports_ephemeral_cache(self) -> bool:
        """Return True if provider supports short-lived prompt block caching."""
        pass

    @abstractmethod
    def supports_context_cache(self) -> bool:
        """Return True if provider supports long context caching (e.g. Gemini)."""
        pass

    @abstractmethod
    def serialize_payload(self, prompt_context: PromptContext) -> Dict[str, Any]:
        """Serialize PromptContext into provider-specific request payload with caching headers."""
        pass


class DefaultCacheStrategy(PromptCacheStrategy):
    """Default fallback cache strategy for general OpenAI/Gemini/Groq SDK clients."""

    def supports_prefix_cache(self) -> bool:
        return False

    def supports_ephemeral_cache(self) -> bool:
        return False

    def supports_context_cache(self) -> bool:
        return False

    def serialize_payload(self, prompt_context: PromptContext) -> Dict[str, Any]:
        return {
            "agent_name": prompt_context.agent_name,
            "prompt": prompt_context.assemble_raw_prompt(),
            "metadata": prompt_context.metadata,
        }


class AnthropicCacheStrategy(PromptCacheStrategy):
    """Anthropic Claude capability strategy supporting system prompt prefix caching headers."""

    def supports_prefix_cache(self) -> bool:
        return True

    def supports_ephemeral_cache(self) -> bool:
        return True

    def supports_context_cache(self) -> bool:
        return False

    def serialize_payload(self, prompt_context: PromptContext) -> Dict[str, Any]:
        system_blocks = [
            {
                "type": "text",
                "text": prompt_context.sections.system_instruction + "\n" + prompt_context.sections.role_description,
                "cache_control": {"type": "ephemeral"}
            }
        ]
        user_text = "\n\n".join([
            prompt_context.sections.context_block,
            prompt_context.sections.human_feedback_section,
            prompt_context.sections.output_schema_instructions
        ])
        return {
            "system": system_blocks,
            "messages": [{"role": "user", "content": user_text}],
            "metadata": prompt_context.metadata
        }
