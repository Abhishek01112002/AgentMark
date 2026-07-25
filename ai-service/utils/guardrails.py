"""
Guardrails Utility — AgentMark AI Service

Provides claim sanitization and regulatory safety filtering for AI-generated copy rewrites.
"""

import re
import logging
from typing import List
from schemas.simulation import ActionableRecommendation

logger = logging.getLogger("agentmark.guardrails")

# Scoped regex for unauthorized legal/medical/financial claims
UNAUTHORIZED_CLAIMS_REGEX = re.compile(
    r"\b(fda\s+approved|guaranteed\s+100%\s+returns?|100%\s+risk[\s-]free|cures?\s+\w+|certified\s+100%|guaranteed\s+profit)\b",
    re.IGNORECASE
)


def sanitize_copy_rewrites(recommendations: List[ActionableRecommendation]) -> List[ActionableRecommendation]:
    """
    Scans copy rewrites for unauthorized or risky legal/medical claims and sanitizes them using immutable model copies.
    """
    sanitized: List[ActionableRecommendation] = []
    for rec in recommendations:
        rewrite = rec.suggested_revision
        if UNAUTHORIZED_CLAIMS_REGEX.search(rewrite):
            logger.warning("Guardrail flagged unauthorized claim in rewrite: '%s'", rewrite)
            clean_text = UNAUTHORIZED_CLAIMS_REGEX.sub("[Claim Verification Required]", rewrite)
            sanitized.append(rec.model_copy(update={"suggested_revision": clean_text}))
        else:
            sanitized.append(rec)
    return sanitized
