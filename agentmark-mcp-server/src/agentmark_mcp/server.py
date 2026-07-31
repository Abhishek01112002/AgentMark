"""
server.py — AgentMark MCP Server

Registers six AgentMark tools via FastMCP:
  - generate_campaign          : Generate a full multi-channel campaign
  - run_focus_group            : Simulate audience reaction to campaign copy
  - publish_to_channel         : Approve and trigger the Publisher agent
  - create_project             : Create a new project and return its ID
  - revise_copy_with_feedback  : Re-run copywriter with feedback + auto focus group
  - get_campaign_status        : Check campaign status, scores, and version history

Architecture:
  - A single AgentMarkClient is created at server startup and shared across
    all tool invocations (managed by the asynccontextmanager lifespan hook).
  - All tool functions perform input validation before any network I/O.
  - All error logging uses %-style lazy formatting (string is never built
    unless the log level is active — Python best practice).
"""

import asyncio
import logging
import sys
import uuid
from contextlib import asynccontextmanager
from typing import Callable, Optional, List, Dict, Any

from mcp.server.fastmcp import Context, FastMCP

from .client import AgentMarkClient
import importlib

_impl_cache: Dict[str, Any] = {}


def _get_impl(module_name: str, func_name: str) -> Any:
    """Thread-safe lazy loader for tool implementation functions."""
    cache_key = f"{module_name}:{func_name}"
    if cache_key not in _impl_cache:
        mod = importlib.import_module(f".tools.{module_name}", package="agentmark_mcp")
        _impl_cache[cache_key] = getattr(mod, func_name)
    return _impl_cache[cache_key]

# Configure standard stream logging to stderr (stdout is reserved for MCP protocol)
class UnbufferedStreamHandler(logging.StreamHandler):
    def emit(self, record):
        super().emit(record)
        self.flush()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[UnbufferedStreamHandler(sys.stderr)],
)
logger = logging.getLogger("agentmark-mcp-server")

# Singleton client managed by the server lifespan hook
_client_instance: Optional[AgentMarkClient] = None


@asynccontextmanager
async def mcp_lifespan(server: FastMCP):
    global _client_instance
    logger.info("Initializing AgentMark Client connection pool (lifespan start)")
    _client_instance = AgentMarkClient()
    try:
        yield
    finally:
        logger.info("Closing AgentMark Client connection pool (lifespan end)")
        if _client_instance:
            await _client_instance.close()
            _client_instance = None


mcp = FastMCP(
    "AgentMark",
    instructions="MCP server for the AgentMark AI marketing platform. Provides tools to generate campaigns, simulate focus groups, and publish to channels.",
    lifespan=mcp_lifespan,
)


def get_client() -> AgentMarkClient:
    """Return the active singleton client. Raises if called outside lifespan."""
    if _client_instance is None:
        raise RuntimeError(
            "AgentMarkClient is not initialised. "
            "Ensure the MCP server lifespan has started before calling tools."
        )
    return _client_instance


def _make_progress_callback(ctx: Context) -> Callable[[str], None]:
    """Build a sync progress callback that routes messages to the MCP host
    via Context.info(). Shared by all long-running tools to avoid DRY violation."""

    async def _emit(message: str) -> None:
        try:
            await ctx.info(message)
        except Exception:
            logger.debug("Context.info() unavailable for progress emit.")

    def _on_progress(message: str) -> None:
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(_emit(message))
        except RuntimeError:
            pass  # No running loop — progress is best-effort
        logger.info("%s", message)

    return _on_progress


def validate_uuid(id_str: str, param_name: str) -> None:
    """Raise ValueError if id_str is not a valid UUID string."""
    if not id_str or not id_str.strip():
        raise ValueError("Parameter '%s' cannot be empty." % param_name)
    try:
        uuid.UUID(id_str.strip())
    except ValueError:
        raise ValueError(
            "Parameter '%s' must be a valid UUID "
            "(e.g., '123e4567-e89b-12d3-a456-426614174000'). Received: '%s'"
            % (param_name, id_str)
        )


# ── Tool: generate_campaign ───────────────────────────────────────────────────

