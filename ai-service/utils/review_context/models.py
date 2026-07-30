import warnings
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator

warnings.filterwarnings("ignore", message=".*Field name \"copy\" in \"ReviewerContext\".*")


class ResearchSummary(BaseModel):
    model_config = {"populate_by_name": True}

    status: str = "EMPTY"
    total_addressable_market: str = Field("N/A", alias="tam")
    growth_rate: str = Field("N/A", alias="cagr")
    market_trends: List[str] = Field(default_factory=list, alias="tr")
    top_competitors: List[str] = Field(default_factory=list, alias="comp")
    differentiation_opportunity: str = Field("N/A", alias="diff")
    pain_points: List[str] = Field(default_factory=list, alias="pain")
    motivations: List[str] = Field(default_factory=list, alias="mot")
    preferred_channels: List[str] = Field(default_factory=list, alias="chan")
    recommended_approach: str = Field("N/A", alias="rec")
    customer_voice_insights: List[str] = Field(default_factory=list, alias="cvi")
    competitor_vulnerabilities: List[str] = Field(default_factory=list, alias="cv")
    proven_ad_hooks: List[str] = Field(default_factory=list, alias="pah")
    brand_dna: Optional[Dict[str, Any]] = Field(None, alias="dna")
    field_presence: Dict[str, bool] = Field(default_factory=dict, alias="fp")


class StrategySummary(BaseModel):
    model_config = {"populate_by_name": True}

    status: str = "EMPTY"
    positioning: str = Field("", alias="pos")
    key_messages: List[str] = Field(default_factory=list, alias="km")
    content_pillars: List[str] = Field(default_factory=list, alias="cp")
    audience_segments: List[str] = Field(default_factory=list, alias="aud")
    timeline_summary: str = Field("4 phases", alias="time")
    competitive_differentiation: str = Field("N/A", alias="diff")
    inferred_goal: str = Field("", alias="goal")
    customer_voice_insights: List[str] = Field(default_factory=list, alias="cvi")
    competitor_vulnerabilities: List[str] = Field(default_factory=list, alias="cv")
    proven_ad_hooks: List[str] = Field(default_factory=list, alias="pah")
    brand_dna: Optional[Dict[str, Any]] = Field(None, alias="dna")
    research_foundation_present: bool = Field(False, alias="rf")
    execution_present: bool = Field(False, alias="ex")
    field_presence: Dict[str, bool] = Field(default_factory=dict, alias="fp")

    @field_validator("audience_segments", "key_messages", "content_pillars", mode="before")
    @classmethod
    def _normalize_string_list(cls, v: Any) -> List[str]:
        if not isinstance(v, list):
            return []
        res = []
        for item in v:
            if isinstance(item, str):
                res.append(item[:150])
            elif isinstance(item, dict):
                name = item.get("segment_name") or item.get("name") or item.get("title") or item.get("pillar") or "Item"
                text = item.get("description") or item.get("message") or item.get("pain_point") or ""
                res.append(f"{name}: {text}".strip(": ")[:150])
            else:
                res.append(str(item)[:150])
        return res


class ChannelCopyMeta(BaseModel):
    model_config = {"populate_by_name": True}

    headline: str = Field("", alias="hl")
    primary_cta: str = Field("", alias="cta")
    body_snippet: str = Field("", alias="body")
    word_count: int = Field(0, alias="wc")


class CopySummary(BaseModel):
    model_config = {"populate_by_name": True}

    status: str = "EMPTY"
    inferred_goal: str = Field("", alias="goal")
    channels: List[str] = Field(default_factory=list, alias="ch")
    channel_copy_summaries: Dict[str, ChannelCopyMeta] = Field(default_factory=dict, alias="copies")
    messaging_framework_present: bool = Field(False, alias="mf")
    strategic_alignment_present: bool = Field(False, alias="sa")
    copy_readiness_present: bool = Field(False, alias="cr")
    field_presence: Dict[str, bool] = Field(default_factory=dict, alias="fp")


class ImagePromptMeta(BaseModel):
    model_config = {"populate_by_name": True}

    deliverable_name: str = Field("", alias="deliv")
    prompt_snippet: str = Field("", alias="snip")
    prompt_length: int = Field(0, alias="len")
    camera_specs: str = Field("N/A", alias="cam")
    has_valid_length: bool = Field(True, alias="ok")


class ImageSummary(BaseModel):
    model_config = {"populate_by_name": True}

    status: str = "EMPTY"
    overall_style: str = Field("", alias="style")
    mood: str = Field("", alias="mood")
    visual_themes: List[str] = Field(default_factory=list, alias="vt")
    prompt_count: int = Field(0, alias="cnt")
    prompts_meta: List[ImagePromptMeta] = Field(default_factory=list, alias="prompts")
    field_presence: Dict[str, bool] = Field(default_factory=dict, alias="fp")


class ReviewerContext(BaseModel):
    model_config = {"protected_namespaces": ()}

    research: ResearchSummary = Field(default_factory=ResearchSummary)
    strategy: StrategySummary = Field(default_factory=StrategySummary)
    copy: CopySummary = Field(default_factory=CopySummary)
    image: ImageSummary = Field(default_factory=ImageSummary)
