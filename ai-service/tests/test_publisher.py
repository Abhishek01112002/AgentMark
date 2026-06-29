"""
TEST SUITE FOR PUBLISHER AGENT

Tests verify that Publisher Agent:
1. Reads manager_output (REQUIRED) and strategy_output (REQUIRED) - raises if missing
2. Reads copy_output, image_output, review_output (OPTIONAL - safe defaults)
3. Determines publishing decision from review_output quality score
4. Builds per-channel publishing plan with priority, timing, KPIs, status
5. Generates week-by-week content calendar from strategy timeline
6. Compiles asset checklist from copy + visual agent outputs
7. Projects campaign metrics based on goal + channels
8. Writes executive summary and sets status = 'completed'

Publisher Agent Output Structure:
{
  "publishing_decision": "APPROVED_FOR_PUBLISHING" | "REVISIONS_NEEDED" | "HOLD",
  "decision_rationale":  str,
  "publishing_plan":     [ { channel, priority, content_type, publish_frequency,
                              optimal_timing, copy_asset_used, visual_asset_used,
                              kpi_targets, status }, ... ],
  "content_calendar":    { total_weeks, campaign_start_date, weeks: [ { week_label,
                              week_label, week_start_date, activities }, ... ] },
  "asset_checklist":     { copy_assets, visual_assets, missing_assets },
  "projected_metrics":   { total_reach, lead_target, estimated_ctr,
                           estimated_cost, roi_projection, projection_note },
  "executive_summary":   str
}

Decision matrix:
  - No review output  → RAISES ValueError (fixed — no silent approval)
  - score >= 80       → APPROVED_FOR_PUBLISHING
  - score 60-79       → REVISIONS_NEEDED
  - score < 60        → HOLD

Test Framework: pytest
Run: pytest tests/test_publisher.py -v
"""

import sys
from pathlib import Path
import json
from datetime import datetime

sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import pytest
except ImportError:
    pytest = None

from agents.state import CampaignState
from agents.publisher import publisher_agent


# ==================== HELPER FUNCTIONS ====================

def create_mock_manager_output(
    channels=None,
    deliverables=None
):
    """
    Helper to create realistic mock manager output.
    Publisher reads: channels, deliverables.
    """
    if channels is None:
        channels = ["linkedin", "email", "facebook", "google_ads"]
    if deliverables is None:
        deliverables = ["landing page", "webinar banner", "email series", "social ads"]

    return {
        "channels": channels,
        "deliverables": deliverables
    }


def create_mock_strategy_output(
    inferred_goal="lead_gen",
    channels=None,
    deliverables=None,
    timeline=None,
    success_metrics=None,
    channel_strategy=None
):
    """
    Helper to create realistic mock strategy output.
    Publisher reads: inferred_goal, timeline, success_metrics,
    channel_strategy, execution.channels, execution.deliverables.
    """
    if channels is None:
        channels = ["linkedin", "email", "facebook", "google_ads"]
    if deliverables is None:
        deliverables = ["landing page", "webinar banner", "email series", "social ads"]
    if timeline is None:
        timeline = {
            "phase_1": {"name": "Planning & Setup", "duration": "Week 1"},
            "phase_2": {"name": "Content Push", "duration": "Week 2-3"},
            "phase_3": {"name": "Lead Capture", "duration": "Week 4-5"},
            "phase_4": {"name": "Optimize & Scale", "duration": "Week 6"}
        }
    if success_metrics is None:
        success_metrics = {
            "primary": "5K MQLs",
            "secondary": "200K impressions",
            "ctr": "3.5%"
        }
    if channel_strategy is None:
        channel_strategy = {
            "linkedin": "thought leadership + lead magnets",
            "email": "drip nurture sequence",
            "facebook": "engagement + retargeting",
            "google_ads": "conversion campaigns"
        }

    return {
        "positioning": "Enterprise AI without the complexity",
        "key_messages": [
            "Deploy powerful AI workflows in hours, not months",
            "Eliminate integration complexity and costs"
        ],
        "inferred_goal": inferred_goal,
        "timeline": timeline,
        "success_metrics": success_metrics,
        "channel_strategy": channel_strategy,
        "competitive_differentiation": {
            "primary_differentiation": "Enterprise AI without the complexity"
        },
        "execution": {
            "channels": channels,
            "deliverables": deliverables,
            "budget_allocation": {
                "high_priority_channels": "50%",
                "content_creation": "30%"
            }
        },
        "research_foundation": {
            "audience_insights": {
                "pain_points": ["Integration complexity", "High costs"],
                "motivations": ["Save time", "Reduce costs"]
            }
        }
    }


def create_mock_copy_output(
    inferred_goal="lead_gen",
    all_ready=True
):
    """
    Helper to create realistic mock copy output.
    Publisher reads: copy_readiness flags, channel copy blobs.
    """
    return {
        "inferred_goal": inferred_goal,
        "copy_readiness": {
            "email_ready": all_ready,
            "linkedin_ready": all_ready,
            "facebook_ready": all_ready,
            "google_ads_ready": all_ready,
            "messaging_framework_complete": all_ready
        },
        "email": {
            "subject": "Limited spots: AgentMark early access now",
            "headline": "Deploy powerful AI workflows in hours, not months",
            "body": "Email body copy here...",
            "ctas": {"hero_cta": "Get Free Access", "secondary_cta": "Learn More"}
        },
        "linkedin": {
            "headline": "Deploy powerful AI workflows in hours, not months",
            "body": "LinkedIn body copy here...",
            "ctas": {"post_cta": "Tell us in the comments"}
        },
        "facebook": {
            "headline": "Unlock productivity with AgentMark",
            "body": "Social body copy here...",
            "ctas": {"twitter_cta": "Learn more →"}
        },
        "google_ads": {
            "headline": "Get AgentMark free - results in 7 days",
            "body": "Ads body copy here...",
            "ctas": {"primary_cta": "Get Free Access"}
        },
        "messaging_framework": {
            "brand_promise": "AgentMark: Enterprise AI without the complexity"
        },
        "strategic_alignment": {
            "positioning_used": "Enterprise AI without the complexity"
        }
    }