@mcp.tool()
async def generate_campaign(
    ctx: Context,
    project_id: str,
    name: str,
    brand_name: str,
    industry: str,
    primary_goal: str,
    target_audience: str,
    brand_voice: str,
    additional_info: str = "",
    openai_api_key: str = "",
    gemini_api_key: str = "",
    groq_api_key: str = "",
    tavily_api_key: str = "",
) -> str:
    """
    Generate a complete multi-channel marketing campaign with strategy, copy, and review.

    Prerequisites:
        Requires an active project_id. If not available, call 'create_project' first to generate one.

    Side Effects:
        Creates a campaign record in the database in 'processing' status.

    Expected Workflow & Next Action:
        1. After calling this tool, wait or poll 'get_campaign_status' until the state shifts from 'processing' to 'awaiting_human_approval'.
        2. Once ready, the recommended next step is to run 'run_focus_group' to simulate audience reception, or 'publish_to_channel' if copy is good.

    Args:
        project_id:      UUID of the project this campaign belongs to. Must call 'create_project' if you do not have one.
        name:            Display name for the campaign.
        brand_name:      Name of the brand being marketed.
        industry:        Industry sector (e.g. SaaS, E-commerce, Finance, Healthcare).
        primary_goal:    Campaign objective. Must be one of: awareness, lead_gen, sales, retention.
        target_audience: Description of the intended audience.
        brand_voice:     Tone and style directives (e.g. 'bold and direct', 'warm and expert').
        additional_info: Any supplementary context or constraints for the campaign.
        openai_api_key:  Optional OpenAI API key override (falls back to server env var).
        gemini_api_key:  Optional Gemini API key override.
        groq_api_key:    Optional Groq API key override.
        tavily_api_key:  Optional Tavily search key override.
    """
    validate_uuid(project_id, "project_id")

    goal_cleaned = primary_goal.strip().lower()
    goal_mapping = {
        "engagement": "awareness",
        "brand_awareness": "awareness",
        "lead_generation": "lead_gen",
        "leads": "lead_gen",
        "conversion": "sales",
        "conversions": "sales",
        "revenue": "sales",
        "loyalty": "retention",
        "re-engagement": "retention",
    }
    goal_cleaned = goal_mapping.get(goal_cleaned, goal_cleaned)
    allowed_goals = {"awareness", "lead_gen", "sales", "engagement", "retention"}
    if goal_cleaned not in allowed_goals:
        raise ValueError(
            "Invalid primary_goal '%s'. Must be one of: %s (or synonyms like 'engagement', 'conversion', 'lead_generation')"
            % (primary_goal, sorted(allowed_goals))
        )

    client = get_client()
    client.set_active_tool("generate_campaign")
    _on_progress = _make_progress_callback(ctx)

    try:
        impl = _get_impl("campaign", "generate_campaign_impl")
        return await impl(
            client=client,
            project_id=project_id.strip(),
            name=name.strip(),
            brand_name=brand_name.strip(),
            industry=industry.strip(),
            primary_goal=goal_cleaned,
            target_audience=target_audience.strip(),
            brand_voice=brand_voice.strip(),
            additional_info=additional_info if additional_info.strip() else None,
            openai_api_key=openai_api_key if openai_api_key.strip() else None,
            gemini_api_key=gemini_api_key if gemini_api_key.strip() else None,
            groq_api_key=groq_api_key if groq_api_key.strip() else None,
            tavily_api_key=tavily_api_key if tavily_api_key.strip() else None,
            on_progress=_on_progress,
        )
    except Exception as exc:
        logger.error("Error in generate_campaign tool: %s", exc)
        return (
            f"# Campaign Generation Diagnostics\n\n"
            f"**Status:** Issue encountered during campaign creation\n"
            f"**Details:** `{str(exc)}`\n\n"
            f"**Resolution:** The project remains active. You can retry `generate_campaign` or check progress via `get_campaign_status`."
        )
    finally:
        client.set_active_tool(None)


# ── Tool: run_focus_group ─────────────────────────────────────────────────────

