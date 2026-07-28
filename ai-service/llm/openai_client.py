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
        or ("models" in msg and "required to access this endpoint" in msg)
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

        kwargs = {"api_key": self.api_key, "max_retries": 0}
        if base_url:
            kwargs["base_url"] = base_url

        self.client = OpenAI(**kwargs)
        # Once we confirm models.read is unavailable for this key, we skip the
        # native parse path entirely and go straight to JSON-mode fallback.
        self._use_json_fallback: bool = False

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000, seed: int | None = None) -> str:
        try:
            self._wait_for_rate_limit()
            kwargs = {
                "model": self.model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if seed is not None:
                kwargs["seed"] = seed
            response = self.client.chat.completions.create(**kwargs)
            self._record_success()
            return response.choices[0].message.content
        except Exception as exc:
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: int | None = None,
    ) -> T:
        # If a previous call on this instance already confirmed that the key
        # lacks models.read, skip straight to the JSON-mode fallback.
        if not self._use_json_fallback:
            try:
                return self._generate_structured_native(prompt, response_model, temperature, max_tokens, seed=seed)
            except Exception as exc:
                if _is_models_permission_error(exc):
                    logger.warning(
                        "OpenAI key lacks `models.read` permission — switching to JSON-mode fallback "
                        "for this key. Inference still works; only the model-listing endpoint is restricted."
                    )
                    self._use_json_fallback = True
                    # Fall through to JSON-mode below
                else:
                    self._raise_typed_error(exc)

        # JSON-mode fallback: plain chat.completions.create + Pydantic validation.
        # Does not call GET /v1/models so works with keys that lack models.read.
        return self._generate_structured_json_mode(prompt, response_model, temperature, max_tokens, seed=seed)

    # ── Private helpers ──────────────────────────────────────────────────────

    def _generate_structured_native(
        self, prompt: str, response_model: Type[T], temperature: float, max_tokens: int, seed: int | None = None
    ) -> T:
        """Use OpenAI's native structured-output beta parser."""
        self._wait_for_rate_limit()
        kwargs = {
            "model": self.model,
            "messages": [{"role": "user", "content": prompt}],
            "response_format": response_model,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if seed is not None:
            kwargs["seed"] = seed
        response = self.client.beta.chat.completions.parse(**kwargs)
        self._record_success()
        parsed = response.choices[0].message.parsed
        if parsed:
            return parsed
        raise ValueError("OpenAI returned null parsed object")

    def _generate_structured_json_mode(
        self, prompt: str, response_model: Type[T], temperature: float, max_tokens: int, seed: int | None = None
    ) -> T:
        """Fallback: JSON response_format + Pydantic model_validate_json.
        
        Does NOT call GET /v1/models, so works with restricted keys that lack
        the models.read scope.
        """
        schema_hint = ""
        try:
            schema = response_model.model_json_schema()
            schema_hint = (
                "\n\nRespond ONLY with a valid JSON object matching this schema:\n"
                + json.dumps(schema, indent=2)
            )
        except Exception:
            schema_hint = "\n\nRespond ONLY with a valid JSON object matching the requested structure."

        augmented_prompt = prompt + schema_hint

        try:
            self._wait_for_rate_limit()
            kwargs = {
                "model": self.model,
                "messages": [{"role": "user", "content": augmented_prompt}],
                "response_format": {"type": "json_object"},
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            if seed is not None:
                kwargs["seed"] = seed
            from .json_gateway import parse_and_validate
            response = self.client.chat.completions.create(**kwargs)
            self._record_success()
            raw_json = response.choices[0].message.content or "{}"
            model_inst, err_msg, _ = parse_and_validate(raw_json, response_model, agent_name="OpenAIClient")
            if model_inst:
                return model_inst
            raise ValueError(f"OpenAI JSON validation failed: {err_msg}")
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
