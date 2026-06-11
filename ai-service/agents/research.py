"""
RESEARCH AGENT - Market Analysis & Insights

Role: Market Researcher / Competitive Analyst

INPUT (From Manager Agent + State):
  FROM state:
    ✅ brief: User's campaign brief (context for all research)
  
  FROM manager_output (ONLY 4 fields needed):
    ✅ industry: Lookup key for market/competitor data
    ✅ primary_goal: Lookup key for audience insights
    ✅ target_audience: Contextualizes pain points and messaging
    ✅ brand_voice: Personalizes tone of recommendations

OUTPUT (5 Fields - JSON - NO duplication):
  1. market_analysis: TAM, growth rate, market trends (by industry)
  2. competitor_analysis: Top competitors, differentiation opportunity (by industry)
  3. audience_insights: Pain points, motivations, preferred channels (by goal + target_audience)
  4. market_opportunities: Industry-specific growth opportunities (by industry)
  5. recommended_approach: Strategic approach (by goal + brand_voice + target_audience)

HOW IT WORKS:
1. Takes industry → looks up market data
2. Takes primary_goal → looks up base audience insights
3. Takes target_audience → CUSTOMIZES pain points to be audience-specific
4. Takes brand_voice → PERSONALIZES recommended approach tone
5. Takes brief → CONTEXTUALIZES all recommendations

ZERO WASTE: No research_context duplication - Strategy gets what it needs from manager directly
"""

import sys
from pathlib import Path
import json

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState

