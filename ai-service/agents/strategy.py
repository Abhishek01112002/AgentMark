"""
STRATEGY AGENT - Research-Driven Marketing Strategy Creator

Role: Strategic Planner

INPUT (WHAT IT RECEIVES AND USES):
  
  1. FROM state.brief (1 field):
     ✅ brief: Original campaign context
  
  2. FROM research_output (5 fields - ALL USED - PRIMARY SOURCE):
     ✅ market_analysis: TAM, growth rate, market_trends
     ✅ competitor_analysis: Top competitors, differentiation_opportunity
     ✅ audience_insights: Pain points (customized), motivations, preferred_channels
     ✅ market_opportunities: Industry growth opportunities
     ✅ recommended_approach: Strategic direction (personalized with voice + audience)
  
  3. FROM manager_output (ONLY 4 fields used):
     ✅ campaign_name: Campaign identifier
     ✅ brand_name: Brand identifier
     ✅ channels: Execution channels list
     ✅ deliverables: Content deliverables list

TOTAL INPUT: 10 fields - ALL used, ZERO waste

OUTPUT (Comprehensive Strategy JSON):
  - positioning: From research.differentiation_opportunity
  - key_messages: From research.audience_insights (already personalized by Research)
  - content_pillars: From research.market_trends
  - channel_strategy: Prioritized by research.preferred_channels, validated against manager.channels
  - timeline: Generated with 4 phases
  - success_metrics: Aligned with goal inferred from research.recommended_approach
  - audience_segments: From research.audience_insights
  - competitive_differentiation: From research.competitor_analysis
  - inferred_goal: Extracted from research.recommended_approach
  - research_foundation: All 5 research fields for transparency
  - execution: manager.channels + manager.deliverables + budget_allocation

ARCHITECTURE PRINCIPLE:
Strategy is 100% RESEARCH-DRIVEN:
- Takes 5 research fields (already customized/personalized) → creates strategic decisions
- Takes 4 manager fields → adds execution context
- Infers goal by analyzing research.recommended_approach language
- NO duplication, NO waste

DATA FLOW:
Research insights (customized) → Strategic decisions → Execution plan
"""

import sys
from pathlib import Path
import json
from datetime import datetime, timedelta

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


# ==================== STRATEGY AGENT FUNCTION ====================

