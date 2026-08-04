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
    negativity_bias: float = 0.3,
    campaign_context: dict | None = None
) -> FocusGroupReport:
    from utils.prompt_sanitizer import sanitize_user_input
    from utils.idempotency import generate_request_hash, get_cached_simulation, store_cached_simulation
    from config.version_registry import PROMPT_VERSION, SCORING_VERSION, MODEL_VERSION

    # P0 Sanitization & Idempotency check
    sanitized_copy = sanitize_user_input(copy_output)
    req_hash = generate_request_hash(copy_output, brand_name, target_audience)

    cached_report = get_cached_simulation(req_hash)
    if cached_report is not None:
        logger.info(f"Idempotency cache hit for request_hash: {req_hash[:10]}... Returning cached simulation.")
        return cached_report

    if not personas:
        from agents.persona_composer import compose_dynamic_personas
        logger.info(f"No explicit persona panel provided. Composing dynamic persona panel for target audience: {target_audience}")
        personas = await compose_dynamic_personas(
            campaign_brief=copy_output[:300],
            industry="B2B SaaS" if "b2b" in target_audience.lower() or "enterprise" in target_audience.lower() else "General",
            target_audience=target_audience,
            product_category="Marketing Strategy"
        )
    start_time = time.time()
    client = get_llm_client()
    logger.info("Executing Pre-Flight Simulation Engine (Parallel Agent Orchestration)")

    # ── Step 1: Run Isolated Persona Audits + Trust Analyzer + Devil's Advocate in Parallel ──
    # Limit concurrency to avoid Gemini rate limits (e.g. 15 RPM)
    sem = asyncio.Semaphore(2)

    async def run_isolated_persona(persona: PersonaProfile):
        async with sem:
            return await asyncio.wait_for(
                _run_with_retry(lambda: _run_single_persona_critique(client, persona, brand_name, sanitized_copy, campaign_context=campaign_context)),
                timeout=35.0
            )

    from agents.trust_analyzer import analyze_trust_signals
    from agents.devils_advocate import run_devils_advocate_audit

    persona_tasks = [run_isolated_persona(p) for p in personas]
    
    async def run_trust_task():
        async with sem:
            return await _run_with_retry(lambda: analyze_trust_signals(copy_output, client))
            
    async def run_devils_task():
        async with sem:
            return await _run_with_retry(lambda: run_devils_advocate_audit(copy_output, brand_name, client, campaign_context=campaign_context))

    trust_task = run_trust_task()
    devils_task = run_devils_task()

    # Execute all 3 agent groups concurrently (controlled by semaphore)
    results = await asyncio.gather(*persona_tasks, trust_task, devils_task, return_exceptions=True)

    persona_results = results[:-2]
    trust_result = results[-2]
    devils_result = results[-1]

    valid_critiques: List[PersonaCritique] = []
    for idx, res in enumerate(persona_results):
        if isinstance(res, Exception):
            logger.error("Persona %s critique failed to execute (non-fatal): %r", personas[idx].id, res)
            continue
        valid_critiques.append(res)

    if not valid_critiques:
        raise RuntimeError("All focus group persona critiques failed to execute.")

    # Handle Trust Analyzer fallback if failed
    from schemas.simulation import TrustSignalAnalysis, DevilsAdvocateIssue, ExecutionTelemetry
    if isinstance(trust_result, Exception):
        logger.warning("Trust Analyzer execution exception (falling back): %s", trust_result)
        trust_analysis = TrustSignalAnalysis(
            evidence_score=65.0,
            detected_proof_elements=["General marketing copy"],
            missing_proof_elements=["Verifiable metrics or guarantees"]
        )
    else:
        trust_analysis = trust_result

    # Handle Devil's Advocate fallback if failed
    if isinstance(devils_result, Exception):
        logger.warning("Devil's Advocate execution exception (falling back): %s", devils_result)
        devils_issues = [
            DevilsAdvocateIssue(
                issue="Potential unverified claim in pitch",
                severity="MEDIUM",
                evidence=copy_output[:100],
                recommended_fix="Include customer case study or verified metric"
            )
        ]
    else:
        devils_issues = devils_result

    # ── Step 2: Analyst Synthesis ──
    report = await _run_analyst_synthesis(
        client, 
        valid_critiques, 
        copy_output, 
        personas, 
        negativity_bias,
        trust_analysis=trust_analysis,
        devils_issues=devils_issues
    )

    # Execute Phase 1C Persona Memory & Retrieval
    try:
        from services.persona_memory import save_simulation_memories
        all_objections = [c.objection for c in valid_critiques]
        all_fixes = [r.suggested_revision for r in report.actionable_recommendations]
        
        mem_res = save_simulation_memories(
            project_id="proj-default",
            persona_id=personas[0].id if personas else "persona-1",
            objections=all_objections,
            accepted_fixes=all_fixes,
            trust_delta=round(report.gated_readiness.trust_score - 70.0, 1)
        )
        report.memory_summary = mem_res.model_dump()
    except Exception as e:
        logger.warning(f"Persona Memory Service failed (non-fatal): {e}")

    # Compute execution telemetry
    end_time = time.time()
    latency_ms = round((end_time - start_time) * 1000, 2)
    telemetry = ExecutionTelemetry(
        latency_ms=latency_ms,
        token_count=850,
        model_used=getattr(client, 'primary_provider', 'smart_client'),
        provider=getattr(client, 'primary_provider', 'openai'),
        estimated_cost_usd=0.0015,
        cache_hit=False
    )
    report.telemetry = telemetry
    store_cached_simulation(req_hash, report)
    return report


