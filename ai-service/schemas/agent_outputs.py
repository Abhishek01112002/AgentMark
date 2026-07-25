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
    campaign_name: str = Field(default="", description="Campaign identifier")
    brand_name: str = Field(default="", description="Brand identifier")
    industry: str = Field(default="", description="Industry sector")
    primary_goal: str = Field(default="awareness", description="Campaign goal")
    target_audience: str = Field(default="", description="Target audience description")
    brand_voice: str = Field(default="professional", description="Brand tone and voice")
    channels: List[str] = Field(default_factory=list, description="Recommended distribution channels")
    deliverables: List[str] = Field(default_factory=list, description="Content/assets to create")

    @field_validator("channels", mode="before")
    @classmethod
    def validate_and_normalize_channels(cls, v: Any) -> List[str]:
        """Enforces minimum 4 and maximum 6 recommended distribution channels."""
        all_possible = ["instagram", "facebook", "linkedin", "twitter", "tiktok", "youtube", "email", "google_ads"]
        raw_list = v if isinstance(v, list) else []
        normalized: List[str] = []
        for ch in raw_list:
            if not isinstance(ch, str):
                continue
            c_clean = ch.strip().lower().replace(" ", "_").replace("-", "_")
            if c_clean in all_possible and c_clean not in normalized:
                normalized.append(c_clean)
        
        # Supplement up to 4 if fewer than 4 provided
        if len(normalized) < 4:
            for default_ch in ["instagram", "email", "linkedin", "facebook", "twitter", "tiktok"]:
                if default_ch not in normalized:
                    normalized.append(default_ch)
                if len(normalized) >= 4:
                    break
        
        # Cap at 6 maximum
        return normalized[:6]


# ==================== RESEARCH OUTPUT SCHEMA ====================

class MarketAnalysis(BaseModel):
    total_addressable_market: str = Field(default="", description="Total addressable market size")
    growth_rate: str = Field(default="", description="Market growth rate")
    market_trends: List[str] = Field(default_factory=list, description="Current market trends")

class CompetitorAnalysis(BaseModel):
    top_competitors: List[str] = Field(default_factory=list, description="List of top competitors")
    differentiation_opportunity: str = Field(default="", description="Differentiation strategy")

class AudienceInsights(BaseModel):
    pain_points: List[str] = Field(default_factory=list, description="Customer pain points")
    motivations: List[str] = Field(default_factory=list, description="Customer motivations")
    preferred_channels: List[str] = Field(default_factory=list, description="Preferred communication channels")
    language_style: str = Field(default="Professional, data-driven, concise, focusing on outcomes and efficiency.", description="Communication style and tone preferences")


class ResearchOutput(BaseModel):
    market_analysis: MarketAnalysis = Field(default_factory=MarketAnalysis)
    competitor_analysis: CompetitorAnalysis = Field(default_factory=CompetitorAnalysis)
    audience_insights: AudienceInsights = Field(default_factory=AudienceInsights)
    market_opportunities: List[str] = Field(default_factory=list, description="Market growth opportunities")
    recommended_approach: str = Field(default="", description="Recommended strategic approach")
    literas_sources: list[dict] = Field(default_factory=list, description="LiteRAG web search sources")
    tavily_sources: list[dict] = Field(default_factory=list, description="Tavily web search sources")
    search_status: dict = Field(default_factory=dict, description="Search success/failure diagnostics")


# ==================== STRATEGY OUTPUT SCHEMA ====================

class ChannelPlan(BaseModel):
    priority: str = Field(default="medium", description="Channel priority level")
    rationale: str = Field(default="", description="Reason for prioritization")
    tactics: List[str] = Field(default_factory=list, description="Channel-specific tactics")

class AudienceSegment(BaseModel):
    segment_name: str = Field(default="Target Audience", description="Segment identifier")
    demographics: str = Field(default="", description="Demographic profile")
    psychographics: str = Field(default="", description="Psychographic profile")
    key_message: str = Field(default="", description="Tailored message for segment")