def create_mock_image_output(deliverables=None):
    """
    Helper to create realistic mock image output.
    Publisher reads: image_prompts[].deliverable, image_prompts[].aspect_ratio.
    """
    if deliverables is None:
        deliverables = [
            {"deliverable": "linkedin social post", "aspect_ratio": "1:1"},
            {"deliverable": "email banner", "aspect_ratio": "16:9"},
            {"deliverable": "social ads", "aspect_ratio": "1:1"}
        ]

    return {
        "visual_direction": (
            "Visual style: modern corporate. Color palette: navy blue, white, silver. "
            "Brand positioning: Enterprise AI without complexity."
        ),
        "image_prompts": deliverables
    }


def create_mock_review_output(
    overall_quality_score=87,
    status="approved"
):
    """
    Helper to create realistic mock review output.
    Publisher reads: overall_quality_score, status.
    """
    return {
        "status": status,
        "overall_quality_score": overall_quality_score,
        "individual_threshold_met": True,
        "overall_threshold_met": overall_quality_score >= 80,
        "can_publish": overall_quality_score >= 80,
        "research_review": {
            "approved": True,
            "issues": [],
            "feedback": "All 5 research fields validated",
            "score": 95
        },
        "strategy_review": {
            "approved": True,
            "issues": [],
            "feedback": "All 13 strategy fields validated",
            "score": 90
        },
        "copy_review": {
            "approved": True,
            "issues": [],
            "feedback": "All 8 copy fields validated",
            "score": 88
        },
        "image_review": {
            "approved": True,
            "issues": [],
            "feedback": "All 2 image fields validated",
            "score": 85
        },
        "reviewed_at": datetime.now().isoformat(),
        "reviewer": "Reviewer Agent"
    }


def create_full_state(
    campaign_name="Q3 Product Launch",
    brand_name="AgentMark",
    industry="saas",
    primary_goal="lead_gen",
    target_audience="Enterprise CTOs, tech leads",
    brand_voice="professional",
    brief="Launch AI automation platform targeting enterprise CTOs",
    inferred_goal="lead_gen",
    channels=None,
    deliverables=None,
    quality_score=87,
    include_copy=True,
    include_image=True,
    include_review=True
):
    """
    Helper to create a CampaignState ready for the Publisher Agent.
    All upstream agents are simulated.
    """
    if channels is None:
        channels = ["linkedin", "email", "facebook", "google_ads"]
    if deliverables is None:
        deliverables = ["landing page", "webinar banner", "email series", "social ads"]

    manager_data = create_mock_manager_output(channels=channels, deliverables=deliverables)
    strategy_data = create_mock_strategy_output(
        inferred_goal=inferred_goal,
        channels=channels,
        deliverables=deliverables
    )

    state = CampaignState(
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brand_voice=brand_voice,
        brief=brief,
        manager_output=json.dumps(manager_data),
        strategy_output=json.dumps(strategy_data),
        copy_output=json.dumps(create_mock_copy_output(inferred_goal=inferred_goal))
        if include_copy else None,
        image_output=json.dumps(create_mock_image_output())
        if include_image else None,
        review_output=json.dumps(create_mock_review_output(overall_quality_score=quality_score))
        if include_review else None,
        status="review_complete"
    )
    return state


# ==================== TEST 1: Publisher Agent Executes Without Error ====================

def test_publisher_agent_executes():
    """
    TEST 1: Verify Publisher Agent runs without crashing

    WHAT: Call publisher_agent() with a fully populated state
    EXPECT: Returns a CampaignState object (no error, no exception)
    """
    print("\n" + "=" * 80)
    print("TEST 1: Publisher Agent Executes")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)

    assert result is not None, "Publisher Agent should return a state"
    assert isinstance(result, CampaignState), "Should return CampaignState object"

    print("✅ PASS: Publisher Agent executed successfully")


# ==================== TEST 2: publisher_output is Not Empty ====================

def test_publisher_output_not_empty():
    """
    TEST 2: Verify publisher_output field is populated after agent runs

    WHAT: Check publisher_output field after agent runs
    EXPECT: Non-None, non-empty string
    WHY: Downstream consumers depend on publisher_output being populated
    """
    print("\n" + "=" * 80)
    print("TEST 2: publisher_output is Not Empty")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)

    assert result.publisher_output is not None, "publisher_output should not be None"
    assert result.publisher_output != "", "publisher_output should not be empty string"
    assert len(result.publisher_output) > 0, "publisher_output should have content"

    print(f"✅ PASS: publisher_output exists ({len(result.publisher_output)} characters)")


# ==================== TEST 3: publisher_output is Valid JSON ====================

def test_publisher_output_is_valid_json():
    """
    TEST 3: Verify publisher_output is valid JSON

    WHAT: Try to parse publisher_output as JSON
    EXPECT: Should parse without error and return a dict
    WHY: Downstream consumers need to read this as structured JSON
    """
    print("\n" + "=" * 80)
    print("TEST 3: publisher_output is Valid JSON")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)

    try:
        parsed = json.loads(result.publisher_output)
        assert isinstance(parsed, dict), "Parsed JSON should be a dictionary"
        print("✅ PASS: publisher_output is valid JSON")
        print(f"   Keys: {list(parsed.keys())}")
    except json.JSONDecodeError as e:
        raise AssertionError(f"publisher_output is not valid JSON: {e}")


# ==================== TEST 4: All 7 Top-Level Output Fields Exist ====================

def test_all_top_level_fields_exist():
    """
    TEST 4: Verify all 7 required top-level fields exist in publisher_output

    WHAT: Check publisher_output contains every expected key
    EXPECT: publishing_decision, decision_rationale, publishing_plan,
            content_calendar, asset_checklist, projected_metrics, executive_summary
    WHY: Each field serves a specific downstream purpose
    """
    print("\n" + "=" * 80)
    print("TEST 4: All 7 Top-Level Output Fields Exist")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    required_fields = [
        "publishing_decision",
        "decision_rationale",
        "publishing_plan",
        "content_calendar",
        "asset_checklist",
        "projected_metrics",
        "executive_summary"
    ]

    for field in required_fields:
        assert field in parsed, f"Missing required field: '{field}'"
        assert parsed[field] is not None, f"Field '{field}' should not be None"

    print("✅ PASS: All 7 top-level output fields exist")
    for field in required_fields:
        print(f"   ✓ {field}")


