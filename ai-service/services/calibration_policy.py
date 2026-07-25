"""
Epsilon-Greedy Calibration Policy — AgentMark AI Pre-Flight Engine

Prevents survivorship bias in Empirical Bayes calibration models by allocating
a controlled epsilon proportion (default 5%) of blocked/low-scoring campaigns
to micro-test flights to collect unbiased out-of-sample performance data.
"""

import random
from typing import Dict, Any


def evaluate_micro_test_flight_eligibility(
    passed_gates: bool,
    trust_score: float,
    epsilon: float = 0.05,
    seed: int | None = None
) -> Dict[str, Any]:
    """
    Evaluates whether a blocked campaign qualifies for micro-test exploration flight.
    """
    if passed_gates:
        return {
            "is_micro_test_flight": False,
            "reason": "Campaign passed standard pre-flight gates",
            "allocated_budget_cap_usd": None
        }

    if seed is not None:
        random.seed(seed)

    # Roll epsilon probability
    roll = random.random()
    is_micro_test = roll < epsilon

    return {
        "is_micro_test_flight": is_micro_test,
        "reason": "Selected for unbiased Epsilon-Greedy exploration micro-test flight" if is_micro_test else "Blocked by standard pre-flight gates",
        "allocated_budget_cap_usd": 25.00 if is_micro_test else 0.00,
        "exploration_sample_rate": epsilon
    }
