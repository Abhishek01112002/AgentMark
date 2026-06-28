"""
HUMAN APPROVAL AGENT - Human-In-The-Loop (HITL)

Role: Pauses workflow after Reviewer approval and waits for human decision

WORKFLOW POSITION:
  Reviewer ✅ Approved
    ↓
  Human Approval (PAUSE HERE)
    ↓
  Human Decision:
    ├─→ APPROVE → Publisher → END
    └─→ REJECT → Specify agent to revise → Back to that agent

WHY HERE?
  ✅ Reviewer has validated quality, grammar, consistency
  ✅ All campaign assets are ready (research, strategy, copy, images)
  ✅ Human can see FINAL OUTPUT before publishing
  ✅ If human rejects, work is already done (just needs refinement)
  ❌ NOT after publisher (work already distributed)
  ❌ NOT before reviewer (no final output to judge)

HUMAN INPUT FORMAT:
  {
    "action": "approve" | "reject",
    "feedback": "Optional feedback message",
    "revision_target": "research" | "strategy" | "copywriter" | "image_prompt"
  }
"""

import logging
logger = logging.getLogger(__name__)

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


def human_approval_node(state: CampaignState) -> CampaignState:
    """
    Human Approval Node - Pauses workflow for human decision
    
    This node:
    1. Sets awaiting_human_approval flag
    2. Displays campaign summary for human review
    3. Waits for human input (approve/reject)
    4. Routes based on human decision
    
    Args:
        state: CampaignState with review_output (approved by AI)
    
    Returns:
        Modified state with human_approval_status
    """
    
    logger.info("\n" + "="*80)
    logger.info("👤 HUMAN APPROVAL REQUIRED")
    logger.info("="*80)
    
    # Check if already approved (skip on re-entry after approval)
    if state.human_approval_status == "approved" and not state.human_revision_target:
        logger.info("✓ Campaign already approved by human")
        return state
    
    # RESET revision counts when entering human approval for the FIRST time (after AI auto-revisions)
    # This ensures AI auto-revisions don't block human revisions, while preserving human revision counts.
    if state.human_approval_status is None:
        state.research_revision_count = 0
        state.strategy_revision_count = 0
        state.copy_revision_count = 0
        state.image_revision_count = 0
        logger.info("🔄 Reset AI auto-revision counts for first human review (0/3 each)")
        state.human_revision_target = None  # Clear any previous target
        state.human_approval_status = "pending"
    
    # Mark as awaiting human approval
    state.awaiting_human_approval = True
    if state.human_approval_status != "pending":
        state.human_approval_status = "pending"
    state.status = "awaiting_human_approval"
    
    logger.info("\n🎯 CAMPAIGN SUMMARY FOR HUMAN REVIEW")
    logger.info("-"*80)
    
    # Display campaign info
    logger.info(f"\nCampaign: {state.campaign_name}")
    logger.info(f"Brand:    {state.brand_name}")
    logger.info(f"Industry: {state.industry}")
    logger.info(f"Goal:     {state.primary_goal}")
    
    # Display AI review scores
    if state.review_output:
        try:
            review_data = json.loads(state.review_output)
            # The reviewer saves it as 'overall_quality_score' at root level
            overall_score = review_data.get('overall_quality_score', 'N/A')
            logger.info(f"\n📊 AI Quality Score: {overall_score}/100")
            logger.info(f"   Status: {review_data.get('status', 'N/A')}")
            
            # Show individual scores
            logger.info("\n   Agent Scores:")
            logger.info(f"   - Research:  {review_data.get('research_review', {}).get('score', 'N/A')}/100")
            logger.info(f"   - Strategy:  {review_data.get('strategy_review', {}).get('score', 'N/A')}/100")
            logger.info(f"   - Copy:      {review_data.get('copy_review', {}).get('score', 'N/A')}/100")
            logger.info(f"   - Image:     {review_data.get('image_review', {}).get('score', 'N/A')}/100")
        except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)
    
    # Display what's ready for review (only if actually exists)
    logger.info("\n📦 DELIVERABLES STATUS:")
    
    deliverables_ready = []
    deliverables_failed = []
    
    if state.research_output:
        deliverables_ready.append("Market Research & Analysis")
    else:
        deliverables_failed.append("Market Research & Analysis")
    
    if state.strategy_output:
        deliverables_ready.append("Marketing Strategy")
    else:
        deliverables_failed.append("Marketing Strategy")
    
    if state.copy_output:
        deliverables_ready.append("Campaign Copy & Messaging")
    else:
        deliverables_failed.append("Campaign Copy & Messaging")
    
    if state.image_output:
        deliverables_ready.append("Visual Direction & Image Prompts")
    else:
        deliverables_failed.append("Visual Direction & Image Prompts")
    
    if deliverables_ready:
        logger.info("   ✓ Ready:")
        for item in deliverables_ready:
            logger.info(f"      • {item}")
    
    if deliverables_failed:
        logger.info("   ❌ Failed/Missing:")
        for item in deliverables_failed:
            logger.info(f"      • {item}")
    
    logger.info("\n" + "="*80)
    logger.info("⏸️  WORKFLOW PAUSED - AWAITING HUMAN APPROVAL")
    logger.info("="*80)
    logger.info("\nTo continue, call: submit_human_approval(campaign_state, decision)")
    logger.info("\nDecision format:")
    logger.info("  {")
    logger.info("    'action': 'approve',  # or 'reject'")
    logger.info("    'feedback': 'Optional message',")
    logger.info("    'revision_target': 'copywriter'  # Required if action=reject")
    logger.info("  }")
    logger.info("="*80)
    
    return state