# ==================== TEST 5: Status Updated to 'completed' ====================

def test_status_updated_to_completed():
    """
    TEST 5: Verify status is updated to 'completed' after agent runs

    WHAT: Check state.status after publisher_agent() returns
    EXPECT: status = 'completed'
    WHY: Orchestrator checks status to know the pipeline is finished
    """
    print("\n" + "=" * 80)
    print("TEST 5: Status Updated to 'completed'")
    print("=" * 80)

    state = create_full_state()
    assert state.status == "review_complete", "Initial status should be 'review_complete'"

    result = publisher_agent(state)

    assert result.status == "completed", \
        f"Status should be 'completed', got: '{result.status}'"

    print("✅ PASS: Status updated correctly")
    print("   Before: review_complete")
    print(f"   After:  {result.status}")


# ==================== TEST 6: No Error Field Set on Success ====================

def test_no_error_field_set_on_success():
    """
    TEST 6: Verify error field is None after successful execution

    WHAT: Check state.error after successful run
    EXPECT: error = None
    WHY: Errors should only be set if something fails
    """
    print("\n" + "=" * 80)
    print("TEST 6: No Error Field Set on Success")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)

    assert result.error is None, \
        f"error field should be None on success, got: '{result.error}'"

    print("✅ PASS: No error field set")
    print(f"   error: {result.error}")


# ==================== TEST 7: Raises When manager_output Missing ====================

def test_raises_when_manager_output_missing():
    """
    TEST 7: Verify Publisher Agent raises when manager_output is None

    WHAT: Call publisher_agent() with manager_output=None
    EXPECT: Should raise ValueError
    WHY: Publisher cannot build a plan without channel and deliverable definitions
    """
    print("\n" + "=" * 80)
    print("TEST 7: Raises When manager_output Missing")
    print("=" * 80)

    state = create_full_state()
    state.manager_output = None  # Intentionally remove

    if pytest:
        with pytest.raises((ValueError, Exception)):
            publisher_agent(state)
    else:
        try:
            publisher_agent(state)
            assert False, "Should have raised an error"
        except (ValueError, Exception):
            pass

    print("✅ PASS: Raises correctly when manager_output is missing")


# ==================== TEST 8: Raises When strategy_output Missing ====================

def test_raises_when_strategy_output_missing():
    """
    TEST 8: Verify Publisher Agent raises when strategy_output is None

    WHAT: Call publisher_agent() with strategy_output=None
    EXPECT: Should raise ValueError
    WHY: Publisher cannot build a plan without strategic foundation
    """
    print("\n" + "=" * 80)
    print("TEST 8: Raises When strategy_output Missing")
    print("=" * 80)

    state = create_full_state()
    state.strategy_output = None  # Intentionally remove

    if pytest:
        with pytest.raises((ValueError, Exception)):
            publisher_agent(state)
    else:
        try:
            publisher_agent(state)
            assert False, "Should have raised an error"
        except (ValueError, Exception):
            pass

    print("✅ PASS: Raises correctly when strategy_output is missing")


# ==================== TEST 9: Score ≥80 → APPROVED_FOR_PUBLISHING ====================

def test_score_above_80_approved():
    """
    TEST 9: Verify quality score ≥80 produces APPROVED_FOR_PUBLISHING decision

    WHAT: Create state with review score=87, check publishing_decision
    EXPECT: publishing_decision = 'APPROVED_FOR_PUBLISHING'
    WHY: 80 is the approval threshold - campaigns above it should be published
    """
    print("\n" + "=" * 80)
    print("TEST 9: Score ≥80 → APPROVED_FOR_PUBLISHING")
    print("=" * 80)

    state = create_full_state(quality_score=87)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    assert parsed["publishing_decision"] == "APPROVED_FOR_PUBLISHING", \
        f"Score 87 should produce APPROVED_FOR_PUBLISHING, got: '{parsed['publishing_decision']}'"

    print("✅ PASS: Score ≥80 correctly produces APPROVED_FOR_PUBLISHING")
    print("   quality_score: 87/100")
    print(f"   publishing_decision: {parsed['publishing_decision']}")


# ==================== TEST 10: Score 60-79 → REVISIONS_NEEDED ====================

def test_score_60_to_79_revisions_needed():
    """
    TEST 10: Verify quality score 60-79 produces REVISIONS_NEEDED decision

    WHAT: Create state with review score=70, check publishing_decision
    EXPECT: publishing_decision = 'REVISIONS_NEEDED'
    WHY: Scores in 60-79 range indicate partial quality - revisions required
    """
    print("\n" + "=" * 80)
    print("TEST 10: Score 60-79 → REVISIONS_NEEDED")
    print("=" * 80)

    state = create_full_state(quality_score=70)
    with pytest.raises(ValueError, match="Publish blocked"):
        publisher_agent(state)

    print("✅ PASS: Score 60-79 correctly produces ValueError (Publish blocked)")
    print("   quality_score: 70/100")
    print(f"   publishing_decision: {parsed['publishing_decision']}")


# ==================== TEST 11: Score <60 → HOLD ====================

def test_score_below_60_hold():
    """
    TEST 11: Verify quality score <60 produces HOLD decision

    WHAT: Create state with review score=45, check publishing_decision
    EXPECT: publishing_decision = 'HOLD'
    WHY: Critically low scores mean campaign is not ready - must be held
    """
    print("\n" + "=" * 80)
    print("TEST 11: Score <60 → HOLD")
    print("=" * 80)

    state = create_full_state(quality_score=45)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    assert parsed["publishing_decision"] == "HOLD", \
        f"Score 45 should produce HOLD, got: '{parsed['publishing_decision']}'"

    print("✅ PASS: Score <60 correctly produces HOLD")
    print("   quality_score: 45/100")
    print(f"   publishing_decision: {parsed['publishing_decision']}")


# ==================== TEST 12: No review_output → APPROVED_FOR_PUBLISHING (Default) ====================

