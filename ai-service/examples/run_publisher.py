"""
Test Publisher Agent with Campaign Input Data
Runs full pipeline: Manager -> Research -> Strategy -> Copywriter -> Image Prompt -> Reviewer -> Publisher
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
from agents.reviewer import reviewer_agent
from agents.publisher import publisher_agent


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
    print(f"   Channels:     {', '.join(manager_plan['channels'])}")
    print(f"   Deliverables: {', '.join(manager_plan['deliverables'])}")

    # ========== STEP 2: RESEARCH AGENT ==========
    print("\n" + "=" * 100)
    print("🔍 STEP 2: RUNNING RESEARCH AGENT")
    print("=" * 100)

    state = research_agent(state)

    research_out = json.loads(state.research_output)
    print("\n✅ Research Completed:")
    print(f"   Market TAM:      {research_out['market_analysis']['total_addressable_market']}")
    print(f"   Growth Rate:     {research_out['market_analysis']['growth_rate']}")
    print(f"   Top Competitors: {', '.join(research_out['competitor_analysis']['top_competitors'])}")
    print(f"   Pain Points:     {len(research_out['audience_insights']['pain_points'])} identified")

    # ========== STEP 3: STRATEGY AGENT ==========
    print("\n" + "=" * 100)
    print("📋 STEP 3: RUNNING STRATEGY AGENT")
    print("=" * 100)

    state = strategy_agent(state)

    strategy_out = json.loads(state.strategy_output)
    print("\n✅ Strategy Completed:")
    print(f"   Positioning:     {strategy_out['positioning'][:60]}...")
    print(f"   Key Messages:    {len(strategy_out['key_messages'])} messages")
    print(f"   Content Pillars: {len(strategy_out['content_pillars'])} pillars")
    print(f"   Audience Segs:   {len(strategy_out['audience_segments'])} segments")
    print(f"   Inferred Goal:   {strategy_out['inferred_goal']}")
    print(f"   Deliverables:    {strategy_out.get('execution', {}).get('deliverables', [])}")

    # ========== STEP 4: COPYWRITER AGENT ==========
    print("\n" + "=" * 100)
    print("✍️  STEP 4: RUNNING COPYWRITER AGENT")
    print("=" * 100)

    state = copywriter_agent(state)

    copy_out = json.loads(state.copy_output)
    copy_channels = [
        k for k in copy_out.keys()
        if k not in ("inferred_goal", "messaging_framework",
                     "strategic_alignment", "copy_readiness")
    ]
    print("\n✅ Copy Completed:")
    print(f"   Inferred Goal:   {copy_out['inferred_goal']}")
    print(f"   Channels:        {', '.join(copy_channels)}")
    readiness = copy_out.get("copy_readiness", {})
    ready_count = sum(1 for v in readiness.values() if v is True)
    print(f"   Assets Ready:    {ready_count}/{len(readiness)}")

    # ========== STEP 5: IMAGE PROMPT AGENT ==========
    print("\n" + "=" * 100)
    print("🎨 STEP 5: RUNNING IMAGE PROMPT AGENT")
    print("=" * 100)

    state = image_prompt_agent(state)

    image_out = json.loads(state.image_output)
    print("\n✅ Image Prompts Completed:")
    print(f"   Total Prompts: {len(image_out['image_prompts'])}")
    for p in image_out["image_prompts"]:
        print(f"   • {p['deliverable']} ({p['aspect_ratio']}) — {p['style']}")

    # ========== STEP 6: REVIEWER AGENT ==========
    print("\n" + "=" * 100)
    print("🔍 STEP 6: RUNNING REVIEWER AGENT")
    print("=" * 100)

    state = reviewer_agent(state)

    review_out = json.loads(state.review_output)
    overall = review_out.get("overall", {})
    print("\n✅ Review Completed:")
    print(f"   Quality Score:  {overall.get('quality_score', 'N/A')}/100")
    print(f"   Status:         {review_out.get('status', 'N/A')}")
    print(f"   State Status:   {state.status}")
    print(f"   Next Step:      {state.next_step}")

    agent_scores = {
        "research": review_out.get("research_review", {}).get("score", "N/A"),
        "strategy": review_out.get("strategy_review", {}).get("score", "N/A"),
        "copy":     review_out.get("copy_review", {}).get("score", "N/A"),
        "image":    review_out.get("image_review", {}).get("score", "N/A"),
    }
    print(f"   Agent Scores:   {agent_scores}")

    # ========== STEP 7: PUBLISHER AGENT ==========
    print("\n" + "=" * 100)
    print("📢 STEP 7: RUNNING PUBLISHER AGENT")
    print("=" * 100)

    state = publisher_agent(state)

    # ========== DISPLAY FINAL RESULTS ==========
    print("\n" + "=" * 100)
    print("📊 FINAL PUBLISHER OUTPUT")
    print("=" * 100)

    pub_output = json.loads(state.publisher_output)

    print(f"\n✅ Publisher Completed Successfully!")
    print(f"   Status:    {state.status}")
    print(f"   Output Size: {len(state.publisher_output)} characters")

    # --- Publishing Decision ---
    print("\n" + "-" * 100)
    print("📋 PUBLISHING DECISION")
    print("-" * 100)
    decision = pub_output["publishing_decision"]
    rationale = pub_output["decision_rationale"]
    decision_icon = "✅" if decision == "APPROVED_FOR_PUBLISHING" else (
        "⚠️" if decision == "REVISIONS_NEEDED" else "🚫"
    )
    print(f"\n   {decision_icon} Decision: {decision}")
    print(f"\n   Rationale:")
    print(f"   {rationale}")

    # --- Executive Summary ---
    print("\n" + "-" * 100)
    print("📝 EXECUTIVE SUMMARY")
    print("-" * 100)
    print(f"\n{pub_output['executive_summary']}")

    # --- Publishing Plan (Per Channel) ---
    print("\n" + "-" * 100)
    print(f"📊 PUBLISHING PLAN ({len(pub_output['publishing_plan'])} CHANNELS)")
    print("-" * 100)

    for ch_plan in pub_output["publishing_plan"]:
        priority = ch_plan.get("priority", "N/A")
        priority_icon = "🔴" if priority == "HIGH" else ("🟡" if priority == "MEDIUM" else "🟢")

        print(f"\n  {priority_icon} {ch_plan.get('channel', 'N/A').upper()}")
        print(f"  {'─' * 60}")
        print(f"  Priority:       {priority}")
        print(f"  Content Type:   {ch_plan.get('content_type', 'N/A')}")
        print(f"  Frequency:      {ch_plan.get('publish_frequency', 'N/A')}")
        print(f"  Timing:         {ch_plan.get('optimal_timing', 'N/A')}")
        print(f"  Copy Asset:     {ch_plan.get('copy_asset_used', 'N/A')}")
        print(f"  Visual Asset:   {ch_plan.get('visual_asset_used', 'N/A')}")
        print(f"  Launch Date:    {ch_plan.get('launch_date', 'N/A')}")
        print(f"  Status:         {ch_plan.get('status', 'N/A')}")
        print(f"  KPI Targets:")
        for kpi_name, kpi_val in ch_plan.get("kpi_targets", {}).items():
            print(f"    • {kpi_name}: {kpi_val}")

    # --- Content Calendar ---
    print("\n" + "-" * 100)
    print("📅 CONTENT CALENDAR")
    print("-" * 100)

    calendar = pub_output["content_calendar"]
    print(f"\n   Total Weeks:  {calendar.get('total_weeks', 'N/A')}")
    print(f"   Start Date:   {calendar.get('campaign_start_date', 'N/A')}")

    for week in calendar.get("weeks", []):
        print(f"\n   {'─' * 80}")
        week_label = week.get('week_label', f"Week {week.get('week_number', '')}")
        print(f"   📅 {week_label}")
        print(f"      Start: {week.get('week_start_date', 'N/A')}")
        if week.get("theme"):
            print(f"      Theme: {week.get('theme')}")
        print(f"      Activities ({len(week.get('activities', []))}):")
        for activity in week.get("activities", [])[:6]:  # Show max 6 per week
            day = activity.get('day', 'N/A')
            channel = activity['channel'].value.upper() if hasattr(activity.get('channel'), 'value') else activity.get('channel', 'N/A').upper()
            content_type = activity.get('content_type', 'N/A')
            description = activity.get('description', 'N/A')[:60]
            print(f"        [{day}] {channel} — {content_type}: {description}...")
        remaining = len(week.get("activities", [])) - 6
        if remaining > 0:
            print(f"        ... and {remaining} more activities")

    # --- Asset Checklist ---
    print("\n" + "-" * 100)
    print("📦 ASSET CHECKLIST")
    print("-" * 100)

    checklist = pub_output["asset_checklist"]

    print(f"\n   📝 Copy Assets ({len(checklist.get('copy_assets', []))}):")
    for asset in checklist.get("copy_assets", []):
        status_icon = "✅" if asset.get("status") == "READY" else "❌"
        print(f"   {status_icon} {asset.get('asset', 'N/A')}")
        if asset.get("headline") and asset.get("headline") != "N/A":
            print(f"      Headline: {str(asset.get('headline', ''))[:60]}...")
        if asset.get("notes"):
            print(f"      Notes: {asset.get('notes')}")

    print(f"\n   🖼️  Visual Assets ({len(checklist.get('visual_assets', []))}):")
    for asset in checklist.get("visual_assets", []):
        status_icon = "✅" if asset.get("status") == "READY" else "❌"
        print(f"   {status_icon} {asset.get('asset', 'N/A')} "
              f"({asset.get('aspect_ratio', 'N/A')}) — {asset.get('style', 'N/A')}")
        if asset.get("notes"):
            print(f"      Notes: {asset.get('notes')}")

    missing = checklist.get("missing_assets", [])
    if missing:
        print(f"\n   ⚠️  Missing Assets ({len(missing)}):")
        for m in missing:
            print(f"      ❌ {m}")
    else:
        print(f"\n   ✅ All deliverables have corresponding assets")

    # --- Projected Metrics ---
    print("\n" + "-" * 100)
    print("📈 PROJECTED METRICS")
    print("-" * 100)

    metrics = pub_output["projected_metrics"]
    print(f"\n   Total Reach:         {metrics.get('total_reach', 'N/A')}")
    print(f"   Lead Target:         {metrics.get('lead_target', 'N/A')}")
    print(f"   Estimated CTR:       {metrics.get('estimated_ctr', 'N/A')}")
    print(f"   Estimated Cost:      {metrics.get('estimated_cost', 'N/A')}")
    print(f"   ROI Projection:      {metrics.get('roi_projection', 'N/A')}")
    print(f"   Timeline to Results: {metrics.get('timeline_to_results', 'N/A')}")
    confidence = metrics.get("projection_confidence", "N/A")
    conf_icon = "🟢" if confidence == "HIGH" else ("🟡" if confidence == "MEDIUM" else "🔴")
    print(f"   Confidence:          {conf_icon} {confidence}")
    if metrics.get("confidence_explanation"):
        print(f"   Explanation:         {metrics.get('confidence_explanation')}")

    print(f"\n   Channel Breakdown:")
    for channel, contribution in metrics.get("channel_breakdown", {}).items():
        print(f"     • {channel.upper()}: {contribution}")

    # --- Pipeline Summary ---
    print("\n" + "-" * 100)
    print("📊 COMPLETE PIPELINE SUMMARY")
    print("-" * 100)

    print(f"\n   ✅ Manager:      Channels + Deliverables planned")
    print(f"   ✅ Research:     Market intelligence gathered")
    print(f"   ✅ Strategy:     Positioning + Messaging defined")
    print(f"   ✅ Copywriter:   Copy generated for {len(copy_channels)} channels")
    print(f"   ✅ Image Prompt: {len(image_out['image_prompts'])} DALL-E 3 prompts generated")
    print(f"   ✅ Reviewer:     Quality score: {overall.get('quality_score', 'N/A')}/100")
    print(f"   ✅ Publisher:    Decision: {decision}")
    print(f"\n   Final Status:   {state.status}")

    # --- Full JSON Output ---
    print("\n" + "-" * 100)
    print("💾 FULL PUBLISHER OUTPUT (JSON)")
    print("-" * 100)
    print(json.dumps(pub_output, indent=2))

    print("\n" + "=" * 100)
    print("✅ PUBLISHER AGENT COMPLETED - FULL CAMPAIGN PIPELINE EXECUTED SUCCESSFULLY")
    print("=" * 100)


if __name__ == "__main__":
    main()