"""
Unit & Integration Test Suite for Phase 2A Ad Platform Telemetry Ingestion Infrastructure
"""

import sys
import unittest
import hmac
import hashlib
from datetime import datetime, timedelta
from pathlib import Path

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent
from services.telemetry_connectors.meta_connector import MetaTelemetryConnector
from services.telemetry_connectors.google_connector import GoogleTelemetryConnector
from services.telemetry_connectors.linkedin_connector import LinkedInTelemetryConnector
from services.telemetry_pipeline import process_telemetry_webhook, clear_telemetry_pipeline_cache


class TestPhase2ATelemetry(unittest.TestCase):

    def setUp(self):
        clear_telemetry_pipeline_cache()

    def tearDown(self):
        clear_telemetry_pipeline_cache()

    def test_canonical_metrics_calculation(self):
        metrics = CanonicalAdMetrics(
            platform="meta",
            campaign_id="cmp_123",
            impressions=1000,
            clicks=50,
            conversions=5,
            spend_usd=100.0,
            observed_ctr=0.05,
            observed_cvr=0.10
        )
        self.assertEqual(metrics.platform, "meta")
        self.assertEqual(metrics.observed_ctr, 0.05)
        self.assertEqual(metrics.observed_cvr, 0.10)

    def test_meta_webhook_hmac_signature_verification(self):
        connector = MetaTelemetryConnector()
        payload_bytes = b'{"entry":[{"changes":[{"value":{"campaign_id":"123","impressions":1000,"clicks":50}}]}]}'
        secret = "super_secret_app_secret"

        valid_sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        invalid_sig = "sha256=invalid_signature_hash"

        self.assertTrue(connector.verify_webhook_signature(payload_bytes, valid_sig, secret))
        self.assertFalse(connector.verify_webhook_signature(payload_bytes, invalid_sig, secret))

    def test_pipeline_deduplication(self):
        raw_payload = {
            "event_id": "meta_evt_001",
            "organization_id": "org_1",
            "project_id": "proj_1",
            "entry": [{"changes": [{"value": {"campaign_id": "cmp_100", "impressions": 500, "clicks": 25, "conversions": 2, "spend": 40.0}}]}]
        }
        secret = "secret"
        payload_bytes = b"dummy"

        connector = MetaTelemetryConnector()
        sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()

        res1, status1 = process_telemetry_webhook("meta", raw_payload, payload_bytes, sig, secret, feature_flag_override=True)
        self.assertEqual(status1, "PROCESSED")

        res2, status2 = process_telemetry_webhook("meta", raw_payload, payload_bytes, sig, secret, feature_flag_override=True)
        self.assertEqual(status2, "DUPLICATE")
        self.assertEqual(res2["status"], "dropped")

    def test_pipeline_feature_flag_disabled(self):
        raw_payload = {"event_id": "evt_test"}
        res, status = process_telemetry_webhook("meta", raw_payload, b"bytes", "sig", "secret", feature_flag_override=False)
        self.assertEqual(status, "SKIPPED")
        self.assertEqual(res["reason"], "feature_flag_disabled")


if __name__ == "__main__":
    unittest.main()
