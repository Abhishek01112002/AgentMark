"""
OpenAI LLM Client Implementation
"""

import logging
logger = logging.getLogger(__name__)

import os
import time
from typing import Type, TypeVar
from pydantic import BaseModel
from openai import OpenAI
from .base import BaseLLMClient

T = TypeVar('T', bound=BaseModel)


class OpenAIClient(BaseLLMClient):
    """OpenAI API client implementation"""

    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"):
        super().__init__()
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found")

        self.model = model
        self.client = OpenAI(api_key=self.api_key, max_retries=0)

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

        for attempt in range(max_retries):
            try:
                for rate_attempt in range(5):
                    try:
                        self._wait_for_rate_limit()
                        response = self.client.beta.chat.completions.parse(
                            model=self.model,
                            messages=[{"role": "user", "content": prompt}],
                            response_format=response_model,
                            temperature=temperature,
                            max_tokens=max_tokens
                        )
                        self._record_success()

                        if response.choices[0].message.parsed:
                            return response.choices[0].message.parsed
                        else:
                            raise ValueError("OpenAI returned null parsed object")

                    except Exception as e:
                        if "rate_limit" in str(e).lower() or "429" in str(e):
                            if not self._handle_rate_limit(rate_attempt, 5):
                                raise
                        else:
                            raise

            except Exception as e:
                error_msg = str(e)
                logger.info(f"\n❌ LLM Error (Attempt {attempt + 1}/{max_retries}): {error_msg[:100]}")

                if attempt < max_retries - 1:
                    logger.info("🔄 Retrying with adjusted temperature...")
                    temperature = max(0.1, temperature - 0.2)
                    time.sleep(2)
                else:
                    logger.info("\n💥 All retries exhausted for OpenAI structured generation")
                    raise Exception(f"OpenAI structured generation failed after {max_retries} attempts: {error_msg}")
