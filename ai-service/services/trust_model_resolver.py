"""
Trust Model Resolver — AgentMark AI Pre-Flight Engine

Resolves industry-specific trust weights dynamically based on business vertical:
- B2B SaaS: Evidence 0.65 / Perception 0.35
- Healthcare: Evidence 0.75 / Perception 0.25
- DTC E-Commerce: Evidence 0.40 / Perception 0.60
- Luxury & Lifestyle: Evidence 0.20 / Perception 0.80
"""

import logging
from typing import Dict, List
from pydantic import BaseModel, Field

logger = logging.getLogger("agentmark.trust_model")


class TrustModelConfig(BaseModel):
    """Industry-specific weights and required trust signals."""
    industry: str
    evidence_weight: float = Field(default=0.60, ge=0.0, le=1.0)
    perception_weight: float = Field(default=0.40, ge=0.0, le=1.0)
    required_signals: List[str] = Field(default_factory=list)


# Industry Trust Configurations
TRUST_MODELS: Dict[str, TrustModelConfig] = {
    "b2b_saas": TrustModelConfig(
        industry="b2b_saas",
        evidence_weight=0.65,
        perception_weight=0.35,
        required_signals=["SOC2 / ISO", "Case Studies", "Measurable ROI Metrics"]
    ),
    "healthcare": TrustModelConfig(
        industry="healthcare",
        evidence_weight=0.75,
        perception_weight=0.25,
        required_signals=["Clinical Trial Data", "Regulatory Disclaimers", "Medical Authority"]
    ),
    "dtc": TrustModelConfig(
        industry="dtc",
        evidence_weight=0.40,
        perception_weight=0.60,
        required_signals=["Customer Testimonials", "Money-Back Guarantee", "User Ratings"]
    ),
    "luxury": TrustModelConfig(
        industry="luxury",
        evidence_weight=0.20,
        perception_weight=0.80,
        required_signals=["Brand Heritage", "Exclusivity Proof", "Craftsmanship"]
    ),
    "default": TrustModelConfig(
        industry="default",
        evidence_weight=0.60,
        perception_weight=0.40,
        required_signals=["Verifiable Data", "Social Proof"]
    ),
}


class TrustModelResolver:
    """Resolver service for industry-specific trust scoring models."""

    @staticmethod
    def resolve(industry_name: str | None = None) -> TrustModelConfig:
        if not industry_name:
            return TRUST_MODELS["default"]
        
        normalized = industry_name.strip().lower().replace(" ", "_").replace("-", "_")
        
        if "saas" in normalized or "b2b" in normalized or "tech" in normalized or "software" in normalized:
            return TRUST_MODELS["b2b_saas"]
        elif "health" in normalized or "pharma" in normalized or "medical" in normalized:
            return TRUST_MODELS["healthcare"]
        elif "dtc" in normalized or "ecomm" in normalized or "retail" in normalized or "shopping" in normalized:
            return TRUST_MODELS["dtc"]
        elif "luxur" in normalized or "fashion" in normalized or "premium" in normalized:
            return TRUST_MODELS["luxury"]
            
        return TRUST_MODELS.get(normalized, TRUST_MODELS["default"])
