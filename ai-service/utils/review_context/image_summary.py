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

    visual_dir = data.get("visual_direction")
    prompts = data.get("image_prompts", []) or []

    overall_style = ""
    mood = ""
    visual_themes = []

    if isinstance(visual_dir, str):
        overall_style = visual_dir.strip()
    elif isinstance(visual_dir, dict):
        overall_style = str(visual_dir.get("overall_style") or "").strip()
        mood = str(visual_dir.get("mood") or "").strip()
        raw_themes = visual_dir.get("key_visual_themes") or []
        if isinstance(raw_themes, list):
            visual_themes = [str(t).strip() for t in raw_themes if str(t).strip()][:3]

    return ImageSummary(
        status="VALIDATED",
        overall_style=overall_style,
        mood=mood,
        visual_themes=visual_themes,
        prompt_count=len(prompts) if isinstance(prompts, list) else 0,
    )

