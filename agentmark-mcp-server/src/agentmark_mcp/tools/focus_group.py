"""
focus_group.py — run_focus_group Tool Implementation

Simulates how the campaign's target audience would react to the generated copy
by proxying a request to POST /api/focus-group/simulate on the Express backend,
which in turn calls the Python AI service.

Auto-extraction flow (when copy_text is not supplied):
  1. Fetch the campaign via GET /api/campaigns/:id  (unwrapped by get_campaign())
  2. Parse aiOutputs.copy_output.copies to build a structured copy string
  3. Build campaign_context from campaign metadata for persona calibration
  4. POST to /api/focus-group/simulate with extracted copy + context
  5. Format the FocusGroupReport into Markdown via fg_formatter

The backend proxy has a 90-second timeout to the AI service (focus-group.routes.ts).
Progress is emitted via on_progress callback to give the host client a heartbeat
during that wait window.
"""

import json
import logging
import re
from typing import Any, Callable, Dict, Optional
import unicodedata

from ..client import AgentMarkClient
from ..formatters.fg_formatter import format_focus_group_report

logger = logging.getLogger("agentmark-mcp-server")


async def run_focus_group_impl(
    client: AgentMarkClient,
    campaign_id: str,
    copy_text: Optional[str] = None,
    negativity_bias: float = 0.3,
    on_progress: Optional[Callable[[str], None]] = None,
) -> str:
    """
    Execute a synthetic focus group simulation for the given campaign.

    Args:
        client:          Shared AgentMarkClient instance from the server lifespan.
        campaign_id:     UUID of the campaign to evaluate.
        copy_text:       Optional explicit copy text to test. When omitted, the
                         function auto-extracts all channel copy from the campaign's
                         aiOutputs and concatenates them into a structured string.
        negativity_bias: Score weighting toward the worst persona score.
                         0.0 = pure average. 1.0 = pure minimum. Default 0.3.
        on_progress:     Optional callback invoked with status strings during the
                         wait. Prepares for future FastMCP streaming support.
    """
    # ── 1. Fetch campaign details ─────────────────────────────────────────────
    logger.info("Fetching campaign details for focus group | campaign=%s", campaign_id)
    try:
        campaign = await client.get_campaign(campaign_id)
    except Exception as exc:
        logger.error("Failed to fetch campaign for focus group | campaign=%s | error=%s", campaign_id, exc)
        raise RuntimeError(
            "Could not retrieve campaign '%s' for focus group simulation: %s" % (campaign_id, exc)
        ) from exc

    brand_name = campaign.get("brandName") or campaign.get("brand_name") or "Unnamed Brand"
    industry = campaign.get("industry") or "Unknown"
    primary_goal = campaign.get("primaryGoal") or "Unknown"
    target_audience = campaign.get("targetAudience") or "Unknown"

    campaign_context: Dict[str, Any] = {
        "brand_name": brand_name,
        "brand": brand_name,
        "industry": industry,
        "goal": primary_goal,
        "target_audience": target_audience,
        "audience": target_audience,
    }

    # ── 2. Auto-extract copy if not explicitly provided ───────────────────────
    if not copy_text:
        logger.info(
            "No copy_text provided — extracting from campaign aiOutputs | campaign=%s",
            campaign_id,
        )
        ai_outputs: Any = campaign.get("aiOutputs") or {}
        if isinstance(ai_outputs, str):
            try:
                ai_outputs = json.loads(ai_outputs)
            except (json.JSONDecodeError, ValueError) as exc:
                logger.error(
                    "Failed to parse stringified aiOutputs for campaign %s: %s",
                    campaign_id,
                    exc,
                )
                ai_outputs = {}

        # Support both key conventions used across the codebase
        copywriter: Dict[str, Any] = (
            ai_outputs.get("copy_output") or ai_outputs.get("copywriter") or {}
        )
        if isinstance(copywriter, str):
            try:
                copywriter = json.loads(copywriter)
            except (json.JSONDecodeError, ValueError):
                copywriter = {}

        # Construct channels set maintaining frontend insertion order
        channels = []
        seen = set()

        def add_channel(ch: str):
            if not isinstance(ch, str):
                return
            ch_low = ch.lower().strip()
            if ch_low and ch_low not in seen:
                if ch_low not in ('copies', 'messaging_framework', 'strategic_alignment', 'copy_readiness'):
                    seen.add(ch_low)
                    channels.append(ch_low)

        # 1. Add channels from manager_output
        manager_output = ai_outputs.get("manager_output") or {}
        if isinstance(manager_output, str):
            try:
                manager_output = json.loads(manager_output)
            except Exception:
                manager_output = {}
        for ch in manager_output.get("channels", []):
            add_channel(ch)

        # 2. Add channels from copywriter (legacy copies)
        copywriter = ai_outputs.get("copy_output") or ai_outputs.get("copywriter") or {}
        if isinstance(copywriter, str):
            try:
                copywriter = json.loads(copywriter)
            except Exception:
                copywriter = {}

        flat_copy_data = copywriter.copy()
        if isinstance(copywriter.get("copies"), dict):
            flat_copy_data.update(copywriter["copies"])

        for key in flat_copy_data.keys():
            if isinstance(flat_copy_data[key], dict):
                add_channel(key)

        # 3. Add channels from copy_variants
        copy_variants = ai_outputs.get("copy_variants") or {}
        if isinstance(copy_variants, str):
            try:
                copy_variants = json.loads(copy_variants)
            except Exception:
                copy_variants = {}
        for key, val in copy_variants.items():
            if isinstance(val, list) and len(val) > 0:
                add_channel(key)

        # Build champion texts exactly matching CampaignResultPage.tsx
        champion_texts = []
        for channel in channels:
            variants = copy_variants.get(channel) or copy_variants.get(channel.upper()) or []
            champion = None
            if isinstance(variants, list) and len(variants) > 0:
                for v in variants:
                    if isinstance(v, dict) and (v.get("isChampion") or v.get("is_champion")):
                        champion = v
                        break
                if not champion and isinstance(variants[0], dict):
                    champion = variants[0]

            if champion:
                headline = champion.get("headline") or champion.get("subject") or ""
                body = champion.get("body_copy") or champion.get("body") or ""
                champion_texts.append(f"[{channel.upper()}] Headline: {headline}\nBody: {body}")
            else:
                legacy_copy = flat_copy_data.get(channel) or flat_copy_data.get(channel.upper())
                if isinstance(legacy_copy, dict):
                    headline = legacy_copy.get("headline") or legacy_copy.get("subject") or ""
                    body = legacy_copy.get("body") or legacy_copy.get("body_copy") or legacy_copy.get("caption") or ""
                    champion_texts.append(f"[{channel.upper()}] Headline: {headline}\nBody: {body}")

        if not champion_texts:
            raise ValueError(
                "No generated copy found in campaign '%s'. "
                "Please generate the campaign first (run generate_campaign), "
                "or supply copy_text explicitly." % campaign_id
            )

        copy_text = "\n\n".join(champion_texts)

    # ── 3. Normalize Unicode to NFC and newlines to Unix style before payload send ─
    copy_text = unicodedata.normalize('NFC', copy_text)
    copy_text = copy_text.replace('\r\n', '\n').replace('\r', '\n')
    # Log channel count only if we extracted copy automatically (champion_texts built above)
    channel_count = len(champion_texts) if 'champion_texts' in dir() else 'N/A (caller-supplied)'
    logger.info(
        "Extracted copy from %s channels for campaign %s",
        channel_count,
        campaign_id,
    )

    # ── 3. Emit pre-simulation progress ───────────────────────────────────────
    if on_progress:
        on_progress(
            "[AgentMark] [Focus Group] Simulating audience reaction — "
            "this typically takes 30–90 seconds..."
        )

    # ── 4. POST to the backend simulate endpoint ──────────────────────────────
    payload: Dict[str, Any] = {
        "campaign_id": campaign_id,
        "copy_text": copy_text[:4000],  # Safety cap below the 5000-char validator limit
        "campaign_context": campaign_context,
        "negativity_bias": negativity_bias,
    }

    logger.info(
        "Triggering focus group simulation | campaign=%s | copy_chars=%d | bias=%.2f",
        campaign_id,
        len(payload["copy_text"]),
        negativity_bias,
    )

    try:
        simulation_response = await client.post("/api/focus-group/simulate", payload)
    except Exception as exc:
        logger.error(
            "Focus group simulation POST failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Focus group simulation failed for campaign '%s': %s" % (campaign_id, exc)
        ) from exc

    if not isinstance(simulation_response, dict):
        raise RuntimeError(
            "Focus group simulation returned an unexpected response type (%s) for campaign '%s'. "
            "Expected a JSON object."
            % (type(simulation_response).__name__, campaign_id)
        )

    logger.info("Focus group simulation complete | campaign=%s", campaign_id)

    if on_progress:
        overall = simulation_response.get("overall_score", "N/A")
        on_progress("[AgentMark] [Focus Group] Simulation complete. Overall score: %s/100" % overall)

    # ── 5. Format and return ──────────────────────────────────────────────────
    try:
        return format_focus_group_report(simulation_response)
    except Exception as exc:
        logger.error(
            "Failed to format focus group report | campaign=%s | error=%s", campaign_id, exc
        )
        # Return raw score summary instead of losing the result entirely
        overall = simulation_response.get("overall_score", "N/A")
        return (
            f"# Focus Group Simulation Complete\n\n"
            f"**Campaign ID:** `{campaign_id}`\n"
            f"**Overall Score:** {overall}/100\n\n"
            f"Full report formatting failed ({exc}). Raw result is saved to the campaign record."
        )
