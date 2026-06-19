from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Literal


# ==================== MANAGER OUTPUT SCHEMA ====================

class ManagerOutput(BaseModel):
    campaign_name: str = Field(description="Campaign identifier")
    brand_name: str = Field(description="Brand identifier")
    industry: str = Field(description="Industry sector")
    primary_goal: str = Field(description="Campaign goal")
    target_audience: str = Field(description="Target audience description")
    brand_voice: str = Field(description="Brand tone and voice")
    channels: List[str] = Field(description="Recommended distribution channels")
    deliverables: List[str] = Field(description="Content/assets to create")


# ==================== RESEARCH OUTPUT SCHEMA ====================

class MarketAnalysis(BaseModel):
    total_addressable_market: str = Field(description="Total addressable market size")
    growth_rate: str = Field(description="Market growth rate")
    market_trends: List[str] = Field(description="Current market trends")

class CompetitorAnalysis(BaseModel):
    top_competitors: List[str] = Field(description="List of top competitors")
    differentiation_opportunity: str = Field(description="Differentiation strategy")

class AudienceInsights(BaseModel):
    pain_points: List[str] = Field(description="Customer pain points")
    motivations: List[str] = Field(description="Customer motivations")
    preferred_channels: List[str] = Field(description="Preferred communication channels")

class ResearchOutput(BaseModel):
    market_analysis: MarketAnalysis
    competitor_analysis: CompetitorAnalysis
    audience_insights: AudienceInsights
    market_opportunities: List[str] = Field(description="Market growth opportunities")
    recommended_approach: str = Field(description="Recommended strategic approach")


# ==================== STRATEGY OUTPUT SCHEMA ====================

class ChannelPlan(BaseModel):
    priority: str = Field(description="Channel priority level")
    rationale: str = Field(description="Reason for prioritization")
    tactics: List[str] = Field(description="Channel-specific tactics")

class AudienceSegment(BaseModel):
    segment_name: str = Field(description="Segment identifier")
    demographics: str = Field(description="Demographic profile")
    psychographics: str = Field(description="Psychographic profile")
    key_message: str = Field(description="Tailored message for segment")

class TimelinePhase(BaseModel):
    phase_name: str = Field(description="Phase name")
    duration: str = Field(description="Phase duration")
    activities: List[str] = Field(description="Activities in this phase")
    start_date: Optional[str] = Field(default=None, description="Phase start date")
    end_date: Optional[str] = Field(default=None, description="Phase end date")

class SuccessMetrics(BaseModel):
    kpis: List[str] = Field(description="Key performance indicators")
    targets: Dict[str, str] = Field(description="Target values for KPIs")

class CompetitiveDifferentiation(BaseModel):
    competitors: List[str] = Field(description="List of main competitors")
    primary_differentiation: str = Field(description="Primary differentiation strategy")
    competitive_advantage: str = Field(description="Key competitive advantage")
    unique_value_proposition: str = Field(description="Unique value proposition")
    positioning_statement: str = Field(description="Market positioning")

class BudgetAllocation(BaseModel):
    high_priority_channels: str = Field(description="Budget for high priority channels")
    medium_priority_channels: str = Field(description="Budget for medium priority channels")
    content_creation: str = Field(description="Budget for content creation")
    community_management: str = Field(description="Budget for community management")

class Execution(BaseModel):
    channels: List[str] = Field(description="Execution channels")
    deliverables: List[str] = Field(description="Content deliverables")
    budget_allocation: BudgetAllocation

class ResearchFoundation(BaseModel):
    market_analysis: MarketAnalysis
    competitor_analysis: CompetitorAnalysis
    audience_insights: AudienceInsights
    market_opportunities: List[str]
    recommended_approach: str

class StrategyOutput(BaseModel):
    positioning: str = Field(description="Brand positioning statement")
    key_messages: List[str] = Field(description="Key campaign messages", min_length=3, max_length=5)
    content_pillars: List[str] = Field(description="Content themes", min_length=3, max_length=5)
    channel_strategy: Dict[str, ChannelPlan] = Field(description="Channel-specific strategies")
    audience_segments: List[AudienceSegment] = Field(description="Target audience segments")
    timeline: Dict[str, TimelinePhase] = Field(description="Campaign timeline phases")
    success_metrics: SuccessMetrics
    competitive_differentiation: CompetitiveDifferentiation
    market_opportunities: List[str] = Field(description="Tactical opportunities")
    strategic_approach: str = Field(description="Overall strategic direction")
    inferred_goal: Literal["awareness", "lead_gen", "sales", "retention"] = Field(description="Campaign goal type: awareness, lead_gen, sales, or retention")
    research_foundation: ResearchFoundation
    execution: Execution


# ==================== COPYWRITER OUTPUT SCHEMA ====================

class CTAs(BaseModel):
    primary: str = Field(description="Primary call to action")
    secondary: str = Field(description="Secondary call to action")
    tertiary: Optional[str] = Field(default=None, description="Tertiary call to action")

class ChannelCopy(BaseModel):
    headline: str = Field(description="Channel-specific headline")
    body: str = Field(description="Channel-specific body copy")
    ctas: CTAs = Field(description="Call to action variations")

class EmailCopy(BaseModel):
    subject: str = Field(description="Email subject line")
    headline: str = Field(description="Email headline")
    body: str = Field(description="Email body copy")
    ctas: CTAs

class SegmentMessaging(BaseModel):
    segment_name: str
    message: str
    tone: str

