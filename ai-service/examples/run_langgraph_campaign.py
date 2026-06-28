"""
RUN LANGGRAPH CAMPAIGN - Test Runner for Complete Workflow

This script demonstrates the complete 7-agent campaign workflow using LangGraph.

WORKFLOW:
  START → Manager → Research → Strategy → Copywriter → Image Prompt → Reviewer
    ↓
  [DECISION: Approved?]
    ↓
  YES: Publisher → END
  NO: [Route to specific agent] → Back to Reviewer

FEATURES:
- Automatic sequential execution
- Conditional routing based on review
- Revision loops with max attempts
- Complete state management
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from workflow.graph import create_campaign_graph
from agents.state import CampaignState


def run_langgraph_campaign():
    """
    Runs a complete campaign through the LangGraph workflow.
    """
    
    print("\n" + "="*80)
    print("🚀 LANGGRAPH CAMPAIGN WORKFLOW - COMPLETE PIPELINE")
    print("="*80)
    
    # ========== STEP 1: CREATE INITIAL STATE ==========
    print("\n[STEP 1] Creating initial campaign state...")
    print("-"*80)
    
    initial_state = CampaignState(
        campaign_name="Black Friday Mega Sale 2024",
        brand_name="TechGadgets Pro",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Tech enthusiasts aged 25-45, gadget lovers, early adopters with disposable income",
        brand_voice="bold",
        brief="Marketing campaign for TechGadgets Pro targeting Tech enthusiasts with a bold brand voice. Focus on driving sales through exclusive Black Friday deals."
    )
    
    print(f"✅ Campaign: {initial_state.campaign_name}")
    print(f"✅ Brand: {initial_state.brand_name}")
    print(f"✅ Industry: {initial_state.industry}")
    print(f"✅ Goal: {initial_state.primary_goal}")
    print(f"✅ Audience: {initial_state.target_audience[:60]}...")
    print(f"✅ Voice: {initial_state.brand_voice}")
    
    # ========== STEP 2: CREATE LANGGRAPH WORKFLOW ==========
    print("\n[STEP 2] Building LangGraph workflow...")
    print("-"*80)
    
    workflow = create_campaign_graph()
    
    print("\n📊 Workflow Structure:")
    print("   START")
    print("     ↓")
    print("   Manager Agent (orchestration)")
    print("     ↓")
    print("   Research Agent (market analysis)")
    print("     ↓")
    print("   Strategy Agent (marketing strategy)")
    print("     ↓")
    print("   Copywriter Agent (creates copy)")
    print("     ↓")
    print("   Image Prompt Agent (visual prompts)")
    print("     ↓")
    print("   Reviewer Agent (quality check)")
    print("     ↓")
    print("   [DECISION POINT]")
    print("     ↓")
    print("   ├─→ APPROVED → Publisher Agent → END")
    print("   └─→ REVISE → [Specific Agent] → Back to Reviewer")
    
    # ========== STEP 3: RUN WORKFLOW ==========
    print("\n[STEP 3] Executing workflow...")
    print("-"*80)
    print("⏳ This will run all 7 agents sequentially...")
    print("   (This may take 2-3 minutes due to LLM API calls)")
    print("-"*80)
    
    # Invoke the workflow - LangGraph handles everything!
    final_state = workflow.invoke(initial_state)
    
    # ========== STEP 4: DISPLAY RESULTS ==========
    print("\n" + "="*80)
    print("✅ LANGGRAPH WORKFLOW COMPLETED")
    print("="*80)
    
    print("\n[STEP 4] Final Campaign State:")
    print("-"*80)
    
    # Convert to dict for easier access
    if isinstance(final_state, dict):
        state_dict = final_state
    else:
        state_dict = final_state.model_dump()
    
    print(f"\n📊 Status: {state_dict.get('status')}")
    print(f"📊 Next Step: {state_dict.get('next_step', 'N/A')}")
    
    # Revision counts
    print(f"\n🔄 Revision Counts:")
    print(f"   Research:  {state_dict.get('research_revision_count', 0)}/3")
    print(f"   Strategy:  {state_dict.get('strategy_revision_count', 0)}/3")
    print(f"   Copy:      {state_dict.get('copy_revision_count', 0)}/3")
    print(f"   Image:     {state_dict.get('image_revision_count', 0)}/3")
    
    # Agent outputs
    print(f"\n📦 Agent Outputs:")
    print(f"   ✅ Manager:    {'✓' if state_dict.get('manager_output') else '✗'} ({len(state_dict.get('manager_output', '')) if state_dict.get('manager_output') else 0} chars)")
    print(f"   ✅ Research:   {'✓' if state_dict.get('research_output') else '✗'} ({len(state_dict.get('research_output', '')) if state_dict.get('research_output') else 0} chars)")
    print(f"   ✅ Strategy:   {'✓' if state_dict.get('strategy_output') else '✗'} ({len(state_dict.get('strategy_output', '')) if state_dict.get('strategy_output') else 0} chars)")
    print(f"   ✅ Copy:       {'✓' if state_dict.get('copy_output') else '✗'} ({len(state_dict.get('copy_output', '')) if state_dict.get('copy_output') else 0} chars)")
    print(f"   ✅ Image:      {'✓' if state_dict.get('image_output') else '✗'} ({len(state_dict.get('image_output', '')) if state_dict.get('image_output') else 0} chars)")
    print(f"   ✅ Review:     {'✓' if state_dict.get('review_output') else '✗'} ({len(state_dict.get('review_output', '')) if state_dict.get('review_output') else 0} chars)")
    print(f"   ✅ Publisher:  {'✓' if state_dict.get('publisher_output') else '✗'} ({len(state_dict.get('publisher_output', '')) if state_dict.get('publisher_output') else 0} chars)")
    
    # Review summary
    if state_dict.get('review_output'):
        try:
            review_data = json.loads(state_dict['review_output'])
            overall = review_data.get('overall', {})
            quality_score = overall.get('quality_score', 0)
            status = review_data.get('status', 'N/A')
            
            print(f"\n📈 Quality Review:")
            print(f"   Score:  {quality_score}/100")
            print(f"   Status: {status}")
            
            # Agent scores
            research_score = review_data.get('research_review', {}).get('score', 0)
            strategy_score = review_data.get('strategy_review', {}).get('score', 0)
            copy_score = review_data.get('copy_review', {}).get('score', 0)
            image_score = review_data.get('image_review', {}).get('score', 0)
            
            print(f"\n📊 Individual Agent Scores:")
            print(f"   Research:  {research_score}/100")
            print(f"   Strategy:  {strategy_score}/100")
            print(f"   Copy:      {copy_score}/100")
            print(f"   Image:     {image_score}/100")
            
        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Could not parse review output: {e}")
    
    # Publisher summary
    if state_dict.get('publisher_output'):
        try:
            publisher_data = json.loads(state_dict['publisher_output'])
            decision = publisher_data.get('publishing_decision', 'N/A')
            
            print(f"\n📢 Publishing Decision: {decision}")
            
            # Content calendar
            calendar = publisher_data.get('content_calendar', {})
            print(f"   Calendar: {calendar.get('total_weeks', 'N/A')} weeks")
            print(f"   Start Date: {calendar.get('campaign_start_date', 'N/A')}")
            
            # Channels
            publishing_plan = publisher_data.get('publishing_plan', [])
            print(f"   Channels: {len(publishing_plan)}")
            for ch in publishing_plan[:3]:  # Show first 3 channels
                print(f"     • {ch.get('channel', 'N/A')} ({ch.get('priority', 'N/A')} priority)")
            
        except (json.JSONDecodeError, TypeError) as e:
            print(f"⚠️  Could not parse publisher output: {e}")
    
    # Errors
    if state_dict.get('error'):
        print(f"\n❌ Error: {state_dict['error']}")
    
    print("\n" + "="*80)
    print("🎉 LANGGRAPH WORKFLOW DEMONSTRATION COMPLETE")
    print("="*80)
    
    print("\n📚 What Just Happened:")
    print("   1. LangGraph automatically executed all 7 agents in sequence")
    print("   2. State was passed through each node automatically")
    print("   3. Reviewer made quality assessment")
    print("   4. Conditional routing decided to publish or revise")
    print("   5. Publisher created complete distribution plan")
    print("   6. All state is preserved and accessible")
    
    print("\n🎯 Key Benefits of LangGraph:")
    print("   ✅ Automatic state management")
    print("   ✅ Conditional routing based on logic")
    print("   ✅ Revision loops with max attempts")
    print("   ✅ Error handling at each node")
    print("   ✅ Easy to visualize and debug")
    print("   ✅ Production-ready framework")
    
    return final_state


# ==================== MAIN EXECUTION ====================

if __name__ == "__main__":
    final_state = run_langgraph_campaign()
    
    print("\n💡 Next Steps:")
    print("   • Review the complete workflow output above")
    print("   • Modify workflow/graph.py to customize flow")
    print("   • Modify workflow/routing.py to change routing logic")
    print("   • Add parallel execution for copywriter + image_prompt")
    print("   • Add checkpointing for resume capability")
    print("   • Integrate with backend API for production use")