class TimelinePhase(BaseModel):
    phase_name: str = Field(default="Phase 1", description="Phase name")
    duration: str = Field(default="1 week", description="Phase duration")
    activities: List[str] = Field(default_factory=list, description="Activities in this phase")
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
    channels: List[str] = Field(default_factory=list, description="Execution channels")
    deliverables: List[str] = Field(default_factory=list, description="Content deliverables")
    budget_allocation: BudgetAllocation = Field(default_factory=BudgetAllocation)

class ResearchFoundation(BaseModel):
    market_analysis: MarketAnalysis = Field(default_factory=MarketAnalysis)
    competitor_analysis: CompetitorAnalysis = Field(default_factory=CompetitorAnalysis)
    audience_insights: AudienceInsights = Field(default_factory=AudienceInsights)
    market_opportunities: List[str] = Field(default_factory=list)
    recommended_approach: str = Field(default="")

class StrategyOutput(BaseModel):
    positioning: str = Field(default="", description="Brand positioning statement")
    key_messages: List[str] = Field(default_factory=list, description="Key campaign messages")
    content_pillars: List[str] = Field(default_factory=list, description="Content themes")
    channel_strategy: Dict[str, ChannelPlan] = Field(default_factory=dict, description="Channel-specific strategies")
    audience_segments: List[AudienceSegment] = Field(default_factory=list, description="Target audience segments")
    timeline: Dict[str, TimelinePhase] = Field(default_factory=dict, description="Campaign timeline phases")
    success_metrics: SuccessMetrics = Field(default_factory=SuccessMetrics)
    competitive_differentiation: CompetitiveDifferentiation = Field(default_factory=CompetitiveDifferentiation)
    market_opportunities: List[str] = Field(default_factory=list, description="Tactical opportunities")
    strategic_approach: str = Field(default="", description="Overall strategic direction")
    content_calendar: Optional[ContentCalendar] = Field(
        default=None,
        description="4-week structured content calendar generated by Strategy agent"
    )
    inferred_goal: Literal["awareness", "lead_gen", "sales", "retention"] = Field(default="awareness", description="Campaign goal type")
    research_foundation: ResearchFoundation = Field(default_factory=ResearchFoundation)
    execution: Execution = Field(default_factory=Execution)

    @field_validator("inferred_goal", mode="before")
    @classmethod
    def normalize_inferred_goal(cls, value):
        return normalize_campaign_goal(value)


# ==================== COPYWRITER OUTPUT SCHEMA ====================

class CTAs(BaseModel):
    primary: str = Field(default="Learn More", description="Primary call to action")
    secondary: str = Field(default="Get Started", description="Secondary call to action")
    tertiary: Optional[str] = Field(default=None, description="Tertiary call to action")

class ChannelCopy(BaseModel):
    headline: str = Field(default="", description="Channel-specific headline")
    body: str = Field(default="", description="Channel-specific body copy")
    ctas: CTAs = Field(default_factory=CTAs, description="Call to action variations")

class EmailCopy(BaseModel):
    subject: str = Field(default="", description="Email subject line")
    headline: str = Field(default="", description="Email headline")
    body: str = Field(default="", description="Email body copy")
    ctas: CTAs = Field(default_factory=CTAs)

class SegmentMessaging(BaseModel):
    segment_name: str = Field(default="Target Segment")
    message: str = Field(default="")
    tone: str = Field(default="professional")

class ChannelMessaging(BaseModel):
    channel_name: str = Field(default="general")
    approach: str = Field(default="")
    key_points: List[str] = Field(default_factory=list)

class MessagingFramework(BaseModel):
    brand_promise: str = Field(default="", description="Core brand promise")
    value_proposition: str = Field(default="", description="Value proposition statement")
    segment_messaging: List[SegmentMessaging] = Field(default_factory=list, description="Segment-specific messaging")
    channel_messaging: List[ChannelMessaging] = Field(default_factory=list, description="Channel-specific messaging")

