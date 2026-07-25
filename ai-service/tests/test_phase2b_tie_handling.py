"""
Unit Tests for Phase 2B Spearman Tie Handling (Fractional Average Ranks)
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.ranking_metrics import calculate_spearman_rho


class TestSpearmanTieHandling(unittest.TestCase):

    def test_spearman_no_ties(self):
        scores = [10.0, 20.0, 30.0, 40.0]
        actuals = [1.0, 2.0, 3.0, 4.0]
        rho = calculate_spearman_rho(scores, actuals)
        self.assertEqual(rho, 1.0)

    def test_spearman_single_tie_group(self):
        # Tied scores: 20.0 appears twice -> ranks 2 and 3 averaged to 2.5
        scores = [10.0, 20.0, 20.0, 40.0]
        actuals = [1.0, 2.5, 2.5, 4.0]
        rho = calculate_spearman_rho(scores, actuals)
        self.assertEqual(rho, 1.0)

    def test_spearman_multiple_tie_groups(self):
        # Tied scores: (10, 10) -> rank 1.5; (30, 30) -> rank 3.5
        scores = [10.0, 10.0, 30.0, 30.0]
        actuals = [1.0, 1.0, 3.0, 3.0]
        rho = calculate_spearman_rho(scores, actuals)
        self.assertEqual(rho, 1.0)

    def test_spearman_all_values_identical(self):
        scores = [50.0, 50.0, 50.0, 50.0]
        actuals = [50.0, 50.0, 50.0, 50.0]
        rho = calculate_spearman_rho(scores, actuals)
        # Identical vectors have zero d_squared_sum -> rho = 1.0
        self.assertEqual(rho, 1.0)

    def test_spearman_short_inputs(self):
        self.assertEqual(calculate_spearman_rho([10.0], [1.0]), 0.0)
        self.assertEqual(calculate_spearman_rho([], []), 0.0)


if __name__ == "__main__":
    unittest.main()
