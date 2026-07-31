"""
WORKFLOW ROUTING LOGIC - Conditional Flow with HITL

This file contains the decision logic that determines:
1. After Reviewer: Should we go to human approval or revise?
2. After Human Approval: Should we publish or revise based on human feedback?
3. Have we hit max revisions? (end workflow)

ROUTING DECISION TREE:
  Reviewer Completes
    ↓
  Check review_output.status
    ↓
    ├─→ "approved" → go to human_approval (HITL)
    │                    ↓
    │              [HUMAN DECISION]
    │                    ↓
    │         ├─→ approved → publish
    │         └─→ rejected → revise specific agent
    ├─→ "revision_required" → check which agents need revision
    │     ↓
    │     ├─→ research score < 75? → send to research (if < max revisions)
    │     ├─→ strategy score < 75? → send to strategy (if < max revisions)
    │     ├─→ copy score < 75? → send to copywriter (if < max revisions)
    │     └─→ image score < 75? → send to image_prompt (if < max revisions)
    └─→ max revisions reached → end workflow

MAX_REVISIONS = 3 per agent
"""

import logging
logger = logging.getLogger(__name__)

import json
from agents.state import CampaignState
from utils.cancellation import is_campaign_cancelled

from config.settings import MAX_AUTO_REVISIONS, MIN_AGENT_SCORE, ENABLE_CREATIVE_HOOK_MATRIX

MAX_REVISIONS = MAX_AUTO_REVISIONS


def _get_attr(state, key, default=None):
    if isinstance(state, dict):
        return state.get(key, default)
    return getattr(state, key, default)

def _set_attr(state, key, value):
    if isinstance(state, dict):
        state[key] = value
    else:
        setattr(state, key, value)

def _log_routing(func_name: str, state, decision: str) -> str:
    rev_counts = (
        f"research={_get_attr(state, 'research_revision_count', 0) or 0}, "
        f"strategy={_get_attr(state, 'strategy_revision_count', 0) or 0}, "
        f"copy={_get_attr(state, 'copy_revision_count', 0) or 0}, "
        f"image={_get_attr(state, 'image_revision_count', 0) or 0}"
    )
    log_msg = (
        f"\n[ROUTING: {func_name}] Decision -> '{decision}'\n"
        f"  - status: {_get_attr(state, 'status')}\n"
        f"  - human_status: {_get_attr(state, 'human_approval_status')}\n"
        f"  - human_revision_target: {_get_attr(state, 'human_revision_target')}\n"
        f"  - revision_counts: {rev_counts}"
    )
    logger.info(log_msg)
    return decision


