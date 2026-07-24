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
    industry = state.industry or "general"
    safe_channels = channels or ["linkedin", "email"]
    primary_message = key_messages[0] if key_messages else positioning or f"{brand_name} helps teams move faster"
    primary_pain = pain_points[0] if pain_points else "operational friction"
    ctas = CTAs(primary="Get Started", secondary="Learn More", tertiary="Book a Demo")
    copies = {}
    for channel in safe_channels:
        normalized = normalize_channel_name(channel)
        if normalized is None:
            continue
        channel_enum = Channel(normalized)
        copies[channel_enum] = ChannelCopy(
            headline=f"{brand_name} for {industry} teams",
            body=(
                f"{primary_message} Built for {industry} teams, this campaign addresses "
                f"{primary_pain} with a {brand_voice} message and clear next step."
            ),
            ctas=ctas,
        )
    if not copies:
        copies[Channel.LINKEDIN] = ChannelCopy(
            headline=f"{brand_name} for {industry} teams",
            body=f"{brand_name} helps {industry} teams solve {primary_pain} with a practical campaign message.",
            ctas=ctas,
        )
    return CopywriterOutput(
        inferred_goal=inferred_goal,
        copies=copies,
        messaging_framework=MessagingFramework(
            brand_promise=f"{brand_name} helps {industry} teams solve {primary_pain}.",
            value_proposition=positioning or primary_message,
            segment_messaging=[
                SegmentMessaging(
                    segment_name=state.target_audience or "Primary audience",
                    message=f"Reduce {primary_pain} with a {brand_voice} approach.",
                    tone=brand_voice or "professional",
                )
            ],
            channel_messaging=[
                ChannelMessaging(
                    channel_name=channel.value,
                    approach=f"Use {channel.value} to communicate {industry}-specific value.",
                    key_points=[primary_message, primary_pain],
                )
                for channel in copies.keys()
            ],
        ),
        strategic_alignment=StrategicAlignment(
            positioning_used=positioning or primary_message,
            key_messages_count=len(key_messages),
            deliverables=deliverables or ["campaign copy"],
        ),
        copy_readiness={
            **{channel.value: True for channel in copies.keys()},
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

    if not state.strategy_output:
        raise ValueError("strategy_output is required - Copywriter needs Strategy insights")

    try:
        strategy = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse strategy_output: {e}")

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

    # Load copywriter prompt and format with all campaign data
    prompt = load_prompt(
        "copywriter",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        brief=brief,
        human_feedback_section=human_feedback_section,
        # Strategy fields
        positioning=positioning,
        inferred_goal=inferred_goal,
        key_messages=json.dumps(key_messages, indent=2),
        content_pillars=json.dumps(content_pillars, indent=2),
        audience_segments=json.dumps(audience_segments, indent=2),
        timeline=json.dumps(timeline, indent=2),
        competitive_differentiation=json.dumps(competitive_differentiation, indent=2),
        deliverables=json.dumps(deliverables, indent=2),
        channels=json.dumps(channels, indent=2),
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
    revision_max_tokens = 6000 if (is_surgical_revision or is_focus_group_rewrite) else 4000
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
