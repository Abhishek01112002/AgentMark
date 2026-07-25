"""
Unit Tests for Cross-Tenant Cache Isolation in Simulation Cache Service
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.simulation_cache import get_cached_agent_output, store_cached_agent_output, clear_simulation_cache


class TestTenantCacheIsolation(unittest.TestCase):

    def setUp(self):
        clear_simulation_cache()

    def tearDown(self):
        clear_simulation_cache()

    def test_tenant_cache_isolation(self):
        prompt_key = "prompt_hash_999"

        data_org_a = {"result": "Org A response"}
        data_org_b = {"result": "Org B response"}

        store_cached_agent_output(prompt_key, data_org_a, organization_id="org_A")
        store_cached_agent_output(prompt_key, data_org_b, organization_id="org_B")

        cached_a = get_cached_agent_output(prompt_key, organization_id="org_A")
        cached_b = get_cached_agent_output(prompt_key, organization_id="org_B")

        self.assertEqual(cached_a, data_org_a)
        self.assertEqual(cached_b, data_org_b)
        self.assertNotEqual(cached_a, cached_b)

    def test_same_tenant_cache_hit(self):
        prompt_key = "prompt_hash_123"
        data = {"output": "Cached execution"}

        store_cached_agent_output(prompt_key, data, organization_id="org_Alpha")
        cached = get_cached_agent_output(prompt_key, organization_id="org_Alpha")

        self.assertEqual(cached, data)

    def test_empty_org_id_rejection(self):
        prompt_key = "prompt_hash_777"
        data = {"output": "Invalid"}

        store_cached_agent_output(prompt_key, data, organization_id="")
        self.assertIsNone(get_cached_agent_output(prompt_key, organization_id=""))


if __name__ == "__main__":
    unittest.main()