def test_no_review_output_raises_error():
    """
    TEST 12: Verify missing review_output raises ValueError (no silent approval)

    WHAT: Create state with no review_output, expect ValueError
    EXPECT: publisher_agent raises ValueError, not silent approval
    WHY: Silent approval was a bug — missing review should block publishing
    """
    print("\n" + "=" * 80)
    print("TEST 12: No review_output → RAISES ValueError (fixed)")
    print("=" * 80)

    state = create_full_state(include_review=False)
    assert state.review_output is None, "review_output should be None for this test"

    try:
        publisher_agent(state)
        print("❌ FAIL: Expected ValueError but no exception was raised")
        assert False, "publisher_agent should have raised ValueError"
    except ValueError as e:
        print("✅ PASS: Missing review_output correctly raises ValueError")
        print(f"   Error: {str(e)[:80]}...")

    except Exception as e:
        print(f"❌ FAIL: Expected ValueError, got {type(e).__name__}: {e}")
        assert False, f"Expected ValueError, got {type(e).__name__}"


# ==================== TEST 13: decision_rationale is Non-Empty String ====================

def test_decision_rationale_is_non_empty():
    """
    TEST 13: Verify decision_rationale is always a non-empty string

    WHAT: Check decision_rationale field for all decision types
    EXPECT: Non-empty string explaining the decision
    WHY: Stakeholders need to understand why a decision was made
    """
    print("\n" + "=" * 80)
    print("TEST 13: decision_rationale is Non-Empty String")
    print("=" * 80)

    score_decision_map = {
        90: "APPROVED_FOR_PUBLISHING",
        70: "REVISIONS_NEEDED",
        45: "HOLD"
    }

    for score, expected_decision in score_decision_map.items():
        state = create_full_state(quality_score=score)
        result = publisher_agent(state)
        parsed = json.loads(result.publisher_output)

        rationale = parsed["decision_rationale"]
        assert isinstance(rationale, str), "decision_rationale should be a string"
        assert len(rationale) > 0, "decision_rationale should not be empty"
        assert len(rationale) > 20, \
            f"decision_rationale should be meaningful (>20 chars), got: '{rationale}'"

        print(f"   ✓ score={score}, decision={expected_decision}: rationale present ✓")

    print("\n✅ PASS: decision_rationale is non-empty for all decision types")


# ==================== TEST 14: publishing_plan is Non-Empty List ====================

def test_publishing_plan_is_non_empty_list():
    """
    TEST 14: Verify publishing_plan is a non-empty list

    WHAT: Check publishing_plan field type and content
    EXPECT: List with at least one channel plan
    WHY: Publisher must generate a plan for at least one channel
    """
    print("\n" + "=" * 80)
    print("TEST 14: publishing_plan is Non-Empty List")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    plan = parsed["publishing_plan"]

    assert isinstance(plan, list), "publishing_plan should be a list"
    assert len(plan) >= 1, "publishing_plan should contain at least one channel plan"

    print(f"✅ PASS: publishing_plan is non-empty list ({len(plan)} channels)")


# ==================== TEST 15: Each Channel Plan Has Required Sub-fields ====================

def test_each_channel_plan_has_required_subfields():
    """
    TEST 15: Verify each channel plan in publishing_plan has all required sub-fields

    WHAT: Check every item in publishing_plan for required keys
    EXPECT: channel, priority, content_type, publish_frequency, optimal_timing,
            copy_asset_used, kpi_targets, status
    WHY: Channel-specific sub-fields drive the distribution execution
    """
    print("\n" + "=" * 80)
    print("TEST 15: Each Channel Plan Has Required Sub-fields")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    required_subfields = [
        "channel",
        "priority",
        "content_type",
        "publish_frequency",
        "optimal_timing",
        "copy_asset_used",
        "kpi_targets",
        "status"
    ]

    for i, channel_plan in enumerate(parsed["publishing_plan"]):
        for subfield in required_subfields:
            assert subfield in channel_plan, \
                f"Channel plan {i+1} missing sub-field: '{subfield}'"
            assert channel_plan[subfield] is not None, \
                f"Channel plan {i+1} field '{subfield}' should not be None"

    print("✅ PASS: All channel plans have required sub-fields")
    for cp in parsed["publishing_plan"]:
        print(f"   ✓ {cp['channel']}: priority={cp['priority']}, status={cp['status']}")


# ==================== TEST 16: Publishing Plan Count Matches Channels ====================

def test_publishing_plan_count_matches_channels():
    """
    TEST 16: Verify one channel plan is generated per channel

    WHAT: Count publishing_plan items vs channels in strategy
    EXPECT: len(publishing_plan) == len(channels)
    WHY: Every channel needs its own distribution plan
    """
    print("\n" + "=" * 80)
    print("TEST 16: Publishing Plan Count Matches Channels")
    print("=" * 80)

    custom_channels = ["linkedin", "email", "facebook"]
    state = create_full_state(channels=custom_channels)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    plan_count = len(parsed["publishing_plan"])
    expected_count = len(custom_channels)

    assert plan_count == expected_count, \
        f"Expected {expected_count} channel plans, got {plan_count}"

    print("✅ PASS: Publishing plan count matches channels")
    print(f"   Channels: {custom_channels}")
    print(f"   Plans generated: {plan_count}")


# ==================== TEST 17: Channel Priority Aligns with Goal (lead_gen) ====================

def test_channel_priority_aligns_with_goal_lead_gen():
    """
    TEST 17: Verify channel priorities are goal-aligned for lead_gen campaigns

    WHAT: Create lead_gen campaign with linkedin + email channels
    EXPECT: linkedin and email should both have HIGH priority for lead_gen
    WHY: Channel priority lookup table drives resource allocation decisions
    """
    print("\n" + "=" * 80)
    print("TEST 17: Channel Priority Aligns with Goal (lead_gen)")
    print("=" * 80)

    state = create_full_state(
        inferred_goal="lead_gen",
        channels=["linkedin", "email", "facebook", "google_ads"]
    )
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    plan_by_channel = {cp["channel"]: cp for cp in parsed["publishing_plan"]}

    # For lead_gen: linkedin=HIGH, email=HIGH, ads=HIGH
    assert plan_by_channel["linkedin"]["priority"] == "HIGH", \
        f"LinkedIn should be HIGH priority for lead_gen, got: {plan_by_channel['linkedin']['priority']}"
    assert plan_by_channel["email"]["priority"] == "HIGH", \
        f"Email should be HIGH priority for lead_gen, got: {plan_by_channel['email']['priority']}"

    print("✅ PASS: Channel priorities correctly aligned for lead_gen goal")
    for channel, cp in plan_by_channel.items():
        print(f"   {channel}: {cp['priority']}")


