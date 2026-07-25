"""
Unit & Integration Tests for Dynamic Persona Composer Agent
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from agents.persona_composer import compose_dynamic_personas, GeneratedPersonaListContainer
from schemas.simulation import PersonaProfile


class TestPersonaComposer(unittest.IsolatedAsyncioTestCase):

    async def test_compose_dynamic_personas_b2b_saas(self):
        mock_client = MagicMock()
        mock_container = GeneratedPersonaListContainer(
            personas=[
                PersonaProfile(
                    id="ciso-test",
                    name="Enterprise CISO",
                    age=45,
                    occupation="Chief Information Security Officer",
                    income_bracket="$250k+",
                    buying_barriers=["Missing SOC2 proof"],
                    trust_triggers=["SOC2 Type II badge"],
                    cognitive_profile="Analytical",
                    company_size="Enterprise (2000+ employees)",
                    buying_stage="Risk Assessment"
                )
            ]
        )
        mock_client.generate_structured.return_value = mock_container

        personas = await compose_dynamic_personas(
            campaign_brief="Enterprise Cyber Security Platform",
            industry="B2B SaaS",
            target_audience="CISOs and Security Leads",
            product_category="Security Software",
            client=mock_client
        )

        self.assertGreaterEqual(len(personas), 1)
        self.assertEqual(personas[0].occupation, "Chief Information Security Officer")

    async def test_compose_dynamic_personas_fallback_on_llm_error(self):
        mock_client = MagicMock()
        mock_client.generate_structured.side_effect = Exception("LLM Error")

        personas = await compose_dynamic_personas(
            campaign_brief="DTC Fitness Wear",
            industry="DTC",
            target_audience="Fitness Enthusiasts",
            product_category="Apparel",
            client=mock_client
        )

        self.assertGreaterEqual(len(personas), 2)
        self.assertIn("Budget-Conscious", personas[0].name)


if __name__ == "__main__":
    unittest.main()
