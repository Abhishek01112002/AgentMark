"""
Devil's Advocate Agent — AgentMark AI Pre-Flight Engine

Independent adversarial evaluation agent designed specifically to find reasons
WHY a buyer would NOT convert or click on the proposed ad copy.
Eliminates LLM sycophancy bias by separating adversarial review from persona scoring.
"""

import logging
import asyncio
from typing import List
from pydantic import BaseModel, Field, ConfigDict
from schemas.simulation import DevilsAdvocateIssue, SIMULATION_CONFIG
from llm.factory import get_llm_client

logger = logging.getLogger("agentmark.devils_advocate")


class DevilsAdvocateReportContainer(BaseModel):
    """Container for list of adversarial issues."""
    model_config = SIMULATION_CONFIG

    issues: List[DevilsAdvocateIssue] = Field(
        default_factory=list,
        description="List of risk audit issues identified by the Devil's Advocate"
    )


SYSTEM_PROMPT = """
You are an Adversarial Conversion Auditor & Cynical Enterprise Buyer (Devil's Advocate).
Your ONLY goal is to find weaknesses, risks, missing proof, and reasons NOT to purchase.

CRITICAL DIRECTIVES:
1. Do NOT compliment the copy or offer encouragement.
2. Actively search for generic marketing buzzwords ("revolutionary", "10x", "best-in-class", "seamless").
3. Flag any claim that lacks verifiable proof or evidence.
4. Categorize severity as:
   - CRITICAL: Unsubstantiated high-stakes claim or missing fundamental trust signal.
   - HIGH: Major friction point or vague pricing/benefit statement.
   - MEDIUM: Tone mismatch or minor claim exaggeration.
   - LOW: Nitpick or formatting improvement.
5. Provide a specific, actionable 'recommended_fix' for every issue found.

Return a list of DevilsAdvocateIssue objects matching the schema container.
"""

async def run_devils_advocate_audit(copy_text: str, brand_name: str, client=None, campaign_context: dict | None = None) -> List[DevilsAdvocateIssue]:
    """
    Executes independent Devil's Advocate adversarial audit.
    """
    if client is None:
        client = get_llm_client()

    res_ctx_parts = []
    if campaign_context and isinstance(campaign_context, dict):
        cvi = campaign_context.get("customer_voice_insights") or []
        cvul = campaign_context.get("competitor_vulnerabilities") or []
        dna = campaign_context.get("brand_dna")
        if cvi:
            res_ctx_parts.append("VERBATIM CUSTOMER PAIN QUOTES:\n" + "\n".join(f"- {q}" for q in cvi[:3]))
        if cvul:
            res_ctx_parts.append("COMPETITOR WEAKNESSES TO BEAT:\n" + "\n".join(f"- {v}" for v in cvul[:3]))
        if dna and isinstance(dna, dict) and dna.get("extracted_hero_text"):
            res_ctx_parts.append(f"OFFICIAL BRAND DNA VALUE PROP: {dna.get('extracted_hero_text')}")

    res_ctx_str = ("\n\nRESEARCH INTELLIGENCE EVIDENCE:\n" + "\n".join(res_ctx_parts)) if res_ctx_parts else ""

    prompt = f"{SYSTEM_PROMPT}{res_ctx_str}\n\nBrand: {brand_name}\nAd Copy to Audit:\n<campaign_copy>\n{copy_text}\n</campaign_copy>"

    try:
        loop = asyncio.get_running_loop()
        container = await loop.run_in_executor(
            None,
            lambda: client.generate_structured(
                prompt=prompt,
                response_model=DevilsAdvocateReportContainer,
                temperature=0.3,
                seed=42
            )
        )
        return container.issues
    except Exception as exc:
        logger.warning("Devil's Advocate Agent execution failed (non-fatal): %s", exc)
        return [
            DevilsAdvocateIssue(
                issue="Potential unverified claim in marketing copy",
                severity="MEDIUM",
                evidence=copy_text[:100],
                recommended_fix="Include third-party proof or specific customer metric"
            )
        ]
