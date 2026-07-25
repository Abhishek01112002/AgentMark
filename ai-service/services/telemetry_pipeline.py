"""
Telemetry Event Processing Pipeline — AgentMark AI Pre-Flight Engine (Phase 2A)

Handles validation, deduplication, timestamp monotonicity ordering, and normalized persistence.
Feature-flagged behind ENABLE_AD_PERFORMANCE_INGESTION.
"""

import os
import logging
from typing import Dict, Any, Tuple
from domain.telemetry import NormalizedPerformanceEvent
from services.telemetry_connectors.base import BaseTelemetryConnector
from services.telemetry_connectors.meta_connector import MetaTelemetryConnector
from services.telemetry_connectors.google_connector import GoogleTelemetryConnector
from services.telemetry_connectors.linkedin_connector import LinkedInTelemetryConnector
from services.webhook_event_ordering import apply_monotonic_event_update

logger = logging.getLogger("agentmark.telemetry_pipeline")

# Feature Flag Default
ENABLE_AD_PERFORMANCE_INGESTION = os.getenv("ENABLE_AD_PERFORMANCE_INGESTION", "false").lower() in ("true", "1")

# Registry of active platform connectors
_CONNECTORS: Dict[str, BaseTelemetryConnector] = {
    "meta": MetaTelemetryConnector(),
    "google": GoogleTelemetryConnector(),
    "linkedin": LinkedInTelemetryConnector()
}

_PROCESSED_EVENT_IDS = set()
_PERFORMANCE_SNAPSHOT_STORE: Dict[str, Dict[str, Any]] = {}


def register_connector(platform: str, connector: BaseTelemetryConnector) -> None:
    """Registers a new provider connector dynamically."""
    _CONNECTORS[platform] = connector


def process_telemetry_webhook(
    platform: str,
    raw_payload: Dict[str, Any],
    payload_bytes: bytes,
    signature: str,
    secret: str,
    feature_flag_override: bool | None = None
) -> Tuple[Dict[str, Any], str]:
    """
    Ingestion pipeline: Validation -> Signature Verification -> Deduplication -> Ordering -> Normalization.
    """
    is_enabled = feature_flag_override if feature_flag_override is not None else ENABLE_AD_PERFORMANCE_INGESTION
    if not is_enabled:
        logger.info("Ad performance telemetry ingestion disabled by feature flag ENABLE_AD_PERFORMANCE_INGESTION.")
        return {"status": "skipped", "reason": "feature_flag_disabled"}, "SKIPPED"

    connector = _CONNECTORS.get(platform.lower())
    if not connector:
        return {"status": "error", "reason": f"Unsupported platform: {platform}"}, "UNSUPPORTED_PLATFORM"

    # Step 1: Signature Verification
    if secret and not connector.verify_webhook_signature(payload_bytes, signature, secret):
        logger.warning(f"Invalid webhook signature for platform: {platform}")
        return {"status": "rejected", "reason": "invalid_signature"}, "INVALID_SIGNATURE"

    # Step 2: Parse to Canonical Event
    try:
        event: NormalizedPerformanceEvent = connector.parse_webhook_payload(raw_payload)
    except Exception as exc:
        logger.error(f"Failed to parse webhook payload for {platform}: {exc}")
        return {"status": "error", "reason": "payload_parse_failure"}, "PARSE_ERROR"

    # Step 3: Deduplication check
    if event.event_id in _PROCESSED_EVENT_IDS:
        logger.info(f"Duplicate telemetry event detected and dropped: {event.event_id}")
        return {"status": "dropped", "reason": "duplicate_event_id"}, "DUPLICATE"

    # Step 4: Monotonic Timestamp Ordering
    snapshot_key = f"{event.platform}::{event.campaign_id}"
    existing_snapshot = _PERFORMANCE_SNAPSHOT_STORE.get(snapshot_key)

    incoming_dict = {
        "platform": event.platform,
        "campaign_id": event.campaign_id,
        "impressions": event.metrics.impressions,
        "clicks": event.metrics.clicks,
        "conversions": event.metrics.conversions,
        "spend_usd": event.metrics.spend_usd,
        "observed_ctr": event.metrics.observed_ctr,
        "observed_cvr": event.metrics.observed_cvr,
        "event_timestamp": event.event_timestamp
    }

    updated_snapshot, is_updated = apply_monotonic_event_update(existing_snapshot, incoming_dict)

    if not is_updated:
        logger.info(f"Out-of-order stale event skipped for snapshot {snapshot_key}")
        _PROCESSED_EVENT_IDS.add(event.event_id)
        return {"status": "skipped", "reason": "out_of_order_stale"}, "STALE_SKIPPED"

    # Step 5: Store Snapshot
    _PERFORMANCE_SNAPSHOT_STORE[snapshot_key] = updated_snapshot
    _PROCESSED_EVENT_IDS.add(event.event_id)

    return {"status": "success", "snapshot": updated_snapshot}, "PROCESSED"


def clear_telemetry_pipeline_cache() -> None:
    """Clears pipeline state for tests."""
    _PROCESSED_EVENT_IDS.clear()
    _PERFORMANCE_SNAPSHOT_STORE.clear()
