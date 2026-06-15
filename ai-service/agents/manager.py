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
    
    print("\n" + "=" * 80)
    print("🚀 MANAGER AGENT ACTIVATED")
    print("=" * 80)
    
    # ========== STEP 1: READ INPUT FROM STATE ==========
    print("\n[STEP 1] Reading input from state...")
    print("-" * 80)
    
    campaign_name = state.campaign_name
    brand_name = state.brand_name
    industry = state.industry
    primary_goal = state.primary_goal
    target_audience = state.target_audience
    brand_voice = state.brand_voice
    
    print(f"✓ Campaign Name: {campaign_name}")
    print(f"✓ Brand Name: {brand_name}")
    print(f"✓ Industry: {industry}")
    print(f"✓ Primary Goal: {primary_goal}")
    print(f"✓ Target Audience: {target_audience}")
    print(f"✓ Brand Voice: {brand_voice}")
    
    # ========== STEP 2: ANALYZE & PLAN USING LLM ==========
    print("\n[STEP 2] Manager analyzing campaign parameters with LLM...")
    print("-" * 80)
    print("🧠 Manager thinking with AI...")
    
    # Initialize LLM client
    llm = get_llm_client()
    
    # Load prompt from manager_prompt.txt and format with campaign data
    prompt = load_prompt(
        "manager",
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brand_voice=brand_voice
    )
    
    print("   Querying LLM...")
    
    # Get LLM response
    llm_response = llm.generate(prompt, temperature=0.7, max_tokens=500)
    
    # ========== STEP 3: PARSE LLM RESPONSE ==========
    print("\n[STEP 3] Parsing LLM response...")
    print("-" * 80)
    
    # Extract JSON from response (handle potential markdown formatting)
    llm_response = llm_response.strip()
    if "```json" in llm_response:
        llm_response = llm_response.split("```json")[1].split("```")[0].strip()
    elif "```" in llm_response:
        llm_response = llm_response.split("```")[1].split("```")[0].strip()
    
    plan = json.loads(llm_response)
    
    print("✅ Plan created by LLM!")
    print(f"   Campaign: {plan['campaign_name']}")
    print(f"   Channels: {', '.join(plan['channels'])}")
    print(f"   Deliverables: {', '.join(plan['deliverables'])}")
    
    # ========== STEP 4: WRITE TO STATE ==========
    print("\n[STEP 4] Writing to state...")
    print("-" * 80)
    
    manager_output_json = json.dumps(plan, indent=2)
    
    print("Manager Output (JSON):")
    print(manager_output_json)
    
    state.manager_output = manager_output_json
    state.status = "manager_complete"
    
    print("✅ State updated:")
    print(f"   manager_output: {state.manager_output[:200]}... (truncated)")
    print(f"   status: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ MANAGER AGENT COMPLETE")
    print("=" * 80)
    
    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("⚠️  This is the agent module file.")
    print("    To test the Manager Agent, run: python examples/run_manager.py")
    print("    To customize input, edit: examples/inputs/campaign_input.json")
    print("="*80)
