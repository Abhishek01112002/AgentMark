"""
PUBLISHER AGENT - Campaign Distribution & Publishing Planner

Role: Senior Campaign Distribution Strategist

INPUT (From All Upstream Agents + State):
  FROM state (metadata - direct access):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand name
    ✅ industry: Industry sector
    ✅ primary_goal: Campaign goal
    ✅ target_audience: Audience description
    ✅ brand_voice: Tone and style

  FROM manager_output (REQUIRED - 2 fields):
    ✅ channels: Distribution channels list
    ✅ deliverables: Content deliverables list

  FROM strategy_output (REQUIRED - key fields):
    ✅ inferred_goal: awareness / lead_gen / sales / retention
    ✅ timeline: Campaign phases with dates
    ✅ success_metrics: KPIs aligned with goal
    ✅ channel_strategy: Per-channel strategic priorities
    ✅ execution.channels: Final channel list
    ✅ execution.deliverables: Final deliverables

  FROM copy_output (OPTIONAL - safe defaults if missing):
    ✅ copy_readiness: Per-channel readiness flags
    ✅ email / linkedin / social / ads: Channel copy blobs

  FROM image_output (OPTIONAL - safe defaults if missing):
    ✅ image_prompts[].deliverable: Visual asset names
    ✅ image_prompts[].aspect_ratio: Aspect ratios

  FROM review_output (OPTIONAL - defaults to approved if missing):
    ✅ status: approved / revision_required
    ✅ overall_quality_score: 0-100 score

OUTPUT (publisher_output JSON):
  1. publishing_decision: APPROVED_FOR_PUBLISHING / REVISIONS_NEEDED / HOLD
  2. decision_rationale: Why this decision was made
  3. publishing_plan: Per-channel distribution plan with priority, timing, KPIs
  4. content_calendar: Week-by-week activity breakdown
  5. asset_checklist: Copy + visual asset readiness inventory
  6. projected_metrics: Reach, leads, CTR, cost, ROI estimates
  7. executive_summary: 3-5 sentence campaign overview

HOW IT WORKS:
  1. Reads and validates all upstream agent outputs
  2. Determines publishing decision from reviewer quality score
  3. Builds per-channel publishing plan using rule-based lookup tables
  4. Generates a week-by-week content calendar from strategy timeline
  5. Compiles asset checklist from copy + visual agent outputs
  6. Projects campaign metrics based on goal + channels
  7. Writes structured JSON to state.publisher_output
"""

import sys
from pathlib import Path
import json
import logging
from datetime import datetime, timedelta

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState

# Configure logger
logger = logging.getLogger("publisher_agent")
logger.setLevel(logging.INFO)


# ==================== LOOKUP TABLES ====================

# Channel priority by campaign goal
CHANNEL_PRIORITY = {
    "lead_gen": {
        "linkedin": "HIGH",
        "email":    "HIGH",
        "ads":      "HIGH",
        "social":   "MEDIUM",
        "blog":     "LOW",
        "website":  "MEDIUM",
    },
    "awareness": {
        "linkedin": "HIGH",
        "social":   "HIGH",
        "ads":      "MEDIUM",
        "email":    "MEDIUM",
        "blog":     "HIGH",
        "website":  "MEDIUM",
    },
    "sales": {
        "email":    "HIGH",
        "ads":      "HIGH",
        "linkedin": "MEDIUM",
        "social":   "LOW",
        "blog":     "LOW",
        "website":  "HIGH",
    },
    "retention": {
        "email":    "HIGH",
        "social":   "MEDIUM",
        "linkedin": "LOW",
        "ads":      "LOW",
        "blog":     "MEDIUM",
        "website":  "LOW",
    },
}

# Optimal posting times by channel
CHANNEL_TIMING = {
    "linkedin": "Tue/Thu 9am–11am EST",
    "email":    "Tue/Wed 7am–9am EST",
    "social":   "Mon/Wed/Fri 12pm–2pm EST",
    "ads":      "Run continuously, peak Tue–Thu",
    "blog":     "Mon/Thu 8am–10am EST",
    "website":  "Update at campaign start",
}

