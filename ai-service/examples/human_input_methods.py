"""
HOW HUMAN PROVIDES INPUT - HITL System

This file demonstrates different ways a human can provide their approval/rejection
decision to the AI workflow.
"""

import sys
from pathlib import Path
import json

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from agents.human_approval import submit_human_approval, get_campaign_summary
from workflow.graph import create_campaign_graph


# ==================== METHOD 1: DIRECT FUNCTION CALL ====================

def method_1_direct_call():
    """
    METHOD 1: Direct Function Call (CLI/Script)
    
    Use case: Testing, CLI tools, Jupyter notebooks
    """
    print("\n" + "="*80)
    print("METHOD 1: DIRECT FUNCTION CALL")
    print("="*80)
    
    # Assume workflow has run and paused
    # state = workflow.invoke(initial_state)
    
    # Create mock state for demo
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="Test Brand",
        industry="saas",
        primary_goal="awareness",
        target_audience="Developers",
        brand_voice="professional",
        awaiting_human_approval=True,
        human_approval_status="pending"
    )
    
    print("\n1. Workflow paused - awaiting human approval")
    print(f"   Status: {state.awaiting_human_approval}")
    
    # Human decides (could be from CLI input, config file, etc.)
    print("\n2. Human reviews and makes decision:")
    
    # OPTION A: Approve
    decision = {
        "action": "approve",
        "feedback": "Looks great! Ship it."
    }
    
    # OPTION B: Reject
    # decision = {
    #     "action": "reject",
    #     "feedback": "Make the copy more casual and friendly",
    #     "revision_target": "copywriter"
    # }
    
    print(f"   Decision: {decision['action']}")
    print(f"   Feedback: {decision['feedback']}")
    
    # Submit decision
    state = submit_human_approval(state, decision)
    
    print(f"\n3. Decision submitted:")
    print(f"   Human status: {state.human_approval_status}")
    print(f"   Awaiting approval: {state.awaiting_human_approval}")
    
    return state


# ==================== METHOD 2: JSON FILE ====================

def method_2_json_file():
    """
    METHOD 2: JSON File Input
    
    Use case: Batch processing, scheduled approvals, file-based workflows
    """
    print("\n" + "="*80)
    print("METHOD 2: JSON FILE INPUT")
    print("="*80)
    
    # Create mock state
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="Test Brand",
        industry="saas",
        primary_goal="awareness",
        target_audience="Developers",
        brand_voice="professional",
        awaiting_human_approval=True,
        human_approval_status="pending"
    )
    
    print("\n1. Save campaign state to file when paused:")
    
    # Save state for human review
    state_file = "/tmp/campaign_awaiting_approval.json"
    with open(state_file, 'w') as f:
        json.dump(state.dict(), f, indent=2)
    
    print(f"   Saved to: {state_file}")
    
    print("\n2. Human reviews file and creates decision.json:")
    
    # Human creates this file
    decision_file = "/tmp/human_decision.json"
    decision = {
        "action": "approve",
        "feedback": "Campaign approved after review"
    }
    
    with open(decision_file, 'w') as f:
        json.dump(decision, f, indent=2)
    
    print(f"   Decision saved to: {decision_file}")
    print(f"   Content: {json.dumps(decision, indent=2)}")
    
    print("\n3. System reads decision and continues:")
    
    # Load decision
    with open(decision_file, 'r') as f:
        decision = json.load(f)
    
    # Submit decision
    state = submit_human_approval(state, decision)
    
    print(f"   Status: {state.human_approval_status}")
    
    return state


# ==================== METHOD 3: COMMAND LINE ARGUMENTS ====================

