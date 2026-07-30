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


def _infer_goal(primary_goal: str | None, recommended_approach: str) -> str:
    text = f"{primary_goal or ''} {recommended_approach or ''}".lower()
    if any(term in text for term in ["retain", "retention", "renew", "community", "loyalty"]):
        return "retention"
    if any(term in text for term in ["sale", "sales", "close", "deal", "buy", "roi"]):
        return "sales"
    if any(term in text for term in ["lead", "pipeline", "gated", "webinar", "signup", "sign up"]):
        return "lead_gen"
    return "awareness"


def _write_fallback_strategy(
    state: CampaignState,
    campaign_name: str,
    brand_name: str,
    channels: list[str],
    deliverables: list[str],
    market_analysis: dict,
    competitor_analysis: dict,
    audience_insights: dict,
    market_opportunities: list,
    recommended_approach: str,
) -> CampaignState:
    """Write a deterministic research-grounded strategy when the LLM is unavailable."""
    preferred_channels = audience_insights.get("preferred_channels", []) or []
    normalized_preferred = normalize_channel_list(preferred_channels)
    final_channels = channels or normalized_preferred or ["linkedin", "email"]
    pain_points = audience_insights.get("pain_points", []) or ["unclear customer pain point"]
    motivations = audience_insights.get("motivations", []) or ["improve business outcomes"]
    market_trends = market_analysis.get("market_trends", []) or ["market education"]
    competitors = competitor_analysis.get("top_competitors", []) or ["category competitors"]
    differentiation = competitor_analysis.get("differentiation_opportunity", "clearer, faster customer value")
    inferred_goal = _infer_goal(state.primary_goal, recommended_approach)
    today = datetime.now()

    strategy = {
        "positioning": f"{brand_name} positions {campaign_name} around {differentiation} for {state.target_audience or 'the target audience'}.",
        "key_messages": [
            f"Solve {pain_points[0]} with a practical {brand_name} approach.",
            f"Help teams {motivations[0]} while reducing friction.",
            f"Stand apart from {competitors[0]} through {differentiation}.",
        ],
        "content_pillars": [
            f"{market_trends[0]} education",
            f"{pain_points[0]} solution guidance",
            f"{differentiation} proof points",
        ],
        "channel_strategy": {
            channel: {
                "priority": "HIGH" if channel in normalized_preferred or channel == "linkedin" else "MEDIUM",
                "rationale": f"Use {channel} to reach audiences interested in {', '.join(preferred_channels[:2]) or 'the campaign topic'}.",
                "content_types": deliverables[:2] or ["educational post", "case study"],
                "frequency": "2-3x per week",
                "success_metrics": ["engagement rate", "qualified leads", "conversion rate"],
            }
            for channel in final_channels
        },
        "audience_segments": [
            {
                "segment_name": "Primary decision makers",
                "demographics": state.target_audience or "Target buyers",
                "psychographics": motivations[0],
                "pain_points": pain_points[:3],
                "messaging_angle": f"Show how {brand_name} reduces {pain_points[0]}.",
            }
        ],
        "timeline": {
            f"phase_{idx}": {
                "phase_name": name,
                "start_date": (today + timedelta(days=(idx - 1) * 7)).strftime("%d-%B-%Y"),
                "end_date": (today + timedelta(days=idx * 7)).strftime("%d-%B-%Y"),
                "activities": activities,
            }
            for idx, (name, activities) in enumerate([
                ("Foundation", ["Finalize messaging", "Prepare core assets"]),
                ("Launch", ["Publish priority content", "Activate top channels"]),
                ("Optimize", ["Review early signals", "Refine creative"]),
                ("Scale", ["Expand best-performing channels", "Summarize results"]),
            ], 1)
        },
        "success_metrics": {
            "primary_kpi": "qualified leads" if inferred_goal == "lead_gen" else "campaign engagement",
            "secondary_kpis": ["reach", "click-through rate", "conversion rate"],
            "kpis": ["reach", "engagement", "leads", "conversion"],
            "targets": {"reach": "10,000+", "engagement": "5%+", "conversion": "2%+"},
        },
        "competitive_differentiation": {
            "competitors": competitors,
            "primary_differentiation": differentiation,
            "competitive_advantage": differentiation,
            "unique_value_proposition": f"{brand_name} helps audiences overcome {pain_points[0]} with {differentiation}.",
            "positioning_statement": f"{brand_name} is the practical choice for {differentiation}.",
        },
        "market_opportunities": market_opportunities or [differentiation],
        "strategic_approach": recommended_approach or f"Build demand through {final_channels[0]} and research-backed messaging.",
        "content_calendar": {
            "total_weeks": 4,
            "campaign_start_date": today.strftime("%d-%B-%Y"),
            "weeks": [
                {
                    "week_label": f"Week {idx}",
                    "week_start_date": (today + timedelta(days=(idx - 1) * 7)).strftime("%d-%B-%Y"),
                    "theme": theme,
                    "activities": [
                        {
                            "day": (today + timedelta(days=(idx - 1) * 7)).strftime("%A %Y-%m-%d"),
                            "channel": final_channels[0],
                            "content_type": "Post",
                            "description": f"Publish content about {theme.lower()} using the campaign positioning and research insights.",
                            "caption_hook": f"{theme}: make {pain_points[0]} easier to solve.",
                            "effort": "medium",
                            "quick_win": idx == 1,
                        }
                    ],
                }
                for idx, theme in enumerate(["Research-led education", "Pain point proof", "Differentiation", "Conversion push"], 1)
            ],
        },
        "inferred_goal": inferred_goal,
        "research_foundation": {
            "market_analysis": market_analysis,
            "competitor_analysis": competitor_analysis,
            "audience_insights": audience_insights,
            "market_opportunities": market_opportunities,
            "recommended_approach": recommended_approach,
        },
        "execution": {
            "channels": final_channels,
            "deliverables": deliverables or ["campaign content"],
            "budget_allocation": {
                "high_priority_channels": "40%",
                "medium_priority_channels": "30%",
                "content_creation": "20%",
                "community_management": "10%",
            },
        },
    }
    state.strategy_output = json.dumps(strategy, indent=2)
    state.status = "strategy_complete"
    state.error = None
    return state


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
    is_human_revision = bool(
        (state.human_feedback and state.human_revision_target == "strategy") or
        (state.status == "strategy_revision_required")
    )
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
        feedback_text = state.human_feedback or "AI Reviewer requested revision."
        human_feedback_section = (
            "\n" + "="*80 + "\n"
            "⚠️ HUMAN REVISION FEEDBACK — SURGICAL EDIT MODE:\n"
            "You are in REVISION mode. The user has requested a specific change below.\n"
            "CRITICAL REVISION RULES — MUST FOLLOW:\n"
            "  1. READ the user feedback carefully and identify ONLY which field(s) need changing.\n"
            "  2. ONLY modify the specific field(s) the user mentioned. Nothing else.\n"
            "  3. ALL other strategy fields MUST be copied exactly, word-for-word, from EXISTING STRATEGY above. Do not alter a single character of the unchanged fields.\n"
            "  4. Do NOT regenerate, rewrite, or improve unchanged fields.\n"
            "  5. Channels list must remain exactly the same as in EXISTING STRATEGY.\n"
            f"User Feedback: \"{feedback_text}\"\n"
            + "="*80
            + existing_strategy_section
        )

    brand_voice = manager.get("brand_voice") or getattr(state, "brand_voice", None) or "professional"
    industry = manager.get("industry") or getattr(state, "industry", None) or "other"
    primary_goal = manager.get("primary_goal") or getattr(state, "primary_goal", None) or "awareness"
    target_audience = manager.get("target_audience") or getattr(state, "target_audience", None) or "General target audience"
    additional_context = getattr(state, "client_memory_context", None) or "None (No additional context)"

    # Load strategy prompt and format with data
    from utils.prompt_loader import load_split_prompt
    system_prompt, prompt = load_split_prompt(
        "strategy",
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brief=brief,
        additional_context=additional_context,
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
    # higher token budget compensates for the extra existing-output context
    revision_temperature = 0.0 if is_human_revision else 0.7
    revision_max_tokens = 8192

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

    if is_human_revision and state.strategy_output and strategy_plan is not None:
        logger.info("\n[MERGE] Executing Semantic Delta Patching deep merge for Strategy...")
        try:
            from utils.delta_merger import deep_merge_dicts
            previous_dict = json.loads(state.strategy_output)
            merged_dict = deep_merge_dicts(previous_dict, strategy_plan.model_dump(exclude_none=True))
            strategy_plan = StrategyOutput(**merged_dict)
            logger.info("   ✅ Semantic Delta Patch merged cleanly over previous strategy_output")
        except Exception as exc:
            logger.warning(f"   ⚠️ Strategy delta merge warning: {exc} — preserving current strategy output")
    
    if strategy_plan is None:
        logger.info("   ⚠️ Strategy LLM unavailable — using research-grounded fallback strategy")
        # ✅ Clear error flag so downstream nodes (Copywriter, Image, Reviewer) don't skip
        state.error = None
        state.status = "strategy_complete"
        logger.info("   ✅ Fallback strategy ready — error flag cleared, pipeline will continue")
        return _write_fallback_strategy(
            state,
            campaign_name,
            brand_name,
            channels,
            deliverables,
            market_analysis,
            competitor_analysis,
            audience_insights,
            market_opportunities,
            recommended_approach,
        )
    
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
    
    # ========== STEP 4C: NORMALIZE SUCCESS METRICS TARGETS ==========
    if strategy_plan.success_metrics and strategy_plan.success_metrics.kpis:
        kpis = strategy_plan.success_metrics.kpis
        raw_targets = dict(strategy_plan.success_metrics.targets or {})
        norm = lambda s: s.lower().replace('_', ' ').replace('-', ' ').replace('/', ' ').replace('&', ' ').replace('(', '').replace(')', '').replace(' ', '')
        normalized = {}
        for kpi in kpis:
            nkpi = norm(kpi)
            match = next(
                (v for k, v in raw_targets.items()
                 if norm(k) == nkpi
                 or nkpi.startswith(norm(k))
                 or norm(k) in nkpi
                 or any(t for t in norm(k).split() if len(t) >= 3 and t in nkpi)),
                None
            )
            normalized[kpi] = match if match else "N/A"
        strategy_plan.success_metrics = strategy_plan.success_metrics.model_copy(update={"targets": normalized})
        logger.info(f"   ✓ success_metrics targets normalized: {normalized}")

    # ========== STEP 4D: ENSURE COMPETITORS IN COMPETITIVE DIFFERENTIATION ==========
    if strategy_plan.competitive_differentiation:
        if not strategy_plan.competitive_differentiation.competitors:
            res_comps = competitor_analysis.get("top_competitors", []) or [f"{industry} Competitors"]
            strategy_plan.competitive_differentiation.competitors = res_comps
            logger.info(f"   ✓ Added competitors from research foundation: {res_comps}")

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
    
    # Mutate CampaignIntelligenceObject (CIO) directly in state
    from utils.context.cta_registry import IndustryCTARegistry
    cio_dict = dict(state.campaign_intelligence_object or {})
    cio_dict["positioning_moat"] = strategy_plan.positioning or ""
    cio_dict["key_messages"] = strategy_plan.key_messages or []
    cio_dict["recommended_channels"] = channels or []
    stage = getattr(state, "buying_stage", None) or "consideration"
    cio_dict["stage_appropriate_cta"] = IndustryCTARegistry.get_ctas(industry, primary_goal, stage=stage)
    state.campaign_intelligence_object = cio_dict

    state.strategy_output = strategy_output_json
    state.status = "strategy_complete"
    
    logger.info("✅ State updated:")
    logger.info(f"   strategy_output: {len(strategy_output_json)} characters")
    logger.info(f"   campaign_intelligence_object updated with positioning moat & CTAs")
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
