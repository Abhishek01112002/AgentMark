"""
Ranking Evaluator Service — AgentMark AI Pre-Flight Engine

Calculates non-linear Spearman Rank Correlation (rho) and Normalized Discounted Cumulative Gain (NDCG@K)
for non-gaussian heavy-tailed CTR/CVR creative performance distributions.
"""

import math
from typing import List, Tuple


def calculate_spearman_rank_correlation(scores: List[float], actuals: List[float]) -> float:
    """
    Computes Spearman Rank Correlation Coefficient (rho) between pre-flight scores and observed CTRs.
    Range: -1.0 to +1.0.
    """
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


def calculate_ndcg(scores: List[float], actuals: List[float], k: int = 5) -> float:
    """
    Computes Normalized Discounted Cumulative Gain at K (NDCG@K) for creative variation ranking.
    Range: 0.0 to 1.0.
    """
    n = len(scores)
    if n == 0 or len(actuals) != n:
        return 0.0

    effective_k = min(k, n)

    # Sort actuals by predicted scores descending
    predicted_order = sorted(range(n), key=lambda i: scores[i], reverse=True)[:effective_k]
    dcg = sum((2 ** actuals[idx] - 1) / math.log2(rank + 2) for rank, idx in enumerate(predicted_order))

    # Ideal DCG based on true actuals descending
    ideal_order = sorted(range(n), key=lambda i: actuals[i], reverse=True)[:effective_k]
    idcg = sum((2 ** actuals[idx] - 1) / math.log2(rank + 2) for rank, idx in enumerate(ideal_order))

    if idcg == 0.0:
        return 1.0
    return round(dcg / idcg, 4)