def method_3_cli_args():
    """
    METHOD 3: Command Line Arguments
    
    Use case: Shell scripts, automation, CI/CD pipelines
    
    Example usage:
        python approve_campaign.py --action approve --feedback "Looks good"
        python approve_campaign.py --action reject --target copywriter --feedback "More casual tone"
    """
    print("\n" + "="*80)
    print("METHOD 3: COMMAND LINE ARGUMENTS")
    print("="*80)
    
    # Simulate CLI args
    import argparse
    
    print("\n1. Parse command line arguments:")
    
    # This would normally come from sys.argv
    cli_args = [
        "--action", "approve",
        "--feedback", "Great work! Ready to publish."
    ]
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--action", choices=["approve", "reject"], required=True)
    parser.add_argument("--feedback", type=str, default="")
    parser.add_argument("--target", type=str, choices=["research", "strategy", "copywriter", "image_prompt"])
    
    args = parser.parse_args(cli_args)
    
    print(f"   action: {args.action}")
    print(f"   feedback: {args.feedback}")
    if args.target:
        print(f"   target: {args.target}")
    
    print("\n2. Build decision from CLI args:")
    
    decision = {
        "action": args.action,
        "feedback": args.feedback
    }
    
    if args.action == "reject" and args.target:
        decision["revision_target"] = args.target
    
    print(f"   {json.dumps(decision, indent=2)}")
    
    return decision


# ==================== METHOD 4: ENVIRONMENT VARIABLES ====================

def method_4_environment_vars():
    """
    METHOD 4: Environment Variables
    
    Use case: Docker containers, serverless functions, cloud deployments
    
    Example:
        export HUMAN_DECISION_ACTION=approve
        export HUMAN_DECISION_FEEDBACK="Approved"
        python run_campaign.py
    """
    print("\n" + "="*80)
    print("METHOD 4: ENVIRONMENT VARIABLES")
    print("="*80)
    
    import os
    
    # Simulate env vars
    os.environ['HUMAN_DECISION_ACTION'] = 'approve'
    os.environ['HUMAN_DECISION_FEEDBACK'] = 'Approved by marketing team'
    
    print("\n1. Read from environment variables:")
    
    action = os.getenv('HUMAN_DECISION_ACTION')
    feedback = os.getenv('HUMAN_DECISION_FEEDBACK', '')
    target = os.getenv('HUMAN_DECISION_TARGET')
    
    print(f"   HUMAN_DECISION_ACTION: {action}")
    print(f"   HUMAN_DECISION_FEEDBACK: {feedback}")
    if target:
        print(f"   HUMAN_DECISION_TARGET: {target}")
    
    print("\n2. Build decision:")
    
    decision = {
        "action": action,
        "feedback": feedback
    }
    
    if action == "reject" and target:
        decision["revision_target"] = target
    
    print(f"   {json.dumps(decision, indent=2)}")
    
    return decision


# ==================== METHOD 5: INTERACTIVE PROMPT ====================

def method_5_interactive_prompt():
    """
    METHOD 5: Interactive Console Prompt
    
    Use case: Manual testing, interactive scripts, human operator
    """
    print("\n" + "="*80)
    print("METHOD 5: INTERACTIVE CONSOLE PROMPT")
    print("="*80)
    
    # Create mock state with outputs for display
    state = CampaignState(
        campaign_name="Summer Sale 2024",
        brand_name="TechGadgets",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Tech enthusiasts 25-45",
        brand_voice="friendly",
        awaiting_human_approval=True,
        human_approval_status="pending"
    )
    
    print("\n📋 CAMPAIGN REVIEW")
    print("-"*80)
    print(f"Campaign: {state.campaign_name}")
    print(f"Brand:    {state.brand_name}")
    print(f"Goal:     {state.primary_goal}")
    print(f"Audience: {state.target_audience}")
    print("-"*80)
    
    # Simulate interactive input (normally would use input())
    print("\n👤 Your decision:")
    print("   1. Type 'approve' to publish")
    print("   2. Type 'reject' to request changes")
    print()
    
    # For demo, we'll simulate user typing "approve"
    user_action = "approve"  # Normally: input("Decision (approve/reject): ")
    print(f"Decision (approve/reject): {user_action}")
    
    if user_action == "approve":
        user_feedback = "Looks great!"  # Normally: input("Feedback (optional): ")
        print(f"Feedback (optional): {user_feedback}")
        
        decision = {
            "action": "approve",
            "feedback": user_feedback
        }
    else:
        print("\nWhich agent needs revision?")
        print("  1. research")
        print("  2. strategy")
        print("  3. copywriter")
        print("  4. image_prompt")
        
        user_target = "copywriter"  # Normally: input("Target: ")
        user_feedback = "Make it more casual"  # Normally: input("What to change: ")
        
        print(f"Target: {user_target}")
        print(f"What to change: {user_feedback}")
        
        decision = {
            "action": "reject",
            "feedback": user_feedback,
            "revision_target": user_target
        }
    
    print(f"\n✓ Decision recorded: {decision['action']}")
    
    # Submit decision
    state = submit_human_approval(state, decision)
    
    return state


