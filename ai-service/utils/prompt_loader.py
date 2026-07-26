"""
Prompt Loader Utility
Loads prompt templates from txt files and formats them with variables
"""

from pathlib import Path

import threading
from pathlib import Path

# Thread-safe static template cache to avoid repeated file reads and GC pressure
_templates_cache: dict[str, str] = {}
_cache_lock = threading.Lock()


class SafeDict(dict):
    """Dictionary subclass that returns 'None' for missing keys to prevent KeyError in prompt formatting."""
    def __missing__(self, key):
        return "None"


def preload_all_prompts() -> None:
    """Pre-load and compile all prompt templates into memory during application startup."""
    global _templates_cache
    prompts_dir = Path(__file__).parent / "prompts"
    if not prompts_dir.exists():
        return

    with _cache_lock:
        for prompt_file in prompts_dir.glob("*_prompt.txt"):
            prompt_name = prompt_file.name.replace("_prompt.txt", "")
            if prompt_name not in _templates_cache:
                try:
                    with open(prompt_file, 'r', encoding='utf-8') as f:
                        _templates_cache[prompt_name] = f.read()
                except Exception:
                    pass


def get_prompt_template(prompt_name: str) -> str:
    """Retrieve raw prompt template string from thread-safe memory cache or disk."""
    if prompt_name in _templates_cache:
        return _templates_cache[prompt_name]

    prompts_dir = Path(__file__).parent / "prompts"
    prompt_file = prompts_dir / f"{prompt_name}_prompt.txt"

    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")

    with _cache_lock:
        if prompt_name not in _templates_cache:
            with open(prompt_file, 'r', encoding='utf-8') as f:
                _templates_cache[prompt_name] = f.read()
        return _templates_cache[prompt_name]


def load_prompt(prompt_name: str, **kwargs) -> str:
    """
    Load a prompt template from memory cache and format safely with variables
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        **kwargs: Variables to substitute in the prompt template
        
    Returns:
        Formatted prompt string
    """
    template = get_prompt_template(prompt_name)
    return template.format_map(SafeDict(kwargs))

