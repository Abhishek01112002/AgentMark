"""
Performance Calibration Engine — AgentMark AI Pre-Flight Engine (Phase 2B)

Executes Empirical Bayes score calibration with strict minimum sample threshold (N >= 30).
Feature-flagged behind ENABLE_CALIBRATION_ENGINE.
"""

import os
import numpy as np
from typing import List, Dict, Any

# Feature Flag Default
ENABLE_CALIBRATION_ENGINE = os.getenv("ENABLE_CALIBRATION_ENGINE", "false").lower() in ("true", "1")
MINIMUM_SAMPLE_THRESHOLD = 30


def calibrate_preflight_score(
    baseline_score: float,
    observed_historical_scores: List[float],
    observed_ctr_values: List[float],
    feature_flag_override: bool | None = None
) -> Dict[str, Any]:
    """
    Calibrates preflight baseline score using Empirical Bayes shrinkage model if N >= 30.
    """
    is_enabled = feature_flag_override if feature_flag_override is not None else ENABLE_CALIBRATION_ENGINE
    n = len(observed_historical_scores)

    if not is_enabled:
        return {
            "calibrated_score": round(baseline_score, 2),
            "is_calibrated": False,
            "reason": "feature_flag_disabled",
            "sample_count": n,
            "shrinkage_alpha": 1.0
        }

    if n < MINIMUM_SAMPLE_THRESHOLD or len(observed_ctr_values) != n:
        return {
            "calibrated_score": round(baseline_score, 2),
            "is_calibrated": False,
            "reason": f"Insufficient sample size (N={n} < threshold {MINIMUM_SAMPLE_THRESHOLD})",
            "sample_count": n,
            "shrinkage_alpha": 1.0
        }

    # Empirical Bayes Shrinkage Calculation
    hist_scores = np.array(observed_historical_scores, dtype=float)
    hist_ctrs = np.array(observed_ctr_values, dtype=float)

    mu_observed = float(np.mean(hist_scores))
    var_prior = float(np.var(hist_scores)) if len(hist_scores) > 1 else 10.0
    var_obs = float(np.var(hist_ctrs * 1000.0)) if len(hist_ctrs) > 1 else 10.0

    if (var_prior + var_obs) == 0:
        alpha = 1.0
    else:
        alpha = var_obs / (var_prior + var_obs)
        alpha = max(0.2, min(0.95, alpha))

    calibrated_val = alpha * baseline_score + (1.0 - alpha) * mu_observed
    calibrated_val = max(0.0, min(100.0, float(calibrated_val)))

    return {
        "calibrated_score": round(calibrated_val, 2),
        "is_calibrated": True,
        "reason": "empirical_bayes_calibrated",
        "sample_count": n,
        "shrinkage_alpha": round(float(alpha), 4),
        "prior_mean": round(mu_observed, 2)
    }
