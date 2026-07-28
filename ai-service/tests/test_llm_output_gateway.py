"""
Unit & Integration Tests for LLM Output Gateway (json_gateway.py).
Verifies extraction, array-to-object normalization, markdown cleaning,
and 5 production failure scenarios (A, B, C, D, E).
"""

import unittest
from pydantic import BaseModel, Field
from typing import List, Optional

from llm.json_gateway import (
    parse_and_validate,
    extract_first_json_object,
    clean_markdown_fences,
    normalize_array_to_object,
    METRICS,
)


class MockResearchOutput(BaseModel):
    market_analysis: dict = Field(default_factory=dict)
    summary: str = "default summary"


class TestLLMOutputGateway(unittest.TestCase):

    def test_scenario_a_trailing_commentary(self):
        """Scenario A: Valid JSON object with trailing commentary 'Hope this helps.'."""
        raw_text = '{\n "market_analysis": {"tam": "$10B"},\n "summary": "Growth market"\n}\nHope this helps.'
        extracted = extract_first_json_object(raw_text)
        self.assertIsNotNone(extracted)
        self.assertNotIn("Hope this helps", extracted)

        model, err, repaired = parse_and_validate(raw_text, MockResearchOutput, agent_name="test_a")
        self.assertIsNotNone(model)
        self.assertEqual(model.summary, "Growth market")

    def test_scenario_b_trailing_closing_braces(self):
        """Scenario B: Valid JSON object with extra closing braces at the end."""
        raw_text = '{\n "market_analysis": {"tam": "$5B"},\n "summary": "Valid"\n}\n}\n}'
        extracted = extract_first_json_object(raw_text)
        self.assertEqual(extracted.count("{"), 2)
        self.assertEqual(extracted.count("}"), 2)

        model, err, repaired = parse_and_validate(raw_text, MockResearchOutput, agent_name="test_b")
        self.assertIsNotNone(model)
        self.assertEqual(model.summary, "Valid")

    def test_scenario_c_array_vs_object_mismatch(self):
        """Scenario C: LLM returns array `[{...}, {"status":"success"}]` when object expected."""
        raw_text = '[\n {\n  "market_analysis": {"trend": "AI"},\n  "summary": "Array item"\n },\n {\n  "status": "success"\n }\n]'
        model, err, repaired = parse_and_validate(raw_text, MockResearchOutput, agent_name="test_c")
        self.assertIsNotNone(model)
        self.assertTrue(repaired)
        self.assertEqual(model.summary, "Array item")

    def test_scenario_d_markdown_fences(self):
        """Scenario D: Output wrapped in markdown code fences ```json ... ```."""
        raw_text = '```json\n{\n "market_analysis": {},\n "summary": "Fenced"\n}\n```'
        cleaned = clean_markdown_fences(raw_text)
        self.assertFalse(cleaned.startswith("```"))
        self.assertFalse(cleaned.endswith("```"))

        model, err, repaired = parse_and_validate(raw_text, MockResearchOutput, agent_name="test_d")
        self.assertIsNotNone(model)
        self.assertEqual(model.summary, "Fenced")

    def test_scenario_e_partial_json_token_truncation(self):
        """Scenario E: Unclosed string/brace from token cutoff repairs via json_repair."""
        raw_text = '{\n "market_analysis": {"trend": "high demand"}, "summary": "Truncated'
        model, err, repaired = parse_and_validate(raw_text, MockResearchOutput, agent_name="test_e")
        self.assertIsNotNone(model)
        self.assertEqual(model.summary, "Truncated")

    def test_metrics_tracking(self):
        """Verify LLMReliabilityMetrics records metrics correctly."""
        parse_and_validate('{"market_analysis": {}, "summary": "metrics"}', MockResearchOutput, agent_name="test_metrics")
        summary = METRICS.get_summary()
        self.assertIn("json_success_count", summary)
        self.assertGreater(summary["total_requests"], 0)


if __name__ == "__main__":
    unittest.main()
