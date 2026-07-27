"""
CAMPAIGN WORKFLOW GRAPH - LangGraph Integration

This file defines the complete 7-agent workflow using LangGraph.

WORKFLOW STRUCTURE:
  START
    ↓
  Manager Agent (orchestrates)
    ↓
  Research Agent (market analysis)
    ↓
  Strategy Agent (marketing strategy)
    ↓
  Copywriter Agent (creates copy)
    ↓
  Image Prompt Agent (creates visuals)
    ↓
  Reviewer Agent (quality check)
    ↓
  [DECISION POINT] ← Conditional routing based on review
    ↓
    ├─→ APPROVED → Publisher Agent → END
    └─→ NEEDS REVISION → [Route to specific agent(s)] → Back to Reviewer

KEY FEATURES:
- Sequential agent execution
- Conditional routing after reviewer
- Automatic revision loops with max attempts (3)
- State persistence across all nodes
- Error handling at each node
"""

import logging
import time
logger = logging.getLogger(__name__)

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

# LangGraph state checkpointer for HITL interrupts and resumption
checkpointer = MemorySaver()
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.manager import manager_agent
from agents.research import research_agent
from agents.strategy import strategy_agent
from agents.copywriter import copywriter_agent
from agents.creative_hook_matrix import creative_hook_matrix_agent
from agents.image_prompt import image_prompt_agent

from agents.reviewer import reviewer_agent
from agents.publisher import publisher_agent
from agents.human_approval import human_approval_node
from workflow.routing import should_continue_after_reviewer, route_after_human_approval
from utils.redis_publisher import publish_agent_event
from utils.cancellation import is_campaign_cancelled
from config.settings import ENABLE_CREATIVE_HOOK_MATRIX
import json


def _try_parse_json(val):
    if not val:
        return None
    if isinstance(val, dict) or isinstance(val, list):
        return val
    try:
        return json.loads(val)
    except Exception:
        return val


# ==================== NODE WRAPPER FUNCTIONS ====================
# These wrap your existing agent functions to work with LangGraph

_step_counter = 0

def _log_node_execution(node_name: str, state: CampaignState, skipped: bool = False):
    global _step_counter
    _step_counter += 1
    has_hooks = bool(getattr(state, "creative_hook_matrix_output", None))
    is_cancelled = is_campaign_cancelled(state.campaign_id) if (hasattr(state, "campaign_id") and state.campaign_id) else False
    rev_counts = (
        f"research={getattr(state, 'research_revision_count', 0) or 0}, "
        f"strategy={getattr(state, 'strategy_revision_count', 0) or 0}, "
        f"copy={getattr(state, 'copy_revision_count', 0) or 0}, "
        f"image={getattr(state, 'image_revision_count', 0) or 0}"
    )
    log_msg = (
        f"\nStep {_step_counter}\n"
        f"[{node_name}]\n"
        f"  - skipped: {skipped}\n"
        f"  - status: {getattr(state, 'status', None)}\n"
        f"  - human_status: {getattr(state, 'human_approval_status', None)}\n"
        f"  - human_revision_target: {getattr(state, 'human_revision_target', None)}\n"
        f"  - cancellation: {is_cancelled}\n"
        f"  - creative_hook_matrix_output exists: {has_hooks}\n"
        f"  - revision_counts: {rev_counts}\n"
        f"v"

    )
    logger.info(log_msg)
    print(log_msg, flush=True)


def _get_revision_counts_extra(state: CampaignState) -> dict:

    return {
        "research_revision_count": state.research_revision_count or 0,
        "strategy_revision_count": state.strategy_revision_count or 0,
        "copy_revision_count": state.copy_revision_count or 0,
        "image_revision_count": state.image_revision_count or 0,
    }


