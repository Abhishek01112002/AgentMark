"""
Ranking & Statistical Metrics Service — AgentMark AI Pre-Flight Engine (Phase 2B)

Implements Spearman Rank Correlation (rho), NDCG@K, Pearson (r) for diagnostics, and MAE.
"""

import math
from typing import List, Dict, Any


def calculate_spearman_rho(scores: List[float], actuals: List[float]) -> float:
    """Computes Spearman Rank Correlation Coefficient (rho)."""
    n = len(scores)
    if n < 2 or len(actuals) != n:
        return 0.0

    def get_ranks(val_list: List[float]) -> List[float]:
        sorted_indices = sorted(range(n), key=lambda i: val_list[i])
        ranks = [0.0] * n
        for rank, idx in enumerate(sorted_indices):
            ranks[idx] = float(rank + 1)
        return ranks

    rank_x = get_ranks(scores)
    rank_y = get_ranks(actuals)

    d_squared_sum = sum((rx - ry) ** 2 for rx, ry in zip(rank_x, rank_y))
    rho = 1.0 - (6.0 * d_squared_sum) / (n * (n ** 2 - 1))
    return round(rho, 4)


def calculate_ndcg_at_k(scores: List[float], actuals: List[float], k: int = 5) -> float:
    """Computes Normalized Discounted Cumulative Gain at K (NDCG@K)."""
    n = len(scores)
    if n == 0 or len(actuals) != n:
        return 0.0

    effective_k = min(k, n)
    predicted_order = sorted(range(n), key=lambda i: scores[i], reverse=True)[:effective_k]
    dcg = sum((2 ** actuals[idx] - 1) / math.log2(rank + 2) for rank, idx in enumerate(predicted_order))

    ideal_order = sorted(range(n), key=lambda i: actuals[i], reverse=True)[:effective_k]
    idcg = sum((2 ** actuals[idx] - 1) / math.log2(rank + 2) for rank, idx in enumerate(ideal_order))

    if idcg == 0.0:
        return 1.0
    return round(dcg / idcg, 4)


def calculate_pearson_r(scores: List[float], actuals: List[float]) -> float:
    """Computes Pearson Correlation Coefficient (r) for diagnostic comparison."""
    n = len(scores)
    if n < 2 or len(actuals) != n:
        return 0.0

    mean_x = sum(scores) / n
    mean_y = sum(actuals) / n

    cov = sum((scores[i] - mean_x) * (actuals[i] - mean_y) for i in range(n))
    var_x = sum((scores[i] - mean_x) ** 2 for i in range(n))
    var_y = sum((actuals[i] - mean_y) ** 2 for i in range(n))

    if var_x == 0.0 or var_y == 0.0:
        return 0.0

    return round(cov / math.sqrt(var_x * var_y), 4)


def calculate_mae(scores: List[float], actuals: List[float]) -> float:
    """Computes Mean Absolute Error (MAE) between pre-flight scores and normalized actuals."""
    n = len(scores)
    if n == 0 or len(actuals) != n:
        return 0.0

    return round(sum(abs(scores[i] - actuals[i]) for i in range(n)) / n, 4)
