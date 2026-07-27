"""
Creative Hook Matrix Agent

Generates a first-class hook matrix after Copywriter and before Image Prompt.
The node is feature-flagged and non-blocking: failures are stored as diagnostic
hook output and the campaign continues.
"""

import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState
from llm import get_llm_client
from schemas import CreativeHookMatrixOutput, CreativeHook, HookCTA, HookScoreBreakdown
from utils.error_handler import safe_llm_call
from utils.llm_cache import make_key, get as cache_get, set as cache_set
from utils.prompt_loader import load_prompt
from utils.telemetry.pipeline_tracer import PipelineTracer

logger = logging.getLogger(__name__)

HOOK_CATEGORIES = [
    "Question",
    "Fear",
    "Negative",
    "Contrarian",
    "Social Proof",
    "Statistic",
    "Story",
    "Curiosity",
    "Urgency",
    "Benefit",
]

EVALUATION_CONFIG = {
    "clarity_weight": float(os.getenv("HOOK_SCORE_CLARITY_WEIGHT", "0.25")),
    "novelty_weight": float(os.getenv("HOOK_SCORE_NOVELTY_WEIGHT", "0.20")),
    "pattern_interrupt_weight": float(os.getenv("HOOK_SCORE_PATTERN_INTERRUPT_WEIGHT", "0.20")),
    "cta_strength_weight": float(os.getenv("HOOK_SCORE_CTA_STRENGTH_WEIGHT", "0.20")),
    "brand_alignment_weight": float(os.getenv("HOOK_SCORE_BRAND_ALIGNMENT_WEIGHT", "0.15")),
}


def _parse_json(raw):
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {"raw": str(raw)}


def _slug(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in value).strip("_")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _fallback_hook_matrix(state: CampaignState, reason: str = "") -> CreativeHookMatrixOutput:
    brand = state.brand_name or "the brand"
    audience = state.target_audience or "the target audience"
    goal = state.primary_goal or "awareness"
    platform_defaults = ["linkedin", "instagram", "facebook"]

    templates = {
        "Question": (f"What if {brand} could change how {audience} decide?", "decision-framing question", ["See the answer", "Explore the angle"]),
        "Fear": (f"The cost of waiting on {brand}'s promise is getting harder to ignore", "loss mitigation", ["Reduce the risk", "Protect momentum"]),
        "Negative": (f"Stop settling for the old way when {brand} gives you a sharper path", "problem rejection", ["Fix the friction", "See a better path"]),
        "Contrarian": (f"The best {goal} campaign may not look like everyone else's", "category belief reversal", ["Challenge the playbook", "Try the angle"]),
        "Social Proof": (f"Why teams like yours are paying closer attention to {brand}", "peer validation", ["See why it works", "Join the shift"]),
        "Statistic": (f"The signal behind {brand}: fewer assumptions, clearer next steps", "evidence seeking", ["Review the proof", "Get the breakdown"]),
        "Story": (f"Before {brand}, this was the part teams kept working around", "before-after narrative", ["Read the story", "Start your version"]),
        "Curiosity": (f"The overlooked reason {audience} pause before they act", "open-loop discovery", ["Uncover the reason", "Find out more"]),
        "Urgency": (f"If {goal} matters this quarter, {brand} cannot stay in the backlog", "time-sensitive action", ["Act this week", "Move now"]),
        "Benefit": (f"{brand} helps {audience} move from intent to measurable action", "outcome promise", ["Get the outcome", "Start improving"]),
    }

    hooks = []
    for index, category in enumerate(HOOK_CATEGORIES, start=1):
        headline, angle, ctas = templates[category]
        hooks.append(
            CreativeHook(
                id=f"hook_{_slug(category)}",
                headline=headline,
                category=category,
                psychological_angle=angle,
                ctas=[HookCTA(text=text, intent=angle) for text in ctas],
                quality_score=72,
                virality_score=64,
                platform_suitability=platform_defaults,
                funnel_stage="awareness" if index <= 4 else "consideration" if index <= 7 else "conversion",
                score_breakdown=HookScoreBreakdown(
                    clarity=74,
                    novelty=68,
                    pattern_interrupt=66,
                    cta_strength=70,
                    brand_alignment=76,
                ),
                metadata={
                    "source": "fallback",
                    "non_blocking_reason": reason,
                },
            )
        )

    return CreativeHookMatrixOutput(
        hooks=hooks,
        archetypes_generated=HOOK_CATEGORIES,
        evaluation_config=EVALUATION_CONFIG,
        generated_at=_now_iso(),
        status="failed" if reason else "completed",
        metadata={
            "agent": "creative_hook_matrix",
            "non_blocking": True,
            "failure_reason": reason,
        },
        revisions=[],
    )


