"""
Unit Tests for Devil's Advocate Agent
"""

import sys
import unittest
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import DevilsAdvocateIssue
from agents.devils_advocate import run_devils_advocate_audit, DevilsAdvocateReportContainer


class TestDevilsAdvocate(unittest.IsolatedAsyncioTestCase):

    async def test_run_devils_advocate_audit_success(self):
        mock_client = MagicMock()
        mock_report = DevilsAdvocateReportContainer(
            issues=[
                DevilsAdvocateIssue(
                    issue="Unsubstantiated 10x speedup claim",
                    severity="CRITICAL",
                    evidence="10x faster campaign creation",
                    recommended_fix="Link to benchmark methodology"
                )
            ]
        )
        mock_client.generate_structured.return_value = mock_report

        copy_text = "Experience 10x faster campaign creation with AgentMark."
        issues = await run_devils_advocate_audit(copy_text, "AgentMark", client=mock_client)

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].severity, "CRITICAL")
        self.assertIn("10x speedup", issues[0].issue)

    async def test_run_devils_advocate_audit_fallback_on_error(self):
        mock_client = MagicMock()
        mock_client.generate_structured.side_effect = Exception("LLM Error")

        copy_text = "Generic marketing pitch text."
        issues = await run_devils_advocate_audit(copy_text, "AgentMark", client=mock_client)

        self.assertEqual(len(issues), 1)
        self.assertEqual(issues[0].severity, "MEDIUM")
        self.assertIn("Potential unverified claim", issues[0].issue)


if __name__ == "__main__":
    unittest.main()
