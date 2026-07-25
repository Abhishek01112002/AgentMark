"""
Budget & Quota Manager — AgentMark AI Pre-Flight Engine (Phase 2C)

Tracks organization monthly token usage and manages automatic model tier downgrades.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger("agentmark.budget_manager")

# Default budget parameters
DEFAULT_MONTHLY_TOKEN_BUDGET = 1_000_000
DOWNGRADE_THRESHOLD_RATIO = 0.80

_ORG_TOKEN_USAGE: Dict[str, int] = {}
_ORG_BUDGET_LIMITS: Dict[str, int] = {}


def record_token_usage(organization_id: str, tokens_used: int) -> None:
    """Records token consumption for an organization."""
    current = _ORG_TOKEN_USAGE.get(organization_id, 0)
    _ORG_TOKEN_USAGE[organization_id] = current + tokens_used


def set_organization_budget(organization_id: str, monthly_token_limit: int) -> None:
    """Sets custom monthly token budget limit for an organization."""
    _ORG_BUDGET_LIMITS[organization_id] = monthly_token_limit


def get_budget_status(organization_id: str) -> Dict[str, Any]:
    """
    Returns usage metrics and budget status for an organization.
    """
    limit = _ORG_BUDGET_LIMITS.get(organization_id, DEFAULT_MONTHLY_TOKEN_BUDGET)
    usage = _ORG_TOKEN_USAGE.get(organization_id, 0)
    ratio = usage / float(limit) if limit > 0 else 0.0

    requires_downgrade = ratio >= DOWNGRADE_THRESHOLD_RATIO
    is_hard_stop = ratio >= 1.0

    return {
        "organization_id": organization_id,
        "tokens_used": usage,
        "monthly_limit": limit,
        "usage_ratio": round(ratio, 4),
        "requires_downgrade": requires_downgrade,
        "is_hard_stop": is_hard_stop
    }


def clear_budget_store() -> None:
    """Clears budget store for tests."""
    _ORG_TOKEN_USAGE.clear()
    _ORG_BUDGET_LIMITS.clear()
