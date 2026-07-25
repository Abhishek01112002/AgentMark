"""
Test Reviewer Agent with Campaign Input Data
Runs full pipeline: Manager -> Research -> Strategy -> Copywriter -> Image Prompt -> Reviewer
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

    # ========== STEP 4: COPYWRITER AGENT ==========
    print("\n" + "=" * 100)
    print("✍️  STEP 4: RUNNING COPYWRITER AGENT")
    print("=" * 100)

    state = copywriter_agent(state)

    copy_out = json.loads(state.copy_output)
    copy_channels = [
        k for k in copy_out.keys()
        if k not in ("inferred_goal", "messaging_framework", "strategic_alignment", "copy_readiness")
    ]
    print("\n✅ Copy Completed:")
    print(f"   Inferred Goal:   {copy_out['inferred_goal']}")
    print(f"   Channels:        {', '.join(copy_channels)}")

    # ========== STEP 5: IMAGE PROMPT AGENT ==========
    print("\n" + "=" * 100)
    print("🎨 STEP 5: RUNNING IMAGE PROMPT AGENT")
    print("=" * 100)

    state = image_prompt_agent(state)

    image_out = json.loads(state.image_output)
    print("\n✅ Image Prompts Completed:")
    print(f"   Total Prompts:   {len(image_out['image_prompts'])}")
    for p in image_out["image_prompts"]:
        print(f"   • {p['deliverable']} ({p['aspect_ratio']}) — {p['style']}")

    # ========== STEP 6: REVIEWER AGENT ==========
    print("\n" + "=" * 100)
    print("🔍 STEP 6: RUNNING REVIEWER AGENT")
    print("=" * 100)

    state = reviewer_agent(state)

    # ========== DISPLAY FINAL RESULTS ==========
    print("\n" + "=" * 100)
    print("📊 FINAL REVIEW OUTPUT")
    print("=" * 100)

    review_output = json.loads(state.review_output)

    print("\n✅ Reviewer Completed Successfully!")
    print(f"   Status:    {state.status}")
    print(f"   Next Step: {state.next_step}")

    # --- Overall Quality Score ---
    print("\n" + "-" * 100)
    print("📈 OVERALL QUALITY ASSESSMENT")
    print("-" * 100)

    overall = review_output.get("overall", {})
    quality_score = overall.get("quality_score", 0)
    approved = overall.get("approved", False)

    print(f"\n   Overall Quality Score: {quality_score}/100")
    print(f"   Approval Status:       {'✅ APPROVED' if approved else '❌ REVISION REQUIRED'}")
    print(f"   Individual Threshold:  {'✅ Met (≥75 each)' if overall.get('individual_threshold_met') else '❌ Not Met'}")
    print(f"   Overall Threshold:     {'✅ Met (≥80)' if overall.get('overall_threshold_met') else '❌ Not Met'}")

    print("\n   Summary:")
    print(f"   {overall.get('summary', 'N/A')}")

    print("\n   Campaign Strengths:")
    for strength in overall.get("strengths", []):
        print(f"     ✅ {strength}")

    print("\n   Critical Improvements:")
    for improvement in overall.get("critical_improvements", []):
        print(f"     ⚠️  {improvement}")

    if overall.get("revision_recommendation") and overall.get("revision_recommendation") != "none":
        print(f"\n   Revision Target: {overall.get('revision_recommendation').upper()}")
        print(f"   Reason: {overall.get('revision_reason', 'N/A')}")

    # --- Individual Agent Scores ---
    print("\n" + "-" * 100)
    print("📊 INDIVIDUAL AGENT SCORES")
    print("-" * 100)

    agent_configs = [
        ("research_review",  "🔍 RESEARCH AGENT",  "Research"),
        ("strategy_review",  "📋 STRATEGY AGENT",  "Strategy"),
        ("copy_review",      "✍️  COPYWRITER AGENT", "Copy"),
        ("image_review",     "🎨 IMAGE PROMPT AGENT", "Image"),
    ]

    for review_key, display_name, short_name in agent_configs:
        agent_review = review_output.get(review_key, {})
        agent_score = agent_review.get("score", 0)
        agent_approved = agent_review.get("approved", False)

        print(f"\n   {display_name}")
        print(f"   {'─' * 60}")
        print(f"   Score:    {agent_score}/100  {'✅ Approved' if agent_approved else '❌ Revision Needed'}")
        print(f"   Feedback: {agent_review.get('feedback', 'N/A')}")

        # Field scores
        field_scores = agent_review.get("field_scores", {})
        if field_scores:
            print("   Field Scores:")
            for field, fscore in field_scores.items():
                print(f"     • {field}: {fscore}")

        # Strengths
        strengths = agent_review.get("strengths", [])
        if strengths:
            print("   Strengths:")
            for s in strengths:
                print(f"     ✅ {s}")

        # Issues
        issues = agent_review.get("issues", [])
        if issues:
            print(f"   Issues Found ({len(issues)}):")
            for issue in issues:
                print(f"     ❌ {issue}")

        # Action items
        action_items = agent_review.get("action_items", [])
        if action_items:
            print("   Action Items:")
            for action in action_items:
                print(f"     🔧 {action}")

        # Cross-agent alignment
        alignment = agent_review.get("cross_agent_alignment", "")
        if alignment:
            print("   Cross-Agent Alignment:")
            print(f"     {alignment}")

    # --- Revision Feedback (if needed) ---
    if state.review_feedback:
        print("\n" + "-" * 100)
        print("⚠️  REVISION FEEDBACK")
        print("-" * 100)

        feedback = json.loads(state.review_feedback)
        print(f"\n   Agent Targeted:    {feedback.get('agent', 'N/A')}")
        print(f"   Status:            {feedback.get('status', 'N/A')}")
        print(f"   Reason:            {feedback.get('reason', 'N/A')}")
        print(f"   Revision Number:   {feedback.get('revision_number', 'N/A')}/{feedback.get('max_revisions', 3)}")
        print(f"   Next Step:         {feedback.get('next_step', 'N/A')}")

        print("\n   Issues to Fix:")
        for issue in feedback.get("issues", []):
            print(f"     ❌ {issue}")

        print("\n   Action Items:")
        for action in feedback.get("action_items", []):
            print(f"     🔧 {action}")

    # --- Revision Counts ---
    print("\n" + "-" * 100)
    print("🔄 REVISION HISTORY")
    print("-" * 100)

    print(f"\n   Research revisions:  {getattr(state, 'research_revision_count', 0)}/3")
    print(f"   Strategy revisions:  {getattr(state, 'strategy_revision_count', 0)}/3")
    print(f"   Copy revisions:      {getattr(state, 'copy_revision_count', 0)}/3")
    print(f"   Image revisions:     {getattr(state, 'image_revision_count', 0)}/3")

    # --- Pipeline Summary ---
    print("\n" + "-" * 100)
    print("📊 COMPLETE PIPELINE SUMMARY")
    print("-" * 100)

    print("\n   ✅ Manager:      Channels + Deliverables planned")
    print("   ✅ Research:     Market intelligence gathered")
    print("   ✅ Strategy:     Positioning + Key Messages defined")
    print(f"   ✅ Copywriter:   Channel copy generated for {len(copy_channels)} channels")
    print(f"   ✅ Image Prompt: {len(image_out['image_prompts'])} DALL-E 3 prompts generated")
    print(f"   ✅ Reviewer:     Quality analysis complete — Score: {quality_score}/100")
    print(f"\n   Final Status:   {state.status}")
    print(f"   Next Action:    {state.next_step}")

    # --- Full JSON Output ---
    print("\n" + "-" * 100)
    print("💾 FULL REVIEW OUTPUT (JSON)")
    print("-" * 100)
    print(json.dumps(review_output, indent=2))

    print("\n" + "=" * 100)
    print("✅ REVIEWER AGENT COMPLETED - QUALITY ANALYSIS DONE BY LLM ACROSS ALL 28 FIELDS")
    print("=" * 100)


if __name__ == "__main__":
    main()