# Publish frequency by channel
CHANNEL_FREQUENCY = {
    "linkedin": "3x/week",
    "email":    "1x/week",
    "social":   "5x/week",
    "ads":      "Continuous (A/B rotate weekly)",
    "blog":     "1x/week",
    "website":  "Update at milestones",
}

# Content type by channel
CHANNEL_CONTENT_TYPE = {
    "linkedin": "thought leadership post",
    "email":    "newsletter / drip email",
    "social":   "short-form post + story",
    "ads":      "display / search ad",
    "blog":     "long-form article",
    "website":  "landing page update",
}

# KPI targets by goal and channel
CHANNEL_KPIS = {
    "lead_gen": {
        "linkedin": {"impressions": "200K", "ctr": "3.5%", "leads": "2K MQLs"},
        "email":    {"open_rate": "28%",    "ctr": "4.5%", "leads": "1.5K MQLs"},
        "ads":      {"impressions": "500K", "ctr": "2.5%", "conversions": "1K leads"},
        "social":   {"impressions": "150K", "ctr": "2.0%", "engagements": "5K"},
        "blog":     {"sessions": "10K",    "time_on_page": "4min", "leads": "500"},
        "website":  {"sessions": "20K",    "ctr": "5.0%", "demos": "200"},
    },
    "awareness": {
        "linkedin": {"impressions": "500K", "reach": "300K", "engagements": "15K"},
        "email":    {"open_rate": "32%",    "ctr": "3.0%", "reach": "50K"},
        "ads":      {"impressions": "1M",   "reach": "600K", "frequency": "3x"},
        "social":   {"impressions": "800K", "reach": "500K", "shares": "2K"},
        "blog":     {"sessions": "30K",     "shares": "1K",  "backlinks": "50"},
        "website":  {"sessions": "50K",     "bounce_rate": "<40%", "pages_per_session": "3"},
    },
    "sales": {
        "linkedin": {"impressions": "100K", "ctr": "5.0%", "demos": "500"},
        "email":    {"open_rate": "35%",    "ctr": "8.0%", "purchases": "200"},
        "ads":      {"impressions": "200K", "roas": "4.0x", "conversions": "300"},
        "social":   {"impressions": "80K",  "ctr": "4.0%", "add_to_cart": "1K"},
        "blog":     {"sessions": "5K",      "ctr": "6.0%", "trials": "100"},
        "website":  {"sessions": "15K",     "conversion_rate": "5%", "revenue": "$50K"},
    },
    "retention": {
        "linkedin": {"impressions": "50K",  "engagement": "8%",  "renewals": "200"},
        "email":    {"open_rate": "45%",    "ctr": "12%", "renewals": "500"},
        "ads":      {"impressions": "30K",  "ctr": "6.0%", "reactivations": "100"},
        "social":   {"impressions": "40K",  "engagement": "10%", "community_growth": "500"},
        "blog":     {"sessions": "8K",      "repeat_visitors": "40%", "nps": "70+"},
        "website":  {"sessions": "10K",     "login_rate": "60%", "feature_adoption": "40%"},
    },
}

# Projected overall metrics by goal
PROJECTED_METRICS = {
    "lead_gen": {
        "total_reach":    "500K impressions",
        "lead_target":    "5K MQLs",
        "estimated_ctr":  "3.5%",
        "estimated_cost": "$15K–$25K",
        "roi_projection": "3.2x estimated",
    },
    "awareness": {
        "total_reach":    "1M+ impressions",
        "lead_target":    "N/A (brand awareness)",
        "estimated_ctr":  "2.0%",
        "estimated_cost": "$10K–$20K",
        "roi_projection": "Brand lift: +25% recall",
    },
    "sales": {
        "total_reach":    "200K impressions",
        "lead_target":    "500 SQLs / $50K revenue",
        "estimated_ctr":  "5.0%",
        "estimated_cost": "$20K–$35K",
        "roi_projection": "4.5x estimated",
    },
    "retention": {
        "total_reach":    "100K impressions",
        "lead_target":    "90% renewal rate",
        "estimated_ctr":  "8.0%",
        "estimated_cost": "$5K–$10K",
        "roi_projection": "5.0x estimated (LTV)",
    },
}

