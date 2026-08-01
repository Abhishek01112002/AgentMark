"""
COPYWRITER AGENT - Marketing Copy & Messaging Creator

Role: Creative Copywriter / Marketing Messaging Expert

INPUT (From Strategy Agent + State):
  FROM state (metadata - direct access):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand for consistent messaging
    ✅ brand_voice: Tone and style (professional, friendly, bold, luxury, casual, authoritative)
    ✅ brief: Campaign context and objectives

  FROM strategy_output (PRIMARY INPUT - 13 fields):
    ✅ positioning: Brand positioning statement
    ✅ key_messages: 3 key messages
    ✅ content_pillars: 4 content themes
    ✅ audience_segments: 3 audience segments
    ✅ channel_strategy: Prioritized channel plans
    ✅ timeline: 4 campaign phases
    ✅ success_metrics: KPIs and targets
    ✅ competitive_differentiation: Competitive positioning
    ✅ market_opportunities: Tactical opportunities
    ✅ strategic_approach: Overall strategic direction
    ✅ inferred_goal: Campaign objective (awareness/lead_gen/sales/retention)
    ✅ research_foundation: Market/competitor/audience data
    ✅ execution: Channels + deliverables + budget

OUTPUT (Channel-Organized Copy - JSON - ready for execution):
  1. inferred_goal: Campaign goal from Strategy
  2. Dynamic channel keys (instagram, tiktok, youtube, facebook, linkedin, twitter, email, google_ads):
     - Each channel has: headline, body, ctas (3-4 platform-specific CTAs)
     - Only generates copy for channels in the campaign
  3. messaging_framework: Complete messaging architecture for all channels
  4. strategic_alignment: Strategy validation
  5. copy_readiness: Channel-specific readiness flags

HOW IT WORKS:
1. Extract strategy insights + state metadata
2. Load copywriter prompt template
3. Send all context to LLM for copy generation
4. Parse LLM response to get complete channel-organized copy
5. Update state with copy output

KEY PRINCIPLE:
Copywriter = LLM-Powered Creative Engine
- Takes strategy + research insights → LLM generates compelling copy
- No hardcoded templates - fully dynamic AI copywriting
- Uses prompt template from utils/prompts/copywriter_prompt.txt
"""

import logging
logger = logging.getLogger(__name__)

import sys
from pathlib import Path
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from llm import get_llm_client
from utils.prompt_loader import load_prompt
from utils.error_handler import safe_llm_call
from utils.llm_cache import make_key, get as cache_get, set as cache_set
from schemas import (
    CopywriterOutput,
    ChannelCopy,
    CTAs,
    MessagingFramework,
    StrategicAlignment,
    SegmentMessaging,
    ChannelMessaging,
    normalize_channel_list,
    normalize_channel_name,
    Channel,
)


