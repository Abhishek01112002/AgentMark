"""
Rate-aware provider pool.

Default order is OpenAI -> Gemini -> Groq. Groq is kept as a fallback because
its 429 behavior can be aggressive during multi-agent campaign runs.
"""

import logging
import os

from .rate_limiter import get_rate_limiter

logger = logging.getLogger(__name__)

DEFAULT_PROVIDER_ORDER = ["openai", "gemini", "groq"]


class ProviderPool:
    """
    Builds an ordered list of (provider, key, key_id) tuples from request config
    and environment variables, then selects only keys with current capacity.
    """

    def __init__(self, config: dict, custom_order: list[str] = None):
        self.providers: list[tuple[str, str, str]] = []
        config = config or {}

        keys_by_provider = {
            "openai": _split_keys(config.get("openai_api_key") or os.getenv("OPENAI_API_KEY")),
            "gemini": _split_keys(config.get("gemini_api_key") or os.getenv("GEMINI_API_KEY")),
            "groq": _split_keys(config.get("groq_api_key") or os.getenv("GROQ_API_KEY")),
        }

        requested_order = custom_order or (config.get("provider_order") if os.getenv("RESPECT_CLIENT_PROVIDER_ORDER") == "true" else None)
        provider_order = [
            provider
            for provider in (requested_order if isinstance(requested_order, list) else DEFAULT_PROVIDER_ORDER)
            if provider in keys_by_provider
        ]
        for provider in DEFAULT_PROVIDER_ORDER:
            if provider not in provider_order:
                provider_order.append(provider)

        for provider in provider_order:
            for i, key in enumerate(keys_by_provider[provider]):
                self.providers.append((provider, key, f"{provider}-{i}"))

        if not self.providers:
            raise ValueError("No LLM API keys found - add a key in Settings or .env")

        logger.info(
            "Provider pool built: %s",
            ", ".join(f"{provider}[{key_id}]" for provider, _, key_id in self.providers),
        )

    def get_available(self) -> tuple[str, str, str] | None:
        limiter = get_rate_limiter()
        for provider, key, key_id in self.providers:
            if limiter.can_make_request(key_id, provider):
                return provider, key, key_id
        return None

    def mark_used(self, key_id: str):
        get_rate_limiter().record_request(key_id)

    def mark_failed(self, key_id: str):
        get_rate_limiter().mark_cooldown(key_id)

    @property
    def total_keys(self) -> int:
        return len(self.providers)


def _split_keys(raw: str | None) -> list[str]:
    return [key.strip() for key in (raw or "").split(",") if key.strip()]
