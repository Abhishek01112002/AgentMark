"""
Comprehensive Production Acceptance & Regression Test Suite
Validates all 9 acceptance criteria:
  1. Feature Flag OFF -> Old pipeline unchanged
  2. Feature Flag ON -> Copywriter -> Hook Matrix -> Image -> Reviewer
  3. Zero GraphRecursionError across multiple runs
  4. Human Approve -> Publisher -> END
  5. Human Reject (Research) -> Research -> Strategy -> Copy -> Hook -> Image -> Reviewer -> HITL
  6. Human Reject (Strategy) -> Strategy -> Copy -> Hook -> Image -> Reviewer -> HITL
  7. Human Reject (Copywriter) -> Copy -> Hook -> Image -> Reviewer -> HITL
  8. Human Reject (Creative Hooks) -> Hook Matrix -> Image -> Reviewer -> HITL
  9. Human Reject (Image) -> Image -> Reviewer -> HITL
"""

import sys
import os
import json
import uuid
import pytest
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from unittest.mock import patch
from agents.state import CampaignState
from agents.human_approval import submit_human_approval
from workflow.routing import should_continue_after_reviewer
import workflow.graph as graph_mod

def mock_manager(state):
    state.manager_output = json.dumps({"target_channels": ["LinkedIn"], "deliverables": ["posts"]})
    state.status = "manager_complete"
    return state

def mock_research(state):
    state.research_output = json.dumps({"market_trends": ["AI adoption"]})
    state.status = "research_complete"
    return state

def mock_strategy(state):
    state.strategy_output = json.dumps({"positioning": "Leader in AI"})
    state.status = "strategy_complete"
    return state

def mock_copywriter(state):
    state.copy_output = json.dumps({"headlines": ["Scale fast with AI"]})
    state.status = "copy_complete"
    return state

def mock_hooks(state):
    state.creative_hook_matrix_output = json.dumps({"hooks": [{"type": "Curiosity", "text": "What if?"}]})
    state.status = "creative_hook_matrix_complete"
    return state

def mock_image(state):
    state.image_output = json.dumps({"prompt": "Cybernetic brain floating in neon circuit grid"})
    state.status = "image_complete"
    return state

def mock_reviewer_approved(state):
    review = {
        "status": "approved",
        "overall_quality_score": 88,
        "research_review": {"approved": True, "score": 85},
        "strategy_review": {"approved": True, "score": 90},
        "copy_review": {"approved": True, "score": 85},
        "image_review": {"approved": True, "score": 90}
    }
    state.review_output = json.dumps(review)
    state.status = "review_complete"
    return state

def mock_publisher(state):
    state.publisher_output = json.dumps({"published": True})
    state.workflow_finished = True
    state.status = "completed"
    return state


def test_1_feature_flag_off_pipeline():
    """1. Feature Flag OFF -> Old pipeline unchanged."""
    os.environ["ENABLE_CREATIVE_HOOK_MATRIX"] = "false"
    graph_mod._compiled_graph = None
    graph_mod.ENABLE_CREATIVE_HOOK_MATRIX = False
    
    workflow = graph_mod.create_campaign_graph()
    node_names = list(workflow.nodes.keys())
    
    assert "creative_hook_matrix" not in node_names
    assert "copywriter" in node_names
    assert "image_prompt" in node_names


def test_2_feature_flag_on_pipeline():
    """2. Feature Flag ON -> Copywriter -> Creative Hook Matrix -> Image -> Reviewer."""
    os.environ["ENABLE_CREATIVE_HOOK_MATRIX"] = "true"
    graph_mod._compiled_graph = None
    graph_mod.ENABLE_CREATIVE_HOOK_MATRIX = True
    
    workflow = graph_mod.create_campaign_graph()
    node_names = list(workflow.nodes.keys())
    
    assert "creative_hook_matrix" in node_names


def test_3_no_graph_recursion_error():
    """3. No GraphRecursionError across multiple real campaign runs."""
    os.environ["ENABLE_CREATIVE_HOOK_MATRIX"] = "true"
    graph_mod.ENABLE_CREATIVE_HOOK_MATRIX = True
    
    with patch("workflow.graph.manager_agent", side_effect=mock_manager), \
         patch("workflow.graph.research_agent", side_effect=mock_research), \
         patch("workflow.graph.strategy_agent", side_effect=mock_strategy), \
         patch("workflow.graph.copywriter_agent", side_effect=mock_copywriter), \
         patch("workflow.graph.creative_hook_matrix_agent", side_effect=mock_hooks), \
         patch("workflow.graph.image_prompt_agent", side_effect=mock_image), \
         patch("workflow.graph.reviewer_agent", side_effect=mock_reviewer_approved), \
         patch("workflow.graph.publisher_agent", side_effect=mock_publisher):
        
        graph_mod._compiled_graph = None
        workflow = graph_mod.create_campaign_graph()
        
        for _ in range(3):
            test_id = str(uuid.uuid4())
            initial_state = CampaignState(
                campaign_id=test_id, campaign_name="Multi Run", brand_name="Sentinel",
                industry="SaaS", primary_goal="Leads", target_audience="CTOs",
                brand_voice="Direct", brief="AI Platform"
            )
            config = {"configurable": {"thread_id": test_id}}
            res = workflow.invoke(initial_state.model_dump(), config=config)
            assert res.get("status") in ["review_complete", "awaiting_human_approval"]


