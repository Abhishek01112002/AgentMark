"""
Simulation Confidence Score Engine — AgentMark AI Pre-Flight Engine

Calculates Simulation Confidence based on signal density, evidence completeness,
persona panel diversity, and historical benchmark calibration:
Confidence = min(1.0, 0.30*ICP + 0.30*Evidence + 0.20*Diversity + 0.20*Historical)

Note: Terminology is strictly 'Simulation Confidence' (never 'Prediction Accuracy').
"""

import logging
from typing import List, Dict, Any

logger = logging.getLogger("agentmark.confidence_engine")


def calculate_simulation_confidence(
    persona_count: int,
    evidence_score: float,
    critiques: List[Any],
    has_historical_benchmarks: bool = False
) -> float:
    """
    Computes calibrated Simulation Confidence score (0.0 to 1.0).
    """
    # 1. ICP Match Factor (0.0 - 1.0): Based on persona completeness
    icp_match_factor = min(1.0, persona_count / 5.0)

    # 2. Evidence Density Factor (0.0 - 1.0): Normalized evidence score
    evidence_density_factor = max(0.0, min(1.0, evidence_score / 100.0))

    # 3. Persona Diversity Factor (0.0 - 1.0): Score variance across panel
    if critiques and len(critiques) > 1:
        scores = [getattr(c, "resonance_score", 60) for c in critiques]
        variance = sum((s - (sum(scores) / len(scores))) ** 2 for s in scores) / len(scores)
        # Higher diversity/variance in viewpoints indicates realistic non-homogenous panel
        persona_diversity_factor = min(1.0, (variance ** 0.5) / 25.0 + 0.5)
    else:
        persona_diversity_factor = 0.70

    # 4. Historical Calibration Factor (0.0 - 1.0)
    historical_factor = 0.90 if has_historical_benchmarks else 0.75

    # Compute Weighted Formula
    raw_confidence = (
        (0.30 * icp_match_factor) +
        (0.30 * evidence_density_factor) +
        (0.20 * persona_diversity_factor) +
        (0.20 * historical_factor)
    )

    calibrated = min(1.0, max(0.40, round(raw_confidence, 2)))
    return calibrated
