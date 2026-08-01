"""
Unit Tests for Creative Hook Matrix Agent Execution
"""

import sys
import unittest
import json
from unittest.mock import MagicMock
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from agents.creative_hook_matrix import creative_hook_matrix_agent
from schemas.agent_outputs import CreativeHookMatrixOutput, CreativeHook, HookCTA, HookScoreBreakdown


class TestCreativeHookMatrixAgent(unittest.IsolatedAsyncioTestCase):

    async def test_creative_hook_matrix_basic_execution(self):
        state = {
            "campaign_id": "test-camp-001",
            "campaign_name": "Test Campaign",
            "brand_name": "Test Brand",
            "industry": "Software",
            "primary_goal": "Lead Generation",
            "target_audience": "Tech Founders",
            "brief": '{"name": "Test Campaign", "target_audience": "Tech Founders"}',
            "strategy_output": '{"angle": "Automation speed"}',
            "copy_output": '{"headline": "Build faster with AI"}',
            "research_output": '{"findings": "Good"}',
            "status": "processing"
        }

        mock_client = MagicMock()
        dummy_scores = HookScoreBreakdown(
            clarity=90, novelty=85, pattern_interrupt=85, cta_strength=80, brand_alignment=85, overall=85.0
        )
        
        hooks_list = []
        categories = ['Benefit', 'Contrarian', 'Curiosity', 'Fear', 'Negative', 'Social Proof', 'Statistic', 'Story', 'Urgency', 'Question']
        
        for i, cat in enumerate(categories):
            hooks_list.append(CreativeHook(
                id=f"hook-{i}",
                category=cat,
                angle="Speed",
                headline="Dummy Headline",
                body="Dummy Body",
                ctas=[HookCTA(text="Try AgentMark", type="Primary"), HookCTA(text="Learn More", type="Secondary")],
                psychological_angle="Fear of missing out",
                emotional_trigger="Curiosity",
                pattern_interrupt="High",
                scores=dummy_scores
            ))

        mock_output = CreativeHookMatrixOutput(
            hooks=hooks_list,
            status="completed"
        )
        mock_client.generate_structured.return_value = mock_output

        from agents.state import CampaignState
        state_obj = CampaignState(**state)
    
        with unittest.mock.patch('agents.creative_hook_matrix.get_llm_client') as mock_get_client, \
             unittest.mock.patch('agents.creative_hook_matrix.cache_get') as mock_cache_get:
            
            mock_get_client.return_value = mock_client
            mock_cache_get.return_value = None
            
            # 2. ACT
            result = creative_hook_matrix_agent(state_obj)

        self.assertIsNotNone(result.creative_hook_matrix_output)
        output = json.loads(result.creative_hook_matrix_output)
        self.assertEqual(len(output.get("hooks", [])), 10)
