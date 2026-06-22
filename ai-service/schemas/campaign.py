"""
Campaign Schemas

Request/response models and enums for campaign creation.
"""

import json
from typing import Optional
from enum import Enum
from pydantic import BaseModel, Field


# ── Enums ─────────────────────────────────────────────────────────────────────

class Industry(str, Enum):
    saas = "saas"
    ecommerce = "ecommerce"
    finance = "finance"
    healthcare = "healthcare"
    other = "other"


class PrimaryGoal(str, Enum):
    awareness = "awareness"
    lead_gen = "lead_gen"
    sales = "sales"
    retention = "retention"


class BrandVoice(str, Enum):
    professional = "professional"
    friendly = "friendly"
    bold = "bold"
    luxury = "luxury"
    casual = "casual"
    authoritative = "authoritative"


# ── Request Model ─────────────────────────────────────────────────────────────

class CampaignCreateRequest(BaseModel):
    """Input payload for creating a new campaign."""

    campaign_name: str = Field(
        min_length=2,
        max_length=140,
        description="Name of the marketing campaign",
        examples=["Black Friday Mega Sale 2024"],
    )
    brand_name: str = Field(
        min_length=1,
        max_length=80,
        description="Brand name",
        examples=["TechGadgets Pro"],
    )
    industry: Industry = Field(
        description="Industry sector",
        examples=["ecommerce"],
    )
    primary_goal: PrimaryGoal = Field(
        description="Primary campaign objective",
        examples=["sales"],
    )
    target_audience: str = Field(
        min_length=10,
        max_length=500,
        description="Detailed description of the target audience",
        examples=["Tech enthusiasts aged 25-45, early adopters with disposable income"],
    )
    brand_voice: BrandVoice = Field(
        description="Brand voice style",
        examples=["bold"],
    )
    brief: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="Campaign brief (optional — auto-generated if omitted)",
        examples=["Drive 100 free trial signups in 30 days targeting Product Managers."],
    )

    model_config = {"use_enum_values": True}


# ── Response Models ───────────────────────────────────────────────────────────

class AgentOutputs(BaseModel):
    """All agent outputs, parsed from JSON strings to dicts."""
    manager_output: Optional[dict] = None
    research_output: Optional[dict] = None
    strategy_output: Optional[dict] = None
    copy_output: Optional[dict] = None
    image_output: Optional[dict] = None
    review_output: Optional[dict] = None
    publisher_output: Optional[dict] = None


class CampaignCreateResponse(BaseModel):
    """Response returned after the LangGraph workflow completes."""
    campaign_id: str = Field(description="Unique ID for this campaign run")
    status: str = Field(description="Final workflow status")
    campaign_name: str
    brand_name: str
    error: Optional[str] = Field(default=None, description="Error message if any agent failed")
    awaiting_human_approval: bool = Field(
        description="True if workflow is paused at the Human-in-the-Loop gate"
    )
    workflow_finished: bool = Field(
        description="True if Publisher executed and workflow is complete"
    )
    outputs: AgentOutputs = Field(description="All agent outputs as parsed JSON objects")


# ── Helpers ───────────────────────────────────────────────────────────────────

def try_parse_json(raw: Optional[str]) -> Optional[dict]:
    """Parse a JSON string to dict; wrap unparsable strings in {raw: ...}."""
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {"raw": raw}
