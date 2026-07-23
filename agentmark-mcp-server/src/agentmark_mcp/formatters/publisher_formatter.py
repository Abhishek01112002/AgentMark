"""
publisher_formatter.py — Format Publisher Agent Output

Converts the raw PublisherOutput JSON dictionary from the database into a
publication-ready Markdown report with structured sections.

Aligned with the PublisherOutput Pydantic schema in the AI service:
  - publishing_decision       str  (e.g. "APPROVED_FOR_PUBLISHING")
  - decision_rationale        str
  - executive_summary         str
  - publishing_plan           list[ChannelPublishingPlan]
  - content_calendar          ContentCalendar { weeks: list[WeeklyPlan] }
  - projected_metrics         ProjectedMetrics
  - asset_checklist           AssetChecklist { copy_assets, visual_assets, missing_assets }

All logger calls use %-style lazy formatting.
"""

import logging
from typing import Any, Dict, List

logger = logging.getLogger("agentmark-mcp-server")


def format_publisher_report(publisher_output: Dict[str, Any], campaign_id: str) -> str:
    """
    Format the Publisher agent's outputs into a structured, executive-ready report.

    Args:
        publisher_output: The raw publisher_output dict from campaign.aiOutputs.
        campaign_id:      The campaign UUID — used for dashboard deep-link URLs.

    Returns:
        A Markdown string ready for MCP chat client rendering.
    """
    if not publisher_output:
        logger.warning(
            "format_publisher_report called with empty output | campaign=%s", campaign_id
        )
        return (
            "# Publisher Report\n\n"
            "*No publishing data has been generated yet for this campaign.*\n\n"
            "**Campaign ID:** `%s`\n\n"
            "If you just submitted approval, the publisher agent may still be running. "
            "Check your dashboard at `/campaign/%s/result` for the latest status."
            % (campaign_id, campaign_id)
        )

    md: List[str] = []

    decision: str = publisher_output.get("publishing_decision", "APPROVED_FOR_PUBLISHING")
    rationale: str = publisher_output.get("decision_rationale", "")
    summary: str = publisher_output.get("executive_summary", "")

    # ── Header ────────────────────────────────────────────────────────────────
    md.append("# Campaign Distribution Plan")
    md.append("**Campaign ID:** `%s`" % campaign_id)
    md.append("**Status:** `%s`" % decision.replace("_", " ").upper())

    if rationale:
        md.append("\n> **Decision Rationale:** %s" % rationale)

    if summary:
        md.append("\n## Executive Summary")
        md.append(summary)

    md.append("\n---")

    # ── 1. Projected Performance Metrics ─────────────────────────────────────
    metrics: Dict[str, Any] = publisher_output.get("projected_metrics") or {}
    if metrics:
        md.append("\n## Projected Campaign Metrics")
        md.append("| Metric | Projected Target / Value |")
        md.append("| :--- | :--- |")
        md.append("| **Estimated Reach** | %s |" % metrics.get("total_reach", "TBD"))
        md.append("| **Lead / Conversion Target** | %s |" % metrics.get("lead_target", "TBD"))
        md.append("| **Estimated CTR** | %s |" % metrics.get("estimated_ctr", "TBD"))
        md.append("| **Estimated Campaign Cost** | %s |" % metrics.get("estimated_cost", "TBD"))
        md.append("| **ROI Projection** | %s |" % metrics.get("roi_projection", "TBD"))
        md.append("| **Projection Confidence** | %s |" % metrics.get("projection_confidence", "TBD"))

        note: str = metrics.get("projection_note", "")
        if note:
            md.append("\n*Note: %s*" % note)

    # ── 2. Channel Publishing Plan ────────────────────────────────────────────
    plan_list: List[Any] = publisher_output.get("publishing_plan") or []
    if plan_list:
        md.append("\n---")
        md.append("\n## Channel Launch Plan")
        for plan in plan_list:
            if not isinstance(plan, dict):
                continue

            channel: str = plan.get("channel", "Unknown Channel").upper()
            priority: str = plan.get("priority", "Medium")
            freq: str = plan.get("publish_frequency", "")
            timing: str = plan.get("optimal_timing", "")
            launch_date: str = plan.get("launch_date", "")
            plan_status: str = plan.get("status", "pending")

            md.append("\n### %s (%s)" % (channel, plan_status.title()))
            md.append("- **Priority:** `%s`" % priority)
            if launch_date:
                md.append("- **Target Launch Date:** %s" % launch_date)
            if freq:
                md.append("- **Frequency:** %s" % freq)
            if timing:
                md.append("- **Optimal Posting Window:** %s" % timing)

    # ── 3. Weekly Content Calendar ────────────────────────────────────────────
    calendar: Dict[str, Any] = publisher_output.get("content_calendar") or {}
    weeks: List[Any] = calendar.get("weeks") or []
    if weeks:
        md.append("\n---")
        md.append("\n## Weekly Content Calendar")
        for wk in weeks:
            if not isinstance(wk, dict):
                continue

            label: str = wk.get("week_label", "Week")
            theme: str = wk.get("theme", "No theme specified")
            start: str = wk.get("week_start_date", "")

            week_header = "\n### %s" % label
            if start:
                week_header += " (Starts: %s)" % start
            md.append(week_header)
            md.append("**Theme:** *%s*" % theme)

            activities: List[Any] = wk.get("activities") or []
            for act in activities:
                if not isinstance(act, dict):
                    continue

                day: str = act.get("day", "Day")
                chan: str = act.get("channel", "General").upper()
                act_type: str = act.get("content_type", "Post")
                desc: str = act.get("description", "")
                hook: str = act.get("caption_hook", "")
                effort: str = act.get("effort", "medium").upper()

                md.append("\n**%s** | `%s` (%s) — *Effort: %s*" % (day, chan, act_type, effort))
                if hook:
                    md.append('> **Hook:** "%s"' % hook)
                if desc:
                    md.append(desc)

    # ── 4. Asset Readiness Checklist ──────────────────────────────────────────
    checklist: Dict[str, Any] = publisher_output.get("asset_checklist") or {}
    copy_assets: List[Any] = checklist.get("copy_assets") or []
    visual_assets: List[Any] = checklist.get("visual_assets") or []
    missing_assets: List[Any] = checklist.get("missing_assets") or []

    if copy_assets or visual_assets or missing_assets:
        md.append("\n---")
        md.append("\n## Asset Readiness Checklist")

        if copy_assets:
            md.append("\n### Text Copy Assets")
            for ca in copy_assets:
                if not isinstance(ca, dict):
                    continue
                asset_name: str = ca.get("asset", "Asset")
                asset_status: str = ca.get("status", "pending")
                notes: str = ca.get("notes", "")

                icon = "[Ready]" if asset_status.lower() in ("ready", "completed") else "[Pending]"
                notes_str = " — *%s*" % notes if notes else ""
                md.append("- %s **%s** (%s)%s" % (icon, asset_name, asset_status, notes_str))

        if visual_assets:
            md.append("\n### Visual & Image Assets")
            for va in visual_assets:
                if not isinstance(va, dict):
                    continue
                asset_name = va.get("asset", "Asset")
                asset_status = va.get("status", "pending")
                aspect: str = va.get("aspect_ratio", "")
                notes = va.get("notes", "")

                icon = "[Ready]" if asset_status.lower() in ("ready", "completed") else "[Pending]"
                aspect_str = " `[%s]`" % aspect if aspect else ""
                notes_str = " — *%s*" % notes if notes else ""
                md.append(
                    "- %s **%s**%s (%s)%s" % (icon, asset_name, aspect_str, asset_status, notes_str)
                )

        if missing_assets:
            md.append("\n### Missing / Outstanding Action Items")
            for ma in missing_assets:
                md.append("- [ ] %s" % ma)

    # ── 5. Next Steps ─────────────────────────────────────────────────────────
    md.append("\n---")
    md.append("\n## What To Do Next")
    md.append(
        "1. **Review the Distribution Plan:** Open your AgentMark dashboard at "
        "`/campaign/%s/result` to review the full content calendar, image assets, "
        "and publication schedule." % campaign_id
    )
    md.append(
        "2. **Export Assets:** Download copy and image assets from the dashboard "
        "for manual upload to your social media scheduler or ad platform."
    )
    md.append(
        "3. **Schedule Posts:** Use the Weekly Content Calendar above as a "
        "direct brief for your scheduling tool (Buffer, Hootsuite, Later, etc.)."
    )
    md.append(
        "4. **Track Performance:** After launch, compare actuals against the "
        "Projected Campaign Metrics table above to evaluate ROI."
    )

    return "\n".join(md)
