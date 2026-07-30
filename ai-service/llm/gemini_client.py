"""
Gemini LLM client.
"""

import asyncio
import json
import logging
import os
from typing import Type, TypeVar

import warnings
warnings.filterwarnings("ignore", category=FutureWarning, module="google.generativeai")
warnings.filterwarnings("ignore", category=FutureWarning)

import json_repair
import google.generativeai as genai

from pydantic import BaseModel

from .base import (
    BaseLLMClient,
    NonRetryableLLMError,
    RateLimitedLLMError,
    is_payload_too_large_error,
    is_rate_limit_error,
)

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)


def _ensure_event_loop():
    try:
        asyncio.get_event_loop_policy().get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)


class GeminiClient(BaseLLMClient):
    """Gemini API client with fail-fast provider-pool semantics."""

    def __init__(self, api_key: str = None, model: str = None):
        super().__init__()
        _ensure_event_loop()

        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found")

        self.model_name = model or os.getenv("GEMINI_MODEL", "gemini-3.1-flash-lite")
        from google.generativeai.client import _ClientManager

        client_manager = _ClientManager()
        client_manager.configure(api_key=self.api_key)

        self.model = genai.GenerativeModel(self.model_name)
        self.model._client = client_manager.get_default_client("generative")
        self.model._async_client = client_manager.get_default_client("generative_async")

    def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None) -> str:
        _ensure_event_loop()
        try:
            self._wait_for_rate_limit()
            gen_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
            target_model = genai.GenerativeModel(self.model_name, system_instruction=system_prompt) if system_prompt else self.model
            if system_prompt:
                target_model._client = self.model._client
                target_model._async_client = self.model._async_client
            try:
                response = target_model.generate_content(
                    prompt,
                    generation_config=gen_config,
                )
            except Exception as e:
                if "max_output_tokens" in str(e).lower() or "token" in str(e).lower() or "invalid argument" in str(e).lower():
                    logger.warning("Gemini max_output_tokens=%d rejected by model %s, falling back to 4096...", max_tokens, self.model_name)
                    gen_config["max_output_tokens"] = min(max_tokens, 4096)
                    response = target_model.generate_content(
                        prompt,
                        generation_config=gen_config,
                    )
                else:
                    raise e

            self._record_success()
            return response.text
        except Exception as exc:
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: int | None = None,
    ) -> T:
        _ensure_event_loop()
        from .json_gateway import (
            parse_and_validate,
            build_schema_correction_prompt,
            flatten_json_schema,
            instantiate_fallback_instance,
        )

        schema = flatten_json_schema(response_model.model_json_schema())
        compact_schema = json.dumps(schema, separators=(",", ":"))
        enhanced_prompt = f"""{prompt}

You must respond with ONLY a valid JSON object matching this exact schema:
{compact_schema}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- All required fields must be present
- Follow the exact field names and types specified"""

        from utils.token_budget import TokenBudgetManager
        MAX_INPUT_BUDGET = 14000
        sys_tok = TokenBudgetManager.count_tokens(system_prompt or "")
        if sys_tok + TokenBudgetManager.count_tokens(enhanced_prompt) > MAX_INPUT_BUDGET:
            user_budget = max(500, MAX_INPUT_BUDGET - sys_tok)
            enhanced_prompt = TokenBudgetManager.slice_context_to_budget(enhanced_prompt, user_budget)

        try:
            self._wait_for_rate_limit()
            gen_config = {
                "temperature": temperature,
                "max_output_tokens": max_tokens,
                "response_mime_type": "application/json",
            }
            target_model = genai.GenerativeModel(self.model_name, system_instruction=system_prompt) if system_prompt else self.model
            if system_prompt:
                target_model._client = self.model._client
                target_model._async_client = self.model._async_client
            try:
                response = target_model.generate_content(
                    enhanced_prompt,
                    generation_config=gen_config,
                )
            except Exception as e:
                if "max_output_tokens" in str(e).lower() or "token" in str(e).lower():
                    logger.warning("Gemini max_output_tokens=%d rejected in structured mode, retrying with 4096...", max_tokens)
                    gen_config["max_output_tokens"] = min(max_tokens, 4096)
                    response = self.model.generate_content(
                        enhanced_prompt,
                        generation_config=gen_config,
                    )
                else:
                    raise e

            self._record_success()
            if hasattr(response, "usage_metadata") and response.usage_metadata:
                try:
                    prompt_tok = getattr(response.usage_metadata, "prompt_token_count", 0) or 0
                    comp_tok = getattr(response.usage_metadata, "candidates_token_count", 0) or 0
                    cached_tok = getattr(response.usage_metadata, "cached_content_token_count", 0) or 0
                    from utils.telemetry.llm_tracker import get_telemetry_tracker
                    get_telemetry_tracker().record_usage("gemini", prompt_tok, comp_tok, cached_tok)
                except Exception as _tel_err:
                    logger.warning(f"Telemetry logging non-blocking error: {_tel_err}")

            raw_text = response.text or ""
            model_instance, err_msg, was_repaired = parse_and_validate(raw_text, response_model, agent_name="GeminiClient")
            if model_instance:
                return model_instance

            # Step 2: 1-shot Schema-Aware Correction Retry on Gemini before failing over
            logger.warning(f"Gemini initial output failed schema validation ({err_msg}). Executing 1-shot correction retry...")
            retry_prompt = build_schema_correction_prompt(enhanced_prompt, response_model, err_msg or "Invalid JSON structure")

            self._wait_for_rate_limit()
            retry_response = self.model.generate_content(
                retry_prompt,
                generation_config={
                    "temperature": 0.2,
                    "max_output_tokens": max_tokens,
                    "response_mime_type": "application/json",
                },
            )
            self._record_success()

            retry_model_instance, retry_err, _ = parse_and_validate(retry_response.text or "", response_model, agent_name="GeminiClient-Retry")
            if retry_model_instance:
                logger.info(f"Gemini 1-shot schema correction retry SUCCEEDED for model {response_model.__name__}")
                return retry_model_instance

            logger.warning("Gemini failed schema validation after correction retry (%s), returning safe fallback instance", retry_err)
            return instantiate_fallback_instance(response_model)
        except Exception as exc:
            self._raise_typed_error(exc)


    def _raise_typed_error(self, exc: Exception):
        if isinstance(exc, (NonRetryableLLMError, RateLimitedLLMError)):
            raise exc
        if is_payload_too_large_error(exc):
            raise NonRetryableLLMError(
                f"Gemini request is too large for model {self.model_name}; fail over to another provider."
            ) from exc
        if is_rate_limit_error(exc):
            raise RateLimitedLLMError(f"Gemini rate limited for model {self.model_name}") from exc

        logger.info("Gemini LLM error: %s", str(exc)[:160])
        raise exc
