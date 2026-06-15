"""
GROQ LLM Client Implementation
"""

import os
from groq import Groq
from .base import BaseLLMClient


class GroqClient(BaseLLMClient):
    """GROQ API client implementation"""
    
    def __init__(self, api_key: str = None, model: str = "llama-3.3-70b-versatile"):
        """
        Initialize GROQ client
        
        Args:
            api_key: GROQ API key (defaults to env var)
            model: Model name to use
        """
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not found")
        
        self.model = model
        self.client = Groq(api_key=self.api_key)
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Generate text using GROQ API"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
