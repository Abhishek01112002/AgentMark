"""
Campaign Routes

POST /campaigns/create  -  Accepts campaign input, runs the full LangGraph
                           multi-agent pipeline, and returns all agent outputs.

Redis Integration:
  - The `campaign_id` from Express (PostgreSQL UUID) is passed in the request payload.
  - During workflow execution, each agent node publishes a progress event to Redis.
  - After workflow.invoke() returns, this route publishes the final terminal event
    (campaign_complete or awaiting_human_approval) which includes all agent outputs
    so Express can update the PostgreSQL record without a direct HTTP callback.
"""

import json
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
from llm.factory import set_llm_config, get_llm_client
from utils.redis_publisher import publish_agent_event
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("agentmark.campaigns")
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _run_workflow(workflow, state: CampaignState) -> CampaignState:
    """Invoke LangGraph workflow synchronously (called via threadpool)."""
    result = workflow.invoke(state, config={"recursion_limit": 60})
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
        "**Manager** \u2192 **Research** \u2192 **Strategy** \u2192 **Copywriter** \u2192 **Image Prompt** \u2192 **Reviewer** \u2192 **Publisher**\n\n"
        "The workflow pauses at the Human-in-the-Loop approval gate "
        "(`awaiting_human_approval: true`) if manual review is required. "
        "When `workflow_finished: true` the Publisher has executed successfully.\n\n"
        "**Redis Live Updates:** If `campaign_id` (PostgreSQL UUID) is provided in the "
        "request body, each agent completion is published to the Redis channel "
        "`campaign:{campaign_id}` for real-time frontend status updates."
    ),
    responses={
        200: {"description": "Workflow completed (or paused at HITL gate)"},
        422: {"description": "Validation error \u2014 check field values and enums"},
        500: {"description": "Unexpected error during agent execution"},
    },
)

