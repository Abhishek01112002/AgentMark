"""
Local Python Pre-Validation Engine.

Executes deterministic structural, presence, and bounds checks in local Python
(0ms latency, 0 tokens) to pre-screen agent outputs before or during review loops.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Set


@dataclass
class ValidationResult:
    """DTO containing deterministic validation outcome and structural diagnostics."""
    is_valid: bool
    issues: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class PreValidator:
    """Deterministic structural and bounds validation engine."""

    @staticmethod
    def _is_empty(value: Any) -> bool:
        """Check if a value is None, empty string, whitespace-only, or empty collection."""
        if value is None:
            return True
        if isinstance(value, str):
            return len(value.strip()) == 0
        if isinstance(value, (list, dict, set, tuple)):
            return len(value) == 0
        return False

    @staticmethod
    def validate_channel_coverage(copy_dict: Dict[str, Any], required_channels: List[str]) -> ValidationResult:
        """
        Validates that all required campaign channels have non-empty copy populated.
        Inspects top-level keys AND nested channel_copy / deliverables / channels / copies lists.
        """
        if not required_channels:
            return ValidationResult(is_valid=True, metadata={"missing_channels": [], "coverage_pct": 100.0})

        if not isinstance(copy_dict, dict):
            return ValidationResult(
                is_valid=False,
                issues=["copy_dict is not a dictionary"],
                metadata={"missing_channels": list(required_channels), "coverage_pct": 0.0}
            )

        # 1. Collect present channels from top-level keys
        present_keys = {
            str(k).lower().replace(" ", "_").replace("-", "_")
            for k, v in copy_dict.items()
            if not PreValidator._is_empty(v)
        }

        # 2. ALSO collect present channels from nested lists (channel_copy, channels, deliverables, copies, copy, items)
        for list_key in ("channel_copy", "channels", "deliverables", "copies", "copy", "items"):
            nested_list = copy_dict.get(list_key)
            if isinstance(nested_list, list):
                for item in nested_list:
                    if isinstance(item, dict):
                        ch_name = item.get("channel") or item.get("platform") or item.get("channel_name") or item.get("name")
                        if ch_name and not PreValidator._is_empty(ch_name):
                            norm_ch = str(ch_name).lower().replace(" ", "_").replace("-", "_")
                            present_keys.add(norm_ch)
                            # Add common aliases (e.g. google_ads <-> google)
                            if norm_ch == "google_ads":
                                present_keys.add("google")
                            elif norm_ch == "google":
                                present_keys.add("google_ads")
                            elif norm_ch == "youtube_shorts":
                                present_keys.add("youtube")

        missing = []
        for req in required_channels:
            norm_req = str(req).lower().replace(" ", "_").replace("-", "_")
            if norm_req not in present_keys:
                missing.append(req)

        total_req = len(required_channels)
        covered_count = total_req - len(missing)
        coverage_pct = round((covered_count / total_req) * 100, 1) if total_req > 0 else 100.0

        is_valid = len(missing) == 0
        issues = [f"Missing required channel copy for: {', '.join(missing)}"] if missing else []

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            metadata={
                "missing_channels": missing,
                "coverage_pct": coverage_pct,
                "total_required": total_req,
                "total_covered": covered_count
            }
        )

    @staticmethod
    def validate_image_prompt_bounds(image_prompts: List[Dict[str, Any]], min_chars: int = 700) -> ValidationResult:
        """
        Evaluates visual prompt strings for minimum length bounds.
        """
        if not isinstance(image_prompts, list) or len(image_prompts) == 0:
            return ValidationResult(
                is_valid=False,
                issues=["image_prompts list is empty or invalid"],
                metadata={"short_prompts": [], "total_prompts": 0, "valid_prompt_count": 0}
            )

        short_prompts = []
        total_chars = 0

        for idx, prompt_item in enumerate(image_prompts):
            p_text = ""
            if isinstance(prompt_item, dict):
                p_text = prompt_item.get("prompt") or prompt_item.get("image_prompt") or ""
            elif isinstance(prompt_item, str):
                p_text = prompt_item
            elif hasattr(prompt_item, "prompt"):
                p_text = getattr(prompt_item, "prompt", "")

            char_len = len(str(p_text).strip())
            total_chars += char_len

            if char_len < min_chars:
                short_prompts.append({
                    "index": idx,
                    "length": char_len,
                    "min_required": min_chars
                })

        valid_count = len(image_prompts) - len(short_prompts)
        is_valid = len(short_prompts) == 0
        issues = [f"Found {len(short_prompts)} image prompt(s) shorter than {min_chars} chars"] if short_prompts else []

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            metadata={
                "short_prompts": short_prompts,
                "total_prompts": len(image_prompts),
                "valid_prompt_count": valid_count,
                "avg_char_length": round(total_chars / len(image_prompts), 1) if image_prompts else 0
            }
        )

    @staticmethod
    def validate_schema_field_presence(output_dict: Dict[str, Any], required_keys: List[str]) -> ValidationResult:
        """
        Verifies key presence and non-empty values for required schema fields.
        """
        if not required_keys:
            return ValidationResult(is_valid=True, metadata={"missing_fields": []})

        if not isinstance(output_dict, dict):
            return ValidationResult(
                is_valid=False,
                issues=["output_dict is not a dictionary"],
                metadata={"missing_fields": list(required_keys)}
            )

        missing = []
        present = []

        for key in required_keys:
            # Handle camelCase vs snake_case lookup
            val = output_dict.get(key)
            if val is None:
                # Try snake_case or camelCase fallback
                alt_key = key.replace("_", "").lower()
                val = next((v for k, v in output_dict.items() if k.replace("_", "").lower() == alt_key), None)

            if PreValidator._is_empty(val):
                missing.append(key)
            else:
                present.append(key)

        is_valid = len(missing) == 0
        issues = [f"Missing or empty required field(s): {', '.join(missing)}"] if missing else []

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            metadata={
                "missing_fields": missing,
                "present_fields": present,
                "presence_pct": round((len(present) / len(required_keys)) * 100, 1) if required_keys else 100.0
            }
        )

    @staticmethod
    def validate_grounded_research_intelligence(research_dict: Dict[str, Any]) -> ValidationResult:
        """
        Deterministic Python validation (0ms, 0 tokens) for Grounded 100x Research Intelligence.
        Verifies presence of customer_voice_insights, competitor_vulnerabilities, proven_ad_hooks, and brand_dna.
        """
        if not isinstance(research_dict, dict):
            return ValidationResult(is_valid=False, issues=["Research output is not a dictionary"])

        target_keys = ["customer_voice_insights", "competitor_vulnerabilities", "proven_ad_hooks", "brand_dna"]
        missing = [k for k in target_keys if PreValidator._is_empty(research_dict.get(k))]

        return ValidationResult(
            is_valid=len(missing) == 0,
            issues=[f"Missing research intelligence field(s): {', '.join(missing)}"] if missing else [],
            metadata={
                "missing_fields": missing,
                "present_count": len(target_keys) - len(missing),
                "is_grounded_100x": len(missing) == 0
            }
        )

    @staticmethod
    def validate_visual_intelligence_compliance(image_prompts: List[Dict[str, Any]]) -> ValidationResult:
        """
        Deterministic Python validation (0ms, 0 tokens) for Visual Intelligence Engine rules:
        - Banned anti-slop phrase check
        - Lens physics / camera spec presence
        - Safety tail presence ('no text, no words...')
        """
        if not isinstance(image_prompts, list) or len(image_prompts) == 0:
            return ValidationResult(is_valid=False, issues=["image_prompts list is empty or invalid"])

        banned_phrases = [
            "capturing the essence", "vibrant tapestry", "seamlessly blends",
            "modern professional setting", "innovative solution", "tapestry of"
        ]

        issues = []
        slop_count = 0
        missing_optics_count = 0
        missing_safety_tail_count = 0

        for idx, item in enumerate(image_prompts):
            p_text = ""
            cam_spec = ""
            if isinstance(item, dict):
                p_text = str(item.get("prompt") or "").lower()
                cam_spec = str(item.get("camera_specs") or "").lower()
            elif hasattr(item, "prompt"):
                p_text = str(getattr(item, "prompt", "")).lower()
                cam_spec = str(getattr(item, "camera_specs", "")).lower()

            for phrase in banned_phrases:
                if phrase in p_text:
                    issues.append(f"Prompt #{idx+1} contains banned anti-slop phrase: '{phrase}'")
                    slop_count += 1

            if not cam_spec or cam_spec in ("n/a", "none", "false", "null", "undefined"):
                issues.append(f"Prompt #{idx+1} lacks valid camera/lens optics specification")
                missing_optics_count += 1

            if "no text" not in p_text:
                issues.append(f"Prompt #{idx+1} lacks mandatory safety tail ('no text...')")
                missing_safety_tail_count += 1

        is_valid = len(issues) == 0
        compliance_pct = round(((len(image_prompts) * 3 - (slop_count + missing_optics_count + missing_safety_tail_count)) / (len(image_prompts) * 3)) * 100, 1) if image_prompts else 100.0

        return ValidationResult(
            is_valid=is_valid,
            issues=issues,
            metadata={
                "compliance_pct": max(0.0, compliance_pct),
                "slop_occurrences": slop_count,
                "missing_optics_count": missing_optics_count,
                "missing_safety_tail_count": missing_safety_tail_count,
                "total_prompts_checked": len(image_prompts)
            }
        )