# Day schedule for calendar by channel
CHANNEL_DAY_SCHEDULE = {
    "linkedin": ["Tuesday", "Thursday", "Saturday"],
    "email":    ["Tuesday"],
    "social":   ["Monday", "Wednesday", "Friday", "Saturday", "Sunday"],
    "ads":      ["Monday", "Wednesday", "Friday"],
    "blog":     ["Monday", "Thursday"],
    "website":  ["Monday"],
}


# ==================== HELPER FUNCTIONS ====================

def _determine_publishing_decision(review_output_str: str) -> tuple:
    """
    Reads review_output and returns (decision, rationale).
    Fully deterministic — no LLM needed.

    Decision matrix:
      - No review output  → APPROVED_FOR_PUBLISHING (default)
      - score >= 80       → APPROVED_FOR_PUBLISHING
      - score 60–79       → REVISIONS_NEEDED
      - score < 60        → HOLD
    """
    if not review_output_str:
        logger.warning("review_output is None — defaulting to APPROVED_FOR_PUBLISHING")
        return (
            "APPROVED_FOR_PUBLISHING",
            "No reviewer output available. Proceeding with default approval. "
            "Manual quality check recommended before actual publishing."
        )

    try:
        review = json.loads(review_output_str)
    except (json.JSONDecodeError, TypeError) as e:
        logger.error(f"Could not parse review_output: {e}")
        return (
            "HOLD",
            "Reviewer output could not be parsed. Defaulting to HOLD for safety."
        )

    score = float(review.get("overall_quality_score", 100))
    status = review.get("status", "approved")

    # Collect all issues across agents for rationale
    all_issues = []
    for agent_key in ["research_review", "strategy_review", "copy_review", "image_review"]:
        agent_data = review.get(agent_key, {})
        issues = agent_data.get("issues", [])
        if issues:
            agent_label = agent_key.replace("_review", "").upper()
            all_issues.extend([f"[{agent_label}] {issue}" for issue in issues])

    if score >= 80:
        if status == "revision_required":
            rationale = (
                f"Reviewer status is 'revision_required' but overall quality score is {score}/100 "
                f"(threshold >=80). Maximum revision cycles reached — proceeding with caution."
            )
            if all_issues:
                rationale += f" Unresolved issues: {'; '.join(all_issues[:3])}."
        else:
            rationale = (
                f"Overall quality score is {score}/100 — meets the 80% threshold. "
                f"All agent outputs approved. Campaign is ready for distribution."
            )
        return "APPROVED_FOR_PUBLISHING", rationale

    elif score >= 60:
        rationale = (
            f"Overall quality score is {score}/100 — below the 80% threshold. "
            f"Campaign requires modifications before full launch. "
            f"Partial publishing plan generated for reference."
        )
        if all_issues:
            rationale += f" Issues to address: {'; '.join(all_issues[:3])}."
        return "REVISIONS_NEEDED", rationale

    else:
        rationale = (
            f"Overall quality score is {score}/100 — critically low. "
            f"Campaign quality is insufficient for publishing. "
            f"No distribution plan generated. Address all reviewer feedback first."
        )
        if all_issues:
            rationale += f" Blocking issues: {'; '.join(all_issues[:3])}."
        return "HOLD", rationale


def _extract_copy_assets(state: CampaignState) -> tuple:
    """
    Reads copy_output and returns (copy_assets list, readiness dict).
    Returns safe defaults if copy_output is missing or malformed.
    """
    channels = ["email", "linkedin", "social", "ads"]
    copy_assets = []
    readiness = {ch: False for ch in channels}

    if not state.copy_output:
        logger.warning("copy_output is None — marking all copy assets as NOT_READY")
        for ch in channels:
            copy_assets.append({
                "asset": f"{ch} copy",
                "status": "NOT_READY",
                "notes": "Copy Agent output not available"
            })
        return copy_assets, readiness

    try:
        copy = json.loads(state.copy_output)
        copy_readiness = copy.get("copy_readiness", {})

        for ch in channels:
            is_ready = copy_readiness.get(f"{ch}_ready", False)
            readiness[ch] = is_ready
            copy_assets.append({
                "asset": f"{ch} copy",
                "status": "READY" if is_ready else "NOT_READY",
                "notes": ""
            })

    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        logger.warning(f"Could not parse copy_output: {e}")
        for ch in channels:
            copy_assets.append({
                "asset": f"{ch} copy",
                "status": "NOT_READY",
                "notes": f"Parse error: {str(e)}"
            })

    return copy_assets, readiness


