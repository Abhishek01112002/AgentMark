import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Tuple

from utils.token_budget import TokenBudgetManager

logger = logging.getLogger(__name__)

# Strict purpose contract
PurposeType = Literal[
    "research",
    "strategy",
    "copywriter",
    "focus_group",
    "devils_advocate",
    "creative_hook_matrix",
    "image_prompt",
    "publisher",
    "reviewer",
]

# Field definition order reflects priority (0 = highest) for structural budgeting
FIELD_PRIORITIES = [
    "core_value_proposition",
    "brand_voice",
    "target_audience",
    "products",
    "facts",
]

# Purpose-to-field mapping guidance
PURPOSE_MAPPINGS: Dict[PurposeType, List[str]] = {
    "research": ["core_value_proposition", "target_audience", "facts"],
    "strategy": ["core_value_proposition", "target_audience", "products", "facts"],
    "copywriter": ["core_value_proposition", "brand_voice", "target_audience", "products", "facts"],
    "focus_group": ["core_value_proposition", "target_audience", "facts"], # Benefits/Claims map to facts
    "devils_advocate": ["core_value_proposition", "target_audience", "products", "facts"],
    "creative_hook_matrix": ["core_value_proposition", "brand_voice", "target_audience"],
    "image_prompt": ["core_value_proposition", "target_audience", "products"],
    "publisher": ["core_value_proposition", "brand_voice", "products", "facts"],
    "reviewer": ["core_value_proposition", "brand_voice", "products", "facts"], # Confidence/Metadata added via dataclass
}

@dataclass(frozen=True)
class BrandDnaContext:
    text: str
    source: Literal["structured", "legacy", "none"]
    confidence: Optional[Literal["HIGH", "MEDIUM", "LOW"]]
    fallback_used: bool
    included_fields: Tuple[str, ...]
    omitted_fields: Tuple[str, ...]


def _truncate_list(lst: List[str], max_tokens: int) -> Tuple[List[str], int]:
    """Truncates list items sequentially from the end until it fits within max_tokens."""
    if not lst:
        return [], 0
    current_list = list(lst)
    current_json = json.dumps(current_list)
    tokens = TokenBudgetManager.count_tokens(current_json)
    
    while tokens > max_tokens and len(current_list) > 1:
        current_list.pop()
        current_json = json.dumps(current_list)
        tokens = TokenBudgetManager.count_tokens(current_json)
        
    return current_list, tokens


def _format_structured(structured_dna: Dict[str, Any], allowed_fields: List[str], max_tokens: int) -> Tuple[str, List[str], List[str]]:
    """
    Format structured DNA prioritizing fields and respecting the token budget.
    We apply budgeting at complete-field and complete-list-item boundaries.
    Mandatory field (core_value_proposition) is truncated using sentence slicing if it exceeds budget.
    """
    included_fields = []
    omitted_fields = []
    
    current_tokens = 0
    formatted_parts = []
    
    # Pre-calculate mandatory base formatting tokens
    base_overhead = 50 
    remaining_tokens = max_tokens - base_overhead
    
    for field in FIELD_PRIORITIES:
        if field not in allowed_fields:
            continue
            
        value = structured_dna.get(field)
        if not value:
            continue
            
        if isinstance(value, list) and len(value) == 0:
            continue
            
        if field == "core_value_proposition":
            # Highest priority, must include safely
            val_str = str(value)
            val_tokens = TokenBudgetManager.count_tokens(val_str)
            if val_tokens > remaining_tokens:
                val_str = TokenBudgetManager.slice_context_to_budget(val_str, remaining_tokens)
                val_tokens = TokenBudgetManager.count_tokens(val_str)
            
            if val_str:
                formatted_parts.append(f"Value Proposition: {val_str}")
                included_fields.append(field)
                remaining_tokens -= val_tokens
                
        elif field == "brand_voice":
            val_str = str(value)
            val_tokens = TokenBudgetManager.count_tokens(val_str)
            if remaining_tokens >= val_tokens:
                formatted_parts.append(f"Brand Voice: {val_str}")
                included_fields.append(field)
                remaining_tokens -= val_tokens
            else:
                omitted_fields.append(field)
                
        elif field in ("target_audience", "products", "facts"):
            if isinstance(value, list):
                # Budget list items safely
                # Estimate header tokens + json dump approx
                header = f"{field.replace('_', ' ').title()}:\n"
                header_tokens = TokenBudgetManager.count_tokens(header)
                if remaining_tokens <= header_tokens + 10:
                    omitted_fields.append(field)
                    continue
                    
                list_budget = remaining_tokens - header_tokens
                truncated_list, list_tokens = _truncate_list(value, list_budget)
                
                if truncated_list:
                    formatted_parts.append(header + "\n".join(f"- {item}" for item in truncated_list))
                    included_fields.append(field)
                    remaining_tokens -= list_tokens
                    # if len(truncated_list) < len(value), it means we partially omitted list items, but field is included
                else:
                    omitted_fields.append(field)
            else:
                omitted_fields.append(field)
                
    return "\n\n".join(formatted_parts), included_fields, omitted_fields


