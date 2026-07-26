"""
Reviewer Context Builder — Orchestrates individual summary builders into a strongly-typed ReviewerContext.
"""

from agents.state import CampaignState
from utils.review_context.models import ReviewerContext
from utils.review_context.research_summary import build_research_summary
from utils.review_context.strategy_summary import build_strategy_summary
from utils.review_context.copy_summary import build_copy_summary
from utils.review_context.image_summary import build_image_summary


def build_review_context(state: CampaignState) -> ReviewerContext:
    """Build strongly-typed ReviewerContext from CampaignState."""
    return ReviewerContext(
        research=build_research_summary(state.research_output),
        strategy=build_strategy_summary(state.strategy_output),
        copy=build_copy_summary(state.copy_output),
        image=build_image_summary(state.image_output),
    )
