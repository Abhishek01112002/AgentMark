"""
BPE Whitespace Sanitizer & Prompt Minifier Utility.

Collapses redundant whitespace and line breaks for BPE tokenizers
(cl100k_base, Llama 3, Gemini BPE) while preserving markdown structural boundaries
and string literals.
Includes Sentence Completion Sanitizer to prevent mid-sentence LLM output truncation.
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


def sanitize_incomplete_sentences(text: str) -> str:
    """
    Sanitizes string fields to prevent ugly mid-sentence truncation from LLM max_token caps.
    If the text ends abruptly without a sentence terminator (. ! ?), trims back to the last
    complete sentence or cleanly closes the sentence without dangling conjunctions.
    """
    if not text or not isinstance(text, str):
        return text or ""

    trimmed = text.strip()
    if not trimmed:
        return ""

    # If already properly terminated, return as is
    if trimmed[-1] in ('.', '!', '?', '"', "'", ')', ']', '}'):
        return trimmed

    # Find last sentence boundary (. ! ?)
    last_punct = max(trimmed.rfind('. '), trimmed.rfind('! '), trimmed.rfind('? '))
    if last_punct > len(trimmed) * 0.4:  # If at least 40% of content is in complete sentences
        return trimmed[:last_punct + 1].strip()

    # Otherwise, strip dangling trailing words (prepositions/conjunctions) and append period
    words = trimmed.split()
    dangling = {
        'and', 'the', 'with', 'is', 'are', 'was', 'were', 'of', 'for', 'in', 'by',
        'to', 'at', 'on', 'a', 'an', 'or', 'as', 'but', 'which', 'that', 'from', 'than'
    }
    while len(words) > 1 and words[-1].lower().rstrip(',;:') in dangling:
        words.pop()

    return " ".join(words).rstrip(',;:') + "."
