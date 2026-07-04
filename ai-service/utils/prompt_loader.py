"""
Prompt Loader Utility
Loads prompt templates from txt files and formats them with variables
"""

from pathlib import Path

# Static template cache to avoid repeated file reads and GC pressure
_templates_cache: dict[str, str] = {}


def load_prompt(prompt_name: str, **kwargs) -> str:
    """
    Load a prompt template from file (with in-memory caching) and format with variables
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        **kwargs: Variables to substitute in the prompt template
        
    Returns:
        Formatted prompt string
    """
    if prompt_name not in _templates_cache:
        # Get the prompts directory path
        prompts_dir = Path(__file__).parent / "prompts"
        prompt_file = prompts_dir / f"{prompt_name}_prompt.txt"
        
        if not prompt_file.exists():
            raise FileNotFoundError(f"Prompt file not found: {prompt_file}")
        
        # Read the prompt template
        with open(prompt_file, 'r', encoding='utf-8') as f:
            _templates_cache[prompt_name] = f.read()
            
    template = _templates_cache[prompt_name]
    
    # Format with provided variables
    try:
        formatted_prompt = template.format(**kwargs)
    except KeyError as e:
        raise ValueError(f"Missing required variable in prompt template: {e}")
    
    return formatted_prompt