@mcp.tool()
async def run_focus_group(
    ctx: Context,
    campaign_id: str,
    copy_text: str = "",
    negativity_bias: float = 0.3,
) -> str:
    """
    Simulate how your target audience would react to the campaign's generated copy using AI personas.

    Prerequisites:
        Requires a campaign_id in 'awaiting_human_approval' status. If campaign_id is unavailable, call 'generate_campaign' first.

    Side Effects:
        Persists focus group participant feedback, ratings, and recommendations in the database.

    Expected Workflow & Next Action:
        1. Examine the feedback scores and recommendations.
        2. If scores are poor, call 'revise_copy_with_feedback' using the recommendations to improve copy.
        3. If scores are high, call 'publish_to_channel' to approve and publish.

    Args:
        campaign_id:     UUID of the campaign to evaluate. Must generate campaign first.
        copy_text:       Optional explicit copy text to test. When empty, the system automatically extracts copy from the campaign's AI outputs.
        negativity_bias: Score weighting toward the worst persona score (0.0–1.0). Default: 0.3.
    """
    validate_uuid(campaign_id, "campaign_id")

    if not (0.0 <= negativity_bias <= 1.0):
        raise ValueError(
            "negativity_bias must be between 0.0 and 1.0. Received: %s" % negativity_bias
        )

    client = get_client()
    client.set_active_tool("run_focus_group")
    try:
        impl = _get_impl("focus_group", "run_focus_group_impl")
        return await impl(
            client=client,
            campaign_id=campaign_id.strip(),
            copy_text=copy_text if copy_text.strip() else None,
            negativity_bias=negativity_bias,
            on_progress=lambda msg: (logger.info("%s", msg), None)[1],
        )
    except Exception as exc:
        logger.error("Error in run_focus_group tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: publish_to_channel ──────────────────────────────────────────────────

@mcp.tool()
async def publish_to_channel(
    ctx: Context,
    campaign_id: str,
    openai_api_key: str = "",
    gemini_api_key: str = "",
    groq_api_key: str = "",
) -> str:
    """
    Approve a campaign and trigger the Publisher agent to produce the final distribution plan, calendar, and checklist.

    Prerequisites:
        Requires a campaign_id in 'awaiting_human_approval' status.

    Side Effects:
        Transitions campaign status to 'published' and runs the Publisher workflow.

    Expected Workflow & Next Action:
        This is a final step in the campaign lifecycle. After completion, check the final publication schedule.

    Args:
        campaign_id:     UUID of the campaign to approve and publish.
        openai_api_key:  Optional OpenAI API key override (falls back to server env var).
        gemini_api_key:  Optional Gemini API key override.
        groq_api_key:    Optional Groq API key override.
    """
    validate_uuid(campaign_id, "campaign_id")

    client = get_client()
    client.set_active_tool("publish_to_channel")
    try:
        impl = _get_impl("publish", "publish_to_channel_impl")
        return await impl(
            client=client,
            campaign_id=campaign_id.strip(),
            openai_api_key=openai_api_key if openai_api_key.strip() else None,
            gemini_api_key=gemini_api_key if gemini_api_key.strip() else None,
            groq_api_key=groq_api_key if groq_api_key.strip() else None,
            on_progress=lambda msg: (logger.info("%s", msg), None)[1],
        )
    except Exception as exc:
        logger.error("Error in publish_to_channel tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: create_project ──────────────────────────────────────────────────────

@mcp.tool()
async def create_project(
    ctx: Context,
    name: str,
    description: str = "",
) -> str:
    """
    Create a new AgentMark project container and return its project_id.

    Prerequisites:
        Always call this first if the user does not have a project_id or wishes to start a new campaign track.

    Side Effects:
        Registers a new project entity in the database.

    Expected Workflow & Next Action:
        After creating a project, use the returned project_id to call 'generate_campaign'.

    Args:
        name:        Display name for the project (e.g. 'HealthPulse Q3 Campaigns').
        description: Optional description of the project purpose.
    """
    if not name or not name.strip():
        raise ValueError("Project name cannot be empty.")

    client = get_client()
    client.set_active_tool("create_project")
    try:
        impl = _get_impl("project", "create_project_impl")
        return await impl(
            client=client,
            name=name.strip(),
            description=description if description.strip() else None,
        )
    except Exception as exc:
        logger.error("Error in create_project tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: revise_copy_with_feedback ──────────────────────────────────────────

@mcp.tool()
async def revise_copy_with_feedback(
    ctx: Context,
    campaign_id: str,
    feedback: str,
) -> str:
    """
    Revise campaign copy using feedback, and automatically run a follow-up focus group.

    Prerequisites:
        Requires campaign_id in 'awaiting_human_approval' status and feedback text.
        Best practice is to use recommendations from the 'run_focus_group' output as feedback.

    Side Effects:
        Updates campaign copy, increments copy version, and replaces focus group simulation score.

    Expected Workflow & Next Action:
        Review the new scores returned by the tool. If satisfied, call 'publish_to_channel'. Otherwise, call this tool again.

    Args:
        campaign_id: UUID of the campaign to revise.
        feedback:    Specific feedback. Use recommendations from the focus group report for best results.
    """
    validate_uuid(campaign_id, "campaign_id")

    if not feedback or not feedback.strip():
        raise ValueError("feedback cannot be empty. Provide specific revision instructions.")

    client = get_client()
    client.set_active_tool("revise_copy_with_feedback")
    _on_progress = _make_progress_callback(ctx)

    try:
        impl = _get_impl("revision", "revise_copy_with_feedback_impl")
        return await impl(
            client=client,
            campaign_id=campaign_id.strip(),
            feedback=feedback.strip(),
            on_progress=_on_progress,
        )
    except Exception as exc:
        logger.error("Error in revise_copy_with_feedback tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: revise_image_prompts ────────────────────────────────────────────────

@mcp.tool()
async def revise_image_prompts(
    ctx: Context,
    campaign_id: str,
    feedback: str,
) -> str:
    """
    Revise visual image prompts for a campaign using specific feedback or quality requirements.
    Use this when the user asks to re-run or improve image prompts (e.g. 'Ensure at least one prompt scores above 95 with photorealistic details').

    Prerequisites:
        Requires campaign_id in 'awaiting_human_approval' status and feedback text.

    Side Effects:
        Triggers the Image Prompt agent re-run with feedback and updates campaign image outputs.

    Args:
        campaign_id: UUID of the campaign to revise.
        feedback:    Specific instructions or quality criteria for the Image Prompt agent.
    """
    validate_uuid(campaign_id, "campaign_id")

    if not feedback or not feedback.strip():
        raise ValueError("feedback cannot be empty. Provide specific image prompt revision instructions.")

    client = get_client()
    client.set_active_tool("revise_image_prompts")
    _on_progress = _make_progress_callback(ctx)

    try:
        impl = _get_impl("revision", "revise_image_prompts_impl")
        return await impl(
            client=client,
            campaign_id=campaign_id.strip(),
            feedback=feedback.strip(),
            on_progress=_on_progress,
        )
    except Exception as exc:
        logger.error("Error in revise_image_prompts tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_campaign_status ─────────────────────────────────────────────────

@mcp.tool()
async def get_campaign_status(
    ctx: Context,
    campaign_id: str,
) -> str:
    """
    Get the current status, reviews, scores, and version history of a campaign.

    Prerequisites:
        Requires an existing campaign_id.

    Expected Workflow & Next Action:
        Call this periodically to check progress while a campaign is processing, or to inspect focus group scores.

    Args:
        campaign_id: UUID of the campaign to check.
    """
    validate_uuid(campaign_id, "campaign_id")

    client = get_client()
    client.set_active_tool("get_campaign_status")
    try:
        return await get_campaign_status_impl(
            client=client,
            campaign_id=campaign_id.strip(),
        )
    except Exception as exc:
        logger.error("Error in get_campaign_status tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_user_profile ───────────────────────────────────────────────────

@mcp.tool()
async def get_user_profile(
    ctx: Context,
) -> str:
    """
    Get the profile, email, and account details of the currently connected user.

    Prerequisites:
        None. Useful to call at the start of a session to verify authentication health.

    Expected Workflow & Next Action:
        Use the details to confirm the user context before running subsequent tasks.
    """
    client = get_client()
    client.set_active_tool("get_user_profile")
    try:
        profile = await client.get_user_profile()

        # Format the profile data into a clean Markdown table
        lines = [
            "# AgentMark User Profile",
            "",
            "| Detail | Value |",
            "|---|---|",
            f"| **User ID** | `{profile.get('id')}` |",
            f"| **Name** | {profile.get('name', 'N/A')} |",
            f"| **Email** | `{profile.get('email', 'N/A')}` |",
            f"| **Avatar URL** | {profile.get('avatarUrl', 'N/A')} |",
            f"| **Created At** | {profile.get('createdAt', 'N/A')} |",
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_user_profile tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: list_projects ───────────────────────────────────────────────────────

@mcp.tool()
async def list_projects(
    ctx: Context,
    force_refresh: bool = False,
) -> str:
    """
    List all projects created by or belonging to the authenticated user.

    Prerequisites:
        None. Useful to call when listing projects or checking project IDs.

    Expected Workflow & Next Action:
        Use the project IDs to view campaigns or create a new campaign under a project.
    """
    client = get_client()
    client.set_active_tool("list_projects")
    try:
        projects = await client.list_projects()
        if not projects:
            return "No projects found for this account."

        lines = [
            "# AgentMark Projects",
            "",
            "| Project ID | Name | Description | Created At |",
            "|---|---|---|---|",
        ]
        for p in projects:
            p_id = p.get("id", "N/A")
            name = p.get("name", "N/A")
            desc = p.get("description", "N/A") or "N/A"
            created = p.get("createdAt", "N/A")
            lines.append(f"| `{p_id}` | **{name}** | {desc} | {created} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in list_projects tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: list_campaigns ──────────────────────────────────────────────────────

@mcp.tool()
async def list_campaigns(
    ctx: Context,
    project_id: Optional[str] = None,
) -> str:
    """
    List all marketing campaigns created by or belonging to the authenticated user.
    Optionally filter campaigns under a specific project by supplying `project_id`.

    Args:
        project_id: Optional project UUID to filter campaigns for a specific project.

    Prerequisites:
        None. Call list_projects first if you need a specific project's ID.

    Expected Workflow & Next Action:
        Use the returned campaign IDs to view campaign status, inspect generated copy,
        or simulate focus groups.
    """
    client = get_client()
    client.set_active_tool("list_campaigns")
    try:
        campaigns = await client.list_campaigns(project_id=project_id)
        if not campaigns:
            return "No campaigns found for this account/project."

        lines = [
            "# AgentMark Campaigns",
            "",
            "| Campaign ID | Name / Product | Status | Target Channels | Created At |",
            "|---|---|---|---|---|",
        ]
        for c in campaigns:
            c_id = c.get("id", "N/A")
            product_name = c.get("productName") or c.get("name") or "Unnamed Campaign"
            status = c.get("status", "N/A")
            channels_raw = c.get("targetChannels") or []
            channels = ", ".join(channels_raw) if isinstance(channels_raw, list) else str(channels_raw)
            created = c.get("createdAt", "N/A")
            lines.append(f"| `{c_id}` | **{product_name}** | `{status}` | {channels or 'N/A'} | {created} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in list_campaigns tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: delete_campaign ─────────────────────────────────────────────────────

@mcp.tool()
async def delete_campaign(
    ctx: Context,
    campaign_id: str,
) -> str:
    """
    Delete a marketing campaign belonging to the authenticated user by its ID.

    Args:
        campaign_id: UUID of the campaign to delete.

    Prerequisites:
        Call list_campaigns to find the campaign_id.

    Expected Workflow & Next Action:
        Campaign will be removed. Call list_campaigns to verify updated list.
    """
    validate_uuid(campaign_id, "campaign_id")
    client = get_client()
    client.set_active_tool("delete_campaign")
    try:
        await client.delete_campaign(campaign_id)
        return f"Campaign `{campaign_id}` was successfully deleted."
    except Exception as exc:
        logger.error("Error in delete_campaign tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_memory_hub ──────────────────────────────────────────────────────

@mcp.tool()
async def get_memory_hub(
    ctx: Context,
    project_id: str,
) -> str:
    """
    Fetch the Memory Hub intelligence and historical learnings stored for a project.

    Returns preferred brand tones, top performing channels, average review scores,
    first-try approval rates, and past human feedback/rejection insights.

    Args:
        project_id: UUID of the project to fetch memory hub data for.

    Prerequisites:
        Call list_projects first to find the project_id.
    """
    validate_uuid(project_id, "project_id")
    client = get_client()
    client.set_active_tool("get_memory_hub")
    try:
        data = await client.get_memory_hub(project_id)
        count = data.get("count", 0)
        if count == 0 or not data.get("snapshots"):
            return f"Memory Hub for project `{project_id}` has no stored campaign snapshots yet. Snapshots are recorded automatically as campaigns complete."

        aggregated = data.get("aggregated") or {}
        lines = [
            f"# AgentMark Memory Hub — Project `{project_id}`",
            "",
            f"- **Total Snapshots Recorded**: {count}",
            f"- **Average Quality Score**: `{aggregated.get('avgScore', 'N/A')}/100`",
            f"- **First-Try Approval Rate**: `{aggregated.get('firstTryApprovalRate', 0)}%`",
            f"- **Preferred Brand Tones**: {', '.join(aggregated.get('preferredTones', [])) or 'N/A'}",
            f"- **Top Channels**: {', '.join(aggregated.get('preferredChannels', [])) or 'N/A'}",
            "",
            "### Campaign Memory Snapshots",
            "",
            "| Campaign Name | Voice | Score | First Try Approved | Date |",
            "|---|---|---|---|---|",
        ]
        for s in data.get("snapshots", []):
            name = s.get("campaignName", "N/A")
            voice = s.get("brandVoice", "N/A")
            score = s.get("score", "N/A")
            ft = "Yes" if s.get("approvedOnFirstTry") else "No"
            date = s.get("completedAt", "N/A")
            lines.append(f"| **{name}** | {voice} | `{score}` | {ft} | {date} |")

        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_memory_hub tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: update_project ──────────────────────────────────────────────────────

@mcp.tool()
async def update_project(
    ctx: Context,
    project_id: str,
    name: Optional[str] = None,
    description: Optional[str] = None,
) -> str:
    """
    Update details (name, description) of a project in AgentMark.

    Args:
        project_id: UUID of the project to update.
        name: New name for the project.
        description: New description for the project.
    """
    validate_uuid(project_id, "project_id")
    client = get_client()
    client.set_active_tool("update_project")
    try:
        await client.update_project(project_id, name=name, description=description)
        return f"Project `{project_id}` was successfully updated."
    except Exception as exc:
        logger.error("Error in update_project tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: delete_project ──────────────────────────────────────────────────────

@mcp.tool()
async def delete_project(
    ctx: Context,
    project_id: str,
) -> str:
    """
    Delete a project in AgentMark by its ID.

    Args:
        project_id: UUID of the project to delete.
    """
    validate_uuid(project_id, "project_id")
    client = get_client()
    client.set_active_tool("delete_project")
    try:
        await client.delete_project(project_id)
        return f"Project `{project_id}` was successfully deleted."
    except Exception as exc:
        logger.error("Error in delete_project tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_dashboard_stats ──────────────────────────────────────────────────

@mcp.tool()
async def get_dashboard_stats(
    ctx: Context,
    force_refresh: bool = False,
) -> str:
    """
    Get user dashboard stats including total projects, completed campaigns, running campaigns, success rates.
    """
    client = get_client()
    client.set_active_tool("get_dashboard_stats")
    try:
        data = await client.get_dashboard_stats()
        stats = data.get("stats") or data
        lines = [
            "# AgentMark User Dashboard Stats",
            "",
            f"- **Total Projects**: {stats.get('totalProjects', 0)}",
            f"- **Completed Campaigns**: {stats.get('completedCampaigns', 0)}",
            f"- **Running Campaigns**: {stats.get('runningCampaigns', 0)}",
            f"- **Total Campaigns Attempted**: {stats.get('totalReviewedCampaigns', 0)}",
            f"- **Average Review Score**: `{stats.get('avgReviewScore', 0.0)}/100`",
            f"- **Campaign Completion Rate**: `{stats.get('completionRate', 0)}%`"
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_dashboard_stats tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_memory_status ──────────────────────────────────────────────────

@mcp.tool()
async def get_memory_status(
    ctx: Context,
    project_id: str,
) -> str:
    """
    Get memory status of a project.

    Args:
        project_id: UUID of the project.
    """
    validate_uuid(project_id, "project_id")
    client = get_client()
    client.set_active_tool("get_memory_status")
    try:
        data = await client.get_memory_status(project_id)
        status = data.get("status") or data
        has_memory = status.get("hasMemory", False)
        campaign_count = status.get("campaignCount", 0)
        
        lines = [
            f"# Memory Status for Project `{project_id}`",
            "",
            f"- **Has Memory Snapshots**: {'Yes' if has_memory else 'No'}",
            f"- **Total Memory Snapshots**: {campaign_count}"
        ]

        if has_memory:
            # Enriched call to get memory hub details
            try:
                hub_data = await client.get_memory_hub(project_id)
                aggregated = hub_data.get("aggregated") or {}
                lines.extend([
                    "",
                    "### Aggregated Memory Insights",
                    f"- **Average Review Score**: `{aggregated.get('avgScore', 'N/A')}/100`",
                    f"- **First-Try Approval Rate**: `{aggregated.get('firstTryApprovalRate', 0)}%`",
                    f"- **Preferred Brand Tones**: {', '.join(aggregated.get('preferredTones', [])) or 'N/A'}",
                    f"- **Top Channels**: {', '.join(aggregated.get('preferredChannels', [])) or 'N/A'}"
                ])
            except Exception as hub_exc:
                logger.warning("Failed to enrich memory status with hub details: %s", hub_exc)
                
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_memory_status tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: generate_copy_variant ────────────────────────────────────────────────

@mcp.tool()
async def generate_copy_variant(
    ctx: Context,
    campaign_id: str,
    channel: str,
    steering_note: str,
) -> str:
    """
    Generate an alternate creative copy variant for a channel.

    Args:
        campaign_id: UUID of the campaign.
        channel: Channel to generate variant for (e.g., 'instagram', 'facebook', 'tiktok', 'email').
        steering_note: Steering instructions/guidance for generating the copy.
    """
    validate_uuid(campaign_id, "campaign_id")
    client = get_client()
    client.set_active_tool("generate_copy_variant")
    try:
        data = await client.generate_copy_variant(campaign_id, channel, steering_note)
        variant = data.get("variant")
        if not variant and isinstance(data.get("variants"), list) and len(data["variants"]) > 0:
            variant = data["variants"][-1]
        if not variant:
            variant = data

        headline = variant.get('headline') or variant.get('headline_copy') or 'N/A'
        body_copy = variant.get('body_copy') or variant.get('body') or 'N/A'
        ctas = variant.get('ctas') or variant.get('cta') or 'N/A'
        tags = variant.get('tags') or []

        lines = [
            f"# New Copy Variant for {channel.capitalize()} in Campaign `{campaign_id}`",
            "",
            f"**Headline / Subject**: {headline}",
            "",
            f"**Body Copy**:",
            f"{body_copy}",
            "",
            f"**CTAs**: {ctas}",
            f"**Tags**: {', '.join(tags)}"
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in generate_copy_variant tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: enhance_prompt ───────────────────────────────────────────────────────

@mcp.tool()
async def enhance_prompt(
    ctx: Context,
    prompt: str,
    user_input: Optional[str] = None,
) -> str:
    """
    Enhance a marketing prompt using AI suggestions.

    Args:
        prompt: The original raw prompt to enhance.
        user_input: Optional user constraints or instructions.
    """
    client = get_client()
    client.set_active_tool("enhance_prompt")
    try:
        data = await client.enhance_prompt(prompt, user_input)
        enhanced = data.get("enhancedPrompt") or data
        return f"### Enhanced Prompt:\n\n{enhanced}"
    except Exception as exc:
        logger.error("Error in enhance_prompt tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: list_personas ───────────────────────────────────────────────────────

@mcp.tool()
async def list_personas(
    ctx: Context,
) -> str:
    """
    List all focus group personas in the platform.
    """
    client = get_client()
    client.set_active_tool("list_personas")
    try:
        personas = await client.list_personas()
        lines = [
            "# Available Focus Group Personas",
            "",
            "| Persona ID | Name | Age | Occupation | Description |",
            "|---|---|---|---|---|",
        ]
        for p in personas:
            p_id = p.get("id", "N/A")
            name = p.get("name", "N/A")
            age = p.get("age", "N/A")
            occ = p.get("occupation", "N/A")
            desc = p.get("description", "N/A")
            lines.append(f"| `{p_id}` | **{name}** | {age} | {occ} | {desc} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in list_personas tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_notifications ────────────────────────────────────────────────────

@mcp.tool()
async def get_notifications(
    ctx: Context,
) -> str:
    """
    Fetch user notifications.
    """
    client = get_client()
    client.set_active_tool("get_notifications")
    try:
        notifications = await client.get_notifications()
        if not notifications:
            return "No notifications found."
        lines = [
            "# AgentMark Notifications",
            "",
            "| Notification ID | Title | Message | Read | Date |",
            "|---|---|---|---|---|",
        ]
        for n in notifications:
            n_id = n.get("id", "N/A")
            title = n.get("title", "N/A")
            msg = n.get("message", "N/A")
            read = "Yes" if n.get("isRead") else "No"
            date = n.get("createdAt", "N/A")
            lines.append(f"| `{n_id}` | **{title}** | {msg} | {read} | {date} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_notifications tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: mark_notification_read ──────────────────────────────────────────────

@mcp.tool()
async def mark_notification_read(
    ctx: Context,
    notification_id: str,
) -> str:
    """
    Mark a notification as read.

    Args:
        notification_id: UUID of the notification.
    """
    validate_uuid(notification_id, "notification_id")
    client = get_client()
    client.set_active_tool("mark_notification_read")
    try:
        await client.mark_notification_read(notification_id)
        return f"Notification `{notification_id}` was marked as read."
    except Exception as exc:
        logger.error("Error in mark_notification_read tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: mark_all_notifications_read ─────────────────────────────────────────

@mcp.tool()
async def mark_all_notifications_read(
    ctx: Context,
) -> str:
    """
    Mark all notifications as read.
    """
    client = get_client()
    client.set_active_tool("mark_all_notifications_read")
    try:
        await client.mark_all_notifications_read()
        return "All notifications marked as read."
    except Exception as exc:
        logger.error("Error in mark_all_notifications_read tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: list_api_keys ────────────────────────────────────────────────────────

@mcp.tool()
async def list_api_keys(
    ctx: Context,
    force_refresh: bool = False,
) -> str:
    """
    List developer API keys.
    """
    client = get_client()
    client.set_active_tool("list_api_keys")
    try:
        keys = await client.list_api_keys()
        if not keys:
            return "No developer API keys found."
        lines = [
            "# Developer API Keys",
            "",
            "| Key ID | Label | Status | Created At |",
            "|---|---|---|---|",
        ]
        for k in keys:
            k_id = k.get("id", "N/A")
            label = k.get("label", "N/A")
            active = "Active" if k.get("isActive") else "Inactive"
            date = k.get("createdAt", "N/A")
            lines.append(f"| `{k_id}` | **{label}** | {active} | {date} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in list_api_keys tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_mcp_activity ─────────────────────────────────────────────────────

@mcp.tool()
async def get_mcp_activity(
    ctx: Context,
    force_refresh: bool = False,
) -> str:
    """
    Fetch MCP activity logs.
    """
    client = get_client()
    client.set_active_tool("get_mcp_activity")
    try:
        activities = await client.get_mcp_activity()
        if not activities:
            return "No MCP activities found."
        lines = [
            "# MCP Activity Logs",
            "",
            "| Tool Name | Campaign ID | Created At |",
            "|---|---|---|",
        ]
        for a in activities:
            name = a.get("toolName", "N/A")
            c_id = a.get("campaignId") or "N/A"
            date = a.get("createdAt", "N/A")
            lines.append(f"| `{name}` | `{c_id}` | {date} |")
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in get_mcp_activity tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: fork_campaign ───────────────────────────────────────────────────────

@mcp.tool()
async def fork_campaign(
    ctx: Context,
    campaign_id: str,
    new_name: Optional[str] = None,
    target_audience: Optional[str] = None,
    brand_voice: Optional[str] = None,
    additional_info: Optional[str] = None,
    start_stage: Optional[str] = None,
) -> str:
    """
    Fork an existing campaign into a new version (e.g. v2) with selective stage continuation.
    Allows selective continuation: 'image_prompt' (regenerate visuals/images), 'copywriter' (rewrite copy), 'strategy' (new positioning), 'fresh' (restart from scratch).

    Parameters:
        campaign_id: The ID of the campaign to fork.
        new_name: Optional custom name for the new version (e.g., 'Leadership Acceleration v2').
        target_audience: Optional updated target audience brief.
        brand_voice: Optional updated brand voice or tone directive.
        additional_info: Optional custom guidance or strategic positioning directives.
        start_stage: Optional stage to branch from: 'image_prompt' (regenerates visuals), 'copywriter' (rewrites copy), 'strategy' (new strategy), or 'fresh' (restarts). Defaults to full output clone.
    """
    client = get_client()
    client.set_active_tool("fork_campaign")
    try:
        updated_brief = {}
        if target_audience:
            updated_brief["targetAudience"] = target_audience
        if brand_voice:
            updated_brief["brandVoice"] = brand_voice
        if additional_info:
            updated_brief["additionalInfo"] = additional_info

        res = await client.fork_campaign(
            campaign_id=campaign_id,
            new_name=new_name,
            updated_brief=updated_brief if updated_brief else None,
            start_stage=start_stage,
        )
        new_camp = res.get("campaign", {})
        lines = [
            "# Campaign Forked Successfully! 🌿",
            "",
            f"**Message**: {res.get('message')}",
            "",
            "| Field | Value |",
            "|---|---|",
            f"| **New Campaign ID** | `{new_camp.get('id')}` |",
            f"| **Name** | {new_camp.get('name')} |",
            f"| **Status** | {new_camp.get('status')} |",
            f"| **Target Audience** | {new_camp.get('targetAudience')} |",
            f"| **Revision Counter** | `0/3` Revisions Available |",
            "",
            "**Next Step**: You can now run focus groups or revise copy on this new version without hitting revision caps."
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in fork_campaign tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: reset_campaign_revisions ───────────────────────────────────────────

@mcp.tool()
async def reset_campaign_revisions(
    ctx: Context,
    campaign_id: str,
) -> str:
    """
    Reset revision counters back to 0 for a campaign without deleting existing outputs or history.

    Parameters:
        campaign_id: The ID of the campaign whose revision counter should be reset.

    Expected Workflow & Next Action:
        Use this tool when a campaign revision cap has been hit and you want to unlock 3 fresh revisions on the same campaign.
    """
    client = get_client()
    client.set_active_tool("reset_campaign_revisions")
    try:
        res = await client.reset_campaign_revisions(campaign_id=campaign_id)
        new_camp = res.get("campaign", {})
        lines = [
            "# Campaign Revision Budget Reset! 🔓",
            "",
            f"**Message**: {res.get('message')}",
            "",
            "| Field | Value |",
            "|---|---|",
            f"| **Campaign ID** | `{new_camp.get('id')}` |",
            f"| **Name** | {new_camp.get('name')} |",
            f"| **Copy Revisions Used** | `{new_camp.get('copyRevisionCount', 0)}/3` |",
            "",
            "**Next Step**: You can now invoke `revise_copy_with_feedback` to continue refining the campaign copy."
        ]
        return "\n".join(lines)
    except Exception as exc:
        logger.error("Error in reset_campaign_revisions tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: submit_human_approval ───────────────────────────────────────────────
@mcp.tool()
async def submit_human_approval(
    campaign_id: str,
    decision: str,
    feedback: Optional[str] = None,
) -> str:
    """
    Submit human approval decision (approved or rejected) for a campaign paused at the HITL gate.

    Parameters:
        campaign_id: The ID of the campaign awaiting human approval.
        decision: Must be 'approved' or 'rejected'.
        feedback: Optional notes or instructions.
    """
    client = get_client()
    client.set_active_tool("submit_human_approval")
    try:
        res = await submit_human_approval_impl(client, campaign_id, decision, feedback)
        return f"# Human Approval Submitted ✅\n\n- **Campaign ID**: `{campaign_id}`\n- **Decision**: `{decision}`\n- **Status**: {res.get('status', 'updated')}"
    except Exception as exc:
        logger.error("Error in submit_human_approval tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: request_targeted_revision ──────────────────────────────────────────
@mcp.tool()
async def request_targeted_revision(
    campaign_id: str,
    target_agent: str,
    feedback: str,
) -> str:
    """
    Re-run a specific upstream agent ('research', 'strategy', 'copywriter', 'image_prompt') with targeted feedback.

    Parameters:
        campaign_id: The ID of the campaign.
        target_agent: Target agent step to re-run.
        feedback: Detailed revision feedback.
    """
    client = get_client()
    client.set_active_tool("request_targeted_revision")
    try:
        res = await request_targeted_revision_impl(client, campaign_id, target_agent, feedback)
        return f"# Targeted Revision Requested 🔄\n\n- **Campaign ID**: `{campaign_id}`\n- **Target Agent**: `{target_agent}`\n- **Status**: {res.get('status', 'processing')}"
    except Exception as exc:
        logger.error("Error in request_targeted_revision tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: update_client_memory ───────────────────────────────────────────────
@mcp.tool()
async def update_client_memory(
    project_id: str,
    brand_voice: Optional[str] = None,
    target_audience: Optional[str] = None,
    key_insights: Optional[str] = None,
) -> str:
    """
    Update brand guidelines, tone of voice, or target audience context in the project Memory Hub.

    Parameters:
        project_id: Target project ID.
        brand_voice: Updated brand tone guidelines.
        target_audience: Updated audience persona notes.
        key_insights: Strategic brand takeaways.
    """
    client = get_client()
    client.set_active_tool("update_client_memory")
    try:
        res = await update_client_memory_impl(client, project_id, brand_voice, target_audience, key_insights)
        return f"# Client Memory Hub Updated 🧠\n\n- **Project ID**: `{project_id}`\n- **Status**: Updated successfully"
    except Exception as exc:
        logger.error("Error in update_client_memory tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: clear_client_memory ────────────────────────────────────────────────
@mcp.tool()
async def clear_client_memory(project_id: str) -> str:
    """
    Reset or clear the Memory Hub context for a specific project.
    """
    client = get_client()
    client.set_active_tool("clear_client_memory")
    try:
        res = await clear_client_memory_impl(client, project_id)
        return f"# Client Memory Cleared 🧹\n\n- **Project ID**: `{project_id}`\n- **Status**: Memory context reset"
    except Exception as exc:
        logger.error("Error in clear_client_memory tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: export_campaign_pdf ─────────────────────────────────────────────────
@mcp.tool()
async def export_campaign_pdf(campaign_id: str) -> str:
    """
    Export full campaign strategy, copy, visual prompts, and content calendar as a PDF document.
    """
    client = get_client()
    client.set_active_tool("export_campaign_pdf")
    try:
        res = await export_campaign_pdf_impl(client, campaign_id)
        return f"# Campaign PDF Export Ready 📄\n\n- **Campaign ID**: `{campaign_id}`\n- **Download URL**: {res.get('downloadUrl', 'Available in campaign exports tab')}"
    except Exception as exc:
        logger.error("Error in export_campaign_pdf tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: export_campaign_json ────────────────────────────────────────────────
@mcp.tool()
async def export_campaign_json(campaign_id: str) -> str:
    """
    Export campaign creative assets and schedule payload as clean JSON for CMS / Buffer / Zapier integration.
    """
    client = get_client()
    client.set_active_tool("export_campaign_json")
    try:
        res = await export_campaign_json_impl(client, campaign_id)
        return f"# Campaign JSON Export Ready 📦\n\n```json\n{res}\n```"
    except Exception as exc:
        logger.error("Error in export_campaign_json tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_publishing_schedule ─────────────────────────────────────────────
@mcp.tool()
async def get_publishing_schedule(campaign_id: str) -> str:
    """
    Retrieve the 4-week content calendar publishing timeline and channel readiness status.
    """
    client = get_client()
    client.set_active_tool("get_publishing_schedule")
    try:
        res = await get_publishing_schedule_impl(client, campaign_id)
        return f"# 4-Week Publishing Schedule 📅\n\n```json\n{res}\n```"
    except Exception as exc:
        logger.error("Error in get_publishing_schedule tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: verify_channel_credentials ─────────────────────────────────────────
@mcp.tool()
async def verify_channel_credentials(
    campaign_id: str,
    channels: Optional[List[str]] = None,
) -> str:
    """
    Test connected social media and email publishing API credentials for a campaign.
    """
    client = get_client()
    client.set_active_tool("verify_channel_credentials")
    try:
        res = await verify_channel_credentials_impl(client, campaign_id, channels)
        return f"# Channel Credentials Verification 🔗\n\n- **Campaign ID**: `{campaign_id}`\n- **Status**: {res.get('status', 'Verified')}"
    except Exception as exc:
        logger.error("Error in verify_channel_credentials tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: generate_image_asset ────────────────────────────────────────────────
@mcp.tool()
async def generate_image_asset(
    prompt: str,
    aspect_ratio: Optional[str] = "1:1",
) -> str:
    """
    Directly generate a visual image asset from a prompt using Gemini or DALL-E.
    """
    client = get_client()
    client.set_active_tool("generate_image_asset")
    try:
        res = await generate_image_asset_impl(client, prompt, aspect_ratio)
        return f"# Visual Asset Generated 🖼️\n\n- **Image URL**: {res.get('imageUrl', 'Generated successfully')}"
    except Exception as exc:
        logger.error("Error in generate_image_asset tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: get_campaign_analytics ──────────────────────────────────────────────
@mcp.tool()
async def get_campaign_analytics(campaign_id: str) -> str:
    """
    Fetch projected reach, estimated CTR, conversion targets, and performance ROI metrics for a published campaign.
    """
    client = get_client()
    client.set_active_tool("get_campaign_analytics")
    try:
        res = await get_campaign_analytics_impl(client, campaign_id)
        return f"# Campaign Analytics & Metrics 📊\n\n```json\n{res}\n```"
    except Exception as exc:
        logger.error("Error in get_campaign_analytics tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: synthesize_brand_memory_intelligence ────────────────────────────────
@mcp.tool()
async def synthesize_brand_memory_intelligence(project_id: str) -> str:
    """
    Synthesize implicit brand voice guidelines, tone rules, and winning positioning patterns from top-performing historical campaigns into the project Memory Hub.
    """
    client = get_client()
    client.set_active_tool("synthesize_brand_memory_intelligence")
    try:
        res = await synthesize_brand_memory_impl(client, project_id)
        return f"# Brand Memory Intelligence Synthesized 🧠\n\n- **Project**: `{project_id}`\n- **Status**: {res.get('message', 'Synthesized')}\n\n```json\n{res}\n```"
    except Exception as exc:
        logger.error("Error in synthesize_brand_memory_intelligence tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


# ── Tool: compare_campaign_performance_vectors ───────────────────────────────
@mcp.tool()
async def compare_campaign_performance_vectors(
    target_campaign_id: str,
    baseline_campaign_id: Optional[str] = None,
) -> str:
    """
    Perform comparative performance analysis between a target campaign and a baseline top-performing campaign to isolate copy structure, tone deltas, and review score differences.
    """
    client = get_client()
    client.set_active_tool("compare_campaign_performance_vectors")
    try:
        res = await compare_campaigns_impl(client, target_campaign_id, baseline_campaign_id)
        return f"# Campaign Performance Vector Comparison 📈\n\n- **Target Campaign**: `{target_campaign_id}`\n\n```json\n{res}\n```"
    except Exception as exc:
        logger.error("Error in compare_campaign_performance_vectors tool: %s", exc)
        raise
    finally:
        client.set_active_tool(None)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
