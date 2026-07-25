"""
Shared Prompt Sanitizer Utility — AgentMark AI Pre-Flight Engine

Sanitizes raw user campaign text to prevent prompt injection, system directive overrides,
and malicious XML/HTML tag breakout.
"""

import re
import html

# Disallowed instruction patterns to strip or escape
INJECTION_PATTERNS = [
    re.compile(r"ignore\s+(all\s+)?(previous\s+)?instructions", re.IGNORECASE),
    re.compile(r"system\s*:\s*", re.IGNORECASE),
    re.compile(r"you\s+are\s+now\s+", re.IGNORECASE),
    re.compile(r"override\s+(all\s+)?rules", re.IGNORECASE),
]


def sanitize_user_input(text: str | None) -> str:
    """
    Sanitizes raw user input and wraps in strict <campaign_copy> XML tags.
    Strips dangerous injection keywords and escapes unclosed brackets.
    """
    if not text:
        return "<campaign_copy>\n</campaign_copy>"

    cleaned = text.strip()

    # Neutralize active prompt injection phrases
    for pattern in INJECTION_PATTERNS:
        cleaned = pattern.sub("[FILTERED_INSTRUCTION]", cleaned)

    # Escape raw closing campaign_copy tags if injected in user input
    cleaned = cleaned.replace("</campaign_copy>", "&lt;/campaign_copy&gt;")
    cleaned = cleaned.replace("<campaign_copy>", "&lt;campaign_copy&gt;")

    return f"<campaign_copy>\n{cleaned}\n</campaign_copy>"
