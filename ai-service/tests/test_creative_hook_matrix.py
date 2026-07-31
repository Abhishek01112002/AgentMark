"""
Unit Tests for Creative Hook Matrix Agent Execution
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from agents.creative_hook_matrix import creative_hook_matrix_node, _run_creative_hook_matrix
from schemas.creative_hook import CreativeHookMatrixOutput, CreativeHook, HookCTA, HookScoreBreakdown


class TestCreativeHookMatrixAgent(unittest.IsolatedAsyncioTestCase):

    async def test_creative_hook_matrix_basic_execution(self):
        state = {
            "brief": {"name": "Test Campaign", "target_audience": "Tech Founders"},
            "strategy": {"angle": "Automation speed"},
            "copywriter": {"headline": "Build faster with AI"}
        }

        mock_client = MagicMock()
        mock_output = CreativeHookMatrixOutput(
            version="1.0",
            total_hooks=2,
            best_hook_id="hook-1",
            average_score=85.0,
            hooks=[
                CreativeHook(
                    id="hook-1",
                    category="Question",
                    angle="Speed",
                    headline="Why spend 3 weeks launching a campaign?",
                    body="Deploy 8 AI agents in 90 seconds.",
                    cta=HookCTA(text="Try AgentMark", type="Primary"),
                    emotional_trigger="Curiosity",
                    pattern_interrupt="High",
                    scores=HookScoreBreakdown(
                        clarity=90, novelty=85, pattern_interrupt=85, cta_strength=80, brand_alignment=85, overall=85.0
                    )
                )
            ]
        )
        mock_client.generate_structured.return_value = mock_output

        result = await _run_creative_hook_matrix(state, mock_client)

        self.assertIn("creative_hook_matrix", result)
        output = result["creative_hook_matrix"]
        self.assertEqual(output.get("total_hooks"), 2)
        self.assertEqual(output.get("best_hook_id"), "hook-1")
