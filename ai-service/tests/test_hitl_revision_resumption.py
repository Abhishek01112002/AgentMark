"""
Unit Test for HITL Human Approval Revision Resumption
Verifies that when a campaign workflow reaches awaiting_human_approval (hitting END node)
and a human revision request is submitted, _run_workflow correctly updates the checkpoint state
and triggers the targeted agent node revision.
"""

import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from agents.state import CampaignState
from workflow.graph import create_campaign_graph
from api.routes.campaigns import _run_workflow


class TestHITLRevisionResumption(unittest.TestCase):

    def setUp(self):
        self.workflow = create_campaign_graph()
        self.campaign_id = "test-hitl-resumption-uuid-1234"

    def test_hitl_revision_resumption_executes_target_agent(self):
        """
        1. Run workflow initial run -> hits reviewer -> routes to human_approval -> workflow pauses/ends at awaiting_human_approval.
        2. Verify checkpoint state has awaiting_human_approval=True and next is ().
        3. Invoke _run_workflow with human_approval_status='rejected' and human_revision_target='copywriter'.
        4. Verify _run_workflow correctly updates state as_node='human_approval' and routes to copywriter for revision.
        """
        # Mock agents to speed up initial run
        with patch("workflow.graph.manager_agent") as mock_mgr, \
             patch("workflow.graph.research_agent") as mock_res, \
             patch("workflow.graph.strategy_agent") as mock_strat, \
             patch("workflow.graph.copywriter_agent") as mock_copy, \
             patch("workflow.graph.creative_hook_matrix_agent") as mock_hooks, \
             patch("workflow.graph.image_prompt_agent") as mock_img, \
             patch("workflow.graph.reviewer_agent") as mock_rev:

            mock_mgr.side_effect = lambda st: setattr(st, "manager_output", '{"channels":["email"]}') or st
            mock_res.side_effect = lambda st: setattr(st, "research_output", '{"market":"ok"}') or st
            mock_strat.side_effect = lambda st: setattr(st, "strategy_output", '{"pos":"ok"}') or st
            mock_copy.side_effect = lambda st: setattr(st, "copy_output", '{"copies":{}}') or st
            mock_hooks.side_effect = lambda st: setattr(st, "creative_hook_matrix_output", '{"hooks":[]}') or st
            mock_img.side_effect = lambda st: setattr(st, "image_output", '{"prompts":[]}') or st
            mock_rev.side_effect = lambda st: setattr(st, "review_output", '{"status":"approved","overall_quality_score":85}') or st

            # Step 1: Initial run
            initial_state = CampaignState(
                campaign_id=self.campaign_id,
                campaign_name="Test Campaign",
                brand_name="TestBrand",
                industry="saas",
                primary_goal="awareness",
                target_audience="Devs",
                brand_voice="tech",
            )

            res1 = _run_workflow(self.workflow, initial_state)
            self.assertTrue(res1.awaiting_human_approval)
            self.assertEqual(res1.status, "awaiting_human_approval")

            # Checkpoint verify: next is empty tuple because graph hit END
            config = {"configurable": {"thread_id": self.campaign_id}}
            checkpoint = self.workflow.get_state(config)
            self.assertEqual(checkpoint.next, ())
            self.assertTrue(checkpoint.values.get("awaiting_human_approval"))

            # Step 2: Submit Human Revision Request for 'copywriter'
            revision_request_state = CampaignState(
                campaign_id=self.campaign_id,
                campaign_name="Test Campaign",
                brand_name="TestBrand",
                industry="saas",
                primary_goal="awareness",
                target_audience="Devs",
                brand_voice="tech",
                human_approval_status="rejected",
                human_feedback="Make copy more engaging and punchy",
                human_revision_target="copywriter",
            )

            # Reset call count on copywriter agent mock to track if it executes during revision
            mock_copy.reset_mock()

            res2 = _run_workflow(self.workflow, revision_request_state)

            # Verification: copywriter_agent MUST HAVE BEEN CALLED during revision!
            self.assertTrue(mock_copy.called, "Copywriter agent was NOT called during revision resumption!")
            self.assertEqual(res2.copy_revision_count, 1, "Copy revision count was not incremented!")


if __name__ == "__main__":
    unittest.main()
