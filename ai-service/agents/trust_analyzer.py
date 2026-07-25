"""
Trust Analyzer Agent — AgentMark AI Pre-Flight Engine

Independent agent that evaluates verifiable evidence signals in marketing creative:
- Customer proof, case studies, specific performance numbers
- Guarantees, security certifications, customer logos
Calculates Evidence Signal Score (60% weight in Final Trust Score).
"""

import logging
import asyncio
from schemas.simulation import TrustSignalAnalysis
from llm.factory import get_llm_client

logger = logging.getLogger("agentmark.trust_analyzer")

SYSTEM_PROMPT = """
You are an Enterprise Trust & Evidence Auditor.
Analyze the provided marketing copy for concrete, verifiable evidence signals.

Look for:
1. Specific numbers/metrics (e.g. "99.9% uptime", "reduced costs by 42%")
2. Social proof / Customer references (e.g. "Trusted by 500+ enterprises", logo references)
3. Risk reversal / Guarantees (e.g. "30-day money back", "SOC2 Type II certified")
4. Clear authority or third-party endorsements

Calculate evidence_score (0.0 to 100.0):
- 0-30: Pure marketing fluff, generic buzzwords, zero proof elements.
- 31-69: Moderate claims with some specific numbers but missing social proof/guarantees.
- 70-100: Strong evidence, specific verified metrics, guarantees, or enterprise trust proof.

Return a TrustSignalAnalysis schema object.
"""

async def analyze_trust_signals(copy_text: str, client=None) -> TrustSignalAnalysis:
    """
    Executes independent trust signal analysis on copy text.
    """
    if client is None:
        client = get_llm_client()

    prompt = f"{SYSTEM_PROMPT}\n\nMarketing Copy to Analyze:\n<campaign_copy>\n{copy_text}\n</campaign_copy>"

    try:
        loop = asyncio.get_running_loop()
        analysis = await loop.run_in_executor(
            None,
            lambda: client.generate_structured(
                prompt=prompt,
                response_model=TrustSignalAnalysis,
                temperature=0.1,
                seed=42
            )
        )
        return analysis
    except Exception as exc:
        logger.warning("Trust Analyzer Agent execution failed (falling back to heuristic): %s", exc)
        # Rule-based fallback heuristic if LLM call fails
        detected = []
        missing = []
        if any(char.isdigit() for char in copy_text):
            detected.append("Contains specific numerical data")
            score = 65.0
        else:
            missing.append("Lacks specific numerical data or metrics")
            score = 45.0
            
        return TrustSignalAnalysis(
            evidence_score=score,
            detected_proof_elements=detected,
            missing_proof_elements=missing
        )
