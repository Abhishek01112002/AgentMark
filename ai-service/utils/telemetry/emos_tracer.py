"""
EMOS Phase 5 Operations: Telemetry & Tracing Instrumentation (Python AI Service)
Propagates trace_id, span_id, campaign_id, tenant_id, evidence_id across agent workflows.
"""

import uuid
import json
import datetime
import logging

logger = logging.getLogger("emos_telemetry")


class TelemetryContext:
    def __init__(self, campaign_id: str = None, tenant_id: str = None, project_id: str = None):
        self.trace_id = f"tr_{uuid.uuid4().hex[:16]}"
        self.span_id = f"sp_{uuid.uuid4().hex[:12]}"
        self.campaign_id = campaign_id
        self.tenant_id = tenant_id
        self.project_id = project_id
        self.evidence_id = f"ev_{uuid.uuid4().hex[:12]}"

    def to_dict(self) -> dict:
        return {
            "trace_id": self.trace_id,
            "span_id": self.span_id,
            "campaign_id": self.campaign_id,
            "tenant_id": self.tenant_id,
            "project_id": self.project_id,
            "evidence_id": self.evidence_id
        }


def log_component_audit(
    component: str,
    action: str,
    context: TelemetryContext,
    metadata: dict = None
):
    """
    Emits structured audit log entry across EMOS components.
    """
    entry = {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "component": component,
        "action": action,
        "trace_id": context.trace_id,
        "span_id": context.span_id,
        "campaign_id": context.campaign_id,
        "tenant_id": context.tenant_id,
        "evidence_id": context.evidence_id,
        "metadata": metadata or {}
    }
    logger.info("[EMOS TelemetryAudit] %s", json.dumps(entry))
    return entry
