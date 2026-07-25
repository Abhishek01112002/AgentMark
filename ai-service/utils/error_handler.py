"""
Agent Error Handling Utility

Provides consistent error handling and retry logic for all agents.
"""

import logging
logger = logging.getLogger(__name__)

from typing import TypeVar, Callable
from pydantic import BaseModel
from agents.state import CampaignState

T = TypeVar('T', bound=BaseModel)


def safe_llm_call(
    state: CampaignState,
    agent_name: str,
    llm_callable: Callable[[], T],
    error_status: str = "error"
) -> tuple[T | None, CampaignState]:
    """
    Safely execute LLM call with error handling and state updates.
    
    Args:
        state: Current campaign state
        agent_name: Name of the agent (for error messages)
        llm_callable: Function that makes the LLM call
        error_status: Status to set if error occurs
        
    Returns:
        Tuple of (result, updated_state)
        - If successful: (Pydantic object, state)
        - If failed: (None, state with error)
        
    Example:
        result, state = safe_llm_call(
            state,
            "Manager",
            lambda: llm.generate_structured(prompt, ManagerOutput)
        )
        if result is None:
            return state  # Error already logged
    """
    try:
        result = llm_callable()
        return result, state
        
    except Exception as e:
        error_type = type(e).__name__
        raw_msg = str(e).strip() or error_type
        error_msg = f"{agent_name} Agent Error ({error_type}): {raw_msg}"
        
        logger.error(
            "💥 LLM Call Failed | agent=%s | campaign_id=%s | error_type=%s | error=%s",
            agent_name,
            getattr(state, "campaign_id", "N/A"),
            error_type,
            raw_msg,
            exc_info=True,
        )
        
        state.status = error_status
        state.error = error_msg
        
        return None, state