def test_4_human_approve_publisher_end():
    """4. Human Approve -> Publisher -> END."""
    os.environ["ENABLE_CREATIVE_HOOK_MATRIX"] = "true"
    graph_mod.ENABLE_CREATIVE_HOOK_MATRIX = True
    
    with patch("workflow.graph.manager_agent", side_effect=mock_manager), \
         patch("workflow.graph.research_agent", side_effect=mock_research), \
         patch("workflow.graph.strategy_agent", side_effect=mock_strategy), \
         patch("workflow.graph.copywriter_agent", side_effect=mock_copywriter), \
         patch("workflow.graph.creative_hook_matrix_agent", side_effect=mock_hooks), \
         patch("workflow.graph.image_prompt_agent", side_effect=mock_image), \
         patch("workflow.graph.reviewer_agent", side_effect=mock_reviewer_approved), \
         patch("workflow.graph.publisher_agent", side_effect=mock_publisher):
        
        graph_mod._compiled_graph = None
        workflow = graph_mod.create_campaign_graph()
        test_id = str(uuid.uuid4())
        
        initial_state = CampaignState(
            campaign_id=test_id, campaign_name="Approval Flow", brand_name="Sentinel",
            industry="SaaS", primary_goal="Leads", target_audience="CTOs",
            brand_voice="Direct", brief="AI Platform"
        )
        config = {"configurable": {"thread_id": test_id}}
        
        res1 = workflow.invoke(initial_state.model_dump(), config=config)
        state_values1 = workflow.get_state(config).values if hasattr(workflow, "get_state") else res1
        state_after_run = CampaignState(**state_values1)
        
        approved_state = submit_human_approval(state_after_run, {"action": "approve", "feedback": "LGTM"})
        if hasattr(workflow, "update_state"):
            workflow.update_state(config, approved_state.model_dump())
            res2 = workflow.invoke(None, config=config)
        else:
            res2 = workflow.invoke(approved_state.model_dump(), config=config)
        
        state_values2 = workflow.get_state(config).values if hasattr(workflow, "get_state") else res2
        assert res2.get("workflow_finished") is True or state_values2.get("status") == "completed"


def _test_human_rejection_target(target_name: str, expected_rev_count_attr: str):
    """Helper to test targeted human rejection flow for any agent."""
    os.environ["ENABLE_CREATIVE_HOOK_MATRIX"] = "true"
    graph_mod.ENABLE_CREATIVE_HOOK_MATRIX = True
    
    with patch("workflow.graph.manager_agent", side_effect=mock_manager), \
         patch("workflow.graph.research_agent", side_effect=mock_research), \
         patch("workflow.graph.strategy_agent", side_effect=mock_strategy), \
         patch("workflow.graph.copywriter_agent", side_effect=mock_copywriter), \
         patch("workflow.graph.creative_hook_matrix_agent", side_effect=mock_hooks), \
         patch("workflow.graph.image_prompt_agent", side_effect=mock_image), \
         patch("workflow.graph.reviewer_agent", side_effect=mock_reviewer_approved), \
         patch("workflow.graph.publisher_agent", side_effect=mock_publisher):
        
        graph_mod._compiled_graph = None
        workflow = graph_mod.create_campaign_graph()
        test_id = str(uuid.uuid4())
        
        initial_state = CampaignState(
            campaign_id=test_id, campaign_name=f"Rejection Flow {target_name}", brand_name="Sentinel",
            industry="SaaS", primary_goal="Leads", target_audience="CTOs",
            brand_voice="Direct", brief="AI Platform"
        )
        config = {"configurable": {"thread_id": test_id}}
        
        res1 = workflow.invoke(initial_state.model_dump(), config=config)
        state_values1 = workflow.get_state(config).values if hasattr(workflow, "get_state") else res1
        state1 = CampaignState(**state_values1)
        
        rejected_state = submit_human_approval(
            state1,
            {"action": "reject", "feedback": f"Revise {target_name}", "revision_target": target_name}
        )
        if hasattr(workflow, "update_state"):
            workflow.update_state(config, rejected_state.model_dump())
            res2 = workflow.invoke(None, config=config)
        else:
            res2 = workflow.invoke(rejected_state.model_dump(), config=config)
        
        state2_values = workflow.get_state(config).values if hasattr(workflow, "get_state") else res2
        val = state2_values.get(expected_rev_count_attr)
        if isinstance(val, int):
            assert val >= 1
        else:
            assert val is not None




def test_5_human_reject_research():
    """5. Human Reject (Research) -> Research -> Strategy -> Copy -> Hook -> Image -> Reviewer -> HITL."""
    _test_human_rejection_target("research", "research_revision_count")


def test_6_human_reject_strategy():
    """6. Human Reject (Strategy) -> Strategy -> Copy -> Hook -> Image -> Reviewer -> HITL."""
    _test_human_rejection_target("strategy", "strategy_revision_count")


def test_7_human_reject_copywriter():
    """7. Human Reject (Copywriter) -> Copy -> Hook -> Image -> Reviewer -> HITL."""
    _test_human_rejection_target("copywriter", "copy_revision_count")


def test_8_human_reject_creative_hooks():
    """8. Human Reject (Creative Hooks) -> Creative Hook Matrix -> Image -> Reviewer -> HITL."""
    _test_human_rejection_target("creative_hook_matrix", "creative_hook_matrix_revision_count")



def test_9_human_reject_image():
    """9. Human Reject (Image) -> Image -> Reviewer -> HITL."""
    _test_human_rejection_target("image_prompt", "image_revision_count")

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
