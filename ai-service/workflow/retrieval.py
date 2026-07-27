"""
EMOS Phase 2: Hybrid Retrieval Engine (Python AI Service)
Combines BM25 keyword matching with PgVector cosine similarity using
Reciprocal Rank Fusion (RRF) and Source Precedence Weighting.
"""

from typing import List, Dict, Any, Optional

SOURCE_PRECEDENCE_WEIGHTS: Dict[str, float] = {
    "MANUAL_USER": 1.0,
    "BRAND_GUIDELINES": 0.9,
    "PRICING_DOCS": 0.85,
    "WEBSITE": 0.7,
    "BLOG": 0.5,
    "COMPETITOR": 0.3
}


def calculate_rrf_score(bm25_rank: int, vector_rank: int, source_type: str) -> float:
    """
    Computes RRF score = (1 / (60 + BM25_Rank) + 1 / (60 + Vector_Rank)) * Source_Weight
    """
    weight = SOURCE_PRECEDENCE_WEIGHTS.get(source_type.upper(), 0.7)
    bm25_term = 1.0 / (60.0 + bm25_rank)
    vector_term = 1.0 / (60.0 + vector_rank)
    return (bm25_term + vector_term) * weight


def fuse_hybrid_retrieval(
    bm25_results: List[Dict[str, Any]],
    vector_results: List[Dict[str, Any]],
    top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Ranks and fuses BM25 and Vector search results.
    Bounds output to top_k (max 5 chunks).
    """
    k_limit = min(top_k, 5)
    chunk_map: Dict[str, Dict[str, Any]] = {}

    for idx, item in enumerate(bm25_results):
        cid = item["id"]
        chunk_map[cid] = {
            "content": item.get("content", ""),
            "source_type": item.get("source_type", "WEBSITE"),
            "bm25_rank": idx + 1,
            "vector_rank": 999
        }

    for idx, item in enumerate(vector_results):
        cid = item["id"]
        if cid in chunk_map:
            chunk_map[cid]["vector_rank"] = idx + 1
        else:
            chunk_map[cid] = {
                "content": item.get("content", ""),
                "source_type": item.get("source_type", "WEBSITE"),
                "bm25_rank": 999,
                "vector_rank": idx + 1
            }

    scored = []
    for cid, data in chunk_map.items():
        score = calculate_rrf_score(data["bm25_rank"], data["vector_rank"], data["source_type"])
        scored.append({
            "chunk_id": cid,
            "content": data["content"],
            "source_type": data["source_type"],
            "source_weight": SOURCE_PRECEDENCE_WEIGHTS.get(data["source_type"].upper(), 0.7),
            "rrf_score": round(score, 6)
        })

    scored.sort(key=lambda x: x["rrf_score"], reverse=True)
    return scored[:k_limit]
