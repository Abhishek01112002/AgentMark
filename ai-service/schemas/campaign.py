"""
Campaign Schemas

Pydantic models for API request/response validation.
Matches the structure expected by the FastAPI routes and LangGraph state.
"""

import json
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, Field


def try_parse_json(val: Any) -> Optional[dict]:
    """Parse stringified JSON or pass dict through."""
    if not val:
        return None
    if isinstance(val, dict):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return {"raw": val}
    return None


# ── Request Models ────────────────────────────────────────────────────────────

class CampaignCreateRequest(BaseModel):
    """Payload sent from Express.js to FastAPI /campaigns/create."""
    campaign_name: str = Field(
        min_length=1,
        max_length=255,
        description="Name of the campaign",
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
    creative_hook_matrix_revision_count: Optional[int] = Field(default=0)
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
        description="True if Publisher completed and campaign is done"
    )
    outputs: AgentOutputs = Field(description="Parsed JSON outputs for all agents")


class CopyVariantRequest(BaseModel):
    campaign_id: str
    channel: str
    target_audience: str
    brand_voice: str
    brand_name: Optional[str] = None
    industry: Optional[str] = None
    brief: Optional[str] = None
    steering_note: Optional[str] = None
    strategy_data: Optional[str] = None
    existing_copy: Optional[str] = None
    focus_group_context: Optional[str] = None
    llm_config: Optional[Dict[str, Any]] = None
