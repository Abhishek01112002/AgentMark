"""
Redis Publisher Utility — AgentMark AI Service

Publishes Pub/Sub events to a Redis channel after each LangGraph agent completes.
The Express backend subscribes and forwards these events to React via WebSocket
for real-time live status updates.

Channel format:  campaign:{campaign_id}

Design decisions:
- Module-level connection pool (initialized once, reused across all publishes).
- Non-fatal: any Redis error is logged as a warning and the workflow continues.
  Never crash the LangGraph pipeline because Redis is unavailable.
"""

import json
import logging
import time
from typing import Optional, Any

import redis

from config.settings import REDIS_HOST, REDIS_PORT, REDIS_DB

logger = logging.getLogger("agentmark.redis_publisher")

# ── Module-level connection pool ──────────────────────────────────────────────
# Initialized once on first use, reused for all subsequent publish calls.
# This avoids opening a new TCP connection on every agent completion event.
_pool: Optional[redis.ConnectionPool] = None


def _get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            max_connections=10,
            decode_responses=True,
            socket_connect_timeout=5,  # 5s connection timeout
            socket_timeout=5,           # 5s read/write timeout
            retry_on_timeout=True,
        )
    return _pool


# ── Public API ────────────────────────────────────────────────────────────────

def publish_agent_event(
    campaign_id: Optional[str],
    agent: str,
    status: str,
    error: Optional[str] = None,
    extra: Optional[dict] = None,
) -> None:
    """
    Publish a single agent status event to the Redis channel for this campaign.

    Args:
        campaign_id: The campaign UUID (PostgreSQL DB id, passed from Express).
                     If None or empty, the publish is silently skipped — this allows
                     the graph to run in test/script contexts without a Redis server.
        agent:       Agent name matching the frontend display names.
                     Values: "manager" | "research" | "strategy" | "copywriter"
                             | "image_prompt" | "reviewer" | "publisher" | "system"
        status:      Event status string.
                     Progress events:  "completed" | "running" | "failed"
                     Terminal events:  "campaign_complete" | "awaiting_human_approval"
        error:       Optional error message. Set when status == "failed".
        extra:       Optional dict of additional fields merged into the payload.
                     Used for the terminal "campaign_complete" event to include
                     full agent outputs so Express can persist them to PostgreSQL.

    Redis payload schema:
        {
            "campaign_id": "<uuid>",
            "agent":       "<agent_name>",
            "status":      "<status_string>",
            "error":       null | "<error message>",
            "timestamp":   "2026-06-23T09:00:00Z",
            ...extra fields (e.g. "outputs" for campaign_complete)
        }
    """
    if not campaign_id:
        return  # Silently skip — test/script context with no DB campaign.

    channel = f"campaign:{campaign_id}"

    payload: dict[str, Any] = {
        "campaign_id": campaign_id,
        "agent": agent,
        "status": status,
        "error": error,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    if extra:
        payload.update(extra)

    message = json.dumps(payload)
    if len(message) > 500_000:  # 500KB hard cap
        logger.warning("Redis payload too large (%d bytes) — truncating outputs", len(message))
        payload.pop("outputs", None)
        message = json.dumps(payload)

    try:
        r = redis.Redis(connection_pool=_get_pool(), decode_responses=True)
        subscribers_count = r.publish(channel, message)
        logger.debug(
            "Redis publish | channel=%s | agent=%s | status=%s | subscribers=%d",
            channel,
            agent,
            status,
            subscribers_count,
        )
    except Exception as exc:
        # Non-fatal: log and continue. The LangGraph workflow must not fail
        # because Redis is temporarily unavailable or misconfigured.
        logger.warning(
            "Redis publish failed (non-fatal) | channel=%s | agent=%s | error=%s",
            channel,
            agent,
            exc,
        )
