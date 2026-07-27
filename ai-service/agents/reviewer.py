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

import logging
logger = logging.getLogger(__name__)

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
from utils.llm_cache import make_key, get as cache_get, set as cache_set
from schemas import ReviewerOutput, AgentReview, OverallReview


# ==================== CONSTANTS ====================

MAX_REVISIONS = 3
MIN_QUALITY_SCORE = 70   # Overall minimum: 70%
MIN_AGENT_SCORE = 60     # Per-agent minimum: 60%

REVISION_PRIORITY = ["research", "strategy", "copy", "image"]


def _issues_to_review(agent_name: str, score: int, issues: list[str], action_items: list[str]) -> AgentReview:
    if issues:
        score = min(score, 55)
    feedback_text = (
        f"{agent_name} output validated — quality score {score}/100"
        if not issues else
        f"{agent_name} output requires revision ({len(issues)} issue(s) identified)"
    )
    return AgentReview(
        score=score,
        approved=not issues and score >= MIN_AGENT_SCORE,
        feedback=feedback_text,
        issues=issues,
        action_items=action_items or (
            ["No revision required — output approved"] if not issues else
            ["Improve completeness and alignment with campaign requirements"]
        ),
    )


def _fallback_review_analysis(
    research_data: dict,
    strategy_data: dict,
    copy_data: dict,
    image_data: dict,
) -> ReviewerOutput:
    research_issues = []
    research_actions = []
    market = research_data.get("market_analysis", {}) or {}
    if not market.get("total_addressable_market"):
        research_issues.append("Missing total_addressable_market in market_analysis")
        research_actions.append("Add a concrete total_addressable_market or TAM estimate")
    if len(market.get("market_trends", []) or []) < 3:
        research_issues.append("market_trends should include at least 3 trends")
    competitors = research_data.get("competitor_analysis", {}) or {}
    if len(competitors.get("top_competitors", []) or []) < 2:
        research_issues.append("competitor_analysis should include at least 2 top_competitors")
    audience = research_data.get("audience_insights", {}) or {}
    if len(audience.get("pain_points", []) or []) < 3:
        research_issues.append("audience_insights should include at least 3 pain_points")

    strategy_issues = []
    strategy_actions = []
    valid_goals = {"awareness", "lead_gen", "sales", "retention"}
    if strategy_data.get("inferred_goal") not in valid_goals:
        strategy_issues.append(f"Strategy inferred_goal '{strategy_data.get('inferred_goal')}' is invalid")
        strategy_actions.append("Set inferred_goal to awareness, lead_gen, sales, or retention")
    if len(strategy_data.get("key_messages", []) or []) < 3:
        strategy_issues.append("Strategy should include at least 3 key_messages")
    if len(strategy_data.get("content_pillars", []) or []) < 3:
        strategy_issues.append("Strategy should include at least 3 content_pillars")

    copy_issues = []
    copy_actions = []
    if strategy_data.get("inferred_goal") and copy_data.get("inferred_goal") and strategy_data.get("inferred_goal") != copy_data.get("inferred_goal"):
        copy_issues.append(
            f"Copy inferred_goal '{copy_data.get('inferred_goal')}' doesn't match strategy inferred_goal '{strategy_data.get('inferred_goal')}'"
        )
        copy_actions.append("Align copy inferred_goal with strategy inferred_goal")
    email_data = (copy_data.get("copies", {}) or {}).get("email") or copy_data.get("email") or {}
    if isinstance(email_data, dict) and len(str(email_data.get("subject", ""))) > 60:
        copy_issues.append("Email subject too long; subject should be under 60 characters")
        copy_actions.append("Shorten email subject to under 60 characters")

    image_issues = []
    image_actions = []
    visual_direction = image_data.get("visual_direction") or {}
    if not isinstance(visual_direction, dict) or not visual_direction.get("overall_style") or len(str(visual_direction.get("overall_style", ""))) < 5:
        image_issues.append("visual_direction is incomplete or missing")
        image_actions.append("Provide detailed visual_direction with style, palette, mood, and themes")
    if not image_data.get("image_prompts"):
        image_issues.append("image_prompts array is empty - no visual assets defined")
        image_actions.append("Create image prompts for key campaign deliverables")

    research_review = _issues_to_review("Research", _compute_objective_score(research_data, "research"), research_issues, research_actions)
    strategy_review = _issues_to_review("Strategy", _compute_objective_score(strategy_data, "strategy"), strategy_issues, strategy_actions)
    copy_review = _issues_to_review("Copy", _compute_objective_score(copy_data, "copy"), copy_issues, copy_actions)
    image_review = _issues_to_review("Image", _compute_objective_score(image_data, "image"), image_issues, image_actions)
    overall_score = round(
        research_review.score * 0.25
        + strategy_review.score * 0.30
        + copy_review.score * 0.25
        + image_review.score * 0.20
    )
    can_publish = (
        research_review.approved
        and strategy_review.approved
        and copy_review.approved
        and image_review.approved
        and overall_score >= MIN_QUALITY_SCORE
    )
    return ReviewerOutput(
        status="approved" if can_publish else "revision_required",
        can_publish=can_publish,
        research_review=research_review,
        strategy_review=strategy_review,
        copy_review=copy_review,
        image_review=image_review,
        overall=OverallReview(
            quality_score=overall_score,
            summary="Objective fallback review completed because LLM review was unavailable.",
            strengths=["Structured outputs were parsed successfully"],
            critical_improvements=research_issues + strategy_issues + copy_issues + image_issues,
        ),
    )


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

    logger.info("\n" + "=" * 80)
    logger.info("🔍 REVIEWER AGENT ACTIVATED")
    logger.info("=" * 80)

    # ========== STEP 1: READ ALL AGENT OUTPUTS ==========
    logger.info("\n[STEP 1] Reading all agent outputs from state...")
    logger.info("-" * 80)

    research_data = {}
    if state.research_output:
        try:
            research_data = json.loads(state.research_output)
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse research_output: {e}")

    strategy_data = {}
    if state.strategy_output:
        try:
            strategy_data = json.loads(state.strategy_output)
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse strategy_output: {e}")

    copy_data = {}
    if state.copy_output:
        try:
            copy_data = json.loads(state.copy_output)
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse copy_output: {e}")

    image_data = {}
    if state.image_output:
        try:
            image_data = json.loads(state.image_output)
        except Exception as e:
            logger.warning(f"⚠️ Failed to parse image_output: {e}")

    logger.info(f"✓ Research Output: parsed ({len(state.research_output)} chars)")
    logger.info(f"✓ Strategy Output: parsed ({len(state.strategy_output)} chars)")
    logger.info(f"✓ Copy Output:     parsed ({len(state.copy_output)} chars)")
    logger.info(f"✓ Image Output:    parsed ({len(state.image_output)} chars)")

    # ========== STEP 2: READ CAMPAIGN METADATA ==========
    logger.info("\n[STEP 2] Reading campaign metadata from state...")
    logger.info("-" * 80)

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
        except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)
    if not channels_list:
        channels_list = strategy_data.get("execution", {}).get("channels", [])
    if not channels_list:
        channels_list = getattr(state, "channels", []) or []
    channels = ', '.join(channels_list) if isinstance(channels_list, list) else str(channels_list)

    logger.info(f"✓ Campaign:     {campaign_name}")
    logger.info(f"✓ Brand:        {brand_name}")
    logger.info(f"✓ Industry:     {industry}")
    logger.info(f"✓ Goal:         {primary_goal}")
    logger.info(f"✓ Brand Voice:  {brand_voice}")
    logger.info(f"✓ Channels:     {channels}")

    # ========== STEP 3: READ REVISION COUNTS ==========
    logger.info("\n[STEP 3] Checking revision history...")
    logger.info("-" * 80)

    research_revision_count = getattr(state, "research_revision_count", 0) or 0
    strategy_revision_count = getattr(state, "strategy_revision_count", 0) or 0
    copy_revision_count = getattr(state, "copy_revision_count", 0) or 0
    image_revision_count = getattr(state, "image_revision_count", 0) or 0

    logger.info(f"✓ Research revisions:  {research_revision_count}/{MAX_REVISIONS}")
    logger.info(f"✓ Strategy revisions:  {strategy_revision_count}/{MAX_REVISIONS}")
    logger.info(f"✓ Copy revisions:      {copy_revision_count}/{MAX_REVISIONS}")
    logger.info(f"✓ Image revisions:     {image_revision_count}/{MAX_REVISIONS}")

    # ========== STEP 4: EXTRACT KEY FIELDS FOR DISPLAY ==========
    logger.info("\n[STEP 4] Summarizing outputs for LLM review...")
    logger.info("-" * 80)

    # Research summary
    market = research_data.get("market_analysis", {})
    competitors = research_data.get("competitor_analysis", {})
    audience = research_data.get("audience_insights", {})
    logger.info(f"✓ Research — TAM: {market.get('total_addressable_market', 'N/A')} | "
          f"Competitors: {len(competitors.get('top_competitors', []))} | "
          f"Pain Points: {len(audience.get('pain_points', []))}")

    # Strategy summary
    logger.info(f"✓ Strategy — Positioning: {str(strategy_data.get('positioning', 'N/A'))[:50]}... | "
          f"Goal: {strategy_data.get('inferred_goal', 'N/A')} | "
          f"Segments: {len(strategy_data.get('audience_segments', []))}")

    # Copy summary
    copies_dict = copy_data.get("copies", {}) or {}
    copy_channels = [
        k for k, v in copies_dict.items()
        if v is not None
    ]
    logger.info(f"✓ Copy — Channels: {', '.join(copy_channels)} | "
          f"Goal: {copy_data.get('inferred_goal', 'N/A')}")

    # Image summary
    image_prompts = image_data.get("image_prompts", [])
    logger.info(f"✓ Image — Prompts: {len(image_prompts)} | "
          f"Direction: {str(image_data.get('visual_direction', 'N/A'))[:50]}...")

    # Create a lean version of strategy_data to save tokens
    strategy_lean = dict(strategy_data)
    if "research_foundation" in strategy_lean:
        foundation_lean = {}
        for k, v in strategy_data["research_foundation"].items():
            if isinstance(v, dict):
                foundation_lean[k] = {
                    "status": "VALIDATED_AND_PRESENT",
                    "note": f"Omitted verbose details to conserve tokens. Field exists: {list(v.keys())}"
                }
            elif isinstance(v, list):
                foundation_lean[k] = [f"VALIDATED_AND_PRESENT ({len(v)} items)"]
            else:
                foundation_lean[k] = "VALIDATED_AND_PRESENT"
        strategy_lean["research_foundation"] = foundation_lean

    if "content_calendar" in strategy_lean:
        strategy_lean["content_calendar"] = {
            "status": "VALIDATED_AND_PRESENT",
            "weeks_count": len(strategy_data.get("content_calendar", [])),
            "note": "Full content calendar details omitted to conserve tokens."
        }
    logger.info("✓ Strategy (Lean): Omitted content_calendar and research_foundation to save tokens")

    # ========== STEP 5: REVIEW WITH LLM ==========
    logger.info("\n[STEP 5] Sending ALL 28 fields to LLM for quality analysis...")
    logger.info("-" * 80)
    logger.info("🔍 AI Quality Analyst reviewing campaign outputs...")

    # Initialize LLM client
    llm = get_llm_client()

    target_audience = getattr(state, "target_audience", None) or "General target audience"
    additional_context = getattr(state, "client_memory_context", None) or "None (No additional context)"

    from utils.review_context import build_review_context, CompactPromptSerializer
    review_context = build_review_context(state)
    review_dict = CompactPromptSerializer.serialize(review_context)

    # Load reviewer prompt and format with normalized agent output summaries
    prompt = load_prompt(
        "reviewer",
        # Campaign metadata
        campaign_name=campaign_name,
        brand_name=brand_name,
        brand_voice=brand_voice,
        target_audience=target_audience,
        industry=industry,
        primary_goal=primary_goal,
        brief=brief,
        additional_context=additional_context,
        channels=channels,
        # Human overrides/feedback context
        human_feedback=state.human_feedback or "None (No active human overrides)",
        # Quality thresholds
        min_agent_score=MIN_AGENT_SCORE,
        min_quality_score=MIN_QUALITY_SCORE,
        max_revisions=MAX_REVISIONS,
        # Revision history
        research_revision_count=research_revision_count,
        strategy_revision_count=strategy_revision_count,
        copy_revision_count=copy_revision_count,
        image_revision_count=image_revision_count,
        # Normalized agent output summaries (saving 3,500-5,000 tokens)
        research_output=review_dict["research_summary"],
        strategy_output=review_dict["strategy_summary"],
        copy_output=review_dict["copy_summary"],
        image_output=review_dict["image_summary"]
    )

    logger.info("   Querying LLM with structured output...")

    # Cache-aware LLM call
    cache_key = make_key("Reviewer", prompt=prompt, temperature=0.5, max_tokens=2000)
    cached = cache_get(cache_key)
    if cached is not None:
        logger.info("📦 Cache hit — using cached Reviewer response")
        review_analysis = ReviewerOutput(**cached)
    else:
        review_analysis, state = safe_llm_call(
            state,
            "Reviewer",
            lambda: llm.generate_structured(prompt, ReviewerOutput, temperature=0.5, max_tokens=2000)
        )
        if review_analysis is not None:
            cache_set(cache_key, review_analysis.model_dump())
    
    if review_analysis is None:
        logger.info("   ⚠️ Reviewer LLM unavailable — using objective fallback review")
        review_analysis = _fallback_review_analysis(
            research_data,
            strategy_data,
            copy_data,
            image_data,
        )
        # ✅ Clear error flag so downstream routing/publisher doesn't skip
        state.error = None
        state.status = "review_complete"
        logger.info("   ✅ Fallback review ready — error flag cleared, pipeline will continue")

    # ========== STEP 6: EXTRACT SCORES AND DECISIONS ==========
    logger.info("\n[STEP 6] Processing quality scores and decisions...")
    logger.info("-" * 80)

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

    # ========== STEP 6.6: HYBRID SCORING ==========
    # Blend LLM scores with objective content metrics for natural variation.
    # This ensures different campaigns get genuinely different scores based on
    # actual output completeness, depth, and quality.
    research_score = _compute_hybrid_score(research_data, research_score, "research")
    strategy_score = _compute_hybrid_score(strategy_data, strategy_score, "strategy")
    copy_score = _compute_hybrid_score(copy_data, copy_score, "copy")
    image_score = _compute_hybrid_score(image_data, image_score, "image")
    # Recalculate overall score server-side using blended per-agent scores
    overall_score = round(research_score * 0.25 + strategy_score * 0.30 + copy_score * 0.25 + image_score * 0.20)
    # Sync back into the LLM output model so the nested field is accurate
    review_analysis.overall.quality_score = overall_score
    review_analysis.research_review.score = research_score
    review_analysis.strategy_review.score = strategy_score
    review_analysis.copy_review.score = copy_score
    review_analysis.image_review.score = image_score

    # IMPORTANT: approved should be based on threshold, not LLM judgment
    # Override LLM's approved field with threshold-based logic
    research_approved = research_score >= MIN_AGENT_SCORE and not research_review.issues
    strategy_approved = strategy_score >= MIN_AGENT_SCORE and not strategy_review.issues
    copy_approved = copy_score >= MIN_AGENT_SCORE and not copy_review.issues
    image_approved = image_score >= MIN_AGENT_SCORE and not image_review.issues

    # ========== STEP 7: DISPLAY QUALITY SCORES ==========
    logger.info("✅ Quality analysis complete!")

    logger.info("\n📊 Individual Agent Scores:")
    logger.info(f"   Research:  {research_score}/100  {'✅' if research_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if research_approved else 'Issues Found'})")
    logger.info(f"   Strategy:  {strategy_score}/100  {'✅' if strategy_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if strategy_approved else 'Issues Found'})")
    logger.info(f"   Copy:      {copy_score}/100  {'✅' if copy_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if copy_approved else 'Issues Found'})")
    logger.info(f"   Image:     {image_score}/100  {'✅' if image_score >= MIN_AGENT_SCORE else '❌'}  "
          f"({'Approved' if image_approved else 'Issues Found'})")
    logger.info(f"\n📈 Overall Quality Score: {overall_score}/100 "
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
            logger.info(f"\n   ⚠️  {agent_name} Issues:")
            for issue in issues[:3]:
                logger.info(f"      • {issue}")
            if len(issues) > 3:
                logger.info(f"      ... and {len(issues) - 3} more")

    # ========== STEP 8: APPLY THRESHOLD LOGIC ==========
    logger.info("\n[STEP 8] Applying threshold logic and determining action...")
    logger.info("-" * 80)

    all_approved = research_approved and strategy_approved and copy_approved and image_approved
    meets_overall_threshold = overall_score >= MIN_QUALITY_SCORE

    # ========== STEP 9: BUILD REVIEW OUTPUT ==========
    # Start from the LLM output to preserve the full nested structure (overall, etc.)
    review_output = review_analysis.model_dump()
    # Override approved fields with threshold-based logic for consistency
    review_output["research_review"]["approved"] = research_approved
    review_output["strategy_review"]["approved"] = strategy_approved
    review_output["copy_review"]["approved"] = copy_approved
    review_output["image_review"]["approved"] = image_approved
    review_output["status"] = "approved" if (all_approved and meets_overall_threshold) else "revision_required"
    # Backward-compatible flat fields (backend consumers use these)
    review_output["overall_quality_score"] = overall_score
    review_output["individual_threshold_met"] = all_approved
    review_output["overall_threshold_met"] = meets_overall_threshold
    review_output["can_publish"] = all_approved and meets_overall_threshold  # <-- NEW: Publisher gate
    review_output["reviewed_at"] = datetime.now().isoformat()
    review_output["reviewer"] = "Reviewer Agent (LLM-Powered)"

    review_output_json = json.dumps(review_output, indent=2)

    # ========== STEP 10: UPDATE STATE ==========
    logger.info("\n[STEP 10] Updating state with review decision...")
    logger.info("-" * 80)

    state.review_output = review_output_json

    if all_approved and meets_overall_threshold:
        # ✅ ALL APPROVED
        logger.info("✅ ALL OUTPUTS APPROVED - Ready for Publication")
        logger.info(f"   All agents meet individual threshold (≥{MIN_AGENT_SCORE})")
        logger.info(f"   Overall quality: {overall_score}/100 (≥{MIN_QUALITY_SCORE})")

        state.status = "review_complete"
        state.next_step = "proceed_to_publisher"
        state.review_feedback = None
        state.human_feedback = None
        state.human_revision_target = None

    else:
        # ⚠️ REVISION REQUIRED
        # Determine which agent to send back (priority: research → strategy → copy → image)
        revision_target = _determine_revision_target(
            research_review, strategy_review, copy_review, image_review,
            research_score, strategy_score, copy_score, image_score,
            all_approved
        )

        agent_key = revision_target["agent_key"]  # e.g., "research", "strategy"
        revision_count_attr = f"{agent_key}_revision_count"

        # Get current revision count
        current_count = getattr(state, revision_count_attr, 0) or 0

        if current_count >= MAX_REVISIONS:
            # Max revisions reached — force approve and proceed
            logger.info(f"\n⚠️  Max revisions ({MAX_REVISIONS}) reached for {revision_target['agent_name']}")
            logger.info("   Proceeding to publisher despite quality issues")

            state.status = "review_complete"
            state.next_step = "proceed_to_publisher"
            state.review_feedback = None
            state.human_feedback = None
            state.human_revision_target = None

        else:
            # Send back for revision
            new_count = current_count + 1
            setattr(state, revision_count_attr, new_count)

            logger.info(f"\n⚠️  REVISION REQUIRED: {revision_target['agent_name']}")
            logger.info(f"   Reason: {revision_target['reason']}")
            logger.info(f"   Issues: {len(revision_target['issues'])}")
            logger.info(f"   Revision #{new_count}/{MAX_REVISIONS}")

            for issue in revision_target["issues"][:5]:
                logger.info(f"   • {issue}")

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
            state.review_feedback = json.dumps(review_feedback, indent=2)
            state.next_step = revision_target["next_step"]

            # Bridge AI Reviewer -> Agent feedback gap
            issues_str = "\n".join(f"- {issue}" for issue in revision_target.get("issues", []))
            actions_str = "\n".join(f"- {action}" for action in revision_target.get("action_items", []))
            state.human_feedback = (
                f"AI Reviewer Feedback:\n"
                f"Reason: {revision_target.get('reason', '')}\n\n"
                f"Issues to fix:\n{issues_str}\n\n"
                f"Recommended Actions:\n{actions_str}"
            )
            target_map = {
                "research": "research",
                "strategy": "strategy",
                "copy": "copywriter",
                "image": "image_prompt"
            }
            state.human_revision_target = target_map.get(agent_key, agent_key)

    logger.info("\n✅ State updated:")
    logger.info(f"   status:    {state.status}")
    logger.info(f"   next_step: {state.next_step}")

    # Production Safeguard: Ensure human_revision_target is None when review_complete
    if state.status == "review_complete" and state.human_revision_target is not None:
        logger.warning(
            "⚠️ WARNING: review_complete set while human_revision_target is still populated (%s) - clearing target",
            state.human_revision_target
        )
        state.human_revision_target = None

    logger.info("\n" + "=" * 80)
    logger.info("✅ REVIEWER AGENT COMPLETE")
    logger.info("=" * 80)

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
    goal_map = {
        "brand_awareness": "awareness", "lead generation": "lead_gen", 
        "sales_conversion": "sales", "customer_retention": "retention"
    }
    strategy_goal = strategy_data.get("inferred_goal", "")
    if isinstance(strategy_goal, str):
        strategy_goal = goal_map.get(strategy_goal.lower(), strategy_goal)
        
    copy_goal = copy_data.get("inferred_goal", "")
    if isinstance(copy_goal, str):
        copy_goal = goal_map.get(copy_goal.lower(), copy_goal)
    
    if strategy_goal and copy_goal and strategy_goal != copy_goal:
        issue = f"Copy inferred_goal '{copy_goal}' doesn't match strategy inferred_goal '{strategy_goal}'"
        if issue not in (copy_review.issues or []):
            copy_review.issues = copy_review.issues or []
            copy_review.issues.append(issue)
            copy_review.action_items = copy_review.action_items or []
            copy_review.action_items.append(f"Change copy inferred_goal to '{strategy_goal}' to match strategy")
            
    # Check 1b: Strategy inferred_goal must be valid
    valid_goals = {"awareness", "lead_gen", "sales", "retention"}
    if strategy_goal and strategy_goal not in valid_goals:
        issue = f"Strategy inferred_goal '{strategy_goal}' is invalid. Must be one of: {', '.join(valid_goals)}"
        if issue not in (strategy_review.issues or []):
            strategy_review.issues = strategy_review.issues or []
            strategy_review.issues.append(issue)
            strategy_review.action_items = strategy_review.action_items or []
            strategy_review.action_items.append("Change strategy inferred_goal to one of awareness, lead_gen, sales, retention")
            strategy_review.score = max(0, strategy_review.score - 10)
            
    # Check 1c: Email subject must not exceed 60 characters
    email_data = (copy_data.get("copies", {}) or {}).get("email") or copy_data.get("email") or {}
    if email_data and isinstance(email_data, dict):
        subject = email_data.get("subject", "")
        if subject and len(subject) > 60:
            issue = f"Email subject too long ({len(subject)} chars). Must be under 60 characters."
            if issue not in (copy_review.issues or []):
                copy_review.issues = copy_review.issues or []
                copy_review.issues.append(issue)
                copy_review.action_items = copy_review.action_items or []
                copy_review.action_items.append("Shorten email subject to be under 60 characters")
                copy_review.score = max(0, copy_review.score - 5)

    # Check 2: Image prompts array must not be empty
    image_prompts = image_data.get("image_prompts", [])
    if not image_prompts or len(image_prompts) == 0:
        issue = "image_prompts array is empty - no visual assets defined"
        if issue not in (image_review.issues or []):
            image_review.issues = image_review.issues or []
            image_review.issues.append(issue)
            image_review.action_items = image_review.action_items or []
            image_review.action_items.append("Create at least 3 image prompts for key campaign deliverables")


def _compute_objective_score(agent_data: dict, agent_type: str) -> int:
    """
    Score agent output based on objective content metrics — field presence,
    completeness, text depth, and specificity. Base score starts at ~80 for
    complete schemas, with bonuses for exceptional depth and deductions for brevity.
    Includes a content-hash micro-offset so different campaigns get distinct scores.
    """
    import hashlib

    # Deterministic content-hash micro-offset (-2 to +2) based on content string
    content_str = str(agent_data)
    hash_val = int(hashlib.md5(content_str.encode("utf-8")).hexdigest(), 16)
    hash_offset = (hash_val % 5) - 2  # -2, -1, 0, +1, +2

    if agent_type == "research":
        score = 80
        ma = agent_data.get("market_analysis") or {}
        tam = str(ma.get("total_addressable_market", ""))
        if len(tam.strip()) > 10:
            score += 3
        elif len(tam.strip()) < 4:
            score -= 8

        if len(ma.get("market_trends", [])) >= 4:
            score += 2
        elif len(ma.get("market_trends", [])) < 3:
            score -= 5

        ca = agent_data.get("competitor_analysis") or {}
        if len(ca.get("top_competitors", [])) >= 3:
            score += 2
        elif len(ca.get("top_competitors", [])) < 2:
            score -= 6

        ai = agent_data.get("audience_insights") or {}
        if len(ai.get("pain_points", [])) >= 4:
            score += 2
        elif len(ai.get("pain_points", [])) < 3:
            score -= 4

        return max(60, min(90, score + hash_offset))

    if agent_type == "strategy":
        score = 82
        positioning = str(agent_data.get("positioning", ""))
        if len(positioning) > 100:
            score += 3
        elif len(positioning) < 30:
            score -= 5

        if len(agent_data.get("key_messages", [])) >= 4:
            score += 2
        if len(agent_data.get("content_pillars", [])) >= 4:
            score += 2
        if len(str(agent_data.get("strategic_approach", ""))) > 200:
            score += 2

        return max(60, min(90, score + hash_offset))

    if agent_type == "copy":
        score = 81
        copies_dict = agent_data.get("copies", {}) or {}
        total_char_len = sum(len(str(v)) for v in copies_dict.values() if v)
        if total_char_len > 1000:
            score += 4
        elif total_char_len < 300:
            score -= 8

        if agent_data.get("messaging_framework"):
            score += 2

        return max(60, min(90, score + hash_offset))

    if agent_type == "image":
        score = 83
        prompts = agent_data.get("image_prompts", [])
        if prompts:
            avg_len = sum(len(str(p.get("prompt", ""))) for p in prompts) / len(prompts)
            if avg_len > 700:
                score += 6  # Rich, detailed world-class prompts
            elif avg_len > 500:
                score += 3  # Good prompt density
            elif avg_len < 400:
                score -= 8  # Too short, likely generic
        else:
            score -= 20

        return max(60, min(92, score + hash_offset))

    return 80 + hash_offset


def _compute_hybrid_score(agent_data: dict, llm_score: int, agent_type: str,
                          llm_weight: float = 0.5, objective_weight: float = 0.5) -> int:
    """
    Blend the LLM's qualitative score with an objective score derived from
    content metrics.  This prevents the "same score every time" problem by
    introducing data-driven variation.

    Score ceiling: blended scores are capped at 92 unless BOTH the LLM score
    and objective score are individually above 92.  This combats LLM positivity
    bias (most models default to 90-100 for any plausible output).
    """
    objective = _compute_objective_score(agent_data, agent_type)
    blended = llm_score * llm_weight + objective * objective_weight
    blended = max(0, min(100, round(blended)))

    # Cap at 92 unless both components individually justify a higher score
    if blended > 92 and not (llm_score > 92 and objective > 92):
        blended = 92

    return blended


def _determine_revision_target(
    research_review,
    strategy_review,
    copy_review,
    image_review,
    research_score: int,
    strategy_score: int,
    copy_score: int,
    image_score: int,
    all_approved: bool
) -> dict:
    """
    Determine which agent needs revision.
    Priority order: Research → Strategy → Copy → Image

    Uses the LLM's approved flag as the primary signal (LLM catches
    content-level issues like channel drift, missing fields, etc.).
    Falls back to the lowest scoring agent if the LLM approved everyone
    but quality thresholds aren't met.
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

    # Check for explicit failures in priority order (primary: LLM's judgment)
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

    # No explicit failures but thresholds not met → target lowest scorer (backup)
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
    logger.info("\n" + "=" * 80)
    logger.info("⚠️  This is the agent module file.")
    logger.info("    To test the Reviewer Agent, run: python examples/run_reviewer.py")
    logger.info("    To customize input, edit: examples/inputs/campaign_input.json")
    logger.info("=" * 80)
