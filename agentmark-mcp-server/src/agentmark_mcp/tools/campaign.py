import asyncio
import json
import logging
import os
from typing import Any, Callable, Dict, List, Optional

from ..client import AgentMarkClient
from ..formatters.brief_formatter import format_campaign_brief
from ..config import POLL_INTERVAL_SECS, CAMPAIGN_TIMEOUT_SECS

logger = logging.getLogger("agentmark-mcp-server")

# ─── Agent pipeline ordering ──────────────────────────────────────────────────
# These match the LangGraph node names from the AI service.
# Used to simulate streaming progress milestones during long polling.
AGENT_PIPELINE = [
    ("manager",       "[AgentMark] [Manager] Analyzing campaign brief and dispatching agents..."),
    ("research",      "[AgentMark] [Research] Gathering market intelligence and competitor data..."),
    ("strategy",      "[AgentMark] [Strategy] Building campaign framework and messaging pillars..."),
    ("copywriter",    "[AgentMark] [Copywriter] Generating multi-channel creative copy..."),
    ("image_prompt",  "[AgentMark] [Visuals] Creating image prompt specifications..."),
    ("reviewer",      "[AgentMark] [Reviewer] Scoring and quality-checking all outputs..."),
]

# Approximate time budget per agent step (seconds). Used to decide which
# progress message to emit during polling so the user never sees silence.
# Total initial pipeline: ~140–160 seconds.
_AGENT_TIME_BUDGETS = [10, 40, 30, 40, 15, 20]


def _elapsed_milestone(elapsed_secs: float) -> Optional[str]:
    """
    Given elapsed seconds since campaign start, return the appropriate
    progress message for the current pipeline stage. Returns None once all
    stages have been reported.
    
    This is a best-effort simulation — we do not have SSE from the AI service,
    so we approximate which agent is running based on elapsed wall-clock time.
    """
    cumulative = 0
    for i, (agent, message) in enumerate(AGENT_PIPELINE):
        cumulative += _AGENT_TIME_BUDGETS[i]
        if elapsed_secs < cumulative:
            return message
    return None  # All stages passed — final completion imminent


