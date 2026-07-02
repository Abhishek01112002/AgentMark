"""
IMAGE PROMPT AGENT - DALL-E Visual Prompt Generator

Role: Visual Creative Director / AI Image Prompt Engineer

INPUT:
  FROM state.brief:
    ✅ brief: Original campaign context
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand identifier
    ✅ brand_voice: Brand tone (professional, bold, luxury)
    ✅ target_audience: Audience description
    ✅ industry: Industry sector
  
  FROM strategy_output (13 fields):
    ✅ positioning: Brand positioning for visual direction
    ✅ content_pillars: Content themes for visual concepts
    ✅ strategic_approach: Strategic direction for visual storytelling
    ✅ execution.deliverables: List of image assets to create
    ✅ execution.channels: Distribution channels
    ✅ research_foundation: Nested research data
  
  FROM copy_output (optional):
    ✅ Channel headlines + primary CTAs for text overlay alignment

OUTPUT (ImagePromptOutput - 2 Fields):
  1. visual_direction: VisualDirection object
     - overall_style: Overall visual style
     - color_palette: Color palette (List[str])
     - mood: Visual mood and tone
     - key_visual_themes: Visual themes (List[str])
  
  2. image_prompts: List[ImagePrompt]
     - deliverable_name: Name of the deliverable
     - prompt: DALL-E image generation prompt
     - rationale: Reasoning for this prompt
     - visual_elements: Key visual elements (List[str])
     - style_keywords: Style keywords (List[str])

KEY PRINCIPLE:
Image Prompt = LLM-Powered Visual Creative Engine
- Takes strategy + copy context → LLM generates production-ready DALL-E 3 prompts
- No hardcoded style maps or templates - fully dynamic AI visual direction
- Uses prompt template from utils/prompts/image_prompt.txt
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
from schemas import ImagePromptOutput, normalize_channel_list


# ==================== UTILITY FUNCTIONS ====================

def _extract_copy_context(state: CampaignState) -> dict:
    """
    Reads copy_output from state and extracts headlines + primary CTAs
    for text overlay alignment. Body copy is intentionally excluded.

    Returns a structured dict of per-channel headlines and CTAs.
    """
    context = {
        "available_channels": [],
        "channel_headlines": {},
        "channel_ctas": {}
    }

    if not state.copy_output:
        return context

    try:
        copy_data = json.loads(state.copy_output)

        # Known channel keys to scan
        known_channels = [
            "email", "linkedin", "instagram", "facebook",
            "twitter", "tiktok", "youtube", "google_ads",
            "social", "ads"
        ]

        copies_dict = copy_data.get("copies", {}) or {}
        for channel in known_channels:
            # Fall back to root-level key for backward compatibility
            channel_data = copies_dict.get(channel) or copy_data.get(channel)
            if not channel_data or not isinstance(channel_data, dict):
                continue

            headline = channel_data.get("headline", "") or channel_data.get("subject", "")
            ctas = channel_data.get("ctas", {}) or {}

            # Pick the most prominent CTA for text overlay
            primary_cta = (
                ctas.get("hero_cta") or
                ctas.get("primary_cta") or
                ctas.get("post_cta") or
                ctas.get("video_cta") or
                ctas.get("tweet_cta") or
                next(iter(ctas.values()), "") if isinstance(ctas, dict) and ctas else ""
            )

            if headline or primary_cta:
                context["available_channels"].append(channel)
                context["channel_headlines"][channel] = headline
                context["channel_ctas"][channel] = primary_cta

    except (json.JSONDecodeError, AttributeError) as e:
        logger.info(f"⚠️  Could not parse copy_output: {e}")

    return context


def _extract_research_context(strategy_data: dict) -> dict:
    """
    Reads research data from strategy_output.research_foundation.
    Research is embedded in strategy by the Strategy Agent.
    Returns pain points, trends, and competitor context for visual direction.
    """
    context = {
        "pain_points": [],
        "motivations": [],
        "market_trends": [],
        "differentiation_opportunity": "",
        "growth_rate": ""
    }

    if not strategy_data:
        return context

    try:
        research_foundation = strategy_data.get("research_foundation", {})

        # Audience insights
        audience = research_foundation.get("audience_insights", {})
        context["pain_points"] = audience.get("pain_points", [])
        context["motivations"] = audience.get("motivations", [])

        # Competitor analysis
        competitors = research_foundation.get("competitor_analysis", {})
        context["differentiation_opportunity"] = competitors.get("differentiation_opportunity", "")

        # Market analysis
        market = research_foundation.get("market_analysis", {})
        context["market_trends"] = market.get("market_trends", [])
        context["growth_rate"] = market.get("growth_rate", "")

    except (AttributeError, TypeError) as e:
        logger.info(f"⚠️  Could not parse research_foundation from strategy: {e}")

    return context


def _infer_deliverables_from_channels(channels: list) -> list:
    """
    Smart fallback: infer likely deliverables from channel list when
    deliverables are not explicitly provided.
    """
    channel_to_deliverable = {
        "linkedin": "linkedin social post",
        "instagram": "instagram story",
        "tiktok": "tiktok video cover",
        "facebook": "facebook social post",
        "pinterest": "pinterest pin",
        "email": "email banner",
        "blog": "blog header image",
        "podcast": "podcast cover art",
        "webinar": "webinar promotional banner",
        "product hunt": "product showcase image",
        "social media": "social media post",
        "youtube": "youtube thumbnail",
        "twitter": "twitter post image",
        "google ads": "google display ad"
    }

    deliverables = []
    for channel in channels:
        channel_lower = channel.lower().strip()
        for key, deliverable in channel_to_deliverable.items():
            if key in channel_lower:
                deliverables.append(deliverable)
                break

    return deliverables if deliverables else ["campaign hero banner"]


# ==================== IMAGE PROMPT AGENT FUNCTION ====================

def image_prompt_agent(state: CampaignState) -> CampaignState:
    """
    Image Prompt Agent - Generates production-quality DALL-E 3 prompts (LLM-Powered)

    Args:
        state: CampaignState with strategy_output (required),
               copy_output (optional but used if available)

    Returns:
        CampaignState with image_output filled

    Process:
    1. Extract strategy insights (positioning, deliverables, research_foundation)
    2. Extract copy headlines + CTAs for text overlay alignment
    3. Load image prompt template
    4. Send all context to LLM for DALL-E 3 prompt generation
    5. Parse LLM response to get production-ready prompts
    6. Update state with image_output and mark status as complete
    """

    logger.info("\n" + "=" * 80)
    logger.info("🎨 IMAGE PROMPT AGENT ACTIVATED")
    logger.info("=" * 80)

    # ========== STEP 1: READ STRATEGY OUTPUT (PRIMARY INPUT) ==========
    logger.info("\n[STEP 1] Reading strategy output (PRIMARY visual source)...")
    logger.info("-" * 80)

    if not state.strategy_output:
        raise ValueError("strategy_output is required - Image Agent needs Strategy insights")

    try:
        strategy_data = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse strategy_output: {e}")

    # Extract strategic context
    positioning = strategy_data.get("positioning", "")
    content_pillars = strategy_data.get("content_pillars", [])
    strategic_approach = strategy_data.get("strategic_approach", "")
    key_messages = strategy_data.get("key_messages", [])
    inferred_goal = strategy_data.get("inferred_goal", "awareness")
    competitive_differentiation = strategy_data.get("competitive_differentiation", {})

    # Extract deliverables and channels from execution plan
    execution = strategy_data.get("execution", {})
    deliverables = execution.get("deliverables", [])
    channels = normalize_channel_list(execution.get("channels", []))

    # Fallback to manager_output if deliverables are missing
    if not deliverables and state.manager_output:
        try:
            manager_data = json.loads(state.manager_output)
            deliverables = manager_data.get("deliverables", [])
            if not channels:
                channels = normalize_channel_list(manager_data.get("channels", []))
            logger.info("   ℹ️  Deliverables loaded from manager_output (fallback)")
        except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)

    # Smart fallback: infer from channels
    if not deliverables:
        deliverables = _infer_deliverables_from_channels(channels)
        logger.info(f"   ⚠️  No explicit deliverables - inferred from channels: {deliverables}")

    logger.info(f"✓ Positioning: {positioning[:60]}...")
    logger.info(f"✓ Content Pillars: {len(content_pillars)} pillars")
    logger.info(f"✓ Key Messages: {len(key_messages)} messages")
    logger.info(f"✓ Inferred Goal: {inferred_goal}")
    logger.info(f"✓ Deliverables to design: {deliverables}")
    logger.info(f"✓ Channels: {channels}")

    # ========== STEP 2: READ STATE METADATA ==========
    logger.info("\n[STEP 2] Reading campaign metadata from state...")
    logger.info("-" * 80)

    campaign_name = state.campaign_name or "Unnamed Campaign"
    brand_name = state.brand_name or "Unnamed Brand"
    target_audience = state.target_audience or "General Audience"
    brand_voice = state.brand_voice or "professional"
    industry = state.industry or "other"
    brief = state.brief or f"Marketing campaign for {brand_name}"

    logger.info(f"✓ Campaign: {campaign_name}")
    logger.info(f"✓ Brand: {brand_name}")
    logger.info(f"✓ Industry: {industry}")
    logger.info(f"✓ Target Audience: {target_audience[:60]}...")
    logger.info(f"✓ Brand Voice: {brand_voice}")

    # ========== STEP 3: EXTRACT COPY CONTEXT (TEXT OVERLAY) ==========
    logger.info("\n[STEP 3] Extracting copy headlines + CTAs for text overlay alignment...")
    logger.info("-" * 80)

    copy_context = _extract_copy_context(state)

    if copy_context["available_channels"]:
        logger.info(f"✓ Copy context extracted for channels: {copy_context['available_channels']}")
        for channel in copy_context["available_channels"]:
            headline = copy_context["channel_headlines"].get(channel, "N/A")
            cta = copy_context["channel_ctas"].get(channel, "N/A")
            logger.info(f"   [{channel}] Headline: {str(headline)[:50]}...")
            logger.info(f"   [{channel}] CTA: {str(cta)[:50]}...")
    else:
        logger.info("⚠️  No copy output available - LLM will generate text overlay suggestions")

    # ========== STEP 4: EXTRACT RESEARCH CONTEXT ==========
    logger.info("\n[STEP 4] Extracting research context from strategy.research_foundation...")
    logger.info("-" * 80)

    research_context = _extract_research_context(strategy_data)

    logger.info(f"✓ Pain Points ({len(research_context['pain_points'])}): {research_context['pain_points'][:2]}")
    logger.info(f"✓ Motivations ({len(research_context['motivations'])}): {research_context['motivations'][:2]}")
    logger.info(f"✓ Market Trends ({len(research_context['market_trends'])}): {research_context['market_trends'][:2]}")
    logger.info(f"✓ Growth Rate: {research_context['growth_rate']}")
    logger.info(f"✓ Differentiation: {research_context['differentiation_opportunity'][:60]}...")

    # ========== STEP 5: GENERATE IMAGE PROMPTS WITH LLM ==========
    logger.info("\n[STEP 5] Generating DALL-E 3 prompts with LLM...")
    logger.info("-" * 80)
    logger.info("🎨 AI Visual Director crafting production-ready prompts...")

    # Initialize LLM client
    llm = get_llm_client()

    # Build copy overlay context string for the prompt
    copy_overlay_context = "No copy output available - generate appropriate text overlay suggestions."
    if copy_context["available_channels"]:
        overlay_lines = []
        for channel in copy_context["available_channels"]:
            headline = copy_context["channel_headlines"].get(channel, "")
            cta = copy_context["channel_ctas"].get(channel, "")
            if headline or cta:
                overlay_lines.append(f"  - {channel}: headline='{headline}' | cta='{cta}'")
        if overlay_lines:
            copy_overlay_context = "\n".join(overlay_lines)

    # Format human revision feedback if image_prompt is targeted for revision
    is_human_revision = bool(
        (state.human_feedback and state.human_revision_target == "image_prompt") or
        (state.status == "image_revision_required")
    )
    human_feedback_section = ""
    if is_human_revision:
        existing_image_section = ""
        if state.image_output:
            existing_image_section = (
                "\n\nEXISTING IMAGE PROMPTS (your previous output — preserve ALL unchanged visuals exactly):\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{state.image_output}\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )
        feedback_text = state.human_feedback or "AI Reviewer requested revision."
        human_feedback_section = (
            "\n" + "="*80 + "\n"
            "⚠️ HUMAN REVISION FEEDBACK — SURGICAL EDIT MODE:\n"
            "You are in REVISION mode. The user has requested a specific change below.\n"
            "CRITICAL REVISION RULES — MUST FOLLOW:\n"
            "  1. READ the user feedback carefully and identify ONLY which image(s)/field(s) need changing.\n"
            "  2. ONLY modify the specific image prompt(s) or visual direction the user mentioned.\n"
            "  3. ALL other image prompts MUST be copied exactly, word-for-word, from EXISTING IMAGE PROMPTS above. Do not alter a single character of the unchanged deliverables.\n"
            "  4. Do NOT regenerate, restyle, or rewrite unchanged prompts.\n"
            "  5. Keep exactly the same number of image prompts as in EXISTING IMAGE PROMPTS.\n"
            "\n"
            "DALL-E 3 CAPABILITY RULES — INTERPRET USER FEEDBACK CORRECTLY:\n"
            "  DALL-E 3 is a diffusion model — it CANNOT reliably render readable text. It will produce garbled, unreadable glyphs.\n"
            "  When user requests text or logo, interpret and translate as follows:\n"
            "\n"
            "  IF user asks to 'add text', 'show tagline', 'write headline', 'display copy' ON the image:\n"
            "    → Do NOT attempt to render text via DALL-E. Text overlays are added by designers separately.\n"
            "    → Instead: adjust the COMPOSITION to leave clean negative space where the text will be overlaid.\n"
            "    → Example translation: 'leave clean, uncluttered negative space in the lower third of the frame where a headline and CTA text will be overlaid by the design team'\n"
            "    → The 'no text, no words, no letters' safety tail MUST remain at the end of every prompt.\n"
            "\n"
            "  IF user asks to 'leave space for logo', 'add logo area', 'reserve corner for branding':\n"
            "    → Instruct DALL-E to leave intentional negative space in that specific area.\n"
            "    → Example translation: 'clean open negative space in the upper-left corner, uncluttered background, no visual elements in that zone, designed to accommodate a brand logo overlay'\n"
            "    → 'no logos' in the safety tail means DALL-E should NOT generate any logo shapes — but empty space is fine.\n"
            "\n"
            f"User Feedback: \"{feedback_text}\"\n"
            + "="*80
            + existing_image_section
        )

    # Load image prompt template and format with all campaign data
    prompt = load_prompt(
        "image",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        industry=industry,
        target_audience=target_audience,
        brief=brief,
        human_feedback_section=human_feedback_section,
        # Strategy fields
        positioning=positioning,
        inferred_goal=inferred_goal,
        key_messages=json.dumps(key_messages, indent=2),
        content_pillars=json.dumps(content_pillars, indent=2),
        strategic_approach=strategic_approach,
        competitive_differentiation=json.dumps(competitive_differentiation, indent=2),
        channels=json.dumps(channels, indent=2),
        deliverables=json.dumps(deliverables, indent=2),
        # Research context
        pain_points=json.dumps(research_context["pain_points"], indent=2),
        motivations=json.dumps(research_context["motivations"], indent=2),
        market_trends=json.dumps(research_context["market_trends"], indent=2),
        growth_rate=research_context["growth_rate"],
        differentiation_opportunity=research_context["differentiation_opportunity"],
        # Copy overlay context
        copy_overlay_context=copy_overlay_context,
        # Derived counts
        deliverables_count=len(deliverables)
    )

    logger.info("   Querying LLM with structured output...")

    # Revision runs: lower temperature reduces visual drift on unchanged prompts;
    # extra token budget covers the existing-output context in the prompt
    revision_temperature = 0.0 if is_human_revision else 0.7
    revision_max_tokens = 5000 if is_human_revision else 3000

    if is_human_revision:
        logger.info(f"   [REVISION MODE] temperature={revision_temperature}, max_tokens={revision_max_tokens}")

    # Cache-aware LLM call
    cache_key = make_key("ImagePrompt", prompt=prompt, temperature=revision_temperature, max_tokens=revision_max_tokens)
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("📦 Cache hit — using cached ImagePrompt response")
        # pyrefly: ignore [bad-unpacking]
        image_output = ImagePromptOutput(**cached)
    else:
        image_output, state = safe_llm_call(
            state,
            "ImagePrompt",
            lambda: llm.generate_structured(prompt, ImagePromptOutput, temperature=revision_temperature, max_tokens=revision_max_tokens)
        )
        if image_output is not None:
            cache_set(cache_key, image_output.model_dump())
    
    if image_output is None:
        return state  # Error already logged in state

    # ========== STEP 6: DISPLAY RESULTS ==========
    logger.info("\n[STEP 6] Image prompts generated!")
    logger.info("-" * 80)
    logger.info("✅ Image prompts generated by LLM!")

    logger.info("\n📐 Visual Direction:")
    logger.info(f"   Style: {image_output.visual_direction.overall_style}")
    logger.info(f"   Mood: {image_output.visual_direction.mood}")
    logger.info(f"   Colors: {', '.join(image_output.visual_direction.color_palette)}")

    logger.info(f"\n🖼️  Image Prompts ({len(image_output.image_prompts)} total):")
    for i, prompt_obj in enumerate(image_output.image_prompts, 1):
        logger.info(f"\n   Prompt {i}: {prompt_obj.deliverable_name}")
        logger.info(f"   • Rationale:      {prompt_obj.rationale[:50]}...")
        logger.info(f"   • Visual Elements: {', '.join(prompt_obj.visual_elements[:3])}")
        logger.info(f"   • Style Keywords:  {', '.join(prompt_obj.style_keywords[:3])}")
        logger.info(f"   • Prompt ({len(prompt_obj.prompt)} chars):")
        logger.info(f"     {prompt_obj.prompt[:100]}...")

    # ========== STEP 6.5: PROMPT QUALITY VALIDATION ==========
    # Purely diagnostic — logs warnings only, NEVER raises exceptions or blocks the pipeline.
    # Catches common prompt quality failures so they show up in logs for monitoring.

    def _validate_prompt_quality(prompt_obj) -> list:
        """
        Validates a single generated image prompt against quality rules.

        Checks performed:
          1. [CONTEXT] block leak     — metadata noise that confuses image generators
          2. Too-short prompt         — likely generic / low-quality output
          3. Abstract concept used    — should be a specific frozen moment, not a concept
          4. Missing lens/depth specs — needed for photography-quality output
          5. Missing safety tail      — 'no text' instruction must close every prompt

        Returns a list of warning strings (empty list = all checks passed).
        Never raises; designed to be called in a fire-and-forget loop.
        """
        issues: list = []
        text = prompt_obj.prompt or ""
        name = prompt_obj.deliverable_name or "unknown"

        # Check 1: Context block leaked into output — will confuse any image generator
        if "[CONTEXT" in text or "DO NOT RENDER" in text or "USE FOR GENERATION INSIGHTS" in text:
            issues.append(
                f"⚠️  [{name}] [CONTEXT] block leaked into prompt — "
                "metadata noise confuses image generators."
            )

        # Check 2: Prompt too short — likely a generic placeholder
        if len(text) < 300:
            issues.append(
                f"⚠️  [{name}] Prompt too short ({len(text)} chars) — "
                "likely abstract/generic. Target 450-900 chars."
            )

        # Check 3: Abstract concept instead of specific frozen scene
        abstract_terms = [
            "visualization of", "concept of",
            "representation of", "abstract"
        ]
        if any(term in text.lower() for term in abstract_terms):
            issues.append(
                f"⚠️  [{name}] Abstract concept detected — "
                "should describe a specific frozen moment/scene, not a concept."
            )

        # Check 4: No depth-of-field / lens perspective language
        lens_terms = [
            "depth of field", "bokeh", "shallow", "telephoto",
            "wide angle", "macro", "perspective", "aperture", "f/",
            "compression", "shallow focus", "environmental perspective"
        ]
        if not any(term in text.lower() for term in lens_terms):
            issues.append(
                f"⚠️  [{name}] Missing lens/depth-of-field specs — "
                "will produce flat, generic output."
            )

        # Check 5: Safety tail missing
        if "no text" not in text.lower():
            issues.append(
                f"⚠️  [{name}] Missing 'no text' safety instruction — "
                "image generator may render garbled text."
            )

        return issues

    quality_warnings_total = []
    for prompt_obj in image_output.image_prompts:
        quality_warnings = _validate_prompt_quality(prompt_obj)
        quality_warnings_total.extend(quality_warnings)
        for warning in quality_warnings:
            logger.warning(warning)

    if not quality_warnings_total:
        logger.info("✅ All prompts passed quality validation — clean generator-ready format")
    else:
        logger.warning(
            f"⚠️  {len(quality_warnings_total)} quality warning(s) — "
            "prompts may produce generic output. Review warnings above. Pipeline continues."
        )

    # ========== STEP 7: WRITE TO STATE ==========

    logger.info("\n[STEP 7] Writing to state...")
    logger.info("-" * 80)

    image_output_json = image_output.model_dump_json(indent=2)

    state.image_output = image_output_json
    state.status = "image_complete"

    logger.info("✅ State updated:")
    logger.info(f"   image_output: {len(image_output_json)} characters")
    logger.info(f"   prompts generated: {len(image_output.image_prompts)}")
    logger.info(f"   status: {state.status}")

    logger.info("\n" + "=" * 80)
    logger.info("✅ IMAGE PROMPT AGENT COMPLETE")
    logger.info("=" * 80)

    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("\n" + "=" * 80)
    logger.info("⚠️  This is the agent module file.")
    logger.info("    To test the Image Prompt Agent, run: python examples/run_image_prompt.py")
    logger.info("    To customize input, edit: examples/inputs/campaign_input.json")
    logger.info("=" * 80)