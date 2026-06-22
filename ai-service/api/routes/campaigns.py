"""
Campaign Routes

POST /campaigns/create  -  Accepts campaign input, runs the full LangGraph
                           multi-agent pipeline, and returns all agent outputs.
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool

from agents.state import CampaignState
from schemas.campaign import (
    CampaignCreateRequest,
    CampaignCreateResponse,
    AgentOutputs,
    try_parse_json,
)

logger = logging.getLogger("agentmark.campaigns")
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_workflow(workflow, state: CampaignState) -> CampaignState:
    """Invoke LangGraph workflow synchronously (called via threadpool)."""
    result = workflow.invoke(state)
    if isinstance(result, dict):
        return CampaignState(**result)
    return result


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post(
    "/create",
    response_model=CampaignCreateResponse,
    summary="Create a new marketing campaign",
    description=(
        "Runs the complete LangGraph multi-agent pipeline for the given input:\n\n"
        "**Manager** → **Research** → **Strategy** → **Copywriter** → **Image Prompt** → **Reviewer** → **Publisher**\n\n"
        "The workflow pauses at the Human-in-the-Loop approval gate "
        "(`awaiting_human_approval: true`) if manual review is required. "
        "When `workflow_finished: true` the Publisher has executed successfully."
    ),
    responses={
        200: {"description": "Workflow completed (or paused at HITL gate)"},
        422: {"description": "Validation error — check field values and enums"},
        500: {"description": "Unexpected error during agent execution"},
    },
)

async def create_campaign(payload: CampaignCreateRequest, request: Request):
    """
    Accept campaign input, invoke `workflow.invoke(state)`, return all agent outputs.

    The LangGraph workflow is a long-running synchronous operation (1–3 min).
    It is executed in a thread pool to avoid blocking the async event loop.
    """
    campaign_id = str(uuid.uuid4())

    logger.info(
        "Campaign run started | id=%s | brand=%s | goal=%s | industry=%s",
        campaign_id,
        payload.brand_name,
        payload.primary_goal,
        payload.industry,
    )

    # Build initial state
    state = CampaignState(
        campaign_name=payload.campaign_name,
        brand_name=payload.brand_name,
        industry=payload.industry,
        primary_goal=payload.primary_goal,
        target_audience=payload.target_audience,
        brand_voice=payload.brand_voice,
        brief=payload.brief,
    )

    # Retrieve the pre-built workflow from app.state (set at startup via lifespan)
    workflow = request.app.state.workflow

    try:
        # Run blocking LangGraph call in a thread pool — never block the event loop
        final_state = await run_in_threadpool(_run_workflow, workflow, state)
    except Exception as exc:
        logger.error("Workflow error | id=%s | error=%s", campaign_id, exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {exc}") from exc

    logger.info(
        "Campaign run finished | id=%s | status=%s | finished=%s",
        campaign_id,
        final_state.status,
        final_state.workflow_finished,
    )

    return CampaignCreateResponse(
        campaign_id=campaign_id,
        status=final_state.status,
        campaign_name=final_state.campaign_name,
        brand_name=final_state.brand_name,
        error=final_state.error,
        awaiting_human_approval=final_state.awaiting_human_approval,
        workflow_finished=final_state.workflow_finished,
        outputs=AgentOutputs(
            manager_output=try_parse_json(final_state.manager_output),
            research_output=try_parse_json(final_state.research_output),
            strategy_output=try_parse_json(final_state.strategy_output),
            copy_output=try_parse_json(final_state.copy_output),
            image_output=try_parse_json(final_state.image_output),
            review_output=try_parse_json(final_state.review_output),
            publisher_output=try_parse_json(final_state.publisher_output),
        ),
    )