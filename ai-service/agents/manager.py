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
  7. channels: Recommended distribution channels (based on industry → Strategy & Copywriter)
  8. deliverables: Content/assets to create (based on goal → Strategy & Copywriter)

WHAT MANAGER DOES:
1. Receives 6 form inputs from frontend
2. Enriches with context-aware decisions:
   - Maps industry → channels (e.g., SaaS → LinkedIn, tech blogs)
   - Maps primary_goal → deliverables (e.g., lead_gen → whitepaper, landing page)
3. Creates clean JSON output (8 fields total)
4. Passes output to Research Agent

KEY PRINCIPLE:
Manager = Input Transformer
- Takes form inputs (6 fields) → Adds strategic context (channels + deliverables)
- No research or strategy decisions - just organizational logic
- Every output field is used by downstream agents (Research, Strategy, Copywriter)
"""

import sys
from pathlib import Path
import json

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


# ==================== MANAGER AGENT FUNCTION ====================

def manager_agent(state: CampaignState) -> CampaignState:
    """
    Manager Agent - Campaign Orchestrator
    
    Args:
        state: CampaignState object containing campaign details
    
    Returns:
        Modified state with manager_output filled
    
    STEP-BY-STEP EXPLANATION:
    
    Step 1: Extract input from state
    ────────────────────────────────
    We read the following 6 fields from the frontend form:
    - campaign_name: "Q3 Product Launch"
    - brand_name: "AgentMark"
    - industry: "saas"
    - primary_goal: "lead_gen"
    - target_audience: "CTOs, tech leads"
    - brand_voice: "professional"
    
    Step 2: Analyze the inputs
    ─────────────────────────
    Manager reads all parameters and understands:
    "This is a SaaS product launch for lead generation targeting CTOs with a professional tone."
    
    Step 3: Create a contextualized plan
    ────────────────────────────────────
    Manager decides channels, deliverables based on:
    - Industry (SaaS → LinkedIn, tech blogs, webinars)
    - Goal (Lead Gen → CTAs, forms, gated content)
    - Audience (CTOs → technical content, ROI focus)
    - Brand Voice (Professional → formal tone)
    
    Step 4: Output as JSON
    ──────────────────────
    Manager outputs a structured plan tailored to inputs:
    {
      "campaign_name": "Q3 Product Launch",
      "brand_name": "AgentMark",
      "industry": "saas",
      "primary_goal": "lead_gen",
      "objective": "Lead Gen for AgentMark",
      "channels": ["linkedin", "tech blogs", "product hunt"],
      "deliverables": ["gated whitepaper", "landing page", "webinar"],
      ...
    }
    
    Step 5: Update state
    ───────────────────
    Write to state.manager_output for next agents to read.
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
    
    # ========== STEP 2: ANALYZE & PLAN BASED ON INPUTS ==========
    print("\n[STEP 2] Manager analyzing campaign parameters...")
    print("-" * 80)
    print("🧠 Manager thinking:")
    print(f"   'Campaign: {campaign_name}'")
    print(f"   'Brand: {brand_name}'")
    print(f"   'Industry: {industry}'")
    print(f"   'Goal: {primary_goal}'")
    print(f"   'Audience: {target_audience}'")
    print(f"   'Tone: {brand_voice}'")
    print()
    print("   Creating contextual strategy based on inputs...")
    
    # ========== STEP 3: DETERMINE CHANNELS BASED ON INDUSTRY & GOAL ==========
    channels_map = {
        "saas": ["linkedin", "tech blogs", "product hunt", "startup newsletters"],
        "ecommerce": ["instagram", "tiktok", "facebook", "pinterest"],
        "finance": ["linkedin", "financial blogs", "podcasts", "webinars"],
        "healthcare": ["healthcare forums", "medical journals", "webinars", "conferences"],
        "other": ["linkedin", "social media", "email", "content marketing"]
    }
    
    goal_map = {
        "awareness": ["blog post", "social media", "video"],
        "lead_gen": ["gated whitepaper", "landing page", "webinar", "lead magnet"],
        "sales": ["case study", "demo video", "comparison guide", "pricing page"],
        "retention": ["email newsletter", "community post", "tutorial", "success story"]
    }
    
    selected_channels = channels_map.get(industry, channels_map["other"])
    deliverables = goal_map.get(primary_goal, goal_map["awareness"])
    
    # ========== STEP 4: CREATE STRUCTURED PLAN ==========
    print("\n[STEP 3] Manager creating contextualized plan...")
    print("-" * 80)
    
    # Create clean plan - ONLY what downstream agents need (8 fields, no waste)
    plan = {
        "campaign_name": campaign_name,
        "brand_name": brand_name,
        "industry": industry,
        "primary_goal": primary_goal,
        "target_audience": target_audience,
        "brand_voice": brand_voice,
        "channels": selected_channels,
        "deliverables": deliverables
    }
    
    print("✅ Plan created!")
    print(f"   Campaign: {plan['campaign_name']}")
    print(f"   Channels: {', '.join(plan['channels'])}")
    print(f"   Deliverables: {', '.join(plan['deliverables'])}")
    
    # ========== STEP 5: CONVERT TO JSON STRING ==========
    print("\n[STEP 4] Converting plan to JSON...")
    print("-" * 80)
    
    manager_output_json = json.dumps(plan, indent=2)
    
    print("Manager Output (JSON):")
    print(manager_output_json)
    
    # ========== STEP 6: WRITE TO STATE ==========
    print("\n[STEP 5] Writing to state...")
    print("-" * 80)
    
    state.manager_output = manager_output_json
    state.status = "manager_complete"
    
    print("✅ State updated:")
    print(f"   manager_output: {state.manager_output[:100]}... (truncated)")
    print(f"   status: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ MANAGER AGENT COMPLETE")
    print("=" * 80)
    
    return state


# ==================== TEST THE AGENT ====================

if __name__ == "__main__":
    """
    This section tests the Manager Agent in isolation.
    Shows what input we give and what output we get.
    """
    
    print("\n" + "=" * 80)
    print("MANAGER AGENT - STANDALONE TEST")
    print("=" * 80)
    
    # Create initial state with campaign details
    print("\n[TEST] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads, companies with 1000+ employees",
        brand_voice="professional"
    )
    
    print(f"Initial State Created:")
    print(f"  campaign_name: {initial_state.campaign_name}")
    print(f"  brand_name: {initial_state.brand_name}")
    print(f"  industry: {initial_state.industry}")
    print(f"  primary_goal: {initial_state.primary_goal}")
    print(f"  target_audience: {initial_state.target_audience}")
    print(f"  brand_voice: {initial_state.brand_voice}")
    
    # Run Manager Agent
    print("\n[TEST] Running Manager Agent...")
    final_state = manager_agent(initial_state)
    
    # Show results
    print("\n[TEST] Results:")
    print(f"Status: {final_state.status}")
    print(f"\nManager Output (what other agents will read):")
    print(final_state.manager_output)
    
    # Parse back to show structure
    print("\n[TEST] Parsed Manager Plan:")
    plan = json.loads(final_state.manager_output)
    for key, value in plan.items():
        print(f"  {key}: {value}")
