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
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "campaign_name": "Q3 Product Launch",
                "brand_name": "AgentMark",
                "industry": "saas",
                "primary_goal": "lead_gen",
                "target_audience": "Enterprise CTOs",
                "brand_voice": "professional",
                "manager_output": None,
                "research_output": None,
                "strategy_output": None,
                "copy_output": None,
                "image_output": None,
                "review_output": None,
                "publisher_output": None,
                "status": "pending",
                "error": None
            }
        }
    )
    
    # ==================== INPUT (User provides these) ====================
    campaign_name: str = Field(
        description="Name of the marketing campaign",
        json_schema_extra={"example": "Q3 Product Launch"}
    )
    
    brand_name: str = Field(
        description="Brand name",
        json_schema_extra={"example": "AgentMark"}
    )
    
    industry: str = Field(
        description="Industry sector (saas, ecommerce, finance, healthcare, other)",
        json_schema_extra={"example": "saas"}
    )
    
    primary_goal: str = Field(
        description="Primary campaign goal (awareness, lead_gen, sales, retention)",
        json_schema_extra={"example": "lead_gen"}
    )
    
    target_audience: str = Field(
        description="Detailed description of target audience",
        json_schema_extra={"example": "Enterprise CTOs, tech leads, companies with 1000+ employees, budget >$100k"}
    )
    
    brand_voice: str = Field(
        description="Brand voice style (professional, friendly, bold, luxury, casual, authoritative)",
        json_schema_extra={"example": "professional"}
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
    
    error: Optional[str] = Field(
        default=None,
        description="Error message if any agent fails"
    )


# Example usage:
if __name__ == "__main__":
    print("=" * 80)
    print("AGENTMARK - 7 AGENT WORKFLOW STATE")
    print("=" * 80)
    
    # 1. INITIAL STATE (User Input) - All 6 required fields
    print("\n[STEP 1] User Creates Campaign - Initial State:")
    print("-" * 80)
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads",
        brand_voice="professional",
        brief="Launch new AI-powered SaaS product"
    )
    print(initial_state.model_dump_json(indent=2))
    
    # 2. MANAGER AGENT processes
    print("\n[STEP 2] Manager Agent Processes - Orchestration Plan:")
    print("-" * 80)
    initial_state.manager_output = "Orchestration Plan: Start research in parallel with strategy planning. Estimated timeline: 5 days. Dependencies: Research → Strategy → Copy."
    initial_state.status = "manager_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 3. RESEARCH AGENT processes
    print("\n[STEP 3] Research Agent Processes - Market Analysis:")
    print("-" * 80)
    initial_state.research_output = "Market Size: $50B. Growth Rate: 40% YoY. Top Competitors: Competitor A, B, C. Market Trends: AI adoption, automation, cost reduction. Customer Pain Points: Complexity, integration, pricing."
    initial_state.status = "research_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 4. STRATEGY AGENT processes
    print("\n[STEP 4] Strategy Agent Processes - Marketing Strategy:")
    print("-" * 80)
    initial_state.strategy_output = "Strategy: Position as 'Enterprise AI Without the Complexity'. Primary Channels: LinkedIn, Tech Blogs, Industry Conferences. Budget Allocation: 40% LinkedIn Ads, 30% Content, 20% PR, 10% Events. Timeline: 12-week campaign."
    initial_state.status = "strategy_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 5. COPYWRITER AGENT processes
    print("\n[STEP 5] Copywriter Agent Processes - Marketing Copy:")
    print("-" * 80)
    initial_state.copy_output = "Headline: 'Enterprise AI Without the Complexity'. Subheading: 'Deploy powerful AI workflows in hours, not months'. Body Copy: 'Eliminate silos. Reduce complexity. Accelerate time-to-value.' CTA: 'Start Free Trial Now'."
    initial_state.status = "copy_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 6. IMAGE PROMPT AGENT processes
    print("\n[STEP 6] Image Prompt Agent Processes - DALL-E Prompts:")
    print("-" * 80)
    initial_state.image_output = "Prompt 1: 'Modern tech office, person using AI dashboard, minimalist design, professional lighting'. Prompt 2: 'Abstract AI network visualization, connected nodes, enterprise setting'."
    initial_state.status = "image_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 7. REVIEWER AGENT processes
    print("\n[STEP 7] Reviewer Agent Processes - Quality Review:")
    print("-" * 80)
    initial_state.review_output = "Quality Score: 8.5/10. Strengths: Clear positioning, strong copy, aligned with audience. Suggestions: Add more social proof, include pricing comparison table. Approval Status: APPROVED with minor revisions."
    initial_state.status = "review_complete"
    print(initial_state.model_dump_json(indent=2))
    
    # 8. PUBLISHER AGENT processes
    print("\n[STEP 8] Publisher Agent Processes - Distribution Plan:")
    print("-" * 80)
    initial_state.publisher_output = "Distribution Channels: LinkedIn (Week 1-2), Tech Blogs (Week 2-3), Webinar (Week 3), Email Campaign (Week 1-4), Social Media (Daily). Expected Reach: 500K impressions. Lead Target: 5K MQLs."
    initial_state.status = "completed"
    print(initial_state.model_dump_json(indent=2))
    
    print("\n" + "=" * 80)
    print("WORKFLOW COMPLETE - CAMPAIGN READY FOR EXECUTION")
    print("=" * 80)
