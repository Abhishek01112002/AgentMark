"""
Unit Tests for Batch 2 — Focus Group Agent Execution
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import PersonaProfile, PersonaCritique, PersonaRubric, AnalystSynthesis, ActionableRecommendation
from agents.focus_group import _run_single_persona_critique, _run_analyst_synthesis


class TestFocusGroupAgentBatch2(unittest.IsolatedAsyncioTestCase):

    async def test_single_persona_critique_uses_deterministic_params(self):
        mock_client = MagicMock()
        mock_critique = PersonaCritique(
            persona_id="temp-id",
            rubric=PersonaRubric(clarity=5, trust=4, value=4, urgency=3),
            objection="Pricing could be clearer.",
            clash_quote="Starting at affordable pricing",
            click_intent=True,
            verdict="Promising solution."
        )
        mock_client.generate_structured.return_value = mock_critique

        persona = PersonaProfile(
            id="sarah-tech",
            name="Sarah Jenkins",
            age=34,
            occupation="Product Manager",
            income_bracket="$100k-$150k",
            buying_barriers=["Lack of transparent pricing"],
            trust_triggers=["Case studies"],
            cognitive_profile="Skeptical, values clarity."
        )

        result = await _run_single_persona_critique(mock_client, persona, "AgentMark", "Test copy")

        self.assertEqual(result.persona_id, "sarah-tech")
        self.assertEqual(result.resonance_score, 80)
        
        # Verify deterministic parameters passed to LLM
        mock_client.generate_structured.assert_called_once()
        kwargs = mock_client.generate_structured.call_args.kwargs
        self.assertEqual(kwargs.get("temperature"), 0.2)
        self.assertEqual(kwargs.get("seed"), 42)

    async def test_analyst_synthesis_sanitizes_rewrites(self):
        mock_client = MagicMock()
        mock_synthesis = AnalystSynthesis(
            overall_score=60,
            actionable_recommendations=[
                ActionableRecommendation(
                    target_channel="LinkedIn",
                    friction_identified="Risky claim in pitch",
                    suggested_revision="Our software is FDA Approved with guaranteed 100% returns."
                )
            ]
        )
        mock_client.generate_structured.return_value = mock_synthesis

        critiques = [
            PersonaCritique(
                persona_id="sarah-tech",
                rubric=PersonaRubric(clarity=3, trust=2, value=3, urgency=2),
                objection="Doubt claims.",
                clash_quote="Claim line",
                click_intent=False,
                verdict="Do not trust."
            )
        ]

        personas = []
        report = await _run_analyst_synthesis(mock_client, critiques, "Original copy", personas)

        self.assertEqual(len(report.actionable_recommendations), 1)
        self.assertIn("[Claim Verification Required]", report.actionable_recommendations[0].suggested_revision)
        self.assertNotIn("FDA Approved", report.actionable_recommendations[0].suggested_revision)


if __name__ == "__main__":
    unittest.main()
