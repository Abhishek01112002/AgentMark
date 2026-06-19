"""
LLM Factory - Dynamic provider selection
"""

import os
from .base import BaseLLMClient
from .groq_client import GroqClient
from .openai_client import OpenAIClient
from .gemini_client import GeminiClient


def get_llm_client(provider: str = None) -> BaseLLMClient:
    """
    Get LLM client based on provider name or environment
    
    Args:
        provider: Provider name ('groq', 'openai', 'gemini') or None for auto-detect
        
    Returns:
        Configured LLM client instance
    """
    
    # Auto-detect provider if not specified
    if provider is None:
        if os.getenv("GEMINI_API_KEY"):
            provider = "gemini"
        elif os.getenv("GROQ_API_KEY"):
            provider = "groq"
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
        else:
            raise ValueError("No LLM API key found in environment")
    
    provider = provider.lower()
    
    if provider == "gemini":
        return GeminiClient()
    elif provider == "groq":
        return GroqClient()
    elif provider == "openai":
        return OpenAIClient()
    else:
        raise ValueError(f"Unsupported provider: {provider}")
