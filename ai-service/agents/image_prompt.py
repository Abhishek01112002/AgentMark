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
from schemas.agent_outputs import _ImagePromptBatch, VisualDirection, ImagePrompt


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
    Surgical Context Filtering for Image Prompt Agent:
    - Preserves: positioning, key_messages, content_pillars, headlines + CTAs (for text overlay alignment), pain_points, motivations, market_trends.
    - Prunes: heavy financial TAM figures, raw competitor audit matrices, full long-form email/blog copy bodies.
    """
    context = {
        "pain_points": [],
        "motivations": [],
        "market_trends": [],
        "differentiation_opportunity": "",
        "growth_rate": "",
        "customer_voice_insights": [],
        "competitor_vulnerabilities": [],
        "proven_ad_hooks": [],
        "brand_dna": None
    }

    if not strategy_data:
        return context

    try:
        research_foundation = strategy_data.get("research_foundation", {})

        # Audience insights (pruned to top 3 for visual storytelling)
        audience = research_foundation.get("audience_insights", {})
        context["pain_points"] = audience.get("pain_points", [])[:3]
        context["motivations"] = audience.get("motivations", [])[:3]

        # Competitor analysis (summary only, no raw audit tables)
        competitors = research_foundation.get("competitor_analysis", {})
        context["differentiation_opportunity"] = str(competitors.get("differentiation_opportunity", ""))[:120]

        # Market analysis (prune raw financial TAM figures, keep top trends)
        market = research_foundation.get("market_analysis", {})
        context["market_trends"] = market.get("market_trends", [])[:3]
        context["growth_rate"] = str(market.get("growth_rate", ""))[:30]

        # Grounded 100x Research Intelligence fields
        context["customer_voice_insights"] = research_foundation.get("customer_voice_insights", [])[:3]
        context["competitor_vulnerabilities"] = research_foundation.get("competitor_vulnerabilities", [])[:3]
        context["proven_ad_hooks"] = research_foundation.get("proven_ad_hooks", [])[:3]
        context["brand_dna"] = research_foundation.get("brand_dna", None)
    except Exception as e:
        logger.warning(f"⚠️ Failed to extract research_context in image_prompt: {e}")

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
        raise ValueError("Strategy Agent output is missing — cannot generate visual prompts.")

    try:
        strategy_data = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        logger.warning(f"⚠️ Failed to parse strategy_output: {e} — using fallback strategy context")
        strategy_data = {}


    if not strategy_data:
        strategy_data = {
            "positioning": f"Leading solution for {state.brand_name}",
            "content_pillars": ["Innovation", "Quality", "Customer Success"],
            "strategic_approach": "Direct response and brand storytelling",
            "key_messages": [f"Empowering audience with {state.brand_name}"],
            "inferred_goal": state.primary_goal or "awareness",
            "competitive_differentiation": {}
        }

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
            "  3. DO NOT output any image prompts that you are not changing. Exclude them entirely from your JSON output (Sparse JSON Patch).\n"
            "  4. Only output the specific image prompts or fields that need to be updated based on the feedback.\n"
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

    additional_context = getattr(state, "client_memory_context", None) or "None (No additional context)"

    from utils.brand_dna_context import build_brand_dna_context
    dna_context = build_brand_dna_context(research_context.get("brand_dna"), purpose="image_prompt", max_tokens=1500)

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
        additional_context=additional_context,
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
        # Grounded Brand DNA & Research Intelligence
        brand_dna_context=dna_context.text or "None provided",
        customer_voice_insights=json.dumps(research_context.get("customer_voice_insights", []), indent=2),
        competitor_vulnerabilities=json.dumps(research_context.get("competitor_vulnerabilities", []), indent=2),
        proven_ad_hooks=json.dumps(research_context.get("proven_ad_hooks", []), indent=2),
        # Copy overlay context
        copy_overlay_context=copy_overlay_context,
        # Derived counts
        deliverables_count=len(deliverables)
    )


    # Revision runs: lower temperature reduces visual drift on unchanged prompts;
    # extra token budget covers the existing-output context in the prompt.
    # Standard runs use 0.85 temperature for more creative, unique scene descriptions.
    # max_tokens is per batch — 2 prompts × ~2500 chars each = ~4000 tokens comfortably.
    revision_temperature = 0.0 if is_human_revision else 0.85
    revision_max_tokens = 12000 if is_human_revision else 8192
    BATCH_SIZE = 2

    if is_human_revision:
        logger.info(f"   [REVISION MODE] temperature={revision_temperature}, max_tokens=12000, batch_size={BATCH_SIZE}")
    else:
        logger.info(f"   [STANDARD MODE] temperature={revision_temperature}, batch_size={BATCH_SIZE}, batches={len(deliverables) // BATCH_SIZE + (1 if len(deliverables) % BATCH_SIZE else 0)}")

    # ── Batch loop ────────────────────────────────────────────────────────────
    # Batch 0 → ImagePromptOutput (visual_direction + first BATCH_SIZE prompts)
    # Batch 1+ → _ImagePromptBatch (prompts only; visual_direction reused from batch 0)
    # Each batch prompt asks the LLM to generate ONLY its deliverable slice,
    # keeping response size bounded regardless of total deliverable count.
    # ─────────────────────────────────────────────────────────────────────────

    all_prompts: list = []
    visual_direction_obj = None

    deliverable_batches = [
        deliverables[i:i + BATCH_SIZE]
        for i in range(0, max(len(deliverables), 1), BATCH_SIZE)
    ]

    for batch_idx, batch_deliverables in enumerate(deliverable_batches):
        is_first_batch = batch_idx == 0
        batch_label = f"Batch {batch_idx + 1}/{len(deliverable_batches)}"
        logger.info(f"   [{batch_label}] Generating {len(batch_deliverables)} prompt(s): {batch_deliverables}")

        # Build per-batch prompt: same template, but scoped to this batch's
        # deliverables only. The quality gate "Exactly N prompts" uses the
        # batch count so the LLM doesn't try to pad out the full set.
        from utils.prompt_loader import load_split_prompt
        system_prompt, batch_prompt = load_split_prompt(
            "image",
            campaign_name=campaign_name,
            brand_name=brand_name,
            brand_voice=brand_voice,
            industry=industry,
            target_audience=target_audience,
            brief=brief,
            additional_context=additional_context,
            human_feedback_section=human_feedback_section if is_first_batch else "",
            positioning=positioning,
            inferred_goal=inferred_goal,
            key_messages=json.dumps(key_messages, indent=2),
            content_pillars=json.dumps(content_pillars, indent=2),
            strategic_approach=strategic_approach,
            competitive_differentiation=json.dumps(competitive_differentiation, indent=2),
            channels=json.dumps(channels, indent=2),
            deliverables=json.dumps(batch_deliverables, indent=2),
            pain_points=json.dumps(research_context["pain_points"], indent=2),
            motivations=json.dumps(research_context["motivations"], indent=2),
            market_trends=json.dumps(research_context["market_trends"], indent=2),
            growth_rate=research_context["growth_rate"],
            differentiation_opportunity=research_context["differentiation_opportunity"],
            copy_overlay_context=copy_overlay_context,
            deliverables_count=len(batch_deliverables),
        )

        if is_first_batch:
            # Full schema: visual_direction + image_prompts
            schema = ImagePromptOutput
            max_tok = 12000 if is_human_revision else 5000
        else:
            # Lightweight schema: image_prompts only
            schema = _ImagePromptBatch
            max_tok = 4000

        cache_key = make_key(
            f"ImagePrompt_b{batch_idx}",
            prompt=batch_prompt,
            temperature=revision_temperature,
            max_tokens=max_tok,
        )
        cached = cache_get(cache_key)

        if cached is not None:
            logger.info(f"   [{batch_label}] ⮞ Cache hit")
            if is_first_batch:
                batch_result = ImagePromptOutput(**cached)
            else:
                batch_result = _ImagePromptBatch(**cached)
        else:
            batch_result, state = safe_llm_call(
                state,
                f"ImagePrompt[{batch_label}]",
                lambda s=schema, p=batch_prompt, sp=system_prompt, t=revision_temperature, m=max_tok: (
                    llm.generate_structured(p, s, system_prompt=sp, temperature=t, max_tokens=m)
                ),
            )
            if batch_result is None:
                logger.warning(f"   [{batch_label}] LLM call returned None — generating fallback image prompt(s) for {batch_deliverables}")
                fallback_prompts = [
                    ImagePrompt(
                        deliverable_name=str(d),
                        prompt=f"Professional high-resolution editorial photograph for {brand_name} {d}, 85mm prime lens, cinematic lighting, photorealistic, 8k resolution, no text, no words, no letters",
                        rationale=f"Strategic visual representation of {d} aligned with positioning",
                        visual_elements=["Professional model", "Clean studio lighting", "Brand palette tones"],
                        style_keywords=["Editorial", "Commercial", "Photorealistic", "Modern"],
                        camera_specs="85mm f/1.4 prime lens, Hasselblad H6D-100c, ISO 100"
                    )
                    for d in batch_deliverables
                ]
                all_prompts.extend(fallback_prompts)
                continue
            cache_set(cache_key, batch_result.model_dump())

        if is_first_batch:
            visual_direction_obj = batch_result.visual_direction
            all_prompts.extend(batch_result.image_prompts)
        else:
            all_prompts.extend(batch_result.image_prompts)

        logger.info(f"   [{batch_label}] ✓ {len(batch_result.image_prompts)} prompt(s) collected (running total: {len(all_prompts)})")

    # Assemble final output from collected batches
    image_output = ImagePromptOutput(
        visual_direction=visual_direction_obj or VisualDirection(),
        image_prompts=all_prompts,
    )

    if is_human_revision and state.image_output:
        logger.info("\n[MERGE] Executing Semantic Delta Patching deep merge for Image Prompt...")
        try:
            from utils.delta_merger import deep_merge_dicts
            previous_dict = json.loads(state.image_output)
            merged_dict = deep_merge_dicts(previous_dict, image_output.model_dump(exclude_unset=True))
            image_output = ImagePromptOutput(**merged_dict)
            logger.info("   ✅ Semantic Delta Patch merged cleanly over previous image_output")
        except Exception as exc:
            logger.warning(f"   ⚠️ Image prompt delta merge warning: {exc} — preserving current image output")

    # Cache the merged final output under the original full-run key
    full_cache_key = make_key(
        "ImagePrompt",
        prompt=prompt,
        temperature=revision_temperature,
        max_tokens=revision_max_tokens if is_human_revision else 8192,
    )
    cache_set(full_cache_key, image_output.model_dump())

    # ========== PRE-VALIDATION & LOCAL REPAIR LOOP ==========
    try:
        from utils.pre_validator import PreValidator
        bounds_res = PreValidator.validate_image_prompt_bounds(
            image_prompts=[p.model_dump() if hasattr(p, "model_dump") else p for p in image_output.image_prompts],
            min_chars=100
        )
        logger.info(f"   [PRE-VALIDATION] Image prompt bounds check: {bounds_res.metadata.get('valid_prompt_count')}/{bounds_res.metadata.get('total_prompts')} valid (is_valid={bounds_res.is_valid})")
        if not bounds_res.is_valid:
            short_info = bounds_res.metadata.get("short_prompts", [])
            logger.info(f"   [LOCAL REPAIR] Expanding {len(short_info)} short image prompt(s)...")
            for item in short_info:
                idx = item.get("index")
                if idx is not None and idx < len(image_output.image_prompts):
                    p_obj = image_output.image_prompts[idx]
                    p_text = getattr(p_obj, "prompt", "")
                    if len(p_text.strip()) < 100:
                        padded_text = (
                            f"{p_text.strip()} Highly detailed commercial studio photograph, 85mm lens, "
                            f"cinematic lighting, 8k resolution, photorealistic rendering for {brand_name} campaign."
                        )
                        setattr(p_obj, "prompt", padded_text)
            from utils.telemetry import get_telemetry_tracker
            get_telemetry_tracker().record_pre_validation_repair("image_prompt", f"Padded {len(short_info)} short prompts")

        intel_res = PreValidator.validate_visual_intelligence_compliance(
            image_prompts=[p.model_dump() if hasattr(p, "model_dump") else p for p in image_output.image_prompts]
        )
        logger.info(f"   [PRE-VALIDATION] Visual Intelligence compliance: {intel_res.metadata.get('compliance_pct')}% (is_valid={intel_res.is_valid})")
    except Exception as exc:
        logger.warning(f"   ⚠️ Image prompt pre-validation non-blocking error: {exc}")


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
        if len(text) < 500:
            issues.append(
                f"⚠️  [{name}] Prompt too short ({len(text)} chars) — "
                "likely abstract/generic. Target 700-1000 chars."
            )

        # Check 3: Abstract concept instead of specific frozen scene
        # Exclude legitimate visual design descriptors (e.g. "abstract background", "abstract pattern")
        clean_text = text.lower()
        for valid_design_term in ["abstract background", "abstract pattern", "abstract texture", "abstract geometric", "abstract art"]:
            clean_text = clean_text.replace(valid_design_term, "")

        abstract_terms = [
            "visualization of", "concept of",
            "representation of", "abstract idea", "abstract concept"
        ]
        if any(term in clean_text for term in abstract_terms):
            issues.append(
                f"⚠️  [{name}] Abstract concept detected — "
                "should describe a specific frozen moment/scene, not a concept."
            )

        # Check 4: No depth-of-field / lens perspective language
        lens_terms = [
            "depth of field", "bokeh", "shallow", "telephoto",
            "wide angle", "macro", "perspective", "aperture", "f/",
            "compression", "shallow focus", "environmental perspective",
            "portrait perspective", "medium shot", "wide shot", "close-up",
            "sharp focus", "background blur", "soft background", "depth",
            "tight framing", "focal", "35mm", "50mm", "85mm", "dramatic perspective"
        ]
        if not any(term in text.lower() for term in lens_terms):
            issues.append(
                f"⚠️  [{name}] Missing lens/depth-of-field specs — "
                "will produce flat, generic output."
            )

        # Check 4b: Evaded camera_specs parameter
        cam_spec = str(getattr(prompt_obj, "camera_specs", "") or "").strip().lower()
        if cam_spec in ("n/a", "none", "false", "null", "undefined") or not cam_spec:
            issues.append(
                f"⚠️  [{name}] Evaded camera_specs parameter ('{cam_spec}') — "
                "must specify camera optics/lens details."
            )

        # Check 5: Safety tail missing
        if "no text" not in text.lower():
            issues.append(
                f"⚠️  [{name}] Missing 'no text' safety instruction — "
                "image generator may render garbled text."
            )

        # Check 6: Banned AI-slop phrase check
        banned_phrases = [
            "capturing the essence", "vibrant tapestry", "seamlessly blends",
            "modern professional setting", "innovative solution", "tapestry of"
        ]
        for phrase in banned_phrases:
            if phrase in text.lower():
                issues.append(
                    f"⚠️  [{name}] Banned anti-slop phrase detected: '{phrase}' — "
                    "replace with concrete physical scene description."
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