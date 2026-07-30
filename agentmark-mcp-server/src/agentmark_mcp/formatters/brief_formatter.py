"""
brief_formatter.py — Campaign Brief Formatter

Converts the raw campaign object returned by GET /api/campaigns/:id
into a structured, readable Markdown brief suitable for MCP chat clients.

Key Notes on aiOutputs Structure:
  The backend stores agent outputs under `campaign.aiOutputs` (JSON/JSONB).
  The top-level keys in aiOutputs are:
    "strategy_output"  — StrategyOutput schema
    "copy_output"      — CopywriterOutput schema (has `copies` dict keyed by Channel enum)
    "review_output"    — ReviewerOutput schema
    "publisher_output" — PublisherOutput schema
    "research_output"  — ResearchOutput schema
    "manager_output"   — ManagerOutput schema
    "image_output"     — ImagePromptOutput schema
    "completed_agents" — list[str] of finished agent names
    "active_agent"     — str|null, currently running agent

  Important: the `copy_output.copies` dict is keyed by Channel enum VALUE strings
  (e.g., "instagram", "linkedin", "email") NOT display names.
  Email copies have an additional `subject` field alongside `headline`, `body`, `ctas`.
"""

import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("agentmark-mcp-server")


def _safe_parse_json(value: Any) -> Any:
    """
    Safely parse a value that may be a dict, list, or JSON string.
    Returns the parsed value or an empty dict on failure.
    Eliminates redundant json.loads parsing on already-parsed dict/list types.
    """
    if value is None:
        return {}
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        s = value.strip()
        if not s or not (s.startswith('{') or s.startswith('[')):
            return {}
        try:
            return json.loads(s)
        except (json.JSONDecodeError, ValueError):
            logger.warning("Failed to parse JSON string (length=%d): %s...", len(s), s[:80])
            return {}
    return {}


def _extract_ai_outputs(campaign: Dict[str, Any]) -> Dict[str, Any]:
    """
    Safely extract and parse the aiOutputs field from a campaign object.
    Handles both raw dict (from Prisma JSON) and stringified JSON.
    """
    raw = campaign.get("aiOutputs")
    parsed = _safe_parse_json(raw)
    if not isinstance(parsed, dict):
        return {}
    return parsed


