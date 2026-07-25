"""
Dynamic Persona Composer — AgentMark AI Pre-Flight Engine

Generates context-aware buying committees and consumer panels customized by:
- Campaign Brief
- Industry Vertical
- Target Audience & Product Category
- Buying Context

Rejects low-quality personas (< 0.60 confidence score).
"""

import sys
import logging
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

from schemas.simulation import PersonaProfile
from persona_templates.templates import PERSONA_TEMPLATES
from services.persona_quality_evaluator import evaluate_persona_panel_quality, evaluate_persona_quality
from services.trust_model_resolver import TrustModelResolver
from llm.factory import get_llm_client

logger = logging.getLogger("agentmark.persona_composer")


class GeneratedPersonaListContainer(BaseModel):
    """Schema container for LLM structured output of persona panel."""
    personas: List[PersonaProfile]


def _build_fallback_panel(industry: str) -> List[PersonaProfile]:
    """Generates structured fallback personas from industry template library."""
    resolved_config = TrustModelResolver.resolve(industry)
    raw_templates = PERSONA_TEMPLATES.get(resolved_config.industry, PERSONA_TEMPLATES["b2b_saas"])

    profiles = []
    for idx, t in enumerate(raw_templates):
        profile = PersonaProfile(
            id=t.get("id", f"persona-{idx}"),
            name=t.get("role", "Target Decision Maker"),
            age=35 + (idx * 5),
            occupation=t.get("role", "Professional"),
            income_bracket="$100k - $250k",
            buying_barriers=t.get("objection_patterns", ["Unverified claim"]),
            trust_triggers=t.get("trust_triggers", ["Social proof"]),
            cognitive_profile=t.get("communication_style", "Analytical"),
            company_size=t.get("company_size", "Enterprise"),
            buying_stage=t.get("buying_stage", "Evaluation"),
            risk_tolerance=t.get("risk_tolerance", "Medium"),
            trust_sensitivity=t.get("trust_sensitivity", "High"),
            objection_patterns=t.get("objection_patterns", ["Unverified ROI"]),
            communication_style=t.get("communication_style", "Data-driven")
        )
        profiles.append(profile)
    return profiles


async def compose_dynamic_personas(
    campaign_brief: str,
    industry: str = "B2B SaaS",
    target_audience: str = "Enterprise Decision Makers",
    product_category: str = "Software",
    client: Optional[Any] = None
) -> List[PersonaProfile]:
    """
    Composes a tailored persona panel for pre-flight simulation based on campaign brief & buying context.
    """
    if client is None:
        client = get_llm_client(temperature=0.2)

    prompt = (
        "You are an Enterprise ICP & Buyer Psychology Architect.\n"
        "Generate a panel of 3-4 distinct target personas representing the buying committee or consumer decision makers "
        "for the following campaign context:\n\n"
        f"Campaign Brief: {campaign_brief}\n"
        f"Industry: {industry}\n"
        f"Target Audience: {target_audience}\n"
        f"Product Category: {product_category}\n\n"
        "For each persona, include explicit buying barriers, trust triggers, cognitive profile, company size, and buying stage.\n"
        "Ensure buying committee roles reflect distinct perspectives (e.g. Security/Compliance, Finance/ROI, Engineering/Usability).\n"
        "Return structured JSON matching the GeneratedPersonaListContainer schema."
    )

    try:
        loop = asyncio.get_running_loop()
        res = await loop.run_in_executor(
            None,
            lambda: client.generate_structured(
                prompt=prompt,
                response_model=GeneratedPersonaListContainer,
                temperature=0.3,
                seed=42
            )
        )
        personas = res.personas
        
        # Evaluate Quality Score
        quality_eval = evaluate_persona_panel_quality(personas, industry)
        if not quality_eval["passed"]:
            logger.warning(f"Generated panel failed quality check: {quality_eval['reason']}. Falling back to template panel.")
            return _build_fallback_panel(industry)

        return personas

    except Exception as e:
        logger.error(f"Error in compose_dynamic_personas LLM call: {e}. Falling back to curated templates.")
        return _build_fallback_panel(industry)