def strategy_agent(state: CampaignState) -> CampaignState:
    """
    Strategy Agent - Research-Driven Marketing Strategy Creator
    
    Args:
        state: CampaignState with research_output, manager_output, brief
    
    Returns:
        Modified state with strategy_output filled
    """
    
    print("\n" + "=" * 80)
    print("📋 STRATEGY AGENT ACTIVATED (Research-Driven)")
    print("=" * 80)
    
    # ========== STEP 1: READ RESEARCH OUTPUT (PRIMARY INPUT) ==========
    print("\n[STEP 1] Reading research output (PRIMARY decision source)...")
    print("-" * 80)
    
    # Parse research output - this is our PRIMARY input
    research = None
    if state.research_output:
        try:
            research = json.loads(state.research_output)
            print("✓ Research output found and parsed")
            print(f"   Fields: {list(research.keys())}")
        except (json.JSONDecodeError, TypeError):
            raise ValueError("research_output is required and must be valid JSON")
    else:
        raise ValueError("research_output is required - Strategy Agent needs Research insights")
    
    # Extract research insights (our strategic foundation - already customized)
    market_analysis = research.get("market_analysis", {})
    competitor_analysis = research.get("competitor_analysis", {})
    audience_insights = research.get("audience_insights", {})
    market_opportunities = research.get("market_opportunities", [])
    recommended_approach = research.get("recommended_approach", "")
    
    print(f"✓ Market TAM: {market_analysis.get('total_addressable_market')}")
    print(f"✓ Growth Rate: {market_analysis.get('growth_rate')}")
    print(f"✓ Competitors: {competitor_analysis.get('top_competitors')}")
    print(f"✓ Differentiation: {competitor_analysis.get('differentiation_opportunity', '')[:50]}...")
    print(f"✓ Audience Pain Points (customized): {audience_insights.get('pain_points')[:3]}")
    print(f"✓ Recommended Approach (personalized): {recommended_approach[:80]}...")
    
    # ========== STEP 2: READ MANAGER OUTPUT (METADATA ONLY) ==========
    print("\n[STEP 2] Reading manager output (metadata only)...")
    print("-" * 80)
    
    try:
        manager = json.loads(state.manager_output)
    except (json.JSONDecodeError, TypeError):
        raise ValueError("manager_output must be valid JSON")
    
    # Extract ONLY metadata for execution scope (NOT for strategic decisions)
    campaign_name = manager.get("campaign_name", "Unknown Campaign")
    brand_name = manager.get("brand_name", "Unknown Brand")
    channels = manager.get("channels", [])
    deliverables = manager.get("deliverables", [])
    
    print(f"✓ Campaign: {campaign_name}")
    print(f"✓ Brand: {brand_name}")
    print(f"✓ Execution Channels: {channels}")
    print(f"✓ Execution Deliverables: {deliverables}")
    
    # ========== STEP 3: READ BRIEF (CONTEXT) ==========
    brief = state.brief if state.brief else "Campaign brief not available"
    
    print(f"\n[STEP 3] Campaign context:")
    print("-" * 80)
    print(f"✓ Brief: {brief[:80]}...")
    
    # ========== STEP 4: CREATE POSITIONING (FROM RESEARCH) ==========
    print("\n[STEP 4] Creating positioning (from research differentiation)...")
    print("-" * 80)
    
    # Use research differentiation_opportunity for positioning
    differentiation = competitor_analysis.get("differentiation_opportunity", "")
    if differentiation:
        positioning = f"{brand_name} - {differentiation}"
        print(f"✅ Positioning (research-driven): {positioning}")
    else:
        # Fallback if research didn't provide differentiation
        positioning = f"{brand_name} - Leading innovation in the market"
        print(f"⚠️  Positioning (fallback): {positioning}")
    
    # ========== STEP 5: CREATE KEY MESSAGES (FROM RESEARCH) ==========
    print("\n[STEP 5] Creating key messages (from research insights)...")
    print("-" * 80)
    
    # Build messages from audience pain points and motivations (already personalized by Research)
    pain_points = audience_insights.get("pain_points", [])
    motivations = audience_insights.get("motivations", [])
    
    key_messages = []
    
    # Message 1: Address primary pain point (already customized for target audience by Research)
    if pain_points:
        key_messages.append(f"{brand_name} solves {pain_points[0].lower()} with proven results")
    
    # Message 2: Appeal to primary motivation
    if motivations:
        key_messages.append(f"{motivations[0]} with {brand_name} - trusted by industry leaders")
    
    # Message 3: Differentiation
    if differentiation:
        key_messages.append(f"Why {brand_name}? {differentiation}")
    
    # Fallback if research didn't provide enough data
    if len(key_messages) < 3:
        key_messages.append(f"Join successful companies using {brand_name}")
    
    print(f"✅ Key Messages (research-driven):")
    for i, msg in enumerate(key_messages, 1):
        print(f"   {i}. {msg}")
    
    # ========== STEP 6: DEFINE CONTENT PILLARS (FROM RESEARCH) ==========
    print("\n[STEP 6] Defining content pillars (from market trends)...")
    print("-" * 80)
    
    # Use market trends as content pillars
    market_trends = market_analysis.get("market_trends", [])
    
    if market_trends and len(market_trends) >= 3:
        content_pillars = [
            f"{market_trends[0]} insights",
            f"{market_trends[1]} strategies",
            f"{market_trends[2]} best practices",
            "Customer success stories"
        ]
    else:
        # Fallback
        content_pillars = [
            "Industry insights",
            "Customer success",
            "Product benefits",
            "Expert advice"
        ]
    
    print(f"✅ Content Pillars (research-driven):")
    for pillar in content_pillars:
        print(f"   • {pillar}")
    
    # ========== STEP 7: DEVELOP CHANNEL STRATEGY (FROM RESEARCH) ==========
    print("\n[STEP 7] Developing channel strategy (prioritized by research)...")
    print("-" * 80)
    
    # Get preferred channels from research
    preferred_channels = audience_insights.get("preferred_channels", [])
    print(f"✓ Research says audience prefers: {preferred_channels}")
    print(f"✓ Manager execution channels: {channels}")
    print(f"✓ Prioritizing channels based on research insights...")
    
    # Prioritize channels based on research insights
    channel_strategy = {}
    
    # Map research channel preferences to manager's execution channels
    research_channel_map = {
        "LinkedIn": "linkedin",
        "Industry blogs": "tech blogs",
        "Webinars": "webinars",
        "Social media": ["instagram", "facebook", "tiktok"],
        "Case studies": "tech blogs",
        "Demos": "product hunt",
        "Email": "email",
        "Community": "startup newsletters",
        "Blogs": "tech blogs",
        "Podcasts": "podcasts"
    }
    
    # Find which manager channels align with research preferences
    prioritized_channels = []
    for pref in preferred_channels:
        mapped = research_channel_map.get(pref)
        if mapped:
            if isinstance(mapped, list):
                prioritized_channels.extend([c for c in mapped if c in channels])
            elif mapped in channels:
                prioritized_channels.append(mapped)
    
    # Add remaining channels
    for channel in channels:
        if channel not in prioritized_channels:
            prioritized_channels.append(channel)
    
    # Check alignment between research and manager
    print(f"✅ Channel priority (research-aligned): {prioritized_channels}")
    
    # Create strategy for each channel
    for i, channel in enumerate(prioritized_channels):
        is_priority = i < len(preferred_channels)
        
        if channel == "linkedin":
            channel_strategy[channel] = {
                "priority": "HIGH" if is_priority else "MEDIUM",
                "rationale": "Audience prefers LinkedIn" if is_priority else "Professional network reach",
                "frequency": "4-5 posts per week" if is_priority else "2-3 posts per week",
                "content_focus": f"Address {pain_points[0] if pain_points else 'pain points'}"
            }
        elif channel in ["tech blogs", "blogs"]:
            channel_strategy[channel] = {
                "priority": "HIGH" if is_priority else "MEDIUM",
                "rationale": "Audience prefers industry content" if is_priority else "Thought leadership",
                "frequency": "2 posts per month" if is_priority else "1 post per month",
                "content_focus": f"Leverage trends: {', '.join(market_trends[:2]) if market_trends else 'industry insights'}"
            }
        elif channel == "instagram":
            channel_strategy[channel] = {
                "priority": "HIGH" if is_priority else "LOW",
                "rationale": "Visual engagement" if is_priority else "Brand awareness",
                "frequency": "5-7 posts per week" if is_priority else "3-4 posts per week",
                "content_focus": "Brand storytelling and customer success"
            }
        else:
            channel_strategy[channel] = {
                "priority": "MEDIUM",
                "rationale": "Additional reach",
                "frequency": "Regular posting",
                "content_focus": "Mixed content strategy"
            }
    
    print(f"✅ Channel strategies created for {len(channel_strategy)} channels")
    
    # ========== STEP 8: CREATE TIMELINE ==========
    print("\n[STEP 8] Creating campaign timeline...")
    print("-" * 80)
    
    today = datetime.now()
    timeline = {
        "phase_1": {
            "name": "Planning & Setup",
            "duration": "Week 1",
            "start_date": today.strftime("%Y-%m-%d"),
            "end_date": (today + timedelta(days=7)).strftime("%Y-%m-%d"),
            "focus": f"Align on {recommended_approach[:50]}..." if recommended_approach else "Campaign setup"
        },
        "phase_2": {
            "name": "Content Creation",
            "duration": "Week 2-3",
            "start_date": (today + timedelta(days=7)).strftime("%Y-%m-%d"),
            "end_date": (today + timedelta(days=21)).strftime("%Y-%m-%d"),
            "focus": f"Create content addressing {pain_points[0] if pain_points else 'audience needs'}"
        },
        "phase_3": {
            "name": "Launch & Execution",
            "duration": "Week 4-6",
            "start_date": (today + timedelta(days=21)).strftime("%Y-%m-%d"),
            "end_date": (today + timedelta(days=42)).strftime("%Y-%m-%d"),
            "focus": f"Execute via {', '.join(prioritized_channels[:3])}"
        },
        "phase_4": {
            "name": "Optimize & Scale",
            "duration": "Week 7+",
            "start_date": (today + timedelta(days=42)).strftime("%Y-%m-%d"),
            "focus": "Measure results and scale successful tactics"
        }
    }
    
    print("✅ Timeline created with 4 phases")
    
    # ========== STEP 9: DEFINE SUCCESS METRICS (ALIGNED WITH RESEARCH) ==========
    print("\n[STEP 9] Defining success metrics (aligned with research approach)...")
    print("-" * 80)
    
    # Infer goal from research recommended_approach language (research-driven)
    approach_lower = recommended_approach.lower()
    
    if any(word in approach_lower for word in ["awareness", "recognition", "visibility", "brand"]):
        inferred_goal = "awareness"
    elif any(word in approach_lower for word in ["lead", "pipeline", "gated", "webinar"]):
        inferred_goal = "lead_gen"
    elif any(word in approach_lower for word in ["roi", "revenue", "sales", "deals", "case study"]):
        inferred_goal = "sales"
    elif any(word in approach_lower for word in ["community", "support", "retention", "loyalty"]):
        inferred_goal = "retention"
    else:
        inferred_goal = "awareness"
    
    # Map inferred goal to metrics aligned with research insights
    if inferred_goal == "awareness":
        success_metrics = {
            "primary": ["Reach", "Impressions", "Engagement rate"],
            "targets": {
                "reach": f"100,000+ (based on TAM: {market_analysis.get('total_addressable_market')})",
                "engagement": "3-5% average",
                "sentiment": "Positive brand perception"
            },
            "research_alignment": f"Metrics support: {recommended_approach[:60]}..."
        }
    elif inferred_goal == "lead_gen":
        success_metrics = {
            "primary": ["Lead volume", "Lead quality score", "Conversion rate"],
            "targets": {
                "leads": "500+ qualified leads",
                "cost_per_lead": "$25-50",
                "conversion": "3-5% to SQL"
            },
            "research_alignment": f"Metrics support: {recommended_approach[:60]}..."
        }
    elif inferred_goal == "sales":
        success_metrics = {
            "primary": ["Revenue", "Deals closed", "ROI"],
            "targets": {
                "revenue": "$100,000+",
                "deals": "50+ closed",
                "roi": "3:1 minimum"
            },
            "research_alignment": f"Metrics support: {recommended_approach[:60]}..."
        }
    else:  # retention
        success_metrics = {
            "primary": ["Retention rate", "Engagement", "NPS"],
            "targets": {
                "retention": "90%+",
                "engagement": "Weekly active",
                "nps": "50+"
            },
            "research_alignment": f"Metrics support: {recommended_approach[:60]}..."
        }
    
    print(f"✅ KPIs defined: {success_metrics['primary']}")
    
    # ========== STEP 10: CREATE AUDIENCE SEGMENTS (FROM RESEARCH) ==========
    print("\n[STEP 10] Creating audience segments (from research insights)...")
    print("-" * 80)
    
    # Segment based on audience insights
    audience_segments = []
    
    if pain_points and motivations:
        audience_segments = [
            {
                "segment_name": "High-Intent Segment",
                "pain_point": pain_points[0] if pain_points else "Unknown",
                "motivation": motivations[0] if motivations else "Unknown",
                "messaging": key_messages[0],
                "channels": prioritized_channels[:2] if prioritized_channels else channels[:2]
            },
            {
                "segment_name": "Growth Segment",
                "pain_point": pain_points[1] if len(pain_points) > 1 else pain_points[0],
                "motivation": motivations[1] if len(motivations) > 1 else motivations[0],
                "messaging": key_messages[1] if len(key_messages) > 1 else key_messages[0],
                "channels": prioritized_channels[2:4] if len(prioritized_channels) > 2 else channels[2:4]
            },
            {
                "segment_name": "Awareness Segment",
                "pain_point": pain_points[2] if len(pain_points) > 2 else pain_points[0],
                "motivation": "Education and discovery",
                "messaging": key_messages[2] if len(key_messages) > 2 else key_messages[0],
                "channels": prioritized_channels[4:] if len(prioritized_channels) > 4 else channels
            }
        ]
    
    print(f"✅ Audience segments created: {len(audience_segments)}")
    
    # ========== STEP 11: BUILD COMPETITIVE DIFFERENTIATION (FROM RESEARCH) ==========
    print("\n[STEP 11] Building competitive strategy (from research analysis)...")
    print("-" * 80)
    
    top_competitors = competitor_analysis.get("top_competitors", [])
    
    competitive_differentiation = {
        "primary_differentiation": differentiation,
        "competitors": top_competitors,
        "competitive_advantage": f"While {', '.join(top_competitors[:2])} focus on complexity, {brand_name} delivers {differentiation.lower()}",
        "market_position": f"Target {market_analysis.get('total_addressable_market', 'growing market')} with {market_analysis.get('growth_rate', 'strong growth')}"
    }
    
    print(f"✅ Competitive strategy: {competitive_differentiation['primary_differentiation'][:60]}...")
    
    # ========== STEP 12: LEVERAGE MARKET OPPORTUNITIES ==========
    print("\n[STEP 12] Identifying tactical opportunities (from research)...")
    print("-" * 80)
    
    tactical_opportunities = []
    for i, opportunity in enumerate(market_opportunities[:3], 1):
        tactical_opportunities.append({
            f"opportunity_{i}": opportunity,
            "execution": f"Create content pillar around {opportunity}"
        })
    
    print(f"✅ Tactical opportunities identified: {len(tactical_opportunities)}")
    
    # ========== STEP 13: COMPILE STRATEGY PLAN ==========
    print("\n[STEP 13] Compiling research-driven strategy plan...")
    print("-" * 80)
    
    strategy_plan = {
        # Metadata
        "campaign_name": campaign_name,
        "brand_name": brand_name,
        "brief": brief,
        
        # Research-driven strategic decisions
        "positioning": positioning,
        "key_messages": key_messages,
        "content_pillars": content_pillars,
        "channel_strategy": channel_strategy,
        "audience_segments": audience_segments,
        "timeline": timeline,
        "success_metrics": success_metrics,
        "competitive_differentiation": competitive_differentiation,
        "market_opportunities": tactical_opportunities,
        "strategic_approach": recommended_approach,
        "inferred_goal": inferred_goal,
        
        # Research foundation (for transparency)
        "research_foundation": {
            "market_analysis": market_analysis,
            "competitor_analysis": competitor_analysis,
            "audience_insights": audience_insights,
            "market_opportunities": market_opportunities,
            "recommended_approach": recommended_approach
        },
        
        # Execution scope
        "execution": {
            "channels": channels,
            "deliverables": deliverables,
            "budget_allocation": {
                "high_priority_channels": "50%",
                "medium_priority_channels": "30%",
                "content_creation": "15%",
                "community_management": "5%"
            }
        }
    }
    
    print("✅ Strategy plan compiled (research-driven)!")
    print(f"   Inferred Goal: {inferred_goal} (from research approach)")
    print(f"   Positioning: {positioning}")
    print(f"   Key Messages: {len(key_messages)} (from research)")
    print(f"   Content Pillars: {len(content_pillars)}")
    print(f"   Prioritized Channels: {prioritized_channels}")
    
    # ========== STEP 14: CONVERT TO JSON STRING ==========
    print("\n[STEP 14] Converting strategy to JSON...")
    print("-" * 80)
    
    strategy_output_json = json.dumps(strategy_plan, indent=2)
    
    print("Strategy Output (JSON - First 500 chars):")
    print(strategy_output_json[:500] + "...\n")
    
    # ========== STEP 15: WRITE TO STATE ==========
    print("[STEP 15] Writing to state...")
    print("-" * 80)
    
    state.strategy_output = strategy_output_json
    state.status = "strategy_complete"
    
    print("✅ State updated:")
    print(f"   strategy_output: {len(state.strategy_output)} characters")
    print(f"   status: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ STRATEGY AGENT COMPLETE (Research-Driven)")
    print("=" * 80)
    
    return state