def format_campaign_brief(
    campaign: Dict[str, Any],
    awaiting_approval: bool = False,
) -> str:
    """
    Format a campaign DB record into a rich Markdown brief.

    Args:
        campaign:          The full campaign object from GET /api/campaigns/:id
        awaiting_approval: True when campaign.status == 'awaiting_human_approval'.
                           Adds a prominent banner directing the user to the dashboard.

    Returns:
        Formatted Markdown string ready for MCP chat client rendering.
    """
    # ── Campaign metadata ──────────────────────────────────────────────────────
    campaign_id: str = campaign.get("id", "unknown-id")
    name: str = campaign.get("name", "Unnamed Campaign")
    brand_name: str = campaign.get("brandName", "Unnamed Brand")
    industry: str = campaign.get("industry", "Unknown Industry")
    primary_goal: str = campaign.get("primaryGoal", "Unknown Goal")
    target_audience: str = campaign.get("targetAudience", "Unknown Audience")
    brand_voice: str = campaign.get("brandVoice", "Unknown Voice")
    status: str = campaign.get("status", "unknown")

    # reviewScore is stored as 0–10 float in DB; display it
    review_score: Optional[float] = campaign.get("reviewScore")

    # ── Parse AI outputs ───────────────────────────────────────────────────────
    ai_outputs = _extract_ai_outputs(campaign)

    strategy_output = _safe_parse_json(ai_outputs.get("strategy_output"))
    copy_output = _safe_parse_json(ai_outputs.get("copy_output"))
    review_output = _safe_parse_json(ai_outputs.get("review_output"))
    research_output = _safe_parse_json(ai_outputs.get("research_output"))

    # ── Build Markdown ─────────────────────────────────────────────────────────
    md: List[str] = []

    # ── Header ────────────────────────────────────────────────────────────────
    md.append(f"# Campaign Brief: {name}")
    md.append(
        f"**Brand:** {brand_name} | **Industry:** {industry.upper()} | **Goal:** `{primary_goal}`"
    )
    md.append(f"**Target Audience:** {target_audience}")
    md.append(f"**Brand Voice:** {brand_voice}")
    md.append(f"**Status:** `{status.upper()}`")

    if review_score is not None:
        try:
            score_display = float(review_score) * 10 if float(review_score) <= 10 else float(review_score)
            md.append(f"**AI Review Score:** `{score_display:.0f}/100`")
        except (TypeError, ValueError):
            pass

    md.append(f"**Campaign ID:** `{campaign_id}`")

    # ── Human Approval Banner ─────────────────────────────────────────────────
    if awaiting_approval:
        md.append("\n---")
        md.append(
            "\n> **Human Review Required**\n"
            "> This campaign has been generated and is paused at the review gate.\n"
            "> Open your AgentMark dashboard to approve or request revisions before publishing.\n"
            f"> Dashboard URL: `/campaign/{campaign_id}/result`"
        )

    md.append("\n---")

    # ── 1. Marketing Strategy ──────────────────────────────────────────────────
    if strategy_output and isinstance(strategy_output, dict):
        md.append("\n## Marketing Strategy")

        positioning = strategy_output.get("positioning", "")
        if positioning:
            md.append(f"\n### Positioning Statement\n> {positioning}")

        key_messages: List[str] = strategy_output.get("key_messages") or []
        if key_messages:
            md.append("\n### Key Messaging Pillars")
            for msg in key_messages:
                md.append(f"- {msg}")

        content_pillars: List[str] = strategy_output.get("content_pillars") or []
        if content_pillars:
            md.append("\n### Content Pillars")
            for pillar in content_pillars:
                md.append(f"- {pillar}")

        strategic_approach = strategy_output.get("strategic_approach", "")
        if strategic_approach:
            md.append(f"\n### Strategic Approach\n{strategic_approach}")

        channel_strategy: Dict[str, Any] = strategy_output.get("channel_strategy") or {}
        if channel_strategy:
            md.append("\n### Channel Strategy")
            for channel_name, plan in channel_strategy.items():
                if not isinstance(plan, dict):
                    continue
                display_channel = channel_name.replace("_", " ").title()
                md.append(f"\n#### {display_channel}")
                priority = plan.get("priority", "")
                rationale = plan.get("rationale", "")
                if priority:
                    md.append(f"* **Priority:** {priority}")
                if rationale:
                    md.append(f"* **Rationale:** {rationale}")
                tactics: List[str] = plan.get("tactics") or []
                if tactics:
                    md.append("* **Tactics:**")
                    for t in tactics:
                        md.append(f"  - {t}")

        success_metrics: Dict[str, Any] = strategy_output.get("success_metrics") or {}
        if success_metrics:
            kpis: List[str] = success_metrics.get("kpis") or []
            targets: Dict[str, str] = success_metrics.get("targets") or {}
            if kpis:
                md.append("\n### Success Metrics & KPIs")
                for kpi in kpis:
                    target = targets.get(kpi, "TBD")
                    md.append(f"- **{kpi}:** {target}")

        # Competitive differentiation
        comp_diff: Dict[str, Any] = strategy_output.get("competitive_differentiation") or {}
        if comp_diff:
            uvp = comp_diff.get("unique_value_proposition", "")
            primary_diff = comp_diff.get("primary_differentiation", "")
            if uvp:
                md.append(f"\n### Unique Value Proposition\n> {uvp}")
            if primary_diff:
                md.append(f"\n**Primary Differentiation:** {primary_diff}")

    # ── 2. Market Research Insights (Brief) ────────────────────────────────────
    if research_output and isinstance(research_output, dict):
        market_analysis: Dict[str, Any] = research_output.get("market_analysis") or {}
        competitor_analysis: Dict[str, Any] = research_output.get("competitor_analysis") or {}
        recommended_approach = research_output.get("recommended_approach", "")
        customer_voice: List[str] = research_output.get("customer_voice_insights") or []
        competitor_vulns: List[str] = research_output.get("competitor_vulnerabilities") or []
        proven_hooks: List[str] = research_output.get("proven_ad_hooks") or []
        brand_dna: Dict[str, Any] = research_output.get("brand_dna") or {}

        has_research = any([market_analysis, competitor_analysis, recommended_approach, customer_voice, competitor_vulns, proven_hooks, brand_dna])
        if has_research:
            md.append("\n---")
            md.append("\n## Market Intelligence (Summary)")

            if recommended_approach:
                md.append(f"\n**Recommended Approach:** {recommended_approach}")

            if customer_voice:
                md.append("\n**Customer Voice & Pain Points (Verbatim Quotes):**")
                for q in customer_voice[:4]:
                    md.append(f"- {q}")

            if competitor_vulns:
                md.append("\n**Competitor Vulnerabilities & Counter-Angles:**")
                for v in competitor_vulns[:4]:
                    md.append(f"- {v}")

            if proven_hooks:
                md.append("\n**Proven Ad Hooks & Creative Patterns:**")
                for h in proven_hooks[:4]:
                    md.append(f"- {h}")

            if brand_dna and isinstance(brand_dna, dict) and brand_dna.get("extracted_hero_text"):
                md.append(f"\n**Official Brand DNA:** {brand_dna.get('extracted_hero_text')} *(Source: {brand_dna.get('source_url', brand_name)})*")

            if market_analysis:
                tam = market_analysis.get("total_addressable_market", "")
                trends: List[str] = market_analysis.get("market_trends") or []
                if tam:
                    md.append(f"\n**Market Size (TAM):** {tam}")
                if trends:
                    md.append("\n**Market Trends:**")
                    for t in trends[:3]:  # Show top 3 to keep brief concise
                        md.append(f"- {t}")

            if competitor_analysis:
                diff_opp = competitor_analysis.get("differentiation_opportunity", "")
                if diff_opp:
                    md.append(f"\n**Differentiation Opportunity:** {diff_opp}")

    # ── 3. Creative Copy ───────────────────────────────────────────────────────
    copies: Dict[str, Any] = copy_output.get("copies") if copy_output else {}
    if copies and isinstance(copies, dict):
        md.append("\n---")
        md.append("\n## Generated Creative Copy")

        # Channel display name map (matches Channel enum values)
        channel_display = {
            "instagram": "Instagram",
            "facebook": "Facebook",
            "linkedin": "LinkedIn",
            "twitter": "Twitter / X",
            "tiktok": "TikTok",
            "youtube": "YouTube",
            "email": "Email",
            "google_ads": "Google Ads",
        }

        for channel_key, copy_obj in copies.items():
            if not copy_obj or not isinstance(copy_obj, dict):
                continue

            display_name = channel_display.get(str(channel_key).lower(), str(channel_key).upper())
            md.append(f"\n### {display_name}")

            # Email has subject field
            subject = copy_obj.get("subject", "")
            if subject:
                md.append(f"**Subject Line:** {subject}")

            headline = copy_obj.get("headline", "")
            if headline:
                md.append(f"**Headline:** {headline}")

            body = copy_obj.get("body", "")
            if body:
                md.append(f"\n**Body Copy:**\n{body}")

            ctas: Dict[str, Any] = copy_obj.get("ctas") or {}
            if ctas:
                md.append("\n**Calls to Action:**")
                if ctas.get("primary"):
                    md.append(f"- **Primary CTA:** {ctas['primary']}")
                if ctas.get("secondary"):
                    md.append(f"- **Secondary CTA:** {ctas['secondary']}")
                if ctas.get("tertiary"):
                    md.append(f"- **Tertiary CTA:** {ctas['tertiary']}")
    elif copy_output is not None:
        # copy_output exists but copies key is missing or empty — transient state
        md.append("\n---")
        md.append("\n## Creative Copy\n*Copywriting outputs not yet available.*")

    # ── 4. Quality Review Summary ──────────────────────────────────────────────
    if review_output and isinstance(review_output, dict):
        overall_review: Dict[str, Any] = review_output.get("overall") or {}
        can_publish: bool = review_output.get("can_publish", False)
        review_status: str = review_output.get("status", "")

        if overall_review or review_status:
            md.append("\n---")
            md.append("\n## Quality Review")
            md.append(
                f"**Status:** `{review_status.upper()}` | "
                f"**Publication Clearance:** {'Cleared' if can_publish else 'Pending Revisions'}"
            )

            quality_score = overall_review.get("quality_score")
            if quality_score is not None:
                md.append(f"**Overall Quality Score:** `{quality_score}/100`")

            summary = overall_review.get("summary", "")
            if summary:
                md.append(f"\n{summary}")

            strengths: List[str] = overall_review.get("strengths") or []
            if strengths:
                md.append("\n**Strengths:**")
                for s in strengths:
                    md.append(f"- {s}")

            improvements: List[str] = overall_review.get("critical_improvements") or []
            if improvements:
                md.append("\n**Critical Improvements:**")
                for imp in improvements:
                    md.append(f"- {imp}")

            # Per-agent score breakdown
            agent_reviews = {
                "Research": review_output.get("research_review"),
                "Strategy": review_output.get("strategy_review"),
                "Copy": review_output.get("copy_review"),
                "Visuals": review_output.get("image_review"),
            }
            score_row_parts = [
                f"**{agent}:** `{r['score']}/100`"
                for agent, r in agent_reviews.items()
                if r and isinstance(r, dict) and r.get("score") is not None
            ]
            if score_row_parts:
                md.append(f"\n{' | '.join(score_row_parts)}")

    # ── 5. Next Steps ─────────────────────────────────────────────────────────
    md.append("\n---")
    md.append("\n## What To Do Next")

    if awaiting_approval:
        md.append(
            f"1. **Review & Approve:** Open `/campaign/{campaign_id}/result` in AgentMark to "
            "approve or request revisions. Once approved, the publisher agent will run automatically."
        )
    else:
        md.append(
            f"1. **Simulate Audience Reaction:** Call `run_focus_group(campaign_id=\"{campaign_id}\")` "
            "to test this campaign with AI-powered synthetic audience personas."
        )
        md.append(
            f"2. **Publish Campaign:** Call `publish_to_channel(campaign_id=\"{campaign_id}\")` "
            "to submit for approval and trigger the Publisher agent."
        )
        md.append(
            f"3. **View Full Brief:** Open your AgentMark dashboard at "
            f"`/campaign/{campaign_id}/result` to see all research, images, and content calendar."
        )

    return "\n".join(md)