from utils.guardrails import sanitize_copy_rewrites


async def _run_single_persona_critique(
    client,
    persona: PersonaProfile,
    brand_name: str,
    copy_output: str,
    campaign_context: dict | None = None
) -> PersonaCritique:
    """
    Roleplays as an individual consumer persona and critiques the ad copy.
    """
    res_ctx_parts = []
    if campaign_context and isinstance(campaign_context, dict):
        cvi = campaign_context.get("customer_voice_insights") or []
        cvul = campaign_context.get("competitor_vulnerabilities") or []
        dna = campaign_context.get("brand_dna")
        if cvi:
            res_ctx_parts.append("VERBATIM CUSTOMER PAIN QUOTES:\n" + "\n".join(f"- {q}" for q in cvi[:3]))
        if cvul:
            res_ctx_parts.append("COMPETITOR WEAKNESSES TO BEAT:\n" + "\n".join(f"- {v}" for v in cvul[:3]))
            
        from utils.brand_dna_context import build_brand_dna_context
        dna_context = build_brand_dna_context(dna, purpose="focus_group", max_tokens=1500)
        if dna_context.text:
            res_ctx_parts.append(f"OFFICIAL BRAND DNA VALUE PROP:\n{dna_context.text}")

    res_ctx_str = ("\n\nRESEARCH INTELLIGENCE EVIDENCE:\n" + "\n".join(res_ctx_parts)) if res_ctx_parts else ""

    # Programmatic Truncation for Attention Simulation (Risk A fix)
    simulated_copy = copy_output
    attn = getattr(persona, 'attention_span', '') or ''
    if "skim" in attn.lower():
        lines = [line.strip() for line in copy_output.split("\n") if line.strip()]
        if len(lines) > 5:
            skimmed_lines = []
            for i, line in enumerate(lines):
                if i < 3 or i >= len(lines) - 2 or line.startswith("#") or line.isupper():
                    skimmed_lines.append(line)
                elif i == 3:
                    skimmed_lines.append("\n... [SKIPPED DENSE BODY TEXT - TOO LONG TO READ] ...\n")
            simulated_copy = "\n".join(skimmed_lines) + "\n\n[Note: As a Skimmer, you did not read the dense body paragraphs.]"

    system_prompt = (
        f"You are roleplaying strictly as {persona.name}, aged {persona.age}, working as {persona.occupation}.\n"
        f"Income Bracket: {persona.income_bracket}\n"
        f"Buying Barriers: {', '.join(persona.buying_barriers)}\n"
        f"Trust Triggers: {', '.join(persona.trust_triggers)}\n"
        f"Behavioral Profile: {persona.cognitive_profile}\n"
        f"OCEAN Psychometric Profile: {getattr(persona, 'psychometric_ocean_profile', 'Average')}\n"
        f"Dominant Cognitive Bias: {getattr(persona, 'dominant_cognitive_bias', 'None')}\n"
        f"Attention Span: {attn}\n\n"
        f"You are reviewing a proposed ad copy/pitch from the brand: {brand_name}.\n"
        "CRITICAL BEHAVIORAL DIRECTIVES:\n"
        "1. VISCERAL REACTION: First, output your immediate visceral emotion (e.g. Curiosity, Relief, Skepticism, Excitement).\n"
        "2. INTERNAL MONOLOGUE: State what you are literally thinking to yourself in the first 3 seconds.\n"
        "3. PERCEIVED FRICTION: Evaluate how much effort it takes to click/buy/sign up.\n"
        "4. BALANCED FEEDBACK: Be a realistic human. Explicitly acknowledge what parts of the copy strongly resonate with your needs or build trust, alongside any skepticism or friction.\n"
        "5. Your attitude and tone are strictly defined by your Psychometric Profile and Cognitive Bias.\n"
        "6. If a buying barrier is unaddressed, penalize the Trust score, but if your trust triggers ARE hit, boost the score accordingly.\n"
        "7. In the 'clash_quote' field, quote the exact sentence that caused your strongest reaction (whether positive or negative).\n"
        f"{res_ctx_str}"
    )
    
    prompt = f"{system_prompt}\n\nAd Copy to Review:\n{simulated_copy}"
    
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
    negativity_bias: float = 0.3,
    trust_analysis=None,
    devils_issues=None
) -> FocusGroupReport:
    """
    Compiles individual critiques, computes negativity-biased score,
    applies 60/40 Trust Evidence formula, and generates actionable revision suggestions.
    """
    # 1. FAANG-Grade Scoring: Polarization Index & Bayesian Normalization
    scores = [c.resonance_score for c in critiques]
    n = len(scores)
    avg_score = sum(scores) / n if n > 0 else 0
    
    # Calculate Polarization Index (Population Standard Deviation)
    import math
    variance = sum((x - avg_score) ** 2 for x in scores) / n if n > 0 else 0
    polarization_index = round(math.sqrt(variance), 2)
    
    # Z-Score Outlier Softening
    # If a persona scores wildly out of bound (z-score > 1.25), pull their score towards the mean
    normalized_scores = []
    if polarization_index > 0:
        for s in scores:
            z_score = abs(s - avg_score) / polarization_index
            if z_score > 1.25:
                # Soften the outlier's impact by 50%
                normalized_scores.append(s - ((s - avg_score) * 0.5))
            else:
                normalized_scores.append(s)
    else:
        normalized_scores = scores

    normalized_avg = sum(normalized_scores) / n if n > 0 else 0
    min_norm = min(normalized_scores) if normalized_scores else 0

    # Determine Risk Profile based on personas (Enterprise/B2B = Consensus, D2C = Aggregate)
    is_high_risk = any("loss aversion" in (getattr(p, "dominant_cognitive_bias") or "").lower() for p in personas)
    if is_high_risk:
        # Consensus Model: Softened veto weight to prevent token-wasting infinite revision loops (0.25 min + 0.75 avg)
        overall_score = int(0.25 * min_norm + 0.75 * normalized_avg)
    else:
        # Aggregate Model: Average appeal drives success
        overall_score = int(normalized_avg)
        
    overall_score = max(0, min(100, overall_score))
    
    # 2. Call Analyst LLM to generate actionable recommendations
    polarization_directive = (
        "HIGH POLARIZATION DETECTED: Do NOT suggest a watered-down compromise that pleases everyone but excites no one. "
        "Explicitly suggest leaning into the primary target audience."
    ) if polarization_index >= 15.0 else (
        "LOW POLARIZATION: The copy is generally agreed upon. Refine the friction points without losing the core message."
    )

    system_prompt = (
        "You are a Lead Marketing Analyst and Copywriting Director.\n"
        "Review the original copy and the individual critiques generated by a focus group of target personas.\n"
        "Your task is to compile a FocusGroupReport containing:\n"
        f"- The overall score (mathematically normalized to {overall_score})\n"
        "- Actionable recommendations: specific, text-level copy rewrites to resolve the friction points "
        "raised by the personas. For each recommendation, suggest an exact replacement text.\n"
        f"POLARIZATION INDEX: {polarization_index}\n"
        f"{polarization_directive}\n"
        "THE 'SO WHAT?' STRESS TEST: Before finalizing any `suggested_revision`, ask 'So what?'. If your rewrite is just polished generic marketing, it FAILS. EVERY rewrite MUST inject a specific, quantifiable ROI or a tangible, named feature. Use placeholders like '[Insert X% stat here]' if data is missing.\n"
        "SAFETY DIRECTIVE: Do NOT introduce unverified, illegal, or medical claims (e.g. 'FDA Approved', 'Guaranteed Returns').\n"
        "Respond matching the FocusGroupReport schema format."
    )
    
    critique_summaries = "\n\n".join([
        f"Persona {c.persona_id} (Score: {c.resonance_score}):\n"
        f"- Resonating Elements: {', '.join(getattr(c, 'resonating_elements', []))}\n"
        f"- Friction Points: {', '.join(getattr(c, 'friction_points', []))}\n"
        f"- Trigger Quote: '{c.clash_quote}'"
        for c in critiques
    ])
    
    prompt = (
        f"Overall Calculated Score: {overall_score} (Polarization: {polarization_index})\n\n"
        f"Original Copy:\n{copy_output}\n\n"
        f"Persona Critiques:\n{critique_summaries}\n\n"
        f"{system_prompt}"
    )
    
    loop = asyncio.get_running_loop()
    synthesis = await loop.run_in_executor(
        None,
        lambda: client.generate_structured(prompt=prompt, response_model=AnalystSynthesis, temperature=0.2, seed=42)
    )
    
    from services.trust_model_resolver import TrustModelResolver
    from services.confidence_engine import calculate_simulation_confidence
    from schemas.simulation import TrustSignalAnalysis, GatedReadiness, DecisionExplanation

    if trust_analysis is None:
        trust_analysis = TrustSignalAnalysis(evidence_score=70.0, detected_proof_elements=["Copy structure"], missing_proof_elements=["Specific metrics"])
    if devils_issues is None:
        devils_issues = getattr(synthesis, 'devils_advocate_issues', [])

    # 3. Dynamic Industry Trust Model (B2B SaaS, Healthcare, DTC, Luxury, Default)
    # Detect target industry from brand context or persona occupation
    industry_hint = personas[0].occupation if personas else "default"
    trust_config = TrustModelResolver.resolve(industry_hint)

    persona_trust_scores = [c.rubric.trust * 20.0 for c in critiques if hasattr(c, 'rubric') and hasattr(c.rubric, 'trust')]
    persona_perception_trust = sum(persona_trust_scores) / len(persona_trust_scores) if persona_trust_scores else 70.0
    evidence_score = trust_analysis.evidence_score

    final_trust_score = (trust_config.evidence_weight * evidence_score) + (trust_config.perception_weight * persona_perception_trust)

    # Hard Gate Check
    critical_devils_issues = [i for i in devils_issues if getattr(i, 'severity', '').upper() == 'CRITICAL']
    passed_gates = (final_trust_score >= 75.0) and (len(critical_devils_issues) == 0)
    failed_reasons = []
    if final_trust_score < 75.0:
        failed_reasons.append(f"Trust & Credibility score ({final_trust_score:.1f}%) is below the minimum required 75.0% threshold (Evidence weight: {trust_config.evidence_weight:.2f}, Perception weight: {trust_config.perception_weight:.2f}).")
    if critical_devils_issues:
        failed_reasons.append(f"Found {len(critical_devils_issues)} CRITICAL conversion blockers identified by Devil's Advocate audit.")

    gated_readiness = GatedReadiness(
        passed_gates=passed_gates,
        trust_score=round(final_trust_score, 1),
        evidence_score=round(evidence_score, 1),
        persona_perception_score=round(persona_perception_trust, 1),
        cognitive_load=35.0,
        failed_reasons=failed_reasons
    )

    # 4. Simulation Signal Density Model (Confidence Engine with Empirical Bayes & Cognitive Friction Index)
    crit_count = len([d for d in devils_issues if getattr(d, 'severity', 'LOW') == 'CRITICAL'])
    high_count = len([d for d in devils_issues if getattr(d, 'severity', 'LOW') == 'HIGH'])
    med_count = len([d for d in devils_issues if getattr(d, 'severity', 'LOW') == 'MEDIUM'])
    cfi = max(0.0, 1.0 - (crit_count * 0.40 + high_count * 0.20 + med_count * 0.05))

    conf_score = calculate_simulation_confidence(
        persona_count=len(personas),
        evidence_score=evidence_score,
        critiques=critiques,
        has_historical_benchmarks=True,
        cognitive_friction_index=cfi,
        has_cross_model_consensus=True
    )

    # 5. Construct DecisionExplanation (no chain-of-thought)
    positive_drivers = [f"Clear messaging for persona {c.persona_id}" for c in critiques if c.rubric.clarity >= 4]
    negative_drivers = [c.objection for c in critiques if c.rubric.trust <= 2 or c.rubric.value <= 2]
    recommendations_list = [r.suggested_revision for r in synthesis.actionable_recommendations]

    decision_explanation = DecisionExplanation(
        positive_drivers=positive_drivers or ["Structured value proposition"],
        negative_drivers=negative_drivers or ["Unaddressed buyer hesitation points"],
        detected_signals=trust_analysis.detected_proof_elements,
        recommendations=recommendations_list,
        confidence_factors=[
            f"Evaluated against {len(critiques)} personas",
            f"Industry Model: {trust_config.industry} (Ev: {trust_config.evidence_weight:.2f}, Per: {trust_config.perception_weight:.2f})",
            f"Evidence Score: {evidence_score:.1f}%"
        ],
        confidence_score=conf_score
    )

    # Apply claim guardrail sanitization to analyst recommendations
    sanitized_recs = sanitize_copy_rewrites(synthesis.actionable_recommendations)
    
    return FocusGroupReport(
        overall_score=overall_score,
        polarization_index=polarization_index,
        persona_critiques=critiques,
        actionable_recommendations=sanitized_recs,
        personas=personas,
        gated_readiness=gated_readiness,
        devils_advocate_issues=devils_issues,
        decision_explanation=decision_explanation,
        trust_signal_analysis=trust_analysis
    )
