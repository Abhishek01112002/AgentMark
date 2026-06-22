"""
Health Check Route

GET /health  -  Returns service status and version information.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter

logger = logging.getLogger("agentmark.health")
router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service health check")
def health_check():
    """
    Returns service status, version, and UTC timestamp.

    Use this endpoint to confirm the AI service is up before sending
    campaign requests. Expected response: `{"status": "ok", ...}`.
    """
    return {
        "status": "ok",
        "service": "AgentMark AI Service",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }