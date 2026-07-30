"""
Semantic Delta Patching Utility — Deep Merge Engine.

Recursively merges patch dictionary into base dictionary without destroying
unmentioned fields or channels.
"""

from typing import Any, Dict


def deep_merge_dicts(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively merge `patch` dictionary into `base` dictionary.
    
    Rules:
    - If key in patch is a dict and key in base is a dict -> recursive deep merge.
    - If key in patch is None/null -> preserve existing base value (do not overwrite with None).
    - Primitives and lists in patch overwrite base values.
    - Keys present in base but absent in patch remain untouched.
    """
    if not isinstance(base, dict):
        return patch if isinstance(patch, dict) else base
    if not isinstance(patch, dict):
        return base

    merged = dict(base)

    for key, value in patch.items():
        if value is None:
            # Do not overwrite existing populated data with None in revision mode
            continue

        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = deep_merge_dicts(merged[key], value)
        else:
            merged[key] = value

    return merged
