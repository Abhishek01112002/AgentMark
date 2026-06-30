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

# Maximum number of revisions allowed per agent
MAX_REVISIONS = 3

# Minimum quality threshold for individual agents
MIN_AGENT_SCORE = 75


def should_continue_after_reviewer(state: CampaignState) -> str:
    """
    Decision function called after reviewer_node.
    
    Routes to human approval if AI approved, otherwise routes to revision.
    
    Returns:
    - "human_approval" → Go to human approval node
    - "revise_research" → Send research back for revision
    - "revise_strategy" → Send strategy back for revision
    - "revise_copy" → Send copywriter back for revision
    - "revise_image" → Send image_prompt back for revision
    - "end" → End workflow (max revisions reached or critical error)
    """
    
    logger.info("\n" + "="*80)
    logger.info("🔀 ROUTING DECISION AFTER REVIEWER (AI)")
    logger.info("="*80)
    
    # If human already approved, route straight to human_approval node to proceed to publisher
    if state.human_approval_status == "approved":
        logger.info("✅ Human already approved, routing directly to human_approval node")
        return "human_approval"
        
    # Check for upstream errors to prevent infinite loops
    if state.status == "error" or state.error:
        logger.info("💥 Upstream error detected - ending workflow")
        return "end"
        
    # Check if review output exists
    if not state.review_output:
        logger.info("⚠️  No review output found - defaulting to human approval")
        return "human_approval"
    
    try:
        review_data = json.loads(state.review_output)
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
        image_review = review_data.get("image_review", {})
        
        # Get scores and approval status
        research_score = research_review.get("score", 100)
        strategy_score = strategy_review.get("score", 100)
        copy_score = copy_review.get("score", 100)
        image_score = image_review.get("score", 100)
        
        research_approved = research_review.get("approved", True)
        strategy_approved = strategy_review.get("approved", True)
        copy_approved = copy_review.get("approved", True)
        image_approved = image_review.get("approved", True)
        
        # Get current revision counts
        research_revisions = state.research_revision_count or 0
        strategy_revisions = state.strategy_revision_count or 0
        copy_revisions = state.copy_revision_count or 0
        image_revisions = state.image_revision_count or 0
        
        logger.info("\n📈 Agent Scores:")
        logger.info(f"   Research:  {research_score}/100 (Revisions: {research_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Strategy:  {strategy_score}/100 (Revisions: {strategy_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Copy:      {copy_score}/100 (Revisions: {copy_revisions}/{MAX_REVISIONS})")
        logger.info(f"   Image:     {image_score}/100 (Revisions: {image_revisions}/{MAX_REVISIONS})")
        
        # Priority 1: Research needs revision (affects everything downstream)
        if not research_approved or research_score < MIN_AGENT_SCORE:
            if research_revisions < MAX_REVISIONS:
                logger.info(f"\n🔄 Routing to RESEARCH for revision (will be attempt {research_revisions + 1}/{MAX_REVISIONS})")
                logger.info(f"   Score: {research_score}/100")
                logger.info(f"   Issues: {research_review.get('issues', [])}")
                logger.info("   🧹 Agent will clear research_output and re-run")
                return "revise_research"
            else:
                logger.info(f"\n⚠️  Research hit MAX_REVISIONS ({MAX_REVISIONS}) - proceeding to human approval anyway")
        
        # Priority 2: Strategy needs revision (affects copy and image)
        if not strategy_approved or strategy_score < MIN_AGENT_SCORE:
            if strategy_revisions < MAX_REVISIONS:
                logger.info(f"\n🔄 Routing to STRATEGY for revision (will be attempt {strategy_revisions + 1}/{MAX_REVISIONS})")
                logger.info(f"   Score: {strategy_score}/100")
                logger.info(f"   Issues: {strategy_review.get('issues', [])}")
                logger.info("   🧹 Agent will clear strategy_output and re-run")
                return "revise_strategy"
            else:
                logger.info(f"\n⚠️  Strategy hit MAX_REVISIONS ({MAX_REVISIONS}) - proceeding to human approval anyway")
        
        # Priority 3: Copy needs revision
        if not copy_approved or copy_score < MIN_AGENT_SCORE:
            if copy_revisions < MAX_REVISIONS:
                logger.info(f"\n🔄 Routing to COPYWRITER for revision (will be attempt {copy_revisions + 1}/{MAX_REVISIONS})")
                logger.info(f"   Score: {copy_score}/100")
                logger.info(f"   Issues: {copy_review.get('issues', [])}")
                logger.info("   🧹 Agent will clear copy_output and re-run")
                return "revise_copy"
            else:
                logger.info(f"\n⚠️  Copy hit MAX_REVISIONS ({MAX_REVISIONS}) - proceeding to human approval anyway")
        
        # Priority 4: Image needs revision
        if not image_approved or image_score < MIN_AGENT_SCORE:
            if image_revisions < MAX_REVISIONS:
                logger.info(f"\n🔄 Routing to IMAGE PROMPT for revision (will be attempt {image_revisions + 1}/{MAX_REVISIONS})")
                logger.info(f"   Score: {image_score}/100")
                logger.info(f"   Issues: {image_review.get('issues', [])}")
                logger.info("   🧹 Agent will clear image_output and re-run")
                return "revise_image"
            else:
                logger.info(f"\n⚠️  Image hit MAX_REVISIONS ({MAX_REVISIONS}) - proceeding to human approval anyway")
        
        # If we get here, all agents hit max revisions but still not approved
        logger.info("\n⚠️  All agents hit MAX_REVISIONS - proceeding to human approval with current quality")
        return "human_approval"
    
    # Default: proceed to human approval
    logger.info("✅ No blocking issues - Routing to Human Approval")
    return "human_approval"