def _finalize_output(output: CreativeHookMatrixOutput, source: str, cache_hit: bool) -> CreativeHookMatrixOutput:
    for hook in output.hooks:
        if not hook.id:
            hook.id = f"hook_{_slug(hook.category)}"
        hook.metadata = {
            **(hook.metadata or {}),
            "source": hook.metadata.get("source", source) if hook.metadata else source,
        }

    output.archetypes_generated = [hook.category for hook in output.hooks]
    output.evaluation_config = output.evaluation_config or EVALUATION_CONFIG
    output.generated_at = output.generated_at or _now_iso()
    output.metadata = {
        **(output.metadata or {}),
        "cache_hit": cache_hit,
        "single_structured_call": source == "llm",
        "agent": "creative_hook_matrix",
    }
    output.revisions = output.revisions or []
    return output


def creative_hook_matrix_agent(state: CampaignState) -> CampaignState:
    logger.info("\n" + "=" * 80)
    logger.info("CREATIVE HOOK MATRIX AGENT ACTIVATED")
    logger.info("=" * 80)

    campaign_id = state.campaign_id or ""
    PipelineTracer.start_agent(campaign_id, "creative_hook_matrix")
    start = time.perf_counter()
    cache_hit = False
    prompt = ""

    try:
        research_output = _parse_json(state.research_output)
        strategy_output = _parse_json(state.strategy_output)
        copy_output = _parse_json(state.copy_output)

        prompt = load_prompt(
            "creative_hook_matrix",
            campaign_name=state.campaign_name,
            brand_name=state.brand_name,
            industry=state.industry,
            primary_goal=state.primary_goal,
            target_audience=state.target_audience,
            brand_voice=state.brand_voice,
            brief=state.brief or "",
            client_memory_context=state.client_memory_context or "",
            research_output=json.dumps(research_output, separators=(",", ":"), ensure_ascii=False),
            strategy_output=json.dumps(strategy_output, separators=(",", ":"), ensure_ascii=False),
            copy_output=json.dumps(copy_output, separators=(",", ":"), ensure_ascii=False),
            **EVALUATION_CONFIG,
        )

        cache_key = make_key(
            "CreativeHookMatrix",
            prompt=prompt,
            industry=state.industry or "",
            temperature=0.6,
            max_tokens=5000,
        )
        cached = cache_get(cache_key)
        if cached is not None:
            cache_hit = True
            hook_output = CreativeHookMatrixOutput(**cached)
        else:
            llm = get_llm_client()
            llm_start = time.perf_counter()
            hook_output, state = safe_llm_call(
                state,
                "CreativeHookMatrix",
                lambda: llm.generate_structured(prompt, CreativeHookMatrixOutput, temperature=0.6, max_tokens=5000),
            )
            llm_latency_ms = (time.perf_counter() - llm_start) * 1000
            if hook_output is not None:
                cache_set(cache_key, hook_output.model_dump())
        if hook_output is None:
            reason = state.error or "Creative hook matrix generation failed"
            hook_output = _fallback_hook_matrix(state, reason=reason)
            state.error = None

        hook_output = _finalize_output(hook_output, "cache" if cache_hit else "llm", cache_hit)
        state.creative_hook_matrix_output = hook_output.model_dump_json(indent=2)
        state.status = "creative_hook_matrix_complete"

        elapsed_ms = (time.perf_counter() - start) * 1000
        avg_quality = round(sum(h.quality_score for h in hook_output.hooks) / len(hook_output.hooks), 2) if hook_output.hooks else 0
        avg_virality = round(sum(h.virality_score for h in hook_output.hooks) / len(hook_output.hooks), 2) if hook_output.hooks else 0
        hook_output.metadata.update({
            "hook_generation_duration_ms": round(elapsed_ms, 2),
            "average_quality_score": avg_quality,
            "average_virality_score": avg_virality,
        })
        state.creative_hook_matrix_output = hook_output.model_dump_json(indent=2)

        PipelineTracer.end_agent(
            campaign_id,
            "creative_hook_matrix",
            input_tokens=len(prompt.split()),
            output_tokens=len(state.creative_hook_matrix_output.split()),
            llm_latency_ms=elapsed_ms if not cache_hit else 0.0,
            cache_hit=cache_hit,
        )
        logger.info("Creative Hook Matrix complete: %s hooks", len(hook_output.hooks))
        return state
    except Exception as exc:
        reason = str(exc) or type(exc).__name__
        logger.error("Creative Hook Matrix failed non-blocking | campaign_id=%s | error=%s", campaign_id, reason, exc_info=True)
        hook_output = _fallback_hook_matrix(state, reason=reason)
        state.creative_hook_matrix_output = hook_output.model_dump_json(indent=2)
        state.status = "creative_hook_matrix_complete"
        state.error = None
        PipelineTracer.end_agent(
            campaign_id,
            "creative_hook_matrix",
            input_tokens=len(prompt.split()) if prompt else 0,
            output_tokens=len(state.creative_hook_matrix_output.split()),
            llm_latency_ms=(time.perf_counter() - start) * 1000,
            cache_hit=cache_hit,
        )
        return state
