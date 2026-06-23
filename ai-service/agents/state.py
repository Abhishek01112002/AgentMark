"""
State Management for Multi-Agent Workflow

This file defines the shared state that flows through all agents.
Think of it as a shared document that each agent reads and writes to.

Complete Workflow:
  User Input
    ↓
  [STATE] ← Manager Agent orchestrates
    ↓
  [STATE] ← Research Agent adds research_output
    ↓
  [STATE] ← Strategy Agent adds strategy_output
    ↓
  [STATE] ← Copywriter Agent adds copy_output
    ↓
  [STATE] ← Image Prompt Agent adds image_output
    ↓
  [STATE] ← Reviewer Agent adds review_output
    ↓
  [STATE] ← Publisher Agent adds publisher_output
    ↓
  Final Campaign Output
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional


class CampaignState(BaseModel):
    """
    The complete state object that flows through the 7-agent workflow.
    
    Each agent reads some fields and writes to others.
    
    AGENTS & THEIR ROLES:
    1. Manager Agent - Orchestrates the workflow, breaks down the campaign
    2. Research Agent - Conducts market research, competitor analysis
    3. Strategy Agent - Creates marketing strategy based on research
    4. Copywriter Agent - Writes compelling copy and messaging
    5. Image Prompt Agent - Creates DALL-E image prompts
    6. Reviewer Agent - Reviews and scores the campaign quality
    7. Publisher Agent - Plans distribution and publishing strategy
    """
    
    # ==================== INPUT (User provides these) ====================
    campaign_id: Optional[str] = Field(
        default=None,
        description="Unique campaign ID (PostgreSQL UUID) passed from Express. Used as the Redis Pub/Sub channel ID for live status updates."
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
        description="Primary campaign goal (awareness, lead_gen, sales, retention)"
    )
    
    target_audience: str = Field(
        description="Detailed description of target audience"
    )
    
    brand_voice: str = Field(
        description="Brand voice style (professional, friendly, bold, luxury, casual, authoritative)"
    )
    
    brief: Optional[str] = Field(
        default=None,
        description="Campaign brief and main objectives (optional, auto-generated if not provided)"
    )
    
    # ==================== AGENT 1: MANAGER AGENT OUTPUT ====================
    manager_output: Optional[str] = Field(
        default=None,
        description="Manager Agent output - Campaign breakdown and orchestration plan"
    )
    
    # ==================== AGENT 2: RESEARCH AGENT OUTPUT ====================
    research_output: Optional[str] = Field(
        default=None,
        description="Research Agent output - Market analysis, competitors, trends, audience insights"
    )
    
    # ==================== AGENT 3: STRATEGY AGENT OUTPUT ====================
    strategy_output: Optional[str] = Field(
        default=None,
        description="Strategy Agent output - Marketing strategy, channels, timeline, positioning"
    )
    
    # ==================== AGENT 4: COPYWRITER AGENT OUTPUT ====================
    copy_output: Optional[str] = Field(
        default=None,
        description="Copywriter Agent output - Headlines, body copy, CTAs, messaging"
    )
    
    # ==================== AGENT 5: IMAGE PROMPT AGENT OUTPUT ====================
    image_output: Optional[str] = Field(
        default=None,
        description="Image Prompt Agent output - DALL-E 3 image generation prompts"
    )
    
    # ==================== AGENT 6: REVIEWER AGENT OUTPUT ====================
    review_output: Optional[str] = Field(
        default=None,
        description="Reviewer Agent output - Quality assessment, score (1-10), feedback, suggestions"
    )
    
    # ==================== AGENT 7: PUBLISHER AGENT OUTPUT ====================
    publisher_output: Optional[str] = Field(
        default=None,
        description="Publisher Agent output - Distribution plan, channels, schedule, publishing strategy"
    )
    
    # ==================== METADATA ====================
    status: str = Field(
        default="pending",
        description="Current workflow status (pending, manager_complete, research_complete, strategy_complete, copy_complete, image_complete, review_complete, publisher_complete, completed, error)"
    )
    
    next_step: Optional[str] = Field(
        default=None,
        description="Next action to take (proceed_to_publisher, await_research_revision, await_strategy_revision, await_copy_revision, await_image_revision)"
    )
    
    review_feedback: Optional[str] = Field(
        default=None,
        description="Feedback from Reviewer Agent if revision is required"
    )
    
    research_revision_count: Optional[int] = Field(
        default=0,
        description="Number of times Research Agent has been sent back for revision (max 3)"
    )
    
    strategy_revision_count: Optional[int] = Field(
        default=0,
        description="Number of times Strategy Agent has been sent back for revision (max 3)"
    )
    
    copy_revision_count: Optional[int] = Field(
        default=0,
        description="Number of times Copywriter Agent has been sent back for revision (max 3)"
    )
    
    image_revision_count: Optional[int] = Field(
        default=0,
        description="Number of times Image Prompt Agent has been sent back for revision (max 3)"
    )
    
    error: Optional[str] = Field(
        default=None,
        description="Error message if any agent fails"
    )
    
    # ==================== HUMAN-IN-THE-LOOP (HITL) ====================
    human_approval_status: Optional[str] = Field(
        default=None,
        description="Human approval status (pending, approved, rejected)"
    )
    
    human_feedback: Optional[str] = Field(
        default=None,
        description="Human feedback message if revision is requested"
    )
    
    human_revision_target: Optional[str] = Field(
        default=None,
        description="Which agent to send back for revision based on human feedback (research, strategy, copywriter, image_prompt)"
    )
    
    awaiting_human_approval: bool = Field(
        default=False,
        description="Flag indicating workflow is paused and awaiting human approval"
    )
    
    workflow_finished: bool = Field(
        default=False,
        description="Flag indicating workflow has completely finished (set by Publisher)"
    )


# Module-level information
if __name__ == "__main__":
    print("="*80)
    print("CampaignState - Pydantic Model for LangGraph Workflow")
    print("="*80)
    print("\nThis module defines the state structure for the 7-agent workflow.")
    print("\nUsage:")
    print("  from agents.state import CampaignState")
    print("\n  state = CampaignState(**user_data)")
    print("="*80)
