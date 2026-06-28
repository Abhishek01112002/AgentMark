"""
Test Strategy Agent with Campaign Input Data
Runs full pipeline: Manager → Research → Strategy
"""

import sys
from pathlib import Path
from dotenv import load_dotenv
import json

load_dotenv()
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.manager import manager_agent
from agents.research import research_agent
from agents.strategy import strategy_agent


def main():
    # Read campaign input from JSON file
    print("\n" + "="*100)
    print("📋 LOADING CAMPAIGN INPUT DATA")
    print("="*100)
    
    input_file = Path(__file__).parent / "inputs" / "campaign_input.json"
    
    with open(input_file, 'r') as f:
        campaign_data = json.load(f)
    
    print("\n✅ Campaign Input Loaded:")
    print(f"   Campaign Name: {campaign_data['campaign_name']}")
    print(f"   Brand: {campaign_data['brand_name']}")
    print(f"   Industry: {campaign_data['industry']}")
    print(f"   Goal: {campaign_data['primary_goal']}")
    print(f"   Audience: {campaign_data['target_audience']}")
    print(f"   Voice: {campaign_data['brand_voice']}")
    
    # Create campaign state
    state = CampaignState(**campaign_data)
    state.brief = f"Marketing campaign for {campaign_data['brand_name']} targeting {campaign_data['target_audience']}"
    
    # ========== STEP 1: RUN MANAGER AGENT ==========
    print("\n" + "="*100)
    print("🚀 STEP 1: RUNNING MANAGER AGENT")
    print("="*100)
    
    state = manager_agent(state)
    
    manager_plan = json.loads(state.manager_output)
    print("\n✅ Manager Plan Created:")
    print(f"   Channels: {', '.join(manager_plan['channels'])}")
    print(f"   Deliverables: {', '.join(manager_plan['deliverables'])}")
    
    # ========== STEP 2: RUN RESEARCH AGENT ==========
    print("\n" + "="*100)
    print("🔍 STEP 2: RUNNING RESEARCH AGENT")
    print("="*100)
    
    state = research_agent(state)
    
    research_output = json.loads(state.research_output)
    print("\n✅ Research Completed:")
    print(f"   Market TAM: {research_output['market_analysis']['total_addressable_market']}")
    print(f"   Top Competitors: {', '.join(research_output['competitor_analysis']['top_competitors'])}")
    print(f"   Pain Points: {len(research_output['audience_insights']['pain_points'])} identified")
    
    # ========== STEP 3: RUN STRATEGY AGENT ==========
    print("\n" + "="*100)
    print("📋 STEP 3: RUNNING STRATEGY AGENT")
    print("="*100)
    
    state = strategy_agent(state)
    
    # Display Results
    print("\n" + "="*100)
    print("📊 FINAL STRATEGY RESULTS")
    print("="*100)
    
    strategy_output = json.loads(state.strategy_output)
    
    print("\n✅ Strategy Completed Successfully!")
    print(f"\nStatus: {state.status}")
    
    print("\n📍 POSITIONING:")
    print(f"   {strategy_output['positioning']}")
    
    print("\n💬 KEY MESSAGES:")
    for i, msg in enumerate(strategy_output['key_messages'], 1):
        print(f"   {i}. {msg}")
    
    print("\n🎯 CONTENT PILLARS:")
    for pillar in strategy_output['content_pillars']:
        print(f"   • {pillar}")
    
    print("\n📊 CHANNEL STRATEGY:")
    for channel, details in strategy_output['channel_strategy'].items():
        print(f"   {channel.upper()}:")
        print(f"     Priority: {details['priority']}")
        print(f"     Rationale: {details['rationale']}")
        print(f"     Frequency: {details['frequency']}")
        print(f"     Focus: {details['content_focus']}")
        print()
    
    print("👥 AUDIENCE SEGMENTS:")
    for seg in strategy_output['audience_segments']:
        print(f"   {seg['segment_name']}:")
        print(f"     Pain Point: {seg['pain_point']}")
        print(f"     Motivation: {seg['motivation']}")
        print(f"     Channels: {', '.join(seg['channels'])}")
        print()
    
    print("📅 TIMELINE:")
    for phase_key, phase in strategy_output['timeline'].items():
        print(f"   {phase['name']} ({phase['duration']}):")
        print(f"     {phase['start_date']} to {phase.get('end_date', 'Ongoing')}")
        print(f"     Focus: {phase['focus']}")
        print()
    
    print("📈 SUCCESS METRICS:")
    metrics = strategy_output['success_metrics']
    print(f"   Primary KPIs: {', '.join(metrics['primary'])}")
    print("   Targets:")
    for metric, target in metrics['targets'].items():
        print(f"     • {metric}: {target}")
    print(f"   Research Alignment: {metrics['research_alignment'][:80]}...")
    
    print("\n🏆 COMPETITIVE DIFFERENTIATION:")
    comp = strategy_output['competitive_differentiation']
    print(f"   Primary: {comp['primary_differentiation']}")
    print(f"   Competitors: {', '.join(comp['competitors'])}")
    print(f"   Advantage: {comp['competitive_advantage']}")
    
    print("\n💡 TACTICAL OPPORTUNITIES:")
    for opp in strategy_output['market_opportunities']:
        for key, value in opp.items():
            if key.startswith('opportunity'):
                print(f"   • {value}")
                print(f"     Execution: {opp['execution']}")
    
    print(f"\n🎯 INFERRED GOAL: {strategy_output['inferred_goal'].upper()}")
    
    print(f"\n💾 Full Strategy Output saved to state ({len(state.strategy_output)} characters)")
    
    print("\n" + "="*100)
    print("✅ STRATEGY AGENT COMPLETED - OUTPUT GENERATED BY LLM BASED ON RESEARCH")
    print("="*100)


if __name__ == "__main__":
    main()