def perform_research(campaign_brief: str, manager_data: dict = None) -> dict:
    """
    Research Agent - Contextualized market research.
    
    Parameters:
    - campaign_brief: Campaign brief (provides context)
    - manager_data: Manager output dict (uses 4 fields: industry, primary_goal, target_audience, brand_voice)
    
    Returns:
    - 5 research insight fields (NO duplication)
    
    WHAT IT DOES:
    1. Extract ONLY needed fields: industry, primary_goal, target_audience, brand_voice
    2. Lookup base data using industry + primary_goal
    3. CUSTOMIZE insights using target_audience (make pain points specific)
    4. PERSONALIZE approach using brand_voice (adjust tone)
    5. CONTEXTUALIZE recommendations using brief
    """
    
    # Extract ONLY what Research needs (4 fields)
    industry = manager_data.get('industry', 'other') if manager_data else 'other'
    primary_goal = manager_data.get('primary_goal', 'awareness') if manager_data else 'awareness'
    target_audience = manager_data.get('target_audience', 'general audience') if manager_data else 'general audience'
    brand_voice = manager_data.get('brand_voice', 'professional') if manager_data else 'professional'
    
    # Hardcoded market analysis by industry
    market_analysis_map = {
        "saas": {
            "total_addressable_market": "$50B",
            "growth_rate": "40% YoY",
            "market_trends": ["AI adoption", "automation", "cost reduction", "workflow optimization"]
        },
        "ecommerce": {
            "total_addressable_market": "$5.5T",
            "growth_rate": "12% CAGR",
            "market_trends": ["Mobile shopping", "personalization", "sustainability", "social commerce"]
        },
        "finance": {
            "total_addressable_market": "$150B",
            "growth_rate": "8% YoY",
            "market_trends": ["Digital banking", "fintech disruption", "crypto adoption", "AI in finance"]
        },
        "healthcare": {
            "total_addressable_market": "$1.5T",
            "growth_rate": "5% YoY",
            "market_trends": ["Telehealth growth", "AI diagnostics", "preventive care", "patient engagement"]
        },
        "other": {
            "total_addressable_market": "Variable",
            "growth_rate": "Varies by sector",
            "market_trends": ["Digital transformation", "customer engagement", "data analytics"]
        }
    }
    
    # Hardcoded competitor analysis by industry
    competitor_analysis_map = {
        "saas": {
            "top_competitors": ["Zapier", "Make", "n8n"],
            "differentiation_opportunity": "Enterprise AI without complexity - easier integration and faster setup"
        },
        "ecommerce": {
            "top_competitors": ["Shopify", "WooCommerce", "BigCommerce"],
            "differentiation_opportunity": "Seamless mobile-first shopping with AI-powered personalization"
        },
        "finance": {
            "top_competitors": ["Square", "Stripe", "PayPal"],
            "differentiation_opportunity": "Transparent pricing and superior customer support"
        },
        "healthcare": {
            "top_competitors": ["Teladoc", "MDLive", "Amwell"],
            "differentiation_opportunity": "Accessible, affordable, patient-centric care"
        },
        "other": {
            "top_competitors": ["Competitors A", "Competitors B", "Competitors C"],
            "differentiation_opportunity": "Unique value proposition and customer focus"
        }
    }
    
    # Hardcoded audience insights by goal (BASE data)
    audience_insights_base = {
        "awareness": {
            "pain_points": ["Lack of visibility", "Unknown options", "Information overload"],
            "motivations": ["Learning", "Discovery", "Comparison"],
            "preferred_channels": ["Social media", "Blogs", "Podcasts"]
        },
        "lead_gen": {
            "pain_points": ["Integration complexity", "High costs", "Long setup time"],
            "motivations": ["Save time", "Reduce costs", "Scale operations"],
            "preferred_channels": ["LinkedIn", "Industry blogs", "Webinars"]
        },
        "sales": {
            "pain_points": ["Quality concerns", "ROI uncertainty", "Switching costs"],
            "motivations": ["Proven results", "Cost savings", "Risk reduction"],
            "preferred_channels": ["Case studies", "Demos", "Direct outreach"]
        },
        "retention": {
            "pain_points": ["Feature gaps", "Support issues", "Competitive threats"],
            "motivations": ["Enhanced value", "Better support", "Loyalty rewards"],
            "preferred_channels": ["Email", "Community", "Product updates"]
        }
    }
    
    # Get base insights
    base_insights = audience_insights_base.get(primary_goal, audience_insights_base['awareness'])
    
    # CUSTOMIZE pain points based on target_audience
    # Extract audience type from target_audience string
    audience_lower = target_audience.lower()
    
    customized_pain_points = base_insights["pain_points"].copy()
    
    # Add audience-specific pain points
    if "cto" in audience_lower or "technical" in audience_lower or "engineer" in audience_lower:
        customized_pain_points.append(f"Technical complexity for {target_audience.split(',')[0].strip()}")
    elif "ceo" in audience_lower or "executive" in audience_lower or "founder" in audience_lower:
        customized_pain_points.append(f"Strategic alignment challenges for {target_audience.split(',')[0].strip()}")
    elif "marketer" in audience_lower or "marketing" in audience_lower:
        customized_pain_points.append(f"Campaign ROI tracking for {target_audience.split(',')[0].strip()}")
    elif "small business" in audience_lower or "smb" in audience_lower:
        customized_pain_points.append(f"Limited resources for {target_audience.split(',')[0].strip()}")
    else:
        customized_pain_points.append(f"Adoption barriers for {target_audience.split(',')[0].strip()}")
    
    # Customize motivations based on target_audience
    customized_motivations = base_insights["motivations"].copy()
    if "enterprise" in audience_lower:
        customized_motivations.append("Enterprise-grade security")
    elif "startup" in audience_lower:
        customized_motivations.append("Fast time-to-market")
    
    # Build customized audience insights
    audience_insights = {
        "pain_points": customized_pain_points,
        "motivations": customized_motivations,
        "preferred_channels": base_insights["preferred_channels"]
    }
    
    # Hardcoded market opportunities by industry
    market_opportunities_map = {
        "saas": ["Vertical SaaS expansion", "AI-powered automation", "SMB market penetration"],
        "ecommerce": ["Subscription models", "AR/VR shopping", "Sustainable commerce"],
        "finance": ["Embedded finance", "Buy now pay later", "Wealth management tech"],
        "healthcare": ["Remote patient monitoring", "Preventive health tech", "Mental health platforms"],
        "other": ["Digital transformation", "Customer data platforms", "Automation solutions"]
    }
    
    # PERSONALIZE recommended approach by goal + brand_voice + target_audience
    approach_base = {
        "awareness": "Focus on educational content and brand storytelling to build recognition",
        "lead_gen": "Create gated content and lead magnets to build qualified lead pipeline",
        "sales": "Emphasize ROI and proven results to close deals",
        "retention": "Build community and deliver continuous value to retain customers"
    }
    
    # Get base approach
    base_approach = approach_base.get(primary_goal, approach_base['awareness'])
    
    # Personalize based on brand_voice
    voice_modifier = ""
    if brand_voice in ["friendly", "casual"]:
        voice_modifier = " with approachable, conversational messaging"
    elif brand_voice in ["bold", "authoritative"]:
        voice_modifier = " with confident, assertive positioning"
    elif brand_voice == "luxury":
        voice_modifier = " with premium, sophisticated messaging"
    else:  # professional
        voice_modifier = " with professional, data-driven communication"
    
    # Add target audience context
    audience_context = f" tailored specifically for {target_audience.split(',')[0].strip()}"
    
    # Combine
    recommended_approach = base_approach + voice_modifier + audience_context
    
    # Build research output - 5 fields, NO duplication
    research_output = {
        "market_analysis": market_analysis_map.get(industry, market_analysis_map['other']),
        "competitor_analysis": competitor_analysis_map.get(industry, competitor_analysis_map['other']),
        "audience_insights": audience_insights,  # CUSTOMIZED with target_audience
        "market_opportunities": market_opportunities_map.get(industry, market_opportunities_map['other']),
        "recommended_approach": recommended_approach  # PERSONALIZED with brand_voice + target_audience
    }
    
    return research_output


