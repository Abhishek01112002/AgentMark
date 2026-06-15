"""
OpenAI LLM Client Implementation
"""

import os
from openai import OpenAI
from .base import BaseLLMClient


class OpenAIClient(BaseLLMClient):
    """OpenAI API client implementation"""
    
    def __init__(self, api_key: str = None, model: str = "gpt-4o-mini"):
        """
        Initialize OpenAI client
        
        Args:
            api_key: OpenAI API key (defaults to env var)
            model: Model name to use
        """
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not found")
        
        self.model = model
        self.client = OpenAI(api_key=self.api_key)
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Generate text using OpenAI API"""
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
