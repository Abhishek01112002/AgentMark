"""
revision.py — revise_copy_with_feedback and get_campaign_status Tool Implementations

revise_copy_with_feedback:
  1. Snapshots the current copy as a version (POST /api/campaigns/:id/copy-versions)
  2. Triggers copywriter re-run via HITL reject
     (POST /api/campaigns/:id/approve with action=reject, revisionTarget=copywriter)
  3. Polls until the campaign reaches awaiting_human_approval or completed status
  4. AUTOMATICALLY runs a focus group simulation on the new copy (user decision: automatic)
  5. Returns a combined result showing: new copy summary + focus group score comparison

get_campaign_status:
  Simple status check that returns current campaign status, scores, and
  a summary of copy versions if available.
"""

import asyncio
import json
import logging
from typing import Any, Callable, Dict, Optional

from ..client import AgentMarkClient
from ..config import POLL_INTERVAL_SECS, REVISION_TIMEOUT_SECS
from .focus_group import run_focus_group_impl

logger = logging.getLogger("agentmark-mcp-server")


def _parse_ai_outputs(campaign: Dict[str, Any]) -> Dict[str, Any]:
    """Safely parse aiOutputs from a campaign dict (handles str or dict)."""
    ai_outputs: Any = campaign.get("aiOutputs") or {}
    if isinstance(ai_outputs, str):
        try:
            ai_outputs = json.loads(ai_outputs)
        except Exception:
            ai_outputs = {}
    return ai_outputs


def _sanitize_md(text: str) -> str:
    """Escape pipe characters to prevent Markdown table breakage."""
    return text.replace("|", "\\|")