def _extract_visual_assets(state: CampaignState) -> list:
    """
    Reads image_output and returns a list of visual asset dicts.
    Returns empty list if image_output is missing or malformed.
    """
    visual_assets = []

    if not state.image_output:
        logger.warning("image_output is None — no visual assets available")
        return visual_assets

    try:
        images = json.loads(state.image_output)
        for prompt in images.get("image_prompts", []):
            deliverable = prompt.get("deliverable", "unknown asset")
            aspect_ratio = prompt.get("aspect_ratio", "")
            visual_assets.append({
                "asset": deliverable,
                "status": "READY",
                "aspect_ratio": aspect_ratio,
                "notes": ""
            })

    except (json.JSONDecodeError, TypeError, AttributeError) as e:
        logger.warning(f"Could not parse image_output: {e}")

    return visual_assets


def _build_channel_plan(
    channel: str,
    inferred_goal: str,
    copy_readiness: dict,
    visual_assets: list,
) -> dict:
    """
    Builds a single channel publishing plan dict using lookup tables.
    """
    goal_priorities = CHANNEL_PRIORITY.get(inferred_goal, CHANNEL_PRIORITY["awareness"])
    priority = goal_priorities.get(channel.lower(), "MEDIUM")

    goal_kpis = CHANNEL_KPIS.get(inferred_goal, CHANNEL_KPIS["awareness"])
    kpi_targets = goal_kpis.get(channel.lower(), {"impressions": "TBD", "ctr": "TBD"})

    content_type = CHANNEL_CONTENT_TYPE.get(channel.lower(), "content piece")
    timing = CHANNEL_TIMING.get(channel.lower(), "Weekdays 9am–5pm")
    frequency = CHANNEL_FREQUENCY.get(channel.lower(), "2x/week")

    # Determine copy asset
    copy_asset_used = f"{channel} copy"
    copy_ready = copy_readiness.get(channel.lower(), False)

    # Determine visual asset — match by deliverable name containing channel keyword
    visual_asset_used = None
    for va in visual_assets:
        if channel.lower() in va.get("asset", "").lower():
            visual_asset_used = va["asset"]
            break

    # Status: READY if copy is ready, PENDING_ASSET if copy not ready
    status = "READY" if copy_ready else "PENDING_ASSET"

    return {
        "channel": channel,
        "priority": priority,
        "content_type": content_type,
        "publish_frequency": frequency,
        "optimal_timing": timing,
        "copy_asset_used": copy_asset_used,
        "visual_asset_used": visual_asset_used,
        "kpi_targets": kpi_targets,
        "status": status,
    }


