"""
EMOS Phase 4: Memory & Learning Engine
Handles 90-day decay weighting, source reliability filtering (W_learning < 0.65 discarded),
human edit diff ingestion, and non-binding recommendation generation.
NEVER mutates Brand Vault.
"""

from typing import Dict, Any, List, Optional
import math
import datetime
import logging

logger = logging.getLogger(__name__)

DECAY_HALF_LIFE_DAYS = 90.0
LAMBDA_DECAY = math.log(2) / DECAY_HALF_LIFE_DAYS


def calculate_decay_weight(age_in_days: float) -> float:
    """Computes exponential half-life decay weight: W = exp(-lambda * days)."""
    days = max(0.0, age_in_days)
    return round(math.exp(-LAMBDA_DECAY * days), 4)


def calculate_learning_weight(
    source_reliability: float,
    noise_factor: float,
    eval_score: float
) -> float:
    """
    Computes learning weight: W_learning = SourceReliability * (1 - NoiseFactor) * (Score / 100)
    """
    s_rel = max(0.0, min(1.0, source_reliability))
    noise = max(0.0, min(1.0, noise_factor))
    score_norm = max(0.0, min(1.0, eval_score / 100.0))

    w_learning = s_rel * (1.0 - noise) * score_norm
    return round(w_learning, 4)


def compute_human_edit_diff_ratio(original_text: str, edited_text: str) -> float:
    """
    Computes similarity diff ratio between original AI copy and human edited copy.
    0.0 = completely changed, 1.0 = identical (no edits made).
    """
    if not original_text or not edited_text:
        return 0.0
    if original_text == edited_text:
        return 1.0

    len_orig = len(original_text)
    len_edit = len(edited_text)

    # Fast character-level diff approximation
    common_chars = sum(1 for a, b in zip(original_text, edited_text) if a == b)
    max_len = max(len_orig, len_edit)
    return round(common_chars / max_len, 4)


def ingest_campaign_memory_event(
    campaign_id: str,
    original_copy: str,
    human_edited_copy: Optional[str],
    eval_score: float,
    source_reliability: float = 0.85,
    noise_factor: float = 0.1
) -> Dict[str, Any]:
    """
    Ingests campaign memory event with source reliability filter.
    If W_learning < 0.65, event is DISCARDED to prevent memory pollution.
    NEVER mutates Brand Vault.
    """
    w_learning = calculate_learning_weight(source_reliability, noise_factor, eval_score)

    if w_learning < 0.65:
        logger.info(f"Memory event for campaign {campaign_id} DISCARDED (W_learning {w_learning} < 0.65 threshold)")
        return {
            "accepted": False,
            "reason": f"W_learning ({w_learning}) < 0.65 threshold (DISCARDED)",
            "w_learning": w_learning,
            "campaign_id": campaign_id
        }

    diff_ratio = compute_human_edit_diff_ratio(original_copy, human_edited_copy or original_copy)
    is_winning_pattern = eval_score >= 85.0 and diff_ratio >= 0.65

    return {
        "accepted": True,
        "campaign_id": campaign_id,
        "w_learning": w_learning,
        "diff_ratio": diff_ratio,
        "is_winning_pattern": is_winning_pattern,
        "decay_weight_t0": 1.0,
        "recommendation": "High-performing hook structure" if is_winning_pattern else "Standard execution"
    }