async def generate_campaign_impl(
    client: AgentMarkClient,
    project_id: str,
    name: str,
    brand_name: str,
    industry: str,
    primary_goal: str,
    target_audience: str,
    brand_voice: str,
    additional_info: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
    tavily_api_key: Optional[str] = None,
    on_progress: Optional[Callable[[str], None]] = None,
) -> str:
    """
    Asynchronous implementation for campaign generation.
    
    Architecture:
    - POST /api/campaigns → creates DB record + fires background AI workflow
    - Backend responds 201 immediately with campaign.id
    - AI service runs LangGraph pipeline in a thread pool (2–4 min)
    - Progress is published to Redis → Socket.io (not accessible from MCP)
    - We poll GET /api/campaigns/:id at fixed intervals
    - We simulate progressive milestones using elapsed time to keep the
      chat interface alive and informative during the wait
    
    Args:
        on_progress: Optional callback for progress updates. When provided,
                     called with a human-readable status string at each poll.
                     FastMCP does not yet support server-side streaming, so
                     this is wired for future use when the MCP SDK supports it.
    """
    # 1. Build LLM configuration header with process env fallback
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
        
    tav_key = tavily_api_key or os.environ.get("TAVILY_API_KEY")
    if tav_key:
        llm_config["tavily_api_key"] = tav_key

    extra_headers: Dict[str, str] = {}
    if llm_config:
        extra_headers["x-llm-config"] = json.dumps(llm_config)

    # 2. Create the campaign — backend responds 201 immediately
    payload: Dict[str, Any] = {
        "projectId": project_id,
        "name": name,
        "brandName": brand_name,
        "industry": industry,
        "primaryGoal": primary_goal,
        "targetAudience": target_audience,
        "brandVoice": brand_voice,
    }
    if additional_info:
        payload["additionalInfo"] = additional_info

    logger.info(
        "Creating campaign | project=%s | brand=%s | goal=%s",
        project_id, brand_name, primary_goal
    )
    
    try:
        create_response = await client.post(
            "/api/campaigns", payload, extra_headers=extra_headers
        )
    except Exception as e:
        logger.error("Campaign creation failed: %s", str(e))
        raise RuntimeError(
            f"Failed to create campaign. Ensure AGENTMARK_API_URL and AGENTMARK_API_KEY "
            f"are correctly set. Error: {str(e)}"
        )

    campaign = create_response.get("campaign")
    if not campaign or not isinstance(campaign, dict) or "id" not in campaign:
        raise RuntimeError(
            f"Backend returned an unexpected response on campaign creation: {create_response}"
        )

    campaign_id: str = campaign["id"]
    campaign_name: str = campaign.get("name", name)
    
    logger.info(
        "Campaign created successfully | id=%s | name=%s | Starting polling loop.",
        campaign_id, campaign_name
    )

    # ── 3. Emit initial progress message ──────────────────────────────────────
    # FastMCP does not expose server-side streaming yet, but we prepare for it.
    # When it does, the on_progress callback will yield tokens to the chat UI.
    progress_message = (
        f"[AgentMark] Campaign **{campaign_name}** is being generated...\n"
        f"Campaign ID: `{campaign_id}`\n\n"
        "[AgentMark] [Manager] Analyzing campaign brief and dispatching agents..."
    )
    if on_progress:
        on_progress(progress_message)

    # 4. Poll until completion, timeout, or unrecoverable failure
    elapsed_secs: float = 0.0
    consecutive_failures: int = 0
    last_milestone_emitted: Optional[str] = None
    attempt: int = 0

    while elapsed_secs < CAMPAIGN_TIMEOUT_SECS:
        # Determine adaptive sleep duration based on elapsed runtime
        if elapsed_secs < 10.0:
            sleep_duration = 2.0
        elif elapsed_secs < 100.0:
            sleep_duration = 4.0
        else:
            sleep_duration = 1.5

        await asyncio.sleep(sleep_duration)
        elapsed_secs += sleep_duration
        attempt += 1

        # Emit simulated progress milestone if it changed
        current_milestone = _elapsed_milestone(elapsed_secs)
        if on_progress and current_milestone and current_milestone != last_milestone_emitted:
            on_progress(current_milestone)
            last_milestone_emitted = current_milestone

        logger.info(
            "Polling campaign status | id=%s | attempt=%d | elapsed=%.1fs | step_sleep=%.1fs",
            campaign_id, attempt, elapsed_secs, sleep_duration
        )

        # ── Fetch status via lightweight status endpoint ───────────────────────
        try:
            status_data = await client.get_campaign_status(campaign_id)
            consecutive_failures = 0  # Reset on success
        except asyncio.CancelledError:
            logger.info("Campaign status polling cancelled by client | id=%s | elapsed=%.1fs", campaign_id, elapsed_secs)
            raise
        except Exception as e:
            consecutive_failures += 1
            logger.warning(
                "Transient status check failure (%d/5) | campaign=%s | error=%s",
                consecutive_failures, campaign_id, str(e)
            )
            if consecutive_failures >= 5:
                logger.error(
                    "Unrecoverable connection loss polling campaign %s after 5 consecutive failures",
                    campaign_id
                )
                raise RuntimeError(
                    f"Lost connection to AgentMark API while waiting for campaign '{campaign_name}' "
                    f"(id={campaign_id}). "
                    f"The campaign may still be generating in the background. "
                    f"Check your AgentMark dashboard to see the result."
                )
            continue

        # ── Inspect campaign status ────────────────────────────────────────────
        raw_status = status_data.get("status", "processing")
        status = str(raw_status).lower() if raw_status is not None else "processing"

        if status == "completed":
            # Fetch full campaign payload ONCE upon completion for formatting
            campaign_details = await client.get_campaign(campaign_id)
            review_score = _extract_review_score(campaign_details)
            if on_progress and review_score is not None:
                on_progress(f"[AgentMark] Complete! Review Score: `{review_score}/100`")

            logger.info(
                "Campaign generation completed | id=%s | elapsed=%.1fs | score=%s",
                campaign_id, elapsed_secs, review_score
            )
            try:
                return format_campaign_brief(campaign_details)
            except Exception as fmt_err:
                logger.error("format_campaign_brief failed after successful generation | id=%s | error=%s", campaign_id, fmt_err)
                return (
                    f"# Campaign Generated Successfully\n\n"
                    f"**Campaign Name:** {campaign_name}\n"
                    f"**Campaign ID:** `{campaign_id}`\n"
                    f"**Review Score:** {review_score}/100\n\n"
                    f"Campaign is ready in AgentMark Dashboard at `/campaign/{campaign_id}/result`.\n"
                    f"(Report formatting error: {fmt_err})"
                )

        elif status == "awaiting_human_approval":
            # Fetch full campaign payload ONCE upon completion for formatting
            campaign_details = await client.get_campaign(campaign_id)
            logger.info(
                "Campaign reached human approval gate | id=%s | elapsed=%.1fs",
                campaign_id, elapsed_secs
            )
            try:
                return format_campaign_brief(campaign_details, awaiting_approval=True)
            except Exception as fmt_err:
                logger.error("format_campaign_brief (approval) failed | id=%s | error=%s", campaign_id, fmt_err)
                return (
                    f"# Campaign Awaiting Your Approval\n\n"
                    f"**Campaign Name:** {campaign_name}\n"
                    f"**Campaign ID:** `{campaign_id}`\n\n"
                    f"Review and approve at `/campaign/{campaign_id}/result`.\n"
                    f"(Report formatting error: {fmt_err})"
                )

        elif status in ("failed", "error", "cancelled"):
            error_msg = (
                campaign_details.get("aiError")
                or campaign_details.get("error")
                or "Unknown error occurred in the AI pipeline"
            )
            logger.error(
                "Campaign failed | id=%s | status=%s | error=%s",
                campaign_id, status, error_msg
            )
            raise RuntimeError(
                f"Campaign generation failed with status '{status}': {error_msg}"
            )
        
        # Still processing — continue polling
        logger.debug("Campaign still processing | id=%s | status=%s", campaign_id, status)

    # If polling window completes while AI pipeline is still running in background:
    return (
        f"# Campaign Generation In Progress\n\n"
        f"**Campaign Name:** {campaign_name}\n"
        f"**Campaign ID:** `{campaign_id}`\n"
        f"**Status:** `processing` (AI multi-agent workflow active)\n\n"
        f"The AI multi-agent workflow (Manager, Research, Strategy, Copywriter, Reviewer) is processing in the background.\n\n"
        f"**Next Steps:**\n"
        f"- Call `get_campaign(campaign_id=\"{campaign_id}\")` in 30 seconds to retrieve final brief.\n"
        f"- Or view live progress in AgentMark Dashboard at `/campaign/{campaign_id}/result`."
    )


def _extract_review_score(campaign_details: Dict[str, Any]) -> Optional[float]:
    """
    Safely extracts the reviewer score from campaign aiOutputs.
    Returns None if unavailable or unparseable.
    """
    try:
        # Try top-level reviewScore field first (set by backend on completion)
        score = campaign_details.get("reviewScore")
        if score is not None:
            return float(score)
        
        # Dig into aiOutputs for review_output score
        ai_outputs = campaign_details.get("aiOutputs") or {}
        if isinstance(ai_outputs, str):
            ai_outputs = json.loads(ai_outputs)
        
        review_output = ai_outputs.get("review_output") or {}
        if isinstance(review_output, str):
            review_output = json.loads(review_output)
        
        return float(review_output.get("overall_score", None))
    except Exception:
        return None