def route_after_human_approval(state: CampaignState) -> str:
    """
    Decision function called after human_approval node.
    
    Routes based on human decision:
    - "publish" → Go to publisher agent
    - "revise_research" → Send research back for revision
    - "revise_strategy" → Send strategy back for revision
    - "revise_copy" → Send copywriter back for revision
    - "revise_image" → Send image_prompt back for revision
    
    Note: If awaiting_human_approval=True, workflow will END and must be resumed later
    """
    
    logger.info("\n" + "="*80)
    logger.info("🔀 ROUTING DECISION AFTER HUMAN APPROVAL")
    logger.info("="*80)
    
    # Check for upstream errors to prevent infinite loops
    if state.status == "error" or state.error:
        logger.info("💥 Upstream error detected - ending workflow")
        return "end"
        
    # Check if still awaiting human approval
    if state.awaiting_human_approval:
        logger.info("⏸️  Awaiting human approval - workflow will END here")
        logger.info("   After human approves, call workflow.invoke(state) again")
        return "end"
    
    # Check human decision
    human_status = state.human_approval_status
    
    logger.info(f"👤 Human Decision: {human_status}")
    
    if human_status == "approved":
        logger.info("✅ HUMAN APPROVED - Routing DIRECTLY to Publisher (skip reviewer)")
        if state.human_feedback:
            logger.info(f"   Human Feedback: {state.human_feedback}")
        # CRITICAL: Go directly to publisher, do NOT go back through reviewer
        return "publish"
    
    elif human_status == "rejected":
        target = state.human_revision_target
        logger.info(f"⚠️  HUMAN REJECTED - Routing to {target.upper()} for revision")
        logger.info(f"   Human Feedback: {state.human_feedback}")
        
        # Route to appropriate agent
        if target == "research":
            return "revise_research"
        elif target == "strategy":
            return "revise_strategy"
        elif target == "copywriter":
            return "revise_copy"
        elif target == "image_prompt":
            return "revise_image"
        else:
            logger.info(f"⚠️  Unknown revision target: {target} - defaulting to publish")
            return "publish"
    
    # Default: proceed to publish
    logger.info("✅ No specific action - Routing to Publisher")
    return "publish"


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
