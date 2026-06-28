"""
GROQ LLM Client Implementation
"""

import logging
logger = logging.getLogger(__name__)

import os
import time
import json
from typing import Type, TypeVar
from pydantic import BaseModel
from groq import Groq
from .base import BaseLLMClient

T = TypeVar('T', bound=BaseModel)


class GroqClient(BaseLLMClient):
    """GROQ API client implementation"""

    def __init__(self, api_key: str = None, model: str = "llama-3.3-70b-versatile"):
        super().__init__()
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found")

        self.model = model
        self.client = Groq(api_key=self.api_key, max_retries=0)

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        max_retries = 5

        for attempt in range(max_retries):
            try:
                self._wait_for_rate_limit()
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                self._record_success()
                return response.choices[0].message.content

            except Exception as e:
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    if not self._handle_rate_limit(attempt, max_retries):
                        raise
                else:
                    raise

    def generate_structured(self, prompt: str, response_model: Type[T], temperature: float = 0.7, max_tokens: int = 4000) -> T:
        max_retries = 3

        schema = response_model.model_json_schema()

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
                        response = self.client.chat.completions.create(
                            model=self.model,
                            messages=[{"role": "user", "content": enhanced_prompt}],
                            temperature=temperature,
                            max_tokens=max_tokens,
                            response_format={"type": "json_object"}
                        )
                        self._record_success()

                        response_text = response.choices[0].message.content

                        if not response_text or not response_text.strip():
                            raise ValueError("Groq returned empty response")

                        return response_model.model_validate_json(response_text)

                    except Exception as e:
                        if "rate_limit" in str(e).lower() or "429" in str(e):
                            if not self._handle_rate_limit(rate_attempt, 5):
                                raise
                        else:
                            raise

            except Exception as e:
                error_msg = str(e)
                logger.info(f"\n❌ LLM Error (Attempt {attempt + 1}/{max_retries}): {error_msg[:100]}")

                if "validation" in error_msg.lower() or "field" in error_msg.lower():
                    logger.info("   ⚠️  Pydantic validation failed - malformed JSON from Groq")

                if attempt < max_retries - 1:
                    logger.info("🔄 Retrying with adjusted temperature...")
                    temperature = max(0.1, temperature - 0.2)
                    time.sleep(2)
                else:
                    logger.info("\n💥 All retries exhausted for Groq structured generation")
                    raise Exception(f"Groq structured generation failed after {max_retries} attempts: {error_msg}")
