"""
Groq LLM client.
"""

import json
import logging
import os
from typing import Type, TypeVar

import json_repair
from groq import Groq
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


CANDIDATE_MODELS = [
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
]


class GroqClient(BaseLLMClient):
    """Groq API client with fail-fast provider-pool semantics."""

    def __init__(self, api_key: str = None, model: str = None):
        super().__init__()
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found")

        self.model = model or os.getenv("GROQ_MODEL", "groq/compound-mini")

        timeout_val = float(os.getenv("LLM_HTTP_TIMEOUT", "15.0"))
        self.client = Groq(api_key=self.api_key, max_retries=0, timeout=timeout_val)

    def _create_completion(self, **kwargs):
        models_to_try = [self.model] + [m for m in CANDIDATE_MODELS if m != self.model]
        last_exc = None
        for m in models_to_try:
            try:
                cur_kwargs = dict(kwargs)
                cur_kwargs["model"] = m
                response = self.client.chat.completions.create(**cur_kwargs)
                if self.model != m:
                    logger.info("Groq switched model from %s to working model %s", self.model, m)
                    self.model = m
                return response
            except Exception as e:
                err_str = str(e).lower()
                if "does not exist" in err_str or "not found" in err_str or "access to it" in err_str or "404" in err_str:
                    logger.warning("Groq model %s unavailable (%s), trying fallback model...", m, str(e)[:100])
                    last_exc = e
                    continue
                raise e
        if last_exc:
            raise last_exc

    def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 4096, seed: int | None = None) -> str:
        try:
            self._wait_for_rate_limit()
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            kwargs = {
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if seed is not None:
                kwargs["seed"] = seed
            try:
                response = self._create_completion(**kwargs)
            except Exception as e:
                if "max_tokens" in str(e).lower() or "maximum" in str(e).lower():
                    logger.warning("Groq max_tokens=%d rejected, falling back to 2048...", max_tokens)
                    kwargs["max_tokens"] = min(max_tokens, 2048)
                    response = self._create_completion(**kwargs)
                else:
                    raise e

            self._record_success()
            return response.choices[0].message.content
        except Exception as exc:
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: str | None = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        seed: int | None = None,
    ) -> T:
        schema = response_model.model_json_schema()
        compact_schema = json.dumps(schema, separators=(",", ":"))
        enhanced_prompt = f"""{prompt}

You must respond with ONLY a valid JSON object matching this exact schema:
{compact_schema}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- All required fields must be present
- Follow the exact field names and types specified"""

        from utils.token_budget import TokenBudgetManager
        MAX_INPUT_BUDGET = 16000
        sys_tok = TokenBudgetManager.count_tokens(system_prompt or "")
        if sys_tok + TokenBudgetManager.count_tokens(enhanced_prompt) > MAX_INPUT_BUDGET:
            user_budget = max(500, MAX_INPUT_BUDGET - sys_tok)
            enhanced_prompt = TokenBudgetManager.slice_context_to_budget(enhanced_prompt, user_budget)

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": enhanced_prompt})

        from .json_gateway import parse_and_validate, instantiate_fallback_instance

        try:
            self._wait_for_rate_limit()
            try:
                response = self._create_completion(
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                )
            except Exception as mode_exc:
                if "max_tokens" in str(mode_exc).lower() or "maximum" in str(mode_exc).lower():
                    logger.warning("Groq structured mode max_tokens=%d rejected, falling back to 2048...", max_tokens)
                    response = self._create_completion(
                        messages=[{"role": "user", "content": enhanced_prompt}],
                        temperature=temperature,
                        max_tokens=min(max_tokens, 2048),
                        response_format={"type": "json_object"},
                    )
                elif "json" in str(mode_exc).lower() or "schema" in str(mode_exc).lower():
                    logger.warning("Groq json_object mode failed (%s), retrying standard generation...", mode_exc)
                    response = self._create_completion(
                        messages=[{"role": "user", "content": enhanced_prompt}],
                        temperature=temperature,
                        max_tokens=max_tokens,
                    )
                else:
                    raise mode_exc

            self._record_success()

            # ── Truncation Guard ──────────────────────────────────────────────
            # If the model stopped due to hitting max_tokens, the JSON output is
            # definitively incomplete. Raise a validation-style error so the pool
            # fast-paths to the next provider for a fresh, complete generation.
            finish_reason = response.choices[0].finish_reason
            if finish_reason == "length":
                logger.warning(
                    "Groq output TRUNCATED (finish_reason=length, max_tokens=%d, model=%s) "
                    "— raising for pool retry on next provider",
                    max_tokens, self.model,
                )
                raise ValueError(
                    "json_invalid: output_truncated — Groq hit max_tokens limit before "
                    "completing JSON output. Pool will retry on next provider."
                )

            response_text = response.choices[0].message.content or ""
            model_inst, err_msg, _ = parse_and_validate(response_text, response_model, agent_name="GroqClient")
            if model_inst:
                return model_inst

            logger.warning("Groq JSON validation failed (%s), raising for pool retry...", err_msg)
            raise ValueError(f"json_invalid: Groq output failed validation: {err_msg}")
        except Exception as exc:
            self._raise_typed_error(exc)



    def _raise_typed_error(self, exc: Exception):
        if isinstance(exc, (NonRetryableLLMError, RateLimitedLLMError)):
            raise exc
        if is_payload_too_large_error(exc):
            raise NonRetryableLLMError(
                f"Groq request is too large for model {self.model}; fail over to another provider."
            ) from exc
        if is_rate_limit_error(exc):
            raise RateLimitedLLMError(f"Groq rate limited for model {self.model}") from exc

        logger.info("Groq LLM error: %s", str(exc)[:160])
        raise exc
