from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Optional, Literal


# ==================== CHANNEL ENUM ====================

class Channel(str, Enum):
    """Validated campaign channels. Used as keys in copy_output.copies."""
    INSTAGRAM = "instagram"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    TWITTER = "twitter"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"
    EMAIL = "email"
    GOOGLE_ADS = "google_ads"


# Display names for frontend rendering
CHANNEL_DISPLAY_NAMES: Dict[Channel, str] = {
    Channel.INSTAGRAM: "Instagram",
    Channel.FACEBOOK: "Facebook",
    Channel.LINKEDIN: "LinkedIn",
    Channel.TWITTER: "Twitter",
    Channel.TIKTOK: "TikTok",
    Channel.YOUTUBE: "YouTube",
    Channel.EMAIL: "Email",
    Channel.GOOGLE_ADS: "Google Ads",
}

# Set of valid channel name strings for fast lookup
_VALID_CHANNEL_NAMES: set[str] = {c.value for c in Channel}

# Known aliases that don't map via simple normalization
_CHANNEL_ALIASES: Dict[str, str] = {
    "x": "twitter",
    "tw": "twitter",
    "yt": "youtube",
    "ytb": "youtube",
    "adwords": "google_ads",
    "gmail": "email",
    "newsletter": "email",
    "e-mail": "email",
    "mail": "email",
}

# Suffixes that may follow a channel name (e.g. "LinkedIn Posts" → "linkedin")
_CHANNEL_SUFFIXES: list[str] = [
    "posts", "ads", "feed", "marketing", "videos", "stories",
    "page", "group", "account", "profile", "business", "handle",
    "channel", "community", "network", "content", "blog",
    "post", "ad", "story", "video", "carousel", "reel",
    "campaign", "promotion", "update", "newsletter",
]


def normalize_channel_name(raw: str) -> Optional[str]:
    """
    Robustly normalize an arbitrary channel string to a valid schema field name.

    Matching strategy (in order):
    1. Exact case-insensitive match
    2. Known alias lookup
    3. Underscore-normalized match (spaces/dashes → underscores)
    4. Progressive suffix stripping (right-to-left by word)
    5. Substring search against all valid channel names

    Returns the canonical channel name string (e.g. "linkedin", "google_ads")
    or *None* if no match is possible. Never raises.
    """
    if not raw or not isinstance(raw, str):
        return None

    cleaned = raw.lower().strip()

    # 1. Direct exact match
    if cleaned in _VALID_CHANNEL_NAMES:
        return cleaned

    # 2. Alias lookup (exact)
    if cleaned in _CHANNEL_ALIASES:
        return _CHANNEL_ALIASES[cleaned]

    # 3. Normalize separators and retry
    normalized = cleaned.replace(" ", "_").replace("-", "_").replace("/", "_")
    while "__" in normalized:
        normalized = normalized.replace("__", "_")
    normalized = normalized.strip("_")

    if normalized in _VALID_CHANNEL_NAMES:
        return normalized
    if normalized in _CHANNEL_ALIASES:
        return _CHANNEL_ALIASES[normalized]

    # 4. Progressive suffix stripping: try shorter prefixes
    words = normalized.split("_")
    for end in range(len(words), 0, -1):
        candidate = "_".join(words[:end])
        if candidate in _VALID_CHANNEL_NAMES:
            return candidate
        if candidate in _CHANNEL_ALIASES:
            return _CHANNEL_ALIASES[candidate]

    # 5. Also try stripping common suffixes from the original word list
    for end in range(len(words), 0, -1):
        suffix_part = "_".join(words[end - 1:end])
        if suffix_part in _CHANNEL_SUFFIXES:
            candidate = "_".join(words[:end - 1])
            if candidate in _VALID_CHANNEL_NAMES:
                return candidate
            if candidate in _CHANNEL_ALIASES:
                return _CHANNEL_ALIASES[candidate]

    # 6. Substring fallback: any valid channel name found inside the string
    for name in sorted(_VALID_CHANNEL_NAMES, key=len, reverse=True):
        if name in cleaned:
            return name

    return None


def normalize_channel_list(channels: list) -> list:
    """
    Normalize every channel name in a list.  Non-matching entries are dropped
    and a warning is printed so the developer can add missing aliases.
    """
    result: list[str] = []
    for ch in channels:
        normalized = normalize_channel_name(ch)
        if normalized:
            result.append(normalized)
        else:
            print(f"   ⚠️  Dropped unrecognized channel '{ch}' — "
                  f"add an alias in _CHANNEL_ALIASES if this is a valid platform")
    return result


