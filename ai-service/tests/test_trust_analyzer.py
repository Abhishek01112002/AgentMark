"""
Unit Tests for Trust Analyzer Agent
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import TrustSignalAnalysis
from agents.trust_analyzer import analyze_trust_signals


class TestTrustAnalyzer(unittest.IsolatedAsyncioTestCase):

    async def test_analyze_trust_signals_success(self):
        mock_client = MagicMock()
        mock_analysis = TrustSignalAnalysis(
            evidence_score=85.0,
            detected_proof_elements=["SOC2 Type II certified", "99.99% uptime SLA"],
            missing_proof_elements=["Customer video testimonial"]
        )
        mock_client.generate_structured.return_value = mock_analysis

        copy_text = "Enterprise SaaS with SOC2 Type II compliance and 99.99% uptime SLA."
        result = await analyze_trust_signals(copy_text, client=mock_client)

        self.assertEqual(result.evidence_score, 85.0)
        self.assertEqual(len(result.detected_proof_elements), 2)
        self.assertIn("SOC2 Type II certified", result.detected_proof_elements)

    async def test_analyze_trust_signals_fallback_on_error(self):
        mock_client = MagicMock()
        mock_client.generate_structured.side_effect = Exception("LLM Timeout")

        copy_text = "Save 50% on software costs today."
        result = await analyze_trust_signals(copy_text, client=mock_client)

        # Fallback heuristic detects numerical digits
        self.assertEqual(result.evidence_score, 65.0)
        self.assertIn("Contains specific numerical data", result.detected_proof_elements[0])


if __name__ == "__main__":
    unittest.main()