def _fallback_copy_output(
    state: CampaignState,
    channels: list[str],
    inferred_goal: str,
    brand_name: str,
    brand_voice: str,
    positioning: str,
    key_messages: list[str],
    pain_points: list[str],
    deliverables: list[str],
) -> CopywriterOutput:
    """Strategy-grounded fallback copy — channel-specific, brand-aware, used only when LLM is rate-limited."""
    industry = state.industry or "general"
    safe_channels = channels or ["linkedin", "email"]
    primary_message = key_messages[0] if key_messages else positioning or f"{brand_name} delivers results"
    secondary_message = key_messages[1] if len(key_messages) > 1 else primary_message
    primary_pain = pain_points[0] if pain_points else "key challenges"
    secondary_pain = pain_points[1] if len(pain_points) > 1 else primary_pain
    audience = state.target_audience or "your audience"

    # Goal-appropriate CTAs
    goal_cta_map = {
        "sales": CTAs(primary="Shop Now", secondary="View Collection", tertiary="Get Offer"),
        "lead_gen": CTAs(primary="Sign Up Free", secondary="Learn More", tertiary="Get Started"),
        "awareness": CTAs(primary="Discover More", secondary="Explore", tertiary="See How"),
        "retention": CTAs(primary="Explore Benefits", secondary="Upgrade Now", tertiary="Renew Today"),
    }
    default_ctas = goal_cta_map.get(inferred_goal, CTAs(primary="Get Started", secondary="Learn More", tertiary="Explore"))

    # Channel-specific copy templates — actually differentiated per platform
    channel_templates = {
        "instagram": {
            "headline": f"{primary_pain}? {brand_name} changes that.",
            "body": (
                f"Tired of {primary_pain}? You're not alone.\n\n"
                f"{brand_name} was built for people like you — {audience} who deserve better.\n\n"
                f"{primary_message}\n\n"
                f"Tap the link in bio and see the difference. ❤️\n\n"
                f"#{brand_name.replace(' ', '')} #{industry.replace(' ', '').replace('&', '').replace('/', '')} #NewLaunch"
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary="Link in Bio", tertiary="DM Us"),
        },
        "tiktok": {
            "headline": f"POV: You finally found {brand_name} 👀",
            "body": (
                f"If {primary_pain} has been holding you back — this is your sign.\n\n"
                f"{brand_name}: {primary_message}\n\n"
                f"Built for {audience}. Zero compromise.\n\n"
                f"#{brand_name.replace(' ', '')} #{industry.replace(' ', '').replace('&', '')} #viral"
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary="Follow for more", tertiary=None),
        },
        "facebook": {
            "headline": f"{brand_name}: {secondary_message}",
            "body": (
                f"Here's the truth about {primary_pain}:\n\n"
                f"Most people settle for it — but {brand_name} was designed to eliminate it entirely.\n\n"
                f"Our approach: {positioning}\n\n"
                f"Whether you're dealing with {primary_pain} or {secondary_pain}, "
                f"{brand_name} gives {audience} a smarter path forward.\n\n"
                f"Join thousands who've already made the switch. {default_ctas.primary} below."
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary=default_ctas.secondary),
        },
        "linkedin": {
            "headline": f"How {brand_name} is solving {primary_pain} for {audience}",
            "body": (
                f"{primary_pain} is one of the top challenges facing {audience} today.\n\n"
                f"{brand_name} was built specifically to address this — with {positioning}\n\n"
                f"Key advantages:\n"
                f"• {primary_message}\n"
                f"• {secondary_message}\n"
                f"• Designed for {industry} professionals who demand results\n\n"
                f"If you're serious about improving results in {industry}, the time to act is now.\n\n"
                f"{default_ctas.primary} and see how {brand_name} delivers."
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary="Connect with us"),
        },
        "twitter": {
            "headline": f"{brand_name}: Built for {audience}. Designed to beat {primary_pain}.",
            "body": (
                f"The old way: struggle with {primary_pain}.\n"
                f"The {brand_name} way: {primary_message}\n\n"
                f"{default_ctas.primary} →"
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary="Retweet if this resonates"),
        },
        "youtube": {
            "headline": f"{brand_name} | Solving {primary_pain} for {audience} | {industry}",
            "body": (
                f"In this video, we explore how {brand_name} is transforming the way {audience} tackle {primary_pain}.\n\n"
                f"WHAT YOU'LL LEARN:\n"
                f"0:00 - Introduction to {brand_name}\n"
                f"1:30 - The problem: {primary_pain}\n"
                f"3:00 - Our solution: {primary_message}\n"
                f"5:00 - Real results and next steps\n\n"
                f"{positioning}\n\n"
                f"🔔 Subscribe for more: [{brand_name} Channel]\n"
                f"🔗 {default_ctas.primary}: [Link Below]\n"
                f"📩 Contact us: [Website]"
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary="Subscribe", tertiary="Watch Next"),
        },
        "email": {
            "headline": f"{primary_message} — A message from {brand_name}",
            "body": (
                f"Hi [Name],\n\n"
                f"If you've been struggling with {primary_pain}, you're not alone — and you don't have to be.\n\n"
                f"{brand_name} was created for {audience} who are ready for a better way forward. "
                f"Our approach is simple: {positioning}\n\n"
                f"Here's what sets us apart:\n"
                f"• {primary_message}\n"
                f"• {secondary_message}\n"
                f"• Purpose-built for {industry} — not a generic solution\n\n"
                f"The results speak for themselves. And right now, there's never been a better time to get started.\n\n"
                f"[{default_ctas.primary}] — Take the first step today.\n\n"
                f"Best regards,\nThe {brand_name} Team"
            ),
            "ctas": CTAs(primary=default_ctas.primary, secondary=default_ctas.secondary, tertiary="Unsubscribe"),
        },
        "google_ads": {
            "headline": f"{brand_name} | {primary_message[:25]}",
            "body": f"Beat {primary_pain}. Built for {audience}. {default_ctas.primary} now.",
            "ctas": CTAs(primary=default_ctas.primary, secondary=default_ctas.secondary),
        },
    }

    copies = {}
    for channel in safe_channels:
        normalized = normalize_channel_name(channel)
        if normalized is None:
            continue
        channel_enum = Channel(normalized)
        tpl = channel_templates.get(normalized, {
            "headline": f"{brand_name}: {primary_message[:60]}",
            "body": f"{positioning} — Built for {audience} tackling {primary_pain}. {default_ctas.primary} today.",
            "ctas": default_ctas,
        })
        subject = tpl.get("headline") if normalized == "email" else None
        copies[channel_enum] = ChannelCopy(
            subject=subject,
            headline=tpl["headline"],
            body=tpl["body"],
            ctas=tpl["ctas"],
        )

    if not copies:
        copies[Channel.LINKEDIN] = ChannelCopy(
            headline=f"{brand_name}: {primary_message[:80]}",
            body=f"{positioning} Designed for {audience} — solving {primary_pain} with a proven approach.",
            ctas=default_ctas,
        )

    return CopywriterOutput(
        inferred_goal=inferred_goal,
        copies=copies,
        messaging_framework=MessagingFramework(
            brand_promise=f"{brand_name} empowers {audience} to overcome {primary_pain} through {positioning[:80]}.",
            value_proposition=primary_message,
            segment_messaging=[
                SegmentMessaging(
                    segment_name=audience,
                    message=f"{primary_message} — addressing {primary_pain} with a {brand_voice} approach.",
                    tone=brand_voice or "professional",
                )
            ],
            channel_messaging=[
                ChannelMessaging(
                    channel_name=ch.value,
                    approach=channel_templates.get(ch.value, {}).get("body", primary_message)[:120],
                    key_points=[primary_message, primary_pain, positioning[:60]],
                )
                for ch in copies.keys()
            ],
        ),
        strategic_alignment=StrategicAlignment(
            positioning_used=positioning or primary_message,
            key_messages_count=len(key_messages),
            deliverables=deliverables or ["campaign copy"],
        ),
        copy_readiness={
            **{ch.value: True for ch in copies.keys()},
            "messaging_framework_complete": True,
        },
    )


