"""
Multi-Persona Debate Orchestrator — AgentMark AI Pre-Flight Engine

Executes a 3-Round Structured Buying Committee Debate:
- Round 1: Initial Opinions & First Impressions
- Round 2: Cross-Objections & Evidence Defense
- Round 3: Final Buying Committee Decision & Consensus

Rules:
1. Every persona speaks strictly from its own PersonaProfile role & cognitive constraints.
2. Objections must reference specific campaign claims or missing proof evidence.
3. Personas cannot mutate other personas' viewpoints directly.
"""

import sys
import logging
import asyncio
from pathlib import Path
from typing import List, Optional, Any
from pydantic import BaseModel

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import PersonaProfile, DebateRound, DebateSummary, PersonaCritique
from llm.factory import get_llm_client

logger = logging.getLogger("agentmark.debate_orchestrator")


class DebateRoundContainer(BaseModel):
    """LLM Structured Output container for debate rounds."""
    rounds: List[DebateRound]
    buying_probability: float
    consensus: str
    top_objections: List[str]
    unresolved_risks: List[str]
    strongest_positive_signals: List[str]


async def run_multi_persona_debate(
    campaign_copy: str,
    personas: List[PersonaProfile],
    critiques: List[PersonaCritique],
    client: Optional[Any] = None
) -> DebateSummary:
    """
    Orchestrates a 3-round multi-persona buying committee debate.
    """
    if client is None:
        client = get_llm_client(temperature=0.2)

    persona_descriptions = "\n".join([
        f"- Persona [{p.id}] Role: {p.occupation} (Company Size: {p.company_size or 'N/A'}, Risk Tolerance: {p.risk_tolerance or 'Medium'}): "
        f"Barriers: {', '.join(p.buying_barriers)}. Trust Triggers: {', '.join(p.trust_triggers)}."
        for p in personas
    ])

    critique_summaries = "\n".join([
        f"- Persona [{c.persona_id}] Score: {c.resonance_score}/100. Objection: {c.objection}. Verdict: {c.verdict}"
        for c in critiques
    ])

    prompt = (
        "You are an Enterprise Buying Committee Debate Facilitator.\n"
        "Orchestrate a 3-Round Structured Debate between target personas reviewing campaign copy.\n\n"
        f"Campaign Copy:\n<campaign_copy>\n{campaign_copy}\n</campaign_copy>\n\n"
        f"Persona Panel:\n{persona_descriptions}\n\n"
        f"Individual Critiques:\n{critique_summaries}\n\n"
        "DEBATE RULES:\n"
        "1. Every persona speaks ONLY from its own profile constraints and role.\n"
        "2. Objections MUST reference specific text claims or missing proof elements in the copy.\n"
        "3. Personas cannot change each other's minds directly, but can express agreement/disagreement.\n\n"
        "Generate exactly 3 structured debate rounds:\n"
        "- Round 1 (Initial Opinions): Each persona states initial perspective.\n"
        "- Round 2 (Cross-Objections): Personas challenge assumptions or point out missing evidence.\n"
        "- Round 3 (Final Decision): Committee synthesizes consensus ('approve', 'revise', or 'reject').\n\n"
        "Compute committee buying_probability (0-100), top_objections, unresolved_risks, and strongest_positive_signals."
    )

    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(
            None,
            lambda: client.generate_structured(
                prompt=prompt,
                response_model=DebateRoundContainer,
                temperature=0.2,
                seed=42
            )
        )

        consensus_val = res.consensus.lower()
        if consensus_val not in ["approve", "revise", "reject"]:
            consensus_val = "revise" if res.buying_probability < 75.0 else "approve"

        return DebateSummary(
            buying_probability=round(min(100.0, max(0.0, res.buying_probability)), 1),
            consensus=consensus_val,
            top_objections=res.top_objections or ["Unverified ROI claims"],
            unresolved_risks=res.unresolved_risks or ["Missing compliance documentation"],
            strongest_positive_signals=res.strongest_positive_signals or ["Clear product capability messaging"],
            rounds=res.rounds
        )

    except Exception as e:
        logger.error(f"Error executing multi-persona debate LLM call: {e}. Returning fallback debate summary.")
        # Fallback Heuristic Debate Output
        avg_score = sum(c.resonance_score for c in critiques) / len(critiques) if critiques else 65.0
        consensus_val = "approve" if avg_score >= 75.0 else ("revise" if avg_score >= 50.0 else "reject")

        fallback_rounds = [
            DebateRound(round_number=1, speaker_persona_id=personas[0].id if personas else "persona-1", transcript="Initial review of copy proposition."),
            DebateRound(round_number=2, speaker_persona_id=personas[0].id if personas else "persona-1", target_persona_id=personas[1].id if len(personas)>1 else None, transcript="Discussion on proof metrics and implementation risk."),
            DebateRound(round_number=3, speaker_persona_id=personas[0].id if personas else "persona-1", transcript="Final buying committee consensus decision.")
        ]

        return DebateSummary(
            buying_probability=round(avg_score, 1),
            consensus=consensus_val,
            top_objections=[c.objection for c in critiques[:2]] if critiques else ["Unverified claims"],
            unresolved_risks=["Proof of ROI missing"],
            strongest_positive_signals=["Clear value proposition"],
            rounds=fallback_rounds
        )
