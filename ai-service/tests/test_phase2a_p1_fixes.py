"""
Unit Tests for Phase 2A P1 Production Hardening Fixes
"""

import sys
import unittest
from datetime import timezone
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent
from services.provider_credential_service import ProviderCredentialResolver
from services.telemetry_pipeline import process_telemetry_webhook, clear_telemetry_pipeline_cache


class TestPhase2AP1Fixes(unittest.TestCase):

    def setUp(self):
        clear_telemetry_pipeline_cache()

    def tearDown(self):
        clear_telemetry_pipeline_cache()

    def test_timezone_utc_compliance(self):
        event = NormalizedPerformanceEvent(
            event_id="evt_tz_001",
            organization_id="org_1",
            project_id="proj_1",
            campaign_id="cmp_1",
            platform="meta",
            metrics=CanonicalAdMetrics(platform="meta", campaign_id="cmp_1")
        )
        self.assertIsNotNone(event.event_timestamp.tzinfo)
        self.assertEqual(event.event_timestamp.tzinfo, timezone.utc)

    def test_kms_versioned_credential_resolver(self):
        resolver = ProviderCredentialResolver(active_kms_version="v2")
        formatted = resolver.format_encrypted_metadata({"api_key": "secret_key_123"}, kms_version="v2")
        parsed = resolver.parse_encrypted_metadata(formatted)

        self.assertIn("kms_version", formatted)
        self.assertIn("v2", formatted)
        self.assertEqual(parsed.get("api_key"), "secret_key_123")


if __name__ == "__main__":
    unittest.main()
