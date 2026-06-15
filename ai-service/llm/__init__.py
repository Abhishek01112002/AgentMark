"""
LLM Module - Dynamic Language Model Integration
Supports multiple LLM providers (GROQ, OpenAI, etc.)
"""

from .factory import get_llm_client
from .base import BaseLLMClient

__all__ = ['get_llm_client', 'BaseLLMClient']
