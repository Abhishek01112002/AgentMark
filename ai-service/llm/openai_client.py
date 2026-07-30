"""
OpenAI LLM client.
"""

import json
import logging
import os
from typing import Type, TypeVar

from openai import OpenAI
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


def _is_models_permission_error(exc: Exception) -> bool:
    """Return True when the error is solely about lacking models.read scope.

    This happens with restricted OpenAI Project API keys that have inference
    permissions but not `models.read`. The key is still valid for completions,
    so we must NOT put it on a 30-second cooldown — just skip the native parse
    path and fall back to JSON-mode inference instead.
    """
    msg = str(exc).lower()
    return (
        "models` permission" in msg
        or "models permission" in msg
        or ("`models`" in msg and "permission" in msg)
        or "permission to list models" in msg
        or "requires the `models` permission" in msg
        or "models.read" in msg
    )


class OpenAIClient(BaseLLMClient):
    """OpenAI API client with native structured output parsing.
    
    Falls back to JSON-mode + Pydantic parsing when the API key lacks
    the models.read permission (common with restricted OpenAI Project keys).
    """

    def __init__(self, api_key: str = None, model: str = None):
        super().__init__()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found")

        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        base_url = os.getenv("OPENAI_BASE_URL")
        if not base_url and (self.api_key.startswith("github_pat_") or self.api_key.startswith("ghp_")):
            base_url = "https://models.inference.ai.azure.com"
            logger.info("\U0001f511 GitHub Models PAT detected — routing OpenAI client to free GitHub Inference Endpoint")

        timeout_val = float(os.getenv("LLM_HTTP_TIMEOUT", "15.0"))
        kwargs = {"api_key": self.api_key, "max_retries": 0, "timeout": timeout_val}
        if base_url:
            kwargs["base_url"] = base_url

        self.client = OpenAI(**kwargs)
        # Once we confirm models.read is unavailable for this key, we skip the
        # native parse path entirely and go straight to JSON-mode fallback.
        self._use_json_fallback: bool = False

    def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None) -> str:
        try:
            self._wait_for_rate_limit()
            token_param = "max_completion_tokens" if self.model.startswith(("o1", "o3")) else "max_tokens"
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            kwargs = {
                "model": self.model,
                "messages": messages,
                "temperature": temperature,
                token_param: max_tokens,
            }
            if seed is not None:
                kwargs["seed"] = seed
            try:
                response = self.client.chat.completions.create(**kwargs)
            except Exception as e:
                if "max_tokens" in str(e).lower() or "maximum" in str(e).lower():
                    logger.warning("OpenAI max_tokens=%d rejected by model %s, falling back to 4096...", max_tokens, self.model)
                    kwargs[token_param] = min(max_tokens, 4096)
                    response = self.client.chat.completions.create(**kwargs)
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
        max_tokens: int = 8192,
        seed: int | None = None,
    ) -> T:
        if not self._use_json_fallback:
            try:
                return self._generate_structured_native(prompt, response_model, system_prompt=system_prompt, temperature=temperature, max_tokens=max_tokens, seed=seed)
            except Exception as exc:
                if _is_models_permission_error(exc):
                    logger.warning(
                        "OpenAI key lacks `models.read` permission — switching to JSON-mode fallback "
                        "for this key. Inference still works; only the model-listing endpoint is restricted."
                    )
                    self._use_json_fallback = True
                else:
                    self._raise_typed_error(exc)

        return self._generate_structured_json_mode(prompt, response_model, system_prompt=system_prompt, temperature=temperature, max_tokens=max_tokens, seed=seed)

    # ── Private helpers ──────────────────────────────────────────────────────

    def _generate_structured_native(
        self, prompt: str, response_model: Type[T], system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None
    ) -> T:
        """Use OpenAI's native structured-output beta parser."""
        from utils.token_budget import TokenBudgetManager
        MAX_INPUT_BUDGET = 12000
        if system_prompt:
            sys_len = TokenBudgetManager.count_tokens(system_prompt)
            if sys_len < 1024 and not (self.api_key.startswith("github_pat_") or self.api_key.startswith("ghp_")):
                # System prompt padding for 1024-token OpenAI prefix caching threshold
                padding = (
                    "\n\n--- ENTERPRISE CAMPAIGN COMPLIANCE DIRECTIVES ---\n"
                    "1. All generated assets must maintain strict alignment with target audience buyer psychology, brand positioning, and messaging moats.\n"
                    "2. Avoid generic filler phrasing, unverified claims, or forbidden buzzwords.\n"
                    "3. Ensure channel-native formatting, clear call-to-action alignment, and strategic differentiation in all outputs.\n"
                    "4. Adhere strictly to Pydantic schema field contracts and output types.\n"
                ) * max(1, (1024 - sys_len) // 60 + 1)
                system_prompt = system_prompt + padding[:(1035 - sys_len) * 4]

        sys_tok = TokenBudgetManager.count_tokens(system_prompt or "")
        if sys_tok + TokenBudgetManager.count_tokens(prompt) > MAX_INPUT_BUDGET:
            user_budget = max(500, MAX_INPUT_BUDGET - sys_tok)
            prompt = TokenBudgetManager.slice_context_to_budget(prompt, user_budget)

        token_param = "max_completion_tokens" if self.model.startswith(("o1", "o3")) else "max_tokens"
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        kwargs = {
            "model": self.model,
            "messages": messages,
            "response_format": response_model,
            "temperature": temperature,
            token_param: max_tokens,
        }
        if seed is not None:
            kwargs["seed"] = seed
        try:
            response = self.client.beta.chat.completions.parse(**kwargs)
        except Exception as e:
            if "max_tokens" in str(e).lower() or "maximum" in str(e).lower():
                logger.warning("OpenAI native parse max_tokens=%d rejected by model %s, retrying with 4096...", max_tokens, self.model)
                kwargs[token_param] = min(max_tokens, 4096)
                response = self.client.beta.chat.completions.parse(**kwargs)
            else:
                raise e

        self._record_success()
        if hasattr(response, "usage") and response.usage:
            try:
                prompt_tok = getattr(response.usage, "prompt_tokens", 0)
                comp_tok = getattr(response.usage, "completion_tokens", 0)
                cached_tok = 0
                if hasattr(response.usage, "prompt_tokens_details") and response.usage.prompt_tokens_details:
                    cached_tok = getattr(response.usage.prompt_tokens_details, "cached_tokens", 0) or 0
                from utils.telemetry.llm_tracker import get_telemetry_tracker
                get_telemetry_tracker().record_usage("openai", prompt_tok, comp_tok, cached_tok)
            except Exception as _tel_err:
                logger.warning(f"Telemetry logging non-blocking error: {_tel_err}")

        parsed = response.choices[0].message.parsed
        if parsed:
            return parsed
        raise ValueError("OpenAI returned null parsed object")

    def _generate_structured_json_mode(
        self, prompt: str, response_model: Type[T], system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None
    ) -> T:
        """Fallback: JSON response_format + Pydantic model_validate_json & Gateway Extraction."""
        schema_hint = ""
        try:
            schema = response_model.model_json_schema()
            schema_hint = (
                "\n\nRespond ONLY with a valid JSON object matching this schema:\n"
                + json.dumps(schema, separators=(",", ":"))
            )
        except Exception:
            schema_hint = "\n\nRespond ONLY with a valid JSON object matching the requested structure."

        augmented_prompt = prompt + schema_hint

        # Pre-Flight Check: OpenAI API requires the word "json" in prompt when response_format={"type": "json_object"}
        full_text_check = (system_prompt or "") + " " + augmented_prompt
        if "json" not in full_text_check.lower():
            augmented_prompt += "\n\nRespond in valid JSON format."

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": augmented_prompt})

        try:
            self._wait_for_rate_limit()
            token_param = "max_completion_tokens" if self.model.startswith(("o1", "o3")) else "max_tokens"
            kwargs = {
                "model": self.model,
                "messages": messages,
                "response_format": {"type": "json_object"},
                "temperature": temperature,
                token_param: max_tokens,
            }
            if seed is not None:
                kwargs["seed"] = seed
            from .json_gateway import parse_and_validate, instantiate_fallback_instance
            try:
                response = self.client.chat.completions.create(**kwargs)
            except Exception as e:
                err_str = str(e).lower()
                if "response_format" in err_str or "unsupported" in err_str or "400" in err_str:
                    logger.warning("OpenAI response_format unsupported by model %s, falling back to plain completion...", self.model)
                    kwargs.pop("response_format", None)
                    response = self.client.chat.completions.create(**kwargs)
                elif "max_tokens" in err_str or "maximum" in err_str:
                    logger.warning("OpenAI JSON mode max_tokens=%d rejected, retrying with 4096...", max_tokens)
                    kwargs[token_param] = min(max_tokens, 4096)
                    response = self.client.chat.completions.create(**kwargs)
                else:
                    raise e

            self._record_success()
            raw_json = response.choices[0].message.content or "{}"
            model_inst, err_msg, _ = parse_and_validate(raw_json, response_model, agent_name="OpenAIClient")
            if model_inst:
                return model_inst

            logger.warning("OpenAI JSON validation failed (%s), returning safe fallback instance", err_msg)
            return instantiate_fallback_instance(response_model)
        except Exception as exc:
            self._raise_typed_error(exc)

    def _raise_typed_error(self, exc: Exception):
        if isinstance(exc, (NonRetryableLLMError, RateLimitedLLMError)):
            raise exc
        if is_payload_too_large_error(exc):
            raise NonRetryableLLMError(
                f"OpenAI request is too large for model {self.model}; fail over to another provider."
            ) from exc
        if is_rate_limit_error(exc):
            raise RateLimitedLLMError(f"OpenAI rate limited for model {self.model}") from exc
        if _is_models_permission_error(exc):
            # Raise as NonRetryable so the SmartClient pool skips this key for the
            # current request WITHOUT placing it on a 30-second inference cooldown.
            # The key is valid for inference — only the models.read endpoint is blocked.
            raise NonRetryableLLMError(
                "OpenAI key lacks models.read permission; falling over to next provider without cooldown."
            ) from exc

        logger.info("OpenAI LLM error: %s", str(exc)[:160])
        raise exc
