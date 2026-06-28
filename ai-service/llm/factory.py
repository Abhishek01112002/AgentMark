"""
LLM Factory - Dynamic provider selection with automatic fallback and key rotation
"""

import logging
logger = logging.getLogger(__name__)

import os
import threading
from contextvars import ContextVar
from .base import BaseLLMClient, ProviderPool
from .groq_client import GroqClient
from .openai_client import OpenAIClient
from .gemini_client import GeminiClient

CURRENT_LLM_CONFIG: ContextVar[dict | None] = ContextVar("current_llm_config", default=None)

_provider_pool: ProviderPool | None = None
_pool_lock = threading.Lock()
_pool_config_signature: str | None = None  # tracks which config the pool was built from


def _config_signature(config: dict) -> str:
    """Deterministic fingerprint of a config dict — used to detect changes."""
    return "|".join(
        f"{k}={v}" for k, v in sorted(config.items()) if v
    )


def set_llm_config(config: dict | None):
    """
    Set the LLM config for the current request context.
    Always invalidates the provider pool so new keys take effect immediately.
    """
    global _provider_pool, _pool_config_signature
    resolved = config or {}
    CURRENT_LLM_CONFIG.set(resolved)

    sig = _config_signature(resolved)
    with _pool_lock:
        if sig != _pool_config_signature:
            # Config changed — force-rebuild pool on next get_llm_client() call
            _provider_pool = None
            _pool_config_signature = sig


def _clients_for_key_string(key_string: str | None, ClientClass, env_fallback: str) -> list:
    """
    Splits a potentially comma-separated key string into individual keys
    and returns one initialized client per key.
    Falls back to the env var if no key_string is provided.
    """
    raw = (key_string or "").strip() or os.getenv(env_fallback, "")
    if not raw:
        return []

    keys = [k.strip() for k in raw.split(",") if k.strip()]
    clients = []
    for key in keys:
        try:
            clients.append(ClientClass(api_key=key))
        except Exception as e:
            logger.info(f"⚠️  Skipping invalid {ClientClass.__name__} key ({key[:8]}...): {e}")
    return clients


def _build_provider_pool(config: dict) -> ProviderPool:
    providers = []

    for client in _clients_for_key_string(config.get("gemini_api_key"), GeminiClient, "GEMINI_API_KEY"):
        providers.append(("gemini", client))

    for client in _clients_for_key_string(config.get("groq_api_key"), GroqClient, "GROQ_API_KEY"):
        providers.append(("groq", client))

    for client in _clients_for_key_string(config.get("openai_api_key"), OpenAIClient, "OPENAI_API_KEY"):
        providers.append(("openai", client))

    if not providers:
        raise ValueError("No LLM API keys found — add a key in Settings or .env")

    total_keys = len(providers)
    providers_by_type = {}
    for name, _ in providers:
        providers_by_type[name] = providers_by_type.get(name, 0) + 1
    key_summary = ", ".join(f"{v}x {k}" for k, v in providers_by_type.items())
    logger.info(f"✅ Provider pool built: {total_keys} client(s) [{key_summary}]")

    return ProviderPool(providers)


def get_llm_client(provider: str = None) -> BaseLLMClient:
    """
    Get LLM client. Uses round-robin pool when provider=None.
    Pool is rebuilt whenever set_llm_config() is called with a new config.
    """
    global _provider_pool

    config = CURRENT_LLM_CONFIG.get() or {}

    if provider is None:
        with _pool_lock:
            if _provider_pool is None:
                _provider_pool = _build_provider_pool(config)
        return _provider_pool.get()[1]

    provider = provider.lower()

    if provider == "gemini":
        return GeminiClient(api_key=(config.get("gemini_api_key") or "").split(",")[0].strip() or None)
    elif provider == "groq":
        return GroqClient(api_key=(config.get("groq_api_key") or "").split(",")[0].strip() or None)
    elif provider == "openai":
        return OpenAIClient(api_key=(config.get("openai_api_key") or "").split(",")[0].strip() or None)
    else:
        raise ValueError(f"Unsupported provider: {provider}")
