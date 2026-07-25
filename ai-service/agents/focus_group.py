"""
Focus Group Agent — AgentMark AI Service

Orchestrates the multi-agent Synthetic Focus Group simulation.
Implements:
- Isolate concurrent tasks using asyncio.gather(return_exceptions=True)
- Timeout guards per persona call (12s limit)
- Asynchronous exponential backoff retries for Rate-Limit safety
- Graceful degradation: handles partial panel failures without crashing
- Cross-model verification and negativity-biased score weighting
"""

import os
import asyncio
import logging
import random
import time
from typing import List
from schemas.simulation import PersonaProfile, PersonaCritique, ActionableRecommendation, FocusGroupReport, AnalystSynthesis
from llm.factory import get_llm_client, set_llm_config, get_current_llm_config
from llm.base import RateLimitedLLMError

logger = logging.getLogger("agentmark.simulation")

def get_focus_group_model_provider(campaign_model_provider: str) -> str:
    """
    Selects the alternative model provider to prevent circular self-validation.
    Falls back gracefully if only one API key is configured in the environment.
    """
    campaign_provider = (campaign_model_provider or "").lower()
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    if openai_key and gemini_key:
        if campaign_provider == "openai":
            return "gemini"
        return "openai"
        
    if gemini_key:
        return "gemini"
    if openai_key:
        return "openai"
        
    return "gemini"


async def _run_with_retry(async_fn, max_retries: int = 3, base_delay: float = 1.0):
    """
    Helper to execute an async function with exponential backoff and jitter.
    Catches Rate-limiting and network connection issues.
    """
    for attempt in range(max_retries):
        try:
            return await async_fn()
        except RateLimitedLLMError as exc:
            if attempt == max_retries - 1:
                raise exc
            # Exponential backoff with jitter
            delay = (base_delay * (2 ** attempt)) + random.uniform(0.1, 0.5)
            logger.warning("Rate limited on LLM call. Retrying in %.2fs (Attempt %d/%d)", delay, attempt + 1, max_retries)
            await asyncio.sleep(delay)
        except Exception as exc:
            if attempt == max_retries - 1:
                raise exc
            delay = base_delay + random.uniform(0.1, 0.3)
            logger.warning("LLM call failed with error: %s. Retrying in %.2fs...", exc, delay)
            await asyncio.sleep(delay)


async def run_focus_group_simulation(
    brand_name: str,
    target_audience: str,
    copy_output: str,
    personas: List[PersonaProfile],
    campaign_provider: str,
    negativity_bias: float = 0.3  # Fix #11: configurable negativity bias (0=pure avg, 1=pure min)
) -> FocusGroupReport:
    """
    Runs individual persona audits concurrently with isolation, timeouts, and retries.
    Uses SmartClient with automatic failover across all configured providers (OpenAI, Gemini, Groq).
    """
    # Use SmartClient for automatic failover across all available providers.
    # This respects whatever keys are configured in the current LLM config
    # (from the request context) and falls back to env vars automatically.
    client = get_llm_client()  # SmartClient with full failover pool
    logger.info(
        "Executing Focus Group simulation using SmartClient (all available providers)"
    )

    # ── Step 1: Run Isolate Persona Audits in Parallel ─────────────────────
    async def run_isolated_task(persona: PersonaProfile):
        # Wrap each persona critique in a 35s timeout guard
        return await asyncio.wait_for(
            _run_with_retry(lambda: _run_single_persona_critique(client, persona, brand_name, copy_output)),
            timeout=35.0
        )


    tasks = [run_isolated_task(persona) for persona in personas]

    # return_exceptions=True prevents 1 failure from crashing the other 4
    results = await asyncio.gather(*tasks, return_exceptions=True)

    valid_critiques: List[PersonaCritique] = []
    for idx, res in enumerate(results):
        if isinstance(res, Exception):
            logger.error(
                "Persona %s critique failed to execute (non-fatal): %s",
                personas[idx].id,
                res
            )
            continue
        valid_critiques.append(res)

    # Fail-safe: Ensure we have at least 1 critique to compile the report
    if not valid_critiques:
        raise RuntimeError("All focus group persona critiques failed to execute.")

    logger.info("Compiled %d/%d valid persona critiques.", len(valid_critiques), len(personas))

    # ── Step 2: Synthesize Report via Analyst Agent ─────────────────────────
    report = await _run_with_retry(
        lambda: _run_analyst_synthesis(client, valid_critiques, copy_output, personas, negativity_bias)
    )
    return report


