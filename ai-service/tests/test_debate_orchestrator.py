"""
Unit & Integration Tests for Multi-Persona Debate Engine
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from agents.debate_orchestrator import run_multi_persona_debate, DebateRoundContainer
from schemas.simulation import PersonaProfile, PersonaCritique, PersonaRubric, DebateRound


class TestDebateOrchestrator(unittest.IsolatedAsyncioTestCase):

    async def test_run_multi_persona_debate_success(self):
        mock_client = MagicMock()
        mock_debate_container = DebateRoundContainer(
            rounds=[
                DebateRound(round_number=1, speaker_persona_id="ciso-1", transcript="Initial security audit statement."),
                DebateRound(round_number=2, speaker_persona_id="cfo-1", target_persona_id="ciso-1", transcript="Objection regarding implementation payback period."),
                DebateRound(round_number=3, speaker_persona_id="ciso-1", transcript="Final approval contingent on SOC2 certification link.")
            ],
            buying_probability=82.5,
            consensus="revise",
            top_objections=["Payback period unverified"],
            unresolved_risks=["Third-party audit proof"],
            strongest_positive_signals=["Strong security framing"]
        )
        mock_client.generate_structured.return_value = mock_debate_container

        personas = [
            PersonaProfile(
                id="ciso-1",
                name="Enterprise CISO",
                age=45,
                occupation="Chief Information Security Officer",
                income_bracket="$250k+",
                buying_barriers=["Missing SOC2 proof"],
                trust_triggers=["SOC2 Type II badge"],
                cognitive_profile="Analytical"
            )
        ]

        critiques = [
            PersonaCritique(
                persona_id="ciso-1",
                resonance_score=75,
                objection="Needs SOC2 proof",
                clash_quote="SOC2 compliance",
                click_intent=True,
                verdict="Conditional Pass",
                rubric=PersonaRubric(clarity=4, trust=3, value=4, urgency=3)
            )
        ]

        summary = await run_multi_persona_debate(
            campaign_copy="Enterprise SaaS with SOC2 Type II compliance.",
            personas=personas,
            critiques=critiques,
            client=mock_client
        )

        self.assertEqual(len(summary.rounds), 3)
        self.assertEqual(summary.buying_probability, 82.5)
        self.assertEqual(summary.consensus, "revise")
        self.assertIn("Payback period unverified", summary.top_objections)

    async def test_run_multi_persona_debate_fallback_on_error(self):
        mock_client = MagicMock()
        mock_client.generate_structured.side_effect = Exception("LLM Network Timeout")

        personas = [
            PersonaProfile(
                id="cfo-1",
                name="CFO Persona",
                age=40,
                occupation="Chief Financial Officer",
                income_bracket="$200k+",
                buying_barriers=["Price"],
                trust_triggers=["ROI"],
                cognitive_profile="Data-driven"
            )
        ]

        critiques = [
            PersonaCritique(
                persona_id="cfo-1",
                resonance_score=80,
                objection="High price",
                clash_quote="Price",
                click_intent=True,
                verdict="Approved and validated pitch",
                rubric=PersonaRubric(clarity=4, trust=4, value=4, urgency=4)
            )
        ]

        summary = await run_multi_persona_debate(
            campaign_copy="Save 40% on enterprise cloud infrastructure.",
            personas=personas,
            critiques=critiques,
            client=mock_client
        )

        self.assertEqual(len(summary.rounds), 3)
        self.assertEqual(summary.consensus, "approve")
        self.assertGreaterEqual(summary.buying_probability, 70.0)


if __name__ == "__main__":
    unittest.main()
