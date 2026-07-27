import warnings
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

warnings.filterwarnings("ignore", message=".*Field name \"copy\" in \"ReviewerContext\".*")


class ResearchSummary(BaseModel):
    status: str = "EMPTY"
    total_addressable_market: str = "N/A"
    growth_rate: str = "N/A"
    market_trends: List[str] = Field(default_factory=list)
    top_competitors: List[str] = Field(default_factory=list)
    differentiation_opportunity: str = "N/A"
    pain_points: List[str] = Field(default_factory=list)
    motivations: List[str] = Field(default_factory=list)
    preferred_channels: List[str] = Field(default_factory=list)
    market_opportunities: List[str] = Field(default_factory=list)
    recommended_approach: str = "N/A"
    field_presence: Dict[str, bool] = Field(default_factory=dict)


class StrategySummary(BaseModel):
    status: str = "EMPTY"
    positioning: str = ""
    key_messages: List[str] = Field(default_factory=list)
    content_pillars: List[str] = Field(default_factory=list)
    audience_segments: List[str] = Field(default_factory=list)
    channel_priorities: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    timeline: Dict[str, Any] = Field(default_factory=dict)
    success_metrics: List[str] = Field(default_factory=list)
    competitive_differentiation: str = "N/A"
    strategic_approach: str = ""
    inferred_goal: str = ""
    research_foundation_present: bool = False
    execution_present: bool = False
    field_presence: Dict[str, bool] = Field(default_factory=dict)

    @field_validator("audience_segments", "key_messages", "content_pillars", mode="before")
    @classmethod
    def _normalize_string_list(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return []
        res = []
        for item in v:
            if isinstance(item, str):
                res.append(item)
            elif isinstance(item, dict):
                name = item.get("segment_name") or item.get("name") or item.get("title") or item.get("pillar") or "Item"
                text = item.get("description") or item.get("message") or item.get("pain_point") or ""
                res.append(f"{name}: {text}".strip(": "))
            else:
                res.append(str(item))
        return res


class ChannelCopyMeta(BaseModel):
    headline: str = ""
    primary_cta: str = ""


class CopySummary(BaseModel):
    status: str = "EMPTY"
    inferred_goal: str = ""
    channels: List[str] = Field(default_factory=list)
    channel_copy_summaries: Dict[str, ChannelCopyMeta] = Field(default_factory=dict)
    messaging_framework_present: bool = False
    strategic_alignment_present: bool = False
    copy_readiness_present: bool = False
    field_presence: Dict[str, bool] = Field(default_factory=dict)


class ImagePromptMeta(BaseModel):
    deliverable_name: str = ""
    prompt_snippet: str = ""
    style_keywords: List[str] = Field(default_factory=list)
    visual_elements: List[str] = Field(default_factory=list)
    camera_specs: str = "N/A"


class ImageSummary(BaseModel):
    status: str = "EMPTY"
    overall_style: str = ""
    mood: str = ""
    visual_themes: List[str] = Field(default_factory=list)
    prompt_count: int = 0
    prompts_meta: List[ImagePromptMeta] = Field(default_factory=list)
    field_presence: Dict[str, bool] = Field(default_factory=dict)


class ReviewerContext(BaseModel):
    model_config = {"protected_namespaces": ()}

    research: ResearchSummary = Field(default_factory=ResearchSummary)
    strategy: StrategySummary = Field(default_factory=StrategySummary)
    copy: CopySummary = Field(default_factory=CopySummary)
    image: ImageSummary = Field(default_factory=ImageSummary)


