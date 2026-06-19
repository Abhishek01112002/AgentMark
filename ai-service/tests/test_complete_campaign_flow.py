"""
COMPLETE CAMPAIGN FLOW TEST with HITL

This runs the entire campaign workflow:
1. Reads input from campaign_input.json
2. Manager → Research → Strategy → Copywriter → Image → Reviewer
3. Human Approval (INTERACTIVE - YOU decide approve/reject)
4. Publisher (if approved) OR Revision (if rejected)

Usage:
    python tests/test_complete_campaign_flow.py
"""

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.human_approval import submit_human_approval, get_campaign_summary
from workflow.graph import create_campaign_graph


def load_campaign_input():
    """Load campaign input from JSON file"""
    input_file = Path(__file__).parent.parent / "examples" / "inputs" / "campaign_input.json"
    
    with open(input_file, 'r') as f:
        data = json.load(f)
    
    return data


def test_complete_campaign_flow():
    print("="*80)
    print("COMPLETE CAMPAIGN FLOW TEST WITH HITL")
    print("="*80)
    
    # Step 1: Load campaign input from JSON
    print("\n[1] Loading campaign input from campaign_input.json...")
    campaign_data = load_campaign_input()
    
    print(f"   Campaign: {campaign_data['campaign_name']}")
    print(f"   Brand:    {campaign_data['brand_name']}")
    print(f"   Industry: {campaign_data['industry']}")
    print(f"   Goal:     {campaign_data['primary_goal']}")
    print(f"   Voice:    {campaign_data['brand_voice']}")
    
    # Step 2: Create workflow
    print("\n[2] Creating workflow graph...")
    workflow = create_campaign_graph()
    
    # Step 3: Create campaign state from input
    print("\n[3] Creating campaign state...")
    state = CampaignState(
        campaign_name=campaign_data['campaign_name'],
        brand_name=campaign_data['brand_name'],
        industry=campaign_data['industry'],
        primary_goal=campaign_data['primary_goal'],
        target_audience=campaign_data['target_audience'],
        brand_voice=campaign_data['brand_voice'],
        brief=campaign_data.get('brief')
    )
    
    # Step 4: First run - will execute all agents and pause at human approval
    print("\n[4] Starting workflow execution...")
    print("   This will run: Manager → Research → Strategy → Copywriter → Image → Reviewer")
    print("-"*80)
    
    state = workflow.invoke(state)
    
    # Convert dict to CampaignState if needed
    if isinstance(state, dict):
        state = CampaignState(**state)
    
    # Step 5: Check if paused at human approval
    print("\n[5] Checking workflow status...")
    if state.awaiting_human_approval:
        print("✓ Workflow PAUSED at Human Approval")
        print(f"  Status: {state.status}")
        print(f"  Approval status: {state.human_approval_status}")
    else:
        print("✗ ERROR: Workflow did not pause at human approval")
        return False
    
    # Step 6: Human makes decision (INTERACTIVE)
    print("\n[6] Human decision required...")
    print("\n" + "="*80)
    print("👤 YOUR DECISION REQUIRED")
    print("="*80)
    
    # Show campaign summary
    summary = get_campaign_summary(state)
    
    print(f"\n📋 Campaign: {summary['campaign_info']['name']}")
    print(f"   Brand:    {summary['campaign_info']['brand']}")
    print(f"   Goal:     {summary['campaign_info']['goal']}")
    
    if summary["ai_review"]:
        print(f"\n📊 AI Quality Scores:")
        print(f"   Overall:   {summary['ai_review']['overall_score']}/100")
        print(f"   Research:  {summary['ai_review']['research_score']}/100")
        print(f"   Strategy:  {summary['ai_review']['strategy_score']}/100")
        print(f"   Copy:      {summary['ai_review']['copy_score']}/100")
        print(f"   Image:     {summary['ai_review']['image_score']}/100")
    
    print("\n" + "="*80)
    print("Options:")
    print("  1. Type 'approve' to publish campaign")
    print("  2. Type 'reject' to request changes")
    print("="*80)
    
    # Get user input
    user_action = input("\nYour decision (approve/reject): ").strip().lower()
    
    if user_action == "approve":
        user_feedback = input("Feedback (optional, press Enter to skip): ").strip()
        decision = {
            "action": "approve",
            "feedback": user_feedback or "Approved"
        }
        print("\n✅ Campaign APPROVED")
    
    elif user_action == "reject":
        print("\nWhich agent needs revision?")
        print("  1. research      - Redo market research")
        print("  2. strategy      - Revise marketing strategy")
        print("  3. copywriter    - Rewrite campaign copy")
        print("  4. image_prompt  - Regenerate visual prompts")
        
        user_target = input("\nTarget agent: ").strip().lower()
        user_feedback = input("What needs to change: ").strip()
        
        if user_target not in ["research", "strategy", "copywriter", "image_prompt"]:
            print(f"⚠️  Invalid target '{user_target}', defaulting to 'copywriter'")
            user_target = "copywriter"
        
        decision = {
            "action": "reject",
            "feedback": user_feedback or "Needs revision",
            "revision_target": user_target
        }
        print(f"\n⚠️  Campaign REJECTED - Will revise {user_target}")
    
    else:
        print(f"\n⚠️  Invalid action '{user_action}', defaulting to APPROVE")
        decision = {
            "action": "approve",
            "feedback": "Auto-approved (invalid input)"
        }
    
    # Step 7: Submit decision
    print("\n[7] Submitting your decision...")
    state = submit_human_approval(state, decision)
    
    print(f"✓ Decision submitted")
    print(f"  Awaiting approval: {state.awaiting_human_approval}")
    print(f"  Approval status: {state.human_approval_status}")
    
    # Step 8: Resume workflow
    print("\n[8] Resuming workflow...")
    if decision["action"] == "reject":
        print(f"   {decision['revision_target']} will re-run...")
        print("   Downstream agents will update...")
        print("   Reviewer will check again...")
        print("   Back to Human Approval...")
    else:
        print("   Publisher will execute...")
    
    print("-"*80)
    
    state = workflow.invoke(state)
    
    # Convert dict to CampaignState if needed
    if isinstance(state, dict):
        state = CampaignState(**state)
    
    # Step 9: If rejected, loop until approved (max 3 times)
    max_revision_loops = 3
    current_loop = 1
    
    while state.awaiting_human_approval and current_loop <= max_revision_loops:
        print(f"\n[9.{current_loop}] Revision complete - Human approval required again...")
        print("\n" + "="*80)
        print(f"👤 REVISION #{current_loop} - YOUR DECISION REQUIRED")
        print("="*80)
        
        # Show updated campaign summary
        summary = get_campaign_summary(state)
        
        print(f"\n📋 Campaign: {summary['campaign_info']['name']}")
        print(f"   Brand:    {summary['campaign_info']['brand']}")
        
        if summary["ai_review"]:
            print(f"\n📊 AI Quality Scores (Updated):")
            print(f"   Overall:   {summary['ai_review']['overall_score']}/100")
            print(f"   Research:  {summary['ai_review']['research_score']}/100")
            print(f"   Strategy:  {summary['ai_review']['strategy_score']}/100")
            print(f"   Copy:      {summary['ai_review']['copy_score']}/100")
            print(f"   Image:     {summary['ai_review']['image_score']}/100")
        
        print(f"\n📊 Revision Counts:")
        print(f"   Research:  {state.research_revision_count or 0}/3")
        print(f"   Strategy:  {state.strategy_revision_count or 0}/3")
        print(f"   Copy:      {state.copy_revision_count or 0}/3")
        print(f"   Image:     {state.image_revision_count or 0}/3")
        
        # Check if any agent has reached max revisions
        agents_at_max = []
        if (state.research_revision_count or 0) >= 3:
            agents_at_max.append("research")
        if (state.strategy_revision_count or 0) >= 3:
            agents_at_max.append("strategy")
        if (state.copy_revision_count or 0) >= 3:
            agents_at_max.append("copywriter")
        if (state.image_revision_count or 0) >= 3:
            agents_at_max.append("image_prompt")
        
        # Determine which agents CAN be safely revised
        safe_to_revise = []
        revision_counts = {
            "research": state.research_revision_count or 0,
            "strategy": state.strategy_revision_count or 0,
            "copywriter": state.copy_revision_count or 0,
            "image_prompt": state.image_revision_count or 0
        }
        
        # Check each agent and its downstream dependencies
        for agent in ["research", "strategy", "copywriter", "image_prompt"]:
            if revision_counts[agent] >= 3:
                continue  # Agent itself is maxed out
            
            # Check if downstream agents would exceed limit
            downstream = {
                "research": ["strategy", "copywriter", "image_prompt"],
                "strategy": ["copywriter", "image_prompt"],
                "copywriter": ["image_prompt"],
                "image_prompt": []
            }
            
            downstream_blocked = any(
                revision_counts.get(d, 0) >= 3 
                for d in downstream.get(agent, [])
            )
            
            if not downstream_blocked:
                safe_to_revise.append(agent)
        
        if agents_at_max:
            print(f"\n⚠️  WARNING: Following agents at MAX revisions (3/3): {', '.join(agents_at_max)}")
            print("   These agents cannot be revised further.")
        
        if safe_to_revise:
            print(f"\n✅ Agents SAFE to revise: {', '.join(safe_to_revise)}")
            print("   (These won't cause downstream agents to exceed 3/3)")
        else:
            print("\n❌ NO AGENTS available for revision - all blocked by dependencies")
            print("   You MUST approve the campaign.")
        
        print("\n" + "="*80)
        print("Options:")
        print("  1. Type 'approve' to publish campaign")
        print("  2. Type 'reject' to request more changes (if agents available)")
        print("="*80)
        
        # Get user input again
        user_action = input("\nYour decision (approve/reject): ").strip().lower()
        
        if user_action == "approve":
            user_feedback = input("Feedback (optional, press Enter to skip): ").strip()
            decision = {
                "action": "approve",
                "feedback": user_feedback or "Approved"
            }
            print("\n✅ Campaign APPROVED")
        
        elif user_action == "reject":
            print("\nWhich agent needs revision?")
            print("  1. research      - Redo market research")
            print("  2. strategy      - Revise marketing strategy")
            print("  3. copywriter    - Rewrite campaign copy")
            print("  4. image_prompt  - Regenerate visual prompts")
            
            user_target = input("\nTarget agent: ").strip().lower()
            user_feedback = input("What needs to change: ").strip()
            
            if user_target not in ["research", "strategy", "copywriter", "image_prompt"]:
                print(f"⚠️  Invalid target '{user_target}', defaulting to 'copywriter'")
                user_target = "copywriter"
            
            decision = {
                "action": "reject",
                "feedback": user_feedback or "Needs revision",
                "revision_target": user_target
            }
            print(f"\n⚠️  Campaign REJECTED - Will revise {user_target}")
        
        else:
            print(f"\n⚠️  Invalid action '{user_action}', defaulting to APPROVE")
            decision = {
                "action": "approve",
                "feedback": "Auto-approved (invalid input)"
            }
        
        # Submit decision
        print(f"\n[{9 + current_loop}] Submitting your decision...")
        try:
            state = submit_human_approval(state, decision)
            
            print(f"✓ Decision submitted")
            print(f"  Awaiting approval: {state.awaiting_human_approval}")
            print(f"  Approval status: {state.human_approval_status}")
            
        except ValueError as e:
            print(f"\n❌ ERROR: {e}")
            print("\n" + "="*80)
            print("⚠️  CANNOT PROCEED WITH REJECTION")
            print("="*80)
            print("The selected agent has reached MAX_REVISIONS (3/3).")
            print("\nYour options:")
            print("  1. Approve the campaign as-is")
            print("  2. Choose a different agent that hasn't hit 3/3")
            print("\nFor this test, we'll AUTO-APPROVE and publish.")
            print("="*80)
            
            # Force approval to exit gracefully
            decision = {"action": "approve", "feedback": "Max revisions reached - auto-approved"}
            state = submit_human_approval(state, decision)
            print("\n✅ Campaign AUTO-APPROVED (max revisions enforced)")
        
        # Resume workflow again
        if decision["action"] == "reject":
            print(f"\n[{10 + current_loop}] Resuming workflow for revision #{current_loop + 1}...")
            print("-"*80)
            state = workflow.invoke(state)
            
            # Convert dict to CampaignState if needed
            if isinstance(state, dict):
                state = CampaignState(**state)
            
            current_loop += 1
        else:
            # Approved, execute publisher
            print(f"\n[{10 + current_loop}] Resuming workflow to publish...")
            print("-"*80)
            state = workflow.invoke(state)
            
            # Convert dict to CampaignState if needed
            if isinstance(state, dict):
                state = CampaignState(**state)
            
            break
    
    # Step 10: Final verification
    print(f"\n[{10 + current_loop}] Checking final state...")
    
    if state.awaiting_human_approval:
        print("⚠️  Still awaiting approval (max revision loops reached)")
        print(f"  Current revision counts: R={state.research_revision_count or 0}, S={state.strategy_revision_count or 0}, C={state.copy_revision_count or 0}, I={state.image_revision_count or 0}")
        return True
    elif state.publisher_output:
        print("✓ Publisher executed successfully")
        print(f"  Publisher output: {len(state.publisher_output)} characters")
        print("✓ Campaign COMPLETED")
        return True
    else:
        print("✗ Unexpected final state")
        return False


if __name__ == "__main__":
    print("\n" + "="*80)
    print("🚀 STARTING COMPLETE CAMPAIGN FLOW")
    print("="*80)
    print("\nThis will:")
    print("  1. Load input from examples/inputs/campaign_input.json")
    print("  2. Run all agents (Manager → Research → Strategy → Copy → Image → Reviewer)")
    print("  3. Pause at Human Approval for YOUR decision")
    print("  4. Continue based on your approve/reject decision")
    print("\nPress Ctrl+C to cancel anytime")
    print("="*80)
    
    input("\nPress Enter to start...")
    
    try:
        success = test_complete_campaign_flow()
        
        print("\n" + "="*80)
        if success:
            print("✅ TEST PASSED: Complete campaign flow executed successfully")
        else:
            print("❌ TEST FAILED: Issues detected in campaign flow")
        print("="*80)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test cancelled by user")
    except Exception as e:
        print(f"\n\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