async def revise_copy_with_feedback_impl(
    client: AgentMarkClient,
    campaign_id: str,
    feedback: str,
    on_progress: Optional[Callable[[str], None]] = None,
) -> str:
    """
    Revise campaign copy using focus group or manual feedback, then automatically
    re-run the focus group simulation on the revised copy to measure improvement.

    Flow:
        1. Snapshot current copy as a version (max 5 versions stored)
        2. Trigger copywriter agent re-run with feedback injected
        3. Poll until revision completes
        4. Auto-run focus group on new copy
        5. Return combined result with score comparison

    Args:
        client:      Shared AgentMarkClient.
        campaign_id: UUID of the campaign to revise.
        feedback:    Feedback for the copywriter (e.g., focus group actionable recommendations).
        on_progress: Optional progress callback.
    """
    if on_progress:
        on_progress("[AgentMark] [Revision] Snapshotting current copy as Version history...")

    # ── 1. Snapshot current copy before revision ──────────────────────────────
    try:
        snapshot_response = await client.post(
            f"/api/campaigns/{campaign_id}/copy-versions",
            {"feedbackUsed": feedback[:500]}  # Store what feedback triggered this revision
        )
        version_before = snapshot_response.get("version", "?")
        total_before = snapshot_response.get("totalVersions", "?")
        logger.info(
            "Copy snapshot saved | campaign=%s | version=%s | total=%s",
            campaign_id, version_before, total_before
        )
        if on_progress:
            on_progress(
                f"[AgentMark] [Revision] Copy Version {version_before} saved. "
                f"({total_before}/5 versions stored)"
            )
    except Exception as exc:
        logger.warning("Failed to snapshot copy version (non-fatal): %s", exc)
        # Non-fatal — continue with revision even if snapshot fails

    # ── 2. Trigger copywriter re-run via HITL reject ──────────────────────────
    if on_progress:
        on_progress(
            "[AgentMark] [Revision] Triggering Copywriter agent re-run with your feedback...\n"
            "This typically takes 30–60 seconds."
        )

    try:
        await client.post(
            f"/api/campaigns/{campaign_id}/approve",
            {
                "action": "reject",
                "revisionTarget": "copywriter",
                "feedback": feedback[:2000],  # Truncate to prevent oversized payloads
            }
        )
        logger.info("Copywriter revision triggered | campaign=%s", campaign_id)
    except Exception as exc:
        logger.error("Failed to trigger copywriter revision: %s", exc)
        raise RuntimeError(
            "Failed to trigger copy revision for campaign '%s'. "
            "Ensure the campaign is in 'awaiting_human_approval' status. Error: %s"
            % (campaign_id, exc)
        ) from exc

    # ── 3. Poll until copywriter finishes ─────────────────────────────────────────
    max_attempts = max(1, REVISION_TIMEOUT_SECS // POLL_INTERVAL_SECS)
    consecutive_failures = 0
    elapsed = 0.0

    for attempt in range(max_attempts):
        await asyncio.sleep(POLL_INTERVAL_SECS)
        elapsed += POLL_INTERVAL_SECS

        try:
            campaign = await client.get_campaign(campaign_id)
            consecutive_failures = 0
        except Exception as exc:
            consecutive_failures += 1
            logger.warning("Poll failure %d/5 | campaign=%s | error=%s", consecutive_failures, campaign_id, exc)
            if consecutive_failures >= 5:
                raise RuntimeError(
                    "Lost connection while waiting for copy revision to complete. "
                    "Campaign ID: %s" % campaign_id
                ) from exc
            continue

        status = campaign.get("status", "processing").lower()
        logger.info("Revision poll | campaign=%s | status=%s | elapsed=%.0fs", campaign_id, status, elapsed)

        if status in ("awaiting_human_approval", "completed"):
            # Revision done — extract new copy for confirmation
            ai_outputs = _parse_ai_outputs(campaign)

            new_copy_output = ai_outputs.get("copy_output") or {}
            copies = new_copy_output.get("copies") or {}
            channels_revised = list(copies.keys())

            if on_progress:
                on_progress(
                    f"[AgentMark] [Revision] ✅ Copywriter revision complete! "
                    f"Channels revised: {', '.join(channels_revised)}. "
                    f"Now running Focus Group on new copy..."
                )

            break

        elif status in ("failed", "error", "cancelled"):
            error_msg = campaign.get("aiError") or "Unknown error during revision"
            raise RuntimeError(
                "Copy revision failed with status '%s': %s" % (status, error_msg)
            )

    else:
        raise TimeoutError(
            "Copy revision for campaign '%s' did not complete within %d seconds. "
            "Check your dashboard for status." % (campaign_id, REVISION_TIMEOUT_SECS)
        )

    # ── 4. Auto-run focus group on new copy ───────────────────────────────────
    if on_progress:
        on_progress("[AgentMark] [Focus Group] Running automatic focus group simulation on revised copy...")

    try:
        focus_group_result = await run_focus_group_impl(
            client=client,
            campaign_id=campaign_id,
            copy_text=None,  # Auto-extract from new aiOutputs
            negativity_bias=0.3,
            on_progress=on_progress,
        )
    except Exception as exc:
        logger.error("Auto focus group failed after revision: %s", exc)
        focus_group_result = f"⚠️ Focus group simulation failed after revision: {exc}"

    # ── 5. Build combined result ───────────────────────────────────────────────
    result_parts = [
        "# ✅ Copy Revision Complete\n",
        f"**Campaign ID:** `{campaign_id}`\n",
        f"**Feedback Applied:** {feedback[:300]}{'...' if len(feedback) > 300 else ''}\n",
        "\n---\n",
        "## 🔄 Automatic Focus Group Re-run Results\n",
        focus_group_result,
        "\n---\n",
        "## 📋 Next Steps\n",
        "- Review the focus group scores above — did the revised copy improve?\n",
        "- If satisfied, call `publish_to_channel` to approve and publish.\n",
        "- If more revision needed, call `revise_copy_with_feedback` again with new feedback.\n",
        f"- View full results on your dashboard: `/campaign/{campaign_id}/result`\n",
    ]

    return "".join(result_parts)


async def get_campaign_status_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> str:
    """
    Get the current status of a campaign including scores and copy version count.

    Args:
        client:      Shared AgentMarkClient.
        campaign_id: UUID of the campaign to check.

    Returns:
        A formatted Markdown status summary.
    """
    campaign = await client.get_campaign(campaign_id)

    status = campaign.get("status", "unknown")
    review_score = campaign.get("reviewScore")
    human_status = campaign.get("humanApprovalStatus") or "N/A"
    name = campaign.get("name", "Unnamed Campaign")
    brand = campaign.get("brandName") or "Unknown Brand"

    ai_outputs = _parse_ai_outputs(campaign)

    # Copy versions
    copy_versions: list = ai_outputs.get("copy_versions") or []
    version_count = len(copy_versions)

    # Focus group score
    focus_group = ai_outputs.get("focus_group_output") or {}
    fg_score = focus_group.get("overall_score")

    # Revision counts
    copy_revision_count = campaign.get("copyRevisionCount", 0) or 0

    # Build status emoji
    status_emoji = {
        "completed": "✅",
        "processing": "⏳",
        "awaiting_human_approval": "🔔",
        "failed": "❌",
        "draft": "📝",
    }.get(status, "❓")

    lines = [
        f"# {status_emoji} Campaign Status Report\n",
        f"**Campaign:** {_sanitize_md(name)}  ",
        f"**Brand:** {_sanitize_md(brand)}\n\n",
        "| Field | Value |\n",
        "|---|---|\n",
        f"| Status | **{status.upper()}** |\n",
        f"| Human Approval | {human_status} |\n",
        f"| Review Score | {review_score if review_score is not None else 'N/A'}/100 |\n",
        f"| Focus Group Score | {fg_score if fg_score is not None else 'Not run yet'}/100 |\n",
        f"| Copy Revisions | {copy_revision_count} |\n",
        f"| Copy Versions Saved | {version_count}/5 |\n\n",
    ]

    if copy_versions:
        lines.append("## 📜 Copy Version History\n\n")
        lines.append("| Version | Timestamp | Copy Score | FG Score | Feedback Used |\n")
        lines.append("|---|---|---|---|---|\n")
        for v in copy_versions:
            ts = v.get("timestamp", "?")[:19].replace("T", " ")
            cs = v.get("copy_score") or "N/A"
            fgs = v.get("focus_group_score") or "N/A"
            fb_raw = v.get("feedback_used") or "Initial version"
            fb = _sanitize_md(fb_raw[:50]) + ("…" if len(fb_raw) > 50 else "")
            lines.append(f"| V{v.get('version', '?')} | {ts} | {cs} | {fgs} | {fb} |\n")
        lines.append("\n")

    # Image Prompts & Visual Directions
    image_data = ai_outputs.get("image_prompt_output") or ai_outputs.get("image_output") or {}
    if isinstance(image_data, str):
        try: image_data = json.loads(image_data)
        except Exception: image_data = {}

    image_prompts = image_data.get("image_prompts") or []
    if image_prompts:
        lines.append("## 🎨 Generated Image Prompts & Visual Directions\n\n")
        visual_dir = image_data.get("visual_direction") or {}
        if visual_dir.get("mood"):
            lines.append(f"**Visual Mood:** {_sanitize_md(visual_dir.get('mood'))}\n\n")
        for idx, ip in enumerate(image_prompts, 1):
            p_text = ip.get("prompt", "")
            ratio = ip.get("aspect_ratio", "1:1")
            style = ip.get("style", "Advertising Photography")
            overlay = ip.get("text_overlay") or {}
            headline = overlay.get("headline", "")
            cta = overlay.get("cta", "")
            lines.append(f"### Image Prompt #{idx} ({ratio} | {style})\n")
            lines.append(f"**Prompt:** `{_sanitize_md(p_text)}`  \n")
            if headline or cta:
                lines.append(f"**Text Overlay:** \"{_sanitize_md(headline)}\" (CTA: `{_sanitize_md(cta)}`)\n")
            lines.append("\n")

    # Copy Outputs
    copy_data = ai_outputs.get("copy_output") or {}
    if isinstance(copy_data, str):
        try: copy_data = json.loads(copy_data)
        except Exception: copy_data = {}
    channel_copies = copy_data.get("channel_copies") or copy_data.get("channels") or {}
    if channel_copies and isinstance(channel_copies, dict):
        lines.append("## ✍️ Generated Creative Copy\n\n")
        for ch, details in channel_copies.items():
            if isinstance(details, dict):
                hl = details.get("headline") or details.get("subject") or ""
                body = details.get("body") or details.get("body_copy") or ""
                lines.append(f"### Channel: {ch.capitalize()}\n")
                if hl: lines.append(f"**Headline:** {_sanitize_md(hl)}  \n")
                if body: lines.append(f"**Body Copy:** {_sanitize_md(body[:300])}...\n\n")

    # Action recommendation
    if status == "awaiting_human_approval":
        lines.append(
            "\n> **🔔 Action Required:** Campaign is waiting for your approval.\n"
            "> - Run `run_focus_group` to test the copy first, OR\n"
            "> - Run `revise_copy_with_feedback` if you want changes, OR\n"
            "> - Run `publish_to_channel` to approve and publish.\n"
        )
    elif status == "completed":
        lines.append("\n> **✅ Campaign complete.** All outputs are available above.\n")
    elif status == "processing":
        lines.append("\n> **⏳ Campaign is still processing.** Check back in a few minutes.\n")

    return "".join(lines)
