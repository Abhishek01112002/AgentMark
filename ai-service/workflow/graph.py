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

from langgraph.graph import StateGraph, START, END
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.manager import manager_agent
from agents.research import research_agent
from agents.strategy import strategy_agent
from agents.copywriter import copywriter_agent
from agents.image_prompt import image_prompt_agent
from agents.reviewer import reviewer_agent
from agents.publisher import publisher_agent
from agents.human_approval import human_approval_node
from workflow.routing import should_continue_after_reviewer, route_after_human_approval
from utils.redis_publisher import publish_agent_event


# ==================== NODE WRAPPER FUNCTIONS ====================
# These wrap your existing agent functions to work with LangGraph

def manager_node(state: CampaignState) -> CampaignState:
    """
    Node 1: Manager Agent
    - Orchestrates the campaign
    - Defines channels, deliverables, timeline
    """
    print("\n" + "="*80)
    print("LANGGRAPH: EXECUTING MANAGER NODE")
    print("="*80)
    
    # Skip if manager already completed (in any revision/approval mode)
    if state.manager_output:
        print("Skipping Manager (already completed)")
        return state
    
    try:
        updated_state = manager_agent(state)
        publish_agent_event(state.campaign_id, "manager", "completed")
        return updated_state
    except Exception as e:
        print(f"Manager Node Error: {e}")
        publish_agent_event(state.campaign_id, "manager", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def research_node(state: CampaignState) -> CampaignState:
    """
    Node 2: Research Agent
    - Market research
    - Competitor analysis
    - Audience insights
    """
    print("\n" + "="*80)
    print("🔍 LANGGRAPH: EXECUTING RESEARCH NODE")
    print("="*80)
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "research")
    
    # Skip logic: Only run if targeted for revision OR first time
    if is_targeted_for_revision:
        # Clear output for fresh revision
        if state.research_output:
            print("   🔄 Clearing previous research output for revision...")
            state.research_output = None
    elif state.research_output:
        # Already has output and not targeted - skip
        print("⏭️  Skipping Research (already completed)")
        return state
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            print("   🧹 Clearing all downstream outputs...")
            state.strategy_output = None
            state.copy_output = None
            state.image_output = None
            state.review_output = None
        
        updated_state = research_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.research_revision_count or 0
            updated_state.research_revision_count = current_count + 1
            print(f"\nResearch revision count: {updated_state.research_revision_count}/3 (human/AI requested revision)")
        
        # Clear target after completing targeted revision
        if is_targeted_for_revision:
            print("Clearing human_revision_target (research revision complete)")
            updated_state.human_revision_target = None
        
        publish_agent_event(state.campaign_id, "research", "completed")
        return updated_state
    except Exception as e:
        print(f"Research Node Error: {e}")
        publish_agent_event(state.campaign_id, "research", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def strategy_node(state: CampaignState) -> CampaignState:
    """
    Node 3: Strategy Agent
    - Marketing strategy
    - Positioning and messaging
    - Channel strategy
    """
    print("\n" + "="*80)
    print("📋 LANGGRAPH: EXECUTING STRATEGY NODE")
    print("="*80)
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "strategy")
    
    # Check if upstream research output was cleared (means research just re-ran)
    # We check if research_output exists - if it exists, research already ran
    # We DON'T check human_revision_target because research clears it after completion
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.strategy_output:
            print("   🔄 Clearing previous strategy output for revision...")
            state.strategy_output = None
    elif not state.strategy_output:
        # No existing output means either first run or needs re-run
        # (Research may have just re-run and cleared downstream outputs)
        print("   🔄 Running strategy (no existing output)...")
    elif state.strategy_output:
        # Already has output and not in revision mode - skip
        print("⏭️  Skipping Strategy (already completed)")
        return state
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            print("   🧹 Clearing downstream outputs (copy, image, review)...")
            state.copy_output = None
            state.image_output = None
            state.review_output = None
        
        updated_state = strategy_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.strategy_revision_count or 0
            updated_state.strategy_revision_count = current_count + 1
            print(f"\nStrategy revision count: {updated_state.strategy_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            print("Clearing human_revision_target (strategy revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            print(f"\nStrategy revision count: {updated_state.strategy_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "strategy", "completed")
        return updated_state
    except Exception as e:
        print(f"Strategy Node Error: {e}")
        publish_agent_event(state.campaign_id, "strategy", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def copywriter_node(state: CampaignState) -> CampaignState:
    """
    Node 4: Copywriter Agent
    - Creates marketing copy
    - Headlines, CTAs, body copy
    """
    print("\n" + "="*80)
    print("✍️  LANGGRAPH: EXECUTING COPYWRITER NODE")
    print("="*80)
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "copywriter")
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.copy_output:
            print("   🔄 Clearing previous copywriter output for revision...")
            state.copy_output = None
    elif not state.copy_output:
        # No existing output means either first run or needs re-run
        print("   🔄 Running copywriter (no existing output)...")
    elif state.copy_output:
        # Already has output and not in revision mode - skip
        print("⏭️  Skipping Copywriter (already completed)")
        return state
    
    try:
        # If targeted for revision, clear all downstream outputs first
        if is_targeted_for_revision:
            print("   🧹 Clearing downstream outputs (image, review)...")
            state.image_output = None
            state.review_output = None
        
        updated_state = copywriter_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.copy_revision_count or 0
            updated_state.copy_revision_count = current_count + 1
            print(f"\nCopywriter revision count: {updated_state.copy_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            print("Clearing human_revision_target (copywriter revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            print(f"\nCopywriter revision count: {updated_state.copy_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "copywriter", "completed")
        return updated_state
    except Exception as e:
        print(f"Copywriter Node Error: {e}")
        publish_agent_event(state.campaign_id, "copywriter", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def image_prompt_node(state: CampaignState) -> CampaignState:
    """
    Node 5: Image Prompt Agent
    - Creates DALL-E prompts
    - Visual direction
    """
    print("\n" + "="*80)
    print("🎨 LANGGRAPH: EXECUTING IMAGE PROMPT NODE")
    print("="*80)
    
    # Check if this agent is targeted for revision
    is_targeted_for_revision = (state.human_revision_target == "image_prompt")
    
    # Skip logic
    if is_targeted_for_revision:
        # This agent is targeted - clear output and re-run
        if state.image_output:
            print("   🔄 Clearing previous image output for revision...")
            state.image_output = None
    elif not state.image_output:
        # No existing output means either first run or needs re-run
        print("   🔄 Running image prompt (no existing output)...")
    elif state.image_output:
        # Already has output and not in revision mode - skip
        print("⏭️  Skipping Image Prompt (already completed)")
        return state
    
    try:
        # If targeted for revision, clear downstream review output first
        if is_targeted_for_revision:
            print("   🧹 Clearing downstream output (review)...")
            state.review_output = None
        
        updated_state = image_prompt_agent(state)
        
        # Increment revision count ONLY if this agent was targeted for revision
        if is_targeted_for_revision:
            current_count = updated_state.image_revision_count or 0
            updated_state.image_revision_count = current_count + 1
            print(f"\nImage revision count: {updated_state.image_revision_count}/3 (human/AI requested revision)")
            # Clear target after completing targeted revision
            print("Clearing human_revision_target (image_prompt revision complete)")
            updated_state.human_revision_target = None
        else:
            # Don't increment for downstream re-runs
            print(f"\nImage revision count: {updated_state.image_revision_count or 0}/3 (no increment - downstream re-run)")
        
        publish_agent_event(state.campaign_id, "image_prompt", "completed")
        return updated_state
    except Exception as e:
        print(f"Image Prompt Node Error: {e}")
        publish_agent_event(state.campaign_id, "image_prompt", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def reviewer_node(state: CampaignState) -> CampaignState:
    """
    Node 6: Reviewer Agent
    - Quality assessment
    - Scores all agents
    - Decides approve/revise
    """
    print("\n" + "="*80)
    print("🔍 LANGGRAPH: EXECUTING REVIEWER NODE")
    print("="*80)
    
    # CRITICAL: Skip if human already approved
    # After human approval, workflow should go directly to publisher, not back through reviewer
    if state.human_approval_status == "approved":
        print("⏭️  Skipping Reviewer (human already approved - going to publisher)")
        return state
    
    try:
        updated_state = reviewer_agent(state)
        publish_agent_event(state.campaign_id, "reviewer", "completed")
        return updated_state
    except Exception as e:
        print(f"Reviewer Node Error: {e}")
        publish_agent_event(state.campaign_id, "reviewer", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


def human_approval_wrapper(state: CampaignState) -> CampaignState:
    """
    Node 7: Human Approval (HITL)
    - Pauses workflow
    - Waits for human decision
    - Routes based on approval/rejection
    """
    print("\n" + "="*80)
    print("👤 LANGGRAPH: EXECUTING HUMAN APPROVAL NODE")
    print("="*80)
    
    try:
        updated_state = human_approval_node(state)
        return updated_state
    except Exception as e:
        print(f"❌ Human Approval Node Error: {e}")
        state.error = str(e)
        state.status = "error"
        return state


def publisher_node(state: CampaignState) -> CampaignState:
    """
    Node 8: Publisher Agent
    - Distribution plan
    - Content calendar
    - Publishing strategy
    """
    print("\n" + "="*80)
    print("📢 LANGGRAPH: EXECUTING PUBLISHER NODE")
    print("="*80)
    
    # Check if we're actually waiting for human approval
    if state.awaiting_human_approval:
        print("Workflow paused - awaiting human approval")
        print("   Publisher will NOT execute")
        print("   After human approves, invoke workflow again")
        return state
    
    try:
        updated_state = publisher_agent(state)
        publish_agent_event(state.campaign_id, "publisher", "completed")
        return updated_state
    except Exception as e:
        print(f"Publisher Node Error: {e}")
        publish_agent_event(state.campaign_id, "publisher", "failed", error=str(e))
        state.error = str(e)
        state.status = "error"
        return state


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
    
    print("\n🔧 Building LangGraph Campaign Workflow with HITL...")
    
    # 1. Create StateGraph with CampaignState
    graph = StateGraph(CampaignState)
    
    # 2. Add all 8 agent nodes (7 agents + human approval)
    graph.add_node("manager", manager_node)
    graph.add_node("research", research_node)
    graph.add_node("strategy", strategy_node)
    graph.add_node("copywriter", copywriter_node)
    graph.add_node("image_prompt", image_prompt_node)
    graph.add_node("reviewer", reviewer_node)
    graph.add_node("human_approval", human_approval_wrapper)
    graph.add_node("publisher", publisher_node)
    
    # 3. Add linear edges (sequential flow - FIRST TIME ONLY)
    graph.add_edge(START, "manager")              # START → manager
    graph.add_edge("manager", "research")         # manager → research
    graph.add_edge("research", "strategy")        # research → strategy  
    graph.add_edge("strategy", "copywriter")      # strategy → copywriter
    graph.add_edge("copywriter", "image_prompt")  # copywriter → image_prompt
    graph.add_edge("image_prompt", "reviewer")    # image_prompt → reviewer
    
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
            "revise_image": "image_prompt",      # If image needs revision → back to image_prompt
            "end": END                           # If max revisions reached → END
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
            "revise_image": "image_prompt",      # If human wants image revision → back to image_prompt
        }
    )
    
    # 6. Add final edge
    graph.add_edge("publisher", END)              # publisher → END
    
    # 7. Compile the graph
    print("✅ Graph with HITL compiled successfully!")
    compiled_graph = graph.compile()
    
    return compiled_graph


# ==================== CONVENIENCE FUNCTION ====================

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
    
    # Create and run workflow
    workflow = create_campaign_graph()
    final_state = workflow.invoke(initial_state)
    
    return final_state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    print("=" * 80)
    print("⚠️  This is the workflow graph module.")
    print("    To run a campaign, use: python examples/run_langgraph_campaign.py")
    print("=" * 80)
