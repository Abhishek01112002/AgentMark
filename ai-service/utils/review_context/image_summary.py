"""
Image Summary Builder — Normalizes and extracts visual direction for Reviewer.
"""

import json
from typing import Any, Dict
from utils.review_context.models import ImageSummary


def _safe_parse_json(raw: Any) -> Dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except Exception:
            return {}
    return {}


def build_image_summary(image_raw: Any) -> ImageSummary:
    """Extract visual direction, key visual themes, and prompt count."""
    data = _safe_parse_json(image_raw)
    if not data:
        return ImageSummary(status="EMPTY")

    visual_dir = data.get("visual_direction", {}) or {}
    prompts = data.get("image_prompts", []) or []

    return ImageSummary(
        status="VALIDATED",
        overall_style=visual_dir.get("overall_style", ""),
        mood=visual_dir.get("mood", ""),
        visual_themes=(visual_dir.get("key_visual_themes") or [])[:3],
        prompt_count=len(prompts),
    )
