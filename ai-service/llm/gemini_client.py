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

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000, seed: int | None = None) -> str:
        _ensure_event_loop()
        try:
            self._wait_for_rate_limit()
            response = self.model.generate_content(
                prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                },
            )
            self._record_success()
            return response.text
        except Exception as exc:
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        temperature: float = 0.7,
        max_tokens: int = 4000,
        seed: int | None = None,
    ) -> T:
        _ensure_event_loop()
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
            response = self.model.generate_content(
                enhanced_prompt,
                generation_config={
                    "temperature": temperature,
                    "max_output_tokens": max_tokens,
                    "response_mime_type": "application/json",
                },
            )
            self._record_success()

            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text.split("```json", 1)[1]
            if response_text.startswith("```"):
                response_text = response_text.split("```", 1)[1]
            if response_text.endswith("```"):
                response_text = response_text.rsplit("```", 1)[0]
            response_text = response_text.strip()

            if not response_text:
                raise ValueError("Gemini returned empty response")

            try:
                return response_model.model_validate_json(response_text)
            except Exception as parse_exc:
                logger.warning(f"Initial JSON validation failed ({parse_exc}), attempting json_repair...")
                repaired = json_repair.repair_json(response_text)
                return response_model.model_validate_json(repaired)
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