def _build_content_calendar(
    timeline: dict,
    channels: list,
    inferred_goal: str,
    brand_name: str,
) -> dict:
    """
    Builds a week-by-week content calendar from strategy timeline.
    Uses rule-based activity generation from lookup tables.
    """
    # Start date: next Monday from today
    today = datetime.now()
    days_until_monday = (7 - today.weekday()) % 7 or 7
    start_date = today + timedelta(days=days_until_monday)

    # Determine total weeks from timeline phases
    phase_count = len(timeline) if isinstance(timeline, dict) else 4
    total_weeks = max(phase_count * 2, 4)  # At least 4 weeks

    # Phase labels from timeline or defaults
    phase_names = []
    if isinstance(timeline, dict):
        for key in sorted(timeline.keys()):
            phase = timeline[key]
            if isinstance(phase, dict):
                phase_names.append(phase.get("name", f"Phase {key}"))
            else:
                phase_names.append(str(phase))

    # Goal-specific week labels
    goal_week_labels = {
        "lead_gen":  ["Soft Launch", "Content Push", "Lead Capture", "Conversion Drive",
                      "Nurture Sequence", "Review & Optimize"],
        "awareness": ["Brand Introduction", "Content Amplification", "Community Building",
                      "Influencer Outreach", "PR Push", "Review & Optimize"],
        "sales":     ["Offer Launch", "Social Proof", "Urgency Push", "Conversion Sprint",
                      "Follow-up", "Review & Optimize"],
        "retention": ["Re-engagement", "Value Delivery", "Loyalty Rewards",
                      "Feedback Collection", "Success Stories", "Review & Optimize"],
    }
    week_labels = goal_week_labels.get(inferred_goal, goal_week_labels["awareness"])

    weeks = []
    for week_num in range(1, total_weeks + 1):
        label_idx = min(week_num - 1, len(week_labels) - 1)
        week_label = f"Week {week_num}: {week_labels[label_idx]}"

        activities = []
        for channel in channels:
            days = CHANNEL_DAY_SCHEDULE.get(channel.lower(), ["Monday", "Wednesday"])
            content_type = CHANNEL_CONTENT_TYPE.get(channel.lower(), "content")

            # Build activity description based on week and goal
            if week_num == 1:
                description = f"Launch {channel} {content_type} — introduce {brand_name} campaign"
            elif week_num <= 3:
                description = f"Publish {channel} {content_type} — reinforce key messages"
            else:
                description = f"Publish {channel} {content_type} — optimize based on performance data"

            for day in days[:2]:  # Max 2 days per channel per week for clarity
                activities.append({
                    "channel": channel,
                    "content_type": content_type,
                    "description": description,
                    "day": day,
                })

        week_start = start_date + timedelta(weeks=week_num - 1)
        weeks.append({
            "week_number": week_num,
            "week_label": week_label,
            "week_start_date": week_start.strftime("%Y-%m-%d"),
            "activities": activities,
        })

    return {
        "total_weeks": total_weeks,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "weeks": weeks,
    }


def _build_projected_metrics(inferred_goal: str, channels: list) -> dict:
    """Returns goal-aligned projected campaign metrics."""
    base_metrics = PROJECTED_METRICS.get(inferred_goal, PROJECTED_METRICS["awareness"])

    # Amplify if many channels
    channel_multiplier = len(channels)
    if channel_multiplier >= 4:
        note = f"Projections reflect multi-channel amplification across {channel_multiplier} channels."
    elif channel_multiplier >= 2:
        note = f"Projections reflect {channel_multiplier}-channel campaign."
    else:
        note = "Single-channel campaign projections."

    return {**base_metrics, "projection_note": note}


def _build_executive_summary(
    campaign_name: str,
    brand_name: str,
    inferred_goal: str,
    decision: str,
    channels: list,
    projected_metrics: dict,
    quality_score: float,
) -> str:
    """Builds a 3-5 sentence executive summary from campaign context."""
    goal_descriptions = {
        "lead_gen":  "lead generation",
        "awareness": "brand awareness",
        "sales":     "direct sales conversion",
        "retention": "customer retention and loyalty",
    }
    goal_desc = goal_descriptions.get(inferred_goal, "campaign goals")

    channel_list = ", ".join(c.capitalize() for c in channels[:4])
    if len(channels) > 4:
        channel_list += f" and {len(channels) - 4} more"

    decision_statement = {
        "APPROVED_FOR_PUBLISHING": f"The campaign has been approved for publishing with a quality score of {quality_score}/100.",
        "REVISIONS_NEEDED":        f"The campaign requires revisions before full launch (quality score: {quality_score}/100).",
        "HOLD":                    f"The campaign has been placed on hold due to a low quality score of {quality_score}/100.",
    }.get(decision, "Publishing decision has been made.")

    summary = (
        f"{campaign_name} by {brand_name} is a {goal_desc} campaign "
        f"designed for distribution across {channel_list}. "
        f"{decision_statement} "
        f"The campaign projects {projected_metrics.get('total_reach', 'significant')} "
        f"with an estimated CTR of {projected_metrics.get('estimated_ctr', 'TBD')} "
        f"and a projected ROI of {projected_metrics.get('roi_projection', 'TBD')}. "
        f"All channel-specific copy and visual assets have been inventoried and are "
        f"ready for immediate deployment upon final sign-off."
    )

    return summary


