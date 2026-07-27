"""
Campaign Schemas

Request/response models and enums for campaign creation.
"""

import json
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field

# ── Request Model ─────────────────────────────────────────────────────────────

class CampaignCreateRequest(BaseModel):
    """Input payload for creating a new campaign."""

    campaign_name: str = Field(
        min_length=1,
        max_length=255,
        description="Name of the marketing campaign",
        examples=["Black Friday Mega Sale 2024"],
    )
    brand_name: str = Field(
        min_length=1,
        max_length=255,
        description="Brand name",
        examples=["TechGadgets Pro"],
    )
    industry: str = Field(
        min_length=1,
        max_length=255,
        description="Industry sector or custom industry text",
        examples=["ecommerce", "Sports Entertainment"],
    )
    primary_goal: str = Field(
        min_length=1,
        max_length=255,
        description="Primary campaign objective or custom goal text",
        examples=["sales", "Increase Popularity"],
    )
    target_audience: str = Field(
        min_length=1,
        max_length=2000,
        description="Detailed description of the target audience",
        examples=["Tech enthusiasts aged 25-45, early adopters with disposable income"],
    )
    brand_voice: str = Field(
        min_length=1,
        max_length=255,
        description="Brand voice style",
        examples=["bold", "friendly"],
    )
    brief: Optional[str] = Field(
        default=None,
        max_length=10000,
        description="Campaign brief (optional — auto-generated if omitted)",
        examples=["Drive 100 free trial signups in 30 days targeting Product Managers."],
    )
    llm_config: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Provider API keys sent from the frontend",
    )
    campaign_id: str = Field(
        ...,
        description="PostgreSQL campaign UUID passed from Express. Used as the Redis channel ID for real-time status updates.",
    )
    manager_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    research_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    strategy_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    copy_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    creative_hook_matrix_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    image_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    review_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    publisher_output: Optional[Union[str, Dict[str, Any], Any]] = Field(default=None)
    human_approval_status: Optional[str] = Field(default=None)
    human_feedback: Optional[str] = Field(default=None)
    human_revision_target: Optional[str] = Field(default=None)
    # HITL revision counts
    research_revision_count: Optional[int] = Field(default=0)
    strategy_revision_count: Optional[int] = Field(default=0)
    copy_revision_count: Optional[int] = Field(default=0)
    image_revision_count: Optional[int] = Field(default=0)
    client_memory_context: Optional[str] = Field(default=None)

    model_config = {"use_enum_values": True}


# ── Response Models ───────────────────────────────────────────────────────────

class AgentOutputs(BaseModel):
    """All agent outputs, parsed from JSON strings to dicts."""
    manager_output: Optional[dict] = None
    research_output: Optional[dict] = None
    strategy_output: Optional[dict] = None
    copy_output: Optional[dict] = None
    creative_hook_matrix_output: Optional[dict] = None
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


class CopyVariantRequest(BaseModel):
    campaign_id: str
    channel: str
    steering_note: str = ""
    existing_copy: Optional[str] = None
    strategy_data: Optional[str] = None
    brief: str = ""
    brand_voice: str = "professional"
    target_audience: str = ""
    llm_config: Optional[dict] = None
    focus_group_context: Optional[str] = None  # Stringified focus group recommendations to inject into variant prompt
