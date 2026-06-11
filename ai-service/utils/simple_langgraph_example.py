"""
SIMPLE LANGGRAPH EXAMPLE - Hello Agent Workflow

This is a learning example to understand:
- Nodes (steps in workflow)
- Edges (connections between steps)
- StateGraph (the workflow container)
- Invocation (running the workflow)

Simple Workflow:
  START
    ↓
  Hello Agent (Says hello)
    ↓
  Echo Agent (Repeats the message)
    ↓
  END
"""

from langgraph.graph import StateGraph, START, END
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


# ==================== DEFINE NODES ====================

def hello_node(state: CampaignState) -> CampaignState:
    """
    Node 1: Hello Agent
    - Reads: campaign_name, brand_name
    - Writes: manager_output
    - Does: Greets and says hello
    """
    print(f"\n🤖 HELLO NODE EXECUTING")
    print(f"   Input: {state.campaign_name} ({state.brand_name})")
    
    state.manager_output = f"Hello! I'm processing campaign: {state.campaign_name} for {state.brand_name}"
    state.status = "manager_complete"
    
    print(f"   Output: {state.manager_output}")
    return state


def echo_node(state: CampaignState) -> CampaignState:
    """
    Node 2: Echo Agent
    - Reads: manager_output
    - Writes: research_output
    - Does: Echoes/repeats the manager output
    """
    print(f"\n🤖 ECHO NODE EXECUTING")
    print(f"   Input: {state.manager_output}")
    
    state.research_output = f"Echo: {state.manager_output}"
    state.status = "research_complete"
    
    print(f"   Output: {state.research_output}")
    return state


# ==================== BUILD THE GRAPH ====================

def create_simple_graph():
    """
    Creates a simple workflow graph:
    
    START → Hello Node → Echo Node → END
    """
    
    # 1. Create StateGraph with CampaignState
    graph = StateGraph(CampaignState)
    
    # 2. Add nodes
    graph.add_node("hello", hello_node)      # Node name: "hello"
    graph.add_node("echo", echo_node)        # Node name: "echo"
    
    # 3. Add edges (connections)
    graph.add_edge(START, "hello")           # START → hello
    graph.add_edge("hello", "echo")          # hello → echo
    graph.add_edge("echo", END)              # echo → END
    
    # 4. Compile the graph
    compiled_graph = graph.compile()
    
    return compiled_graph


# ==================== RUN THE EXAMPLE ====================

if __name__ == "__main__":
    print("=" * 80)
    print("SIMPLE LANGGRAPH EXAMPLE - LEARNING THE BASICS")
    print("=" * 80)
    
    # 1. Create workflow graph
    print("\n[STEP 1] Creating workflow graph...")
    workflow = create_simple_graph()
    print("✅ Graph created successfully")
    
    print("\nGraph structure:")
    print("  START → hello_node → echo_node → END")
    
    # 2. Create initial state with all 6 required fields
    print("\n[STEP 2] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs",
        brand_voice="professional",
        brief="Launch new SaaS product"
    )
    print(f"✅ Initial state created")
    print(f"   campaign_name: {initial_state.campaign_name}")
    print(f"   brand_name: {initial_state.brand_name}")
    print(f"   industry: {initial_state.industry}")
    print(f"   primary_goal: {initial_state.primary_goal}")
    
    # 3. Run the workflow
    print("\n[STEP 3] Running workflow...")
    print("-" * 80)
    
    final_state = workflow.invoke(initial_state)
    
    print("-" * 80)
    
    # 4. Show final state
    print("\n[STEP 4] Final state after workflow:")
    print(f"   manager_output: {final_state.get('manager_output')}")
    print(f"   research_output: {final_state.get('research_output')}")
    print(f"   status: {final_state.get('status')}")
    
    print("\n" + "=" * 80)
    print("✅ WORKFLOW COMPLETED SUCCESSFULLY")
    print("=" * 80)
    
    print("\n📚 KEY LEARNINGS:")
    print("   1. Nodes are functions that take state and return state")
    print("   2. Edges connect nodes (START → node1 → node2 → END)")
    print("   3. StateGraph manages the workflow")
    print("   4. .invoke() runs the workflow with initial state")
    print("   5. State flows through all nodes automatically")
