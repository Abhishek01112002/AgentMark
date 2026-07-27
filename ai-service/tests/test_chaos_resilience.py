"""
EMOS Phase 5 Operations: Chaos Engineering & Automated Fallback Verification Tests
Simulates 4 failure modes and verifies graceful degradation.
"""

import pytest
import time
from workflow.retrieval import fuse_hybrid_retrieval
from agents.evaluator import independent_evaluator_agent
from utils.telemetry import TelemetryContext, log_component_audit


def test_chaos_pgvector_latency_fallback():
    """Experiment 1: PgVector Latency Spike (>800ms) -> Bypasses Vector, Uses BM25 Primary."""
    # Simulate empty vector results due to timeout
    bm25_results = [
        {"id": "chunk_vault_1", "content": "Primary Brand Vault pricing $49/mo", "source_type": "MANUAL_USER"}
    ]
    vector_results = []  # Timed out

    fused = fuse_hybrid_retrieval(bm25_results, vector_results, top_k=5)

    assert len(fused) == 1
    assert fused[0]["chunk_id"] == "chunk_vault_1"
    assert fused[0]["source_type"] == "MANUAL_USER"


def test_chaos_evaluator_exception_fallback():
    """Experiment 2: Evaluator Malformed Input -> Safe Exception Handling & Rejection."""
    res = independent_evaluator_agent(
        generated_copy=None,  # Malformed input
        context_contract={},
        industry="saas"
    )

    assert res["approved"] is False
    assert res["overall_score"] == 0.0
    assert "Invalid input" in res["policy_result"]["violations"]


def test_chaos_telemetry_trace_propagation():
    """Experiment 3: OpenTelemetry Context Propagation & Audit Logging."""
    ctx = TelemetryContext(campaign_id="camp_99", tenant_id="tenant_12")
    audit_log = log_component_audit("BrandVault", "MaterializeSnapshot", ctx, {"version": 14})

    assert audit_log["component"] == "BrandVault"
    assert audit_log["trace_id"] == ctx.trace_id
    assert audit_log["campaign_id"] == "camp_99"
    assert audit_log["evidence_id"] == ctx.evidence_id
