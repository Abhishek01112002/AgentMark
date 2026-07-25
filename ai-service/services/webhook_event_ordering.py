"""
Webhook Event Timestamp Ordering Service — AgentMark AI Pre-Flight Engine

Guarantees data integrity under out-of-order webhook delivery from ad platforms
by enforcing monotonic GREATEST timestamp ordering rules for telemetry updates.
"""

from datetime import datetime
from typing import Dict, Any, Tuple


def apply_monotonic_event_update(
    existing_snapshot: Dict[str, Any] | None,
    incoming_event: Dict[str, Any]
) -> Tuple[Dict[str, Any], bool]:
    """
    Applies incoming telemetry update only if incoming timestamp is newer or equal to existing record.
    Returns updated snapshot dictionary and boolean flag indicating whether record was updated.
    """
    if not existing_snapshot:
        return incoming_event, True

    existing_time = existing_snapshot.get("event_timestamp")
    incoming_time = incoming_event.get("event_timestamp")

    if isinstance(existing_time, str):
        existing_time = datetime.fromisoformat(existing_time)
    if isinstance(incoming_time, str):
        incoming_time = datetime.fromisoformat(incoming_time)

    # Reject out-of-order stale events
    if existing_time and incoming_time and incoming_time < existing_time:
        return existing_snapshot, False

    # Apply valid monotonic update
    merged = existing_snapshot.copy()
    merged.update(incoming_event)
    merged["event_timestamp"] = max(existing_time, incoming_time) if existing_time and incoming_time else (incoming_time or existing_time)
    return merged, True
