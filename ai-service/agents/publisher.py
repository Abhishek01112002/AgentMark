"""
PUBLISHER AGENT - Campaign Distribution & Publishing Planner

Role: Senior Campaign Distribution Strategist

INPUT (From All Upstream Agents + State):
  FROM state (metadata - direct access):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand name
    ✅ industry: Industry sector
    ✅ primary_goal: Campaign goal
    ✅ target_audience: Audience description
    ✅ brand_voice: Tone and style

  FROM manager_output (REQUIRED - 2 fields):
    ✅ channels: Distribution channels list
    ✅ deliverables: Content deliverables list

  FROM strategy_output (REQUIRED - key fields):
    ✅ inferred_goal: awareness / lead_gen / sales / retention
    ✅ timeline: Campaign phases with dates
    ✅ success_metrics: KPIs aligned with goal
    ✅ channel_strategy: Per-channel strategic priorities
    ✅ execution.channels: Final channel list
    ✅ execution.deliverables: Final deliverables

  FROM copy_output (OPTIONAL - safe defaults if missing):
    ✅ copy_readiness: Per-channel readiness flags
    ✅ Channel copy blobs (headlines, CTAs per channel)

  FROM image_output (OPTIONAL - safe defaults if missing):
    ✅ visual_direction: Overall visual strategy
    ✅ image_prompts[].deliverable: Visual asset names
    ✅ image_prompts[].aspect_ratio: Aspect ratios

  FROM review_output (OPTIONAL - defaults to approved if missing):
    ✅ overall.quality_score: 0-100 score
    ✅ overall.approved: Approval status
    ✅ Per-agent reviews + issues

OUTPUT (publisher_output JSON):
  1. publishing_decision: APPROVED_FOR_PUBLISHING / REVISIONS_NEEDED / HOLD
  2. decision_rationale: Why this decision was made
  3. publishing_plan: Per-channel distribution plan with priority, timing, KPIs
  4. content_calendar: Week-by-week activity breakdown
  5. asset_checklist: Copy + visual asset readiness inventory
  6. projected_metrics: Reach, leads, CTR, cost, ROI estimates
  7. executive_summary: 3-5 sentence campaign overview

HOW IT WORKS:
1. Extract all upstream agent outputs from state
2. Load publisher prompt template
3. Send ALL context to LLM for comprehensive publishing plan generation
4. Parse LLM response to get complete distribution strategy
5. Update state with publisher_output and mark status as completed

KEY PRINCIPLE:
Publisher = LLM-Powered Distribution Strategist
- Takes all upstream outputs → LLM generates comprehensive publishing plan
- No hardcoded lookup tables or rule-based logic - fully dynamic AI planning
- Uses prompt template from utils/prompts/publisher_prompt.txt
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
from utils.error_handler import safe_llm_call
from schemas import PublisherOutput


# ==================== PUBLISHER AGENT FUNCTION ====================

def publisher_agent(state: CampaignState) -> CampaignState:
    """
    Publisher Agent - Campaign Distribution & Publishing Planner (LLM-Powered)

    Args:
        state: CampaignState with all upstream agent outputs

    Returns:
        Modified state with publisher_output (7 fields JSON) and status = 'completed'

    Process:
    1. Extract all upstream agent outputs (manager, strategy, copy, image, review)
    2. Extract campaign metadata from state
    3. Load publisher prompt template
    4. Send ALL context to LLM for publishing plan generation
    5. Parse LLM response to get complete distribution strategy
    6. Update state with publisher_output and mark status as completed
    """

    print("\n" + "=" * 80)
    print("📢 PUBLISHER AGENT ACTIVATED")
    print("=" * 80)

    # ========== STEP 1: READ MANAGER OUTPUT (REQUIRED) ==========
    print("\n[STEP 1] Reading manager output (channels + deliverables)...")
    print("-" * 80)

    if not state.manager_output:
        raise ValueError("manager_output is required - Publisher needs channel and deliverable definitions")

    try:
        manager_data = json.loads(state.manager_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse manager_output: {e}")

    channels = manager_data.get("channels", [])
    deliverables = manager_data.get("deliverables", [])

    print(f"✓ Channels:     {channels}")
    print(f"✓ Deliverables: {deliverables}")

    # ========== STEP 2: READ STRATEGY OUTPUT (REQUIRED) ==========
    print("\n[STEP 2] Reading strategy output (goal + timeline + metrics)...")
    print("-" * 80)

    if not state.strategy_output:
        raise ValueError("strategy_output is required - Publisher needs strategic foundation")

    try:
        strategy_data = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse strategy_output: {e}")

    inferred_goal = strategy_data.get("inferred_goal", state.primary_goal or "awareness")
    positioning = strategy_data.get("positioning", "")
    timeline = strategy_data.get("timeline", {})
    success_metrics = strategy_data.get("success_metrics", {})
    channel_strategy = strategy_data.get("channel_strategy", {})
    audience_segments = strategy_data.get("audience_segments", [])
    key_messages = strategy_data.get("key_messages", [])

    # Override channels/deliverables from strategy execution if available
    execution = strategy_data.get("execution", {})
    strategy_channels = execution.get("channels", [])
    strategy_deliverables = execution.get("deliverables", [])
    if strategy_channels:
        channels = strategy_channels
    if strategy_deliverables:
        deliverables = strategy_deliverables

    print(f"✓ Inferred Goal:     {inferred_goal}")
    print(f"✓ Positioning:       {positioning[:60]}...")
    print(f"✓ Timeline Phases:   {len(timeline)}")
    print(f"✓ Success Metrics:   {list(success_metrics.keys())[:3]}")
    print(f"✓ Channel Strategy:  {list(channel_strategy.keys())[:3]}")
    print(f"✓ Channels (final):  {channels}")
    print(f"✓ Deliverables:      {deliverables}")

    # ========== STEP 3: READ STATE METADATA ==========
    print("\n[STEP 3] Reading campaign metadata from state...")
    print("-" * 80)

    campaign_name = state.campaign_name or "Unnamed Campaign"
    brand_name = state.brand_name or "Unnamed Brand"
    industry = state.industry or "other"
    brand_voice = state.brand_voice or "professional"
    target_audience = state.target_audience or "General Audience"
    brief = state.brief or f"Marketing campaign for {brand_name}"

    print(f"✓ Campaign:       {campaign_name}")
    print(f"✓ Brand:          {brand_name}")
    print(f"✓ Industry:       {industry}")
    print(f"✓ Brand Voice:    {brand_voice}")
    print(f"✓ Target Audience:{target_audience[:60]}...")

    # ========== STEP 4: READ COPY OUTPUT (OPTIONAL) ==========
    print("\n[STEP 4] Reading copy output for asset inventory...")
    print("-" * 80)

    copy_summary = {}
    copy_readiness = {}
    copy_headlines = {}

    if state.copy_output:
        try:
            copy_data = json.loads(state.copy_output)

            # Extract readiness flags
            copy_readiness = copy_data.get("copy_readiness", {})

            # Extract headlines per channel for context
            known_channels = [
                "email", "linkedin", "instagram", "facebook",
                "twitter", "tiktok", "youtube", "google_ads",
                "social", "ads"
            ]
            for ch in known_channels:
                ch_data = copy_data.get(ch, {})
                if ch_data:
                    headline = ch_data.get("headline", "") or ch_data.get("subject", "")
                    copy_headlines[ch] = headline

            # Build copy summary for prompt
            copy_summary = {
                "inferred_goal": copy_data.get("inferred_goal", inferred_goal),
                "channels_with_copy": [
                    k for k in copy_data.keys()
                    if k not in ("inferred_goal", "messaging_framework",
                                 "strategic_alignment", "copy_readiness")
                ],
                "copy_readiness": copy_readiness,
                "brand_promise": copy_data.get(
                    "messaging_framework", {}
                ).get("brand_promise", ""),
                "channel_headlines": copy_headlines
            }

            print(f"✓ Copy available for channels: {copy_summary['channels_with_copy']}")
            print(f"✓ Readiness flags: {copy_readiness}")

        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Could not parse copy_output: {e} — using safe defaults")
            copy_summary = {"note": "Copy output unavailable"}
    else:
        print("⚠️  No copy output available — LLM will use strategic context")
        copy_summary = {"note": "Copy output not yet generated"}

    # ========== STEP 5: READ IMAGE OUTPUT (OPTIONAL) ==========
    print("\n[STEP 5] Reading image output for visual asset inventory...")
    print("-" * 80)

    image_summary = {}

    if state.image_output:
        try:
            image_data = json.loads(state.image_output)
            image_prompts = image_data.get("image_prompts", [])
            visual_dir = image_data.get("visual_direction", {})

            image_summary = {
                "visual_direction": visual_dir.get("overall_style", "")[:200] if isinstance(visual_dir, dict) else str(visual_dir)[:200],
                "total_prompts": len(image_prompts),
                "image_prompts": [
                    {
                        "deliverable": p.get("deliverable_name", "") or p.get("deliverable", ""),
                        "aspect_ratio": p.get("aspect_ratio", "N/A"),
                        "rationale": p.get("rationale", "")[:100],
                        "visual_elements": p.get("visual_elements", [])[:3]
                    }
                    for p in image_prompts
                ]
            }

            print(f"✓ Visual direction: {image_summary['visual_direction'][:60]}...")
            print(f"✓ Image prompts: {image_summary['total_prompts']} assets")
            for asset in image_summary["image_prompts"]:
                print(f"   • {asset['deliverable']} ({asset['aspect_ratio']}) - {asset.get('rationale', 'N/A')[:40]}...")

        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Could not parse image_output: {e} — using safe defaults")
            image_summary = {"note": "Image output unavailable"}
    else:
        print("⚠️  No image output available — LLM will note pending visual assets")
        image_summary = {"note": "Image output not yet generated"}

    # ========== STEP 6: READ REVIEW OUTPUT (OPTIONAL) ==========
    print("\n[STEP 6] Reading review output for publishing decision...")
    print("-" * 80)

    review_summary = {}
    quality_score = 0

    if state.review_output:
        try:
            review_data = json.loads(state.review_output)

            # Get overall quality metrics - check both root level and nested 'overall' object
            overall = review_data.get("overall", {})
            
            # quality_score can be at root or in overall nested object
            quality_score = review_data.get("overall_quality_score", 0) or overall.get("quality_score", 0)
            
            status = review_data.get("status", "revision_required")
            approved = (status == "approved")
            
            # These can also be at root or nested
            individual_threshold_met = review_data.get("individual_threshold_met", False) or overall.get("individual_threshold_met", False)
            overall_threshold_met = review_data.get("overall_threshold_met", False) or overall.get("overall_threshold_met", False)
            all_approved_flag = review_data.get("all_approved", False) or overall.get("all_approved", False)

            # Collect all issues across agents
            all_issues = []
            agent_scores = {}
            for agent_key in ["research_review", "strategy_review",
                               "copy_review", "image_review"]:
                agent_data = review_data.get(agent_key, {})
                agent_score = agent_data.get("score", 0)
                agent_issues = agent_data.get("issues", [])
                agent_approved = agent_data.get("approved", False)
                agent_name = agent_key.replace("_review", "")
                agent_scores[agent_name] = agent_score
                if agent_issues:
                    all_issues.extend([
                        f"[{agent_name.upper()}] {issue}"
                        for issue in agent_issues
                    ])

            review_summary = {
                "quality_score": quality_score,
                "status": status,
                "approved": approved,
                "individual_threshold_met": individual_threshold_met,
                "overall_threshold_met": overall_threshold_met,
                "all_approved": all_approved_flag,
                "agent_scores": agent_scores,
                "all_issues": all_issues[:10],  # Top 10 issues for prompt
                "summary": overall.get("summary", ""),
                "strengths": overall.get("strengths", []),
                "critical_improvements": overall.get("critical_improvements", []),
                "reviewed_at": review_data.get("reviewed_at", ""),
                "reviewer": review_data.get("reviewer", "Reviewer Agent")
            }

            print(f"✓ Quality Score: {quality_score}/100")
            print(f"✓ Status: {status}")
            print(f"✓ Approved: {approved}")
            print(f"✓ Individual Threshold Met: {individual_threshold_met}")
            print(f"✓ Overall Threshold Met: {overall_threshold_met}")
            print(f"✓ Agent Scores: {agent_scores}")
            if all_issues:
                print(f"✓ Issues found: {len(all_issues)}")

        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Could not parse review_output: {e}")
            review_summary = {"note": "Review output unavailable — defaulting to approved"}
            quality_score = 100  # Safe default
    else:
        print("⚠️  No review output — defaulting to approved for publishing")
        review_summary = {"note": "No reviewer output — proceeding with default approval"}
        quality_score = 100

    # ========== STEP 7: GENERATE PUBLISHING PLAN WITH LLM ==========
    print("\n[STEP 7] Generating comprehensive publishing plan with LLM...")
    print("-" * 80)
    print("📢 AI Distribution Strategist building publishing plan...")

    # Initialize LLM client
    llm = get_llm_client()

    # Pre-calculate publishing decision based on quality score (enforce strict rules)
    if quality_score >= 80:
        expected_decision = "APPROVED_FOR_PUBLISHING"
    elif quality_score >= 60:
        expected_decision = "REVISIONS_NEEDED"
    else:
        expected_decision = "HOLD"
    
    print(f"   Quality Score: {quality_score}/100 → Expected Decision: {expected_decision}")

    # Load publisher prompt and format with all campaign data
    prompt = load_prompt(
        "publisher",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        brand_voice=brand_voice,
        target_audience=target_audience,
        brief=brief,
        # Manager data
        channels=json.dumps(channels, indent=2),
        deliverables=json.dumps(deliverables, indent=2),
        # Strategy data
        inferred_goal=inferred_goal,
        positioning=positioning,
        timeline=json.dumps(timeline, indent=2),
        success_metrics=json.dumps(success_metrics, indent=2),
        channel_strategy=json.dumps(channel_strategy, indent=2),
        audience_segments=json.dumps(audience_segments, indent=2),
        key_messages=json.dumps(key_messages, indent=2),
        # Copy data
        copy_summary=json.dumps(copy_summary, indent=2),
        # Image data
        image_summary=json.dumps(image_summary, indent=2),
        # Review data
        review_summary=json.dumps(review_summary, indent=2),
        quality_score=quality_score,
        # Derived fields
        channels_count=len(channels),
        deliverables_count=len(deliverables),
        # Pre-calculated decision for strict enforcement
        expected_decision=expected_decision
    )

    print("   Querying LLM with structured output...")

    # Get structured LLM response with error handling
    publisher_output, state = safe_llm_call(
        state,
        "Publisher",
        lambda: llm.generate_structured(prompt, PublisherOutput, temperature=0.5, max_tokens=4000)
    )
    
    if publisher_output is None:
        return state  # Error already logged in state

    # ========== POST-PROCESSING: ENFORCE STRICT RULES ==========
    print("\n   Enforcing strict decision and status rules...")
    
    # Force correct publishing decision based on quality score
    if publisher_output.publishing_decision != expected_decision:
        print(f"   ⚠️  LLM produced '{publisher_output.publishing_decision}', correcting to '{expected_decision}'")
        publisher_output.publishing_decision = expected_decision
    
    # Force correct channel status based on copy availability
    copy_available = state.copy_output is not None
    for plan in publisher_output.publishing_plan:
        channel = plan.channel.lower()
        # Channels that need copy: email, linkedin, social, ads, facebook, twitter, instagram, tiktok, youtube
        needs_copy = channel in ["email", "linkedin", "social", "ads", "facebook", "twitter", "instagram", "tiktok", "youtube", "google_ads"]
        
        if needs_copy:
            if copy_available:
                # Check if this specific channel has ready copy
                channel_ready_key = f"{channel}_ready"
                is_ready = copy_readiness.get(channel_ready_key, False)
                if is_ready:
                    plan.status = "READY"
                else:
                    plan.status = "PENDING_ASSET"
            else:
                # No copy output at all
                plan.status = "PENDING_ASSET"
        else:
            # Non-copy channels (e.g., website, blog) can be READY if they have content
            plan.status = "READY"
    
    print("   ✓ Decision and status rules enforced")

    # ========== STEP 8: DISPLAY PUBLISHING PLAN SUMMARY ==========
    print("\n[STEP 8] Publishing plan generated!")
    print("-" * 80)
    print("✅ Publishing plan generated by LLM!")

    print(f"\n📝 Publishing Decision: {publisher_output.publishing_decision}")
    print(f"   Rationale: {publisher_output.decision_rationale[:100]}...")

    print(f"\n📅 Content Calendar:")
    print(f"   Total Weeks: {publisher_output.content_calendar.total_weeks}")
    print(f"   Start Date:  {publisher_output.content_calendar.start_date}")
    print(f"   End Date:    {publisher_output.content_calendar.end_date}")

    print(f"\n📊 Publishing Plan ({len(publisher_output.publishing_plan)} channels):")
    for plan in publisher_output.publishing_plan[:3]:
        print(f"   • {plan.channel}: {plan.priority} priority - {plan.status}")

    print(f"\n📦 Asset Checklist:")
    print(f"   Copy Assets:   {len(publisher_output.asset_checklist.copy_assets)}")
    print(f"   Visual Assets: {len(publisher_output.asset_checklist.visual_assets)}")
    if publisher_output.asset_checklist.missing_assets:
        print(f"   Missing:       {len(publisher_output.asset_checklist.missing_assets)} items")

    print(f"\n📈 Projected Metrics:")
    print(f"   Total Reach: {publisher_output.projected_metrics.total_reach}")
    print(f"   Lead Target: {publisher_output.projected_metrics.lead_target}")
    print(f"   Est. CTR:    {publisher_output.projected_metrics.estimated_ctr}")
    print(f"   ROI:         {publisher_output.projected_metrics.roi_projection}")

    print(f"\n📝 Executive Summary:")
    print(f"   {publisher_output.executive_summary[:150]}...")

    # ========== STEP 9: WRITE TO STATE ==========
    print("\n[STEP 9] Writing to state...")
    print("-" * 80)

    publisher_output_json = publisher_output.model_dump_json(indent=2)

    state.publisher_output = publisher_output_json
    state.status = "completed"
    state.workflow_finished = True  # Mark workflow as completely finished
    state.error = None

    print("✅ State updated:")
    print(f"   publisher_output: {len(publisher_output_json)} characters")
    print(f"   status: {state.status}")

    print("\n" + "=" * 80)
    print("✅ PUBLISHER AGENT COMPLETE")
    print(f"   Decision:  {publisher_output.publishing_decision}")
    print(f"   Channels:  {len(publisher_output.publishing_plan)}")
    print(f"   Calendar:  {publisher_output.content_calendar.total_weeks} weeks")
    print("=" * 80)

    return state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("⚠️  This is the agent module file.")
    print("    To test the Publisher Agent, run: python examples/run_publisher.py")
    print("    To customize input, edit: examples/inputs/campaign_input.json")
    print("=" * 80)
    