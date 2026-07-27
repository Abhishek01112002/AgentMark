"""
Unit tests & RRF contract compliance benchmarks for EMOS Phase 2 Hybrid Retrieval
"""

import pytest
from workflow.retrieval import calculate_rrf_score, fuse_hybrid_retrieval


def test_source_precedence_weighting():
    manual_score = calculate_rrf_score(bm25_rank=1, vector_rank=1, source_type="MANUAL_USER")
    competitor_score = calculate_rrf_score(bm25_rank=1, vector_rank=1, source_type="COMPETITOR")

    assert manual_score > competitor_score
    assert round(manual_score / competitor_score, 2) == 3.33  # 1.0 / 0.3


def test_fuse_hybrid_retrieval_ranking():
    bm25 = [
        {"id": "chunk_1", "content": "Manual pricing policy", "source_type": "MANUAL_USER"},
        {"id": "chunk_2", "content": "Blog article", "source_type": "BLOG"}
    ]
    vector = [
        {"id": "chunk_2", "content": "Blog article", "source_type": "BLOG"},
        {"id": "chunk_3", "content": "Competitor pricing", "source_type": "COMPETITOR"}
    ]

    fused = fuse_hybrid_retrieval(bm25, vector, top_k=5)

    assert len(fused) == 3
    assert fused[0]["chunk_id"] == "chunk_1"  # Manual user source ranks #1 due to precedence weight
    assert fused[0]["source_weight"] == 1.0


def test_retrieval_bounded_budget():
    bm25 = [{"id": f"c_{i}", "content": f"c_{i}", "source_type": "WEBSITE"} for i in range(10)]
    vector = [{"id": f"c_{i}", "content": f"c_{i}", "source_type": "WEBSITE"} for i in range(10)]

    fused = fuse_hybrid_retrieval(bm25, vector, top_k=10)

    # Hard bound constraint: max 5 chunks
    assert len(fused) <= 5
