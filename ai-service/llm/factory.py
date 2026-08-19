"""
LLM factory with rate-aware provider failover.
"""

import logging
import os
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


def _create_client(provider: str, api_key: str, low_complexity: bool = False) -> BaseLLMClient:
    provider = provider.lower()
    if provider == "openai":
        return OpenAIClient(api_key=api_key)
    if provider == "gemini":
        return GeminiClient(api_key=api_key)
    if provider == "groq":
        groq_model = os.getenv("GROQ_MODEL", "groq/compound-mini")
        return GroqClient(api_key=api_key, model=groq_model)
    raise ValueError(f"Unsupported provider: {provider}")


class SmartClient(BaseLLMClient):
    """
    Selects the first available provider/key and fails over immediately on
    rate limits, payload limits, bad keys, or provider-specific errors.
    """

    def __init__(self, pool: RateAwarePool, low_complexity: bool = False):
        self._pool = pool
        self._low_complexity = low_complexity
        self._last_call_time: float = 0.0

    def _call_with_failover(self, fn, *args, **kwargs):
        now = time.time()
        elapsed = now - self._last_call_time
        if elapsed < 0.5:
            time.sleep(0.5 - elapsed)

        max_attempts = self._pool.total_keys
        last_error: Exception | None = None
        # Per-request blacklist for keys that returned 413 (payload too large).
        # These will ALWAYS fail for the same payload, so retrying is pointless.
        request_blacklist: set[str] = set()
        # Total wait budget for cooldown waits (prevents infinite loops)
        max_cooldown_wait = 90.0
        total_waited = 0.0

        while True:
            attempted_this_round = 0
            for _ in range(max_attempts):
                selected = self._pool.get_available(request_blacklist)
                if selected is None:
                    break  # No keys available right now, will wait below

                provider, key, key_id = selected
                attempted_this_round += 1
                try:
                    client = _create_client(provider, key, low_complexity=self._low_complexity)
                    result = fn(client, *args, **kwargs)
                    self._pool.mark_used(key_id)
                    self._last_call_time = time.time()
                    return result
                except Exception as exc:
                    if is_payload_too_large_error(exc):
                        # Payload too large is DETERMINISTIC — retrying the same provider
                        # with the same payload will ALWAYS fail. Permanently exclude this
                        # key for the current request (no timed cooldown).
                        logger.warning(
                            "Payload too large for %s[%s] — permanently skipping for this request",
                            provider, key_id,
                        )
                        request_blacklist.add(key_id)
                        last_error = exc
                        if len(request_blacklist) >= max_attempts:
                            raise last_error
                        continue

                    if isinstance(exc, RateLimitedLLMError) or is_rate_limit_error(exc):
                        logger.warning("%s[%s] rate limited, trying next provider...", provider, key_id)
                        self._pool.mark_failed(key_id)
                        last_error = exc
                        continue

                    error_str = str(exc).lower()

                    # Pydantic validation errors contain "invalid" but are NOT auth failures.
                    # They indicate the LLM returned malformed JSON — retry on next provider
                    # WITHOUT a cooldown so the key remains available for future agents.
                    is_validation_error = "validation error" in error_str or "json_invalid" in error_str or "eof while parsing" in error_str
                    if is_validation_error:
                        logger.warning("%s[%s] returned invalid JSON (validation error), trying next provider (no cooldown)...", provider, key_id)
                        # Record as a normal request (not a failure) — no cooldown
                        self._pool.mark_used(key_id)
                        last_error = exc
                        continue

                    if "unauthorized" in error_str or "denied" in error_str or "api key" in error_str or "bad credentials" in error_str or isinstance(exc, NonRetryableLLMError):
                        # Guard: "models permission" 401s mean the key lacks models.read
                        # but is still valid for inference.
                        is_models_permission = (
                            "models` permission" in error_str
                            or "models permission" in error_str
                            or ("`models`" in error_str and "permission" in error_str)
                            or "permission to list models" in error_str
                            or "models.read" in error_str
                        )
                        if is_models_permission:
                            # Do NOT put on cooldown — this key works for inference.
                            # Blacklist it for this request only so the pool tries the next key.
                            logger.warning(
                                "%s[%s] lacks models.read permission (key is valid for inference) "
                                "— skipping for this request without cooldown",
                                provider, key_id,
                            )
                            request_blacklist.add(key_id)
                            last_error = exc
                            if len(request_blacklist) >= max_attempts:
                                raise last_error
                            continue

                        logger.warning("%s[%s] unauthorized/permission denied (%s), trying next provider...", provider, key_id, str(exc)[:80])
                        self._pool.mark_failed(key_id)
                        request_blacklist.add(key_id)
                        last_error = exc
                        if len(request_blacklist) >= max_attempts:
                            raise last_error
                        continue

                    # Generic transient errors — short cooldown (15s instead of 30s)
                    logger.warning("%s[%s] failed: %s, trying next provider (short cooldown)...", provider, key_id, exc)
                    self._pool.mark_failed(key_id, duration=15.0)
                    last_error = exc
                    continue

            # All providers were either unavailable or failed this round.
            # If every key is blacklisted (413), no point waiting — fail fast
            if len(request_blacklist) >= max_attempts:
                raise last_error or AllProvidersRateLimitedError(
                    "All providers returned payload-too-large errors for this request."
                )

            # Check if we can wait for a non-blacklisted key to exit cooldown.
            wait_time = self._pool.soonest_cooldown_wait()
            if wait_time is not None and total_waited + wait_time < max_cooldown_wait:
                wait_time = min(wait_time + 1.0, max_cooldown_wait - total_waited)  # +1s buffer
                logger.info(
                    "⏳ All providers cooling — waiting %.1fs for next key (%.1fs/%.1fs budget used)",
                    wait_time, total_waited, max_cooldown_wait,
                )
                time.sleep(wait_time)
                total_waited += wait_time
                continue  # Retry the whole loop
            else:
                # Exhausted wait budget or no cooldowns pending (keys genuinely exhausted)
                if last_error:
                    raise last_error
                raise AllProvidersRateLimitedError(
                    "All LLM providers are currently rate-limited. Try again later or add more API keys."
                )

    def generate(self, prompt: str, system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None) -> str:
        return self._call_with_failover(
            lambda c, p, sp, t, m, s: c.generate(p, system_prompt=sp, temperature=t, max_tokens=m, seed=s),
            prompt,
            system_prompt,
            temperature,
            max_tokens,
            seed,
        )

    def generate_structured(self, prompt: str, response_model, system_prompt: str | None = None, temperature: float = 0.7, max_tokens: int = 8192, seed: int | None = None):
        return self._call_with_failover(
            lambda c, p, r, sp, t, m, s: c.generate_structured(p, r, system_prompt=sp, temperature=t, max_tokens=m, seed=s),
            prompt,
            response_model,
            system_prompt,
            temperature,
            max_tokens,
            seed,
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
            return SmartClient(pool, low_complexity=True)
        
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
