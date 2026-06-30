"""
STRATEGY AGENT - Research-Driven Marketing Strategy Creator

Role: Strategic Planner

INPUT:
  FROM state.brief:
    ✅ brief: Original campaign context
  
  FROM research_output (5 fields):
    ✅ market_analysis: TAM, growth rate, market_trends
    ✅ competitor_analysis: Top competitors, differentiation_opportunity
    ✅ audience_insights: Pain points, motivations, preferred_channels
    ✅ market_opportunities: Industry growth opportunities
    ✅ recommended_approach: Strategic direction
  
  FROM manager_output (4 fields):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand identifier
    ✅ channels: Execution channels list
    ✅ deliverables: Content deliverables list

OUTPUT (Strategy JSON - 13 Fields):
  1. positioning: Brand positioning statement
  2. key_messages: 3-5 key campaign messages
  3. content_pillars: 3-5 content themes
  4. channel_strategy: Prioritized channel plans (Dict[str, ChannelPlan])
  5. audience_segments: 3+ audience segments with demographics/psychographics
  6. timeline: 4 campaign phases with dates (Dict[str, TimelinePhase])
  7. success_metrics: KPIs and targets (SuccessMetrics)
  8. competitive_differentiation: Competitive positioning (CompetitiveDifferentiation)
  9. market_opportunities: Tactical opportunities (List[str])
  10. strategic_approach: Overall strategic direction
  11. inferred_goal: Campaign goal type (awareness/lead_gen/sales/retention)
  12. research_foundation: Complete research data from Research Agent (ResearchFoundation)
  13. execution: Channels, deliverables, budget allocation (Execution)

KEY PRINCIPLE:
Strategy = LLM-Powered Strategic Planning
- Takes research insights → LLM creates comprehensive strategy
- No hardcoded logic - fully dynamic strategic thinking
- Uses prompt template from utils/prompts/strategy_prompt.txt
"""

import logging
logger = logging.getLogger(__name__)

import sys
from pathlib import Path
import json
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from llm import get_llm_client
from utils.prompt_loader import load_prompt
from utils.error_handler import safe_llm_call
from utils.llm_cache import make_key, get as cache_get, set as cache_set
from schemas import StrategyOutput, normalize_channel_list


# ==================== STRATEGY AGENT FUNCTION ====================

