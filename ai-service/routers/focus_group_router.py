"""
Focus Group Router — AgentMark AI Service

Provides two production-grade endpoints for synthetic focus group simulation:

  POST /focus-group/simulate  — Full LLM-driven persona critique simulation.
                                Falls back gracefully to mock data when the
                                agents.focus_group module is unavailable (sandbox
                                or import-time environment failures).

  POST /focus-group/interview — Fully deterministic, zero-cost persona interview.
                                Generates realistic 2-sentence responses from raw
                                persona dicts using rule-based sentiment detection.
                                Protected by an 8-second asyncio timeout guard.

Windows cp1252 note: all log messages use ASCII-only strings (no emoji, no smart
quotes) so that the log handler never raises UnicodeEncodeError.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import time
from typing import List, Literal, Optional

import redis
from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator

# ── Schema imports (always available — no LLM dependency) ─────────────────────
from schemas.simulation import (
    ActionableRecommendation,
    FocusGroupReport,
    PersonaCritique,
)

# ── Optional LLM agent import (graceful degradation on ImportError) ────────────
try:
    from agents.focus_group import run_focus_group_simulation as _run_simulation

    _SIMULATION_AVAILABLE = True
except ImportError as _import_exc:  # pragma: no cover
    _run_simulation = None  # type: ignore[assignment]
    _SIMULATION_AVAILABLE = False
    # Logged at module level; logger is configured later — store message for now.
    _IMPORT_ERROR_MSG = str(_import_exc)
else:
    _IMPORT_ERROR_MSG = ""

logger = logging.getLogger(__name__)

if not _SIMULATION_AVAILABLE:
    logger.warning(
        "agents.focus_group could not be imported (%s). "
        "POST /focus-group/simulate will return mock data.",
        _IMPORT_ERROR_MSG,
    )

# ── Router ──────────────────────────────────────────────────────────────────
router = APIRouter(prefix="/focus-group", tags=["Focus Group"])

# ── Estimated token cost per simulate call (rough constant for header) ──────────
_SIMULATE_TOKEN_ESTIMATE = "~4200"
_SIMULATE_TOKEN_CACHED = "CACHED (0 tokens)"

# ── Focus Group simulation result cache ────────────────────────────────
# TTL = 3 days: copy rarely changes within a session; personas are per brand.
_FG_CACHE_TTL = 259200  # 3 days in seconds
_fg_redis_pool: Optional[redis.ConnectionPool] = None


def _get_fg_redis_client() -> Optional[redis.Redis]:
    """Returns a shared Redis client for focus group caching, or None on failure."""
    global _fg_redis_pool
    try:
        from config.settings import REDIS_DB, REDIS_HOST, REDIS_PORT
        if _fg_redis_pool is None:
            _fg_redis_pool = redis.ConnectionPool(
                host=REDIS_HOST,
                port=REDIS_PORT,
                db=REDIS_DB,
                max_connections=5,
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
        return redis.Redis(connection_pool=_fg_redis_pool, decode_responses=True)
    except Exception as exc:
        logger.debug("Focus group Redis client unavailable (non-fatal): %s", exc)
        return None


def _fg_cache_key(campaign_id: str, copy_text: str) -> str:
    """Deterministic cache key for a focus group simulation result."""
    copy_hash = hashlib.md5(copy_text.encode("utf-8")).hexdigest()
    return f"fg:sim:{campaign_id}:{copy_hash}"


# ═══════════════════════════════════════════════════════════════════════════════
# § 1  Mock helpers (used when LLM is unavailable or in sandbox mode)
# ═══════════════════════════════════════════════════════════════════════════════


def mock_focus_group_report() -> FocusGroupReport:
    """
    Returns a valid, hardcoded FocusGroupReport suitable for sandbox testing.

    The mock satisfies all Pydantic validators defined in schemas/simulation.py:
      - overall_score is within [min_score, max_score] of persona_critiques.
      - All string fields meet their min/max length constraints.
      - All list fields meet their min/max item count constraints.
    """
    critiques = [
        PersonaCritique(
            persona_id="mock-persona-1",
            resonance_score=62,
            objection=(
                "The pricing claim feels generic and lacks any third-party "
                "validation that would make me trust it."
            ),
            clash_quote="best value on the market",
            click_intent=False,
            verdict=(
                "Without concrete proof points the copy reads as marketing noise; "
                "I would scroll past without engaging."
            ),
        ),
        PersonaCritique(
            persona_id="mock-persona-2",
            resonance_score=71,
            objection=(
                "The call-to-action is buried too deep and the urgency language "
                "feels manufactured rather than genuine."
            ),
            clash_quote="limited time offer",
            click_intent=True,
            verdict=(
                "The core message resonates but the fake scarcity tactic reduces "
                "my confidence in the brand's integrity."
            ),
        ),
    ]
    return FocusGroupReport(
        overall_score=65,  # satisfies min(62)..max(71) boundary
        persona_critiques=critiques,
        actionable_recommendations=[
            ActionableRecommendation(
                target_channel="LinkedIn",
                friction_identified=(
                    "Vague superlative claims with no supporting evidence create "
                    "credibility gaps for B2B buyers."
                ),
                suggested_revision=(
                    "Replace 'best value on the market' with a specific, "
                    "verifiable claim: e.g., 'Rated #1 by G2 in Q1 2025 — "
                    "verified by 340+ reviews.' Anchor trust with a third-party "
                    "signal before the call-to-action."
                ),
            )
        ],
    )


# ═══════════════════════════════════════════════════════════════════════════════
# § 2  Request / Response Pydantic models
# ═══════════════════════════════════════════════════════════════════════════════

_ROUTER_CONFIG = ConfigDict(extra="ignore", str_strip_whitespace=True)



class SimulateRequest(BaseModel):
    """Request body for POST /focus-group/simulate."""

    model_config = _ROUTER_CONFIG

    campaign_id: str = Field(
        ...,
        description="Unique identifier for the campaign being tested.",
    )
    copy_text: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Ad copy or marketing text to evaluate (10–5000 characters).",
    )
    campaign_context: dict = Field(
        default_factory=dict,
        description="Optional freeform context dict (brand name, channel, etc.).",
    )
    negativity_bias: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Fix #11: Score weighting bias toward worst score. 0=pure average, 1=pure minimum. Default 0.3.",
    )

    @field_validator("campaign_id")
    @classmethod
    def campaign_id_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("campaign_id must not be blank or whitespace-only.")
        return value


class InterviewRequest(BaseModel):
    """Request body for POST /focus-group/interview."""

    model_config = _ROUTER_CONFIG

    campaign_id: str = Field(
        ...,
        description="Unique identifier for the campaign being tested.",
    )
    question: str = Field(
        ...,
        max_length=500,
        description="The interview question posed to each persona (max 500 chars).",
    )
    personas: List[dict] = Field(
        ...,
        description="List of persona dicts — maximum 5 items.",
    )
    copy_text: str = Field(
        ...,
        description="Ad copy text used as context for the interview responses.",
    )

    @field_validator("campaign_id")
    @classmethod
    def campaign_id_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("campaign_id must not be blank or whitespace-only.")
        return value

    @field_validator("personas")
    @classmethod
    def personas_max_five(cls, value: list) -> list:
        if len(value) > 5:
            raise ValueError(
                f"personas list must contain at most 5 items; received {len(value)}."
            )
        if len(value) == 0:
            raise ValueError("personas list must contain at least 1 item.")
        return value


class InterviewAnswer(BaseModel):
    """Single persona answer within an InterviewResponse."""

    model_config = _ROUTER_CONFIG

    persona_id: str
    persona_name: str
    response: str
    sentiment: Literal["positive", "neutral", "skeptical"]


class InterviewResponse(BaseModel):
    """Response body for POST /focus-group/interview."""

    model_config = _ROUTER_CONFIG

    answers: List[InterviewAnswer]
    question_echoed: str


# ═══════════════════════════════════════════════════════════════════════════════
# § 3  Internal helpers for /interview endpoint
# ═══════════════════════════════════════════════════════════════════════════════


def _classify_sentiment(
    question: str,
    buying_barriers: List[str],
    trust_triggers: List[str],
) -> Literal["positive", "neutral", "skeptical"]:
    """
    Deterministic rule-based sentiment classification.

    Rules (evaluated in priority order):
      1. 'positive'   — any word in the lowercased question overlaps with
                        any word in any trust_trigger string.
      2. 'skeptical'  — any word in the lowercased question overlaps with
                        any word in any buying_barrier string.
      3. 'neutral'    — no overlap detected.

    Tokenisation: split on whitespace and strip punctuation from each token
    for simple, dependency-free fuzzy matching.
    """
    question_tokens = {
        token.strip(".,!?;:\"'()[]").lower()
        for token in question.split()
        if token.strip(".,!?;:\"'()[]")
    }

    def _has_overlap(phrase_list: List[str]) -> bool:
        for phrase in phrase_list:
            phrase_tokens = {
                token.strip(".,!?;:\"'()[]").lower()
                for token in phrase.split()
                if token.strip(".,!?;:\"'()[]")
            }
            if question_tokens & phrase_tokens:
                return True
        return False

    if _has_overlap(trust_triggers):
        return "positive"
    if _has_overlap(buying_barriers):
        return "skeptical"
    return "neutral"


def _build_response_text(
    persona_name: str,
    occupation: str,
    sentiment: Literal["positive", "neutral", "skeptical"],
    buying_barriers: List[str],
    trust_triggers: List[str],
    question: str,
) -> str:
    """
    Crafts a 2-sentence realistic first-person response for a persona.

    Sentence 1 — framed from the occupation perspective and the primary
                 barrier or trigger that influenced the sentiment.
    Sentence 2 — addresses the specific question topic at a surface level.
    """
    # Select the most relevant signal for sentence 1
    if sentiment == "positive" and trust_triggers:
        insight_signal = trust_triggers[0]
        sentence_1 = (
            f"As a {occupation}, I appreciate when brands demonstrate "
            f"{insight_signal} because it directly addresses what I look for "
            f"before committing to a purchase."
        )
    elif sentiment == "skeptical" and buying_barriers:
        barrier_signal = buying_barriers[0]
        sentence_1 = (
            f"As a {occupation}, my immediate concern is around "
            f"{barrier_signal}, and I do not see this copy alleviating "
            f"that hesitation in any meaningful way."
        )
    else:
        sentence_1 = (
            f"As a {occupation}, I find myself fairly neutral on this — "
            f"the message does not strongly conflict with my values, "
            f"but it does not particularly excite me either."
        )

    # Sentence 2 — anchored to the question topic
    question_preview = question[:80].rstrip() if len(question) > 80 else question
    sentence_2 = (
        f"Regarding your question about '{question_preview}', "
        f"I would need clearer evidence before I change my current behavior."
    )

    return f"{sentence_1} {sentence_2}"


async def _run_single_persona_interview(
    client,
    persona: dict,
    question: str,
    copy_text: str,
) -> InterviewAnswer:
    """
    Asynchronously calls the LLM to roleplay as a single focus group persona
    and answer the user's sandbox question dynamically based on their profile.
    """
    persona_id = str(persona.get("id", "unknown-persona"))
    persona_name = str(persona.get("name", "Unknown"))
    occupation = str(persona.get("occupation", "professional"))
    age = persona.get("age", 35)
    income_bracket = str(persona.get("income_bracket", "Middle Income"))
    cognitive_profile = str(persona.get("cognitive_profile", ""))

    def _to_str_list(value) -> List[str]:
        if isinstance(value, list):
            return [str(v) for v in value if v]
        if isinstance(value, str) and value:
            return [value]
        return []

    buying_barriers = _to_str_list(persona.get("buying_barriers", []))
    trust_triggers = _to_str_list(persona.get("trust_triggers", []))

    # Structured response schema
    class PersonaResponseSchema(BaseModel):
        response: str = Field(description="First-person response to the interviewer's question (2-3 sentences max).")
        sentiment: Literal["positive", "neutral", "skeptical"] = Field(description="Sentiment classification towards the question/copy.")

    prompt = (
        f"You are roleplaying as {persona_name}, aged {age}, working as a {occupation}.\n"
        f"Income Bracket: {income_bracket}\n"
        f"Your personal buying barriers: {', '.join(buying_barriers)}\n"
        f"Your personal trust triggers: {', '.join(trust_triggers)}\n"
        f"Your cognitive behavioral profile: {cognitive_profile}\n\n"
        f"You are participating in a focus group interview for an ad copy. Here is the ad copy you are reviewing:\n"
        f"\"\"\"\n{copy_text}\n\"\"\"\n\n"
        f"The interviewer asks you: \"{question}\"\n\n"
        "ROLEPLAY INSTRUCTIONS:\n"
        "- Answer the question in the first person (I, me, my) from your persona's perspective.\n"
        "- Keep your answer concise, realistic, and direct (2 to 3 sentences maximum).\n"
        "- Do NOT repeat the question back to the interviewer or echo it in your response.\n"
        "- Base your response on how the copy addresses (or fails to address) your buying barriers and trust triggers.\n"
        "- Respond matching the PersonaResponseSchema format."
    )

    try:
        loop = asyncio.get_running_loop()  # Fix #7: get_event_loop() deprecated in Python 3.10+
        res = await loop.run_in_executor(
            None,
            lambda: client.generate_structured(prompt=prompt, response_model=PersonaResponseSchema, temperature=0.7)
        )
        response_text = res.response
        sentiment = res.sentiment
    except Exception as exc:
        logger.warning(
            "Dynamic LLM interview failed for persona %s: %s. Falling back to deterministic response.",
            persona_id,
            exc
        )
        sentiment = _classify_sentiment(question, buying_barriers, trust_triggers)
        response_text = _build_response_text(
            persona_name=persona_name,
            occupation=occupation,
            sentiment=sentiment,
            buying_barriers=buying_barriers,
            trust_triggers=trust_triggers,
            question=question
        )

    return InterviewAnswer(
        persona_id=persona_id,
        persona_name=persona_name,
        response=response_text,
        sentiment=sentiment,
    )


async def _generate_all_answers(
    personas: List[dict], question: str, copy_text: str
) -> List[InterviewAnswer]:
    """
    Builds answers dynamically for all personas by calling the LLM client in parallel.
    """
    # Import inline to avoid circular import risk
    from agents.focus_group import get_focus_group_model_provider
    from llm.factory import get_llm_client

    provider = get_focus_group_model_provider("gemini")
    client = get_llm_client(provider)

    tasks = [
        _run_single_persona_interview(client, persona, question, copy_text)
        for persona in personas
    ]
    return await asyncio.gather(*tasks)


# ═══════════════════════════════════════════════════════════════════════════════
# § 4  Endpoint: POST /focus-group/simulate
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/simulate",
    response_model=FocusGroupReport,
    summary="Run Synthetic Focus Group Simulation",
    description=(
        "Generates a full focus group simulation for the provided ad copy. "
        "Calls the LLM-backed persona critique pipeline when available; "
        "falls back to deterministic mock data in sandbox environments. "
        "The 'X-Simulation-Cost-Estimate' response header carries a rough "
        "token budget string for observability."
    ),
    status_code=200,
)
async def simulate_focus_group(
    request: SimulateRequest,
    response: Response,
) -> FocusGroupReport:
    """
    POST /focus-group/simulate

    Error mapping:
      400 — Pydantic ValidationError (caught via FastAPI's built-in handler,
            but explicit field-level errors are re-raised as 400 here).
      503 — LLM is unavailable: RuntimeError or asyncio.TimeoutError.
      500 — Any other unexpected error.

    Response header:
      X-Simulation-Cost-Estimate — rough token count estimate for cost tracking.
    """
    logger.info(
        "Simulate request received: campaign_id=%s copy_length=%d",
        request.campaign_id,
        len(request.copy_text),
    )

    # Attach cost estimate header regardless of code path
    response.headers["X-Simulation-Cost-Estimate"] = _SIMULATE_TOKEN_ESTIMATE

    # ── Fast path: LLM agent unavailable — return mock ────────────────────────
    if not _SIMULATION_AVAILABLE:
        logger.warning(
            "Returning mock FocusGroupReport for campaign_id=%s "
            "(agents.focus_group not importable).",
            request.campaign_id,
        )
        return mock_focus_group_report()

    ctx = request.campaign_context
    brand_name: str = str(ctx.get("brand_name") or ctx.get("brand") or "Unknown Brand")
    target_audience: str = str(ctx.get("target_audience") or ctx.get("audience") or "General Audience")
    campaign_provider: str = str(ctx.get("model_provider") or ctx.get("provider") or "gemini")

    # ── Redis cache check (keyed on campaign_id + MD5 of copy_text) ─────────
    # Same copy = same simulation — serve instantly, zero LLM calls.
    cache_key = _fg_cache_key(request.campaign_id, request.copy_text)
    redis_client = _get_fg_redis_client()
    if redis_client:
        try:
            cached_raw = redis_client.get(cache_key)
            if cached_raw:
                cached_report = FocusGroupReport.model_validate_json(cached_raw)
                response.headers["X-Simulation-Cost-Estimate"] = _SIMULATE_TOKEN_CACHED
                logger.info(
                    "FG simulation cache HIT | campaign_id=%s | overall_score=%d",
                    request.campaign_id,
                    cached_report.overall_score,
                )
                return cached_report
        except Exception as exc:
            logger.warning(
                "FG Redis cache read failed (non-fatal, running live): %s", exc
            )

    # ── Generate personas (PersonaFactory call is sync; run in executor) ──────
    # Import inline to avoid circular import risk at module load time.
    try:
        from services.persona_factory import PersonaFactory  # noqa: PLC0415

        loop = asyncio.get_running_loop()  # Fix #7: get_event_loop() deprecated in Python 3.10+
        factory = PersonaFactory()
        personas = await loop.run_in_executor(
            None, factory.get_personas, brand_name, target_audience
        )
    except ImportError:
        logger.warning(
            "services.persona_factory not importable for campaign_id=%s; "
            "returning mock report.",
            request.campaign_id,
        )
        return mock_focus_group_report()
    except Exception as exc:
        logger.error(
            "PersonaFactory failed for campaign_id=%s: %s",
            request.campaign_id,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "Persona generation service is temporarily unavailable. "
                "Please retry in a few moments."
            ),
        ) from exc

    # ── Run LLM-backed simulation with error handling ─────────────────────────
    t_start = time.monotonic()
    try:
        from llm.factory import AllProvidersRateLimitedError
        report: FocusGroupReport = await _run_simulation(
            brand_name=brand_name,
            target_audience=target_audience,
            copy_output=request.copy_text,
            personas=personas,
            campaign_provider=campaign_provider,
            negativity_bias=request.negativity_bias,  # Fix #11: pass configurable bias
        )
    except (RuntimeError, asyncio.TimeoutError, AllProvidersRateLimitedError) as exc:
        elapsed = time.monotonic() - t_start
        logger.error(
            "LLM simulation failed for campaign_id=%s after %.2fs: %s",
            request.campaign_id,
            elapsed,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=503,
            detail=(
                "The focus group simulation could not be completed due to an "
                f"LLM service failure, rate limit, or timeout: {str(exc)}"
            ),
        ) from exc

    except Exception as exc:
        elapsed = time.monotonic() - t_start
        logger.error(
            "Unexpected error in simulation for campaign_id=%s after %.2fs: %s",
            request.campaign_id,
            elapsed,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal error occurred during simulation.",
        ) from exc

    elapsed = time.monotonic() - t_start
    logger.info(
        "Simulation complete for campaign_id=%s in %.2fs | overall_score=%d",
        request.campaign_id,
        elapsed,
        report.overall_score,
    )

    # ── Persist result to Redis for future identical requests ────────────────
    if redis_client:
        try:
            redis_client.setex(cache_key, _FG_CACHE_TTL, report.model_dump_json())
            logger.debug(
                "FG simulation result cached | campaign_id=%s | ttl=%ds",
                request.campaign_id,
                _FG_CACHE_TTL,
            )
        except Exception as exc:
            logger.warning("FG Redis cache write failed (non-fatal): %s", exc)

    return report


# ═══════════════════════════════════════════════════════════════════════════════
# § 5  Endpoint: POST /focus-group/interview
# ═══════════════════════════════════════════════════════════════════════════════


@router.post(
    "/interview",
    response_model=InterviewResponse,
    summary="Conduct Focus Group Chat Sandbox Interview",
    description=(
        "Poses a single question to each supplied persona dict and returns "
        "dynamic, LLM-generated responses in the persona's voice, evaluating "
        "sentiment and responses based on the ad copy. Total processing is "
        "bounded by a 25-second asyncio timeout guard."
    ),
    status_code=200,
)
async def interview_personas(
    request: InterviewRequest,
) -> InterviewResponse:
    """
    POST /focus-group/interview

    Error mapping:
      400 — Pydantic ValidationError on request body (handled by FastAPI).
      408 — Processing exceeded the 8-second timeout guard.
      500 — Any other unexpected error.
    """
    logger.info(
        "Interview request received: campaign_id=%s personas=%d question_length=%d",
        request.campaign_id,
        len(request.personas),
        len(request.question),
    )

    t_start = time.monotonic()
    try:
        answers: List[InterviewAnswer] = await asyncio.wait_for(
            _generate_all_answers(request.personas, request.question, request.copy_text),
            timeout=25.0,
        )
    except asyncio.TimeoutError as exc:
        elapsed = time.monotonic() - t_start
        logger.error(
            "Interview timed out for campaign_id=%s after %.2fs",
            request.campaign_id,
            elapsed,
        )
        raise HTTPException(
            status_code=408,
            detail=(
                "Persona interview processing exceeded the 25-second timeout. "
                "Reduce the number of personas or question complexity and retry."
            ),
        ) from exc
    except Exception as exc:
        elapsed = time.monotonic() - t_start
        logger.error(
            "Unexpected error in interview for campaign_id=%s after %.2fs: %s",
            request.campaign_id,
            elapsed,
            exc,
            exc_info=True,
        )
        raise HTTPException(
            status_code=500,
            detail="An unexpected internal error occurred during the interview.",
        ) from exc

    elapsed = time.monotonic() - t_start
    logger.info(
        "Interview complete for campaign_id=%s in %.3fs | answers=%d",
        request.campaign_id,
        elapsed,
        len(answers),
    )

    return InterviewResponse(
        answers=answers,
        question_echoed=request.question,
    )
