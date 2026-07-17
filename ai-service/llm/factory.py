"""
LLM factory with rate-aware provider failover.
"""

import logging
import time
from contextvars import ContextVar

from .base import (
    BaseLLMClient,
    NonRetryableLLMError,
    RateLimitedLLMError,
    is_payload_too_large_error,
    is_rate_limit_error,
)
from .gemini_client import GeminiClient
from .groq_client import GroqClient
from .openai_client import OpenAIClient
from .provider_pool import ProviderPool as RateAwarePool

logger = logging.getLogger(__name__)

CURRENT_LLM_CONFIG: ContextVar[dict | None] = ContextVar("current_llm_config", default=None)
_PER_REQUEST_RATE_POOL: ContextVar[RateAwarePool | None] = ContextVar("_per_request_rate_pool", default=None)
_PER_REQUEST_LOW_COMPLEXITY_POOL: ContextVar[RateAwarePool | None] = ContextVar("_per_request_low_complexity_pool", default=None)


class AllProvidersRateLimitedError(Exception):
    pass


def set_llm_config(config: dict | None):
    resolved = config or {}
    CURRENT_LLM_CONFIG.set(resolved)
    _PER_REQUEST_RATE_POOL.set(None)
    _PER_REQUEST_LOW_COMPLEXITY_POOL.set(None)


def get_current_llm_config() -> dict:
    return CURRENT_LLM_CONFIG.get() or {}


def _create_client(provider: str, api_key: str) -> BaseLLMClient:
    provider = provider.lower()
    if provider == "openai":
        return OpenAIClient(api_key=api_key)
    if provider == "gemini":
        return GeminiClient(api_key=api_key)
    if provider == "groq":
        return GroqClient(api_key=api_key)
    raise ValueError(f"Unsupported provider: {provider}")


class SmartClient(BaseLLMClient):
    """
    Selects the first available provider/key and fails over immediately on
    rate limits, payload limits, bad keys, or provider-specific errors.
    """

    def __init__(self, pool: RateAwarePool):
        self._pool = pool
        self._last_call_time: float = 0.0

    def _call_with_failover(self, fn, *args, **kwargs):
        now = time.time()
        elapsed = now - self._last_call_time
        if elapsed < 0.5:
            time.sleep(0.5 - elapsed)

        max_attempts = self._pool.total_keys
        last_error: Exception | None = None

        for _ in range(max_attempts):
            selected = self._pool.get_available()
            if selected is None:
                raise AllProvidersRateLimitedError(
                    "All LLM providers are currently rate-limited. Try again later or add more API keys."
                )

            provider, key, key_id = selected
            try:
                client = _create_client(provider, key)
                result = fn(client, *args, **kwargs)
                self._pool.mark_used(key_id)
                self._last_call_time = time.time()
                return result
            except Exception as exc:
                if isinstance(exc, NonRetryableLLMError) or is_payload_too_large_error(exc):
                    logger.warning("Payload too large for %s[%s], trying next provider...", provider, key_id)
                    self._pool.mark_failed(key_id)
                    last_error = exc
                    continue

                if isinstance(exc, RateLimitedLLMError) or is_rate_limit_error(exc):
                    logger.warning("%s[%s] rate limited, trying next provider...", provider, key_id)
                    self._pool.mark_failed(key_id)
                    last_error = exc
                    continue

                error_str = str(exc).lower()
                if "invalid" in error_str or "unauthorized" in error_str or "denied" in error_str:
                    logger.warning("%s[%s] unauthorized/permission denied, trying next provider...", provider, key_id)
                    self._pool.mark_failed(key_id)
                    last_error = exc
                    continue

                logger.warning("%s[%s] failed: %s, trying next provider...", provider, key_id, exc)
                self._pool.mark_failed(key_id)
                last_error = exc
                continue

        raise last_error or RuntimeError("All provider attempts exhausted")

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        return self._call_with_failover(
            lambda c, p, t, m: c.generate(p, t, m),
            prompt,
            temperature,
            max_tokens,
        )

    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7, max_tokens: int = 4000):
        return self._call_with_failover(
            lambda c, p, r, t, m: c.generate_structured(p, r, t, m),
            prompt,
            response_model,
            temperature,
            max_tokens,
        )


def _build_rate_aware_pool(config: dict) -> RateAwarePool:
    return RateAwarePool(config)


def get_llm_client(provider: str = None, low_complexity: bool = False) -> BaseLLMClient:
    config = get_current_llm_config()

    if provider is None:
        if low_complexity:
            pool = _PER_REQUEST_LOW_COMPLEXITY_POOL.get()
            if pool is None:
                pool = RateAwarePool(config, custom_order=["groq", "gemini", "openai"])
                _PER_REQUEST_LOW_COMPLEXITY_POOL.set(pool)
            return SmartClient(pool)
        
        pool = _PER_REQUEST_RATE_POOL.get()
        if pool is None:
            pool = RateAwarePool(config)
            _PER_REQUEST_RATE_POOL.set(pool)
        return SmartClient(pool)

    provider = provider.lower()
    if provider == "openai":
        return OpenAIClient(api_key=(config.get("openai_api_key") or "").split(",")[0].strip() or None)
    if provider == "gemini":
        return GeminiClient(api_key=(config.get("gemini_api_key") or "").split(",")[0].strip() or None)
    if provider == "groq":
        return GroqClient(api_key=(config.get("groq_api_key") or "").split(",")[0].strip() or None)
    raise ValueError(f"Unsupported provider: {provider}")
