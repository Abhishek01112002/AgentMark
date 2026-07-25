"""
Google Ads Telemetry Connector — AgentMark AI Pre-Flight Engine
"""

from typing import Dict, Any
from datetime import datetime, timezone
from services.telemetry_connectors.base import BaseTelemetryConnector
from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent


class GoogleTelemetryConnector(BaseTelemetryConnector):
    """Google Ads API v17 Telemetry Connector."""

    @property
    def platform_name(self) -> str:
        return "google"

    def verify_webhook_signature(self, payload_bytes: bytes, signature: str, secret: str) -> bool:
        """Verifies Google Ads webhook token header."""
        return signature == secret if signature and secret else False

    def parse_webhook_payload(self, raw_payload: Dict[str, Any]) -> NormalizedPerformanceEvent:
        """Parses Google Ads webhook payload into canonical event format."""
        impressions = int(raw_payload.get("metrics", {}).get("impressions", 0))
        clicks = int(raw_payload.get("metrics", {}).get("clicks", 0))
        conversions = int(raw_payload.get("metrics", {}).get("conversions", 0))
        spend = float(raw_payload.get("metrics", {}).get("costMicros", 0)) / 1_000_000.0

        ctr = round(clicks / impressions, 4) if impressions > 0 else 0.0
        cvr = round(conversions / clicks, 4) if clicks > 0 else 0.0

        metrics = CanonicalAdMetrics(
            platform="google",
            campaign_id=str(raw_payload.get("campaign_id", "unknown")),
            impressions=impressions,
            clicks=clicks,
            conversions=conversions,
            spend_usd=spend,
            observed_ctr=ctr,
            observed_cvr=cvr
        )

        return NormalizedPerformanceEvent(
            event_id=str(raw_payload.get("event_id", f"google_{raw_payload.get('campaign_id', 'evt')}_{int(datetime.now(timezone.utc).timestamp())}")),
            organization_id=str(raw_payload.get("organization_id", "org_default")),
            project_id=str(raw_payload.get("project_id", "proj_default")),
            campaign_id=metrics.campaign_id,
            platform="google",
            metrics=metrics,
            event_timestamp=datetime.now(timezone.utc)
        )