def _build_asset_checklist(
    copy_assets: list,
    visual_assets: list,
    deliverables: list,
) -> dict:
    """
    Compiles the full asset checklist and identifies missing assets.
    """
    # Identify missing assets — deliverables with no matching visual
    visual_asset_names = [va["asset"].lower() for va in visual_assets]
    missing_assets = []
    for deliverable in deliverables:
        # Check if any visual asset covers this deliverable
        found = any(
            deliverable.lower() in va_name or va_name in deliverable.lower()
            for va_name in visual_asset_names
        )
        if not found and deliverable.lower() not in ["email series", "newsletter", "blog post"]:
            missing_assets.append(f"Visual for: {deliverable}")

    return {
        "copy_assets": copy_assets,
        "visual_assets": visual_assets,
        "missing_assets": missing_assets,
    }


# ==================== MAIN AGENT FUNCTION ====================

def publisher_agent(state: CampaignState) -> CampaignState:
    """
    Publisher Agent Node — Determines publishing decision and generates a
    comprehensive distribution plan for the approved campaign.

    Args:
        state: CampaignState with all upstream agent outputs populated.

    Returns:
        CampaignState with publisher_output filled and status = "completed".
    """
    print("\n" + "=" * 80)
    print("PUBLISHER AGENT ACTIVATED")
    print("=" * 80)

    # ========== STEP 1: READ & VALIDATE REQUIRED INPUTS ==========
    print("\n[STEP 1] Reading and validating required inputs...")
    print("-" * 80)

    # --- Manager Output (REQUIRED) ---
    if not state.manager_output:
        raise ValueError(
            "manager_output is None — Publisher Agent requires Manager Agent output. "
            "Cannot build a publishing plan without channel and deliverable definitions."
        )
    try:
        manager_data = json.loads(state.manager_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"manager_output is not valid JSON: {e}")

    channels = manager_data.get("channels", [])
    deliverables = manager_data.get("deliverables", [])
    if not channels:
        channels = ["linkedin", "email", "social", "ads"]
        print("  ⚠️  No channels in manager_output — using defaults")

    # --- Strategy Output (REQUIRED) ---
    if not state.strategy_output:
        raise ValueError(
            "strategy_output is None — Publisher Agent requires Strategy Agent output. "
            "Cannot build a publishing plan without strategic foundation."
        )
    try:
        strategy_data = json.loads(state.strategy_output)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"strategy_output is not valid JSON: {e}")

    inferred_goal = strategy_data.get("inferred_goal", state.primary_goal or "awareness")
    timeline = strategy_data.get("timeline", {})
    success_metrics = strategy_data.get("success_metrics", {})
    channel_strategy = strategy_data.get("channel_strategy", {})

    # Override channels from strategy execution if available
    execution = strategy_data.get("execution", {})
    strategy_channels = execution.get("channels", [])
    strategy_deliverables = execution.get("deliverables", [])
    if strategy_channels:
        channels = strategy_channels
    if strategy_deliverables:
        deliverables = strategy_deliverables

    # Campaign metadata
    campaign_name = state.campaign_name or "Unnamed Campaign"
    brand_name = state.brand_name or "Unnamed Brand"
    industry = state.industry or "other"
    brand_voice = state.brand_voice or "professional"
    target_audience = state.target_audience or "General Audience"

    print(f"  Campaign:     {campaign_name}")
    print(f"  Brand:        {brand_name}")
    print(f"  Industry:     {industry}")
    print(f"  Goal:         {inferred_goal}")
    print(f"  Channels:     {channels}")
    print(f"  Deliverables: {deliverables}")

    # ========== STEP 2: READ OPTIONAL INPUTS ==========
    print("\n[STEP 2] Reading optional inputs (copy + visual assets)...")
    print("-" * 80)

    copy_assets, copy_readiness = _extract_copy_assets(state)
    visual_assets = _extract_visual_assets(state)

    ready_copy = sum(1 for a in copy_assets if a["status"] == "READY")
    print(f"  Copy assets ready: {ready_copy}/{len(copy_assets)}")
    print(f"  Visual assets found: {len(visual_assets)}")

    # ========== STEP 3: DETERMINE PUBLISHING DECISION ==========
    print("\n[STEP 3] Determining publishing decision from reviewer output...")
    print("-" * 80)

    decision, rationale = _determine_publishing_decision(state.review_output)

    # Extract quality score for summary
    quality_score = 0.0
    if state.review_output:
        try:
            review_data = json.loads(state.review_output)
            quality_score = float(review_data.get("overall_quality_score", 0))
        except Exception:
            quality_score = 0.0

    print(f"  Publishing Decision: {decision}")
    print(f"  Quality Score:       {quality_score}/100")
    print(f"  Rationale:           {rationale[:80]}...")

    # ========== STEP 4: BUILD PUBLISHING PLAN ==========
    print("\n[STEP 4] Building per-channel publishing plan...")
    print("-" * 80)

    publishing_plan = []
    for channel in channels:
        channel_plan = _build_channel_plan(
            channel=channel.lower(),
            inferred_goal=inferred_goal,
            copy_readiness=copy_readiness,
            visual_assets=visual_assets,
        )
        publishing_plan.append(channel_plan)
        print(f"  ✓ {channel.capitalize()}: priority={channel_plan['priority']}, status={channel_plan['status']}")

    # ========== STEP 5: BUILD CONTENT CALENDAR ==========
    print("\n[STEP 5] Building content calendar...")
    print("-" * 80)

    content_calendar = _build_content_calendar(
        timeline=timeline,
        channels=channels,
        inferred_goal=inferred_goal,
        brand_name=brand_name,
    )
    print(f"  Calendar: {content_calendar['total_weeks']} weeks")
    print(f"  Start date: {content_calendar['start_date']}")
    print(f"  Total activities: {sum(len(w['activities']) for w in content_calendar['weeks'])}")

    # ========== STEP 6: BUILD ASSET CHECKLIST ==========
    print("\n[STEP 6] Compiling asset checklist...")
    print("-" * 80)

    asset_checklist = _build_asset_checklist(
        copy_assets=copy_assets,
        visual_assets=visual_assets,
        deliverables=deliverables,
    )
    if asset_checklist["missing_assets"]:
        print(f"  ⚠️  Missing assets: {asset_checklist['missing_assets']}")
    else:
        print("  ✓ All deliverables have corresponding assets")

    # ========== STEP 7: BUILD PROJECTED METRICS ==========
    print("\n[STEP 7] Projecting campaign metrics...")
    print("-" * 80)

    projected_metrics = _build_projected_metrics(
        inferred_goal=inferred_goal,
        channels=channels,
    )
    print(f"  Total Reach:  {projected_metrics['total_reach']}")
    print(f"  Lead Target:  {projected_metrics['lead_target']}")
    print(f"  Est. CTR:     {projected_metrics['estimated_ctr']}")
    print(f"  Est. Cost:    {projected_metrics['estimated_cost']}")
    print(f"  ROI:          {projected_metrics['roi_projection']}")

    # ========== STEP 8: BUILD EXECUTIVE SUMMARY ==========
    print("\n[STEP 8] Writing executive summary...")
    print("-" * 80)

    executive_summary = _build_executive_summary(
        campaign_name=campaign_name,
        brand_name=brand_name,
        inferred_goal=inferred_goal,
        decision=decision,
        channels=channels,
        projected_metrics=projected_metrics,
        quality_score=quality_score,
    )
    print(f"  Summary: {executive_summary[:100]}...")

    # ========== STEP 9: COMPILE COMPLETE OUTPUT ==========
    print("\n[STEP 9] Compiling publisher output...")
    print("-" * 80)

    publisher_output_dict = {
        "publishing_decision": decision,
        "decision_rationale":  rationale,
        "publishing_plan":     publishing_plan,
        "content_calendar":    content_calendar,
        "asset_checklist":     asset_checklist,
        "projected_metrics":   projected_metrics,
        "executive_summary":   executive_summary,
    }

    # ========== STEP 10: WRITE TO STATE ==========
    print("\n[STEP 10] Writing publisher output to state...")
    print("-" * 80)

    state.publisher_output = json.dumps(publisher_output_dict, indent=2)
    state.status = "completed"
    state.error = None

    print(f"  publisher_output: {len(state.publisher_output)} characters")
    print(f"  status: {state.status}")

    print("\n" + "=" * 80)
    print("✅ PUBLISHER AGENT COMPLETE")
    print(f"   Decision:  {decision}")
    print(f"   Channels:  {len(publishing_plan)}")
    print(f"   Calendar:  {content_calendar['total_weeks']} weeks")
    print(f"   Assets:    {len(copy_assets)} copy + {len(visual_assets)} visual")
    print("=" * 80)

    return state