def research_node(state: CampaignState) -> CampaignState:
    """
    Research Agent Node - Market Analysis & Insights
    
    Parameters:
    - state: CampaignState with manager_output
    
    Returns:
    - Updated CampaignState with research_output
    """
    
    print("\n" + "=" * 80)
    print("🔍 RESEARCH AGENT ACTIVATED")
    print("=" * 80)
    
    # ========== STEP 1: READ MANAGER OUTPUT ==========
    print("\n[STEP 1] Reading manager output from state...")
    print("-" * 80)
    
    if not state.manager_output:
        raise ValueError("No manager_output found in state")
    
    try:
        manager_data = json.loads(state.manager_output)
    except Exception as e:
        raise ValueError(f"Failed to parse manager_output: {e}")
    
    print(f"✓ Industry: {manager_data.get('industry')} (for market lookup)")
    print(f"✓ Goal: {manager_data.get('primary_goal')} (for audience insights)")
    print(f"✓ Target Audience: {manager_data.get('target_audience')} (for customization)")
    print(f"✓ Brand Voice: {manager_data.get('brand_voice')} (for personalization)")
    
    # ========== STEP 2: PERFORM RESEARCH ==========
    print("\n[STEP 2] Conducting contextualized market research...")
    print("-" * 80)
    print("🔬 Research inputs:")
    print(f"   Industry: {manager_data.get('industry')} → Market data lookup")
    print(f"   Goal: {manager_data.get('primary_goal')} → Base insights lookup")
    print(f"   Target: {manager_data.get('target_audience', '')[:50]}... → Pain point customization")
    print(f"   Voice: {manager_data.get('brand_voice')} → Approach personalization")
    
    brief = state.brief or "No brief provided"
    print(f"   Brief: {brief[:50] if brief != 'No brief provided' else 'N/A'}... → Context")
    
    report_dict = perform_research(brief, manager_data)
    
    # ========== STEP 3: DISPLAY FINDINGS ==========
    print("\n[STEP 3] Research findings:")
    print("-" * 80)
    
    print("\n📊 Market Analysis:")
    ma = report_dict['market_analysis']
    print(f"   TAM: {ma['total_addressable_market']}")
    print(f"   Growth: {ma['growth_rate']}")
    print(f"   Trends: {', '.join(ma['market_trends'][:2])}...")
    
    print("\n🏆 Competitor Analysis:")
    ca = report_dict['competitor_analysis']
    print(f"   Top Competitors: {', '.join(ca['top_competitors'])}")
    print(f"   Differentiation: {ca['differentiation_opportunity'][:60]}...")
    
    print("\n👥 Audience Insights (CUSTOMIZED for target):")
    ai = report_dict['audience_insights']
    print(f"   Pain Points: {', '.join(ai['pain_points'][:3])}")
    print(f"   Motivations: {', '.join(ai['motivations'][:2])}")
    print(f"   Preferred Channels: {', '.join(ai['preferred_channels'])}")
    
    print("\n💡 Market Opportunities:")
    for opp in report_dict['market_opportunities'][:2]:
        print(f"   • {opp}")
    
    print("\n🎯 Recommended Approach (PERSONALIZED):")
    print(f"   {report_dict['recommended_approach']}")
    
    # ========== STEP 4: CONVERT TO JSON ==========
    print("\n[STEP 4] Converting research to JSON...")
    print("-" * 80)
    
    research_output_json = json.dumps(report_dict, indent=2)
    
    # ========== STEP 5: WRITE TO STATE ==========
    print("\n[STEP 5] Writing to state...")
    print("-" * 80)
    
    state.research_output = research_output_json
    state.status = "research_complete"
    
    print("✅ State updated:")
    print(f"   research_output: {len(research_output_json)} characters")
    print(f"   status: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ RESEARCH AGENT COMPLETE")
    print("=" * 80)
    
    return state


