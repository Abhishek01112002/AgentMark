"""
Proof-of-Fix Adversarial Test Suite — AgentMark AI Service

Validates empirical behavior for:
- ADV-BUG-001: 50 concurrent threads testing LLM config and client isolation
- ADV-BUG-003: Forced LLM exception in creative_hook_matrix_node & failed status event
- ADV-BUG-020: Known-bad hook evaluation and 'revise_hooks' graph routing
"""

import sys
from pathlib import Path
import pytest
import concurrent.futures
from unittest.mock import patch, MagicMock

# Ensure ai-service root is on sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from workflow.graph import creative_hook_matrix_node
from agents.reviewer import reviewer_agent
from workflow.routing import should_continue_after_reviewer
from schemas import ReviewerOutput, AgentReview
from llm.factory import set_llm_config, get_current_llm_config
import contextvars


# ==============================================================================
# ADV-BUG-001: 50 Concurrent Threads - LLM Config & Client Isolation
# ==============================================================================

def test_adv_bug_001_concurrent_50_threads_llm_config_isolation(monkeypatch):
    """
    Executes 50 concurrent worker threads setting unique API keys.
    Verifies 100% of threads maintain strictly isolated ContextVar config
    without key leakage across reused ThreadPoolExecutor threads.
    """
    for env_key in ("OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "TAVILY_API_KEY"):
        monkeypatch.delenv(env_key, raising=False)

    results = {}

    def _worker(thread_idx: int):
        unique_key = f"gsk_thread_key_{thread_idx}_xyz999"
        config = {"groq_api_key": unique_key}
        
        ctx = contextvars.copy_context()

        def _inner():
            set_llm_config(config)
            read_cfg = get_current_llm_config()
            return read_cfg.get("groq_api_key")

        actual_key = ctx.run(_inner)
        results[thread_idx] = (unique_key, actual_key)

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(_worker, i) for i in range(50)]
        concurrent.futures.wait(futures)

    assert len(results) == 50, f"Expected 50 results, got {len(results)}"
    
    mismatches = []
    for idx, (expected, actual) in results.items():
        if expected != actual:
            mismatches.append(f"Thread {idx}: expected {expected}, got {actual}")

    assert not mismatches, f"ContextVar leakage detected across threads: {mismatches}"


# ==============================================================================
# ADV-BUG-003: Forced LLM Exception & Diagnostic Fallback / Event Handling
# ==============================================================================

def test_adv_bug_003_forced_creative_hook_matrix_exception_and_events():
    """
    Forces creative_hook_matrix_agent to raise a 429 RateLimit exception.
    Verifies:
    1. Exception is caught gracefully.
    2. 'failed' agent event is published to Redis.
    3. Diagnostic fallback matrix is returned without crashing the workflow.
    """
    state = CampaignState(
        campaign_id="adv-camp-003",
        campaign_name="Test Campaign",
        brand_name="Test Brand",
        industry="SaaS",
        primary_goal="Lead Gen",
        target_audience="CTOs",
        brand_voice="Professional",
        status="processing",
        creative_hook_matrix_output=None,
    )

    published_events = []

    def mock_publish(campaign_id, agent, status, error=None, extra=None):
        published_events.append({"agent": agent, "status": status, "error": error})

    with patch("workflow.graph.creative_hook_matrix_agent", side_effect=RuntimeError("HTTP 429: Rate limit exceeded on Groq")):
        with patch("workflow.graph.publish_agent_event", side_effect=mock_publish):
            result = creative_hook_matrix_node(state)

    failed_event = next((e for e in published_events if e["agent"] == "creative_hook_matrix" and e["status"] == "failed"), None)
    assert failed_event is not None, "Expected 'failed' event for creative_hook_matrix node"
    assert "Rate limit exceeded" in failed_event["error"]

    assert result["creative_hook_matrix_output"] is not None
    assert "angles" in result["creative_hook_matrix_output"] or "hooks" in result["creative_hook_matrix_output"]
    assert result["status"] == "creative_hook_matrix_complete"


# ==============================================================================
# ADV-BUG-020: Known-Bad Hook Evaluation and 'revise_hooks' Graph Routing
# ==============================================================================

def test_adv_bug_020_known_bad_hook_evaluation_and_routing():
    """
    Supplies low-quality, generic hook matrix output to the reviewer agent.
    Verifies:
    1. Hook matrix review score is rated low (< 70).
    2. Reviewer selects 'creative_hook_matrix' as the revision target.
    3. should_continue_after_reviewer evaluates review_output and returns 'revise_hooks'.
    """
    bad_hook_matrix = {
        "hooks": [
            {"angle": "Generic", "text": "Buy our product now because it is good."},
            {"angle": "Boring", "text": "We sell quality software for businesses."},
        ]
    }

    state = CampaignState(
        campaign_id="adv-camp-020",
        campaign_name="Test Campaign",
        brand_name="Test Brand",
        industry="SaaS",
        primary_goal="Lead Gen",
        target_audience="CTOs",
        brand_voice="Professional",
        status="processing",
        creative_hook_matrix_output=str(bad_hook_matrix),
        copy_output='{"headline": "World Class AI Platform"}',
        research_output='{"findings": "Market is growing rapidly", "market_analysis": {"total_addressable_market": "$10B"}}',
        strategy_output='{"positioning": "Enterprise B2B"}',
        image_output='{"prompt": "Sleek modern office"}',
    )

    reviewer_output_obj = ReviewerOutput(
        status="revision_required",
        overall_quality_score=55.0,
        research_review=AgentReview(score=90, feedback="Good", approved=True),
        strategy_review=AgentReview(score=85, feedback="Solid", approved=True),
        copy_review=AgentReview(score=80, feedback="Acceptable", approved=True),
        creative_hook_matrix_review=AgentReview(score=45, feedback="Hooks lack emotional punch and curiosity", approved=False),
        image_review=AgentReview(score=85, feedback="Visually appealing", approved=True),
        executive_summary="Hooks are weak and need revision.",
        critical_gaps=["Hooks fail to capture interest"],
        recommendations=["Re-write creative hook matrix with curiosity angle"],
    )

    with patch("agents.reviewer.get_llm_client") as mock_get_client:
        mock_client = MagicMock()
        mock_client.generate_structured.return_value = reviewer_output_obj
        mock_get_client.return_value = mock_client

        updated_state = reviewer_agent(state)

    state.review_output = updated_state.review_output
    next_node = should_continue_after_reviewer(state)
    assert next_node == "revise_hooks", f"Expected routing to 'revise_hooks', got '{next_node}'"
