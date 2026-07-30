"""
State Management for Multi-Agent Workflow

This file defines the shared state that flows through all agents.
Think of it as a shared document that each agent reads and writes to.
"""

import logging
logger = logging.getLogger(__name__)

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List


class CampaignState(BaseModel):
    """
    The complete state object that flows through the agent workflow.
    """
    
    # ==================== INPUT (User provides these) ====================
    campaign_id: Optional[str] = Field(
        default=None,
        description="Unique campaign ID passed from Express."
    )

    campaign_name: str = Field(
        description="Name of the marketing campaign"
    )
    
    brand_name: str = Field(
        description="Brand name"
    )
    
    industry: str = Field(
        description="Industry sector (saas, ecommerce, finance, healthcare, other)"
    )
    
    primary_goal: str = Field(
        description="Primary campaign goal (awareness, lead_gen, sales, retention, engagement)"
    )

    target_audience: Optional[str] = Field(
        default="",
        description="Detailed description of target audience"
    )

    brand_voice: Optional[str] = Field(
        default="professional",
        description="Brand voice style (professional, friendly, bold, luxury, casual, authoritative)"
    )

    brief: Optional[str] = Field(
        default=None,
        description="Campaign brief and main objectives"
    )
    
    client_memory_context: Optional[str] = Field(
        default=None,
        description="Past client campaign history context"
    )

    # ==================== CAMPAIGN INTELLIGENCE OBJECT (CIO) ====================
    campaign_intelligence_object: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Central shared memory layer preserving business context, ICP, persona, buyer objections, and positioning rules"
    )

    # ==================== AGENT OUTPUTS ====================
    manager_output: Optional[str] = Field(default=None)
    research_output: Optional[str] = Field(default=None)
    strategy_output: Optional[str] = Field(default=None)
    copy_output: Optional[str] = Field(default=None)
    creative_hook_matrix_output: Optional[str] = Field(default=None)
    image_output: Optional[str] = Field(default=None)
    review_output: Optional[str] = Field(default=None)
    publisher_output: Optional[str] = Field(default=None)

    # ==================== REVISION TARGETS & WORKFLOW METADATA ====================
    status: str = Field(default="pending")
    next_step: Optional[str] = Field(default=None)
    review_feedback: Optional[str] = Field(default=None)
    human_revision_target: Optional[str] = Field(default=None)
    human_approval_status: Optional[str] = Field(default=None)
    human_feedback: Optional[str] = Field(default=None)
    awaiting_human_approval: bool = Field(default=False)
    workflow_finished: bool = Field(default=False)
    error: Optional[str] = Field(default=None)

    # Revision counters
    research_revision_count: int = Field(default=0)
    strategy_revision_count: int = Field(default=0)
    copy_revision_count: int = Field(default=0)
    creative_hook_matrix_revision_count: int = Field(default=0)
    image_revision_count: int = Field(default=0)
