"""
Unit Tests for Persona Quality Evaluator Engine
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import PersonaProfile
from services.persona_quality_evaluator import evaluate_persona_quality, evaluate_persona_panel_quality


class TestPersonaQualityEvaluator(unittest.TestCase):

    def test_evaluate_persona_quality_high_quality(self):
        high_quality_persona = PersonaProfile(
            id="p-1",
            name="CFO Persona",
            age=40,
            occupation="Chief Financial Officer",
            income_bracket="$200k+",
            buying_barriers=["High price point"],
            trust_triggers=["Calculated ROI"],
            cognitive_profile="Data-Driven"
        )

        score = evaluate_persona_quality(high_quality_persona, "B2B SaaS")
        self.assertEqual(score, 1.0)

    def test_evaluate_persona_panel_quality_rejection(self):
        low_quality_persona = PersonaProfile(
            id="low-quality-persona",
            name="X",
            age=30,
            occupation="",
            income_bracket="Unknown",
            buying_barriers=["Short"],
            trust_triggers=["Trigger"],
            cognitive_profile=""
        )

        result = evaluate_persona_panel_quality([low_quality_persona], "B2B SaaS")
        self.assertFalse(result["passed"])
        self.assertLess(result["panel_confidence"], 0.60)


if __name__ == "__main__":
    unittest.main()
