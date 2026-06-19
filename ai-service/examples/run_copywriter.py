"""
Test Copywriter Agent with Campaign Input Data
Runs full pipeline: Manager -> Research -> Strategy -> Copywriter
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
from agents.copywriter import copywriter_agent


def main():
    # ========== LOAD CAMPAIGN INPUT ==========
    print("\n" + "=" * 100)
    print("📋 LOADING CAMPAIGN INPUT DATA")
    print("=" * 100)

    input_file = Path(__file__).parent / "inputs" / "campaign_input.json"

    with open(input_file, 'r') as f:
        campaign_data = json.load(f)

    print("\n✅ Campaign Input Loaded:")
    print(f"   Campaign Name: {campaign_data['campaign_name']}")
    print(f"   Brand:         {campaign_data['brand_name']}")
    print(f"   Industry:      {campaign_data['industry']}")
    print(f"   Goal:          {campaign_data['primary_goal']}")
    print(f"   Audience:      {campaign_data['target_audience']}")
    print(f"   Voice:         {campaign_data['brand_voice']}")

    # Create campaign state
    state = CampaignState(**campaign_data)
    state.brief = (
        f"Marketing campaign for {campaign_data['brand_name']} "
        f"targeting {campaign_data['target_audience']}"
    )

    # ========== STEP 1: MANAGER AGENT ==========
    print("\n" + "=" * 100)
    print("🚀 STEP 1: RUNNING MANAGER AGENT")
    print("=" * 100)

    state = manager_agent(state)

    manager_plan = json.loads(state.manager_output)
    print("\n✅ Manager Plan Created:")
    print(f"   Channels:      {', '.join(manager_plan['channels'])}")
    print(f"   Deliverables:  {', '.join(manager_plan['deliverables'])}")

    # ========== STEP 2: RESEARCH AGENT ==========
    print("\n" + "=" * 100)
    print("🔍 STEP 2: RUNNING RESEARCH AGENT")
    print("=" * 100)

    state = research_agent(state)

    research_output = json.loads(state.research_output)
    print("\n✅ Research Completed:")
    print(f"   Market TAM:      {research_output['market_analysis']['total_addressable_market']}")
    print(f"   Growth Rate:     {research_output['market_analysis']['growth_rate']}")
    print(f"   Top Competitors: {', '.join(research_output['competitor_analysis']['top_competitors'])}")
    print(f"   Pain Points:     {len(research_output['audience_insights']['pain_points'])} identified")
    print(f"   Motivations:     {len(research_output['audience_insights']['motivations'])} identified")

    # ========== STEP 3: STRATEGY AGENT ==========
    print("\n" + "=" * 100)
    print("📋 STEP 3: RUNNING STRATEGY AGENT")
    print("=" * 100)

    state = strategy_agent(state)

    strategy_output = json.loads(state.strategy_output)
    print("\n✅ Strategy Completed:")
    print(f"   Positioning:     {strategy_output['positioning'][:60]}...")
    print(f"   Key Messages:    {len(strategy_output['key_messages'])} messages")
    print(f"   Content Pillars: {len(strategy_output['content_pillars'])} pillars")
    print(f"   Audience Segs:   {len(strategy_output['audience_segments'])} segments")
    print(f"   Inferred Goal:   {strategy_output['inferred_goal']}")

    # ========== STEP 4: COPYWRITER AGENT ==========
    print("\n" + "=" * 100)
    print("✍️  STEP 4: RUNNING COPYWRITER AGENT")
    print("=" * 100)

    state = copywriter_agent(state)

    # ========== DISPLAY FINAL RESULTS ==========
    print("\n" + "=" * 100)
    print("📊 FINAL COPY OUTPUT")
    print("=" * 100)

    copy_output = json.loads(state.copy_output)
    manager_plan = json.loads(state.manager_output)
    channels = manager_plan.get('channels', [])

    print(f"\n✅ Copywriter Completed Successfully!")
    print(f"   Status: {state.status}")
    print(f"   Output Size: {len(state.copy_output)} characters")
    print(f"   Channels Generated: {', '.join(channels)}")

    # --- Display Copy for Each Channel ---
    for channel in channels:
        channel_key = channel.lower().replace(" ", "_")
        if channel_key in copy_output:
            print("\n" + "-" * 100)
            print(f"📝 {channel.upper()} COPY")
            print("-" * 100)
            channel_copy = copy_output[channel_key]
            
            # Display subject if it exists (for email)
            if "subject" in channel_copy:
                print(f"   Subject:       {channel_copy['subject']}")
            
            print(f"   Headline:      {channel_copy['headline']}")
            print(f"\n   Body:\n{channel_copy['body']}")
            print(f"\n   CTAs:")
            for cta_key, cta_val in channel_copy["ctas"].items():
                print(f"     [{cta_key}]: {cta_val}")

    # --- Messaging Framework ---
    print("\n" + "-" * 100)
    print("🏗️  MESSAGING FRAMEWORK")
    print("-" * 100)
    framework = copy_output["messaging_framework"]

    print(f"\n   Brand Promise:\n   {framework['brand_promise']}")

    print(f"\n   Message Hierarchy:")
    hierarchy = framework["message_hierarchy"]
    print(f"     Level 1 (Primary):    {hierarchy['level_1_primary']}")
    print(f"     Level 2 (Supporting):")
    for msg in hierarchy["level_2_supporting"]:
        print(f"       • {msg}")
    print(f"     Level 3 (Proof):")
    for proof in hierarchy["level_3_proof"]:
        print(f"       • {proof}")

    print(f"\n   Segment Messaging:")
    for seg_msg in framework["segment_messaging"]:
        print(f"     [{seg_msg['segment']}] (tone: {seg_msg['tone']})")
        print(f"       → {seg_msg['message']}")

    print(f"\n   Channel Messaging:")
    for ch_name, ch_details in framework["channel_messaging"].items():
        print(f"     {ch_name.upper()}:")
        print(f"       Tone:      {ch_details['tone']}")
        print(f"       Themes:    {', '.join(ch_details['themes'])}")
        print(f"       Frequency: {ch_details['frequency']}")
        print(f"       Format:    {ch_details['format']}")

    print(f"\n   Voice Guidelines ({copy_output['inferred_goal'].upper()} campaign):")
    print(f"     DO:")
    for do_item in framework["voice_guidelines"]["do"]:
        print(f"       ✓ {do_item}")
    print(f"     DON'T:")
    for dont_item in framework["voice_guidelines"]["dont"]:
        print(f"       ✗ {dont_item}")

    print(f"\n   Messaging Principles:")
    for i, principle in enumerate(framework["messaging_principles"], 1):
        print(f"     {i}. {principle}")

    # --- Strategic Alignment ---
    print("\n" + "-" * 100)
    print("✅ STRATEGIC ALIGNMENT")
    print("-" * 100)
    alignment = copy_output["strategic_alignment"]
    print(f"   Positioning Used:        {alignment['positioning_used']}")
    print(f"   Key Messages Count:      {alignment['key_messages_count']}")
    print(f"   Content Pillars Count:   {alignment['content_pillars_count']}")
    print(f"   Audience Segments Count: {alignment['audience_segments_count']}")
    print(f"   Deliverables:")
    for d in alignment["deliverables"]:
        print(f"     • {d}")

    # --- Copy Readiness ---
    print("\n" + "-" * 100)
    print("🚦 COPY READINESS")
    print("-" * 100)
    readiness = copy_output["copy_readiness"]
    for flag, status in readiness.items():
        icon = "✅" if status else "❌"
        print(f"   {icon} {flag}: {status}")

    # --- Inferred Goal ---
    print("\n" + "-" * 100)
    print(f"🎯 INFERRED GOAL: {copy_output['inferred_goal'].upper()}")
    print("-" * 100)

    # --- Full JSON Output ---
    print("\n" + "-" * 100)
    print("💾 FULL COPY OUTPUT (JSON)")
    print("-" * 100)
    print(json.dumps(copy_output, indent=2))

    print("\n" + "=" * 100)
    print("✅ COPYWRITER AGENT COMPLETED - ALL COPY GENERATED BY LLM BASED ON STRATEGY + RESEARCH")
    print("=" * 100)


if __name__ == "__main__":
    main()