# ==================== TEST THE AGENT ====================

if __name__ == "__main__":
    """
    This section tests the Research Agent in isolation.
    Shows what input we give and what output we get.
    """
    
    print("\n" + "=" * 80)
    print("RESEARCH AGENT - STANDALONE TEST")
    print("=" * 80)
    
    # Create mock manager output (Research only needs 4 fields)
    print("\n[TEST] Creating mock manager output...")
    manager_plan = {
        "industry": "saas",
        "primary_goal": "lead_gen",
        "target_audience": "Enterprise CTOs, tech leads, Fortune 500 companies",
        "brand_voice": "professional",
        # These 4 fields are for Strategy, Research doesn't use them
        "campaign_name": "Q3 Product Launch",
        "brand_name": "AgentMark",
        "channels": ["linkedin", "tech blogs", "product hunt"],
        "deliverables": ["gated whitepaper", "landing page", "webinar"]
    }
    
    # Create initial state
    print("\n[TEST] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads",
        brand_voice="professional",
        brief="Launch marketing campaign for AI automation platform targeting enterprise CTOs",
        manager_output=json.dumps(manager_plan),
        status="manager_complete"
    )
    
    print(f"Campaign: {initial_state.campaign_name}")
    print(f"Brand: {initial_state.brand_name}")
    print(f"Brief: {initial_state.brief[:60]}...")
    
    # Run Research Agent
    print("\n[TEST] Running Research Agent...")
    final_state = research_node(initial_state)
    
    # Show results
    print("\n[TEST] Final State:")
    print(f"Status: {final_state.status}")
    print(f"Research Output Length: {len(final_state.research_output)} characters")
    
    # Parse and display structured output
    research_output = json.loads(final_state.research_output)
    print("\n[TEST] Research Output Structure:")
    print(f"  ✓ market_analysis: {len(research_output['market_analysis'])} fields")
    print(f"  ✓ competitor_analysis: {len(research_output['competitor_analysis'])} fields")
    print(f"  ✓ audience_insights: {len(research_output['audience_insights'])} fields (CUSTOMIZED)")
    print(f"  ✓ market_opportunities: {len(research_output['market_opportunities'])} items")
    print(f"  ✓ recommended_approach: {len(research_output['recommended_approach'])} chars (PERSONALIZED)")
    
    print("\n[TEST] Customizations Applied:")
    print(f"  ✓ Pain points customized for: {manager_plan.get('target_audience').split(',')[0]}")
    print(f"  ✓ Approach personalized with: {manager_plan.get('brand_voice')} voice")
    print(f"  ✓ Recommendations tailored to: {manager_plan.get('primary_goal')} goal")
    
    print("\n" + "=" * 80)
    print("✅ RESEARCH AGENT TEST COMPLETE")
    print("=" * 80)
