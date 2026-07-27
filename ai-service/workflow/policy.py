"""
EMOS Phase 3: Layered Policy Engine (Platform -> Industry -> Tenant -> Campaign)
Enforces multi-tier legal, compliance, safety, and brand rules prior to publication.
"""

from typing import Dict, Any, List, Optional
import re
import logging

logger = logging.getLogger(__name__)


class PolicyViolation(Exception):
    def __init__(self, layer: str, rule: str, details: str):
        self.layer = layer
        self.rule = rule
        self.details = details
        super().__init__(f"[{layer.upper()} POLICY BREACH] {rule}: {details}")


def evaluate_platform_policy(text: str) -> List[str]:
    """Tier 1: Global Platform Policy (Safety, Defamation, Global Prohibitions)."""
    violations = []
    # Check competitor defamation
    defamation_patterns = [r"competitor\s+is\s+a\s+scam", r"illegal\s+fraud", r"guaranteed\ 100%\ returns"]
    for pat in defamation_patterns:
        if re.search(pat, text, re.IGNORECASE):
            violations.append(f"Platform Safety Violation: Matched forbidden term '{pat}'")
    return violations


def evaluate_industry_policy(text: str, industry: str) -> List[str]:
    """Tier 2: Industry Specific Regulations (Healthcare HIPAA, Finance SEC)."""
    violations = []
    ind_clean = (industry or "").lower().strip()
    if ind_clean in ["finance", "banking", "crypto"]:
        if re.search(r"guaranteed\s+profit", text, re.IGNORECASE):
            violations.append("Finance Policy Violation: 'guaranteed profit' is prohibited under SEC guidelines")
    elif ind_clean in ["healthcare", "medical", "pharma"]:
        if re.search(r"cures\s+all\s+diseases", text, re.IGNORECASE):
            violations.append("Healthcare Policy Violation: Unsubstantiated medical claim 'cures all diseases'")
    return violations


def evaluate_tenant_policy(text: str, forbidden_terms: List[str]) -> List[str]:
    """Tier 3: Enterprise Tenant Brand Rules (Forbidden Brand Keywords)."""
    violations = []
    for term in (forbidden_terms or []):
        if term and re.search(rf"\b{re.escape(term)}\b", text, re.IGNORECASE):
            violations.append(f"Tenant Policy Violation: Use of forbidden brand term '{term}'")
    return violations


def evaluate_campaign_policy(text: str, campaign_rules: Dict[str, Any]) -> List[str]:
    """Tier 4: Campaign Specific Offer Bounds."""
    violations = []
    max_discount = campaign_rules.get("max_discount_percent")
    if max_discount is not None:
        matches = re.findall(r"(\d+)%\s*off", text, re.IGNORECASE)
        for m in matches:
            if int(m) > max_discount:
                violations.append(f"Campaign Policy Violation: Discount {m}% exceeds campaign limit of {max_discount}%")
    return violations


def enforce_layered_policy(
    text: str,
    industry: Optional[str] = None,
    forbidden_terms: Optional[List[str]] = None,
    campaign_rules: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Executes 4-tier policy evaluation hierarchy in sequence.
    Returns audit result dict with passed status and violation list.
    """
    all_violations = []
    all_violations.extend(evaluate_platform_policy(text))
    all_violations.extend(evaluate_industry_policy(text, industry))
    all_violations.extend(evaluate_tenant_policy(text, forbidden_terms))
    all_violations.extend(evaluate_campaign_policy(text, campaign_rules or {}))

    passed = len(all_violations) == 0
    return {
        "passed": passed,
        "violation_count": len(all_violations),
        "violations": all_violations,
        "policy_hierarchy": ["Platform", "Industry", "Tenant", "Campaign"]
    }
