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

import os
import logging
import asyncio
import json
import contextvars
from typing import Optional, Any, Dict

from fastapi import APIRouter, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from concurrent.futures import ThreadPoolExecutor
from pydantic import BaseModel

# Dedicated thread pool for executing long-running campaign workflows.
# This prevents campaign runs (which take 1-2 minutes) from exhausting FastAPI's default thread pool.
campaign_executor = ThreadPoolExecutor(max_workers=50, thread_name_prefix="campaign_workflow")

from agents.state import CampaignState
from schemas.campaign import (
    CampaignCreateRequest,
    CampaignCreateResponse,
    CampaignAcceptedResponse,
    AgentOutputs,
    try_parse_json,
    CopyVariantRequest,
)
from llm.factory import set_llm_config, get_llm_client
from utils.redis_publisher import publish_agent_event
from agents.copywriter import copywriter_agent

logger = logging.getLogger("agentmark.campaigns")
router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

# ── Background Task Strong References (prevents GC mid-execution) ─────────────
_background_tasks: set[asyncio.Task] = set()

# ── Concurrency Semaphore ──────────────────────────────────────────────────────

_campaign_semaphore: Optional[asyncio.Semaphore] = None

def get_campaign_semaphore() -> asyncio.Semaphore:
    global _campaign_semaphore
    if _campaign_semaphore is None:
        limit = int(os.getenv("MAX_CONCURRENT_CAMPAIGNS", "4"))
        _campaign_semaphore = asyncio.Semaphore(limit)
    return _campaign_semaphore


# ── Helpers ───────────────────────────────────────────────────────────────────
def _has_explicit_provider_keys(llm_config: dict | None) -> bool:
    """Return True only when the caller supplied at least one non-empty provider key."""
    if not isinstance(llm_config, dict):
        return False

    for key_name in ("openai_api_key", "gemini_api_key", "groq_api_key", "tavily_api_key"):
        value = llm_config.get(key_name)
        if isinstance(value, str):
            if any(part.strip() for part in value.split(",") if part.strip()):
                return True
        elif value:
            return True
    return False


def _require_explicit_provider_keys(llm_config: dict | None, context: str):
    """Utility validator to check explicit keys."""
    if _has_explicit_provider_keys(llm_config):
        return
    raise HTTPException(
        status_code=400,
        detail="Please add at least one valid API key in Settings > API Keys before launching a campaign.",
    )


def _run_workflow_isolated(workflow, state: CampaignState, llm_config: dict | None = None) -> CampaignState:
    """
    Executes _run_workflow within an isolated ContextVar context.
    Prevents LLM API keys or provider pool state from leaking across reused ThreadPoolExecutor threads.
    """
    ctx = contextvars.copy_context()
    return ctx.run(_run_workflow, workflow, state, llm_config)


