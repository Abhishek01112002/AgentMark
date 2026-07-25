"""
LinkedIn Ads Telemetry Connector — AgentMark AI Pre-Flight Engine
"""

from typing import Dict, Any
from datetime import datetime
from services.telemetry_connectors.base import BaseTelemetryConnector
from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent


class LinkedInTelemetryConnector(BaseTelemetryConnector):
    """LinkedIn Marketing API Telemetry Connector."""

    @property
    def platform_name(self) -> str:
        return "linkedin"

    def verify_webhook_signature(self, payload_bytes: bytes, signature: str, secret: str) -> bool:
        """Verifies LinkedIn Ads webhook token."""
        return signature == secret if signature and secret else False

    def parse_webhook_payload(self, raw_payload: Dict[str, Any]) -> NormalizedPerformanceEvent:
        """Parses LinkedIn Marketing webhook payload into canonical format."""
        impressions = int(raw_payload.get("impressions", 0))
        clicks = int(raw_payload.get("clicks", 0))
        conversions = int(raw_payload.get("externalWebsiteConversions", 0))
        spend = float(raw_payload.get("costInLocalCurrency", 0.0))

        ctr = round(clicks / impressions, 4) if impressions > 0 else 0.0
        cvr = round(conversions / clicks, 4) if clicks > 0 else 0.0

        metrics = CanonicalAdMetrics(
            platform="linkedin",
            campaign_id=str(raw_payload.get("campaign", "unknown")),
            impressions=impressions,
            clicks=clicks,
            conversions=conversions,
            spend_usd=spend,
            observed_ctr=ctr,
            observed_cvr=cvr
        )

        return NormalizedPerformanceEvent(
            event_id=str(raw_payload.get("event_id", f"linkedin_{raw_payload.get('campaign', 'evt')}_{int(datetime.utcnow().timestamp())}")),
            organization_id=str(raw_payload.get("organization_id", "org_default")),
            project_id=str(raw_payload.get("project_id", "proj_default")),
            campaign_id=metrics.campaign_id,
            platform="linkedin",
            metrics=metrics,
            event_timestamp=datetime.utcnow()
        )