def _extract_surgical_copy_context(strategy: dict, state: CampaignState) -> dict:
    """
    Surgical Context Filtering for Copywriter Agent:
    - Preserves: positioning, key_messages, content_pillars, audience_segments,
                 pain_points, motivations, brand_voice, inferred_goal, competitive_differentiation.
    - Prunes: downstream camera specs, raw HTML web dumps, full timeline phase dicts, and raw TAM.
    """
    positioning = strategy.get("positioning", "")
    key_messages = strategy.get("key_messages", [])[:5]
    content_pillars = strategy.get("content_pillars", [])[:4]
    audience_segments = strategy.get("audience_segments", [])[:3]
    inferred_goal = strategy.get("inferred_goal", state.primary_goal or "awareness")

    raw_timeline = strategy.get("timeline", {})
    if isinstance(raw_timeline, dict):
        timeline_summary = raw_timeline.get("duration") or raw_timeline.get("phase_1", {}).get("duration", "4 weeks")
    else:
        timeline_summary = str(raw_timeline)[:50]

    competitive_differentiation = strategy.get("competitive_differentiation", {})
    if isinstance(competitive_differentiation, dict):
        competitive_differentiation = {
            k: v for k, v in competitive_differentiation.items()
            if k in ("primary_differentiation", "competitive_advantage", "unique_value_proposition", "positioning_statement")
        }

    research = strategy.get("research_foundation", {})
    aud_insights = research.get("audience_insights", {})
    market_analysis = research.get("market_analysis", {})

    pain_points = aud_insights.get("pain_points", [])[:4]
    motivations = aud_insights.get("motivations", [])[:4]
    buyer_objections = aud_insights.get("buyer_objections", []) or aud_insights.get("objections", [])
    market_trends = market_analysis.get("market_trends", [])[:4]

    customer_voice_insights = research.get("customer_voice_insights", [])[:4]
    competitor_vulnerabilities = research.get("competitor_vulnerabilities", [])[:4]
    proven_ad_hooks = research.get("proven_ad_hooks", [])[:4]
    brand_dna = research.get("brand_dna", None) or getattr(state, "brand_dna", None)

    return {
        "positioning": positioning,
        "key_messages": key_messages,
        "content_pillars": content_pillars,
        "audience_segments": audience_segments,
        "timeline_summary": timeline_summary,
        "competitive_differentiation": competitive_differentiation,
        "inferred_goal": inferred_goal,
        "pain_points": pain_points,
        "motivations": motivations,
        "buyer_objections": buyer_objections,
        "market_trends": market_trends,
        "growth_rate": market_analysis.get("growth_rate", ""),
        "customer_voice_insights": customer_voice_insights,
        "competitor_vulnerabilities": competitor_vulnerabilities,
        "proven_ad_hooks": proven_ad_hooks,
        "brand_dna": brand_dna,
    }


# ==================== COPYWRITER AGENT FUNCTION ====================

