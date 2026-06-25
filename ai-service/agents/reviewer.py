"""
REVIEWER AGENT - Quality Control Supervisor

Role: Quality Assurance Manager - Reviews ALL agent outputs and sends back
      for revision if quality is insufficient.

INPUT (From All Upstream Agents):

  FROM state (direct access):
    ✅ research_output: JSON string from Research Agent (5 fields)
    ✅ strategy_output: JSON string from Strategy Agent (13 fields)
    ✅ copy_output: JSON string from Copywriter Agent (8 fields)
    ✅ image_output: JSON string from Image Prompt Agent (2 fields)

  FROM state (campaign metadata):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand being reviewed
    ✅ brand_voice: Expected tone (for copy validation)
    ✅ industry: Industry context (for research validation)
    ✅ primary_goal: Campaign goal (for strategy/copy alignment)

WHAT REVIEWER VALIDATES (28 total fields):
  Research  (5 fields): market_analysis, competitor_analysis, audience_insights,
                        market_opportunities, recommended_approach
  Strategy (13 fields): positioning, key_messages, content_pillars, channel_strategy,
                        audience_segments, timeline, success_metrics,
                        competitive_differentiation, market_opportunities,
                        strategic_approach, inferred_goal, research_foundation, execution
  Copy      (8 fields): inferred_goal, email, linkedin, social, ads,
                        messaging_framework, strategic_alignment, copy_readiness
  Image     (2 fields): visual_direction, image_prompts (with per-prompt validation)

OUTPUT (Quality Decision - JSON):
  SCENARIO 1: ALL APPROVED (status = 'review_complete'):
    state.status = 'review_complete'
    state.review_output = JSON with all 4 agent reviews + quality scores
    state.next_step = 'proceed_to_publisher'

  SCENARIO 2: REVISION REQUIRED (status = '{agent}_revision_required'):
    state.status = '{agent}_revision_required'
    state.review_feedback = JSON with specific issues + action items
    state.next_step = 'await_{agent}_revision'
    state.{agent}_revision_count = int (max 3)

QUALITY THRESHOLDS:
  - Individual Agent Minimum: 75% (each agent must score ≥75)
  - Overall Campaign Minimum: 80% (weighted average ≥80)
  - Both must pass for approval

REVISION PRIORITY: Research → Strategy → Copy → Image

KEY PRINCIPLE:
Reviewer = LLM-Powered Quality Analyst
- Sends ALL 28 fields to LLM for intelligent quality assessment
- LLM evaluates completeness, coherence, alignment, and strategic fit
- No hardcoded scoring rules - fully dynamic AI quality analysis
- Uses prompt template from utils/prompts/reviewer_prompt.txt
"""

import sys
from pathlib import Path
import json
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from llm import get_llm_client
from utils.prompt_loader import load_prompt
from utils.error_handler import safe_llm_call
from schemas import ReviewerOutput


# ==================== CONSTANTS ====================

MAX_REVISIONS = 3
MIN_QUALITY_SCORE = 80   # Overall minimum: 80%
MIN_AGENT_SCORE = 75     # Per-agent minimum: 75%

REVISION_PRIORITY = ["research", "strategy", "copy", "image"]


# ==================== REVIEWER AGENT FUNCTION ====================