class StrategicAlignment(BaseModel):
    positioning_used: str = Field(default="", description="Positioning statement used")
    key_messages_count: int = Field(default=0, description="Number of key messages integrated")
    deliverables: List[str] = Field(default_factory=list, description="Deliverables covered")

class CopywriterOutput(BaseModel):
    inferred_goal: Literal["awareness", "lead_gen", "sales", "retention"] = Field(default="awareness", description="Campaign goal")
    copies: Dict[Channel, Optional[ChannelCopy]] = Field(default_factory=dict, description="Channel-specific copy keyed by Channel enum")
    messaging_framework: MessagingFramework = Field(default_factory=MessagingFramework)
    strategic_alignment: StrategicAlignment = Field(default_factory=StrategicAlignment)
    copy_readiness: Dict[str, bool] = Field(default_factory=dict, description="Channel readiness flags")

    @field_validator("inferred_goal", mode="before")
    @classmethod
    def normalize_inferred_goal(cls, value):
        return normalize_campaign_goal(value)


# ==================== IMAGE PROMPT OUTPUT SCHEMA ====================

class TextOverlay(BaseModel):
    headline: str = Field(default="", description="Headline text")
    cta: str = Field(default="", description="CTA button text")
    placement: str = Field(default="bottom-left", description="Placement")

class ImagePrompt(BaseModel):
    deliverable_name: str = Field(default="Main Asset", description="Name of deliverable")
    prompt: str = Field(default="", description="DALL-E image generation prompt")
    rationale: str = Field(default="", description="Reasoning for this prompt")
    visual_elements: List[str] = Field(default_factory=list, description="Key visual elements")
    style_keywords: List[str] = Field(default_factory=list, description="Style keywords for consistency")
    aspect_ratio: str = Field(default="16:9", description="Aspect ratio")
    style: str = Field(default="modern professional", description="Artistic style")
    color_palette: str = Field(default="", description="Color palette recommendation")
    text_overlay: Optional[TextOverlay] = Field(default=None, description="Suggested text overlay details")

class VisualDirection(BaseModel):
    overall_style: str = Field(default="modern corporate photography", description="Overall visual style")
    color_palette: List[str] = Field(default_factory=list, description="Color palette")
    mood: str = Field(default="professional and inspiring", description="Visual mood and tone")
    key_visual_themes: List[str] = Field(default_factory=list, description="Visual themes")

class ImagePromptOutput(BaseModel):
    visual_direction: VisualDirection = Field(default_factory=VisualDirection)
    image_prompts: List[ImagePrompt] = Field(default_factory=list, description="Image generation prompts")


# ==================== REVIEWER OUTPUT SCHEMA ====================

class AgentReview(BaseModel):
    score: int = Field(default=80, description="Quality score out of 100", ge=0, le=100)
    approved: bool = Field(default=True, description="Whether agent output is approved")
    feedback: str = Field(default="Output satisfies requirements", description="Overall feedback")
    issues: List[str] = Field(default_factory=list, description="Specific issues found")
    action_items: List[str] = Field(default_factory=list, description="Required action items")

class OverallReview(BaseModel):
    quality_score: Optional[int] = Field(default=80, description="Overall quality score", ge=0, le=100)
    summary: str = Field(default="Campaign output meets quality standards.", description="Overall summary")
    strengths: List[str] = Field(default_factory=list, description="Campaign strengths")
    critical_improvements: List[str] = Field(default_factory=list, description="Critical improvements needed")

class ReviewerOutput(BaseModel):
    status: str = Field(default="approved", description="Review status")
    can_publish: bool = Field(default=True, description="Whether campaign is cleared for publishing")
    research_review: AgentReview = Field(default_factory=AgentReview)
    strategy_review: AgentReview = Field(default_factory=AgentReview)
    copy_review: AgentReview = Field(default_factory=AgentReview)
    image_review: AgentReview = Field(default_factory=AgentReview)
    overall: OverallReview = Field(default_factory=OverallReview)


# ==================== PUBLISHER OUTPUT SCHEMA ====================

