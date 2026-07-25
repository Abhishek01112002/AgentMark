"""
Version Registry — Single Source of Truth for Pre-Flight Engine Versions
"""

from typing import Dict

# Central Version Registry Constants
MODEL_VERSION: str = "gpt-4o-2024-08-06"
PROMPT_VERSION: str = "preflight_simulation_v1.5"
SCORING_VERSION: str = "gated_readiness_v2.0"


def get_version_metadata() -> Dict[str, str]:
    """Returns canonical version dictionary."""
    return {
        "model_version": MODEL_VERSION,
        "prompt_version": PROMPT_VERSION,
        "scoring_version": SCORING_VERSION
    }
