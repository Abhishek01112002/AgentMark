"""
Persona Memory & Retrieval Service — AgentMark AI Pre-Flight Engine

Stores and retrieves historical persona feedback, objections, accepted copy fixes,
and trust evolution.
Memory is strictly isolated per Project + Persona (no cross-tenant leakage).
Relational storage (relational memory store for fast retrieval; vector DB optional).
"""

import sys
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from datetime import datetime, timezone
from pydantic import BaseModel, Field

AISERVICE_DIR = Path(__file__).resolve().parent.parent
if str(AISERVICE_DIR) not in sys.path:
    sys.path.insert(0, str(AISERVICE_DIR))

logger = logging.getLogger("agentmark.persona_memory")


class PersonaMemoryItem(BaseModel):
    """Single persona memory entry."""
    id: str
    persona_id: str
    project_id: str
    memory_type: str  # 'objection', 'accepted_fix', 'unresolved_risk', 'trust_delta'
    summary: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class MemorySummaryResponse(BaseModel):
    """Memory operation summary response for API response contract."""
    recalled_items: List[str] = Field(default_factory=list)
    new_items_saved: List[str] = Field(default_factory=list)
    trust_delta: float = Field(default=0.0)


# In-memory relational store fallback for testing & local development
_IN_MEMORY_STORE: Dict[str, List[PersonaMemoryItem]] = {}


def _get_key(project_id: str, persona_id: str) -> str:
    """Generates scoped key enforcing strict project isolation."""
    return f"{project_id}::{persona_id}"


def load_persona_memories(project_id: str, persona_id: str, limit: int = 5) -> List[PersonaMemoryItem]:
    """
    Loads up to `limit` (default 5) most recent memories for a persona within a specific project.
    Strictly isolated per project_id + persona_id.
    """
    key = _get_key(project_id, persona_id)
    items = _IN_MEMORY_STORE.get(key, [])
    # Most recent items appended last -> return in reverse order
    reversed_items = list(reversed(items))
    return reversed_items[:limit]


def save_simulation_memories(
    project_id: str,
    persona_id: str,
    objections: List[str],
    accepted_fixes: List[str],
    trust_delta: float = 0.0
) -> MemorySummaryResponse:
    """
    Saves new simulation memory items with deduplication for a specific persona and project.
    """
    key = _get_key(project_id, persona_id)
    if key not in _IN_MEMORY_STORE:
        _IN_MEMORY_STORE[key] = []

    existing_summaries = {item.summary.strip().lower() for item in _IN_MEMORY_STORE[key]}
    new_items_saved = []

    # Store Objections
    for obj in objections:
        clean_obj = obj.strip()
        if clean_obj and clean_obj.lower() not in existing_summaries:
            item = PersonaMemoryItem(
                id=f"mem-{len(_IN_MEMORY_STORE[key])+1}",
                persona_id=persona_id,
                project_id=project_id,
                memory_type="objection",
                summary=clean_obj
            )
            _IN_MEMORY_STORE[key].append(item)
            existing_summaries.add(clean_obj.lower())
            new_items_saved.append(f"Objection: {clean_obj}")

    # Store Accepted Fixes
    for fix in accepted_fixes:
        clean_fix = fix.strip()
        if clean_fix and clean_fix.lower() not in existing_summaries:
            item = PersonaMemoryItem(
                id=f"mem-{len(_IN_MEMORY_STORE[key])+1}",
                persona_id=persona_id,
                project_id=project_id,
                memory_type="accepted_fix",
                summary=clean_fix
            )
            _IN_MEMORY_STORE[key].append(item)
            existing_summaries.add(clean_fix.lower())
            new_items_saved.append(f"Accepted Fix: {clean_fix}")

    # Store Trust Delta if non-zero
    if trust_delta != 0.0:
        trust_summary = f"Trust score delta: {trust_delta:+.1f}%"
        if trust_summary.lower() not in existing_summaries:
            item = PersonaMemoryItem(
                id=f"mem-{len(_IN_MEMORY_STORE[key])+1}",
                persona_id=persona_id,
                project_id=project_id,
                memory_type="trust_delta",
                summary=trust_summary
            )
            _IN_MEMORY_STORE[key].append(item)
            new_items_saved.append(trust_summary)

    recalled = [item.summary for item in load_persona_memories(project_id, persona_id, limit=5)]

    return MemorySummaryResponse(
        recalled_items=recalled,
        new_items_saved=new_items_saved,
        trust_delta=trust_delta
    )


def clear_memory_store() -> None:
    """Helper for testing to reset memory state."""
    _IN_MEMORY_STORE.clear()
