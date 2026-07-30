"""
Schema Enum Code Registry & Canonical Expansion.

Maps compact integer codes (1, 2, 3...) to canonical full string values
for high-frequency schema fields to optimize LLM completion token efficiency.
"""

from typing import Any, Dict


CONTENT_TYPE_CODES: Dict[int, str] = {
    1: "promotional_video",
    2: "social_graphics",
    3: "blog_post",
    4: "influencer_post",
    5: "ad_banner",
    6: "email_newsletter",
}

GOAL_CODES: Dict[int, str] = {
    1: "awareness",
    2: "lead_gen",
    3: "sales",
    4: "retention",
    5: "engagement",
}

CHANNEL_CODES: Dict[int, str] = {
    1: "linkedin",
    2: "instagram",
    3: "twitter",
    4: "facebook",
    5: "email",
    6: "youtube",
    7: "tiktok",
    8: "google_ads",
}


def expand_code_to_enum(value: Any, code_map: Dict[int, str], default: str) -> str:
    """
    Expands compact integer code or string digit to canonical string.
    If value is already a full string or unmapped, returns value or fallback default.
    """
    if value is None:
        return default

    if isinstance(value, int):
        if value in code_map:
            return code_map[value]
        from utils.telemetry import get_telemetry_tracker
        get_telemetry_tracker().record_schema_drift("enum_code", value)
        return default

    if isinstance(value, str):
        val_str = value.strip()
        if val_str.isdigit():
            code = int(val_str)
            if code in code_map:
                return code_map[code]
            from utils.telemetry import get_telemetry_tracker
            get_telemetry_tracker().record_schema_drift("enum_code", val_str)
            return default
        return val_str

    return str(value)