def submit_human_approval(state: CampaignState, decision: dict) -> CampaignState:
    """
    Submit human approval decision to continue workflow
    
    Args:
        state: Current CampaignState
        decision: {
            "action": "approve" | "reject",
            "feedback": "Optional feedback",
            "revision_target": "research|strategy|copywriter|image_prompt"
        }
    
    Returns:
        Updated state with human decision
    """
    
    logger.info("\n" + "="*80)
    logger.info("👤 PROCESSING HUMAN DECISION")
    logger.info("="*80)
    
    action = decision.get("action", "").lower()
    feedback = decision.get("feedback", "")
    revision_target = decision.get("revision_target", "")
    
    if action not in ["approve", "reject"]:
        raise ValueError("Action must be 'approve' or 'reject'")
    
    if action == "reject" and not revision_target:
        raise ValueError("revision_target required when rejecting (research, strategy, copywriter, image_prompt)")
    
    if action == "reject" and revision_target not in ["research", "strategy", "copywriter", "image_prompt"]:
        raise ValueError(f"Invalid revision_target: {revision_target}")
    
    # Check if target agent has hit max revisions (3)
    MAX_REVISIONS = 3
    if action == "reject":
        revision_count_map = {
            "research": state.research_revision_count or 0,
            "strategy": state.strategy_revision_count or 0,
            "copywriter": state.copy_revision_count or 0,
            "image_prompt": state.image_revision_count or 0
        }
        
        current_count = revision_count_map.get(revision_target, 0)
        if current_count >= MAX_REVISIONS:
            raise ValueError(
                f"Cannot revise {revision_target}: MAX_REVISIONS ({MAX_REVISIONS}) reached. "
                f"Current count: {current_count}/{MAX_REVISIONS}. "
                f"Please approve or select a different agent."
            )
        
        # Check if any DOWNSTREAM agents would exceed max revisions
        downstream_agents = {
            "research": ["strategy", "copywriter", "image_prompt"],
            "strategy": ["copywriter", "image_prompt"],
            "copywriter": ["image_prompt"],
            "image_prompt": []
        }
        
        blocked_agents = []
        for downstream in downstream_agents.get(revision_target, []):
            downstream_count = revision_count_map.get(downstream, 0)
            if downstream_count >= MAX_REVISIONS:
                blocked_agents.append(f"{downstream} ({downstream_count}/3)")
        
        if blocked_agents:
            raise ValueError(
                f"Cannot revise {revision_target}: Downstream agents at MAX_REVISIONS: {', '.join(blocked_agents)}. "
                f"Revising {revision_target} would force these agents to exceed 3/3 limit. "
                f"Please approve the campaign or select an agent without maxed-out dependencies."
            )
    
    # Record human decision
    state.human_feedback = feedback
    
    if action == "approve":
        state.human_approval_status = "approved"
        state.awaiting_human_approval = False
        state.human_revision_target = None  # Clear target on approval
        logger.info("✅ HUMAN APPROVED - Proceeding to Publisher")
        logger.info(f"   Feedback: {feedback or 'None'}")
        state.status = "human_approved"
        state.next_step = "proceed_to_publisher"
    else:
        state.human_approval_status = "rejected"
        state.awaiting_human_approval = False
        state.human_revision_target = revision_target  # Set target for routing
        logger.info(f"⚠️  HUMAN REJECTED - Sending to {revision_target.upper()} for revision")
        logger.info(f"   Feedback: {feedback}")
        state.status = f"{revision_target}_revision_required"
        state.next_step = f"await_{revision_target}_revision"
        
        # DO NOT increment here - let the agent node increment when it actually runs
        # This prevents double-counting the same revision
    
    logger.info("="*80)
    
    return state


def get_campaign_summary(state: CampaignState) -> dict:
    """
    Generate a summary of the campaign for human review
    
    Args:
        state: CampaignState
    
    Returns:
        Dictionary with campaign summary
    """
    
    summary = {
        "campaign_info": {
            "name": state.campaign_name,
            "brand": state.brand_name,
            "industry": state.industry,
            "goal": state.primary_goal,
            "audience": state.target_audience,
            "voice": state.brand_voice
        },
        "ai_review": None,
        "outputs": {
            "research": state.research_output,
            "strategy": state.strategy_output,
            "copy": state.copy_output,
            "image": state.image_output
        },
        "status": {
            "awaiting_approval": state.awaiting_human_approval,
            "approval_status": state.human_approval_status
        }
    }
    
    # Parse AI review if available
    if state.review_output:
        try:
            review_data = json.loads(state.review_output)
            # The reviewer saves it as 'overall_quality_score' at root level
            overall_score = review_data.get('overall_quality_score', 'N/A')
            summary["ai_review"] = {
                "overall_score": overall_score,
                "research_score": review_data.get("research_review", {}).get("score"),
                "strategy_score": review_data.get("strategy_review", {}).get("score"),
                "copy_score": review_data.get("copy_review", {}).get("score"),
                "image_score": review_data.get("image_review", {}).get("score"),
                "status": review_data.get("status")
            }
        except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)
    
    return summary


if __name__ == "__main__":
    logger.info("="*80)
    logger.info("HUMAN APPROVAL AGENT - HITL Implementation")
    logger.info("="*80)
    logger.info("\nThis agent pauses the workflow after Reviewer approval")
    logger.info("and waits for human decision before proceeding to Publisher.")
    logger.info("\nUsage:")
    logger.info("  1. Workflow runs until reviewer approves")
    logger.info("  2. human_approval_node() pauses and displays summary")
    logger.info("  3. Human reviews the outputs")
    logger.info("  4. Human calls submit_human_approval() with decision")
    logger.info("  5. Workflow continues based on decision")
    logger.info("="*80)
