"""
OpenAI LLM client.
"""

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


class OpenAIClient(BaseLLMClient):
    """OpenAI API client with native structured output parsing."""

    def __init__(self, api_key: str = None, model: str = None):
        super().__init__()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found")

        self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        
        base_url = os.getenv("OPENAI_BASE_URL")
        if not base_url and (self.api_key.startswith("github_pat_") or self.api_key.startswith("ghp_")):
            base_url = "https://models.inference.ai.azure.com"
            logger.info("🔑 GitHub Models PAT detected — routing OpenAI client to free GitHub Inference Endpoint")

        kwargs = {"api_key": self.api_key, "max_retries": 0}
        if base_url:
            kwargs["base_url"] = base_url

        self.client = OpenAI(**kwargs)

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
        try:
            self._wait_for_rate_limit()
            response = self.client.beta.chat.completions.parse(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                response_format=response_model,
                temperature=temperature,
                max_tokens=max_tokens,
            )
            self._record_success()

            parsed = response.choices[0].message.parsed
            if parsed:
                return parsed
            raise ValueError("OpenAI returned null parsed object")
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

        logger.info("OpenAI LLM error: %s", str(exc)[:160])
        raise exc