def build_brand_dna_context(
    brand_dna: Optional[Dict[str, Any]],
    purpose: PurposeType,
    max_tokens: int = 1500,
) -> BrandDnaContext:
    """
    Builds purpose-specific, token-budgeted Brand DNA context.
    Fails fast if purpose is invalid.
    """
    if purpose not in PURPOSE_MAPPINGS:
        raise ValueError(f"Invalid purpose '{purpose}' for Brand DNA context. Supported: {list(PURPOSE_MAPPINGS.keys())}")
        
    if not brand_dna or not isinstance(brand_dna, dict):
        return BrandDnaContext(
            text="",
            source="none",
            confidence="LOW",
            fallback_used=False,
            included_fields=(),
            omitted_fields=tuple(PURPOSE_MAPPINGS[purpose])
        )
        
    allowed_fields = PURPOSE_MAPPINGS[purpose]
    structured_dna = brand_dna.get("structured_dna")
    
    # Check if structured DNA is usable (must be a dict and have at least a value prop or facts)
    if structured_dna and isinstance(structured_dna, dict) and (structured_dna.get("core_value_proposition") or structured_dna.get("facts")):
        formatted_text, included, omitted = _format_structured(structured_dna, allowed_fields, max_tokens)
        
        # Add metadata for reviewer context if reviewer
        if purpose == "reviewer":
            confidence = brand_dna.get("confidence", "MEDIUM")
            source_url = brand_dna.get("source_url", "Unknown")
            meta_header = f"Brand URL: {source_url} | Extraction Confidence: {confidence}\n"
            formatted_text = meta_header + formatted_text
            
        return BrandDnaContext(
            text=formatted_text.strip(),
            source="structured",
            confidence=brand_dna.get("confidence"),
            fallback_used=False,
            included_fields=tuple(included),
            omitted_fields=tuple(omitted)
        )
        
    # Fallback to legacy extracted_hero_text
    hero_text = brand_dna.get("extracted_hero_text")
    if hero_text and isinstance(hero_text, str) and len(hero_text.strip()) > 10:
        budgeted_text = TokenBudgetManager.slice_context_to_budget(hero_text, max_tokens)
        
        if purpose == "reviewer":
            source_url = brand_dna.get("source_url", "Unknown")
            meta_header = f"Brand URL: {source_url} | Extraction Confidence: FALLBACK (Legacy)\n"
            budgeted_text = meta_header + budgeted_text
            
        return BrandDnaContext(
            text=budgeted_text.strip(),
            source="legacy",
            confidence="LOW",
            fallback_used=True,
            included_fields=("extracted_hero_text",),
            omitted_fields=tuple(allowed_fields)
        )
        
    return BrandDnaContext(
        text="",
        source="none",
        confidence="LOW",
        fallback_used=False,
        included_fields=(),
        omitted_fields=tuple(allowed_fields)
    )