def _run_workflow(workflow, state: CampaignState, llm_config: dict | None = None) -> CampaignState:
    """Invoke LangGraph workflow synchronously (called via threadpool)."""
    from llm.factory import set_llm_config
    from llm.rate_limiter import reset_rate_limiter
    reset_rate_limiter()  # Clear stale cooldowns from previous runs
    set_llm_config(llm_config)
    try:
        config = {
            "configurable": {"thread_id": state.campaign_id},
            "recursion_limit": 100
        }
        
        current_state = workflow.get_state(config)
        
        if current_state.values:
            next_nodes = current_state.next
            is_hitl_resume = (
                (next_nodes and "human_approval" in next_nodes)
                or state.human_approval_status in ("approved", "rejected")
                or current_state.values.get("awaiting_human_approval")
                or current_state.values.get("status") in ("awaiting_human_approval", "human_approved")
            )
            if is_hitl_resume and state.human_approval_status:
                logger.info("🔄 Resuming workflow from HITL human_approval checkpoint thread_id=%s | action=%s | target=%s",
                            state.campaign_id, state.human_approval_status, state.human_revision_target)
                workflow.update_state(
                    config,
                    {
                        "human_approval_status": state.human_approval_status,
                        "human_feedback": state.human_feedback,
                        "human_revision_target": state.human_revision_target,
                        "awaiting_human_approval": False,
                        "status": "processing" if state.human_approval_status == "approved" else f"{state.human_revision_target}_revision_required",
                        "error": "",
                    },
                    as_node="human_approval"
                )
            else:
                failed_node = next_nodes[0] if next_nodes else "unknown"
                logger.info("🔄 Resuming failed agent step '%s' directly from checkpoint | thread_id=%s", failed_node, state.campaign_id)
                workflow.update_state(
                    config,
                    {
                        "status": "processing",
                        "error": "",
                    }
                )
            result = workflow.invoke(None, config=config)
        else:
            logger.info("🚀 Initiating new campaign workflow run thread_id=%s", state.campaign_id)
            result = workflow.invoke(state, config=config)
            
        next_nodes = workflow.get_state(config).next
        
        if isinstance(result, dict):
            if next_nodes and "human_approval" in next_nodes:
                result["awaiting_human_approval"] = True
                result["status"] = "awaiting_human_approval"
            return CampaignState(**result)
        else:
            if next_nodes and "human_approval" in next_nodes:
                result.awaiting_human_approval = True
                result.status = "awaiting_human_approval"
            return result
    finally:
        set_llm_config(None)


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post(
    "/create",
    response_model=CampaignAcceptedResponse,
    status_code=202,
    summary="Schedule a new marketing campaign (fire-and-forget)",
    description=(
        "Schedules the LangGraph multi-agent pipeline and returns **202 Accepted** immediately.\n\n"
        "**Manager** → **Research** → **Strategy** → **Copywriter** → **Image Prompt** → **Reviewer** → **Publisher**\n\n"
        "Progress and terminal events are streamed to the Express backend via Redis Pub/Sub on "
        "`campaign:{campaign_id}`. The HTTP connection is not held open for the duration — this "
        "allows long-running campaigns (1-3 min) to complete without being killed by a reverse-proxy "
        "timeout (e.g. Render's ~100 s limit).\n\n"
        "**Terminal Redis events:**\n"
        "- `campaign_complete` — publisher finished, full outputs in payload\n"
        "- `awaiting_human_approval` — HITL gate reached, waiting for human decision\n"
        "- `failed` — workflow error or cancellation"
    ),
    responses={
        202: {"description": "Workflow accepted and scheduled"},
        400: {"description": "Validation error — check field values"},
        503: {"description": "Server is busy — try again shortly"},
    },
)
async def create_campaign(payload: CampaignCreateRequest, request: Request):
    """
    Accept campaign input, schedule `workflow.invoke(state)` as a background task,
    and return 202 immediately.

    The LangGraph workflow runs in `campaign_executor` (ThreadPoolExecutor).
    On completion it publishes terminal Redis events — these are the source of
    truth for the Express backend, not this HTTP response.
    """
    campaign_id = payload.campaign_id

    logger.info(
        "Campaign scheduled | id=%s | brand=%s | goal=%s | industry=%s",
        campaign_id,
        payload.brand_name,
        payload.primary_goal,
        payload.industry,
    )

    _require_explicit_provider_keys(payload.llm_config, context="campaign")

    def _to_str(val: Any) -> Optional[str]:
        if val is None:
            return None
        if isinstance(val, str):
            return val
        try:
            return json.dumps(val)
        except Exception:
            return str(val)

    state = CampaignState(
        campaign_id=campaign_id,
        campaign_name=payload.campaign_name,
        brand_name=payload.brand_name,
        industry=payload.industry,
        primary_goal=payload.primary_goal,
        target_audience=payload.target_audience,
        brand_voice=payload.brand_voice,
        brief=payload.brief,
        manager_output=_to_str(payload.manager_output),
        research_output=_to_str(payload.research_output),
        strategy_output=_to_str(payload.strategy_output),
        copy_output=_to_str(payload.copy_output),
        creative_hook_matrix_output=_to_str(payload.creative_hook_matrix_output),
        image_output=_to_str(payload.image_output),
        review_output=_to_str(payload.review_output),
        publisher_output=_to_str(payload.publisher_output),
        human_approval_status=payload.human_approval_status,
        human_feedback=payload.human_feedback,
        human_revision_target=payload.human_revision_target,
        research_revision_count=payload.research_revision_count or 0,
        strategy_revision_count=payload.strategy_revision_count or 0,
        copy_revision_count=payload.copy_revision_count or 0,
        creative_hook_matrix_revision_count=payload.creative_hook_matrix_revision_count or 0,
        image_revision_count=payload.image_revision_count or 0,
        client_memory_context=payload.client_memory_context,
    )

    workflow = request.app.state.workflow
    semaphore = get_campaign_semaphore()

    # Attempt to acquire the concurrency slot immediately (no wait).
    # A 15-second wait is preserved for busy bursts.
    try:
        await asyncio.wait_for(semaphore.acquire(), timeout=15.0)
    except asyncio.TimeoutError:
        logger.warning("Campaign rejected — semaphore full | id=%s", campaign_id)
        raise HTTPException(
            status_code=503,
            detail="Server is busy generating other campaigns. Please try again in a few minutes.",
        )

    # ── Background task ───────────────────────────────────────────────────────
    # The semaphore is released inside the task's finally block, keeping it
    # held for the entire duration of the workflow so the concurrency cap works.

    async def _run_campaign_background():
        loop = asyncio.get_running_loop()
        try:
            final_state = await loop.run_in_executor(
                campaign_executor, _run_workflow_isolated, workflow, state, payload.llm_config
            )
            logger.info(
                "Campaign workflow finished | id=%s | status=%s | finished=%s",
                campaign_id,
                final_state.status,
                final_state.workflow_finished,
            )

            outputs_dict = {
                "manager_output": try_parse_json(final_state.manager_output),
                "research_output": try_parse_json(final_state.research_output),
                "strategy_output": try_parse_json(final_state.strategy_output),
                "copy_output": try_parse_json(final_state.copy_output),
                "creative_hook_matrix_output": try_parse_json(final_state.creative_hook_matrix_output),
                "image_output": try_parse_json(final_state.image_output),
                "review_output": try_parse_json(final_state.review_output),
                "publisher_output": try_parse_json(final_state.publisher_output),
                "research_revision_count": final_state.research_revision_count or 0,
                "strategy_revision_count": final_state.strategy_revision_count or 0,
                "copy_revision_count": final_state.copy_revision_count or 0,
                "creative_hook_matrix_revision_count": final_state.creative_hook_matrix_revision_count or 0,
                "image_revision_count": final_state.image_revision_count or 0,
            }

            if final_state.status in ("error", "cancelled"):
                publish_agent_event(
                    campaign_id=campaign_id,
                    agent="system",
                    status="failed",
                    error=final_state.error or "Campaign cancelled by user",
                    extra={"outputs": outputs_dict},
                )
            elif final_state.awaiting_human_approval or final_state.status == "awaiting_human_approval":
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

        except Exception as exc:
            logger.error("Campaign workflow error | id=%s | error=%s", campaign_id, exc, exc_info=True)
            publish_agent_event(
                campaign_id=campaign_id,
                agent="system",
                status="failed",
                error=str(exc),
            )
        finally:
            semaphore.release()

    # Schedule the background task with a strong reference to prevent GC mid-execution
    task = asyncio.create_task(_run_campaign_background())
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return CampaignAcceptedResponse(
        campaign_id=campaign_id,
        status="accepted",
        message="Campaign workflow scheduled. Progress delivered via Redis Pub/Sub.",
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
    _require_explicit_provider_keys(payload.llm_config, context="prompt enhancement")
    ctx = contextvars.copy_context()

    def _enhance_worker():
        set_llm_config(payload.llm_config)
        try:
            client = get_llm_client()
            system_prompt = (
                "You are an elite Visual Creative Director — the kind whose campaigns win Cannes Lions, "
                "D&AD Black Pencils, and One Show Gold. You have 20 years of experience directing "
                "commercial shoots for Apple, Nike, Patagonia, and Porsche.\n\n"
                "Your OBSESSION is specificity. You despise generic stock photography. "
                "Every pixel must earn its place in the frame.\n\n"
                "You will receive an existing image generation prompt and optional user instructions.\n\n"
                "Your job is to TRANSFORM the prompt into a world-class, production-ready visual prompt "
                "following the MANDATORY 10-LAYER ARCHITECTURE:\n\n"
                "LAYER 1 — FROZEN MOMENT (30%): Specific person (age, ethnicity, defining detail) "
                "at a specific micro-second. Describe hands, face, body language. "
                "FORBIDDEN: 'A professional stands in...' or 'A person smiles at...'\n"
                "REQUIRED: 'A 44-year-old [ethnicity] [role] at the exact micro-second of [action] — "
                "[face expression], [hand position], [emotional state visible in posture]'\n\n"
                "LAYER 2 — ENVIRONMENT (15%): Specific location with architectural detail, "
                "time of day through light quality, at least one character-revealing object. "
                "Three depth planes: foreground texture, midground subject, background context.\n\n"
                "LAYER 3 — ATMOSPHERIC TEXTURE (10%): What you can FEEL in the air. "
                "Dust motes in light shafts, screen glow on glass, steam from a mug catching sidelight, "
                "rain-beaded windows diffusing city lights.\n\n"
                "LAYER 4 — SURFACE & MATERIAL (8%): What you can TOUCH. "
                "2-3 key textures: 'brushed brass lamp, matte black laptop, soft grey cashmere sleeve.' "
                "Fabric texture, material contrast.\n\n"
                "LAYER 5 — LIGHTING DESIGN (12%): Describe like a cinematographer. "
                "Key light position, shadow pattern, fill ratio, practical lights, color temperature. "
                "Match to mood: Rembrandt for authority, wraparound soft for warmth, "
                "split for drama, low-key for luxury.\n\n"
                "LAYER 6 — LENS PHYSICS (8%): Describe VISUAL EFFECTS, not equipment. "
                "'Medium telephoto compression, shallow depth of field, subject eyes razor-sharp, "
                "background dissolved into creamy luminous bokeh.' Match to format.\n\n"
                "LAYER 7 — COLOR SCIENCE (7%): Emotional color engineering. "
                "'Cool desaturated shadows, electric blue accent highlights, crisp clinical whites' "
                "or 'Rich velvety shadows, warm amber midtones, deeply restrained saturation.'\n\n"
                "LAYER 8 — COMPOSITION (5%): Intentional negative space for text overlay if needed. "
                "Rule of thirds, visual hierarchy, eye-path design.\n\n"
                "LAYER 9 — QUALITY ANCHORS (3%): "
                "'Award-winning advertising photography, Cannes Lions Grand Prix quality, "
                "campaign-hero-grade production value, hyper-realistic, obsessively detailed'\n\n"
                "LAYER 10 — SAFETY TAIL (2%): ALWAYS end with: "
                "'no text, no words, no letters, no typography, no logos, no watermarks, "
                "no labels, no captions, no signatures, no stamps, clean uncluttered composition'\n\n"
                "OUTPUT RULES:\n"
                "- Return ONLY the enhanced prompt text — no explanations, no preamble\n"
                "- Target 700-1000 characters of dense visual storytelling\n"
                "- Keep the original subject intent but elevate EVERY layer\n"
                "- If the original is abstract, convert to a specific frozen human moment\n"
                "- If user gave instructions, incorporate them naturally into the scene"
            )

            combined_text = f"{payload.prompt}\n{payload.user_input or ''}".lower()
            visual_markers = (
                "image", "visual", "photo", "photorealistic", "render", "cinematic",
                "dall-e", "midjourney", "stable diffusion", "aspect ratio", "lens",
                "lighting", "composition",
            )
            is_visual_prompt = any(marker in combined_text for marker in visual_markers)
            if is_visual_prompt:
                system_prompt = (
                    "You are an elite visual creative director. Transform the input into a "
                    "production-ready image-generation prompt with concrete subject, setting, "
                    "atmosphere, materials, lighting, composition, color, and quality anchors. "
                    "Preserve the original intent. Return only the enhanced visual prompt. "
                    "End with: no text, no words, no letters, no typography, no logos, no watermarks."
                )
            else:
                system_prompt = (
                    "You are a senior growth strategist and direct-response creative lead. "
                    "Enhance the user's campaign, ad, or marketing brief so it is clearer, "
                    "more actionable, and better suited for a multi-agent campaign generator. "
                    "Preserve the brand, audience, offer, goal, and constraints. Add useful "
                    "specificity around positioning, audience insight, desired channels, proof, "
                    "CTA direction, tone, and success criteria only when implied by the input. "
                    "Do not convert the brief into an image-generation prompt unless explicitly requested. "
                    "Return only the enhanced campaign/ad prompt text."
                )

            user_message = (
                f"Original prompt: {payload.prompt}\n"
                f"User instructions: {payload.user_input or 'None — enhance automatically'}"
            )

            full_prompt = f"{system_prompt}\n\n{user_message}"
            return client.generate(full_prompt)
        finally:
            set_llm_config(None)

    try:
        result = await run_in_threadpool(ctx.run, _enhance_worker)
        return EnhancePromptResponse(enhanced_prompt=result.strip())
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Prompt enhancement failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Prompt enhancement failed: {str(e)}")


class TestKeyRequest(BaseModel):
    provider: str  # "gemini" | "groq" | "openai" | "tavily"
    api_key: str


class TestKeyResponse(BaseModel):
    success: bool
    message: str


@router.post("/test-key", response_model=TestKeyResponse)
async def test_key_route(payload: TestKeyRequest):
    """
    Test an API key by making a minimal LLM call.
    """
    try:
        clean_key = (payload.api_key or "").strip().strip("'").strip('"')
        if not clean_key:
            return TestKeyResponse(success=False, message="API key is empty")

        if payload.provider.lower() == "tavily":
            from services.search_service import search_web
            result = await run_in_threadpool(
                search_web,
                "AgentMark marketing automation market trends",
                None,
                1,
                clean_key,
            )
            if result.success:
                return TestKeyResponse(success=True, message="Tavily API key is valid")
            return TestKeyResponse(success=False, message=result.error_message or "Tavily search failed")

        config = {f"{payload.provider.lower()}_api_key": clean_key}
        ctx = contextvars.copy_context()

        def _test_key_worker():
          set_llm_config(config)
          try:
            client = get_llm_client(payload.provider)
            return client.generate("Reply with a single word: ok", max_tokens=10)
          finally:
            set_llm_config(None)

        result = await run_in_threadpool(ctx.run, _test_key_worker)
        if result and result.strip():
            return TestKeyResponse(success=True, message="API key is valid")
        return TestKeyResponse(success=False, message="API returned empty response")
    except Exception as e:
        logger.warning("Key test failed for provider %s: %s", payload.provider, str(e))
        error_msg = str(e).lower()
        if "bad credentials" in error_msg or ("github" in error_msg and "401" in error_msg):
            return TestKeyResponse(
                success=False,
                message="GitHub PAT invalid/expired (401 Bad Credentials). Check token string or accept terms at github.com/marketplace/models."
            )
        if "quota" in error_msg or "rate" in error_msg or "429" in error_msg or "tokens per minute" in error_msg:
            return TestKeyResponse(success=False, message="Groq rate limit exceeded (TPM/RPM). Please try again in 1 minute.")
        if "invalid" in error_msg or "unauthorized" in error_msg or "401" in error_msg or "authentication" in error_msg or "incorrect api key" in error_msg:
            return TestKeyResponse(success=False, message="Invalid API key")
        if "denied" in error_msg or "403" in error_msg or "permission" in error_msg:
            return TestKeyResponse(success=False, message="Access denied — check API key permissions")
        return TestKeyResponse(success=False, message=f"Verification failed: {str(e)[:100]}")
    finally:
        set_llm_config(None)


@router.post("/generate-copy-variant")
async def generate_copy_variant_route(payload: CopyVariantRequest):
    """
    Generate a new copy variant for a specific channel using the copywriter agent.
    """
    _require_explicit_provider_keys(payload.llm_config, context="copy variant generation")
    set_llm_config(payload.llm_config)
    
    brand_name = payload.brand_name or ""
    industry = payload.industry or ""

    if not brand_name and payload.strategy_data:
        try:
            strat_json = json.loads(payload.strategy_data)
            if isinstance(strat_json, dict):
                brand_name = strat_json.get("brand_name") or strat_json.get("brand") or ""
                industry = industry or strat_json.get("industry") or ""
        except Exception:
            pass

    if not brand_name and payload.brief:
        try:
            brief_json = json.loads(payload.brief)
            if isinstance(brief_json, dict):
                brand_name = brief_json.get("brand_name") or brief_json.get("brand") or ""
                industry = industry or brief_json.get("industry") or ""
        except Exception:
            pass

    brand_name = brand_name or "Brand"
    industry = industry or "other"

    state = CampaignState(
        campaign_id=payload.campaign_id,
        campaign_name="Variant Generation",
        brand_name=brand_name,
        industry=industry,
        primary_goal="awareness",
        target_audience=payload.target_audience,
        brand_voice=payload.brand_voice,
        brief=payload.brief,
        strategy_output=payload.strategy_data,
        copy_output=payload.existing_copy,
        status="processing",
    )

    existing_variants_section = ""
    if payload.existing_copy:
        existing_variants_section = (
            "\n\nEXISTING VARIANTS (do not repeat these exactly or create near-duplicates):\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{payload.existing_copy}\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        )
    
    steering_instructions = (
        f"Steering instruction: <user_input>{payload.steering_note}</user_input>"
        if payload.steering_note
        else "Generate a fresh alternative with different angle/tone."
    )

    focus_group_section = ""
    if payload.focus_group_context:
        focus_group_section = (
            "\n\n⚠️ MANDATORY FOCUS GROUP REQUIREMENTS — Apply ALL of the following before writing:\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"{payload.focus_group_context}\n"
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            "Every single point above MUST be addressed in the copy. The copy will be re-evaluated by the same focus group.\n"
        )
    
    state.human_feedback = (
        f"Generate a NEW variant for {payload.channel} channel only. "
        f"{steering_instructions} "
        f"Make this meaningfully different from prior variants. "
        f"Keep other channels unchanged. "
        f"Return ONLY the {payload.channel} channel copy in the copies dict."
        f"{focus_group_section}"
        f"{existing_variants_section}"
    )
    ctx = contextvars.copy_context()

    def _copy_variant_worker():
        set_llm_config(payload.llm_config)
        try:
            return copywriter_agent(state)
        finally:
            set_llm_config(None)

    try:
        final_state = await run_in_threadpool(ctx.run, _copy_variant_worker)
        
        if not final_state.copy_output:
            raise HTTPException(status_code=500, detail="Copywriter failed to return output")
            
        try:
            parsed_copy = json.loads(final_state.copy_output)
        except Exception as e:
            logger.error("Failed to parse generated copy: %s", e, exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error") from e
            
        copies = parsed_copy.get("copies", {})
        
        from schemas.agent_outputs import Channel
        channel_enum_key = None
        for k in Channel:
            if k.value == payload.channel:
                channel_enum_key = k
                break
                
        channel_data = copies.get(channel_enum_key) if channel_enum_key else copies.get(payload.channel)
        
        if not channel_data:
            channel_data = parsed_copy.get(payload.channel)
            
        if not channel_data:
            raise HTTPException(
                status_code=500,
                detail=f"Copywriter output did not contain copy for channel '{payload.channel}'"
            )
            
        return {
            "channel": payload.channel,
            "copy_data": channel_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error in generate_copy_variant_route: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from e
    finally:
        set_llm_config(None)