# ==================== TEST THE AGENT ====================

if __name__ == "__main__":
    """
    Test Strategy Agent with research-driven approach.
    """
    
    print("\n" + "=" * 80)
    print("STRATEGY AGENT - STANDALONE TEST")
    print("=" * 80)
    
    # Create manager output (8 fields - metadata only)
    print("\n[TEST] Creating manager output (metadata only)...")
    manager_plan = {
        "campaign_name": "Q3 Product Launch",
        "brand_name": "AgentMark",
        "industry": "saas",
        "primary_goal": "lead_gen",
        "target_audience": "Enterprise CTOs, tech leads",
        "brand_voice": "professional",
        "channels": ["linkedin", "tech blogs", "product hunt"],
        "deliverables": ["gated whitepaper", "landing page", "webinar"]
    }
    
    # Create research output (6 fields - strategic foundation)
    print("\n[TEST] Creating research output (strategic foundation)...")
    research_output = {
        "market_analysis": {
            "total_addressable_market": "$50B",
            "growth_rate": "40% YoY",
            "market_trends": ["AI adoption", "automation", "cost reduction", "productivity"]
        },
        "competitor_analysis": {
            "top_competitors": ["Zapier", "Make", "n8n"],
            "differentiation_opportunity": "Enterprise AI without complexity - easier integration and faster setup"
        },
        "audience_insights": {
            "pain_points": ["Integration complexity", "High costs", "Long setup time"],
            "motivations": ["Save time", "Reduce costs", "Scale operations"],
            "preferred_channels": ["LinkedIn", "Industry blogs", "Webinars"]
        },
        "market_opportunities": [
            "Vertical SaaS expansion",
            "AI-powered automation",
            "SMB market penetration"
        ],
        "recommended_approach": "Create gated content, webinars, and lead magnets to build qualified lead pipeline",

    }
    
    # Create state
    print("\n[TEST] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads",
        brand_voice="professional",
        brief="Launch marketing campaign for AI automation platform targeting enterprise CTOs"
    )
    
    initial_state.manager_output = json.dumps(manager_plan)
    initial_state.research_output = json.dumps(research_output)
    initial_state.status = "research_complete"
    
    print(f"✓ Campaign: {initial_state.campaign_name}")
    print(f"✓ Brief: {initial_state.brief[:60]}...")
    
    # Run Strategy Agent
    print("\n[TEST] Running Strategy Agent...")
    final_state = strategy_agent(initial_state)
    
    # Show results
    print("\n[TEST] Final State:")
    print(f"Status: {final_state.status}")
    print(f"Strategy Output Length: {len(final_state.strategy_output)} characters")
    
    # Parse and display key sections
    strategy = json.loads(final_state.strategy_output)
    
    print("\n[TEST] Strategy Output Structure:")
    print(f"  ✓ positioning: {strategy['positioning'][:60]}...")
    print(f"  ✓ key_messages: {len(strategy['key_messages'])} messages")
    print(f"  ✓ content_pillars: {len(strategy['content_pillars'])} pillars")
    print(f"  ✓ channel_strategy: {len(strategy['channel_strategy'])} channels")
    print(f"  ✓ audience_segments: {len(strategy['audience_segments'])} segments")
    print(f"  ✓ timeline: {len(strategy['timeline'])} phases")
    print(f"  ✓ success_metrics: {len(strategy['success_metrics'])} metric groups")
    print(f"  ✓ competitive_differentiation: included")
    print(f"  ✓ inferred_goal: {strategy['inferred_goal']}")
    
    print("\n" + "=" * 80)
    print("✅ STRATEGY AGENT TEST COMPLETE")
    print("=" * 80)