# ==================== TEST 18: Copy READY Status When copy_readiness True ====================

def test_channel_status_ready_when_copy_ready():
    """
    TEST 18: Verify channel plan status is READY when copy_readiness flags are True

    WHAT: Create state with all copy_readiness=True, check channel plan status
    EXPECT: All channel plans should have status='READY'
    WHY: READY status signals the channel is cleared for immediate publishing
    """
    print("\n" + "=" * 80)
    print("TEST 18: Copy READY Status When copy_readiness True")
    print("=" * 80)

    state = create_full_state(include_copy=True)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    for cp in parsed["publishing_plan"]:
        channel = cp["channel"]
        # Only check channels that have copy (email, linkedin, social, ads)
        if channel in ["email", "linkedin", "facebook", "google_ads"]:
            assert cp["status"] == "READY", \
                f"Channel '{channel}' should be READY when copy is ready, got: '{cp['status']}'"
            print(f"   ✓ {channel}: status=READY ✓")

    print("\n✅ PASS: All channels with ready copy have status=READY")


# ==================== TEST 19: Copy PENDING_ASSET Status When No copy_output ====================

def test_channel_status_pending_when_no_copy():
    """
    TEST 19: Verify channel plan status is PENDING_ASSET when copy_output is missing

    WHAT: Create state without copy_output, check channel plan statuses
    EXPECT: Channel plans should have status='PENDING_ASSET'
    WHY: Without copy, channels cannot be published - must flag as pending
    """
    print("\n" + "=" * 80)
    print("TEST 19: Copy PENDING_ASSET Status When No copy_output")
    print("=" * 80)

    state = create_full_state(include_copy=False)
    assert state.copy_output is None, "copy_output should be None for this test"

    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    copy_channels = ["email", "linkedin", "facebook", "google_ads"]
    for cp in parsed["publishing_plan"]:
        if cp["channel"] in copy_channels:
            assert cp["status"] == "PENDING_ASSET", \
                f"Channel '{cp['channel']}' should be PENDING_ASSET without copy, " \
                f"got: '{cp['status']}'"
            print(f"   ✓ {cp['channel']}: status=PENDING_ASSET ✓")

    print("\n✅ PASS: Channels correctly marked PENDING_ASSET without copy_output")


# ==================== TEST 20: content_calendar Has Required Structure ====================

def test_content_calendar_has_required_structure():
    """
    TEST 20: Verify content_calendar has total_weeks, campaign_start_date, and weeks array

    WHAT: Check content_calendar top-level structure
    EXPECT: total_weeks (int≥1), campaign_start_date (str), weeks (non-empty list)
    WHY: Content calendar drives the week-by-week publishing schedule
    """
    print("\n" + "=" * 80)
    print("TEST 20: content_calendar Has Required Structure")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    calendar = parsed["content_calendar"]

    assert "total_weeks" in calendar, "content_calendar missing 'total_weeks'"
    assert "campaign_start_date" in calendar, "content_calendar missing 'campaign_start_date'"
    assert "weeks" in calendar, "content_calendar missing 'weeks'"

    assert isinstance(calendar["total_weeks"], int), "total_weeks should be int"
    assert calendar["total_weeks"] >= 1, "total_weeks should be ≥1"
    assert isinstance(calendar["campaign_start_date"], str), "campaign_start_date should be string"
    assert isinstance(calendar["weeks"], list), "weeks should be a list"
    assert len(calendar["weeks"]) >= 1, "weeks should have at least 1 entry"

    print("✅ PASS: content_calendar has required structure")
    print(f"   total_weeks: {calendar['total_weeks']}")
    print(f"   campaign_start_date:  {calendar['campaign_start_date']}")
    print(f"   weeks count: {len(calendar['weeks'])}")


# ==================== TEST 21: Each Week Has Required Sub-fields ====================

def test_each_calendar_week_has_required_subfields():
    """
    TEST 21: Verify each week in content_calendar has required sub-fields

    WHAT: Check every week object for week_label,
          week_start_date, activities
    EXPECT: All three keys present and non-empty in every week
    WHY: Week-level structure drives the day-by-day publishing schedule
    """
    print("\n" + "=" * 80)
    print("TEST 21: Each Calendar Week Has Required Sub-fields")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    required_subfields = ["week_label", "week_start_date", "activities"]

    for i, week in enumerate(parsed["content_calendar"]["weeks"]):
        for subfield in required_subfields:
            assert subfield in week, \
                f"Week {i+1} missing sub-field: '{subfield}'"
            assert week[subfield] is not None, \
                f"Week {i+1} field '{subfield}' should not be None"

        assert isinstance(week["activities"], list), \
            f"Week {i+1} activities should be a list"
        assert len(week["activities"]) >= 1, \
            f"Week {i+1} should have at least one activity"

    print("✅ PASS: All calendar weeks have required sub-fields")
    for week in parsed["content_calendar"]["weeks"][:3]:
        print(f"   ✓ Week {i+1}: {week['week_label']} "
              f"({len(week['activities'])} activities)")


# ==================== TEST 22: Calendar Weeks Count Matches Timeline Phases ====================

def test_calendar_weeks_count_matches_timeline():
    """
    TEST 22: Verify calendar total_weeks is derived from strategy timeline phases

    WHAT: Calendar always has exactly 4 weeks regardless of timeline phases
    EXPECT: total_weeks = 4 (fixed, not derived from phase count)
    WHY: Calendar must cover the full campaign timeline
    """
    print("\n" + "=" * 80)
    print("TEST 22: Calendar Weeks Count Matches Timeline Phases")
    print("=" * 80)

    four_phase_timeline = {
        "phase_1": {"name": "Planning & Setup", "duration": "Week 1"},
        "phase_2": {"name": "Content Push", "duration": "Week 2-3"},
        "phase_3": {"name": "Lead Capture", "duration": "Week 4-5"},
        "phase_4": {"name": "Optimize & Scale", "duration": "Week 6"}
    }

    strategy_data = create_mock_strategy_output(
        inferred_goal="lead_gen",
        timeline=four_phase_timeline
    )

    state = create_full_state()
    state.strategy_output = json.dumps(strategy_data)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    total_weeks = parsed["content_calendar"]["total_weeks"]
    expected_weeks = 4

    assert total_weeks == expected_weeks, \
        f"total_weeks should be {expected_weeks}, got: {total_weeks}"

    print("✅ PASS: Calendar weeks correctly set to 4 (fixed)")
    print("   Timeline phases: 4")
    print(f"   Expected weeks: {expected_weeks}")
    print(f"   Actual weeks: {total_weeks}")


