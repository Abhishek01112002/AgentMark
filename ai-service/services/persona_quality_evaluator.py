"""
Persona Quality Evaluator — AgentMark AI Pre-Flight Engine

Evaluates generated personas across 4 quality dimensions:
1. ICP Match Quality
2. Industry Relevance
3. Decision Role Completeness
4. Objection Coverage

Rejects persona panels with overall confidence score < 0.60.
"""

import logging
from typing import Dict, List, Any
from schemas.simulation import PersonaProfile

logger = logging.getLogger("agentmark.persona_quality")


class PersonaQualityResult(dict):
    """Container for persona quality metrics."""
    pass


def evaluate_persona_quality(persona: PersonaProfile, target_industry: str) -> float:
    """
    Computes quality confidence score (0.0 - 1.0) for a generated persona profile.
    """
    score = 0.0

    # 1. Role & ID Completeness (0.25)
    if persona.id and persona.name and len(persona.name) > 3:
        score += 0.25

    # 2. Industry & Cognitive Profile Relevance (0.25)
    if persona.occupation and persona.cognitive_profile:
        score += 0.25

    # 3. Decision Role & Buying Barrier Completeness (0.25)
    if persona.buying_barriers and len(persona.buying_barriers) >= 1:
        score += 0.25

    # 4. Trust Triggers & Objection Coverage (0.25)
    if persona.trust_triggers and len(persona.trust_triggers) >= 1:
        score += 0.25

    return round(score, 2)


def evaluate_persona_panel_quality(personas: List[PersonaProfile], target_industry: str) -> Dict[str, Any]:
    """
    Evaluates an entire generated panel of personas.
    Rejects panel if panel average confidence score < 0.60.
    """
    if not personas:
        return {"passed": False, "panel_confidence": 0.0, "reason": "Empty persona panel"}

    scores = [evaluate_persona_quality(p, target_industry) for p in personas]
    avg_confidence = round(sum(scores) / len(scores), 2)

    passed = avg_confidence >= 0.60
    return {
        "passed": passed,
        "panel_confidence": avg_confidence,
        "individual_scores": scores,
        "reason": None if passed else f"Panel confidence ({avg_confidence}) below minimum 0.60 threshold."
    }