def manager_node(state: CampaignState) -> dict:
    """
    Node 1: Manager Agent
    - Orchestrates the campaign
    - Defines channels, deliverables, timeline
    """
    logger.info("\n" + "="*80)
    logger.info("LANGGRAPH: EXECUTING MANAGER NODE")
    logger.info("="*80)
    
    # Skip if manager already completed (in any revision/approval mode)
    if state.manager_output:
        logger.info("Skipping Manager (already completed)")
        return {}
    
    publish_agent_event(state.campaign_id, "manager", "running", extra=_get_revision_counts_extra(state))
    
    try:
        updated_state = manager_agent(state)
        publish_agent_event(state.campaign_id, "manager", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"manager_output": _try_parse_json(updated_state.manager_output)}})
        return {
            "manager_output": updated_state.manager_output,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Manager agent error ({type(e).__name__})"
        logger.error("💥 Manager Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "manager", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def research_node(state: CampaignState) -> dict:
    """
    Node 2: Research Agent
    - Market research
    - Competitor analysis
    - Audience insights
    """
    logger.info("\n" + "="*80)
    logger.info("🔍 LANGGRAPH: EXECUTING RESEARCH NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        logger.info("⏭️ Skipping Research Node due to upstream error")
        return {}
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "research") or (state.status == "research_revision_required")
    
    # Skip logic: Only run if targeted for revision OR first time
    if is_targeted_for_revision:
        # Clear output for fresh revision
        if state.research_output:
            logger.info("   🔄 Clearing previous research output for revision...")
            state.research_output = None
    elif state.research_output:
        # Already has output and not targeted - skip
        logger.info("⏭️  Skipping Research (already completed)")
        return {}
    
    publish_agent_event(state.campaign_id, "research", "running", extra=_get_revision_counts_extra(state))
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            logger.info("   🧹 Clearing all downstream outputs...")
            state.strategy_output = None
            state.copy_output = None
            state.image_output = None
            state.review_output = None
        
        updated_state = research_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.research_revision_count or 0
            updated_state.research_revision_count = current_count + 1
            logger.info(f"\nResearch revision count: {updated_state.research_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            logger.info("Clearing human_revision_target (research revision complete)")
            updated_state.human_revision_target = None
        
        publish_agent_event(state.campaign_id, "research", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"research_output": _try_parse_json(updated_state.research_output)}})
        return {
            "research_output": updated_state.research_output,
            "strategy_output": updated_state.strategy_output,
            "copy_output": updated_state.copy_output,
            "image_output": updated_state.image_output,
            "review_output": updated_state.review_output,
            "research_revision_count": updated_state.research_revision_count,
            "human_revision_target": updated_state.human_revision_target,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Research agent error ({type(e).__name__})"
        logger.error("💥 Research Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "research", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def strategy_node(state: CampaignState) -> dict:
    """
    Node 3: Strategy Agent
    - Marketing strategy
    - Positioning and messaging
    - Channel strategy
    """
    logger.info("\n" + "="*80)
    logger.info("📋 LANGGRAPH: EXECUTING STRATEGY NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        logger.info("⏭️ Skipping Strategy Node due to upstream error")
        return {}
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "strategy") or (state.status == "strategy_revision_required")
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.strategy_output:
            logger.info("   🔄 Clearing previous strategy output for revision...")
            state.strategy_output = None
    elif not state.strategy_output:
        # No existing output means either first run or needs re-run
        logger.info("   🔄 Running strategy (no existing output)...")
    elif state.strategy_output:
        # Already has output and not in revision mode - skip
        logger.info("⏭️  Skipping Strategy (already completed)")
        return {}
    
    publish_agent_event(state.campaign_id, "strategy", "running", extra=_get_revision_counts_extra(state))
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            logger.info("   🧹 Clearing downstream outputs (copy, image, review)...")
            state.copy_output = None
            state.image_output = None
            state.review_output = None
        
        updated_state = strategy_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.strategy_revision_count or 0
            updated_state.strategy_revision_count = current_count + 1
            logger.info(f"\nStrategy revision count: {updated_state.strategy_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            logger.info("Clearing human_revision_target (strategy revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            logger.info(f"\nStrategy revision count: {updated_state.strategy_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "strategy", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"strategy_output": _try_parse_json(updated_state.strategy_output)}})
        return {
            "strategy_output": updated_state.strategy_output,
            "copy_output": updated_state.copy_output,
            "image_output": updated_state.image_output,
            "review_output": updated_state.review_output,
            "strategy_revision_count": updated_state.strategy_revision_count,
            "human_revision_target": updated_state.human_revision_target,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Strategy agent error ({type(e).__name__})"
        logger.error("💥 Strategy Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "strategy", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def copywriter_node(state: CampaignState) -> dict:
    """
    Node 4: Copywriter Agent
    - Creates marketing copy
    - Headlines, CTAs, body copy
    """
    logger.info("\n" + "="*80)
    logger.info("✍️  LANGGRAPH: EXECUTING COPYWRITER NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        _log_node_execution("copywriter", state, skipped=True)
        return {}
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "copywriter") or (state.status == "copy_revision_required")
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.copy_output:
            logger.info("   🔄 Clearing previous copywriter output for revision...")
            state.copy_output = None
    elif not state.copy_output:
        # No existing output means either first run or needs re-run
        logger.info("   🔄 Running copywriter (no existing output)...")
    elif state.copy_output:
        # Already has output and not in revision mode - skip
        _log_node_execution("copywriter", state, skipped=True)
        return {}

    _log_node_execution("copywriter", state, skipped=False)
    
    publish_agent_event(state.campaign_id, "copywriter", "running", extra=_get_revision_counts_extra(state))
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            logger.info("   🧹 Clearing downstream outputs (image, review)...")
            state.image_output = None
            state.review_output = None
        
        updated_state = copywriter_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.copy_revision_count or 0
            updated_state.copy_revision_count = current_count + 1
            logger.info(f"\nCopywriter revision count: {updated_state.copy_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            logger.info("Clearing human_revision_target (copywriter revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            logger.info(f"\nCopywriter revision count: {updated_state.copy_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "copywriter", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"copy_output": _try_parse_json(updated_state.copy_output)}})
        return {
            "copy_output": updated_state.copy_output,
            "image_output": updated_state.image_output,
            "review_output": updated_state.review_output,
            "copy_revision_count": updated_state.copy_revision_count,
            "human_revision_target": updated_state.human_revision_target,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Copywriter agent error ({type(e).__name__})"
        logger.error("💥 Copywriter Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "copywriter", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def creative_hook_matrix_node(state: CampaignState) -> dict:
    """
    Creative Intelligence node for hook generation.
    This node is non-blocking: agent-level failures are persisted as diagnostic
    hook output and the graph continues to Image Prompt.
    """
    logger.info("\n" + "="*80)
    logger.info("LANGGRAPH: EXECUTING CREATIVE HOOK MATRIX NODE")
    logger.info("="*80)

    if state.error or state.status == "error":
        _log_node_execution("creative_hook_matrix", state, skipped=True)
        return {}

    is_targeted_for_revision = (state.human_revision_target == "creative_hook_matrix") or (state.status == "creative_hook_matrix_revision_required")

    if is_targeted_for_revision:
        if state.creative_hook_matrix_output:
            logger.info("   🔄 Clearing previous creative hook matrix output for revision...")
            state.creative_hook_matrix_output = None
    elif state.creative_hook_matrix_output:
        _log_node_execution("creative_hook_matrix", state, skipped=True)
        return {}

    _log_node_execution("creative_hook_matrix", state, skipped=False)

    publish_agent_event(state.campaign_id, "creative_hook_matrix", "running", extra=_get_revision_counts_extra(state))

    if is_targeted_for_revision:
        state.image_output = None
        state.review_output = None

    updated_state = creative_hook_matrix_agent(state)

    if is_targeted_for_revision:
        updated_state.human_revision_target = None

    publish_agent_event(
        state.campaign_id,
        "creative_hook_matrix",
        "completed",
        extra={
            **_get_revision_counts_extra(updated_state),
            "outputs": {"creative_hook_matrix_output": _try_parse_json(updated_state.creative_hook_matrix_output)}
        },
    )
    return {
        "creative_hook_matrix_output": updated_state.creative_hook_matrix_output,
        "image_output": updated_state.image_output,
        "review_output": updated_state.review_output,
        "human_revision_target": updated_state.human_revision_target,
        "status": updated_state.status,
        "error": updated_state.error,
    }


def image_prompt_node(state: CampaignState) -> dict:
    """
    Node 5: Image Prompt Agent
    - Creates DALL-E prompts
    - Visual direction
    """
    logger.info("\n" + "="*80)
    logger.info("🎨 LANGGRAPH: EXECUTING IMAGE PROMPT NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        _log_node_execution("image_prompt", state, skipped=True)
        return {}
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "image_prompt") or (state.status == "image_revision_required")
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.image_output:
            logger.info("   🔄 Clearing previous image output for revision...")
            state.image_output = None
    elif not state.image_output:
        # No existing output means either first run or needs re-run
        logger.info("   🔄 Running image prompt (no existing output)...")
    elif state.image_output:
        # Already has output and not in revision mode - skip
        _log_node_execution("image_prompt", state, skipped=True)
        return {}

    _log_node_execution("image_prompt", state, skipped=False)
    
    publish_agent_event(state.campaign_id, "image_prompt", "running", extra=_get_revision_counts_extra(state))
    
    try:
        # If targeted for revision, clear downstream review output first
        if is_targeted_for_revision:
            logger.info("   🧹 Clearing downstream output (review)...")
            state.review_output = None
        
        updated_state = image_prompt_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.image_revision_count or 0
            updated_state.image_revision_count = current_count + 1
            logger.info(f"\nImage revision count: {updated_state.image_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            logger.info("Clearing human_revision_target (image_prompt revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            logger.info(f"\nImage revision count: {updated_state.image_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "image_prompt", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"image_output": _try_parse_json(updated_state.image_output)}})
        return {
            "image_output": updated_state.image_output,
            "review_output": updated_state.review_output,
            "image_revision_count": updated_state.image_revision_count,
            "human_revision_target": updated_state.human_revision_target,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Image Prompt agent error ({type(e).__name__})"
        logger.error("💥 Image Prompt Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "image_prompt", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def reviewer_node(state: CampaignState) -> dict:
    """
    Node 6: Reviewer Agent
    - Quality assessment
    - Scores all agents
    - Decides approve/revise
    """
    logger.info("\n" + "="*80)
    logger.info("🔍 LANGGRAPH: EXECUTING REVIEWER NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        _log_node_execution("reviewer", state, skipped=True)
        return {}
    
    # CRITICAL: Skip if human already approved
    # After human approval, workflow should go directly to publisher, not back through reviewer
    if state.human_approval_status == "approved":
        _log_node_execution("reviewer", state, skipped=True)
        return {}

    _log_node_execution("reviewer", state, skipped=False)

    
    publish_agent_event(state.campaign_id, "reviewer", "running", extra=_get_revision_counts_extra(state))
    
    try:
        updated_state = reviewer_agent(state)
        
        publish_agent_event(state.campaign_id, "reviewer", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"review_output": _try_parse_json(updated_state.review_output)}})

        return {
            "review_output": updated_state.review_output,
            "human_revision_target": updated_state.human_revision_target,
            "status": updated_state.status,
            "error": updated_state.error,
            # CRITICAL: must return revision counts so LangGraph persists the increments.
            # Without these, the graph state never sees the count grow and the loop
            # never exits because MAX_REVISIONS is never reached.
            "research_revision_count": updated_state.research_revision_count or 0,
            "strategy_revision_count": updated_state.strategy_revision_count or 0,
            "copy_revision_count": updated_state.copy_revision_count or 0,
            "image_revision_count": updated_state.image_revision_count or 0,
        }
    except Exception as e:
        err_msg = str(e).strip() or f"Reviewer agent error ({type(e).__name__})"
        logger.error("💥 Reviewer Node Error | campaign_id=%s | error_type=%s | error=%s", state.campaign_id, type(e).__name__, err_msg, exc_info=True)
        publish_agent_event(state.campaign_id, "reviewer", "failed", error=err_msg, extra=_get_revision_counts_extra(state))
        return {
            "error": err_msg,
            "status": "error",
        }


def human_approval_wrapper(state: CampaignState) -> dict:
    """
    Node 7: Human Approval (HITL)
    - Pauses workflow
    - Waits for human decision
    - Routes based on approval/rejection
    """
    logger.info("\n" + "="*80)
    logger.info("👤 LANGGRAPH: EXECUTING HUMAN APPROVAL NODE")
    logger.info("="*80)
    
    if state.human_approval_status:
        if state.status == "error":
            state.status = "processing"
        state.error = ""

    if state.status == "error" or (state.error and len(str(state.error).strip()) > 0):
        _log_node_execution("human_approval", state, skipped=True)
        return {}
    
    _log_node_execution("human_approval", state, skipped=False)

    try:
        updated_state = human_approval_node(state)
        return {
            "human_approval_status": updated_state.human_approval_status,
            "human_feedback": updated_state.human_feedback,
            "human_revision_target": updated_state.human_revision_target,
            "awaiting_human_approval": updated_state.awaiting_human_approval,
            "research_revision_count": updated_state.research_revision_count,
            "strategy_revision_count": updated_state.strategy_revision_count,
            "copy_revision_count": updated_state.copy_revision_count,
            "image_revision_count": updated_state.image_revision_count,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        logger.info(f"❌ Human Approval Node Error: {e}")
        return {
            "error": str(e),
            "status": "error",
        }


def publisher_node(state: CampaignState) -> dict:
    """
    Node 8: Publisher Agent
    - Distribution plan
    - Content calendar
    - Publishing strategy
    """
    logger.info("\n" + "="*80)
    logger.info("📢 LANGGRAPH: EXECUTING PUBLISHER NODE")
    logger.info("="*80)
    
    if state.error or state.status == "error":
        _log_node_execution("publisher", state, skipped=True)
        return {}
    
    # Check if we're actually waiting for human approval
    if state.awaiting_human_approval:
        _log_node_execution("publisher", state, skipped=True)
        return {}

    _log_node_execution("publisher", state, skipped=False)

    
    publish_agent_event(state.campaign_id, "publisher", "running", extra=_get_revision_counts_extra(state))
    
    try:
        updated_state = publisher_agent(state)
        time.sleep(4.5)  # spacing between agent calls (aligns with 15 RPM limit)
        publish_agent_event(state.campaign_id, "publisher", "completed", extra={**_get_revision_counts_extra(updated_state), "outputs": {"publisher_output": _try_parse_json(updated_state.publisher_output)}})
        return {
            "publisher_output": updated_state.publisher_output,
            "workflow_finished": updated_state.workflow_finished,
            "status": updated_state.status,
            "error": updated_state.error,
        }
    except Exception as e:
        logger.info(f"Publisher Node Error: {e}")
        publish_agent_event(state.campaign_id, "publisher", "failed", error=str(e), extra=_get_revision_counts_extra(state))
        return {
            "error": str(e),
            "status": "error",
        }


def check_cancellation(state: CampaignState) -> str:
    """
    Conditional edge function checked at agent boundaries.
    Returns 'cancelled' to route to cancelled_node, or 'continue' to proceed.
    """
    from workflow.routing import _log_routing
    if is_campaign_cancelled(state.campaign_id):
        logger.info(f"Campaign {state.campaign_id} cancellation detected — routing to cancelled_node")
        return _log_routing("check_cancellation", state, "cancelled")
    return _log_routing("check_cancellation", state, "continue")



def cancelled_node(state: CampaignState) -> dict:
    """Terminal node representing campaign cancellation."""
    logger.info(f"Campaign {state.campaign_id} pipeline halted — cancelled by user")
    return {
        "status": "cancelled",
        "cancelled": True,
        "error": "Campaign cancelled by user"
    }


# ==================== BUILD THE GRAPH ====================

def create_campaign_graph():
    """
    Creates the complete 8-agent campaign workflow graph with HITL.
    
    Returns:
        Compiled LangGraph workflow
    
    Graph Structure:
        START
          ↓
        manager → research → strategy → copywriter → image_prompt → reviewer
          ↓                                                            ↓
        [AI DECISION: approved?]                                       |
          ↓                                                            |
        YES: → human_approval (PAUSE) ───────────────────────────────→|
          ↓                      ↓                                     |
          |            [HUMAN DECISION]                               |
          |                ↓                                           |
          |         YES: → publisher → END                            |
          |          NO: → [route to specific agents] ────────────────→|
          ↓                                                            |
        NO: → [route to specific agents] ──────────────────────────→ |
    """
    
    logger.info("\n🔧 Building LangGraph Campaign Workflow with HITL...")
    
    # 1. Create StateGraph with CampaignState
    graph = StateGraph(CampaignState)
    
    # 2. Add all agent nodes (including cancelled terminal node)
    graph.add_node("manager", manager_node)
    graph.add_node("research", research_node)
    graph.add_node("strategy", strategy_node)
    graph.add_node("copywriter", copywriter_node)
    if ENABLE_CREATIVE_HOOK_MATRIX:
        graph.add_node("creative_hook_matrix", creative_hook_matrix_node)
    graph.add_node("image_prompt", image_prompt_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("human_approval", human_approval_wrapper)
    graph.add_node("publisher", publisher_node)
    graph.add_node("cancelled_node", cancelled_node)
    
    # 3. Add linear edges with cancellation checks (sequential flow)
    graph.add_edge(START, "manager")              # START → manager
    
    graph.add_conditional_edges(
        "manager",
        check_cancellation,
        {
            "cancelled": "cancelled_node",
            "continue": "research"
        }
    )
    graph.add_conditional_edges(
        "research",
        check_cancellation,
        {
            "cancelled": "cancelled_node",
            "continue": "strategy"
        }
    )
    graph.add_conditional_edges(
        "strategy",
        check_cancellation,
        {
            "cancelled": "cancelled_node",
            "continue": "copywriter"
        }
    )
    graph.add_conditional_edges(
        "copywriter",
        check_cancellation,
        {
            "cancelled": "cancelled_node",
            "continue": "creative_hook_matrix" if ENABLE_CREATIVE_HOOK_MATRIX else "image_prompt"
        }
    )
    if ENABLE_CREATIVE_HOOK_MATRIX:
        graph.add_conditional_edges(
            "creative_hook_matrix",
            check_cancellation,
            {
                "cancelled": "cancelled_node",
                "continue": "image_prompt"
            }
        )
    graph.add_conditional_edges(
        "image_prompt",
        check_cancellation,
        {
            "cancelled": "cancelled_node",
            "continue": "reviewer"
        }
    )
    
    # 4. Add conditional edge after reviewer (AI DECISION POINT)
    # Routes based on AI review outcome
    graph.add_conditional_edges(
        "reviewer",                              # From reviewer node
        should_continue_after_reviewer,          # Decision function
        {
            "human_approval": "human_approval",  # If AI approved → go to human approval
            "revise_research": "research",       # If research needs revision → back to research
            "revise_strategy": "strategy",       # If strategy needs revision → back to strategy
            "revise_copy": "copywriter",         # If copy needs revision → back to copywriter
            "revise_hooks": "creative_hook_matrix" if ENABLE_CREATIVE_HOOK_MATRIX else "copywriter",
            "revise_image": "image_prompt",      # If image needs revision → back to image_prompt
            "end": END,                           # If max revisions reached → END
            "cancelled": "cancelled_node"        # If campaign cancelled
        }
    )
    
    # 5. Add conditional edge after human approval (HUMAN DECISION POINT)
    # Routes based on human decision
    graph.add_conditional_edges(
        "human_approval",                        # From human approval node
        route_after_human_approval,              # Decision function
        {
            "publish": "publisher",              # If human approved → go to publisher
            "revise_research": "research",       # If human wants research revision → back to research
            "revise_strategy": "strategy",       # If human wants strategy revision → back to strategy
            "revise_copy": "copywriter",         # If human wants copy revision → back to copywriter
            "revise_hooks": "creative_hook_matrix" if ENABLE_CREATIVE_HOOK_MATRIX else "copywriter",
            "revise_image": "image_prompt",      # If human wants image revision → back to image_prompt
            "end": END,                          # If awaiting human approval → END
            "cancelled": "cancelled_node"        # If campaign cancelled
        }
    )

    
    # 6. Add final edges
    graph.add_edge("publisher", END)              # publisher → END
    graph.add_edge("cancelled_node", END)         # cancelled_node → END
    
    # 7. Compile the graph
    logger.info("✅ Graph with HITL compiled successfully with checkpointer!")
    compiled_graph = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["human_approval"]
    )
    
    return compiled_graph


import threading

_compiled_graph = None
_graph_lock = threading.Lock()


def get_compiled_campaign_graph():
    """Thread-safe singleton getter for compiled LangGraph workflow instance."""
    global _compiled_graph
    if _compiled_graph is not None:
        return _compiled_graph
    with _graph_lock:
        if _compiled_graph is None:
            _compiled_graph = create_campaign_graph()
        return _compiled_graph


def run_campaign(
    campaign_name: str,
    brand_name: str,
    industry: str,
    primary_goal: str,
    target_audience: str,
    brand_voice: str,
    brief: str = None
) -> dict:
    """
    Convenience function to run a complete campaign workflow.
    
    Args:
        campaign_name: Name of the campaign
        brand_name: Brand name
        industry: Industry sector
        primary_goal: Campaign goal
        target_audience: Target audience description
        brand_voice: Brand voice/tone
        brief: Optional campaign brief
    
    Returns:
        Final state as dictionary
    """
    
    # Create initial state
    initial_state = CampaignState(
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brand_voice=brand_voice,
        brief=brief
    )
    
    # Use thread-safe singleton compiled workflow
    workflow = get_compiled_campaign_graph()
    final_state = workflow.invoke(initial_state)
    
    return final_state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    logger.info("=" * 80)
    logger.info("⚠️  This is the workflow graph module.")
    logger.info("    To run a campaign, use: python examples/run_langgraph_campaign.py")
    logger.info("=" * 80)
