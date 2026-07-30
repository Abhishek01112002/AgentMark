"""
Prompt Loader Utility
Loads prompt templates from txt files and formats them with variables.
Supports Provider-Level System Prompt Caching (Prefix Caching).
"""

import threading
from pathlib import Path
from typing import Optional, Tuple

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


from utils.bpe_sanitizer import minify_prompt_context, safe_bpe_json_dumps
from utils.token_budget import TokenBudgetManager


def _sanitize_kwargs(kwargs: dict) -> dict:
    sanitized = {}
    for k, v in kwargs.items():
        if isinstance(v, (dict, list)):
            dumped = safe_bpe_json_dumps(v)
            if TokenBudgetManager.count_tokens(dumped) > 4000:
                dumped = TokenBudgetManager.slice_json_payload(dumped, 4000)
            sanitized[k] = dumped
        elif isinstance(v, str):
            if TokenBudgetManager.count_tokens(v) > 4000:
                sanitized[k] = TokenBudgetManager.slice_context_to_budget(v, 4000)
            else:
                sanitized[k] = v
        else:
            sanitized[k] = v
    return sanitized


def load_prompt(prompt_name: str, **kwargs) -> str:
    """
    Load a prompt template from memory cache and format safely with variables.
    
    Args:
        prompt_name: Name of the prompt file (without .txt extension)
        **kwargs: Variables to substitute in the prompt template
        
    Returns:
        Formatted prompt string (single combined string)
    """
    template = get_prompt_template(prompt_name)
    cleaned = template.replace("---USER_PROMPT---\n", "").replace("---USER_PROMPT---", "")
    sanitized_kwargs = _sanitize_kwargs(kwargs)
    result = cleaned.format_map(SafeDict(sanitized_kwargs))
    return minify_prompt_context(result)


TENANT_DYNAMIC_KEYS: set[str] = {
    "campaign_name", "brand_name", "brief", "human_feedback",
    "client_memory_context", "additional_context", "additional_info",
    "human_feedback_section"
}


def _verify_system_prompt_isolation(system_tmpl: str) -> None:
    """Ensure system prompt template does not embed tenant-specific dynamic keys."""
    for key in TENANT_DYNAMIC_KEYS:
        if f"{{{key}}}" in system_tmpl:
            logger.warning(
                f"[TENANT ISOLATION WARNING] Dynamic tenant key '{{{key}}}' found in static system prompt template. "
                "For max cache efficiency and tenant isolation, move dynamic fields after ---USER_PROMPT---."
            )


def load_split_prompt(prompt_name: str, **kwargs) -> Tuple[Optional[str], str]:
    """
    Load a prompt template and separate static system instructions from dynamic user inputs.
    
    If the template contains '---USER_PROMPT---', it splits into:
    - system_prompt: static persona instructions, rules, constraints, schema rules.
    - user_prompt: dynamic campaign inputs, research evidence, and variables.
    
    Returns:
        Tuple of (system_prompt, user_prompt)
    """
    template = get_prompt_template(prompt_name)
    sanitized_kwargs = _sanitize_kwargs(kwargs)
    safe_kwargs = SafeDict(sanitized_kwargs)

    if "---USER_PROMPT---" in template:
        parts = template.split("---USER_PROMPT---", 1)
        system_tmpl = parts[0].strip()
        user_tmpl = parts[1].strip()
        _verify_system_prompt_isolation(system_tmpl)
        sys_prompt = minify_prompt_context(system_tmpl.format_map(safe_kwargs))
        usr_prompt = minify_prompt_context(user_tmpl.format_map(safe_kwargs))
        return (sys_prompt, usr_prompt)
    else:
        usr_prompt = minify_prompt_context(template.format_map(safe_kwargs))
        return (None, usr_prompt)


def extract_formatted_pain_points(research_data: dict) -> str:
    """Extract and format audience pain points into high-density Markdown list."""
    if not isinstance(research_data, dict):
        return "• General target audience pain points and scaling bottlenecks."
    pain_points = (
        research_data.get("audience_insights", {}).get("pain_points", [])
        or research_data.get("pain_points", [])
    )
    if not pain_points or not isinstance(pain_points, list):
        return "• General target audience pain points and scaling bottlenecks."
    return "\n".join([f"• {str(p).strip()}" for p in pain_points if p])
