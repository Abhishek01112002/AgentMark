"""
Unit Test Suite for Phase 2.1 Architecture Hardening Sprint
"""

import sys
import unittest
from datetime import datetime, timedelta
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.ranking_evaluator import calculate_spearman_rank_correlation, calculate_ndcg
from services.calibration_policy import evaluate_micro_test_flight_eligibility
from services.webhook_event_ordering import apply_monotonic_event_update


class TestPhase21Hardening(unittest.TestCase):

    def test_spearman_rank_correlation(self):
        scores = [85.0, 92.0, 60.0, 75.0]
        actuals = [0.035, 0.048, 0.012, 0.022]  # Monotonic with scores

        rho = calculate_spearman_rank_correlation(scores, actuals)
        self.assertEqual(rho, 1.0)

    def test_ndcg_ranking_accuracy(self):
        scores = [90.0, 80.0, 70.0, 60.0]
        actuals = [3.0, 2.0, 1.0, 0.0]

        ndcg = calculate_ndcg(scores, actuals, k=3)
        self.assertEqual(ndcg, 1.0)

    def test_epsilon_greedy_exploration_policy(self):
        # Passed campaign -> no micro test needed
        res_passed = evaluate_micro_test_flight_eligibility(passed_gates=True, trust_score=85.0)
        self.assertFalse(res_passed["is_micro_test_flight"])

        # Blocked campaign with epsilon=1.0 forcing micro test trigger
        res_blocked = evaluate_micro_test_flight_eligibility(passed_gates=False, trust_score=40.0, epsilon=1.0)
        self.assertTrue(res_blocked["is_micro_test_flight"])
        self.assertEqual(res_blocked["allocated_budget_cap_usd"], 25.00)

    def test_webhook_monotonic_timestamp_ordering(self):
        now = datetime.now()
        older = now - timedelta(hours=2)

        existing = {"impressions": 1000, "event_timestamp": now}
        stale_incoming = {"impressions": 500, "event_timestamp": older}

        # Stale event should be rejected
        merged, updated = apply_monotonic_event_update(existing, stale_incoming)
        self.assertFalse(updated)
        self.assertEqual(merged["impressions"], 1000)

        # Newer event should be applied
        newer = now + timedelta(hours=1)
        newer_incoming = {"impressions": 1500, "event_timestamp": newer}
        merged_new, updated_new = apply_monotonic_event_update(existing, newer_incoming)
        self.assertTrue(updated_new)
        self.assertEqual(merged_new["impressions"], 1500)


if __name__ == "__main__":
    unittest.main()