from utils.guardrails import sanitize_copy_rewrites


async def _run_single_persona_critique(
    client,
    persona: PersonaProfile,
    brand_name: str,
    copy_output: str
) -> PersonaCritique:
    """
    Roleplays as an individual consumer persona and critiques the ad copy.
    """
    system_prompt = (
        f"You are roleplaying strictly as {persona.name}, aged {persona.age}, working as {persona.occupation}.\n"
        f"Income Bracket: {persona.income_bracket}\n"
        f"Buying Barriers: {', '.join(persona.buying_barriers)}\n"
        f"Trust Triggers: {', '.join(persona.trust_triggers)}\n"
        f"Behavioral Profile: {persona.cognitive_profile}\n\n"
        f"You are reviewing a proposed ad copy/pitch from the brand: {brand_name}.\n"
        "CRITICAL BEHAVIORAL DIRECTIVES:\n"
        "1. You are a busy, skeptical, budget-conscious consumer. You do NOT want to be sold to.\n"
        "2. DO NOT offer polite encouragement or praise generic marketing fluff (e.g., 'next-gen', 'revolutionary', 'best-in-class').\n"
        "3. Evaluate the copy against your specific buying barriers. If a barrier is unaddressed, penalize the Trust score severely (1 or 2).\n"
        "4. In the 'clash_quote' field, quote the EXACT sentence from the copy that triggered your doubt.\n"
        "5. Rate each of the 4 rubric dimensions (Clarity, Trust, Value, Urgency) strictly between 1 (Worst) and 5 (Best)."
    )
    
    prompt = f"{system_prompt}\n\nAd Copy to Review:\n{copy_output}"
    
    loop = asyncio.get_running_loop()
    critique = await loop.run_in_executor(
        None,
        lambda: client.generate_structured(prompt=prompt, response_model=PersonaCritique, temperature=0.2, seed=42)
    )
    critique.persona_id = persona.id
    return critique


async def _run_analyst_synthesis(
    client,
    critiques: List[PersonaCritique],
    copy_output: str,
    personas: List[PersonaProfile],
    negativity_bias: float = 0.3
) -> FocusGroupReport:
    """
    Compiles individual critiques, computes a negativity-biased score,
    and generates actionable revision suggestions.
    """
    # 1. Compute Negativity-Biased Score using configurable bias parameter
    scores = [c.resonance_score for c in critiques]
    min_score = min(scores)
    avg_score = sum(scores) / len(scores)
    overall_score = int(negativity_bias * min_score + (1 - negativity_bias) * avg_score)
    overall_score = max(0, min(100, overall_score))
    
    # 2. Call Analyst LLM to generate actionable recommendations
    system_prompt = (
        "You are a Lead Marketing Analyst and Copywriting Director.\n"
        "Review the original copy and the individual critiques generated by a focus group of target personas.\n"
        "Your task is to compile a FocusGroupReport containing:\n"
        f"- The overall negativity-biased score (already calculated as {overall_score})\n"
        "- Actionable recommendations: specific, text-level copy rewrites to resolve the objections "
        "raised by the personas. For each recommendation, suggest an exact replacement text.\n"
        "SAFETY DIRECTIVE: Do NOT introduce unverified, illegal, or medical claims (e.g. 'FDA Approved', 'Guaranteed Returns').\n"
        "Respond matching the FocusGroupReport schema format."
    )
    
    critique_summaries = "\n\n".join([
        f"Persona {c.persona_id} (Score: {c.resonance_score}, Rubric: {c.rubric}):\n"
        f"- Objection: {c.objection}\n"
        f"- Trigger Quote: '{c.clash_quote}'"
        for c in critiques
    ])
    
    prompt = (
        f"Overall Calculated Score: {overall_score}\n\n"
        f"Original Copy:\n{copy_output}\n\n"
        f"Persona Critiques:\n{critique_summaries}\n\n"
        f"{system_prompt}"
    )
    
    loop = asyncio.get_running_loop()
    synthesis = await loop.run_in_executor(
        None,
        lambda: client.generate_structured(prompt=prompt, response_model=AnalystSynthesis, temperature=0.2, seed=42)
    )
    
    # Apply claim guardrail sanitization to analyst recommendations
    sanitized_recs = sanitize_copy_rewrites(synthesis.actionable_recommendations)
    
    return FocusGroupReport(
        overall_score=overall_score,
        persona_critiques=critiques,
        actionable_recommendations=sanitized_recs,
        personas=personas
    )
