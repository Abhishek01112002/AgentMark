"""
Calibration Model Snapshot Service — AgentMark AI Pre-Flight Engine (Phase 2B)

Reads historical PerformanceSnapshot metrics, calculates Spearman rho, NDCG@5, Pearson r, and MAE,
and generates a CalibrationModelSnapshot dictionary. Never overwrites production weights directly.
"""

from typing import List, Dict, Any
from services.ranking_metrics import calculate_spearman_rho, calculate_ndcg_at_k, calculate_pearson_r, calculate_mae
from services.drift_detector import PageHinkleyDriftDetector


def generate_calibration_snapshot(
    industry: str,
    preflight_scores: List[float],
    observed_ctrs: List[float]
) -> Dict[str, Any]:
    """
    Generates a calibration model snapshot evaluating prediction accuracy and drift.
    """
    sample_count = len(preflight_scores)
    if sample_count == 0 or len(observed_ctrs) != sample_count:
        return {
            "industry": industry,
            "sample_count": 0,
            "metrics": {},
            "drift": {"drift_detected": False}
        }

    spearman = calculate_spearman_rho(preflight_scores, observed_ctrs)
    ndcg = calculate_ndcg_at_k(preflight_scores, observed_ctrs, k=5)
    pearson = calculate_pearson_r(preflight_scores, observed_ctrs)
    mae = calculate_mae(preflight_scores, observed_ctrs)

    detector = PageHinkleyDriftDetector()
    drift_res = detector.evaluate_batch(preflight_scores)

    return {
        "industry": industry,
        "version": "calibrated_v1.0",
        "sample_count": sample_count,
        "metrics": {
            "spearman_rho": spearman,
            "ndcg_at_5": ndcg,
            "pearson_r": pearson,
            "mae": mae
        },
        "drift": drift_res,
        "is_ready_for_calibration": sample_count >= 30
    }
