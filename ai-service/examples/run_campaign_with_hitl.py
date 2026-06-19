"""
EXAMPLE: Running Campaign with Human-In-The-Loop (HITL)

This example demonstrates:
1. Starting a campaign workflow
2. Workflow pausing at human approval
3. Human reviewing and making decision
4. Continuing workflow based on decision

WORKFLOW FLOW:
  Manager → Research → Strategy → Copywriter → Image Prompt → Reviewer
    ↓
  AI Approved? YES → Human Approval (PAUSE HERE)
    ↓
  Human Decision:
    - APPROVE → Publisher → END
    - REJECT → Back to specific agent → ... → Reviewer → Human Approval
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.human_approval import submit_human_approval, get_campaign_summary
from workflow.graph import create_campaign_graph


def run_campaign_with_hitl():
    """
    Example: Run a campaign that requires human approval
    """
    
    print("\n" + "="*80)
    print("🚀 STARTING CAMPAIGN WITH HUMAN-IN-THE-LOOP")
    print("="*80)
    
    # ========== STEP 1: CREATE INITIAL STATE ==========
    print("\n[STEP 1] Creating initial campaign state...")
    
    initial_state = CampaignState(
        campaign_name="Summer Sale 2024",
        brand_name="TechGadgets Pro",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Tech enthusiasts aged 25-45, interested in smart home devices and gadgets",
        brand_voice="friendly",
        brief="Launch a summer sale campaign for our new smart home product line with 30% off"
    )
    
    print(f"✓ Campaign: {initial_state.campaign_name}")
    print(f"✓ Brand: {initial_state.brand_name}")
    print(f"✓ Goal: {initial_state.primary_goal}")
    
    # ========== STEP 2: CREATE WORKFLOW ==========
    print("\n[STEP 2] Creating workflow graph...")
    
    workflow = create_campaign_graph()
    print("✓ Workflow created with HITL")
    
    # ========== STEP 3: RUN WORKFLOW (WILL PAUSE AT HUMAN APPROVAL) ==========
    print("\n[STEP 3] Starting workflow execution...")
    print("   This will run through all agents and pause at human approval")
    print("-"*80)
    
    # Run workflow - it will pause at human_approval node
    state = workflow.invoke(initial_state)
    
    # ========== STEP 4: CHECK IF AWAITING HUMAN APPROVAL ==========
    print("\n[STEP 4] Checking workflow status...")
    
    if state.awaiting_human_approval:
        print("✓ Workflow PAUSED - Awaiting Human Approval")
        print(f"   Status: {state.status}")
        
        # ========== STEP 5: DISPLAY CAMPAIGN SUMMARY FOR HUMAN ==========
        print("\n[STEP 5] Campaign Summary for Human Review:")
        print("-"*80)
        
        summary = get_campaign_summary(state)
        
        # Show basic info
        campaign_info = summary["campaign_info"]
        print(f"\nCampaign: {campaign_info['name']}")
        print(f"Brand:    {campaign_info['brand']}")
        print(f"Goal:     {campaign_info['goal']}")
        
        # Show AI review scores
        if summary["ai_review"]:
            ai_review = summary["ai_review"]
            print(f"\nAI Quality Assessment:")
            print(f"  Overall Score: {ai_review['overall_score']}/100")
            print(f"  Research:      {ai_review['research_score']}/100")
            print(f"  Strategy:      {ai_review['strategy_score']}/100")
            print(f"  Copy:          {ai_review['copy_score']}/100")
            print(f"  Image:         {ai_review['image_score']}/100")
        
        print("\n" + "="*80)
        print("👤 HUMAN DECISION REQUIRED")
        print("="*80)
        
        # ========== STEP 6: SIMULATE HUMAN DECISION ==========
        print("\n[STEP 6] Human makes decision...")
        print("-"*80)
        
        # SCENARIO 1: Human approves
        print("\nSCENARIO 1: Human Approves")
        decision = {
            "action": "approve",
            "feedback": "Looks great! The messaging aligns with our brand and the strategy is solid."
        }
        
        # SCENARIO 2: Human rejects and wants copy revision
        # Uncomment to test rejection flow
        # print("\nSCENARIO 2: Human Rejects")
        # decision = {
        #     "action": "reject",
        #     "feedback": "I want more luxury tone in the copy. Make it more premium.",
        #     "revision_target": "copywriter"
        # }
        
        print(f"   Action: {decision['action']}")
        print(f"   Feedback: {decision['feedback']}")
        if decision['action'] == 'reject':
            print(f"   Revision Target: {decision.get('revision_target')}")
        
        # ========== STEP 7: SUBMIT HUMAN DECISION ==========
        print("\n[STEP 7] Submitting human decision...")
        
        state = submit_human_approval(state, decision)
        
        print(f"✓ Decision recorded: {state.human_approval_status}")
        
        # ========== STEP 8: CONTINUE WORKFLOW ==========
        print("\n[STEP 8] Continuing workflow...")
        print("-"*80)
        
        # Continue workflow from current state
        final_state = workflow.invoke(state)
        
        # ========== STEP 9: CHECK FINAL STATUS ==========
        print("\n[STEP 9] Final workflow status:")
        print("-"*80)
        
        print(f"   Status: {final_state.status}")
        print(f"   Human Approval: {final_state.human_approval_status}")
        
        if final_state.publisher_output:
            print("   ✓ Publisher completed")
            print(f"   Publisher output length: {len(final_state.publisher_output)} chars")
        
        print("\n" + "="*80)
        print("✅ CAMPAIGN WORKFLOW COMPLETED")
        print("="*80)
        
        return final_state
    
    else:
        print("⚠️  Workflow did not pause for human approval")
        print(f"   Status: {state.status}")
        return state


def demonstrate_rejection_flow():
    """
    Example: Demonstrate what happens when human rejects
    """
    
    print("\n\n" + "="*80)
    print("📝 DEMONSTRATION: HUMAN REJECTION FLOW")
    print("="*80)
    
    print("\nThis demonstrates the revision loop when human rejects:")
    print("  1. All agents complete → AI approves → Human reviews")
    print("  2. Human rejects → specifies which agent to revise")
    print("  3. That agent re-runs with human feedback")
    print("  4. Downstream agents re-run")
    print("  5. Reviewer checks again")
    print("  6. Back to Human approval")
    print("  7. Human approves → Publisher → END")
    
    print("\nExample Human Rejection Scenarios:")
    print("-"*80)
    
    scenarios = [
        {
            "feedback": "I want more luxury tone in the copy",
            "target": "copywriter",
            "reason": "Copy doesn't match desired tone"
        },
        {
            "feedback": "Research the premium segment more thoroughly",
            "target": "research",
            "reason": "Need better market insights"
        },
        {
            "feedback": "Strategy should focus more on exclusivity",
            "target": "strategy",
            "reason": "Strategic direction needs adjustment"
        },
        {
            "feedback": "Images should look more sophisticated",
            "target": "image_prompt",
            "reason": "Visual direction doesn't match brand"
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\n{i}. {scenario['reason']}")
        print(f"   Feedback: \"{scenario['feedback']}\"")
        print(f"   Target: {scenario['target']}")
        print(f"   Flow: human_approval → {scenario['target']} → ... → reviewer → human_approval")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("HUMAN-IN-THE-LOOP (HITL) EXAMPLE")
    print("="*80)
    
    # Run the main example
    final_state = run_campaign_with_hitl()
    
    # Show rejection flow demonstration
    demonstrate_rejection_flow()
    
    print("\n\n" + "="*80)
    print("📚 HOW TO USE HITL IN YOUR CODE")
    print("="*80)
    
    print("""
1. CREATE WORKFLOW:
   from workflow.graph import create_campaign_graph
   workflow = create_campaign_graph()

2. START CAMPAIGN:
   initial_state = CampaignState(...)
   state = workflow.invoke(initial_state)

3. CHECK IF PAUSED:
   if state.awaiting_human_approval:
       # Workflow is paused, show campaign to human

4. GET CAMPAIGN SUMMARY:
   from agents.human_approval import get_campaign_summary
   summary = get_campaign_summary(state)

5. COLLECT HUMAN DECISION:
   decision = {
       "action": "approve" or "reject",
       "feedback": "Human's comments",
       "revision_target": "copywriter"  # if rejected
   }

6. SUBMIT DECISION:
   from agents.human_approval import submit_human_approval
   state = submit_human_approval(state, decision)

7. CONTINUE WORKFLOW:
   final_state = workflow.invoke(state)
    """)
    
    print("="*80)