def should_continue_after_reviewer(state: CampaignState | dict) -> str:
    """
    Decision function called after reviewer_node.
    
    Routes to human approval if AI approved, otherwise routes to revision.
    """
    logger.info("\n" + "="*80)
    logger.info("🔀 ROUTING DECISION AFTER REVIEWER (AI)")
    logger.info("="*80)

    cid = _get_attr(state, "campaign_id")
    status_val = _get_attr(state, "status")
    error_val = _get_attr(state, "error")
    approval_val = _get_attr(state, "human_approval_status")
    review_out = _get_attr(state, "review_output")

    # 1. Cancellation check
    if cid and is_campaign_cancelled(cid):
        logger.info(f"Campaign {cid} cancelled during Reviewer routing — halting graph")
        return _log_routing("should_continue_after_reviewer", state, "cancelled")
    
    # 2. Fatal error check
    if status_val == "error" or error_val:
        logger.info("💥 Upstream error detected - ending workflow")
        return _log_routing("should_continue_after_reviewer", state, "end")

    # 3. Workflow AI complete check (terminal for AI orchestration)
    if status_val == "review_complete":
        logger.info("✅ Review complete in state — routing to Human Approval (HITL)")
        return _log_routing("should_continue_after_reviewer", state, "human_approval")
        
    # 4. Human already approved check
    if approval_val == "approved":
        logger.info("✅ Human already approved, routing directly to human_approval node")
        return _log_routing("should_continue_after_reviewer", state, "human_approval")

    # Check if review output exists
    if not review_out:
        logger.info("⚠️  No review output found - defaulting to human approval")
        return "human_approval"
    
    try:
        review_data = json.loads(review_out)
    except (json.JSONDecodeError, TypeError) as e:
        logger.info(f"⚠️  Could not parse review output: {e} - defaulting to human approval")
        return "human_approval"
    
    # Get review status
    status = review_data.get("status", "approved")
    logger.info(f"📊 AI Review Status: {status}")
    
    # If AI approved, go to human approval
    if status == "approved":
        logger.info("✅ AI APPROVED - Routing to Human Approval (HITL)")
        return "human_approval"
    
    # If revision required, check which agents need work
    if status == "revision_required":
        logger.info("⚠️  AI Detected Issues - Routing for Revision...")
        
        # Get individual agent reviews
        research_review = review_data.get("research_review", {})
        strategy_review = review_data.get("strategy_review", {})
        copy_review = review_data.get("copy_review", {})
        hook_review = review_data.get("creative_hook_matrix_review", {}) or review_data.get("hook_review", {})
        image_review = review_data.get("image_review", {})
        
        # Get scores and approval status
        research_score = research_review.get("score", 100)
        strategy_score = strategy_review.get("score", 100)
        copy_score = copy_review.get("score", 100)
        hook_score = hook_review.get("score", 100) if hook_review else 100
        image_score = image_review.get("score", 100)
        
        research_approved = research_review.get("approved", True)
        strategy_approved = strategy_review.get("approved", True)
        copy_approved = copy_review.get("approved", True)
        hook_approved = hook_review.get("approved", True) if hook_review else True
        image_approved = image_review.get("approved", True)
        
        # Get current revision counts
        research_revisions = _get_attr(state, "research_revision_count", 0) or 0
        strategy_revisions = _get_attr(state, "strategy_revision_count", 0) or 0
        copy_revisions = _get_attr(state, "copy_revision_count", 0) or 0
        hook_revisions = _get_attr(state, "creative_hook_matrix_revision_count", 0) or 0
        image_revisions = _get_attr(state, "image_revision_count", 0) or 0
        
        logger.info("\n📈 Agent Scores:")
        logger.info(f"   Research:  {research_score}/100 (Revisions: {research_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Strategy:  {strategy_score}/100 (Revisions: {strategy_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Copy:      {copy_score}/100 (Revisions: {copy_revisions}/{MAX_REVISIONS})")
        if ENABLE_CREATIVE_HOOK_MATRIX and hook_review:
            logger.info(f"   Hooks:     {hook_score}/100 (Revisions: {hook_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Image:     {image_score}/100 (Revisions: {image_revisions}/{MAX_REVISIONS})")
        
        # Priority 1: Research needs revision (affects everything downstream)
        agent_priority_checks = [
            ("research", research_approved, research_score, research_revisions, research_review, "revise_research", "RESEARCH"),
            ("strategy", strategy_approved, strategy_score, strategy_revisions, strategy_review, "revise_strategy", "STRATEGY"),
            ("copy", copy_approved, copy_score, copy_revisions, copy_review, "revise_copy", "COPYWRITER"),
        ]

        if ENABLE_CREATIVE_HOOK_MATRIX and hook_review:
            agent_priority_checks.append(
                ("creative_hook_matrix", hook_approved, hook_score, hook_revisions, hook_review, "revise_hooks", "CREATIVE HOOK MATRIX")
            )

        agent_priority_checks.append(
            ("image", image_approved, image_score, image_revisions, image_review, "revise_image", "IMAGE PROMPT")
        )

        for agent_key, is_appr, score, rev_count, review_obj, route_target, log_label in agent_priority_checks:
            if not is_appr or score < MIN_AGENT_SCORE:
                if rev_count < MAX_REVISIONS:
                    target_name = "copywriter" if agent_key in ("copy", "copywriter") else ("image_prompt" if agent_key in ("image", "image_prompt") else agent_key)
                    _set_attr(state, "human_revision_target", target_name)
                    _set_attr(state, "status", f"{agent_key}_revision_required")
                    logger.info(f"\n🔄 Routing to {log_label} for revision (will be attempt {rev_count + 1}/{MAX_REVISIONS})")
                    logger.info(f"   Target: {_get_attr(state, 'human_revision_target')} | Status: {_get_attr(state, 'status')}")
                    logger.info(f"   Score: {score}/100")
                    logger.info(f"   Issues: {review_obj.get('issues', [])}")
                    return _log_routing("should_continue_after_reviewer", state, route_target)
                else:
                    logger.info(f"\n⚠️  {log_label} hit MAX_REVISIONS ({MAX_REVISIONS}) - checking downstream agents")

        # If all unapproved agents have exhausted revisions, proceed to human approval
        logger.info("\n⚠️  All unapproved agents hit MAX_REVISIONS - proceeding to human approval")
        return _log_routing("should_continue_after_reviewer", state, "human_approval")

    # Default: proceed to human approval
    logger.info("✅ No blocking issues - Routing to Human Approval")
    return _log_routing("should_continue_after_reviewer", state, "human_approval")


