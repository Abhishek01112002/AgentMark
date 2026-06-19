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
from schemas import ImagePromptOutput


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

        for channel in known_channels:
            channel_data = copy_data.get(channel, {})
            if not channel_data:
                continue

            headline = channel_data.get("headline", "") or channel_data.get("subject", "")
            ctas = channel_data.get("ctas", {})

            # Pick the most prominent CTA for text overlay
            primary_cta = (
                ctas.get("hero_cta") or
                ctas.get("primary_cta") or
                ctas.get("post_cta") or
                ctas.get("video_cta") or
                ctas.get("tweet_cta") or
                next(iter(ctas.values()), "")
            )

            if headline or primary_cta:
                context["available_channels"].append(channel)
                context["channel_headlines"][channel] = headline
                context["channel_ctas"][channel] = primary_cta

    except (json.JSONDecodeError, AttributeError) as e:
        print(f"⚠️  Could not parse copy_output: {e}")

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
        print(f"⚠️  Could not parse research_foundation from strategy: {e}")

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

    print("\n" + "=" * 80)
    print("🎨 IMAGE PROMPT AGENT ACTIVATED")
    print("=" * 80)

    # ========== STEP 1: READ STRATEGY OUTPUT (PRIMARY INPUT) ==========
    print("\n[STEP 1] Reading strategy output (PRIMARY visual source)...")
    print("-" * 80)

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
    channels = execution.get("channels", [])

    # Fallback to manager_output if deliverables are missing
    if not deliverables and state.manager_output:
        try:
            manager_data = json.loads(state.manager_output)
            deliverables = manager_data.get("deliverables", [])
            if not channels:
                channels = manager_data.get("channels", [])
            print("   ℹ️  Deliverables loaded from manager_output (fallback)")
        except Exception:
            pass

    # Smart fallback: infer from channels
    if not deliverables:
        deliverables = _infer_deliverables_from_channels(channels)
        print(f"   ⚠️  No explicit deliverables - inferred from channels: {deliverables}")

    print(f"✓ Positioning: {positioning[:60]}...")
    print(f"✓ Content Pillars: {len(content_pillars)} pillars")
    print(f"✓ Key Messages: {len(key_messages)} messages")
    print(f"✓ Inferred Goal: {inferred_goal}")
    print(f"✓ Deliverables to design: {deliverables}")
    print(f"✓ Channels: {channels}")

    # ========== STEP 2: READ STATE METADATA ==========
    print("\n[STEP 2] Reading campaign metadata from state...")
    print("-" * 80)

    campaign_name = state.campaign_name or "Unnamed Campaign"
    brand_name = state.brand_name or "Unnamed Brand"
    target_audience = state.target_audience or "General Audience"
    brand_voice = state.brand_voice or "professional"
    industry = state.industry or "other"
    brief = state.brief or f"Marketing campaign for {brand_name}"

    print(f"✓ Campaign: {campaign_name}")
    print(f"✓ Brand: {brand_name}")
    print(f"✓ Industry: {industry}")
    print(f"✓ Target Audience: {target_audience[:60]}...")
    print(f"✓ Brand Voice: {brand_voice}")

    # ========== STEP 3: EXTRACT COPY CONTEXT (TEXT OVERLAY) ==========
    print("\n[STEP 3] Extracting copy headlines + CTAs for text overlay alignment...")
    print("-" * 80)

    copy_context = _extract_copy_context(state)

    if copy_context["available_channels"]:
        print(f"✓ Copy context extracted for channels: {copy_context['available_channels']}")
        for channel in copy_context["available_channels"]:
            headline = copy_context["channel_headlines"].get(channel, "N/A")
            cta = copy_context["channel_ctas"].get(channel, "N/A")
            print(f"   [{channel}] Headline: {str(headline)[:50]}...")
            print(f"   [{channel}] CTA: {str(cta)[:50]}...")
    else:
        print("⚠️  No copy output available - LLM will generate text overlay suggestions")

    # ========== STEP 4: EXTRACT RESEARCH CONTEXT ==========
    print("\n[STEP 4] Extracting research context from strategy.research_foundation...")
    print("-" * 80)

    research_context = _extract_research_context(strategy_data)

    print(f"✓ Pain Points ({len(research_context['pain_points'])}): {research_context['pain_points'][:2]}")
    print(f"✓ Motivations ({len(research_context['motivations'])}): {research_context['motivations'][:2]}")
    print(f"✓ Market Trends ({len(research_context['market_trends'])}): {research_context['market_trends'][:2]}")
    print(f"✓ Growth Rate: {research_context['growth_rate']}")
    print(f"✓ Differentiation: {research_context['differentiation_opportunity'][:60]}...")

    # ========== STEP 5: GENERATE IMAGE PROMPTS WITH LLM ==========
    print("\n[STEP 5] Generating DALL-E 3 prompts with LLM...")
    print("-" * 80)
    print("🎨 AI Visual Director crafting production-ready prompts...")

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

    print("   Querying LLM with structured output...")

    # Get structured LLM response with error handling
    image_output, state = safe_llm_call(
        state,
        "ImagePrompt",
        lambda: llm.generate_structured(prompt, ImagePromptOutput, temperature=0.7, max_tokens=3000)
    )
    
    if image_output is None:
        return state  # Error already logged in state

    # ========== STEP 6: DISPLAY RESULTS ==========
    print("\n[STEP 6] DALL-E 3 prompts generated!")
    print("-" * 80)
    print("✅ DALL-E 3 prompts generated by LLM!")

    print(f"\n📐 Visual Direction:")
    print(f"   Style: {image_output.visual_direction.overall_style}")
    print(f"   Mood: {image_output.visual_direction.mood}")
    print(f"   Colors: {', '.join(image_output.visual_direction.color_palette)}")

    print(f"\n🖼️  Image Prompts ({len(image_output.image_prompts)} total):")
    for i, prompt_obj in enumerate(image_output.image_prompts, 1):
        print(f"\n   Prompt {i}: {prompt_obj.deliverable_name}")
        print(f"   • Rationale:      {prompt_obj.rationale[:50]}...")
        print(f"   • Visual Elements: {', '.join(prompt_obj.visual_elements[:3])}")
        print(f"   • Style Keywords:  {', '.join(prompt_obj.style_keywords[:3])}")
        print(f"   • DALL-E Prompt ({len(prompt_obj.prompt)} chars):")
        print(f"     {prompt_obj.prompt[:100]}...")

    # ========== STEP 7: WRITE TO STATE ==========
    print("\n[STEP 7] Writing to state...")
    print("-" * 80)

    image_output_json = image_output.model_dump_json(indent=2)

    state.image_output = image_output_json
    state.status = "image_complete"

    print("✅ State updated:")
    print(f"   image_output: {len(image_output_json)} characters")
    print(f"   prompts generated: {len(image_output.image_prompts)}")
    print(f"   status: {state.status}")

    print("\n" + "=" * 80)
    print("✅ IMAGE PROMPT AGENT COMPLETE")
    print("=" * 80)

    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("⚠️  This is the agent module file.")
    print("    To test the Image Prompt Agent, run: python examples/run_image_prompt.py")
    print("    To customize input, edit: examples/inputs/campaign_input.json")
    print("=" * 80)