def normalize_campaign_goal(raw) -> str:
    """
    Normalize LLM-friendly campaign goal wording to the strict schema enum.
    This prevents harmless values like "sale" or "lead generation" from
    triggering another expensive LLM call.
    """
    if raw is None:
        return "awareness"

    value = str(raw).lower().strip()
    normalized = (
        value.replace("-", "_")
        .replace(" ", "_")
        .replace("/", "_")
        .replace("&", "_")
    )
    while "__" in normalized:
        normalized = normalized.replace("__", "_")
    normalized = normalized.strip("_")

    exact_aliases = {
        "awareness": "awareness",
        "brand_awareness": "awareness",
        "visibility": "awareness",
        "reach": "awareness",
        "lead": "lead_gen",
        "leads": "lead_gen",
        "lead_gen": "lead_gen",
        "lead_generation": "lead_gen",
        "demand_gen": "lead_gen",
        "demand_generation": "lead_gen",
        "signup": "lead_gen",
        "signups": "lead_gen",
        "sale": "sales",
        "sales": "sales",
        "conversion": "sales",
        "conversions": "sales",
        "revenue": "sales",
        "purchase": "sales",
        "purchases": "sales",
        "retention": "retention",
        "retain": "retention",
        "loyalty": "retention",
        "engagement": "retention",
    }
    if normalized in exact_aliases:
        return exact_aliases[normalized]

    if "lead" in normalized or "signup" in normalized or "demand" in normalized:
        return "lead_gen"
    if "sale" in normalized or "conversion" in normalized or "revenue" in normalized or "purchase" in normalized:
        return "sales"
    if "retain" in normalized or "retention" in normalized or "loyalty" in normalized:
        return "retention"
    if "aware" in normalized or "visibility" in normalized or "reach" in normalized:
        return "awareness"

    return normalized


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
    literas_sources: list[dict] = Field(default_factory=list, description="LiteRAG web search sources")
    tavily_sources: list[dict] = Field(default_factory=list, description="Tavily web search sources")
    search_status: dict = Field(default_factory=dict, description="Search success/failure diagnostics")


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
    kpis: List[str] = Field(default_factory=list, description="Key performance indicators")
    targets: Dict[str, str] = Field(default_factory=dict, description="Target values for KPIs")

class CompetitiveDifferentiation(BaseModel):
    competitors: List[str] = Field(default_factory=list, description="List of main competitors")
    primary_differentiation: str = Field(default="", description="Primary differentiation strategy")
    competitive_advantage: str = Field(default="", description="Key competitive advantage")
    unique_value_proposition: str = Field(default="", description="Unique value proposition")
    positioning_statement: str = Field(default="", description="Market positioning")

class BudgetAllocation(BaseModel):
    high_priority_channels: str = Field(default="", description="Budget for high priority channels")
    medium_priority_channels: str = Field(default="", description="Budget for medium priority channels")
    content_creation: str = Field(default="", description="Budget for content creation")
    community_management: str = Field(default="", description="Budget for community management")

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
    content_calendar: ContentCalendar = Field(
        description="4-week structured content calendar generated by Strategy agent"
    )
    inferred_goal: Literal["awareness", "lead_gen", "sales", "retention"] = Field(description="Campaign goal type: awareness, lead_gen, sales, or retention")
    research_foundation: ResearchFoundation
    execution: Execution

    @field_validator("inferred_goal", mode="before")
    @classmethod
    def normalize_inferred_goal(cls, value):
        return normalize_campaign_goal(value)


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
    copies: Dict[Channel, Optional[ChannelCopy]] = Field(default_factory=dict, description="Channel-specific copy keyed by Channel enum")
    messaging_framework: MessagingFramework
    strategic_alignment: StrategicAlignment
    copy_readiness: Dict[str, bool] = Field(description="Channel readiness flags")

    @field_validator("inferred_goal", mode="before")
    @classmethod
    def normalize_inferred_goal(cls, value):
        return normalize_campaign_goal(value)


# ==================== IMAGE PROMPT OUTPUT SCHEMA ====================

class TextOverlay(BaseModel):
    headline: str = Field(description="Headline text")
    cta: str = Field(description="CTA button text")
    placement: str = Field(description="Where to place the text overlay (e.g. bottom-left, top-right, center)")

class ImagePrompt(BaseModel):
    deliverable_name: str = Field(description="Name of the deliverable")
    prompt: str = Field(description="DALL-E image generation prompt")
    rationale: str = Field(description="Reasoning for this prompt")
    visual_elements: List[str] = Field(description="Key visual elements")
    style_keywords: List[str] = Field(description="Style keywords for consistency")
    aspect_ratio: str = Field(description="Aspect ratio (16:9, 1:1, 9:16, 4:5, or 2:3)")
    style: str = Field(description="Artistic style description (e.g. modern corporate photography)")
    color_palette: str = Field(description="Color palette recommendation")
    text_overlay: Optional[TextOverlay] = Field(description="Suggested text overlay details", default=None)

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
    quality_score: Optional[int] = Field(default=None, description="Overall quality score (None if no review ran)", ge=0, le=100)
    summary: str = Field(description="Overall summary")
    strengths: List[str] = Field(description="Campaign strengths")
    critical_improvements: List[str] = Field(description="Critical improvements needed")

class ReviewerOutput(BaseModel):
    status: str = Field(description="Review status: approved, rejected, or review_failed")
    can_publish: bool = Field(description="Whether the campaign is cleared for publishing")
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

class CalendarActivity(BaseModel):
    day: str = Field(description="Day of week + date, e.g. 'Monday 2026-06-29'")
    channel: Channel
    content_type: str = Field(default="Post", description="Format of content e.g. Reel, Story, Post, Ad, Email, Video")
    description: str = Field(description="Detailed publishing instructions and execution directions (3-4 sentences). Explain exactly what the content contains, the visual setup, the key message, and step-by-step directions for the team.")
    caption_hook: str = Field(description="Opening line or hook for the content piece")
    effort: Literal["low", "medium", "high"]
    quick_win: bool = Field(description="True if task ships same day with no dependencies")

class CalendarWeek(BaseModel):
    week_label: str
    week_start_date: str
    theme: str
    activities: list[CalendarActivity] = Field(min_length=1, max_length=7)

class ContentCalendar(BaseModel):
    total_weeks: int
    campaign_start_date: str
    weeks: list[CalendarWeek] = Field(min_length=1)

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