def reviewer_agent(state: CampaignState) -> CampaignState:
    """
    Reviewer Agent - Comprehensive Quality Control (LLM-Powered)

    Args:
        state: CampaignState with research_output, strategy_output,
               copy_output, image_output

    Returns:
        Modified state with review_output, review_feedback, status, next_step

    Process:
    1. Extract all 4 agent outputs from state
    2. Extract campaign metadata for context
    3. Load reviewer prompt template
    4. Send ALL 28 fields to LLM for quality analysis
    5. Parse LLM response to get per-agent scores + issues
    6. Apply threshold logic and determine next action
    7. Update state with review decision
    """

    print("\n" + "=" * 80)
    print("🔍 REVIEWER AGENT ACTIVATED")
    print("=" * 80)

    # ========== STEP 1: READ ALL AGENT OUTPUTS ==========
    print("\n[STEP 1] Reading all agent outputs from state...")
    print("-" * 80)

    if not state.research_output:
        raise ValueError("research_output is required for review")
    if not state.strategy_output:
        raise ValueError("strategy_output is required for review")
    if not state.copy_output:
        raise ValueError("copy_output is required for review")
    if not state.image_output:
        raise ValueError("image_output is required for review")

    try:
        research_data = json.loads(state.research_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse research_output: {e}")

    try:
        strategy_data = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse strategy_output: {e}")

    try:
        copy_data = json.loads(state.copy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse copy_output: {e}")

    try:
        image_data = json.loads(state.image_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"Failed to parse image_output: {e}")

    print(f"✓ Research Output: parsed ({len(state.research_output)} chars)")
    print(f"✓ Strategy Output: parsed ({len(state.strategy_output)} chars)")
    print(f"✓ Copy Output:     parsed ({len(state.copy_output)} chars)")
    print(f"✓ Image Output:    parsed ({len(state.image_output)} chars)")

    # ========== STEP 2: READ CAMPAIGN METADATA ==========
    print("\n[STEP 2] Reading campaign metadata from state...")
    print("-" * 80)

    campaign_name = state.campaign_name or "Unknown Campaign"
    brand_name = state.brand_name or "Unknown Brand"
    brand_voice = state.brand_voice or "professional"
    industry = state.industry or "other"
    primary_goal = state.primary_goal or "awareness"
    brief = state.brief or f"Marketing campaign for {brand_name}"
    channels_list = []
    if state.manager_output:
        try:
            manager_data = json.loads(state.manager_output)
            channels_list = manager_data.get("channels", [])
        except Exception:
            pass
    if not channels_list and state.strategy_output:
        try:
            strategy_data = json.loads(state.strategy_output)
            channels_list = strategy_data.get("execution", {}).get("channels", [])
        except Exception:
            pass
    if not channels_list:
        channels_list = getattr(state, "channels", []) or []
    channels = ', '.join(channels_list) if isinstance(channels_list, list) else str(channels_list)

    print(f"✓ Campaign:     {campaign_name}")
    print(f"✓ Brand:        {brand_name}")
    print(f"✓ Industry:     {industry}")
    print(f"✓ Goal:         {primary_goal}")
    print(f"✓ Brand Voice:  {brand_voice}")
    print(f"✓ Channels:     {channels}")

    # ========== STEP 3: READ REVISION COUNTS ==========
    print("\n[STEP 3] Checking revision history...")
    print("-" * 80)

    research_revision_count = getattr(state, "research_revision_count", 0) or 0
    strategy_revision_count = getattr(state, "strategy_revision_count", 0) or 0
    copy_revision_count = getattr(state, "copy_revision_count", 0) or 0
    image_revision_count = getattr(state, "image_revision_count", 0) or 0

    print(f"✓ Research revisions:  {research_revision_count}/{MAX_REVISIONS}")
    print(f"✓ Strategy revisions:  {strategy_revision_count}/{MAX_REVISIONS}")
    print(f"✓ Copy revisions:      {copy_revision_count}/{MAX_REVISIONS}")
    print(f"✓ Image revisions:     {image_revision_count}/{MAX_REVISIONS}")

    # ========== STEP 4: EXTRACT KEY FIELDS FOR DISPLAY ==========
    print("\n[STEP 4] Summarizing outputs for LLM review...")
    print("-" * 80)

    # Research summary
    market = research_data.get("market_analysis", {})
    competitors = research_data.get("competitor_analysis", {})
    audience = research_data.get("audience_insights", {})
    print(f"✓ Research — TAM: {market.get('total_addressable_market', 'N/A')} | "
          f"Competitors: {len(competitors.get('top_competitors', []))} | "
          f"Pain Points: {len(audience.get('pain_points', []))}")

    # Strategy summary
    print(f"✓ Strategy — Positioning: {str(strategy_data.get('positioning', 'N/A'))[:50]}... | "
          f"Goal: {strategy_data.get('inferred_goal', 'N/A')} | "
          f"Segments: {len(strategy_data.get('audience_segments', []))}")

    # Copy summary
    copy_channels = [
        k for k in copy_data.keys()
        if k not in ("inferred_goal", "messaging_framework", "strategic_alignment", "copy_readiness")
    ]
    print(f"✓ Copy — Channels: {', '.join(copy_channels)} | "
          f"Goal: {copy_data.get('inferred_goal', 'N/A')}")

    # Image summary
    image_prompts = image_data.get("image_prompts", [])
    print(f"✓ Image — Prompts: {len(image_prompts)} | "
          f"Direction: {str(image_data.get('visual_direction', 'N/A'))[:50]}...")

    # ========== STEP 5: REVIEW WITH LLM ==========
    print("\n[STEP 5] Sending ALL 28 fields to LLM for quality analysis...")
    print("-" * 80)
    print("🔍 AI Quality Analyst reviewing campaign outputs...")

    # Initialize LLM client
    llm = get_llm_client()

    # Load reviewer prompt and format with ALL agent outputs
    prompt = load_prompt(
        "reviewer",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        industry=industry,
        primary_goal=primary_goal,
        brief=brief,
        channels=channels,
        # Quality thresholds
        min_agent_score=MIN_AGENT_SCORE,
        min_quality_score=MIN_QUALITY_SCORE,
        max_revisions=MAX_REVISIONS,
        # Revision history
        research_revision_count=research_revision_count,
        strategy_revision_count=strategy_revision_count,
        copy_revision_count=copy_revision_count,
        image_revision_count=image_revision_count,
        # All agent outputs (full JSON for LLM to analyze)
        research_output=json.dumps(research_data, indent=2),
        strategy_output=json.dumps(strategy_data, indent=2),
        copy_output=json.dumps(copy_data, indent=2),
        image_output=json.dumps(image_data, indent=2)
    )

    print("   Querying LLM with structured output...")

    # Get structured LLM response with error handling
    review_analysis, state = safe_llm_call(
        state,
        "Reviewer",
        lambda: llm.generate_structured(prompt, ReviewerOutput, temperature=0.3, max_tokens=2000)
    )
    
    if review_analysis is None:
        return state  # Error already logged in state

    # ========== STEP 6: EXTRACT SCORES AND DECISIONS ==========
    print("\n[STEP 6] Processing quality scores and decisions...")
    print("-" * 80)

    # Extract per-agent reviews
    research_review = review_analysis.research_review
    strategy_review = review_analysis.strategy_review
    copy_review = review_analysis.copy_review
    image_review = review_analysis.image_review
    overall = review_analysis.overall

    research_score = research_review.score
    strategy_score = strategy_review.score
    copy_score = copy_review.score
    image_score = image_review.score
    overall_score = overall.quality_score

    # ========== STEP 6.5: POST-PROCESSING VALIDATION ==========
    # Add explicit validation checks for critical alignments that LLM might miss
    _add_explicit_validation_checks(
        strategy_data, copy_data, image_data,
        strategy_review, copy_review, image_review
    )

    # IMPORTANT: approved should be based on threshold, not LLM judgment
    # Override LLM's approved field with threshold-based logic
    research_approved = research_score >= MIN_AGENT_SCORE
    strategy_approved = strategy_score >= MIN_AGENT_SCORE
    copy_approved = copy_score >= MIN_AGENT_SCORE
    image_approved = image_score >= MIN_AGENT_SCORE

    # ========== STEP 7: DISPLAY QUALITY SCORES ==========
    print("✅ Quality analysis complete!")

    print("\n📊 Individual Agent Scores:")
    print(f"   Research:  {research_score}/100  {'✅' if research_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if research_approved else 'Issues Found'})")
    print(f"   Strategy:  {strategy_score}/100  {'✅' if strategy_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if strategy_approved else 'Issues Found'})")
    print(f"   Copy:      {copy_score}/100  {'✅' if copy_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if copy_approved else 'Issues Found'})")
    print(f"   Image:     {image_score}/100  {'✅' if image_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if image_approved else 'Issues Found'})")
    print(f"\n📈 Overall Quality Score: {overall_score}/100 "
          f"(Threshold: {MIN_QUALITY_SCORE}) "
          f"{'✅' if overall_score >= MIN_QUALITY_SCORE else '❌'}")

    # Print issues per agent
    for agent_name, agent_review in [
        ("Research", research_review),
        ("Strategy", strategy_review),
        ("Copy", copy_review),
        ("Image", image_review)
    ]:
        issues = agent_review.issues
        if issues:
            print(f"\n   ⚠️  {agent_name} Issues:")
            for issue in issues[:3]:
                print(f"      • {issue}")
            if len(issues) > 3:
                print(f"      ... and {len(issues) - 3} more")

    # ========== STEP 8: APPLY THRESHOLD LOGIC ==========
    print("\n[STEP 8] Applying threshold logic and determining action...")
    print("-" * 80)

    all_approved = research_approved and strategy_approved and copy_approved and image_approved
    agents_meet_threshold = all([
        research_score >= MIN_AGENT_SCORE,
        strategy_score >= MIN_AGENT_SCORE,
        copy_score >= MIN_AGENT_SCORE,
        image_score >= MIN_AGENT_SCORE
    ])
    meets_overall_threshold = overall_score >= MIN_QUALITY_SCORE

    # ========== STEP 9: BUILD REVIEW OUTPUT ==========
    # Override LLM's approved field with threshold-based logic for consistency
    research_review_dict = research_review.model_dump()
    research_review_dict["approved"] = research_approved
    
    strategy_review_dict = strategy_review.model_dump()
    strategy_review_dict["approved"] = strategy_approved
    
    copy_review_dict = copy_review.model_dump()
    copy_review_dict["approved"] = copy_approved
    
    image_review_dict = image_review.model_dump()
    image_review_dict["approved"] = image_approved
    
    review_output = {
        "status": "approved" if (all_approved and agents_meet_threshold and meets_overall_threshold) else "revision_required",
        "research_review": research_review_dict,
        "strategy_review": strategy_review_dict,
        "copy_review": copy_review_dict,
        "image_review": image_review_dict,
        "overall_quality_score": overall_score,
        "individual_threshold_met": agents_meet_threshold,
        "overall_threshold_met": meets_overall_threshold,
        "reviewed_at": datetime.now().isoformat(),
        "reviewer": "Reviewer Agent (LLM-Powered)"
    }

    # ========== STEP 11: UPDATE STATE ==========
    print("\n[STEP 9] Updating state with review decision...")
    print("-" * 80)

    if all_approved and agents_meet_threshold and meets_overall_threshold:
        # ✅ ALL APPROVED
        print(f"✅ ALL OUTPUTS APPROVED - Ready for Publication")
        print(f"   All agents meet individual threshold (≥{MIN_AGENT_SCORE})")
        print(f"   Overall quality: {overall_score}/100 (≥{MIN_QUALITY_SCORE})")

        state.status = "review_complete"
        state.review_output = json.dumps(review_output, indent=2)
        state.next_step = "proceed_to_publisher"
        state.review_feedback = None

    else:
        # ⚠️ REVISION REQUIRED
        # Determine which agent to send back (priority: research → strategy → copy → image)
        revision_target = _determine_revision_target(
            research_review, strategy_review, copy_review, image_review,
            research_score, strategy_score, copy_score, image_score,
            all_approved, agents_meet_threshold, meets_overall_threshold
        )

        agent_key = revision_target["agent_key"]  # e.g., "research", "strategy"
        revision_count_attr = f"{agent_key}_revision_count"

        # Get current revision count
        current_count = getattr(state, revision_count_attr, 0) or 0

        if current_count >= MAX_REVISIONS:
            # Max revisions reached — force approve and proceed
            print(f"\n⚠️  Max revisions ({MAX_REVISIONS}) reached for {revision_target['agent_name']}")
            print(f"   Proceeding to publisher despite quality issues")

            state.status = "review_complete"
            state.review_output = json.dumps(review_output, indent=2)
            state.next_step = "proceed_to_publisher"
            state.review_feedback = None

        else:
            # Send back for revision
            new_count = current_count + 1
            setattr(state, revision_count_attr, new_count)

            print(f"\n⚠️  REVISION REQUIRED: {revision_target['agent_name']}")
            print(f"   Reason: {revision_target['reason']}")
            print(f"   Issues: {len(revision_target['issues'])}")
            print(f"   Revision #{new_count}/{MAX_REVISIONS}")

            for issue in revision_target["issues"][:5]:
                print(f"   • {issue}")

            review_feedback = {
                "agent": revision_target["agent_name"],
                "agent_key": agent_key,
                "status": revision_target["status"],
                "reason": revision_target["reason"],
                "issues": revision_target["issues"],
                "action_items": revision_target["action_items"],
                "next_step": revision_target["next_step"],
                "revision_number": new_count,
                "max_revisions": MAX_REVISIONS
            }

            state.status = revision_target["status"]
            state.review_output = json.dumps(review_output, indent=2)
            state.review_feedback = json.dumps(review_feedback, indent=2)
            state.next_step = revision_target["next_step"]

    print(f"\n✅ State updated:")
    print(f"   status:    {state.status}")
    print(f"   next_step: {state.next_step}")

    print("\n" + "=" * 80)
    print("✅ REVIEWER AGENT COMPLETE")
    print("=" * 80)

    return state


# ==================== HELPER FUNCTIONS ====================

def _add_explicit_validation_checks(
    strategy_data: dict,
    copy_data: dict,
    image_data: dict,
    strategy_review,
    copy_review,
    image_review
) -> None:
    """
    Add explicit validation checks for critical alignments.
    Modifies review objects in-place by adding issues when mismatches found.
    
    This catches specific validation failures that the LLM might miss,
    especially when overall content quality is high.
    """
    
    # Check 1: Copy inferred_goal must match Strategy inferred_goal
    strategy_goal = strategy_data.get("inferred_goal", "")
    copy_goal = copy_data.get("inferred_goal", "")
    
    if strategy_goal and copy_goal and strategy_goal != copy_goal:
        issue = f"Copy inferred_goal '{copy_goal}' doesn't match strategy inferred_goal '{strategy_goal}'"
        if issue not in copy_review.issues:
            copy_review.issues.append(issue)
            if not copy_review.action_items:
                copy_review.action_items = []
            copy_review.action_items.append(f"Change copy inferred_goal to '{strategy_goal}' to match strategy")
            
    # Check 1b: Strategy inferred_goal must be valid
    valid_goals = {"awareness", "lead_gen", "sales", "retention"}
    if strategy_goal and strategy_goal not in valid_goals:
        issue = f"Strategy inferred_goal '{strategy_goal}' is invalid. Must be one of: {', '.join(valid_goals)}"
        if issue not in strategy_review.issues:
            strategy_review.issues.append(issue)
            if not strategy_review.action_items:
                strategy_review.action_items = []
            strategy_review.action_items.append("Change strategy inferred_goal to one of awareness, lead_gen, sales, retention")
            # Force score below threshold if invalid
            strategy_review.score = min(strategy_review.score, 60)
            
    # Check 1c: Email subject must not exceed 60 characters
    email_data = copy_data.get("email", {})
    if email_data and isinstance(email_data, dict):
        subject = email_data.get("subject", "")
        if subject and len(subject) > 60:
            issue = f"Email subject too long. Must be under 60 characters."
            if issue not in copy_review.issues:
                copy_review.issues.append(issue)
                if not copy_review.action_items:
                    copy_review.action_items = []
                copy_review.action_items.append("Shorten email subject to be under 60 characters")
                # Force score below threshold if subject is too long
                copy_review.score = min(copy_review.score, 65)

    # Check 2: Image prompts array must not be empty
    image_prompts = image_data.get("image_prompts", [])
    if not image_prompts or len(image_prompts) == 0:
        issue = "image_prompts array is empty - no visual assets defined"
        if issue not in image_review.issues:
            image_review.issues.append(issue)
            if not image_review.action_items:
                image_review.action_items = []
            image_review.action_items.append("Create at least 3 image prompts for key campaign deliverables")


def _determine_revision_target(
    research_review,
    strategy_review,
    copy_review,
    image_review,
    research_score: int,
    strategy_score: int,
    copy_score: int,
    image_score: int,
    all_approved: bool,
    agents_meet_threshold: bool,
    meets_overall_threshold: bool
) -> dict:
    """
    Determine which agent needs revision.
    Priority order: Research → Strategy → Copy → Image

    If explicit failures exist → use priority order.
    If only threshold failures → target the lowest scoring agent.
    """

    agent_map = {
        "research": {
            "agent_name": "Research Agent",
            "status": "research_revision_required",
            "next_step": "await_research_revision",
            "review": research_review,
            "score": research_score
        },
        "strategy": {
            "agent_name": "Strategy Agent",
            "status": "strategy_revision_required",
            "next_step": "await_strategy_revision",
            "review": strategy_review,
            "score": strategy_score
        },
        "copy": {
            "agent_name": "Copywriter Agent",
            "status": "copy_revision_required",
            "next_step": "await_copy_revision",
            "review": copy_review,
            "score": copy_score
        },
        "image": {
            "agent_name": "Image Prompt Agent",
            "status": "image_revision_required",
            "next_step": "await_image_revision",
            "review": image_review,
            "score": image_score
        }
    }

    # Check for explicit failures in priority order
    if not all_approved:
        for agent_key in REVISION_PRIORITY:
            agent_info = agent_map[agent_key]
            if not agent_info["review"].approved:
                return {
                    "agent_key": agent_key,
                    "agent_name": agent_info["agent_name"],
                    "status": agent_info["status"],
                    "next_step": agent_info["next_step"],
                    "reason": f"Quality issues found: {agent_info['review'].feedback}",
                    "issues": agent_info["review"].issues,
                    "action_items": agent_info["review"].action_items
                }

    # No explicit failures but thresholds not met → target lowest scorer
    scores = [(agent_map[k]["score"], k) for k in REVISION_PRIORITY]
    scores.sort(key=lambda x: x[0])
    lowest_score, lowest_key = scores[0]
    agent_info = agent_map[lowest_key]

    return {
        "agent_key": lowest_key,
        "agent_name": agent_info["agent_name"],
        "status": agent_info["status"],
        "next_step": agent_info["next_step"],
        "reason": f"Score {lowest_score}/100 below threshold ({MIN_AGENT_SCORE}). Quality improvement needed.",
        "issues": agent_info["review"].issues if agent_info["review"].issues else [
            f"Quality score {lowest_score}/100 needs improvement to meet minimum threshold of {MIN_AGENT_SCORE}"
        ],
        "action_items": agent_info["review"].action_items if agent_info["review"].action_items else [
            "Improve content quality and completeness",
            "Ensure all required fields are present and well-developed",
            "Strengthen alignment with campaign strategy"
        ]
    }


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("⚠️  This is the agent module file.")
    print("    To test the Reviewer Agent, run: python examples/run_reviewer.py")
    print("    To customize input, edit: examples/inputs/campaign_input.json")
    print("=" * 80)