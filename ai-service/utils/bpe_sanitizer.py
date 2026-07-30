"""
BPE Whitespace Sanitizer & Prompt Minifier Utility.

Collapses redundant whitespace and line breaks for BPE tokenizers
(cl100k_base, Llama 3, Gemini BPE) while preserving markdown structural boundaries
and string literals.
"""

import json
import re
from typing import Any


def minify_prompt_context(text: str) -> str:
    """
    Minify prompt text for BPE tokenizer efficiency.
    
    1. Strips trailing whitespace from lines.
    2. Collapses 3+ consecutive newlines into clean double newlines (\n\n).
    3. Preserves markdown formatting (#, ##, 1., -).
    """
    if not text or not isinstance(text, str):
        return text or ""

    # Strip trailing whitespace on each line
    cleaned = re.sub(r'[ \t]+\n', '\n', text)
    # Collapse 3+ consecutive newlines into double newlines
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def safe_bpe_json_dumps(obj: Any) -> str:
    """
    Compact JSON serialization for prompt variable injection.
    Uses tight separators=(',', ':') without indentation spaces.
    """
    if obj is None:
        return "null"
    if isinstance(obj, str):
        return obj
    try:
        return json.dumps(obj, separators=(',', ':'), ensure_ascii=False)
    except Exception:
        return str(obj)
