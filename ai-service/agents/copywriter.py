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

    # Extract all strategy fields needed for copy generation
    positioning = strategy.get("positioning", "")
    key_messages = strategy.get("key_messages", [])
    content_pillars = strategy.get("content_pillars", [])
    audience_segments = strategy.get("audience_segments", [])
    timeline = strategy.get("timeline", {})
    competitive_differentiation = strategy.get("competitive_differentiation", {})
    inferred_goal = strategy.get("inferred_goal", "awareness")
    research_foundation = strategy.get("research_foundation", {})
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
    logger.info(f"✓ Timeline Phases: {len(timeline)}")
    logger.info(f"✓ Inferred Goal: {inferred_goal}")
    logger.info(f"✓ Deliverables: {deliverables}")
    logger.info(f"✓ Channels: {channels}")

    # ========== STEP 2: READ STATE METADATA ==========
    logger.info("\n[STEP 2] Reading campaign metadata from state...")
    logger.info("-" * 80)

    campaign_name = state.campaign_name
    brand_name = state.brand_name
    brand_voice = state.brand_voice
    brief = state.brief or f"Marketing campaign for {brand_name}"

    logger.info(f"✓ Campaign: {campaign_name}")
    logger.info(f"✓ Brand: {brand_name}")
    logger.info(f"✓ Brand Voice: {brand_voice}")
    logger.info(f"✓ Brief: {brief[:60]}...")

    # ========== STEP 3: EXTRACT RESEARCH INSIGHTS ==========
    logger.info("\n[STEP 3] Extracting research insights for copy context...")
    logger.info("-" * 80)

    market_analysis = research_foundation.get("market_analysis", {})
    audience_insights = research_foundation.get("audience_insights", {})
    research_foundation.get("competitor_analysis", {})

    pain_points = audience_insights.get("pain_points", [])
    motivations = audience_insights.get("motivations", [])
    market_trends = market_analysis.get("market_trends", [])
    growth_rate = market_analysis.get("growth_rate", "")
    competitive_advantage = competitive_differentiation.get("competitive_advantage", "")

    logger.info(f"✓ Pain Points ({len(pain_points)}): {pain_points[:2]}")
    logger.info(f"✓ Motivations ({len(motivations)}): {motivations[:2]}")
    logger.info(f"✓ Market Trends ({len(market_trends)}): {market_trends[:2]}")
    logger.info(f"✓ Growth Rate: {growth_rate}")
    logger.info(f"✓ Competitive Advantage: {competitive_advantage[:60]}...")

    # ========== STEP 4: GENERATE COPY WITH LLM ==========
    logger.info("\n[STEP 4] Generating copy with LLM...")
    logger.info("-" * 80)
    logger.info("✍️  AI Copywriter crafting channel-specific copy...")

    # Initialize LLM client
    llm = get_llm_client()

    # Goal-specific CTA keywords for the prompt
    goal_keywords_map = {
        "awareness": "Learn More, Discover, Explore, See How",
        "lead_gen": "Get Free Access, Start Free Trial, Download, Sign Up, Get Started",
        "sales": "Schedule Demo, Buy Now, Get Pricing, Request Quote, Book a Call",
        "retention": "Upgrade Now, Explore Benefits, Renew, Access Exclusive Features"
    }
    goal_keywords = goal_keywords_map.get(inferred_goal, "Get Started, Learn More")

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

    # Load copywriter prompt and format with all campaign data
    prompt = load_prompt(
        "copywriter",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        target_audience=target_audience,
        industry=industry,
        primary_goal=primary_goal,
        brief=brief,
        additional_context=additional_context,
        human_feedback_section=human_feedback_section,
        # Strategy fields
        positioning=positioning,
        inferred_goal=inferred_goal,
        key_messages=json.dumps(key_messages, indent=2),
        content_pillars=json.dumps(content_pillars, indent=2),
        audience_segments=json.dumps(audience_segments, indent=2),
        timeline=json.dumps(timeline, indent=2),
        competitive_differentiation=json.dumps(competitive_differentiation, indent=2),
        channels=(
            f"ACTIVE CAMPAIGN CHANNELS (Generate copy ONLY for these): {json.dumps([c for c in channels if c])}\n"
            f"FORBIDDEN CHANNELS (MUST set copy to null and copy_readiness to false): {json.dumps([c for c in ['instagram', 'facebook', 'linkedin', 'twitter', 'tiktok', 'youtube', 'email', 'google_ads'] if c not in channels])}"
        ),
        # Research insights
        pain_points=json.dumps(pain_points, indent=2),
        motivations=json.dumps(motivations, indent=2),
        market_trends=json.dumps(market_trends, indent=2),
        growth_rate=growth_rate,
        competitive_advantage=competitive_advantage,
        # Derived helper fields for the prompt
        pain_points_primary=pain_points[0] if pain_points else "business inefficiencies",
        key_message_primary=key_messages[0] if key_messages else positioning,
        goal_keywords=goal_keywords,
        voice_keywords=voice_keywords,
        key_messages_count=len(key_messages),
        content_pillars_count=len(content_pillars),
        audience_segments_count=len(audience_segments),
        deliverables_json=json.dumps(deliverables)
    )

    logger.info("   Querying LLM with structured output...")
    revision_temperature = 0.0 if is_surgical_revision else 0.7
    revision_max_tokens = 8000 if (is_surgical_revision or is_focus_group_rewrite) else 6000
    cache_key = make_key(
        "Copywriter",
        prompt=prompt,
        industry=state.industry or "",
        temperature=revision_temperature,
        max_tokens=revision_max_tokens,
    )
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("📦 Cache hit — using cached Copywriter response")
        copy_output = CopywriterOutput(**cached)
    else:
        copy_output, state = safe_llm_call(
            state,
            "Copywriter",
            lambda: llm.generate_structured(prompt, CopywriterOutput, temperature=revision_temperature, max_tokens=revision_max_tokens)
        )
        if copy_output is not None:
            cache_set(cache_key, copy_output.model_dump())
    
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

    # ========== POST-REVISION MERGE SAFETY NET ==========
    # Even with surgical mode instructions, LLMs can occasionally drop a channel.
    # This layer detects dropped channels and restores them from the previous copy.
    if is_human_revision and state.copy_output:
        logger.info("\n[MERGE] Running post-revision safety check...")
        try:
            previous = CopywriterOutput.model_validate_json(state.copy_output)
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