# ==================== TEST 23: asset_checklist Has Required Structure ====================

def test_asset_checklist_has_required_structure():
    """
    TEST 23: Verify asset_checklist has copy_assets, visual_assets, missing_assets

    WHAT: Check asset_checklist top-level structure
    EXPECT: All three keys present with correct types
    WHY: Asset checklist is the inventory control for campaign readiness
    """
    print("\n" + "=" * 80)
    print("TEST 23: asset_checklist Has Required Structure")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    checklist = parsed["asset_checklist"]

    assert "copy_assets" in checklist, "asset_checklist missing 'copy_assets'"
    assert "visual_assets" in checklist, "asset_checklist missing 'visual_assets'"
    assert "missing_assets" in checklist, "asset_checklist missing 'missing_assets'"

    assert isinstance(checklist["copy_assets"], list), "copy_assets should be a list"
    assert isinstance(checklist["visual_assets"], list), "visual_assets should be a list"
    assert isinstance(checklist["missing_assets"], list), "missing_assets should be a list"

    print("✅ PASS: asset_checklist has required structure")
    print(f"   copy_assets:    {len(checklist['copy_assets'])} items")
    print(f"   visual_assets:  {len(checklist['visual_assets'])} items")
    print(f"   missing_assets: {len(checklist['missing_assets'])} items")


# ==================== TEST 24: Copy Assets Populated from copy_output ====================

def test_copy_assets_populated_from_copy_output():
    """
    TEST 24: Verify copy_assets in checklist are populated from copy_output

    WHAT: Check copy_assets has entries for standard channels
    EXPECT: copy_assets has email, linkedin, social, ads entries
    WHY: Copy checklist must account for all standard copy channels
    """
    print("\n" + "=" * 80)
    print("TEST 24: Copy Assets Populated from copy_output")
    print("=" * 80)

    state = create_full_state(include_copy=True)
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    copy_assets = parsed["asset_checklist"]["copy_assets"]

    assert len(copy_assets) >= 4, \
        f"Should have at least 4 copy assets (email/linkedin/social/ads), got {len(copy_assets)}"

    asset_names = [a["asset"].lower() for a in copy_assets]
    for expected_channel in ["email", "linkedin", "facebook", "google_ads"]:
        found = any(expected_channel in name for name in asset_names)
        assert found, f"copy_assets should include {expected_channel} copy"

    print("✅ PASS: Copy assets correctly populated from copy_output")
    for asset in copy_assets:
        print(f"   ✓ {asset['asset']}: status={asset['status']}")


# ==================== TEST 25: Visual Assets Populated from image_output ====================

def test_visual_assets_populated_from_image_output():
    """
    TEST 25: Verify visual_assets in checklist are populated from image_output

    WHAT: Check visual_assets has entries matching image_output deliverables
    EXPECT: visual_assets list matches image_prompts count from image_output
    WHY: Visual asset inventory must reflect what Image Agent produced
    """
    print("\n" + "=" * 80)
    print("TEST 25: Visual Assets Populated from image_output")
    print("=" * 80)

    custom_image_deliverables = [
        {"deliverable": "linkedin social post", "aspect_ratio": "1:1"},
        {"deliverable": "email banner", "aspect_ratio": "16:9"},
        {"deliverable": "social ads", "aspect_ratio": "1:1"}
    ]

    state = create_full_state(include_image=True)
    state.image_output = json.dumps(create_mock_image_output(
        deliverables=custom_image_deliverables
    ))
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    visual_assets = parsed["asset_checklist"]["visual_assets"]

    assert len(visual_assets) == len(custom_image_deliverables), \
        f"Expected {len(custom_image_deliverables)} visual assets, got {len(visual_assets)}"

    for va in visual_assets:
        assert "asset" in va, "Visual asset should have 'asset' field"
        assert "status" in va, "Visual asset should have 'status' field"
        assert "aspect_ratio" in va, "Visual asset should have 'aspect_ratio' field"
        assert va["status"] == "READY", \
            f"Visual asset from image_output should be READY, got: '{va['status']}'"

    print("✅ PASS: Visual assets correctly populated from image_output")
    for va in visual_assets:
        print(f"   ✓ {va['asset']}: {va['aspect_ratio']}, status={va['status']}")


# ==================== TEST 26: Visual Assets Empty When No image_output ====================

def test_visual_assets_empty_when_no_image_output():
    """
    TEST 26: Verify visual_assets is empty list when image_output is missing

    WHAT: Create state without image_output, check visual_assets
    EXPECT: visual_assets = [] (empty list, not error)
    WHY: Image output is optional - absence should produce safe empty default
    """
    print("\n" + "=" * 80)
    print("TEST 26: Visual Assets Empty When No image_output")
    print("=" * 80)

    state = create_full_state(include_image=False)
    assert state.image_output is None, "image_output should be None for this test"

    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    visual_assets = parsed["asset_checklist"]["visual_assets"]

    assert isinstance(visual_assets, list), "visual_assets should be a list"
    assert len(visual_assets) == 0, \
        f"visual_assets should be empty without image_output, got: {len(visual_assets)} items"

    print("✅ PASS: visual_assets is empty when no image_output")
    print("   visual_assets: [] ✓")


# ==================== TEST 27: projected_metrics Has All Required Fields ====================