def strategy_agent(state: CampaignState) -> CampaignState:
    """
    Strategy Agent - Research-Driven Marketing Strategy (LLM-Powered)
    
    Args:
        state: CampaignState with research_output, manager_output, brief
    
    Returns:
        Modified state with strategy_output filled
    
    Process:
    1. Extract research insights and manager data
    2. Load strategy prompt template
    3. Send to LLM for comprehensive strategy development
    4. Parse LLM response to get complete strategy
    5. Add timeline with calculated dates
    6. Update state with strategy output
    """
    
    logger.info("\n" + "=" * 80)
    logger.info("📋 STRATEGY AGENT ACTIVATED")
    logger.info("=" * 80)
    
    # ========== STEP 1: READ RESEARCH OUTPUT ==========
    logger.info("\n[STEP 1] Reading research output...")
    logger.info("-" * 80)
    
    if not state.research_output:
        raise ValueError("research_output is required")
    
    try:
        research = json.loads(state.research_output)
    except Exception as e:
        raise ValueError(f"Failed to parse research_output: {e}")
    
    market_analysis = research.get("market_analysis", {})
    competitor_analysis = research.get("competitor_analysis", {})
    audience_insights = research.get("audience_insights", {})
    market_opportunities = research.get("market_opportunities", [])
    recommended_approach = research.get("recommended_approach", "")
    
    logger.info(f"✓ Market TAM: {market_analysis.get('total_addressable_market')}")
    logger.info(f"✓ Growth: {market_analysis.get('growth_rate')}")
    logger.info(f"✓ Competitors: {competitor_analysis.get('top_competitors')}")
    logger.info(f"✓ Differentiation: {competitor_analysis.get('differentiation_opportunity', '')[:50]}...")
    logger.info(f"✓ Audience Pain Points: {audience_insights.get('pain_points', [])[:2]}...")
    logger.info(f"✓ Recommended Approach: {recommended_approach[:60]}...")
    
    # ========== STEP 2: READ MANAGER OUTPUT ==========
    logger.info("\n[STEP 2] Reading manager output...")
    logger.info("-" * 80)
    
    try:
        manager = json.loads(state.manager_output)
    except Exception as e:
        raise ValueError(f"Failed to parse manager_output: {e}")
    
    campaign_name = manager.get("campaign_name", "Unknown Campaign")
    brand_name = manager.get("brand_name", "Unknown Brand")
    channels = normalize_channel_list(manager.get("channels", []))
    deliverables = manager.get("deliverables", [])
    brief = state.brief or "No brief provided"

    logger.info(f"✓ Campaign: {campaign_name}")
    logger.info(f"✓ Brand: {brand_name}")
    logger.info(f"✓ Channels: {', '.join(channels)}")
    logger.info(f"✓ Deliverables: {', '.join(deliverables)}")
    logger.info(f"✓ Brief: {brief[:60]}...")
    
    # ========== STEP 3: CREATE STRATEGY WITH LLM ==========
    logger.info("\n[STEP 3] Creating strategy with LLM...")
    logger.info("-" * 80)
    logger.info("🧠 Developing comprehensive marketing strategy with AI...")
    
    # Initialize LLM client
    llm = get_llm_client()
    
    # Format human revision feedback if strategy is targeted for revision
    is_human_revision = bool(state.human_feedback and state.human_revision_target == "strategy")
    human_feedback_section = ""
    if is_human_revision:
        existing_strategy_section = ""
        if state.strategy_output:
            existing_strategy_section = (
                "\n\nEXISTING STRATEGY (your previous output — preserve ALL unchanged fields exactly):\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"{state.strategy_output}\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            )
        human_feedback_section = (
            "\n" + "="*80 + "\n"
            "⚠️ HUMAN REVISION FEEDBACK — SURGICAL EDIT MODE:\n"
            "You are in REVISION mode. The user has requested a specific change below.\n"
            "CRITICAL REVISION RULES — MUST FOLLOW:\n"
            "  1. READ the user feedback carefully and identify ONLY which field(s) need changing.\n"
            "  2. ONLY modify the specific field(s) the user mentioned. Nothing else.\n"
            "  3. ALL other strategy fields MUST be copied exactly from EXISTING STRATEGY above.\n"
            "  4. Do NOT regenerate, rewrite, or improve unchanged fields.\n"
            "  5. Channels list must remain exactly the same as in EXISTING STRATEGY.\n"
            f"User Feedback: \"{state.human_feedback}\"\n"
            + "="*80
            + existing_strategy_section
        )

    # Load strategy prompt and format with data
    prompt = load_prompt(
        "strategy",
        campaign_name=campaign_name,
        brand_name=brand_name,
        brief=brief,
        channels=json.dumps(channels),
        deliverables=json.dumps(deliverables),
        market_analysis=json.dumps(market_analysis, indent=2),
        competitor_analysis=json.dumps(competitor_analysis, indent=2),
        audience_insights=json.dumps(audience_insights, indent=2),
        market_opportunities=json.dumps(market_opportunities, indent=2),
        recommended_approach=recommended_approach,
        human_feedback_section=human_feedback_section
    )
    
    logger.info("   Querying LLM with structured output...")

    # Revision runs: lower temperature prevents unnecessary field changes;
    # extra token budget handles the existing-strategy context
    revision_temperature = 0.3 if is_human_revision else 0.7
    revision_max_tokens = 6500 if is_human_revision else 5000

    if is_human_revision:
        logger.info(f"   [REVISION MODE] temperature={revision_temperature}, max_tokens={revision_max_tokens}")

    # Cache-aware LLM call
    cache_key = make_key("Strategy", prompt=prompt, temperature=revision_temperature, max_tokens=revision_max_tokens)
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("📦 Cache hit — using cached Strategy response")
        strategy_plan = StrategyOutput(**cached)
    else:
        strategy_plan, state = safe_llm_call(
            state,
            "Strategy",
            lambda: llm.generate_structured(prompt, StrategyOutput, temperature=revision_temperature, max_tokens=revision_max_tokens)
        )
        if strategy_plan is not None:
            cache_set(cache_key, strategy_plan.model_dump())
    
    if strategy_plan is None:
        return state  # Error already logged in state
    
    # ========== STEP 4: ENHANCE TIMELINE WITH DATES ==========
    logger.info("\n[STEP 4] Enhancing timeline with calculated dates...")
    logger.info("-" * 80)
    
    today = datetime.now()
    
    # Update timeline phases with actual dates if not provided by LLM
    if strategy_plan.timeline:
        timeline = strategy_plan.timeline
        
        # Get all phase keys from the timeline
        phase_keys = list(timeline.keys())
        logger.info(f"   Found {len(phase_keys)} phases: {phase_keys}")
        
        # Ensure we have exactly 4 phases
        phase_count = 0
        
        # Phase 1
        if "phase_1" in timeline:
            if not timeline["phase_1"].start_date:
                timeline["phase_1"].start_date = today.strftime("%d-%B-%Y")
            if not timeline["phase_1"].end_date:
                timeline["phase_1"].end_date = (today + timedelta(days=7)).strftime("%d-%B-%Y")
            phase_count += 1
        
        # Phase 2
        if "phase_2" in timeline:
            if not timeline["phase_2"].start_date:
                timeline["phase_2"].start_date = (today + timedelta(days=7)).strftime("%d-%B-%Y")
            if not timeline["phase_2"].end_date:
                timeline["phase_2"].end_date = (today + timedelta(days=14)).strftime("%d-%B-%Y")
            phase_count += 1
        
        # Phase 3
        if "phase_3" in timeline:
            if not timeline["phase_3"].start_date:
                timeline["phase_3"].start_date = (today + timedelta(days=14)).strftime("%d-%B-%Y")
            if not timeline["phase_3"].end_date:
                timeline["phase_3"].end_date = (today + timedelta(days=21)).strftime("%d-%B-%Y")
            phase_count += 1
        
        # Phase 4
        if "phase_4" in timeline:
            if not timeline["phase_4"].start_date:
                timeline["phase_4"].start_date = (today + timedelta(days=21)).strftime("%d-%B-%Y")
            if not timeline["phase_4"].end_date:
                timeline["phase_4"].end_date = (today + timedelta(days=28)).strftime("%d-%B-%Y")
            phase_count += 1
        
        logger.info(f"   ✓ Timeline dates set for {phase_count}/4 phases")
        
        # Print dates for verification
        for phase_key in sorted(phase_keys):
            phase = timeline[phase_key]
            logger.info(f"     {phase_key}: {phase.start_date} to {phase.end_date}")
    
    # ========== STEP 4B: FIX BUDGET ALLOCATION ==========
    logger.info("\n[STEP 4B] Ensuring budget allocation is complete...")
    logger.info("-" * 80)
    
    # Ensure execution and budget_allocation exist
    if strategy_plan.execution and strategy_plan.execution.budget_allocation:
        budget = strategy_plan.execution.budget_allocation
        
        # Fill in any missing fields with default values
        if not budget.high_priority_channels:
            budget.high_priority_channels = "40%"
        if not budget.medium_priority_channels:
            budget.medium_priority_channels = "30%"
        if not budget.content_creation:
            budget.content_creation = "20%"
        if not budget.community_management:
            budget.community_management = "10%"
        
        logger.info("   ✓ Budget allocation complete:")
        logger.info(f"     High Priority Channels: {budget.high_priority_channels}")
        logger.info(f"     Medium Priority Channels: {budget.medium_priority_channels}")
        logger.info(f"     Content Creation: {budget.content_creation}")
        logger.info(f"     Community Management: {budget.community_management}")
    
    # ========== STEP 5: DISPLAY STRATEGY SUMMARY ==========
    logger.info("\n[STEP 5] Strategy summary...")
    logger.info("-" * 80)
    logger.info("✅ Strategy created by LLM!")
    
    logger.info("\n📍 Positioning:")
    logger.info(f"   {strategy_plan.positioning}")
    
    logger.info(f"\n💬 Key Messages ({len(strategy_plan.key_messages)}):")
    for i, msg in enumerate(strategy_plan.key_messages[:2], 1):
        logger.info(f"   {i}. {msg}")
    
    logger.info(f"\n🎯 Content Pillars ({len(strategy_plan.content_pillars)}):")
    for pillar in strategy_plan.content_pillars[:2]:
        logger.info(f"   • {pillar}")
    
    logger.info("\n📊 Channel Strategy:")
    for channel, details in list(strategy_plan.channel_strategy.items())[:2]:
        logger.info(f"   {channel}: {details.priority} priority - {details.rationale[:40]}...")
    
    logger.info(f"\n👥 Audience Segments ({len(strategy_plan.audience_segments)}):")
    for seg in strategy_plan.audience_segments[:2]:
        logger.info(f"   • {seg.segment_name}")
    
    logger.info(f"\n🎯 Inferred Goal: {strategy_plan.inferred_goal}")
    
    # ========== STEP 6: WRITE TO STATE ==========
    logger.info("\n[STEP 6] Writing to state...")
    logger.info("-" * 80)
    
    strategy_output_json = strategy_plan.model_dump_json(indent=2)
    
    state.strategy_output = strategy_output_json
    state.status = "strategy_complete"
    
    logger.info("✅ State updated:")
    logger.info(f"   strategy_output: {len(strategy_output_json)} characters")
    logger.info(f"   status: {state.status}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ STRATEGY AGENT COMPLETE")
    logger.info("=" * 80)
    
    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("\n" + "="*80)
    logger.info("⚠️  This is the agent module file.")
    logger.info("    To test the Strategy Agent, run: python examples/run_strategy.py")
    logger.info("    To customize input, edit: examples/inputs/campaign_input.json")
    logger.info("="*80)
