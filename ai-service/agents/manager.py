"""
MANAGER AGENT - Campaign Orchestrator & Input Enricher

Role: Project Manager / Campaign Director

INPUT (From Frontend Form - 6 Fields):
  ✅ campaign_name: Name of the marketing campaign
  ✅ brand_name: Name of the brand being promoted
  ✅ industry: Industry sector (saas, ecommerce, finance, healthcare, other)
  ✅ primary_goal: Campaign goal (awareness, lead_gen, sales, retention)
  ✅ target_audience: Detailed description of target audience
  ✅ brand_voice: Tone style (professional, friendly, bold, luxury, casual, authoritative)

OUTPUT (8 Fields - JSON - for Research & Strategy):
  1. campaign_name: Campaign identifier
  2. brand_name: Brand identifier
  3. industry: Industry context for market/competitor data lookup (Research)
  4. primary_goal: Campaign goal for audience insights lookup (Research)
  5. target_audience: Audience description for pain point customization (Research & Strategy)
  6. brand_voice: Tone guidance for approach personalization (Research & Strategy)
  7. channels: Recommended distribution channels (LLM-generated based on industry/goal/audience)
  8. deliverables: Content/assets to create (LLM-generated based on goal/audience/voice)

WHAT MANAGER DOES:
1. Receives 6 form inputs from state
2. Uses LLM to analyze and generate strategic recommendations:
   - Analyzes industry + goal + audience → Recommends optimal channels
   - Analyzes goal + audience + voice → Recommends content deliverables
3. Returns clean JSON output (8 fields total)
4. Output is used by downstream agents (Research, Strategy, Copywriter)

KEY PRINCIPLE:
Manager = Strategic Analyzer (LLM-powered)
- Takes 6 inputs → LLM generates context-aware channels + deliverables
- No hardcoded mappings - fully dynamic AI recommendations
- Uses prompt template from utils/prompts/manager_prompt.txt
"""

import logging
logger = logging.getLogger(__name__)

import sys
from pathlib import Path
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
from schemas import ManagerOutput


# ==================== MANAGER AGENT FUNCTION ====================

def manager_agent(state: CampaignState) -> CampaignState:
    """
    Manager Agent - Campaign Orchestrator (LLM-Powered)
    
    Args:
        state: CampaignState object containing 6 input fields from form
    
    Returns:
        Modified state with manager_output (8 fields JSON) and status updated
    
    Process:
    1. Extract 6 inputs from state (campaign_name, brand_name, industry, primary_goal, target_audience, brand_voice)
    2. Load prompt template from utils/prompts/manager_prompt.txt
    3. Send to LLM for analysis and strategic recommendations
    4. Parse LLM response to get channels + deliverables
    5. Create 8-field JSON output
    6. Update state with output and mark status as complete
    """
    
    logger.info("\n" + "=" * 80)
    logger.info("🚀 MANAGER AGENT ACTIVATED")
    logger.info("=" * 80)
    
    # ========== STEP 1: READ INPUT FROM STATE ==========
    logger.info("\n[STEP 1] Reading input from state...")
    logger.info("-" * 80)
    
    campaign_name = state.campaign_name
    brand_name = state.brand_name
    industry = state.industry
    primary_goal = state.primary_goal
    target_audience = state.target_audience
    brand_voice = state.brand_voice
    
    logger.info(f"✓ Campaign Name: {campaign_name}")
    logger.info(f"✓ Brand Name: {brand_name}")
    logger.info(f"✓ Industry: {industry}")
    logger.info(f"✓ Primary Goal: {primary_goal}")
    logger.info(f"✓ Target Audience: {target_audience}")
    logger.info(f"✓ Brand Voice: {brand_voice}")
    logger.info(f"✓ Client Memory Context: {state.client_memory_context}")
    
    # ========== STEP 2: ANALYZE & PLAN USING LLM ==========
    logger.info("\n[STEP 2] Manager analyzing campaign parameters with LLM...")
    logger.info("-" * 80)
    logger.info("🧠 Manager thinking with AI...")
    
    # Initialize LLM client
    llm = get_llm_client(low_complexity=True)
    
    # Load prompt from manager_prompt.txt and format with campaign data
    prompt = load_prompt(
        "manager",
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brand_voice=brand_voice,
        client_memory_context=state.client_memory_context or "None provided"
    )
    
    logger.info("   Querying LLM with structured output...")
    
    # Cache-aware LLM call
    cache_key = make_key("Manager", prompt=prompt, temperature=0.7, max_tokens=500)
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("📦 Cache hit — using cached Manager response")
        plan = ManagerOutput(**cached)
    else:
        plan, state = safe_llm_call(
            state,
            "Manager",
            lambda: llm.generate_structured(prompt, ManagerOutput, temperature=0.7, max_tokens=500)
        )
        if plan is not None:
            cache_set(cache_key, plan.model_dump())
    
    if plan is None:
        return state  # Error already logged in state
    
    # ========== STEP 3: DISPLAY PLAN ==========
    logger.info("\n[STEP 3] Plan created by LLM!")
    logger.info("-" * 80)
    
    logger.info("✅ Plan created by LLM!")
    logger.info(f"   Campaign: {plan.campaign_name}")
    logger.info(f"   Channels: {', '.join(plan.channels)}")
    logger.info(f"   Deliverables: {', '.join(plan.deliverables)}")
    
    # ========== STEP 4: WRITE TO STATE ==========
    logger.info("\n[STEP 4] Writing to state...")
    logger.info("-" * 80)
    
    manager_output_json = plan.model_dump_json(indent=2)
    
    logger.info("Manager Output (JSON):")
    logger.info(manager_output_json)
    
    state.manager_output = manager_output_json
    state.status = "manager_complete"
    
    logger.info("✅ State updated:")
    logger.info(f"   manager_output: {state.manager_output[:200]}... (truncated)")
    logger.info(f"   status: {state.status}")
    
    logger.info("\n" + "=" * 80)
    logger.info("✅ MANAGER AGENT COMPLETE")
    logger.info("=" * 80)
    
    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("\n" + "="*80)
    logger.info("⚠️  This is the agent module file.")
    logger.info("    To test the Manager Agent, run: python examples/run_manager.py")
    logger.info("    To customize input, edit: examples/inputs/campaign_input.json")
    logger.info("="*80)
