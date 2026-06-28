"""
GEMINI LLM Client Implementation
"""

import logging
logger = logging.getLogger(__name__)

import os
import sys
import time
import json
from typing import Type, TypeVar
from pydantic import BaseModel
import google.generativeai as genai
from .base import BaseLLMClient

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception as e:
            logger.error(f"Silent error swallowed: {e}", exc_info=True)

T = TypeVar('T', bound=BaseModel)


def _ensure_event_loop():
    import asyncio
    try:
        asyncio.get_event_loop_policy().get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)


class GeminiClient(BaseLLMClient):
    """Google Gemini API client implementation"""

    def __init__(self, api_key: str = None, model: str = "gemini-3.1-flash-lite"):
        super().__init__()
        _ensure_event_loop()
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found")

        self.model_name = model
        from google.generativeai.client import _ClientManager
        client_manager = _ClientManager()
        client_manager.configure(api_key=self.api_key)

        self.model = genai.GenerativeModel(model)
        self.model._client = client_manager.get_default_client("generative")
        self.model._async_client = client_manager.get_default_client("generative_async")

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        _ensure_event_loop()
        max_retries = 5
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        for attempt in range(max_retries):
            try:
                self._wait_for_rate_limit()
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                self._record_success()
                return response.text

            except Exception as e:
                error_str = str(e).lower()
                if "rate" in error_str or "quota" in error_str or "429" in str(e):
                    if not self._handle_rate_limit(attempt, max_retries):
                        raise
                else:
                    raise

    def generate_structured(self, prompt: str, response_model: Type[T], temperature: float = 0.7, max_tokens: int = 4000) -> T:
        _ensure_event_loop()
        max_retries = 3

        schema = response_model.model_json_schema()

        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }

        for attempt in range(max_retries):
            try:
                enhanced_prompt = f"""{prompt}

You must respond with ONLY a valid JSON object matching this exact schema:
{json.dumps(schema, indent=2)}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- All required fields must be present
- Follow the exact field names and types specified"""

                for rate_attempt in range(5):
                    try:
                        self._wait_for_rate_limit()
                        response = self.model.generate_content(
                            enhanced_prompt,
                            generation_config=generation_config
                        )
                        self._record_success()

                        response_text = response.text.strip()

                        if response_text.startswith("```json"):
                            response_text = response_text.split("```json")[1]
                        if response_text.startswith("```"):
                            response_text = response_text.split("```")[1]
                        if response_text.endswith("```"):
                            response_text = response_text.rsplit("```", 1)[0]
                        response_text = response_text.strip()

                        if not response_text:
                            raise ValueError("Gemini returned empty response")

                        return response_model.model_validate_json(response_text)

                    except Exception as e:
                        error_str = str(e).lower()
                        if "rate" in error_str or "quota" in error_str or "429" in str(e):
                            if not self._handle_rate_limit(rate_attempt, 5):
                                raise
                        else:
                            raise

            except Exception as e:
                error_msg = str(e)
                logger.info(f"\n❌ LLM Error (Attempt {attempt + 1}/{max_retries}): {error_msg[:100]}")

                if "validation" in error_msg.lower() or "field" in error_msg.lower():
                    logger.info("   ⚠️  Pydantic validation failed - malformed JSON from Gemini")

                if attempt < max_retries - 1:
                    logger.info("🔄 Retrying with adjusted temperature...")
                    temperature = max(0.1, temperature - 0.2)
                    time.sleep(2)
                else:
                    logger.info("\n💥 All retries exhausted for Gemini structured generation")
                    raise Exception(f"Gemini structured generation failed after {max_retries} attempts: {error_msg}")
