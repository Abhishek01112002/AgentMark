"""
Test Image Prompt Agent with Campaign Input Data
Runs full pipeline: Manager -> Research -> Strategy -> Copywriter -> Image Prompt
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
from agents.image_prompt import image_prompt_agent


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
    print(f"   Deliverables:    {strategy_output.get('execution', {}).get('deliverables', [])}")

    # ========== STEP 4: COPYWRITER AGENT ==========
    print("\n" + "=" * 100)
    print("✍️  STEP 4: RUNNING COPYWRITER AGENT")
    print("=" * 100)

    state = copywriter_agent(state)

    copy_output = json.loads(state.copy_output)
    print("\n✅ Copy Completed:")
    print(f"   Inferred Goal:   {copy_output['inferred_goal']}")

    # Show which channel copy was generated
    channel_keys = [
        k for k in copy_output.keys()
        if k not in ("inferred_goal", "messaging_framework", "strategic_alignment", "copy_readiness")
    ]
    print(f"   Channels with copy: {', '.join(channel_keys)}")

    # ========== STEP 5: IMAGE PROMPT AGENT ==========
    print("\n" + "=" * 100)
    print("🎨 STEP 5: RUNNING IMAGE PROMPT AGENT")
    print("=" * 100)

    state = image_prompt_agent(state)

    # ========== DISPLAY FINAL RESULTS ==========
    print("\n" + "=" * 100)
    print("🖼️  FINAL IMAGE PROMPT OUTPUT")
    print("=" * 100)

    image_output = json.loads(state.image_output)

    print("\n✅ Image Prompt Agent Completed Successfully!")
    print(f"   Status: {state.status}")
    print(f"   Output Size: {len(state.image_output)} characters")
    print(f"   Total Prompts: {len(image_output.get('image_prompts', []))}")

    # --- Visual Direction ---
    print("\n" + "-" * 100)
    print("📐 VISUAL DIRECTION")
    print("-" * 100)
    print(f"\n{image_output['visual_direction']}")

    # --- Image Prompts ---
    print("\n" + "-" * 100)
    print(f"🖼️  IMAGE PROMPTS ({len(image_output['image_prompts'])} TOTAL)")
    print("-" * 100)

    for i, prompt_obj in enumerate(image_output["image_prompts"], 1):
        print(f"\n{'─' * 80}")
        print(f"  PROMPT {i}: {prompt_obj['deliverable'].upper()}")
        print(f"{'─' * 80}")

        print(f"\n  📏 Aspect Ratio:   {prompt_obj['aspect_ratio']}")
        print(f"  🎨 Style:          {prompt_obj['style']}")
        print(f"  🎨 Color Palette:  {prompt_obj['color_palette']}")

        # Text overlay
        text_overlay = prompt_obj.get("text_overlay", {})
        if isinstance(text_overlay, dict):
            print("\n  📝 Text Overlay:")
            print(f"     Headline:  {text_overlay.get('headline', 'N/A')}")
            print(f"     CTA:       {text_overlay.get('cta', 'N/A')}")
            print(f"     Placement: {text_overlay.get('placement', 'N/A')}")
        else:
            print(f"\n  📝 Text Overlay: {text_overlay}")

        # DALL-E Prompt
        print(f"\n  🤖 DALL-E 3 Prompt ({len(prompt_obj['prompt'])} chars):")
        # Display full prompt with word wrapping
        prompt_text = prompt_obj["prompt"]
        words = prompt_text.split()
        line = "     "
        for word in words:
            if len(line) + len(word) + 1 > 95:
                print(line)
                line = "     " + word + " "
            else:
                line += word + " "
        if line.strip():
            print(line)

    # --- Copy Alignment Summary ---
    print("\n" + "-" * 100)
    print("🔗 COPY-TO-VISUAL ALIGNMENT SUMMARY")
    print("-" * 100)

    copy_channels = [
        k for k in copy_output.keys()
        if k not in ("inferred_goal", "messaging_framework", "strategic_alignment", "copy_readiness")
    ]

    for channel in copy_channels:
        channel_copy = copy_output.get(channel, {})
        matching_prompts = [
            p for p in image_output["image_prompts"]
            if channel.lower() in p["deliverable"].lower()
        ]

        if matching_prompts:
            print(f"\n  ✅ {channel.upper()} — Copy ↔ Visual Aligned")
            headline = channel_copy.get("headline") or channel_copy.get("subject", "")
            print(f"     Copy Headline: {str(headline)[:60]}...")
            print(f"     Visual Prompt: {matching_prompts[0]['prompt'][:60]}...")
            text_overlay = matching_prompts[0].get("text_overlay", {})
            if isinstance(text_overlay, dict):
                print(f"     Text Overlay:  {text_overlay.get('headline', 'N/A')[:60]}...")
        else:
            print(f"\n  ℹ️  {channel.upper()} — Copy generated, no direct visual match")

    # --- Pipeline Summary ---
    print("\n" + "-" * 100)
    print("📊 PIPELINE SUMMARY")
    print("-" * 100)
    print("\n   ✅ Manager:      Channels + Deliverables planned")
    print("   ✅ Research:     Market intelligence gathered")
    print("   ✅ Strategy:     Positioning + Key Messages defined")
    print(f"   ✅ Copywriter:   Channel copy generated for {len(copy_channels)} channels")
    print(f"   ✅ Image Prompt: {len(image_output['image_prompts'])} DALL-E 3 prompts generated")
    print(f"\n   Final Status:   {state.status}")

    # --- Full JSON Output ---
    print("\n" + "-" * 100)
    print("💾 FULL IMAGE PROMPT OUTPUT (JSON)")
    print("-" * 100)
    print(json.dumps(image_output, indent=2))

    print("\n" + "=" * 100)
    print("✅ IMAGE PROMPT AGENT COMPLETED - ALL PROMPTS GENERATED BY LLM BASED ON STRATEGY + COPY")
    print("=" * 100)


if __name__ == "__main__":
    main()