def route_after_human_approval(state: CampaignState | dict) -> str:
    """
    Decision function called after human_approval node.
    """
    logger.info("\n" + "="*80)
    logger.info("🔀 ROUTING DECISION AFTER HUMAN APPROVAL")
    logger.info("="*80)

    cid = _get_attr(state, "campaign_id")
    status_val = _get_attr(state, "status")
    error_val = _get_attr(state, "error")
    human_status = _get_attr(state, "human_approval_status")
    awaiting = _get_attr(state, "awaiting_human_approval")

    if cid and is_campaign_cancelled(cid):
        logger.info(f"Campaign {cid} cancelled during Human Approval routing — halting graph")
        return _log_routing("route_after_human_approval", state, "cancelled")
    
    # Clear prior error state if human user has given an approval/rejection decision
    if human_status:
        if status_val == "error":
            _set_attr(state, "status", "processing")
        _set_attr(state, "error", "")

    # Check for upstream errors to prevent infinite loops
    if status_val == "error" or (error_val and len(str(error_val).strip()) > 0):
        logger.info("💥 Upstream error detected - ending workflow")
        return _log_routing("route_after_human_approval", state, "end")
        
    # Check if still awaiting human approval
    if awaiting:
        logger.info("⏸️  Awaiting human approval - workflow will END here")
        logger.info("   After human approves, call workflow.invoke(state) again")
        return _log_routing("route_after_human_approval", state, "end")
    
    logger.info(f"👤 Human Decision: {human_status}")
    
    if human_status == "approved":
        logger.info("✅ HUMAN APPROVED - Routing DIRECTLY to Publisher (skip reviewer)")
        fb = _get_attr(state, "human_feedback")
        if fb:
            logger.info(f"   Human Feedback: {fb}")
        # CRITICAL: Go directly to publisher, do NOT go back through reviewer
        return _log_routing("route_after_human_approval", state, "publish")
    
    elif human_status == "rejected":
        target = _get_attr(state, "human_revision_target") or "copywriter"
        fb = _get_attr(state, "human_feedback")

        logger.info(f"⚠️  REVISION REQUESTED - Routing to {target.upper()} for revision")
        if fb:
            logger.info(f"   Feedback: {fb}")
        
        # Route to appropriate agent
        if target == "research":
            return _log_routing("route_after_human_approval", state, "revise_research")
        elif target == "strategy":
            return _log_routing("route_after_human_approval", state, "revise_strategy")
        elif target == "copywriter":
            return _log_routing("route_after_human_approval", state, "revise_copy")
        elif target in ("creative_hook_matrix", "hooks"):
            return _log_routing("route_after_human_approval", state, "revise_hooks")
        elif target == "image_prompt":
            return _log_routing("route_after_human_approval", state, "revise_image")
        else:
            logger.info(f"⚠️  Unknown revision target: {target} - defaulting to publish")
            return _log_routing("route_after_human_approval", state, "publish")

    
    # Default: proceed to publish
    logger.info("✅ No specific action - Routing to Publisher")
    return _log_routing("route_after_human_approval", state, "publish")



