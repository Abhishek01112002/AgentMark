"""
publish.py — publish_to_channel Tool Implementation

Approves a campaign that has reached the 'awaiting_human_approval' gate and
triggers the Publisher agent workflow, then polls until the publisher finishes.

Flow:
  1. POST /api/campaigns/:id/approve  { action: "approve" }
     Backend immediately sets status → "processing" and fires the Publisher
     agent in the background (fire-and-forget via runAIWorkflowBackground).
     Response: { message: str, campaign: {...} }  (L409, campaign.controller.ts)

  2. Poll GET /api/campaigns/:id every POLL_INTERVAL_SECS seconds until:
       "completed"           → extract publisher_output, format report, return
       "failed"/"error"/     → raise RuntimeError with aiError details
       "cancelled"
       PUBLISH_TIMEOUT_SECS  → raise TimeoutError with dashboard URL

  3. Format the PublisherOutput into a structured Markdown report via
     publisher_formatter.format_publisher_report().

All logger calls use %-style lazy formatting — the string is never built
unless the log level is active (Python logging best practice).
"""

import asyncio
import json
import logging
import os
from typing import Any, Callable, Dict, Optional

from ..client import AgentMarkClient
from ..config import POLL_INTERVAL_SECS, PUBLISH_TIMEOUT_SECS
from ..formatters.publisher_formatter import format_publisher_report

logger = logging.getLogger("agentmark-mcp-server")


async def publish_to_channel_impl(
    client: AgentMarkClient,
    campaign_id: str,
    openai_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
    on_progress: Optional[Callable[[str], None]] = None,
) -> str:
    """
    Submit campaign approval and poll until the Publisher agent completes.

    Args:
        client:          Shared AgentMarkClient instance from the server lifespan.
        campaign_id:     UUID of the campaign to approve and publish.
        openai_api_key:  Optional LLM key override forwarded to the backend via
                         x-llm-config header (same pattern as generate_campaign).
        gemini_api_key:  Optional Gemini key override.
        groq_api_key:    Optional Groq key override.
        on_progress:     Optional callable for progress updates. Wired for future
                         FastMCP streaming support — currently bridges to logger.info.
    """
    # ── 1. Build optional LLM config header (mirrors generate_campaign pattern) ─
    llm_config: Dict[str, str] = {}

    op_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
    if op_key:
        llm_config["openai_api_key"] = op_key

    gem_key = gemini_api_key or os.environ.get("GEMINI_API_KEY")
    if gem_key:
        llm_config["gemini_api_key"] = gem_key

    groq_key = groq_api_key or os.environ.get("GROQ_API_KEY")
    if groq_key:
        llm_config["groq_api_key"] = groq_key

    extra_headers: Dict[str, str] = {}
    if llm_config:
        extra_headers["x-llm-config"] = json.dumps(llm_config)

    # ── 2. Submit the approval ────────────────────────────────────────────────
    logger.info("Submitting campaign approval | campaign=%s", campaign_id)

    try:
        await client.post(
            f"/api/campaigns/{campaign_id}/approve",
            {"action": "approve"},
            extra_headers=extra_headers if extra_headers else None,
        )
    except Exception as exc:
        logger.error(
            "Campaign approval submission failed | campaign=%s | error=%s",
            campaign_id,
            exc,
        )
        raise RuntimeError(
            "Failed to submit campaign approval for campaign '%s'. "
            "Ensure the campaign is in 'awaiting_human_approval' status "
            "before calling publish_to_channel. Error: %s" % (campaign_id, exc)
        ) from exc

    logger.info(
        "Approval submitted — Publisher agent started | campaign=%s", campaign_id
    )

    if on_progress:
        on_progress(
            "[AgentMark] [Publisher] Approval submitted. Publisher agent is "
            "assembling your distribution plan — this typically takes 2–5 minutes..."
        )

    # ── 3. Poll until the publisher workflow completes ────────────────────────
    max_attempts = max(1, PUBLISH_TIMEOUT_SECS // POLL_INTERVAL_SECS)
    consecutive_failures: int = 0
    elapsed_secs: float = 0.0

    for attempt in range(max_attempts):
        await asyncio.sleep(POLL_INTERVAL_SECS)
        elapsed_secs += POLL_INTERVAL_SECS

        logger.info(
            "Polling publisher status | campaign=%s | attempt=%d/%d | elapsed=%.0fs",
            campaign_id,
            attempt + 1,
            max_attempts,
            elapsed_secs,
        )

        # ── Fault-tolerant status fetch ────────────────────────────────────
        try:
            campaign = await client.get_campaign(campaign_id)
            consecutive_failures = 0  # Reset streak on success
        except Exception as exc:
            consecutive_failures += 1
            logger.warning(
                "Transient status check failure (%d/5) | campaign=%s | error=%s",
                consecutive_failures,
                campaign_id,
                exc,
            )
            if consecutive_failures >= 5:
                logger.error(
                    "Unrecoverable connection loss polling campaign %s after 5 "
                    "consecutive failures",
                    campaign_id,
                )
                raise RuntimeError(
                    "Lost connection to AgentMark API while waiting for campaign "
                    "'%s' publisher to complete. The publisher may still be running "
                    "in the background — check your dashboard at: "
                    "/campaign/%s/result" % (campaign_id, campaign_id)
                ) from exc
            continue

        status = campaign.get("status", "processing").lower()

        # ── Terminal: success ──────────────────────────────────────────────
        if status == "completed":
            logger.info(
                "Publisher workflow completed | campaign=%s | elapsed=%.0fs",
                campaign_id,
                elapsed_secs,
            )

            ai_outputs: Any = campaign.get("aiOutputs") or {}
            if isinstance(ai_outputs, str):
                try:
                    ai_outputs = json.loads(ai_outputs)
                except (json.JSONDecodeError, ValueError):
                    logger.warning(
                        "Failed to parse stringified aiOutputs for campaign %s",
                        campaign_id,
                    )
                    ai_outputs = {}

            # Support both key conventions (publisher_output is canonical)
            publisher_output: Dict[str, Any] = (
                ai_outputs.get("publisher_output")
                or ai_outputs.get("publisher")
                or {}
            )

            if on_progress:
                on_progress("[AgentMark] [Publisher] Distribution plan assembled.")

            return format_publisher_report(publisher_output, campaign_id)

        # ── Terminal: failure ──────────────────────────────────────────────
        if status in ("failed", "error", "cancelled"):
            error_msg = (
                campaign.get("aiError")
                or campaign.get("error")
                or "Publisher agent execution failed"
            )
            logger.error(
                "Publisher workflow ended with terminal status | campaign=%s | "
                "status=%s | error=%s",
                campaign_id,
                status,
                error_msg,
            )
            raise RuntimeError(
                "Publisher execution terminated with status '%s' for campaign '%s'. "
                "Error: %s" % (status, campaign_id, error_msg)
            )

        # ── Still processing ───────────────────────────────────────────────
        logger.debug(
            "Publisher still processing | campaign=%s | status=%s", campaign_id, status
        )

    # ── Timeout ───────────────────────────────────────────────────────────────
    raise TimeoutError(
        "Publisher workflow for campaign '%s' did not complete within %d seconds. "
        "The publisher agent may still be running in the background. "
        "Check your dashboard at: /campaign/%s/result"
        % (campaign_id, PUBLISH_TIMEOUT_SECS, campaign_id)
    )
