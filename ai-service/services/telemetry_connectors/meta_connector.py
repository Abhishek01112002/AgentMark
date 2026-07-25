"""
Meta Ads Telemetry Connector — AgentMark AI Pre-Flight Engine
"""

import hmac
import hashlib
from typing import Dict, Any
from datetime import datetime
from services.telemetry_connectors.base import BaseTelemetryConnector
from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent


class MetaTelemetryConnector(BaseTelemetryConnector):
    """Meta Ads (Facebook / Instagram) Graph API v20.0 Telemetry Connector."""

    @property
    def platform_name(self) -> str:
        return "meta"

    def verify_webhook_signature(self, payload_bytes: bytes, signature: str, secret: str) -> bool:
        """Verifies sha256= signature from Meta Graph API webhooks."""
        if not signature or not secret:
            return False
        expected_prefix = "sha256="
        if signature.startswith(expected_prefix):
            signature = signature[len(expected_prefix):]

        computed_hmac = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return hmac.compare_digest(computed_hmac.lower(), signature.lower())

    def parse_webhook_payload(self, raw_payload: Dict[str, Any]) -> NormalizedPerformanceEvent:
        """Parses Meta Graph API webhook JSON into canonical format."""
        entry = raw_payload.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})

        impressions = int(value.get("impressions", 0))
        clicks = int(value.get("clicks", 0))
        conversions = int(value.get("conversions", 0))
        spend = float(value.get("spend", 0.0))

        ctr = round(clicks / impressions, 4) if impressions > 0 else 0.0
        cvr = round(conversions / clicks, 4) if clicks > 0 else 0.0

        metrics = CanonicalAdMetrics(
            platform="meta",
            campaign_id=str(value.get("campaign_id", "unknown")),
            external_ad_id=str(value.get("ad_id", "")) if value.get("ad_id") else None,
            impressions=impressions,
            clicks=clicks,
            conversions=conversions,
            spend_usd=spend,
            observed_ctr=ctr,
            observed_cvr=cvr
        )

        return NormalizedPerformanceEvent(
            event_id=str(raw_payload.get("event_id", f"meta_{entry.get('id', 'evt')}_{int(datetime.utcnow().timestamp())}")),
            organization_id=str(raw_payload.get("organization_id", "org_default")),
            project_id=str(raw_payload.get("project_id", "proj_default")),
            campaign_id=metrics.campaign_id,
            platform="meta",
            metrics=metrics,
            event_timestamp=datetime.utcnow()
        )
