"""
Unit & Integration Test Suite for Phase 2B Performance Calibration Engine & Drift Detector
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.calibration_engine import calibrate_preflight_score, MINIMUM_SAMPLE_THRESHOLD
from services.drift_detector import PageHinkleyDriftDetector
from services.ranking_metrics import calculate_spearman_rho, calculate_ndcg_at_k, calculate_pearson_r, calculate_mae
from services.calibration_service import generate_calibration_snapshot


class TestPhase2BCalibration(unittest.TestCase):

    def test_insufficient_sample_fallback(self):
        scores = [80.0] * 15
        ctrs = [0.03] * 15

        res = calibrate_preflight_score(baseline_score=75.0, observed_historical_scores=scores, observed_ctr_values=ctrs, feature_flag_override=True)
        self.assertFalse(res["is_calibrated"])
        self.assertEqual(res["calibrated_score"], 75.0)
        self.assertIn("Insufficient sample size", res["reason"])

    def test_empirical_bayes_calibration_sufficient_samples(self):
        # Generate N=35 samples
        scores = [60.0 + (i % 10) * 4 for i in range(35)]
        ctrs = [0.02 + (i % 10) * 0.005 for i in range(35)]

        res = calibrate_preflight_score(baseline_score=85.0, observed_historical_scores=scores, observed_ctr_values=ctrs, feature_flag_override=True)
        self.assertTrue(res["is_calibrated"])
        self.assertGreater(res["calibrated_score"], 0.0)
        self.assertLessEqual(res["calibrated_score"], 100.0)
        self.assertEqual(res["sample_count"], 35)

    def test_feature_flag_disabled_behavior(self):
        scores = [70.0] * 40
        ctrs = [0.03] * 40

        res = calibrate_preflight_score(baseline_score=80.0, observed_historical_scores=scores, observed_ctr_values=ctrs, feature_flag_override=False)
        self.assertFalse(res["is_calibrated"])
        self.assertEqual(res["calibrated_score"], 80.0)
        self.assertEqual(res["reason"], "feature_flag_disabled")

    def test_page_hinkley_drift_detection(self):
        detector = PageHinkleyDriftDetector(threshold=5.0)

        # Steady baseline
        stable_samples = [70.0] * 20
        res_stable = detector.evaluate_batch(stable_samples)
        self.assertFalse(res_stable["drift_detected"])

        # Sudden upward drift spike
        drifting_samples = [70.0] * 15 + [95.0] * 15
        res_drift = detector.evaluate_batch(drifting_samples)
        self.assertTrue(res_drift["drift_detected"])

    def test_ranking_and_error_metrics(self):
        scores = [90.0, 80.0, 70.0, 60.0, 50.0]
        actuals = [0.05, 0.04, 0.03, 0.02, 0.01]

        rho = calculate_spearman_rho(scores, actuals)
        ndcg = calculate_ndcg_at_k(scores, actuals, k=5)
        pearson = calculate_pearson_r(scores, actuals)
        mae = calculate_mae([0.9, 0.8], [0.9, 0.8])

        self.assertEqual(rho, 1.0)
        self.assertEqual(ndcg, 1.0)
        self.assertEqual(pearson, 1.0)
        self.assertEqual(mae, 0.0)

    def test_calibration_service_snapshot_generation(self):
        scores = [85.0] * 32
        ctrs = [0.04] * 32

        snapshot = generate_calibration_snapshot("B2B SaaS", scores, ctrs)
        self.assertEqual(snapshot["industry"], "B2B SaaS")
        self.assertEqual(snapshot["sample_count"], 32)
        self.assertTrue(snapshot["is_ready_for_calibration"])
        self.assertIn("spearman_rho", snapshot["metrics"])


if __name__ == "__main__":
    unittest.main()
