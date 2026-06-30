"""
Groq LLM client.
"""

import json
import logging
import os
from typing import Type, TypeVar

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


class GroqClient(BaseLLMClient):
    """Groq API client with fail-fast provider-pool semantics."""

    def __init__(self, api_key: str = None, model: str = "llama-3.3-70b-versatile"):
        super().__init__()
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found")

        self.model = model
        self.client = Groq(api_key=self.api_key, max_retries=0)

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        try:
            self._wait_for_rate_limit()
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            self._record_success()
            return response.choices[0].message.content
        except Exception as exc:
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        temperature: float = 0.7,
        max_tokens: int = 4000,
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

        try:
            self._wait_for_rate_limit()
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": enhanced_prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
            )
            self._record_success()

            response_text = response.choices[0].message.content
            if not response_text or not response_text.strip():
                raise ValueError("Groq returned empty response")

            return response_model.model_validate_json(response_text)
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