def route_revisions(state: CampaignState) -> list[str]:
    """
    ALTERNATIVE ROUTING: Identifies ALL agents that need revision.
    
    This function can be used if you want to revise multiple agents
    in parallel rather than one at a time.
    
    Args:
        state: Current campaign state
    
    Returns:
        List of agent names that need revision: ["research", "strategy", "copywriter", "image_prompt"]
    """
    
    if not state.review_output:
        return []
    
    try:
        review_data = json.loads(state.review_output)
    except (json.JSONDecodeError, TypeError):
        return []
    
    agents_to_revise = []
    
    # Check each agent
    if review_data.get("research_review", {}).get("score", 100) < MIN_AGENT_SCORE:
        if (state.research_revision_count or 0) < MAX_REVISIONS:
            agents_to_revise.append("research")
    
    if review_data.get("strategy_review", {}).get("score", 100) < MIN_AGENT_SCORE:
        if (state.strategy_revision_count or 0) < MAX_REVISIONS:
            agents_to_revise.append("strategy")
    
    if review_data.get("copy_review", {}).get("score", 100) < MIN_AGENT_SCORE:
        if (state.copy_revision_count or 0) < MAX_REVISIONS:
            agents_to_revise.append("copywriter")
    
    if review_data.get("image_review", {}).get("score", 100) < MIN_AGENT_SCORE:
        if (state.image_revision_count or 0) < MAX_REVISIONS:
            agents_to_revise.append("image_prompt")
    
    return agents_to_revise


# ==================== HELPER FUNCTIONS ====================

def get_revision_summary(state: CampaignState) -> dict:
    """
    Gets a summary of revision counts for all agents.
    
    Returns:
        Dictionary with revision counts
    """
    return {
        "research": state.research_revision_count or 0,
        "strategy": state.strategy_revision_count or 0,
        "copy": state.copy_revision_count or 0,
        "image": state.image_revision_count or 0,
        "max_revisions": MAX_REVISIONS
    }


def has_hit_max_revisions(state: CampaignState) -> bool:
    """
    Checks if any agent has hit max revisions.
    
    Returns:
        True if any agent hit max revisions
    """
    return any([
        (state.research_revision_count or 0) >= MAX_REVISIONS,
        (state.strategy_revision_count or 0) >= MAX_REVISIONS,
        (state.copy_revision_count or 0) >= MAX_REVISIONS,
        (state.image_revision_count or 0) >= MAX_REVISIONS
    ])


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("=" * 80)
    logger.info("⚠️  This is the routing logic module.")
    logger.info("    Used by workflow/graph.py for conditional routing.")
    logger.info("=" * 80)
    
    # Example: Test routing logic
    logger.info("\n📚 ROUTING LOGIC EXPLANATION (WITH HITL):")
    logger.info("-" * 80)
    logger.info(f"MAX_REVISIONS per agent: {MAX_REVISIONS}")
    logger.info(f"MIN_AGENT_SCORE threshold: {MIN_AGENT_SCORE}/100")
    logger.info("\nDecision Flow:")
    logger.info("  1. AI Reviewer checks quality")
    logger.info("     ├─→ Issues found? → Route to specific agent for revision")
    logger.info("     └─→ Approved? → Route to Human Approval (HITL)")
    logger.info("  2. Human Approval (pauses workflow)")
    logger.info("     ├─→ Human approves? → Route to Publisher")
    logger.info("     └─→ Human rejects? → Route to specific agent for revision")
    logger.info("\nIf any agent hits MAX_REVISIONS, proceed to next step anyway.")
    logger.info("=" * 80)
