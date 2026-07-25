"""
Prompt Loader Utility
Loads prompt templates from txt files and formats them with variables
"""

from pathlib import Path

# Static template cache to avoid repeated file reads and GC pressure
_templates_cache: dict[str, str] = {}


class SafeDict(dict):
    """Dictionary subclass that returns 'None' for missing keys to prevent KeyError in prompt formatting."""
    def __missing__(self, key):
        return "None"


def load_prompt(prompt_name: str, **kwargs) -> str:
    """
    Load a prompt template from file and format safely with variables
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        **kwargs: Variables to substitute in the prompt template
        
    Returns:
        Formatted prompt string
    """
    prompts_dir = Path(__file__).parent / "prompts"
    prompt_file = prompts_dir / f"{prompt_name}_prompt.txt"
    
    if not prompt_file.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
    
    with open(prompt_file, 'r', encoding='utf-8') as f:
        template = f.read()
        
    # Format safely using SafeDict so missing variables default to 'None' instead of throwing KeyError
    return template.format_map(SafeDict(kwargs))
