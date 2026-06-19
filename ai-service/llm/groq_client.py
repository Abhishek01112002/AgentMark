"""
GROQ LLM Client Implementation
"""

import os
import time
import json
from typing import Type, TypeVar
from pydantic import BaseModel
from groq import Groq
from .base import BaseLLMClient

T = TypeVar('T', bound=BaseModel)


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
        self.client = Groq(api_key=self.api_key, max_retries=0)
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Generate text using GROQ API with retry logic for rate limits"""
        
        max_retries = 5
        base_delay = 5
        
        for attempt in range(max_retries):
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                return response.choices[0].message.content
                
            except Exception as e:
                if "rate_limit" in str(e).lower() or "429" in str(e):
                    if attempt == max_retries - 1:
                        raise
                    
                    delay = base_delay * (2 ** attempt)
                    print(f"⏳ Rate limit hit. Retrying in {delay}s... (Attempt {attempt + 1}/{max_retries})")
                    time.sleep(delay)
                else:
                    raise
    
    def generate_structured(self, prompt: str, response_model: Type[T], temperature: float = 0.7, max_tokens: int = 4000) -> T:
        """
        Generate structured output using Pydantic model schema.
        For Groq, we use JSON mode with schema in prompt.
        
        Args:
            prompt: Input prompt
            response_model: Pydantic model class for response structure
            temperature: Creativity level
            max_tokens: Maximum tokens
            
        Returns:
            Parsed Pydantic model instance
            
        Raises:
            Exception: After all retries exhausted or critical error
        """
        max_retries = 3  # Retries for parsing/validation errors
        rate_limit_retries = 5
        base_delay = 5
        
        # Get JSON schema from Pydantic model
        schema = response_model.model_json_schema()
        
        for attempt in range(max_retries):
            try:
                # Enhance prompt with schema requirement
                enhanced_prompt = f"""{prompt}

You must respond with ONLY a valid JSON object matching this exact schema:
{json.dumps(schema, indent=2)}

IMPORTANT:
- Return ONLY the JSON object, no markdown, no code blocks, no explanations
- All required fields must be present
- Follow the exact field names and types specified"""
                
                # Inner loop for rate limit handling
                for rate_attempt in range(rate_limit_retries):
                    try:
                        response = self.client.chat.completions.create(
                            model=self.model,
                            messages=[{"role": "user", "content": enhanced_prompt}],
                            temperature=temperature,
                            max_tokens=max_tokens,
                            response_format={"type": "json_object"}
                        )
                        
                        response_text = response.choices[0].message.content
                        
                        # Validate it's not empty
                        if not response_text or not response_text.strip():
                            raise ValueError("Groq returned empty response")
                        
                        # Parse and validate with Pydantic
                        return response_model.model_validate_json(response_text)
                        
                    except Exception as e:
                        if "rate_limit" in str(e).lower() or "429" in str(e):
                            if rate_attempt == rate_limit_retries - 1:
                                raise
                            
                            delay = base_delay * (2 ** rate_attempt)
                            print(f"⏳ Rate limit hit. Retrying in {delay}s... (Attempt {rate_attempt + 1}/{rate_limit_retries})")
                            time.sleep(delay)
                        else:
                            raise
                
            except Exception as e:
                error_msg = str(e)
                print(f"\n❌ LLM Error (Attempt {attempt + 1}/{max_retries}): {error_msg[:100]}")
                
                # Check if it's a validation error
                if "validation" in error_msg.lower() or "field" in error_msg.lower():
                    print(f"   ⚠️  Pydantic validation failed - malformed JSON from Groq")
                
                if attempt < max_retries - 1:
                    print(f"🔄 Retrying with adjusted temperature...")
                    # Reduce temperature for more deterministic output
                    temperature = max(0.1, temperature - 0.2)
                    time.sleep(2)  # Brief pause before retry
                else:
                    print(f"\n💥 All retries exhausted for Groq structured generation")
                    raise Exception(f"Groq structured generation failed after {max_retries} attempts: {error_msg}")
