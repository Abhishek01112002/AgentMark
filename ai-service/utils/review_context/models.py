import warnings
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

warnings.filterwarnings("ignore", message=".*Field name \"copy\" in \"ReviewerContext\".*")


class ResearchSummary(BaseModel):
    status: str = "EMPTY"
    market_trends: List[str] = Field(default_factory=list)
    growth_rate: str = "N/A"
    top_competitors: List[str] = Field(default_factory=list)
    pain_points: List[str] = Field(default_factory=list)
    motivations: List[str] = Field(default_factory=list)


class StrategySummary(BaseModel):
    status: str = "EMPTY"
    positioning: str = ""
    key_messages: List[str] = Field(default_factory=list)
    content_pillars: List[str] = Field(default_factory=list)
    audience_segments: List[str] = Field(default_factory=list)
    channel_priorities: Dict[str, Dict[str, str]] = Field(default_factory=dict)
    strategic_approach: str = ""

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
    channels: List[str] = Field(default_factory=list)
    channel_copy_summaries: Dict[str, ChannelCopyMeta] = Field(default_factory=dict)


class ImageSummary(BaseModel):
    status: str = "EMPTY"
    overall_style: str = ""
    mood: str = ""
    visual_themes: List[str] = Field(default_factory=list)
    prompt_count: int = 0


class ReviewerContext(BaseModel):
    model_config = {"protected_namespaces": ()}

    research: ResearchSummary = Field(default_factory=ResearchSummary)
    strategy: StrategySummary = Field(default_factory=StrategySummary)
    copy: CopySummary = Field(default_factory=CopySummary)
    image: ImageSummary = Field(default_factory=ImageSummary)