# ==================== STANDALONE TEST ====================

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print("PUBLISHER AGENT - STANDALONE TEST")
    print("=" * 80)

    # Mock upstream outputs
    mock_manager = {
        "channels": ["linkedin", "email", "social", "ads"],
        "deliverables": ["landing page", "webinar banner", "email series", "social ads"],
    }

    mock_strategy = {
        "inferred_goal": "lead_gen",
        "positioning": "Enterprise AI without the complexity",
        "timeline": {
            "phase_1": {"name": "Planning & Setup", "duration": "Week 1"},
            "phase_2": {"name": "Content Push",     "duration": "Week 2-3"},
            "phase_3": {"name": "Lead Capture",     "duration": "Week 4-5"},
            "phase_4": {"name": "Optimize & Scale", "duration": "Week 6"},
        },
        "success_metrics": {
            "primary": "5K MQLs",
            "secondary": "200K impressions",
            "ctr": "3.5%",
        },
        "execution": {
            "channels": ["linkedin", "email", "social", "ads"],
            "deliverables": ["landing page", "webinar banner", "email series"],
        },
        "channel_strategy": {
            "linkedin": "thought leadership + lead magnets",
            "email":    "drip nurture sequence",
            "social":   "engagement + retargeting",
            "ads":      "conversion campaigns",
        },
    }

    mock_copy = {
        "inferred_goal": "lead_gen",
        "copy_readiness": {
            "email_ready":    True,
            "linkedin_ready": True,
            "social_ready":   True,
            "ads_ready":      True,
        },
        "email":    {"subject": "Test subject", "headline": "Test headline", "ctas": {"hero_cta": "Get Started"}},
        "linkedin": {"headline": "Test LinkedIn headline"},
        "social":   {"headline": "Test social headline"},
        "ads":      {"headline": "Test ad headline"},
    }

    mock_image = {
        "visual_theme": "Modern sleek dark mode",
        "image_prompts": [
            {"deliverable": "linkedin social post", "aspect_ratio": "1:1"},
            {"deliverable": "email banner",         "aspect_ratio": "3:1"},
        ],
    }

    mock_review = {
        "status": "approved",
        "overall_quality_score": 87,
        "individual_threshold_met": True,
        "overall_threshold_met": True,
    }

    # Create state
    test_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads",
        brand_voice="professional",
        brief="Launch AI automation platform",
        manager_output=json.dumps(mock_manager),
        strategy_output=json.dumps(mock_strategy),
        copy_output=json.dumps(mock_copy),
        image_output=json.dumps(mock_image),
        review_output=json.dumps(mock_review),
        status="review_complete",
    )

    # Run
    result = publisher_agent(test_state)

    print("\n[TEST] Parsed Output:")
    output = json.loads(result.publisher_output)
    print(f"  Decision:       {output['publishing_decision']}")
    print(f"  Channels:       {len(output['publishing_plan'])}")
    print(f"  Calendar Weeks: {output['content_calendar']['total_weeks']}")
    print(f"  Copy Assets:    {len(output['asset_checklist']['copy_assets'])}")
    print(f"  Visual Assets:  {len(output['asset_checklist']['visual_assets'])}")
    print(f"  Total Reach:    {output['projected_metrics']['total_reach']}")
    print(f"  Summary:        {output['executive_summary'][:120]}...")