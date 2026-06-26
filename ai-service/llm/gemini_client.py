"""
GEMINI LLM Client Implementation
"""

import os
import sys
import time
import json
from typing import Type, TypeVar
from pydantic import BaseModel
import google.generativeai as genai
from .base import BaseLLMClient

# Reconfigure stdout/stderr to UTF-8 to prevent UnicodeEncodeError on Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

T = TypeVar('T', bound=BaseModel)


def _ensure_event_loop():
    """Ensure there is a running event loop in the current thread to avoid AnyIO/asyncio errors."""
    import asyncio
    try:
        asyncio.get_event_loop_policy().get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)


class GeminiClient(BaseLLMClient):
    """Google Gemini API client implementation"""
    
    def __init__(self, api_key: str = None, model: str = "gemini-3.1-flash-lite"):
        """
        Initialize Gemini client
        
        Args:
            api_key: Gemini API key (defaults to env var)
            model: Model name to use (gemini-3.1-flash-lite, gemini-3.1-pro, gemini-3.5-flash)
        """
        _ensure_event_loop()
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found")
        
        self.model_name = model
        from google.generativeai.client import _ClientManager
        client_manager = _ClientManager()
        client_manager.configure(api_key=self.api_key)
        
        self.model = genai.GenerativeModel(model)
        self.model._client = client_manager.get_default_client("generative")
        self.model._async_client = client_manager.get_default_client("generative_async")
    
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        """Generate text using Gemini API with retry logic for rate limits"""
        _ensure_event_loop()
        max_retries = 5
        base_delay = 5
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
        for attempt in range(max_retries):
            try:
                response = self.model.generate_content(
                    prompt,
                    generation_config=generation_config
                )
                return response.text
                
            except Exception as e:
                error_str = str(e).lower()
                if "rate" in error_str or "quota" in error_str or "429" in str(e):
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
        For Gemini, we use JSON schema in prompt and parse response.
        
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
        _ensure_event_loop()
        max_retries = 3
        rate_limit_retries = 5
        base_delay = 5
        
        # Get JSON schema from Pydantic model
        schema = response_model.model_json_schema()
        
        generation_config = {
            "temperature": temperature,
            "max_output_tokens": max_tokens,
        }
        
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
                        response = self.model.generate_content(
                            enhanced_prompt,
                            generation_config=generation_config
                        )
                        
                        response_text = response.text.strip()
                        
                        # Clean up markdown code blocks if present
                        if response_text.startswith("```json"):
                            response_text = response_text.split("```json")[1]
                        if response_text.startswith("```"):
                            response_text = response_text.split("```")[1]
                        if response_text.endswith("```"):
                            response_text = response_text.rsplit("```", 1)[0]
                        response_text = response_text.strip()
                        
                        # Validate it's not empty
                        if not response_text:
                            raise ValueError("Gemini returned empty response")
                        
                        # Parse and validate with Pydantic
                        return response_model.model_validate_json(response_text)
                        
                    except Exception as e:
                        error_str = str(e).lower()
                        if "rate" in error_str or "quota" in error_str or "429" in str(e):
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
                    print(f"   ⚠️  Pydantic validation failed - malformed JSON from Gemini")
                
                if attempt < max_retries - 1:
                    print(f"🔄 Retrying with adjusted temperature...")
                    # Reduce temperature for more deterministic output
                    temperature = max(0.1, temperature - 0.2)
                    time.sleep(2)
                else:
                    print(f"\n💥 All retries exhausted for Gemini structured generation")
                    raise Exception(f"Gemini structured generation failed after {max_retries} attempts: {error_msg}")