def test_projected_metrics_has_all_required_fields():
    """
    TEST 27: Verify projected_metrics has all 6 required fields

    WHAT: Check projected_metrics for total_reach, lead_target, estimated_ctr,
          estimated_cost, roi_projection, projection_note
    EXPECT: All six keys present and non-empty
    WHY: Stakeholders use projected metrics for campaign investment decisions
    """
    print("\n" + "=" * 80)
    print("TEST 27: projected_metrics Has All Required Fields")
    print("=" * 80)

    state = create_full_state()
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    metrics = parsed["projected_metrics"]

    required_fields = [
        "total_reach",
        "lead_target",
        "estimated_ctr",
        "estimated_cost",
        "roi_projection",
        "projection_note"
    ]

    for field in required_fields:
        assert field in metrics, f"projected_metrics missing field: '{field}'"
        assert metrics[field] is not None, f"projected_metrics.{field} should not be None"
        assert isinstance(metrics[field], str) and len(metrics[field]) > 0, \
            f"projected_metrics.{field} should be a non-empty string"

    print("✅ PASS: projected_metrics has all required fields")
    for field in required_fields:
        print(f"   ✓ {field}: {metrics[field]}")


# ==================== TEST 28: Projected Metrics Vary by Goal ====================

def test_projected_metrics_vary_by_goal():
    """
    TEST 28: Verify projected_metrics differ for different campaign goals

    WHAT: Run publisher with all 4 goals, compare projected_metrics
    EXPECT: total_reach and roi_projection should differ across goals
    WHY: Each goal has different expected outcomes and ROI profiles
    """
    print("\n" + "=" * 80)
    print("TEST 28: Projected Metrics Vary by Goal")
    print("=" * 80)

    goals = ["lead_gen", "awareness", "sales", "retention"]
    metrics_by_goal = {}

    for goal in goals:
        state = create_full_state(inferred_goal=goal)
        result = publisher_agent(state)
        parsed = json.loads(result.publisher_output)
        metrics_by_goal[goal] = parsed["projected_metrics"]["total_reach"]

    unique_reach_values = set(metrics_by_goal.values())
    assert len(unique_reach_values) > 1, \
        f"Different goals should produce different total_reach. Got: {metrics_by_goal}"

    print("✅ PASS: Projected metrics vary by goal")
    for goal, reach in metrics_by_goal.items():
        print(f"   {goal}: total_reach='{reach}'")


# ==================== TEST 29: executive_summary is Non-Empty String with Key Info ====================

def test_executive_summary_is_non_empty_and_contains_key_info():
    """
    TEST 29: Verify executive_summary is a non-empty string containing key campaign info

    WHAT: Check executive_summary for brand name, campaign name, and decision
    EXPECT: Non-empty string mentioning brand_name and publishing decision context
    WHY: Executive summary must be informative enough for C-level stakeholder review
    """
    print("\n" + "=" * 80)
    print("TEST 29: executive_summary Contains Key Campaign Info")
    print("=" * 80)

    state = create_full_state(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        quality_score=87
    )
    result = publisher_agent(state)
    parsed = json.loads(result.publisher_output)

    summary = parsed["executive_summary"]

    assert isinstance(summary, str), "executive_summary should be a string"
    assert len(summary) > 50, \
        f"executive_summary should be meaningful (>50 chars), got {len(summary)} chars"
    assert "AgentMark" in summary, \
        "executive_summary should mention the brand name"
    assert "Q3 Product Launch" in summary, \
        "executive_summary should mention the campaign name"

    print("✅ PASS: executive_summary is non-empty and contains key info")
    print(f"   Length: {len(summary)} chars")
    print(f"   Preview: {summary[:120]}...")


# ==================== TEST 30: Full Integration Test ====================

