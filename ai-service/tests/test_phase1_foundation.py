"""
Unit Tests for Batch 1 — AI Service Schemas & Guardrails Foundation
"""

import sys
from pathlib import Path
import pytest

# Ensure ai-service root is in sys.path
AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

import unittest
from schemas.simulation import PersonaCritique, PersonaRubric, ActionableRecommendation
from utils.guardrails import sanitize_copy_rewrites


class TestPhase1Foundation(unittest.TestCase):

    def test_persona_rubric_auto_computes_resonance_score(self):
        rubric = PersonaRubric(clarity=4, trust=2, value=5, urgency=2)
        critique = PersonaCritique(
            persona_id="test-persona",
            rubric=rubric,
            objection="This product needs more social proof and evidence.",
            clash_quote="Guaranteed 10x ROI overnight",
            click_intent=False,
            verdict="I would scroll past due to lack of proof."
        )
        # (4 + 2 + 5 + 2) * 5 = 65
        self.assertEqual(critique.resonance_score, 65)
        self.assertEqual(critique.rubric.clarity, 4)
        self.assertEqual(critique.rubric.trust, 2)

    def test_persona_critique_fallback_rubric_defaults(self):
        critique = PersonaCritique(
            persona_id="legacy-persona",
            objection="Objection with default rubric.",
            clash_quote="Some quote here",
            click_intent=True,
            verdict="Passes with default"
        )
        # Default rubric: 3+3+3+3 = 12 * 5 = 60
        self.assertEqual(critique.rubric.clarity, 3)
        self.assertEqual(critique.resonance_score, 60)

    def test_guardrails_sanitize_unauthorized_claims(self):
        recs = [
            ActionableRecommendation(
                target_channel="LinkedIn",
                friction_identified="Unsubstantiated claims in pitch",
                suggested_revision="Our platform is FDA Approved and provides guaranteed 100% returns."
            ),
            ActionableRecommendation(
                target_channel="Email",
                friction_identified="Lacks clear benefit statement",
                suggested_revision="Discover how 500+ teams streamlined their workflows."
            )
        ]

        sanitized = sanitize_copy_rewrites(recs)
        
        self.assertIn("[Claim Verification Required]", sanitized[0].suggested_revision)
        self.assertNotIn("FDA Approved", sanitized[0].suggested_revision)
        self.assertEqual(sanitized[1].suggested_revision, "Discover how 500+ teams streamlined their workflows.")


if __name__ == "__main__":
    unittest.main()