class CopyAsset(BaseModel):
    asset: str = Field(default="")
    status: str = Field(default="ready")
    headline: Optional[str] = None
    notes: Optional[str] = None

class VisualAsset(BaseModel):
    asset: str = Field(default="")
    status: str = Field(default="ready")
    aspect_ratio: Optional[str] = None
    style: Optional[str] = None
    notes: Optional[str] = None

class AssetChecklist(BaseModel):
    copy_assets: List[CopyAsset] = Field(default_factory=list)
    visual_assets: List[VisualAsset] = Field(default_factory=list)
    missing_assets: List[str] = Field(default_factory=list)

class ChannelPublishingPlan(BaseModel):
    channel: str = Field(default="")
    priority: str = Field(default="medium")
    content_type: str = Field(default="Post")
    publish_frequency: str = Field(default="2x/week")
    optimal_timing: str = Field(default="Morning")
    copy_asset_used: str = Field(default="")
    visual_asset_used: str = Field(default="")
    kpi_targets: Dict[str, str] = Field(default_factory=dict)
    launch_date: str = Field(default="")
    status: str = Field(default="scheduled")

class CalendarActivity(BaseModel):
    day: str = Field(default="Monday 2026-07-28", description="Day of week + date")
    channel: Channel = Field(default=Channel.LINKEDIN)
    content_type: str = Field(default="Post", description="Format of content")
    description: str = Field(default="", description="Detailed publishing instructions")
    caption_hook: str = Field(default="", description="Opening line")
    effort: Literal["low", "medium", "high"] = Field(default="medium")
    quick_win: bool = Field(default=True, description="True if task ships same day")

    @field_validator("channel", mode="before")
    @classmethod
    def normalize_channel(cls, v):
        if isinstance(v, dict):
            v = v.get("channel") or v.get("value") or v.get("name") or (list(v.values())[0] if v else "linkedin")
        if isinstance(v, str):
            v = v.lower().strip().replace(" ", "_")
        return v

    @field_validator("effort", mode="before")
    @classmethod
    def normalize_effort(cls, v):
        if isinstance(v, dict):
            v = v.get("effort") or v.get("value") or "medium"
        if isinstance(v, str):
            v = v.lower().strip()
            if v not in ("low", "medium", "high"):
                return "medium"
        return v


class CalendarWeek(BaseModel):
    week_label: str = Field(default="Week 1")
    week_start_date: str = Field(default="")
    theme: str = Field(default="")
    activities: list[CalendarActivity] = Field(default_factory=list)

class ContentCalendar(BaseModel):
    total_weeks: int = Field(default=4)
    campaign_start_date: str = Field(default="")
    weeks: list[CalendarWeek] = Field(default_factory=list)

class ProjectedMetrics(BaseModel):
    total_reach: str = Field(default="")
    lead_target: str = Field(default="")
    estimated_ctr: str = Field(default="")
    estimated_cost: str = Field(default="")
    roi_projection: str = Field(default="")
    projection_note: str = Field(default="")
    channel_breakdown: Dict[str, str] = Field(default_factory=dict)
    timeline_to_results: str = Field(default="")
    projection_confidence: str = Field(default="High")
    confidence_explanation: str = Field(default="")

class PublisherOutput(BaseModel):
    publishing_decision: str = Field(default="APPROVED_FOR_PUBLISHING", description="Decision")
    decision_rationale: str = Field(default="", description="Why this decision was made")
    publishing_plan: List[ChannelPublishingPlan] = Field(default_factory=list, description="Per-channel distribution plans")
    content_calendar: ContentCalendar = Field(default_factory=ContentCalendar, description="Week-by-week content schedule")
    asset_checklist: AssetChecklist = Field(default_factory=AssetChecklist, description="Copy and visual asset inventory")
    projected_metrics: ProjectedMetrics = Field(default_factory=ProjectedMetrics, description="Expected campaign performance")
    executive_summary: str = Field(default="", description="Summary for stakeholders")