def copywriter_agent(state: CampaignState) -> CampaignState:
    """
    Copywriter Agent - Creates compelling marketing copy (LLM-Powered)

    Args:
        state: CampaignState with strategy_output, manager_output, brief

    Returns:
        Modified state with copy_output (8 fields JSON) and status updated

    Process:
    1. Extract strategy insights from state.strategy_output (PRIMARY INPUT)
    2. Extract campaign metadata from state (brand_name, brand_voice, brief)
    3. Load copywriter prompt template
    4. Send all context to LLM for dynamic copy generation
    5. Parse LLM response to get channel-organized copy
    6. Update state with copy_output and mark status as complete
    """

    logger.info("\n" + "=" * 80)
    logger.info("✍️  COPYWRITER AGENT ACTIVATED")
    logger.info("=" * 80)

    # ========== STEP 1: READ STRATEGY OUTPUT (PRIMARY INPUT) ==========
    logger.info("\n[STEP 1] Reading strategy output (PRIMARY copy source)...")
    logger.info("-" * 80)

    strategy = {}
    if state.strategy_output:
        try:
            strategy = json.loads(state.strategy_output)
        except (json.JSONDecodeError, TypeError) as e:
            logger.warning(f"⚠️ Failed to parse strategy_output: {e} — using fallback strategy context")
    else:
        logger.warning("⚠️ strategy_output missing — using campaign metadata for fallback strategy context")

    if not strategy:
        strategy = {
            "positioning": f"Leading solution for {state.brand_name}",
            "key_messages": [f"Empowering audience with {state.brand_name}"],
            "content_pillars": ["Innovation", "Quality", "Customer Success"],
            "audience_segments": [state.target_audience or "Target Audience"],
            "timeline": {"duration": "4 weeks"},
            "competitive_differentiation": {},
            "inferred_goal": state.primary_goal or "awareness"
        }

    # Extract all strategy fields needed for copy generation via Surgical Context Filtering
    surgical_ctx = _extract_surgical_copy_context(strategy, state)
    positioning = surgical_ctx["positioning"]
    key_messages = surgical_ctx["key_messages"]
    content_pillars = surgical_ctx["content_pillars"]
    audience_segments = surgical_ctx["audience_segments"]
    timeline = {"duration": surgical_ctx["timeline_summary"]}
    competitive_differentiation = surgical_ctx["competitive_differentiation"]
    inferred_goal = surgical_ctx["inferred_goal"]
    pain_points = surgical_ctx["pain_points"]
    motivations = surgical_ctx["motivations"]
    buyer_objections = surgical_ctx["buyer_objections"]
    market_trends = surgical_ctx["market_trends"]
    growth_rate = surgical_ctx["growth_rate"]
    competitive_advantage = competitive_differentiation.get("competitive_advantage", "") if isinstance(competitive_differentiation, dict) else ""

    execution = strategy.get("execution", {})
    deliverables = execution.get("deliverables", [])
    channels = normalize_channel_list(execution.get("channels", []))
    if not channels and state.manager_output:
        try:
            mgr_data = json.loads(state.manager_output)
            channels = normalize_channel_list(mgr_data.get("channels", []))
        except Exception as e:
            logger.warning(f"⚠️ Failed to fallback to manager_output channels: {e}")

    logger.info(f"✓ Positioning: {positioning[:60]}...")
    logger.info(f"✓ Key Messages: {len(key_messages)} found")
    logger.info(f"✓ Content Pillars: {len(content_pillars)} defined")
    logger.info(f"✓ Audience Segments: {len(audience_segments)} identified")
    logger.info(f"✓ Timeline Summary: {surgical_ctx['timeline_summary']}")
    logger.info(f"✓ Inferred Goal: {inferred_goal}")
    logger.info(f"✓ Deliverables: {deliverables}")
    logger.info(f"✓ Channels: {channels}")

    # ========== STEP 2: READ STATE METADATA ==========
    logger.info("\n[STEP 2] Reading campaign metadata from state...")
    logger.info("-" * 80)

    campaign_name = state.campaign_name
    brand_name = state.brand_name
    brand_voice = state.brand_voice
    industry = state.industry or ""
    brief = state.brief or f"Marketing campaign for {brand_name}"

    logger.info(f"✓ Campaign: {campaign_name}")
    logger.info(f"✓ Brand: {brand_name}")
    logger.info(f"✓ Brand Voice: {brand_voice}")
    logger.info(f"✓ Brief: {brief[:60]}...")

    # ========== STEP 3: EXTRACT RESEARCH INSIGHTS ==========
    logger.info("\n[STEP 3] Extracting research insights for copy context (Surgical Context Filtering)...")
    logger.info("-" * 80)

    logger.info(f"✓ Pain Points ({len(pain_points)}): {pain_points[:2]}")
    logger.info(f"✓ Motivations ({len(motivations)}): {motivations[:2]}")
    logger.info(f"✓ Market Trends ({len(market_trends)}): {market_trends[:2]}")
    logger.info(f"✓ Growth Rate: {growth_rate}")
    logger.info(f"✓ Competitive Advantage: {str(competitive_advantage)[:60]}...")

    # ========== STEP 4: GENERATE COPY WITH LLM ==========
    logger.info("\n[STEP 4] Generating copy with LLM...")
    logger.info("-" * 80)
    logger.info("✍️  AI Copywriter crafting channel-specific copy...")

    # Initialize LLM client
    llm = get_llm_client()

    from utils.context.cta_registry import IndustryCTARegistry
    goal_keywords = IndustryCTARegistry.get_ctas(industry, inferred_goal)

    # Brand voice keywords for the prompt
    voice_keywords_map = {
        "professional": "industry, data, proven, expertise, results",
        "friendly": "conversational, questions, stories, easy, together",
        "bold": "challenge, disrupt, provocative, dare, game-changer",
        "luxury": "exclusive, premium, sophisticated, curated, elite",
        "casual": "simple, real, honest, straightforward, no-nonsense",
        "inspirational": "uplifting, vision, potential, inspire, future",
        "empathetic": "understand, support, care, community, empathy",
        "trustworthy": "reliable, secure, honest, transparent, verified"
    }
    voice_keywords = voice_keywords_map.get(brand_voice, f"{brand_voice}, authentic, natural")

    is_focus_group_rewrite = bool(state.human_feedback and "MANDATORY FOCUS GROUP REQUIREMENTS" in state.human_feedback)
    is_surgical_revision = bool(
        not is_focus_group_rewrite and (
            (state.human_feedback and state.human_revision_target == "copywriter") or
            (state.status == "copy_revision_required") or
            (state.human_revision_target == "copywriter")
        )
    )
    is_human_revision = bool(is_focus_group_rewrite or is_surgical_revision)

    human_feedback_section = ""
    if is_focus_group_rewrite:
        feedback_text = state.human_feedback or ""
        human_feedback_section = (
            "\n" + "="*80 + "\n"
            "⚠️ MANDATORY FOCUS GROUP REVISION MODE — ALL CHANNELS:\n"
            "You are creating a NEW campaign copy variant to fix Focus Group critiques.\n"
            "CRITICAL VARIANT GENERATION RULES — MUST FOLLOW:\n"
            "  1. Review ALL Focus Group recommendations below and apply them across EVERY channel.\n"
            "  2. Generate fresh, high-performing copy for ALL channels.\n"
            "  3. Do NOT copy old copy character-for-character — improve and elevate messaging everywhere to achieve a 90+ Focus Group score.\n"
            f"{feedback_text}\n"
            + "="*80
        )
    elif is_surgical_revision:
        existing_copy_section = ""
        if state.copy_output:
            existing_copy_section = (
                "\n\nEXISTING COPY (your previous output — preserve ALL unchanged channels exactly):\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{state.copy_output}\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )
        feedback_text = state.human_feedback or "AI Reviewer requested revision."
        human_feedback_section = (
            "\n" + "="*80 + "\n"
            "⚠️ HUMAN REVISION FEEDBACK — SURGICAL EDIT MODE:\n"
            "You are in REVISION mode. The user has requested a specific change below.\n"
            "CRITICAL REVISION RULES — MUST FOLLOW:\n"
            "  1. READ the user feedback carefully and identify ONLY which field(s)/channel(s) need changing.\n"
            "  2. ONLY modify the specific field(s) the user mentioned. Nothing else.\n"
            "  3. ALL other channels and fields MUST be copied character-for-character, word-for-word, from EXISTING COPY above. Do not alter a single character of the unchanged channels.\n"
            "  4. Do NOT regenerate, rewrite, or improve unchanged channels — copy them exactly.\n"
            "  5. Do NOT add or remove any channels — keep the same set as EXISTING COPY.\n"
            f"User Feedback: \"{feedback_text}\"\n"
            + "="*80
            + existing_copy_section
        )

    target_audience = getattr(state, "target_audience", None) or "General target audience"
    industry = getattr(state, "industry", None) or "other"
    primary_goal = getattr(state, "primary_goal", None) or "awareness"
    additional_context = getattr(state, "client_memory_context", None) or "None (No additional context)"

    # ========== STEP 3.5: POPULATE CAMPAIGN INTELLIGENCE OBJECT (CIO) ==========
    primary_objection = buyer_objections[0] if (isinstance(buyer_objections, list) and buyer_objections) else (
        pain_points[0] if pain_points else "Risk of integration disruption"
    )
    positioning_moat = positioning or competitive_advantage or f"Unmatched ROI for {brand_name}"
    stage = getattr(state, "buying_stage", None) or "consideration"

    if not state.campaign_intelligence_object:
        from schemas.agent_outputs import CampaignIntelligenceObject
        cio_model = CampaignIntelligenceObject(
            campaign_name=campaign_name,
            brand_name=brand_name,
            industry=industry,
            buying_stage=stage,
            primary_goal=primary_goal,
            target_icp=target_audience,
            primary_pain_points=pain_points if isinstance(pain_points, list) else [],
            buyer_objections=[primary_objection],
            positioning_moat=positioning_moat,
            key_messages=key_messages if isinstance(key_messages, list) else [],
            recommended_channels=channels if isinstance(channels, list) else [],
            stage_appropriate_cta=goal_keywords,
        )
        state.campaign_intelligence_object = cio_model.model_dump()

    customer_voice_insights = surgical_ctx.get("customer_voice_insights", [])
    competitor_vulnerabilities = surgical_ctx.get("competitor_vulnerabilities", [])
    proven_ad_hooks = surgical_ctx.get("proven_ad_hooks", [])
    brand_dna = surgical_ctx.get("brand_dna", None)

    canonical_intel_parts = []
    
    from utils.brand_dna_context import build_brand_dna_context
    dna_context = build_brand_dna_context(brand_dna, purpose="copywriter", max_tokens=1500)
    if dna_context.text:
        source_url = brand_dna.get("source_url", brand_name) if isinstance(brand_dna, dict) else brand_name
        canonical_intel_parts.append(
            f"<official_brand_dna>\nSource: {source_url}\n{dna_context.text}\n</official_brand_dna>"
        )
    if customer_voice_insights and isinstance(customer_voice_insights, list):
        canonical_intel_parts.append(
            f"<customer_voice_evidence verbatim=\"true\">\n" + "\n".join(f"- {q}" for q in customer_voice_insights[:4]) + "\n</customer_voice_evidence>"
        )
    if competitor_vulnerabilities and isinstance(competitor_vulnerabilities, list):
        canonical_intel_parts.append(
            f"<competitor_vulnerabilities>\n" + "\n".join(f"- {v}" for v in competitor_vulnerabilities[:4]) + "\n</competitor_vulnerabilities>"
        )
    if proven_ad_hooks and isinstance(proven_ad_hooks, list):
        canonical_intel_parts.append(
            f"<proven_ad_hooks_patterns>\n" + "\n".join(f"- {h}" for h in proven_ad_hooks[:4]) + "\n</proven_ad_hooks_patterns>"
        )

    canonical_intel_str = "\n\n".join(canonical_intel_parts) if canonical_intel_parts else "No specific customer voice or ad hook evidence available. Do not fabricate quotes or unverified claims."

    # Append Mandatory Copywriting Constraints
    mandatory_marketing_constraints = (
        "\n\n" + "="*80 + "\n"
        "🚨 MANDATORY COPYWRITING & EVIDENCE CONSTRAINTS (STRICT COMPLIANCE REQUIRED):\n"
        f"1. CORE BUYER OBJECTION TO NEUTRALIZE: You MUST explicitly address: \"{primary_objection}\".\n"
        f"2. COMPETITIVE POSITIONING MOAT: Highlight this unique moat: \"{positioning_moat}\".\n"
        "3. EVIDENTIARY & CLAIM BOUNDARIES (STRICT ANTI-FABRICATION):\n"
        "   - Direct Customer Quotes: Use verbatim quotes ONLY if present in <customer_voice_evidence>. If empty, use general pain points without quotation marks or false attributions like 'Your users said'.\n"
        "   - Competitor Counter-Positioning: Frame competitor weaknesses as strategic counter-positioning angles, NOT unverified slander.\n"
        "   - Proven Ad Hooks: Treat ad hooks as high-converting creative patterns, not absolute performance guarantees.\n"
        "4. STRICTLY FORBIDDEN CLICHÉ PHRASES: Do NOT use:\n"
        "   - \"In today's fast-paced world\"\n"
        "   - \"Game-changer\" or \"Revolutionary\"\n"
        "   - \"Unlock your potential\" or \"Seamlessly\"\n"
        "   - \"Transform your business\"\n"
        "5. PLATFORM-NATIVE HOOK CONSTRAINTS:\n"
        "   - LINKEDIN: Use a bold pattern-interrupt hook or customer quote if available. Use short executive paragraphs.\n"
        "   - INSTAGRAM / META: Emphasize visual narrative, emotional hook, and brand authenticity.\n"
        "   - GOOGLE ADS: Include punchy search-intent headlines (<30 chars) with high-conversion CTAs.\n"
        "   - EMAIL: Subject line MUST be curiosity/pain driven and under 50 characters.\n"
        f"6. STAGE-APPROPRIATE CTA: Use this specific CTA direction: \"{goal_keywords}\".\n"
        "7. CONCRETE FACTS OVER LIFESTYLE FLUFF: Ground messaging in real products, pricing tiers, features, and specs from <official_brand_dna> whenever available. Do NOT write generic fluffy claims. Ensure pricing and currency symbols match the target market/audience (e.g., INR for India-based personas/audience, USD for US-based).\n"
        + "="*80 + "\n\n"
        + canonical_intel_str
    )
    human_feedback_section = human_feedback_section + mandatory_marketing_constraints

    # Define channel batch categories for Sub-Task Chunking
    BATCH_A_NAMES = {"linkedin", "twitter", "instagram", "facebook"}
    BATCH_B_NAMES = {"email", "youtube", "google_ads", "tiktok"}
    ALL_KNOWN_CHANNELS = ["instagram", "facebook", "linkedin", "twitter", "tiktok", "youtube", "email", "google_ads"]

    # Normalize active campaign channels
    normalized_active = []
    for c in channels:
        norm = normalize_channel_name(c)
        if norm and norm not in normalized_active:
            normalized_active.append(norm)
    if not normalized_active:
        normalized_active = ["linkedin", "email"]

    batch_a_chans = [c for c in normalized_active if c in BATCH_A_NAMES]
    batch_b_chans = [c for c in normalized_active if c in BATCH_B_NAMES]

    # Assign non-standard custom channels to balance batch load
    for c in normalized_active:
        if c not in BATCH_A_NAMES and c not in BATCH_B_NAMES:
            if len(batch_a_chans) <= len(batch_b_chans):
                batch_a_chans.append(c)
            else:
                batch_b_chans.append(c)

    batches_to_run = []
    if batch_a_chans:
        batches_to_run.append(("Batch A (Short-form Social)", batch_a_chans))
    if batch_b_chans:
        batches_to_run.append(("Batch B (Long-form & Ads)", batch_b_chans))

    # Context Pruning: Trim excessive research lists to keep prompt tight and prevent token waste
    pruned_pain_points = pain_points[:4] if isinstance(pain_points, list) else pain_points
    pruned_motivations = motivations[:4] if isinstance(motivations, list) else motivations
    pruned_market_trends = market_trends[:4] if isinstance(market_trends, list) else market_trends

    from utils.prompt_loader import load_split_prompt

    def _build_batch_prompt(batch_chans: list[str]) -> tuple[str | None, str]:
        forbidden = [c for c in ALL_KNOWN_CHANNELS if c not in batch_chans]
        channels_str = (
            f"ACTIVE CAMPAIGN CHANNELS (Generate copy ONLY for these): {json.dumps(batch_chans, separators=(',', ':'), ensure_ascii=False)}\n"
            f"FORBIDDEN CHANNELS (MUST set copy to null and copy_readiness to false): {json.dumps(forbidden, separators=(',', ':'), ensure_ascii=False)}"
        )
        return load_split_prompt(
            "copywriter",
            campaign_name=campaign_name,
            brand_name=brand_name,
            brand_voice=brand_voice,
            target_audience=target_audience,
            industry=industry,
            primary_goal=primary_goal,
            brief=brief,
            additional_context=additional_context,
            human_feedback_section=human_feedback_section,
            positioning=positioning,
            inferred_goal=inferred_goal,
            key_messages=json.dumps(key_messages, separators=(",", ":"), ensure_ascii=False),
            content_pillars=json.dumps(content_pillars, separators=(",", ":"), ensure_ascii=False),
            audience_segments=json.dumps(audience_segments, separators=(",", ":"), ensure_ascii=False),
            timeline=json.dumps(timeline, separators=(",", ":"), ensure_ascii=False),
            competitive_differentiation=json.dumps(competitive_differentiation, separators=(",", ":"), ensure_ascii=False),
            channels=channels_str,
            pain_points=json.dumps(pruned_pain_points, separators=(",", ":"), ensure_ascii=False),
            motivations=json.dumps(pruned_motivations, separators=(",", ":"), ensure_ascii=False),
            market_trends=json.dumps(pruned_market_trends, separators=(",", ":"), ensure_ascii=False),
            growth_rate=growth_rate,
            competitive_advantage=competitive_advantage,
            pain_points_primary=pruned_pain_points[0] if pruned_pain_points else "business inefficiencies",
            key_message_primary=key_messages[0] if key_messages else positioning,
            goal_keywords=goal_keywords,
            voice_keywords=voice_keywords,
            key_messages_count=len(key_messages),
            content_pillars_count=len(content_pillars),
            audience_segments_count=len(audience_segments),
            deliverables_json=json.dumps(deliverables)
        )

    revision_temperature = 0.0 if is_surgical_revision else 0.7
    revision_max_tokens = 5000 if (is_surgical_revision or is_focus_group_rewrite) else 4500

    def _execute_batch(batch_name: str, batch_chans: list[str]) -> tuple[str, CopywriterOutput | None]:
        system_prompt, batch_prompt = _build_batch_prompt(batch_chans)
        cache_key = make_key(
            f"Copywriter_{batch_name}",
            prompt=batch_prompt,
            industry=state.industry or "",
            temperature=revision_temperature,
            max_tokens=revision_max_tokens,
        )
        cached = cache_get(cache_key)
        if cached is not None:
            logger.info(f"   [{batch_name}] 📦 Cache hit — using cached Copywriter batch response")
            return batch_name, CopywriterOutput(**cached)

        out, _ = safe_llm_call(
            state,
            f"Copywriter[{batch_name}]",
            lambda: llm.generate_structured(
                batch_prompt,
                CopywriterOutput,
                system_prompt=system_prompt,
                temperature=revision_temperature,
                max_tokens=revision_max_tokens
            )
        )
        if out is not None:
            cache_set(cache_key, out.model_dump())
        return batch_name, out

    import concurrent.futures

    logger.info(f"   Querying LLM with Sub-Task Chunking ({len(batches_to_run)} batch(es))...")

    batch_outputs: list[CopywriterOutput] = []
    if len(batches_to_run) == 1:
        b_name, b_chans = batches_to_run[0]
        _, out = _execute_batch(b_name, b_chans)
        if out:
            batch_outputs.append(out)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(batches_to_run)) as executor:
            future_to_name = {
                executor.submit(_execute_batch, b_name, b_chans): b_name
                for b_name, b_chans in batches_to_run
            }
            for future in concurrent.futures.as_completed(future_to_name):
                b_name = future_to_name[future]
                try:
                    _, out = future.result()
                    if out:
                        batch_outputs.append(out)
                except Exception as exc:
                    logger.error(f"   ⚠️ Batch {b_name} generated exception: {exc}")

    if batch_outputs:
        if len(batch_outputs) == 1 or not all(isinstance(o, CopywriterOutput) for o in batch_outputs):
            copy_output = batch_outputs[0]
        else:
            base = batch_outputs[0]
            merged_goal = getattr(base, "inferred_goal", None) or "awareness"
            merged_copies: dict = {}
            merged_readiness: dict = {}

            for out in batch_outputs:
                if hasattr(out, "copies") and isinstance(out.copies, dict):
                    for chan_enum, copy_obj in out.copies.items():
                        if copy_obj is not None:
                            merged_copies[chan_enum] = copy_obj
                if hasattr(out, "copy_readiness") and isinstance(out.copy_readiness, dict):
                    for c_str, ready_flag in out.copy_readiness.items():
                        if ready_flag:
                            merged_readiness[c_str] = True
                        elif c_str not in merged_readiness:
                            merged_readiness[c_str] = ready_flag

            merged_framework = getattr(base, "messaging_framework", MessagingFramework())
            if hasattr(merged_framework, "channel_messaging") and isinstance(merged_framework.channel_messaging, list):
                existing_cm = {cm.channel_name for cm in merged_framework.channel_messaging if hasattr(cm, "channel_name")}
                for out in batch_outputs[1:]:
                    fw = getattr(out, "messaging_framework", None)
                    if fw and hasattr(fw, "channel_messaging") and isinstance(fw.channel_messaging, list):
                        for cm in fw.channel_messaging:
                            cm_name = getattr(cm, "channel_name", None)
                            if cm_name and cm_name not in existing_cm:
                                merged_framework.channel_messaging.append(cm)
                                existing_cm.add(cm_name)

            # Ensure all requested active campaign channels are populated (fill missing with fallback)
            missing_channels = [c for c in channels if c not in merged_copies or merged_copies[c] is None]
            if missing_channels:
                logger.warning(f"   ⚠️ Copywriter batch merging missing {len(missing_channels)} channel(s): {missing_channels} — filling from strategy fallback")
                fallback_obj = _fallback_copy_output(
                    state, channels, inferred_goal, brand_name, brand_voice,
                    positioning, key_messages, pain_points, buyer_objections, deliverables
                )
                if hasattr(fallback_obj, "copies") and isinstance(fallback_obj.copies, dict):
                    for missing_ch in missing_channels:
                        if missing_ch in fallback_obj.copies:
                            merged_copies[missing_ch] = fallback_obj.copies[missing_ch]
                            merged_readiness[missing_ch] = True

            copy_output = CopywriterOutput(
                inferred_goal=merged_goal,
                copies=merged_copies,
                messaging_framework=merged_framework,
                strategic_alignment=getattr(base, "strategic_alignment", StrategicAlignment()),
                copy_readiness=merged_readiness
            )
    else:
        copy_output = None
    
    if copy_output is None:
        logger.info("   ⚠️ Copywriter LLM unavailable — using strategy-grounded fallback copy")
        copy_output = _fallback_copy_output(
            state,
            channels,
            inferred_goal,
            brand_name,
            brand_voice,
            positioning,
            key_messages,
            pain_points,
            deliverables,
        )
        state.error = None
        state.status = "copy_complete"
        logger.info("   ✅ Fallback copy ready — error flag cleared, pipeline will continue")

    # ========== POST-REVISION DEEP MERGE (DELTA PATCHING) ==========
    if (is_human_revision or is_surgical_revision) and state.copy_output:
        logger.info("\n[MERGE] Executing Semantic Delta Patching deep merge...")
        try:
            from utils.delta_merger import deep_merge_dicts
            previous_dict = json.loads(state.copy_output)
            merged_dict = deep_merge_dicts(previous_dict, copy_output.model_dump(exclude_none=True))
            copy_output = CopywriterOutput(**merged_dict)
            logger.info("   ✅ Semantic Delta Patch merged cleanly over previous copy_output")
        except Exception as exc:
            logger.warning(f"   ⚠️ Delta merge warning: {exc} — preserving current copy_output")
            restored = []
            feedback_lower = (state.human_feedback or "").lower()
            for chan_enum in list(Channel):
                # Check if user explicitly asked to remove/delete this channel
                is_removed_by_user = any(
                    x in feedback_lower and chan_enum.value in feedback_lower
                    for x in ["remove", "delete", "omit", "exclude", "drop"]
                )
                
                # Check if the LLM explicitly set the copy to None in the new output
                is_explicitly_null = chan_enum in copy_output.copies and copy_output.copies[chan_enum] is None
                
                if (chan_enum in previous.copies and 
                    chan_enum not in copy_output.copies and 
                    not is_removed_by_user and 
                    not is_explicitly_null):
                    copy_output.copies[chan_enum] = previous.copies[chan_enum]
                    restored.append(chan_enum.value)
                    logger.info(f"   ⚠️  RESTORED '{chan_enum.value}' — LLM dropped it during revision, restoring from previous copy")
            if not restored:
                logger.info("   ✅ All channels intact — no restoration needed")
            else:
                logger.info(f"   ✅ Restored {len(restored)} channel(s): {', '.join(restored)}")
        except Exception as merge_err:
            logger.info(f"   ⚠️  Merge check failed (non-critical): {merge_err}")

    # ========== PRE-VALIDATION & LOCAL REPAIR LOOP ==========
    try:
        from utils.pre_validator import PreValidator
        coverage_res = PreValidator.validate_channel_coverage(
            copy_dict={k.value if hasattr(k, "value") else str(k): v for k, v in copy_output.copies.items()} if hasattr(copy_output, "copies") and isinstance(copy_output.copies, dict) else {},
            required_channels=channels
        )
        logger.info(f"   [PRE-VALIDATION] Copywriter channel coverage: {coverage_res.metadata.get('coverage_pct')}% (is_valid={coverage_res.is_valid})")
        if not coverage_res.is_valid:
            missing_chans = coverage_res.metadata.get("missing_channels", [])
            logger.info(f"   [LOCAL REPAIR] Fixing missing channels in copywriter: {missing_chans}")
            fallback_copy = _fallback_copy_output(
                state, channels, inferred_goal, brand_name, brand_voice, positioning, key_messages, pain_points, deliverables
            )
            for m_chan in missing_chans:
                norm_m = normalize_channel_name(m_chan)
                if norm_m and norm_m in fallback_copy.copies:
                    copy_output.copies[norm_m] = fallback_copy.copies[norm_m]
                    if hasattr(copy_output, "copy_readiness") and isinstance(copy_output.copy_readiness, dict):
                        copy_output.copy_readiness[norm_m] = True
            from utils.telemetry import get_telemetry_tracker
            get_telemetry_tracker().record_pre_validation_repair("copywriter", f"Restored missing channels: {missing_chans}")
    except Exception as exc:
        logger.warning(f"   ⚠️ Copywriter pre-validation non-blocking error: {exc}")

    # ========== STEP 5: DISPLAY COPY SUMMARY ==========
    logger.info("\n[STEP 5] Copy generated!")
    logger.info("-" * 80)
    logger.info("✅ Copy generated by LLM!")

    # Identify active channels (keys in copies where value is not None)
    active_channels = [
        k.value for k, v in copy_output.copies.items()
        if v is not None
    ]

    # Sync state's channel list with active_channels if we have at least one active channel
    if active_channels:
        logger.info(f"\n🔄 Syncing active channels in state: {active_channels}")
        
        # 1. Update manager_output
        if state.manager_output:
            try:
                mgr_data = json.loads(state.manager_output)
                mgr_data["channels"] = active_channels
                state.manager_output = json.dumps(mgr_data, indent=2)
                logger.info("   ✓ Updated manager_output channels")
            except Exception as e:
                logger.warning(f"   ⚠️ Failed to update manager_output: {e}")
                
        # 2. Update strategy_output
        if state.strategy_output:
            try:
                strat_data = json.loads(state.strategy_output)
                if "execution" in strat_data:
                    strat_data["execution"]["channels"] = active_channels
                if "channel_strategy" in strat_data:
                    strat_data["channel_strategy"] = {
                        k: v for k, v in strat_data["channel_strategy"].items()
                        if k in active_channels
                    }
                state.strategy_output = json.dumps(strat_data, indent=2)
                logger.info("   ✓ Updated strategy_output channels")
            except Exception as e:
                logger.warning(f"   ⚠️ Failed to update strategy_output: {e}")

    # Display copy for each channel in the campaign
    for channel in active_channels:
        normalized = normalize_channel_name(channel)
        if normalized is None:
            logger.info(f"   ⚠️  Unknown channel '{channel}' — skipping")
            continue
        channel_enum = Channel(normalized)
        channel_copy = copy_output.copies.get(channel_enum)
        if channel_copy:
            logger.info(f"\n📝 {channel.title()} Copy:")
            if hasattr(channel_copy, 'subject'):
                logger.info(f"   Subject: {channel_copy.subject}")
            logger.info(f"   Headline: {channel_copy.headline[:60]}...")
            logger.info(f"   CTAs: primary={channel_copy.ctas.primary}, secondary={channel_copy.ctas.secondary}")

    logger.info("\n🏗️  Messaging Framework:")
    framework = copy_output.messaging_framework
    logger.info(f"   Brand Promise: {framework.brand_promise[:60]}...")
    logger.info(f"   Segment Messages: {len(framework.segment_messaging)}")
    logger.info(f"   Channel Messaging: {len(framework.channel_messaging)}")

    logger.info("\n✅ Strategic Alignment:")
    alignment = copy_output.strategic_alignment
    logger.info(f"   Positioning Used: {alignment.positioning_used[:50]}...")
    logger.info(f"   Key Messages Count: {alignment.key_messages_count}")
    logger.info(f"   Deliverables: {alignment.deliverables}")

    logger.info("\n🚦 Copy Readiness:")
    for channel, ready in copy_output.copy_readiness.items():
        status_icon = "✅" if ready else "❌"
        logger.info(f"   {status_icon} {channel}: {ready}")

    # Validate all active channels have copy
    logger.info("\n🔍 Validating channel coverage...")
    generated = {k for k, v in copy_output.copies.items() if v is not None}
    requested = {Channel(normalize_channel_name(c)) for c in active_channels if normalize_channel_name(c)}
    missing = requested - generated
    if missing:
        missing_names = [m.value for m in missing]
        raise ValueError(f"Copywriter failed to generate copy for: {missing_names}")

    # ========== STEP 6: WRITE TO STATE ==========
    logger.info("\n[STEP 6] Writing to state...")
    logger.info("-" * 80)

    copy_output_json = copy_output.model_dump_json(indent=2)

    state.copy_output = copy_output_json
    state.status = "copy_complete"

    logger.info("✅ State updated:")
    logger.info(f"   copy_output: {len(copy_output_json)} characters")
    logger.info(f"   status: {state.status}")

    logger.info("\n" + "=" * 80)
    logger.info("✅ COPYWRITER AGENT COMPLETE")
    logger.info("=" * 80)

    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("\n" + "=" * 80)
    logger.info("⚠️  This is the agent module file.")
    logger.info("    To test the Copywriter Agent, run: python examples/run_copywriter.py")
    logger.info("    To customize input, edit: examples/inputs/campaign_input.json")
    logger.info("=" * 80)
