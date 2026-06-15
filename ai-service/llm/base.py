"""
Base LLM Client Interface
All LLM providers must implement this interface
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseLLMClient(ABC):
    """Abstract base class for all LLM clients"""
    
    @abstractmethod
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """
        Generate text completion from prompt
        
        Args:
            prompt: Input prompt for the LLM
            temperature: Creativity level (0.0 to 1.0)
            max_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        pass
