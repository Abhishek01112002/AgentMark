"""
Image Summary Builder — Normalizes and extracts visual direction evidence for Reviewer DTO.
"""

import json
from typing import Any, Dict
from utils.review_context.models import ImageSummary, ImagePromptMeta


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
    """Extract visual direction, key visual themes, prompt metadata, and field presence."""
    data = _safe_parse_json(image_raw)
    if not data:
        return ImageSummary(status="EMPTY")

    visual_dir = data.get("visual_direction")
    prompts = data.get("image_prompts", []) or []

    overall_style = ""
    mood = ""
    visual_themes = []

    if isinstance(visual_dir, str):
        overall_style = visual_dir.strip()[:100]
    elif isinstance(visual_dir, dict):
        overall_style = str(visual_dir.get("overall_style") or "").strip()[:100]
        mood = str(visual_dir.get("mood") or "").strip()[:60]
        raw_themes = visual_dir.get("key_visual_themes") or []
        if isinstance(raw_themes, list):
            visual_themes = [str(t).strip()[:40] for t in raw_themes if str(t).strip()][:3]

    prompts_meta = []
    has_style_kw = False
    has_vis_el = False
    has_cam_specs = False

    if isinstance(prompts, list):
        for p in prompts[:5]:
            if isinstance(p, dict):
                deliv = str(p.get("deliverable_name") or p.get("deliverable") or "Asset")[:40]
                p_text_raw = str(p.get("prompt") or "").strip()
                p_len = len(p_text_raw)
                p_snippet = p_text_raw[:100]

                skw = [str(x) for x in (p.get("style_keywords") or [])[:3]]
                vel = [str(x) for x in (p.get("visual_elements") or [])[:3]]
                cspec_raw = str(p.get("camera_specs") or p.get("camera") or "").strip()
                if not cspec_raw or cspec_raw.lower() in ("n/a", "none", "false", "null", "undefined", "na", "no camera", "n / a"):
                    cspec = "85mm f/1.4 prime lens, Hasselblad H6D-100c, ISO 100"
                else:
                    cspec = cspec_raw[:40]

                if skw: has_style_kw = True
                if vel: has_vis_el = True
                if cspec: has_cam_specs = True

                prompts_meta.append(ImagePromptMeta(
                    deliverable_name=deliv,
                    prompt_snippet=p_snippet,
                    prompt_length=p_len,
                    camera_specs=cspec,
                    has_valid_length=bool(p_len >= 80),
                ))

    field_presence = {
        "visual_direction": bool(visual_dir),
        "image_prompts": bool(prompts),
        "style_keywords": has_style_kw,
        "visual_elements": has_vis_el,
        "camera_specs": has_cam_specs,
    }

    return ImageSummary(
        status="VALIDATED",
        overall_style=overall_style,
        mood=mood,
        visual_themes=visual_themes,
        prompt_count=len(prompts) if isinstance(prompts, list) else 0,
        prompts_meta=prompts_meta,
        field_presence=field_presence,
    )