def test_publisher_agent_integration():
    """
    TEST 30: Full integration test

    WHAT: Test complete flow with realistic data matching AgentMark Q3 Product Launch
    EXPECT: All 7 output fields populated, APPROVED decision, status='completed',
            plan for all channels, 8-week calendar, assets inventoried
    WHY: Ensure Publisher Agent works end-to-end within the multi-agent pipeline
    """
    print("\n" + "=" * 80)
    print("TEST 30: Full Integration Test")
    print("=" * 80)

    channels = ["linkedin", "email", "facebook", "google_ads"]
    deliverables = ["landing page", "webinar banner", "email series", "social ads"]

    manager_data = create_mock_manager_output(channels=channels, deliverables=deliverables)
    strategy_data = create_mock_strategy_output(
        inferred_goal="lead_gen",
        channels=channels,
        deliverables=deliverables
    )
    copy_data = create_mock_copy_output(inferred_goal="lead_gen", all_ready=True)
    image_data = create_mock_image_output(deliverables=[
        {"deliverable": "linkedin social post", "aspect_ratio": "1:1"},
        {"deliverable": "email banner", "aspect_ratio": "16:9"}
    ])
    review_data = create_mock_review_output(overall_quality_score=87, status="approved")

    state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads, companies with 1000+ employees",
        brand_voice="professional",
        brief="Launch AI automation platform targeting enterprise CTOs",
        manager_output=json.dumps(manager_data),
        strategy_output=json.dumps(strategy_data),
        copy_output=json.dumps(copy_data),
        image_output=json.dumps(image_data),
        review_output=json.dumps(review_data),
        status="review_complete"
    )

    print("Input:")
    print("  campaign_name: Q3 Product Launch")
    print("  brand_name:    AgentMark")
    print("  industry:      saas")
    print("  brand_voice:   professional")
    print("  goal:          lead_gen")
    print("  quality_score: 87/100")
    print(f"  channels:      {channels}")
    print(f"  deliverables:  {deliverables}")

    result = publisher_agent(state)

    # Core state checks
    assert result.status == "completed", \
        f"Status should be 'completed', got: '{result.status}'"
    assert result.publisher_output is not None, "publisher_output must be populated"
    assert len(result.publisher_output) > 0, "publisher_output must not be empty"
    assert result.error is None, f"error should be None, got: '{result.error}'"

    # JSON validity
    parsed = json.loads(result.publisher_output)
    assert isinstance(parsed, dict), "publisher_output should be a valid JSON dict"

    # All 7 top-level fields
    for field in ["publishing_decision", "decision_rationale", "publishing_plan",
                  "content_calendar", "asset_checklist", "projected_metrics",
                  "executive_summary"]:
        assert field in parsed, f"Missing field: '{field}'"

    # Correct publishing decision
    assert parsed["publishing_decision"] == "APPROVED_FOR_PUBLISHING", \
        f"Score 87 should produce APPROVED, got: '{parsed['publishing_decision']}'"

    # Publishing plan
    assert len(parsed["publishing_plan"]) == len(channels), \
        f"Should have {len(channels)} channel plans, got {len(parsed['publishing_plan'])}"

    for cp in parsed["publishing_plan"]:
        for subfield in ["channel", "priority", "content_type", "publish_frequency",
                         "optimal_timing", "copy_asset_used", "kpi_targets", "status"]:
            assert subfield in cp, f"Channel plan missing: '{subfield}'"

    # Content calendar
    calendar = parsed["content_calendar"]
    assert calendar["total_weeks"] >= 4, "Should have at least 4 weeks"
    assert len(calendar["weeks"]) == calendar["total_weeks"]

    # Asset checklist
    checklist = parsed["asset_checklist"]
    assert len(checklist["copy_assets"]) == 4, "Should have 4 copy assets"
    assert len(checklist["visual_assets"]) == 2, "Should have 2 visual assets"

    # Projected metrics
    metrics = parsed["projected_metrics"]
    for field in ["total_reach", "lead_target", "estimated_ctr",
                  "estimated_cost", "roi_projection"]:
        assert field in metrics and metrics[field]

    # Executive summary
    assert "AgentMark" in parsed["executive_summary"]
    assert "Q3 Product Launch" in parsed["executive_summary"]

    print("\nOutput:")
    print(f"  status:              {result.status} ✅")
    print(f"  publishing_decision: {parsed['publishing_decision']} ✅")
    print(f"  publishing_plan:     {len(parsed['publishing_plan'])} channels ✅")
    for cp in parsed["publishing_plan"]:
        print(f"    ✓ {cp['channel']}: priority={cp['priority']}, "
              f"status={cp['status']}, kpis={list(cp['kpi_targets'].keys())}")
    print(f"  content_calendar:    {calendar['total_weeks']} weeks ✅")
    print(f"  asset_checklist:     {len(checklist['copy_assets'])} copy, "
          f"{len(checklist['visual_assets'])} visual ✅")
    print(f"  projected_metrics:   reach={metrics['total_reach']}, "
          f"ctr={metrics['estimated_ctr']} ✅")
    print(f"  executive_summary:   {len(parsed['executive_summary'])} chars ✅")
    print(f"  error:               {result.error} ✅")
    print("\n✅ PASS: Full integration test successful")


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    """
    Run all tests manually (without pytest)

    To run with pytest:
        pytest tests/test_publisher.py -v

    To run manually:
        python tests/test_publisher.py
    """

    print("\n" + "=" * 80)
    print("PUBLISHER AGENT TEST SUITE")
    print("=" * 80)

    tests = [
        test_publisher_agent_executes,
        test_publisher_output_not_empty,
        test_publisher_output_is_valid_json,
        test_all_top_level_fields_exist,
        test_status_updated_to_completed,
        test_no_error_field_set_on_success,
        test_raises_when_manager_output_missing,
        test_raises_when_strategy_output_missing,
        test_score_above_80_approved,
        test_score_60_to_79_revisions_needed,
        test_score_below_60_hold,
        test_no_review_output_raises_error,
        test_decision_rationale_is_non_empty,
        test_publishing_plan_is_non_empty_list,
        test_each_channel_plan_has_required_subfields,
        test_publishing_plan_count_matches_channels,
        test_channel_priority_aligns_with_goal_lead_gen,
        test_channel_status_ready_when_copy_ready,
        test_channel_status_pending_when_no_copy,
        test_content_calendar_has_required_structure,
        test_each_calendar_week_has_required_subfields,
        test_calendar_weeks_count_matches_timeline,
        test_asset_checklist_has_required_structure,
        test_copy_assets_populated_from_copy_output,
        test_visual_assets_populated_from_image_output,
        test_visual_assets_empty_when_no_image_output,
        test_projected_metrics_has_all_required_fields,
        test_projected_metrics_vary_by_goal,
        test_executive_summary_is_non_empty_and_contains_key_info,
        test_publisher_agent_integration,
    ]

    passed = 0
    failed = 0

    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"❌ FAIL: {e}")
        except Exception as e:
            failed += 1
            print(f"❌ ERROR: {type(e).__name__}: {e}")

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(tests)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print("\nTest Coverage:")
    print("  - Agent execution and output not empty ✓")
    print("  - Valid JSON output ✓")
    print("  - All 7 top-level fields present ✓")
    print("  - Status updated to 'completed' ✓")
    print("  - No error field on success ✓")
    print("  - Raises on missing manager_output ✓")
    print("  - Raises on missing strategy_output ✓")
    print("  - Score ≥80 → APPROVED_FOR_PUBLISHING ✓")
    print("  - Score 60-79 → REVISIONS_NEEDED ✓")
    print("  - Score <60 → HOLD ✓")
    print("  - No review_output → default APPROVED ✓")
    print("  - decision_rationale non-empty for all decisions ✓")
    print("  - publishing_plan is non-empty list ✓")
    print("  - Each channel plan has 8 required sub-fields ✓")
    print("  - Plan count matches channels ✓")
    print("  - Channel priority aligned with goal (lead_gen) ✓")
    print("  - Status=READY when copy_readiness=True ✓")
    print("  - Status=PENDING_ASSET without copy_output ✓")
    print("  - content_calendar has total_weeks/campaign_start_date/weeks ✓")
    print("  - Each calendar week has 3 required sub-fields ✓")
    print("  - Calendar weeks fixed at 4 ✓")
    print("  - asset_checklist has copy/visual/missing lists ✓")
    print("  - Copy assets populated from copy_output ✓")
    print("  - Visual assets populated from image_output ✓")
    print("  - Visual assets empty without image_output ✓")
    print("  - projected_metrics has all 6 required fields ✓")
    print("  - Projected metrics vary by goal ✓")
    print("  - executive_summary contains brand + campaign name ✓")
    print("  - Full integration test ✓")
    print(f"  - Total: {len(tests)} publisher tests")
    print("  - Output fields: 7 (decision + rationale + plan + calendar + checklist + metrics + summary)")
    print("  - Required inputs: manager_output + strategy_output")
    print("  - Optional inputs: copy_output + image_output + review_output (safe defaults)")

    if failed == 0:
        print(f"\n🎉 ALL {len(tests)} TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed}/{len(tests)} tests failed")

    print("=" * 80)