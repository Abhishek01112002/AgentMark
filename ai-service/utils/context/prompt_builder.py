"""
Prompt Context Builder — Builds structured PromptContext objects from EnrichedContext.
"""

from utils.context.context_enricher import EnrichedContext
from utils.context.models import PromptContext, PromptSections
from utils.prompt_loader import get_prompt_template


class PromptContextBuilder:
    """Central builder for constructing structured PromptContext objects for all agent types."""

    @staticmethod
    def build_prompt_context(
        agent_name: str,
        enriched: EnrichedContext,
        kwargs: dict
    ) -> PromptContext:
        """
        Loads the template for agent_name, extracts prompt fragments,
        and constructs a structured PromptContext object.
        """
        template = get_prompt_template(agent_name)

        # Separate system instructions/role descriptions from dynamic content if markers exist
        sections = PromptSections(
            system_instruction=f"You are the {agent_name.capitalize()} Agent in AgentMark multi-agent AI system.",
            role_description=f"Role: {agent_name.capitalize()} Agent Specialist.",
            context_block=template.format_map(kwargs),
            human_feedback_section=str(kwargs.get("human_feedback_section") or ""),
            output_schema_instructions="Return strict JSON matching the requested response schema.",
        )

        return PromptContext(
            agent_name=agent_name,
            sections=sections,
            metadata={
                "campaign_id": enriched.context.brand.campaign_id,
                "brand_name": enriched.context.brand.brand_name,
                "industry": enriched.context.brand.industry,
                "primary_goal": enriched.context.brand.primary_goal,
            }
        )
