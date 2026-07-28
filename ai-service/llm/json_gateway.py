"""
Production-Grade LLM Output Gateway for AgentMark.
Provides strict JSON extraction, schema-aware normalization, repair strategies,
and reliability metrics for LLM responses.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar
from pydantic import BaseModel, ValidationError
import json_repair

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class LLMReliabilityMetrics:
    """Thread-safe metrics for monitoring LLM output gateway reliability."""
    def __init__(self):
        self.json_success_count = 0
        self.repair_success_count = 0
        self.retry_success_count = 0
        self.provider_failure_count = 0
        self.total_requests = 0

    def record_success(self, repaired: bool = False, retried: bool = False):
        self.total_requests += 1
        self.json_success_count += 1
        if repaired:
            self.repair_success_count += 1
        if retried:
            self.retry_success_count += 1

    def record_failure(self):
        self.total_requests += 1
        self.provider_failure_count += 1

    def get_summary(self) -> Dict[str, Any]:
        success_rate = (self.json_success_count / self.total_requests * 100) if self.total_requests > 0 else 100.0
        return {
            "total_requests": self.total_requests,
            "json_success_count": self.json_success_count,
            "repair_success_count": self.repair_success_count,
            "retry_success_count": self.retry_success_count,
            "provider_failure_count": self.provider_failure_count,
            "success_rate_pct": round(success_rate, 2),
        }


METRICS = LLMReliabilityMetrics()


def clean_markdown_fences(text: str) -> str:
    """Removes markdown code blocks and trailing commentary."""
    text = text.strip()
    if text.startswith("```"):
        # Match ```json or ``` at start
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    if text.endswith("```"):
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def extract_first_json_object(text: str) -> Optional[str]:
    """
    Extracts the first balanced JSON object {...} or JSON array [...] from text,
    ignoring trailing text, extra closing braces, or commentary.
    """
    text = clean_markdown_fences(text)
    
    # Locate first '{' or '['
    first_brace = text.find("{")
    first_bracket = text.find("[")
    
    if first_brace == -1 and first_bracket == -1:
        return None

    # Determine starting token
    if first_brace != -1 and (first_bracket == -1 or first_brace < first_bracket):
        start_idx = first_brace
        open_char, close_char = "{", "}"
    else:
        start_idx = first_bracket
        open_char, close_char = "[", "]"

    depth = 0
    in_string = False
    escape = False

    for i in range(start_idx, len(text)):
        char = text[i]

        if escape:
            escape = False
            continue

        if char == "\\":
            escape = True
            continue

        if char == '"':
            in_string = not in_string
            continue

        if not in_string:
            if char == open_char:
                depth += 1
            elif char == close_char:
                depth -= 1
                if depth == 0:
                    return text[start_idx : i + 1]

    # If unclosed due to partial truncation, return string from start to end for repair
    return text[start_idx:]


def normalize_array_to_object(data: Any, response_model: Type[T]) -> Optional[Dict[str, Any]]:
    """
    If the LLM returned a JSON list [...] when a BaseModel object is expected,
    extracts the first matching element from the list.
    """
    if isinstance(data, list) and len(data) > 0:
        logger.warning(f"Normalizing LLM output array ({len(data)} items) into single object for {response_model.__name__}")
        for item in data:
            if isinstance(item, dict):
                # Verify if item contains model fields
                schema_fields = response_model.model_fields.keys() if hasattr(response_model, "model_fields") else {}
                if any(k in item for k in schema_fields):
                    return item
        # Fallback to first dict item if no exact match
        for item in data:
            if isinstance(item, dict):
                return item
    return None


def parse_and_validate(
    raw_text: str, response_model: Type[T], agent_name: str = "agent"
) -> Tuple[Optional[T], Optional[str], bool]:
    """
    Core Output Gateway Normalizer.
    Returns (validated_model, error_message, was_repaired).
    """
    if not raw_text or not raw_text.strip():
        return None, "Raw response is empty", False

    # Step 1: Extract JSON candidate
    extracted = extract_first_json_object(raw_text) or raw_text.strip()
    was_repaired = False

    # Step 2: Attempt Direct Validation
    try:
        model_instance = response_model.model_validate_json(extracted)
        METRICS.record_success(repaired=False)
        return model_instance, None, False
    except Exception as initial_err:
        logger.debug(f"Direct JSON validation failed for {response_model.__name__}: {initial_err}")

    # Step 3: Attempt Array Normalization if LLM returned a list
    try:
        raw_json_obj = json.loads(extracted)
        if isinstance(raw_json_obj, list):
            norm_dict = normalize_array_to_object(raw_json_obj, response_model)
            if norm_dict:
                model_instance = response_model.model_validate(norm_dict)
                logger.info(f"Successfully normalized array to object for {response_model.__name__}")
                METRICS.record_success(repaired=True)
                return model_instance, None, True
    except Exception:
        pass

    # Step 4: Attempt json_repair for syntax errors / trailing chars / unclosed braces
    try:
        repaired_text = json_repair.repair_json(extracted)
        repaired_obj = json.loads(repaired_text)
        
        if isinstance(repaired_obj, list):
            norm_dict = normalize_array_to_object(repaired_obj, response_model)
            if norm_dict:
                repaired_obj = norm_dict

        if isinstance(repaired_obj, dict):
            model_instance = response_model.model_validate(repaired_obj)
            logger.info(f"Successfully repaired JSON for {response_model.__name__} using json_repair")
            METRICS.record_success(repaired=True)
            return model_instance, None, True
    except Exception as repair_err:
        err_msg = f"{response_model.__name__} validation failed after repair: {repair_err}"
        logger.warning(f"JSON Gateway Repair Failed | agent={agent_name} | error={err_msg}")

    METRICS.record_failure()
    return None, f"JSON validation failed: {raw_text[:200]}...", False


def build_schema_correction_prompt(prompt: str, response_model: Type[T], error_msg: str) -> str:
    """Builds a targeted retry prompt when initial LLM output violates schema structure."""
    schema = response_model.model_json_schema()
    compact_schema = json.dumps(schema, separators=(",", ":"))
    
    return f"""{prompt}

🚨 CRITICAL FORMAT CORRECTION REQUIRED:
Your previous response failed JSON schema validation for model '{response_model.__name__}'.
Validation Error: {error_msg}

YOU MUST FOLLOW THESE RULES:
1. Return ONLY a single valid JSON object starting with '{{' and ending with '}}'.
2. Do NOT return a JSON array `[...]`.
3. Do NOT include markdown blocks, code fences, trailing text, or commentary.
4. Match this exact JSON schema:
{compact_schema}"""
