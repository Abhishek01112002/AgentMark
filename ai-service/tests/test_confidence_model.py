"""
Unit Tests for TrustModelResolver and Simulation Confidence Engine
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.trust_model_resolver import TrustModelResolver, TRUST_MODELS
from services.confidence_engine import calculate_simulation_confidence


class TestTrustModelAndConfidenceEngine(unittest.TestCase):

    def test_trust_model_resolver_b2b(self):
        config = TrustModelResolver.resolve("B2B SaaS Platform")
        self.assertEqual(config.industry, "b2b_saas")
        self.assertEqual(config.evidence_weight, 0.65)
        self.assertEqual(config.perception_weight, 0.35)

    def test_trust_model_resolver_healthcare(self):
        config = TrustModelResolver.resolve("Healthcare & Medical")
        self.assertEqual(config.industry, "healthcare")
        self.assertEqual(config.evidence_weight, 0.75)
        self.assertEqual(config.perception_weight, 0.25)

    def test_trust_model_resolver_dtc(self):
        config = TrustModelResolver.resolve("DTC E-Commerce Retail")
        self.assertEqual(config.industry, "dtc")
        self.assertEqual(config.evidence_weight, 0.40)
        self.assertEqual(config.perception_weight, 0.60)

    def test_trust_model_resolver_luxury(self):
        config = TrustModelResolver.resolve("Luxury Goods & Premium Fashion")
        self.assertEqual(config.industry, "luxury")
        self.assertEqual(config.evidence_weight, 0.20)
        self.assertEqual(config.perception_weight, 0.80)

    def test_confidence_engine_calculation(self):
        confidence = calculate_simulation_confidence(
            persona_count=5,
            evidence_score=80.0,
            critiques=[],
            has_historical_benchmarks=True
        )
        self.assertGreaterEqual(confidence, 0.40)
        self.assertLessEqual(confidence, 1.0)
        self.assertEqual(confidence, 0.86)


if __name__ == "__main__":
    unittest.main()