# ==================== METHOD 6: SIMULATED API CALL ====================

def method_6_api_style():
    """
    METHOD 6: API-Style (Simulated)
    
    Use case: Web applications, microservices, REST APIs
    
    This simulates what would happen in a real API endpoint
    """
    print("\n" + "="*80)
    print("METHOD 6: API-STYLE (SIMULATED)")
    print("="*80)
    
    print("\n1. Frontend makes GET request to check status:")
    print("   GET /api/campaigns/12345/status")
    print()
    
    # Simulate API response
    api_response = {
        "campaign_id": "12345",
        "status": "awaiting_human_approval",
        "summary": {
            "campaign_name": "Summer Sale 2024",
            "ai_score": 87,
            "outputs_ready": True
        }
    }
    
    print(f"   Response: {json.dumps(api_response, indent=2)}")
    
    print("\n2. Human reviews in UI and clicks 'Approve' button")
    print("   Frontend makes POST request:")
    print("   POST /api/campaigns/12345/approve")
    print()
    
    # Simulate request body
    request_body = {
        "action": "approve",
        "feedback": "Campaign approved - ship it!"
    }
    
    print(f"   Body: {json.dumps(request_body, indent=2)}")
    
    print("\n3. Backend processes approval:")
    
    # This is what happens in the backend endpoint
    # state = load_campaign_state("12345")
    # state = submit_human_approval(state, request_body)
    # workflow = create_campaign_graph()
    # final_state = workflow.invoke(state)
    # save_campaign_state("12345", final_state)
    
    api_response = {
        "campaign_id": "12345",
        "status": "completed",
        "message": "Campaign approved and published successfully"
    }
    
    print(f"   Response: {json.dumps(api_response, indent=2)}")
    
    return request_body


# ==================== MAIN DEMONSTRATION ====================

if __name__ == "__main__":
    print("\n" + "="*80)
    print("HOW HUMAN PROVIDES INPUT - HITL SYSTEM")
    print("="*80)
    
    print("\nThis demonstrates 6 different methods for human input:\n")
    
    # Run all methods
    method_1_direct_call()
    method_2_json_file()
    method_3_cli_args()
    method_4_environment_vars()
    method_5_interactive_prompt()
    method_6_api_style()
    
    print("\n" + "="*80)
    print("SUMMARY")
    print("="*80)
    
    print("""
1. DIRECT CALL       - Best for: Testing, scripts
2. JSON FILE         - Best for: Batch processing
3. CLI ARGUMENTS     - Best for: Automation, CI/CD
4. ENVIRONMENT VARS  - Best for: Docker, cloud deployments
5. INTERACTIVE       - Best for: Manual testing
6. API STYLE         - Best for: Web apps, production

For production with frontend, you'll use METHOD 6 (API).
For now (AI-side only), use METHOD 1 or METHOD 5 for testing.
    """)
    
    print("="*80)
    print("\n✓ All methods demonstrated successfully!")
