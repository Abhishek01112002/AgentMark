"""
LLM Factory - Dynamic provider selection
"""

import os
from contextvars import ContextVar
from .base import BaseLLMClient
from .groq_client import GroqClient
from .openai_client import OpenAIClient
from .gemini_client import GeminiClient

CURRENT_LLM_CONFIG: ContextVar[dict | None] = ContextVar("current_llm_config", default=None)


def set_llm_config(config: dict | None):
    CURRENT_LLM_CONFIG.set(config or {})


def get_llm_client(provider: str = None) -> BaseLLMClient:
    """
    Get LLM client based on provider name or environment
    
    Args:
        provider: Provider name ('groq', 'openai', 'gemini') or None for auto-detect
        
    Returns:
        Configured LLM client instance
    """
    
    config = CURRENT_LLM_CONFIG.get() or {}

    # Auto-detect provider if not specified
    if provider is None:
        if config.get("gemini_api_key") or os.getenv("GEMINI_API_KEY"):
            provider = "gemini"
        elif config.get("groq_api_key") or os.getenv("GROQ_API_KEY"):
            provider = "groq"
        elif config.get("openai_api_key") or os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        else:
            raise ValueError("No LLM API key found in environment")
    
    provider = provider.lower()
    
    if provider == "gemini":
        return GeminiClient(api_key=config.get("gemini_api_key"))
    elif provider == "groq":
        return GroqClient(api_key=config.get("groq_api_key"))
    elif provider == "openai":
        return OpenAIClient(api_key=config.get("openai_api_key"))
    else:
        raise ValueError(f"Unsupported provider: {provider}")