class ChannelMessaging(BaseModel):
    channel_name: str
    approach: str
    key_points: List[str]

class MessagingFramework(BaseModel):
    brand_promise: str = Field(description="Core brand promise")
    value_proposition: str = Field(description="Value proposition statement")
    segment_messaging: List[SegmentMessaging] = Field(description="Segment-specific messaging")
    channel_messaging: List[ChannelMessaging] = Field(description="Channel-specific messaging")

class StrategicAlignment(BaseModel):
    positioning_used: str = Field(description="Positioning statement used")
    key_messages_count: int = Field(description="Number of key messages integrated")
    deliverables: List[str] = Field(description="Deliverables covered")

class CopywriterOutput(BaseModel):
    inferred_goal: Literal["awareness", "lead_gen", "sales", "retention"] = Field(description="Campaign goal: awareness, lead_gen, sales, or retention")
    instagram: Optional[ChannelCopy] = None
    facebook: Optional[ChannelCopy] = None
    linkedin: Optional[ChannelCopy] = None
    twitter: Optional[ChannelCopy] = None
    tiktok: Optional[ChannelCopy] = None
    youtube: Optional[ChannelCopy] = None
    email: Optional[EmailCopy] = None
    google_ads: Optional[ChannelCopy] = None
    messaging_framework: MessagingFramework
    strategic_alignment: StrategicAlignment
    copy_readiness: Dict[str, bool] = Field(description="Channel readiness flags")


# ==================== IMAGE PROMPT OUTPUT SCHEMA ====================

class ImagePrompt(BaseModel):
    deliverable_name: str = Field(description="Name of the deliverable")
    prompt: str = Field(description="DALL-E image generation prompt")
    rationale: str = Field(description="Reasoning for this prompt")
    visual_elements: List[str] = Field(description="Key visual elements")
    style_keywords: List[str] = Field(description="Style keywords for consistency")

class VisualDirection(BaseModel):
    overall_style: str = Field(description="Overall visual style")
    color_palette: List[str] = Field(description="Color palette")
    mood: str = Field(description="Visual mood and tone")
    key_visual_themes: List[str] = Field(description="Visual themes")

class ImagePromptOutput(BaseModel):
    visual_direction: VisualDirection
    image_prompts: List[ImagePrompt] = Field(description="Image generation prompts")


# ==================== REVIEWER OUTPUT SCHEMA ====================

class AgentReview(BaseModel):
    score: int = Field(description="Quality score out of 100", ge=0, le=100)
    approved: bool = Field(description="Whether agent output is approved")
    feedback: str = Field(description="Overall feedback")
    issues: List[str] = Field(description="Specific issues found")
    action_items: List[str] = Field(description="Required action items")

class OverallReview(BaseModel):
    quality_score: int = Field(description="Overall quality score", ge=0, le=100)
    summary: str = Field(description="Overall summary")
    strengths: List[str] = Field(description="Campaign strengths")
    critical_improvements: List[str] = Field(description="Critical improvements needed")

class ReviewerOutput(BaseModel):
    status: str = Field(description="Review status: approved or revision_required")
    research_review: AgentReview
    strategy_review: AgentReview
    copy_review: AgentReview
    image_review: AgentReview
    overall: OverallReview


# ==================== PUBLISHER OUTPUT SCHEMA ====================

class CopyAsset(BaseModel):
    asset: str
    status: str
    headline: Optional[str] = None
    notes: Optional[str] = None

class VisualAsset(BaseModel):
    asset: str
    status: str
    aspect_ratio: Optional[str] = None
    style: Optional[str] = None
    notes: Optional[str] = None

class AssetChecklist(BaseModel):
    copy_assets: List[CopyAsset]
    visual_assets: List[VisualAsset]
    missing_assets: List[str]

class ChannelPublishingPlan(BaseModel):
    channel: str
    priority: str
    content_type: str
    publish_frequency: str
    optimal_timing: str
    copy_asset_used: str
    visual_asset_used: str
    kpi_targets: Dict[str, str]
    launch_date: str
    status: str

class WeekActivity(BaseModel):
    channel: str
    day: str
    content_type: str
    description: str

class WeekPlan(BaseModel):
    week_number: int
    week_label: str
    week_start_date: str
    theme: str
    activities: List[WeekActivity]

class ContentCalendar(BaseModel):
    total_weeks: int
    start_date: str
    end_date: Optional[str] = None
    weeks: List[WeekPlan]

class ProjectedMetrics(BaseModel):
    total_reach: str
    lead_target: str
    estimated_ctr: str
    estimated_cost: str
    roi_projection: str
    projection_note: str
    channel_breakdown: Dict[str, str]
    timeline_to_results: str
    projection_confidence: str
    confidence_explanation: str

class PublisherOutput(BaseModel):
    publishing_decision: str = Field(description="APPROVED_FOR_PUBLISHING, REVISIONS_NEEDED, or HOLD")
    decision_rationale: str = Field(description="Why this decision was made")
    publishing_plan: List[ChannelPublishingPlan] = Field(description="Per-channel distribution plans")
    content_calendar: ContentCalendar = Field(description="Week-by-week content schedule")
    asset_checklist: AssetChecklist = Field(description="Copy and visual asset inventory")
    projected_metrics: ProjectedMetrics = Field(description="Expected campaign performance")
    executive_summary: str = Field(description="4-6 sentence summary for stakeholders")
