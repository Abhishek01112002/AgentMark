"""
Production-Grade LLM Output Gateway for AgentMark.
Provides strict JSON extraction, schema-aware normalization, repair strategies,
control character sanitization, and zero-crash reliability metrics for LLM responses.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional, Tuple, Type, TypeVar, get_origin
from pydantic import BaseModel, ValidationError
from pydantic_core import PydanticUndefined
import json_repair

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


class LLMReliabilityMetrics:
    """Thread-safe metrics for monitoring LLM output gateway reliability."""
    def __init__(self):
        self.json_success_count = 0
        self.repair_success_count = 0
        self.retry_success_count = 0
        self.fallback_used_count = 0
        self.provider_failure_count = 0
        self.total_requests = 0

    def record_success(self, repaired: bool = False, retried: bool = False, fallback: bool = False):
        self.total_requests += 1
        self.json_success_count += 1
        if repaired:
            self.repair_success_count += 1
        if retried:
            self.retry_success_count += 1
        if fallback:
            self.fallback_used_count += 1

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
            "fallback_used_count": self.fallback_used_count,
            "provider_failure_count": self.provider_failure_count,
            "success_rate_pct": round(success_rate, 2),
        }


METRICS = LLMReliabilityMetrics()


def clean_markdown_fences(text: str) -> str:
    """Removes markdown code blocks, preambles, and trailing commentary."""
    if not text:
        return ""
    text = text.strip()
    # Strip conversational preamble if present
    preamble_match = re.search(r"^(?:sure|here|below|ok|certainly|i have|the requested)[^\n]*:\s*", text, re.IGNORECASE)
    if preamble_match:
        text = text[preamble_match.end():].strip()

    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    if text.endswith("```"):
        text = re.sub(r"\n?```$", "", text)
    return text.strip()


def sanitize_control_characters(text: str) -> str:
    """
    Fixes unescaped control characters (newlines, tabs, raw control codes) inside JSON strings.
    """
    if not text:
        return text

    buffer = []
    in_string = False
    escape = False

    for char in text:
        if escape:
            buffer.append(char)
            escape = False
            continue
        if char == "\\":
            buffer.append(char)
            escape = True
            continue
        if char == '"':
            in_string = not in_string
            buffer.append(char)
            continue

        if in_string:
            if char == '\n':
                buffer.append('\\n')
            elif char == '\r':
                buffer.append('\\r')
            elif char == '\t':
                buffer.append('\\t')
            elif ord(char) < 32:
                buffer.append(f'\\u{ord(char):04x}')
            else:
                buffer.append(char)
        else:
            buffer.append(char)

    return "".join(buffer)


def extract_first_json_object(text: str) -> Optional[str]:
    """
    Extracts the first balanced JSON object {...} or JSON array [...] from text,
    ignoring trailing text, extra closing braces, or commentary.
    """
    text = clean_markdown_fences(text)
    if not text:
        return None

    first_brace = text.find("{")
    first_bracket = text.find("[")

    if first_brace == -1 and first_bracket == -1:
        return None

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

    # Partial payload (truncated) — return from start_idx to end for repair
    return text[start_idx:]


def flatten_json_schema(schema: dict) -> dict:
    """
    Recursively resolves $defs / $ref pointers in a Pydantic v2 JSON schema dictionary,
    producing a flat, self-contained schema free of $ref pointers (for Gemini gRPC compatibility).
    """
    if not isinstance(schema, dict):
        return schema

    defs = schema.get("$defs", {}) or schema.get("definitions", {})

    def resolve(obj: Any) -> Any:
        if isinstance(obj, dict):
            if "$ref" in obj:
                ref_path = obj["$ref"]
                ref_key = ref_path.split("/")[-1]
                if ref_key in defs:
                    resolved_def = resolve(defs[ref_key])
                    merged = {**resolved_def}
                    for k, v in obj.items():
                        if k != "$ref":
                            merged[k] = resolve(v)
                    return merged
            return {k: resolve(v) for k, v in obj.items() if k not in ("$defs", "definitions")}
        elif isinstance(obj, list):
            return [resolve(item) for item in obj]
        return obj

    flattened = resolve(schema)
    if isinstance(flattened, dict):
        flattened.pop("$defs", None)
        flattened.pop("definitions", None)
    return flattened


def normalize_array_to_object(data: Any, response_model: Type[T]) -> Optional[Dict[str, Any]]:
    """
    If the LLM returned a JSON list [...] when a BaseModel object is expected:
    1. Wraps array if response_model has a list container field.
    2. Extracts matching dictionary from array.
    """
    if isinstance(data, list):
        if not data:
            return {}

        if hasattr(response_model, "model_fields"):
            fields = response_model.model_fields
            list_fields = [k for k, field_info in fields.items() if get_origin(field_info.annotation) in (list, List)]
            if len(list_fields) == 1:
                target_field = list_fields[0]
                logger.info(f"Wrapping JSON array ({len(data)} items) into container field '{target_field}' for {response_model.__name__}")
                return {target_field: data}

        schema_fields = set(response_model.model_fields.keys()) if hasattr(response_model, "model_fields") else set()
        for item in data:
            if isinstance(item, dict):
                if schema_fields and any(k in item for k in schema_fields):
                    return item
        for item in data:
            if isinstance(item, dict):
                return item
    return None


def instantiate_fallback_instance(response_model: Type[T]) -> T:
    """
    Guarantees a zero-crash fallback instance for any Pydantic model.
    Populates required fields with safe default mock values.
    """
    try:
        return response_model()
    except Exception:
        pass

    fallback_dict = {}
    if hasattr(response_model, "model_fields"):
        for field_name, field_info in response_model.model_fields.items():
            if field_info.default is not PydanticUndefined:
                fallback_dict[field_name] = field_info.default
            elif field_info.default_factory is not None:
                fallback_dict[field_name] = field_info.default_factory()
            else:
                annotation = field_info.annotation
                origin = get_origin(annotation)
                if origin is list or annotation is list:
                    fallback_dict[field_name] = []
                elif origin is dict or annotation is dict:
                    fallback_dict[field_name] = {}
                elif annotation in (int, float):
                    fallback_dict[field_name] = 0
                elif annotation is bool:
                    fallback_dict[field_name] = False
                elif annotation is str:
                    fallback_dict[field_name] = f"Fallback {field_name}"
                else:
                    fallback_dict[field_name] = None

    try:
        return response_model.model_validate(fallback_dict)
    except Exception:
        return response_model.model_construct(**fallback_dict)


def parse_and_validate(
    raw_text: str, response_model: Type[T], agent_name: str = "agent"
) -> Tuple[Optional[T], Optional[str], bool]:
    """
    Core Output Gateway Normalizer.
    Returns (validated_model, error_message, was_repaired).
    """
    if not raw_text or not raw_text.strip():
        return None, "Raw response is empty", False

    # Step 1: Extract candidate string
    extracted = extract_first_json_object(raw_text) or clean_markdown_fences(raw_text)

    # Step 2: Attempt Direct Validation
    try:
        model_instance = response_model.model_validate_json(extracted)
        METRICS.record_success(repaired=False)
        return model_instance, None, False
    except Exception as initial_err:
        logger.debug(f"Direct JSON validation failed for {response_model.__name__}: {initial_err}")

    # Step 3: Sanitize control characters & re-attempt direct validation
    try:
        sanitized = sanitize_control_characters(extracted)
        model_instance = response_model.model_validate_json(sanitized)
        logger.info(f"Successfully validated after control character sanitization for {response_model.__name__}")
        METRICS.record_success(repaired=True)
        return model_instance, None, True
    except Exception:
        pass

    # Step 4: Attempt Array Normalization if LLM returned a list
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

    # Step 5: Attempt json_repair for syntax errors / trailing commas / unclosed braces
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
