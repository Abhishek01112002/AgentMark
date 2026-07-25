"""
Unit Tests for Persona Memory & Retrieval Service
"""

import sys
import unittest
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from services.persona_memory import (
    save_simulation_memories,
    load_persona_memories,
    clear_memory_store
)


class TestPersonaMemory(unittest.TestCase):

    def setUp(self):
        clear_memory_store()

    def tearDown(self):
        clear_memory_store()

    def test_load_persona_memories_limit(self):
        for i in range(7):
            save_simulation_memories(
                project_id="proj-alpha",
                persona_id="ciso-1",
                objections=[f"Objection number {i+1}"],
                accepted_fixes=[]
            )

        memories = load_persona_memories("proj-alpha", "ciso-1", limit=5)
        self.assertEqual(len(memories), 5)
        self.assertIn("Objection number 7", memories[0].summary)

    def test_project_isolation(self):
        save_simulation_memories(
            project_id="proj-customer-a",
            persona_id="cfo-1",
            objections=["High price for Customer A"],
            accepted_fixes=[]
        )
        save_simulation_memories(
            project_id="proj-customer-b",
            persona_id="cfo-1",
            objections=["Unclear ROI for Customer B"],
            accepted_fixes=[]
        )

        memories_a = load_persona_memories("proj-customer-a", "cfo-1")
        memories_b = load_persona_memories("proj-customer-b", "cfo-1")

        self.assertEqual(len(memories_a), 1)
        self.assertIn("Customer A", memories_a[0].summary)
        self.assertNotIn("Customer B", memories_a[0].summary)

        self.assertEqual(len(memories_b), 1)
        self.assertIn("Customer B", memories_b[0].summary)

    def test_memory_deduplication(self):
        res1 = save_simulation_memories(
            project_id="proj-alpha",
            persona_id="dev-1",
            objections=["Missing API documentation"],
            accepted_fixes=["Add OpenAPI link"]
        )
        self.assertEqual(len(res1.new_items_saved), 2)

        # Duplicate save
        res2 = save_simulation_memories(
            project_id="proj-alpha",
            persona_id="dev-1",
            objections=["Missing API documentation"],
            accepted_fixes=["Add OpenAPI link"]
        )
        self.assertEqual(len(res2.new_items_saved), 0)

    def test_trust_delta_updates(self):
        res = save_simulation_memories(
            project_id="proj-alpha",
            persona_id="ciso-1",
            objections=[],
            accepted_fixes=[],
            trust_delta=12.5
        )
        self.assertEqual(res.trust_delta, 12.5)
        self.assertIn("Trust score delta: +12.5%", res.new_items_saved[0])


if __name__ == "__main__":
    unittest.main()
