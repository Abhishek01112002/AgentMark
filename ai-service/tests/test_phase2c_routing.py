"""
Unit & Integration Test Suite for Phase 2C Hybrid Model Routing & Cost Optimization
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.model_router import route_model_request
from services.budget_manager import record_token_usage, set_organization_budget, clear_budget_store, get_budget_status
from services.provider_health import global_circuit_breaker
from services.simulation_cache import get_cached_agent_output, store_cached_agent_output, clear_simulation_cache


class TestPhase2CRouting(unittest.TestCase):

    def setUp(self):
        clear_budget_store()
        clear_simulation_cache()
        global_circuit_breaker.reset_all()

    def tearDown(self):
        clear_budget_store()
        clear_simulation_cache()
        global_circuit_breaker.reset_all()

    def test_model_router_tier_selection(self):
        # Tier 1 task -> groq
        res_t1 = route_model_request("persona_critique", feature_flag_override=True)
        self.assertEqual(res_t1["tier"], 1)

        # Tier 3 task -> gpt-4o
        res_t3 = route_model_request("debate_orchestration", feature_flag_override=True)
        self.assertEqual(res_t3["tier"], 3)
        self.assertEqual(res_t3["provider"], "openai")

    def test_budget_downgrade_trigger(self):
        org_id = "org_test_budget"
        set_organization_budget(org_id, 100_000)
        record_token_usage(org_id, 85_000)  # 85% usage > 80% threshold

        status = get_budget_status(org_id)
        self.assertTrue(status["requires_downgrade"])

        # Tier 3 task should automatically downgrade to Tier 1
        res = route_model_request("debate_orchestration", organization_id=org_id, feature_flag_override=True)
        self.assertEqual(res["tier"], 1)
        self.assertIn("budget_threshold_exceeded", res["routing_reason"])

    def test_provider_circuit_breaker_failover(self):
        # Record 3 failures for openai -> open circuit breaker
        global_circuit_breaker.record_failure("openai")
        global_circuit_breaker.record_failure("openai")
        global_circuit_breaker.record_failure("openai")

        self.assertFalse(global_circuit_breaker.is_provider_healthy("openai"))

        # Tier 3 task usually assigned to openai should fail over
        res = route_model_request("debate_orchestration", feature_flag_override=True)
        self.assertNotEqual(res["provider"], "openai")

    def test_simulation_cache_behavior(self):
        cache_key = "test_key_123"
        self.assertIsNone(get_cached_agent_output(cache_key))

        data = {"critique": "Solid copy", "score": 88}
        store_cached_agent_output(cache_key, data)

        cached = get_cached_agent_output(cache_key)
        self.assertEqual(cached, data)

    def test_feature_flag_disabled_fallback(self):
        res = route_model_request("persona_critique", feature_flag_override=False)
        self.assertEqual(res["tier"], 3)
        self.assertEqual(res["routing_reason"], "feature_flag_disabled_baseline_fallback")


if __name__ == "__main__":
    unittest.main()
