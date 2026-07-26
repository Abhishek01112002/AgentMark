"""
Context Pipeline Domain Models — Immutable Value Objects for normalized campaign context,
structured prompt sections, and provider configuration.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


# ── 1. Normalized Campaign Models (Immutable Value Objects) ────────────────

class BrandMetadata(BaseModel, frozen=True):
    campaign_id: str = ""
    campaign_name: str = ""
    brand_name: str = ""
    brand_voice: str = "professional"
    target_audience: str = "General target audience"
    industry: str = "other"
    primary_goal: str = "awareness"
    brief: str = ""
    additional_context: str = ""


class NormalizedResearch(BaseModel, frozen=True):
    status: str = "EMPTY"
    market_trends: List[str] = Field(default_factory=tuple)
    growth_rate: str = "N/A"
    top_competitors: List[str] = Field(default_factory=tuple)
    pain_points: List[str] = Field(default_factory=tuple)
    motivations: List[str] = Field(default_factory=tuple)
    competitive_advantage: str = ""


class NormalizedStrategy(BaseModel, frozen=True):
    status: str = "EMPTY"
    positioning: str = ""
    inferred_goal: str = "awareness"
    key_messages: List[str] = Field(default_factory=tuple)
    content_pillars: List[str] = Field(default_factory=tuple)
    audience_segments: List[str] = Field(default_factory=tuple)
    channel_priorities: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    timeline: List[Any] = Field(default_factory=tuple)
    competitive_differentiation: Dict[str, Any] = Field(default_factory=dict)
    strategic_approach: str = ""
    channels: List[str] = Field(default_factory=tuple)
    deliverables: List[str] = Field(default_factory=tuple)


class ChannelCopyContent(BaseModel, frozen=True):
    headline: str = ""
    body: str = ""
    primary_cta: str = ""


class NormalizedCopy(BaseModel, frozen=True):
    status: str = "EMPTY"
    channels: List[str] = Field(default_factory=tuple)
    channel_copy: Dict[str, ChannelCopyContent] = Field(default_factory=dict)


class NormalizedImage(BaseModel, frozen=True):
    status: str = "EMPTY"
    overall_style: str = ""
    mood: str = ""
    visual_themes: List[str] = Field(default_factory=tuple)
    prompt_count: int = 0


class NormalizedCampaignContext(BaseModel, frozen=True):
    brand: BrandMetadata = Field(default_factory=BrandMetadata)
    research: NormalizedResearch = Field(default_factory=NormalizedResearch)
    strategy: NormalizedStrategy = Field(default_factory=NormalizedStrategy)
    copy: NormalizedCopy = Field(default_factory=NormalizedCopy)
    image: NormalizedImage = Field(default_factory=NormalizedImage)


# ── 2. Structured Prompt Context Model ────────────────────────────────────

class PromptSections(BaseModel, frozen=True):
    system_instruction: str = ""
    role_description: str = ""
    context_block: str = ""
    human_feedback_section: str = ""
    output_schema_instructions: str = ""


class PromptContext(BaseModel, frozen=True):
    agent_name: str
    sections: PromptSections
    metadata: Dict[str, Any] = Field(default_factory=dict)

    def assemble_raw_prompt(self) -> str:
        """Assemble all sections into a single formatted string for legacy LLM clients."""
        parts = [
            self.sections.system_instruction,
            self.sections.role_description,
            self.sections.context_block,
            self.sections.human_feedback_section,
            self.sections.output_schema_instructions,
        ]
        return "\n\n".join([p.strip() for p in parts if p and p.strip()])
