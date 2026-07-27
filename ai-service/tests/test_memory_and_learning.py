"""
Unit tests & contract compliance tests for EMOS Phase 4 Memory & Learning Engine
"""

import pytest
from workflow.learning import (
    calculate_decay_weight,
    calculate_learning_weight,
    compute_human_edit_diff_ratio,
    ingest_campaign_memory_event
)


def test_calculate_decay_weight_90_days():
    w_t0 = calculate_decay_weight(0)
    w_t90 = calculate_decay_weight(90)
    w_t180 = calculate_decay_weight(180)

    assert w_t0 == 1.0
    assert abs(w_t90 - 0.5) < 0.01  # 50% decay after 90 days
    assert abs(w_t180 - 0.25) < 0.01  # 25% decay after 180 days


def test_source_reliability_filtering_discarded():
    # Low source reliability (0.4) -> W_learning < 0.65 -> DISCARDED
    res = ingest_campaign_memory_event(
        campaign_id="camp_low_rel",
        original_copy="Some copy",
        human_edited_copy="Some copy",
        eval_score=80.0,
        source_reliability=0.4,
        noise_factor=0.2
    )

    assert res["accepted"] is False
    assert "DISCARDED" in res["reason"]
    assert res["w_learning"] < 0.65


def test_source_reliability_filtering_accepted():
    # High source reliability (0.9), low noise (0.05), high score (90) -> W_learning >= 0.65 -> ACCEPTED
    res = ingest_campaign_memory_event(
        campaign_id="camp_high_rel",
        original_copy="High quality campaign copy text.",
        human_edited_copy="High quality campaign copy text.",
        eval_score=90.0,
        source_reliability=0.9,
        noise_factor=0.05
    )

    assert res["accepted"] is True
    assert res["w_learning"] >= 0.65
    assert res["is_winning_pattern"] is True


def test_compute_human_edit_diff_ratio():
    orig = "Boost your conversion rates by 50% with our automated platform."
    edited = "Boost your conversion rates by 50% with our platform."

    ratio = compute_human_edit_diff_ratio(orig, edited)
    assert ratio >= 0.65  # Minor human edit