async def create_campaign(payload: CampaignCreateRequest, request: Request):
    """
    Accept campaign input, invoke `workflow.invoke(state)`, return all agent outputs.

    The LangGraph workflow is a long-running synchronous operation (1-3 min).
    It is executed in a thread pool to avoid blocking the async event loop.

    campaign_id flow:
      - Express creates the campaign in PostgreSQL and gets a DB UUID.
      - Express passes that UUID as `campaign_id` in this request.
      - We store it in CampaignState so every graph node can publish to the
        correct Redis channel without needing to know the channel name.
    """
    campaign_id = payload.campaign_id

    logger.info(
        "Campaign run started | id=%s | brand=%s | goal=%s | industry=%s",
        campaign_id,
        payload.brand_name,
        payload.primary_goal,
        payload.industry,
    )

    # Build initial state — campaign_id flows through all nodes for Redis publishing.
    state = CampaignState(
        campaign_id=campaign_id,
        campaign_name=payload.campaign_name,
        brand_name=payload.brand_name,
        industry=payload.industry,
        primary_goal=payload.primary_goal,
        target_audience=payload.target_audience,
        brand_voice=payload.brand_voice,
        brief=payload.brief,
        manager_output=payload.manager_output,
        research_output=payload.research_output,
        strategy_output=payload.strategy_output,
        copy_output=payload.copy_output,
        image_output=payload.image_output,
        review_output=payload.review_output,
        publisher_output=payload.publisher_output,
        human_approval_status=payload.human_approval_status,
        human_feedback=payload.human_feedback,
        human_revision_target=payload.human_revision_target,
        # HITL revision counts from DB
        research_revision_count=payload.research_revision_count or 0,
        strategy_revision_count=payload.strategy_revision_count or 0,
        copy_revision_count=payload.copy_revision_count or 0,
        image_revision_count=payload.image_revision_count or 0,
    )

    # Retrieve the pre-built workflow from app.state (set at startup via lifespan)
    workflow = request.app.state.workflow

    try:
        set_llm_config(payload.llm_config)
        # Run blocking LangGraph call in a thread pool — never block the event loop
        final_state = await run_in_threadpool(_run_workflow, workflow, state)
    except Exception as exc:
        logger.error("Workflow error | id=%s | error=%s", campaign_id, exc, exc_info=True)
        # Publish failure event to Redis so Express can update DB status.
        publish_agent_event(
            campaign_id=campaign_id,
            agent="system",
            status="failed",
            error=str(exc),
        )
        raise HTTPException(status_code=500, detail=f"Workflow execution failed: {exc}") from exc

    logger.info(
        "Campaign run finished | id=%s | status=%s | finished=%s",
        campaign_id,
        final_state.status,
        final_state.workflow_finished,
    )

    # ── Publish terminal Redis event ──────────────────────────────────────────
    # This is the single place where the final/terminal event is published,
    # keeping graph node publishes lightweight (progress ticks only).
    # The full agent outputs are included so Express can update PostgreSQL
    # without needing a synchronous HTTP response.
    outputs_dict = {
        "manager_output": try_parse_json(final_state.manager_output),
        "research_output": try_parse_json(final_state.research_output),
        "strategy_output": try_parse_json(final_state.strategy_output),
        "copy_output": try_parse_json(final_state.copy_output),
        "image_output": try_parse_json(final_state.image_output),
        "review_output": try_parse_json(final_state.review_output),
        "publisher_output": try_parse_json(final_state.publisher_output),
        # Include revision counts for DB persistence
        "research_revision_count": final_state.research_revision_count or 0,
        "strategy_revision_count": final_state.strategy_revision_count or 0,
        "copy_revision_count": final_state.copy_revision_count or 0,
        "image_revision_count": final_state.image_revision_count or 0,
    }

    if final_state.awaiting_human_approval:
        publish_agent_event(
            campaign_id=campaign_id,
            agent="system",
            status="awaiting_human_approval",
            extra={"outputs": outputs_dict},
        )
    else:
        publish_agent_event(
            campaign_id=campaign_id,
            agent="system",
            status="campaign_complete",
            extra={"outputs": outputs_dict, "workflow_finished": final_state.workflow_finished},
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


class EnhancePromptRequest(BaseModel):
    prompt: str
    user_input: Optional[str] = None
    llm_config: Optional[dict] = None


class EnhancePromptResponse(BaseModel):
    enhanced_prompt: str


@router.post("/enhance-prompt", response_model=EnhancePromptResponse)
async def enhance_prompt_route(payload: EnhancePromptRequest):
    """
    Enhance a prompt using the configured LLM and optional user instructions.
    """
    set_llm_config(payload.llm_config)
    try:
        client = get_llm_client()
    except Exception as e:
        logger.error("Failed to initialize LLM for prompt enhancement: %s", e)
        raise HTTPException(status_code=400, detail=f"No LLM configured or API key invalid: {str(e)}")

    system_prompt = (
        "You are an expert AI image prompt engineer "
        "specializing in DALL-E 3 and Midjourney prompts.\n\n"
        "You will receive:\n"
        "1. An existing image generation prompt\n"
        "2. Optional user instructions\n\n"
        "Your job:\n"
        "- Enhance the prompt professionally\n"
        "- Add missing technical specs (lighting, lens, "
        "composition, negative prompts)\n"
        "- If user gave instructions, incorporate them naturally\n"
        "- Keep the original intent and subject intact\n"
        "- Return ONLY the enhanced prompt text, nothing else\n"
        "- No explanations, no preamble, just the prompt"
    )

    user_message = (
        f"Original prompt: {payload.prompt}\n"
        f"User instructions: {payload.user_input or 'None — enhance automatically'}"
    )

    full_prompt = f"{system_prompt}\n\n{user_message}"

    try:
        result = await run_in_threadpool(client.generate, full_prompt)
        return EnhancePromptResponse(enhanced_prompt=result.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prompt enhancement failed: {str(e)}")
