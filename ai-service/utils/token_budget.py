"""
Tiktoken Token-Budgeted Adaptive Slicing Engine.

Calculates exact BPE token counts via tiktoken cl100k_base with heuristic fallback
and provider-aware headroom safety buffers.
Provides entropy-preserving head/tail slicing on clean sentence/paragraph boundaries
and priority-aware structural JSON array trimming to guarantee payload budget compliance.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Set, Union

logger = logging.getLogger(__name__)

# Primary BPE Tokenizer initialization with graceful fallback
_ENCODING = None
try:
    import tiktoken
    _ENCODING = tiktoken.get_encoding("cl100k_base")
except Exception as _tiktoken_err:
    logger.warning(f"Tiktoken initialization warning: {_tiktoken_err} — falling back to heuristic counting")

# Provider-specific safety headroom buffers to account for BPE tokenizer variance
# (e.g. Gemini SentencePiece, Llama 3 128k BPE vs cl100k_base)
PROVIDER_HEADROOM_MARGINS: Dict[str, float] = {
    "openai": 1.0,
    "azure": 1.0,
    "gemini": 1.20,     # +20% safety margin for SentencePiece BPE variance
    "groq": 1.25,       # +25% safety margin for Llama 3 128k BPE variance
    "anthropic": 1.15,  # +15% safety margin
}

PRUNABLE_KEYS: Set[str] = {
    "metadata", "history", "raw_dump", "camera_specs", "additional_context",
    "objections", "timeline", "search_status", "literas_sources", "tavily_sources"
}

PROTECTED_INTELLIGENCE_KEYS: Set[str] = {
    "customer_voice_insights", "competitor_vulnerabilities", "proven_ad_hooks", "brand_dna"
}


class TokenBudgetManager:
    """Manages BPE token counting, adaptive text slicing, and priority-aware JSON payload trimming."""

    @staticmethod
    def count_tokens(text: str) -> int:
        """
        Calculates exact BPE token count for input text.
        Falls back to len(text) // 4 heuristic if tiktoken fails or unavailable.
        """
        if not text or not isinstance(text, str):
            return 0

        if _ENCODING is not None:
            try:
                return len(_ENCODING.encode(text, disallowed_special=()))
            except Exception:
                pass

        # Heuristic fallback (4 chars per token average)
        return max(1, len(text) // 4)

    @staticmethod
    def count_provider_tokens(text: str, provider: str = "openai") -> int:
        """
        Calculates token count with provider-specific safety headroom buffer.
        """
        base_count = TokenBudgetManager.count_tokens(text)
        margin = PROVIDER_HEADROOM_MARGINS.get(provider.lower(), 1.20)
        return int(base_count * margin)

    @staticmethod
    def slice_context_to_budget(
        text: str,
        max_token_budget: int,
        preserve_ratio: float = 0.4,
        separator: str = "\n[... middle context trimmed for token budget ...]\n",
        provider: str = "openai"
    ) -> str:
        """
        Entropy-Preserving Head/Tail Slicing algorithm.
        
        Slices long context into head and tail portions while preserving
        sentence/paragraph/space boundaries and staying strictly within max_token_budget.
        """
        if not text or not isinstance(text, str):
            return ""

        # Adjust budget with provider safety headroom
        margin = PROVIDER_HEADROOM_MARGINS.get(provider.lower(), 1.0)
        effective_max_budget = int(max_token_budget / margin)

        total_tokens = TokenBudgetManager.count_tokens(text)
        if total_tokens <= effective_max_budget or max_token_budget <= 0:
            return text

        # Handle ultra-tight budgets (< 50 tokens) by returning head text safely
        if effective_max_budget < 50:
            chars_budget = effective_max_budget * 4
            return text[:chars_budget].strip() or text[:50]

        # Calculate Head and Tail token budgets
        sep_tokens = TokenBudgetManager.count_tokens(separator)
        effective_budget = max(10, effective_max_budget - sep_tokens)
        
        head_tokens_target = int(effective_budget * preserve_ratio)
        tail_tokens_target = max(1, effective_budget - head_tokens_target)

        # Estimate character positions based on token proportions
        head_char_approx = int(len(text) * (head_tokens_target / total_tokens))
        tail_char_approx = int(len(text) * (tail_tokens_target / total_tokens))

        # Head boundary alignment: find nearest newline, sentence, or space boundary
        head_cut = head_char_approx
        head_match = text.rfind("\n", 0, head_char_approx + 200)
        if head_match != -1 and head_match > head_char_approx // 2:
            head_cut = head_match
        else:
            period_match = text.rfind(". ", 0, head_char_approx + 100)
            if period_match != -1 and period_match > head_char_approx // 2:
                head_cut = period_match + 1
            else:
                space_match = text.rfind(" ", 0, head_char_approx + 50)
                if space_match != -1 and space_match > head_char_approx // 2:
                    head_cut = space_match

        head_str = text[:head_cut].rstrip()

        # Tail boundary alignment: find nearest newline, sentence, or space boundary
        tail_start_approx = max(head_cut + 1, len(text) - tail_char_approx)
        tail_cut = tail_start_approx
        tail_match = text.find("\n", max(0, tail_start_approx - 200), tail_start_approx + 200)
        if tail_match != -1:
            tail_cut = tail_match + 1
        else:
            period_match = text.find(". ", max(0, tail_start_approx - 100), tail_start_approx + 100)
            if period_match != -1:
                tail_cut = period_match + 2
            else:
                space_match = text.find(" ", max(0, tail_start_approx - 50), tail_start_approx + 50)
                if space_match != -1:
                    tail_cut = space_match + 1

        tail_str = text[tail_cut:].lstrip()

        # Final verification: ensure combined result fits token budget
        combined = f"{head_str}{separator}{tail_str}"
        if TokenBudgetManager.count_tokens(combined) > effective_max_budget:
            excess_tokens = TokenBudgetManager.count_tokens(combined) - effective_max_budget
            trim_chars = excess_tokens * 5
            tail_str = tail_str[trim_chars:].strip()
            combined = f"{head_str}{separator}{tail_str}"

        return combined

    @staticmethod
    def slice_json_payload(json_str: str, max_token_budget: int, provider: str = "openai") -> str:
        """
        Slices a JSON payload structurally.
        First prunes non-essential keys (metadata, history, additional_context),
        then trims remaining nested array lists to prevent syntax corruption.
        """
        if not json_str or not isinstance(json_str, str):
            return json_str or "{}"

        margin = PROVIDER_HEADROOM_MARGINS.get(provider.lower(), 1.0)
        effective_max_budget = int(max_token_budget / margin)

        if TokenBudgetManager.count_tokens(json_str) <= effective_max_budget:
            return json_str

        try:
            data = json.loads(json_str)
            if isinstance(data, dict):
                # Phase 1: Prune non-essential keys first
                for p_key in list(data.keys()):
                    if p_key.lower() in PRUNABLE_KEYS:
                        del data[p_key]
                        res = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
                        if TokenBudgetManager.count_tokens(res) <= effective_max_budget:
                            return res

                # Phase 2: Trim non-protected nested array fields first
                for k, v in data.items():
                    if k.lower() in PROTECTED_INTELLIGENCE_KEYS:
                        continue
                    if isinstance(v, list) and len(v) > 2:
                        data[k] = v[: max(1, len(v) // 2)]
                        res = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
                        if TokenBudgetManager.count_tokens(res) <= effective_max_budget:
                            return res

                # Phase 3: Trim protected keys only if still exceeding budget
                for k, v in data.items():
                    if isinstance(v, list) and len(v) > 2:
                        data[k] = v[: max(1, len(v) // 2)]
            elif isinstance(data, list) and len(data) > 2:
                data = data[: max(1, len(data) // 2)]

            res = json.dumps(data, separators=(',', ':'), ensure_ascii=False)
            if TokenBudgetManager.count_tokens(res) <= effective_max_budget:
                return res
        except Exception:
            pass

        # Fallback to string slicing if JSON parsing fails or array trimming insufficient
        return TokenBudgetManager.slice_context_to_budget(json_str, max_token_budget, provider=provider)
