"""
project.py — create_project Tool Implementation

Creates a new AgentMark project via POST /api/projects/ and returns
the project ID and name for use in subsequent generate_campaign calls.

This is typically the first tool called when a user does not yet have
a project_id available — it removes the need to open the dashboard
just to create a project before generating a campaign.
"""

import logging
from typing import Any, Dict, Optional

from ..client import AgentMarkClient

logger = logging.getLogger("agentmark-mcp-server")


async def create_project_impl(
    client: AgentMarkClient,
    name: str,
    description: Optional[str] = None,
) -> str:
    """
    Create a new AgentMark project and return its ID.

    Args:
        client:      Shared AgentMarkClient instance from the server lifespan.
        name:        Display name for the project (e.g. 'HealthPulse Q3 Campaigns').
        description: Optional description of the project.

    Returns:
        A formatted string with the project ID and confirmation message.
    """
    payload: Dict[str, Any] = {"name": name.strip()}
    if description and description.strip():
        payload["description"] = description.strip()

    logger.info("Creating project | name=%s", name)

    try:
        response = await client.post("/api/projects", payload)
    except Exception as exc:
        logger.error("Project creation failed: %s", exc)
        raise RuntimeError(
            "Failed to create project '%s'. "
            "Ensure AGENTMARK_API_URL and AGENTMARK_API_KEY are correctly set. "
            "Error: %s" % (name, exc)
        ) from exc

    project = response.get("project")
    if not isinstance(project, dict) or "id" not in project:
        raise RuntimeError(
            "Unexpected response shape from project creation. "
            "Expected { project: { id, name, ... } }, received: %s" % str(response)[:300]
        )

    project_id = project["id"]
    project_name = project.get("name", name)

    logger.info("Project created | id=%s | name=%s", project_id, project_name)

    # Sanitize pipe chars for Markdown table safety
    safe_name = project_name.replace("|", "\\|")

    return (
        "## ✅ Project Created Successfully\n\n"
        "| Field | Value |\n"
        "|---|---|\n"
        "| **Project Name** | %s |\n"
        "| **Project ID** | `%s` |\n\n"
        "**Next step:** Use this `project_id` with `generate_campaign` to start creating campaigns.\n"
        "```\n"
        "project_id: %s\n"
        "```"
    ) % (safe_name, project_id, project_id)
