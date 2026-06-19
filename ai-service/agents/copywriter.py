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
from schemas import CopywriterOutput


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

    print("\n" + "=" * 80)
    print("✍️  COPYWRITER AGENT ACTIVATED")
    print("=" * 80)

    # ========== STEP 1: READ STRATEGY OUTPUT (PRIMARY INPUT) ==========
    print("\n[STEP 1] Reading strategy output (PRIMARY copy source)...")
    print("-" * 80)

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
    channels = execution.get("channels", [])

    print(f"✓ Positioning: {positioning[:60]}...")
    print(f"✓ Key Messages: {len(key_messages)} found")
    print(f"✓ Content Pillars: {len(content_pillars)} defined")
    print(f"✓ Audience Segments: {len(audience_segments)} identified")
    print(f"✓ Timeline Phases: {len(timeline)}")
    print(f"✓ Inferred Goal: {inferred_goal}")
    print(f"✓ Deliverables: {deliverables}")
    print(f"✓ Channels: {channels}")

    # ========== STEP 2: READ STATE METADATA ==========
    print("\n[STEP 2] Reading campaign metadata from state...")
    print("-" * 80)

    campaign_name = state.campaign_name
    brand_name = state.brand_name
    brand_voice = state.brand_voice
    brief = state.brief or f"Marketing campaign for {brand_name}"

    print(f"✓ Campaign: {campaign_name}")
    print(f"✓ Brand: {brand_name}")
    print(f"✓ Brand Voice: {brand_voice}")
    print(f"✓ Brief: {brief[:60]}...")

    # ========== STEP 3: EXTRACT RESEARCH INSIGHTS ==========
    print("\n[STEP 3] Extracting research insights for copy context...")
    print("-" * 80)

    market_analysis = research_foundation.get("market_analysis", {})
    audience_insights = research_foundation.get("audience_insights", {})
    competitor_analysis = research_foundation.get("competitor_analysis", {})

    pain_points = audience_insights.get("pain_points", [])
    motivations = audience_insights.get("motivations", [])
    market_trends = market_analysis.get("market_trends", [])
    growth_rate = market_analysis.get("growth_rate", "")
    competitive_advantage = competitive_differentiation.get("competitive_advantage", "")

    print(f"✓ Pain Points ({len(pain_points)}): {pain_points[:2]}")
    print(f"✓ Motivations ({len(motivations)}): {motivations[:2]}")
    print(f"✓ Market Trends ({len(market_trends)}): {market_trends[:2]}")
    print(f"✓ Growth Rate: {growth_rate}")
    print(f"✓ Competitive Advantage: {competitive_advantage[:60]}...")

    # ========== STEP 4: GENERATE COPY WITH LLM ==========
    print("\n[STEP 4] Generating copy with LLM...")
    print("-" * 80)
    print("✍️  AI Copywriter crafting channel-specific copy...")

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
        "authoritative": "leading, authoritative, definitive, trusted, expert"
    }
    voice_keywords = voice_keywords_map.get(brand_voice, "clear, compelling, direct")

    # Load copywriter prompt and format with all campaign data
    prompt = load_prompt(
        "copywriter",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        brief=brief,
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

    print("   Querying LLM with structured output...")

    # Get structured LLM response with error handling
    copy_output, state = safe_llm_call(
        state,
        "Copywriter",
        lambda: llm.generate_structured(prompt, CopywriterOutput, temperature=0.7, max_tokens=4000)
    )
    
    if copy_output is None:
        return state  # Error already logged in state

    # ========== STEP 5: DISPLAY COPY SUMMARY ==========
    print("\n[STEP 5] Copy generated!")
    print("-" * 80)
    print("✅ Copy generated by LLM!")

    # Display copy for each channel in the campaign
    for channel in channels:
        channel_key = channel.lower().replace(" ", "_")
        channel_copy = getattr(copy_output, channel_key, None)
        if channel_copy:
            print(f"\n📝 {channel.title()} Copy:")
            if hasattr(channel_copy, 'subject'):
                print(f"   Subject: {channel_copy.subject}")
            print(f"   Headline: {channel_copy.headline[:60]}...")
            print(f"   CTAs: primary={channel_copy.ctas.primary}, secondary={channel_copy.ctas.secondary}")

    print("\n🏗️  Messaging Framework:")
    framework = copy_output.messaging_framework
    print(f"   Brand Promise: {framework.brand_promise[:60]}...")
    print(f"   Segment Messages: {len(framework.segment_messaging)}")
    print(f"   Channel Messaging: {len(framework.channel_messaging)}")

    print("\n✅ Strategic Alignment:")
    alignment = copy_output.strategic_alignment
    print(f"   Positioning Used: {alignment.positioning_used[:50]}...")
    print(f"   Key Messages Count: {alignment.key_messages_count}")
    print(f"   Deliverables: {alignment.deliverables}")

    print("\n🚦 Copy Readiness:")
    for channel, ready in copy_output.copy_readiness.items():
        status_icon = "✅" if ready else "❌"
        print(f"   {status_icon} {channel}: {ready}")

    # ========== STEP 6: WRITE TO STATE ==========
    print("\n[STEP 6] Writing to state...")
    print("-" * 80)

    copy_output_json = copy_output.model_dump_json(indent=2)

    state.copy_output = copy_output_json
    state.status = "copy_complete"

    print("✅ State updated:")
    print(f"   copy_output: {len(copy_output_json)} characters")
    print(f"   status: {state.status}")

    print("\n" + "=" * 80)
    print("✅ COPYWRITER AGENT COMPLETE")
    print("=" * 80)

    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("⚠️  This is the agent module file.")
    print("    To test the Copywriter Agent, run: python examples/run_copywriter.py")
    print("    To customize input, edit: examples/inputs/campaign_input.json")
    print("=" * 80)