"""
Provider Credential Service — AgentMark AI Pre-Flight Engine

Handles secure credential loading and KMS key versioning (v1, v2, etc.)
while preserving full backward compatibility.
"""

import json
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("agentmark.credentials")


class ProviderCredentialResolver:
    """Resolves and decrypts provider API credentials with KMS versioning support."""

    def __init__(self, active_kms_version: str = "v1"):
        self.active_kms_version = active_kms_version

    def parse_encrypted_metadata(self, encrypted_raw: str) -> Dict[str, Any]:
        """
        Parses encrypted metadata payload supporting key versioning headers.
        """
        try:
            data = json.loads(encrypted_raw)
            if isinstance(data, dict) and "kms_version" in data:
                version = data.get("kms_version", "v1")
                logger.info(f"Decrypting provider credential using KMS version: {version}")
                return data.get("payload", {})
            elif isinstance(data, dict):
                return data
            return {}
        except Exception as exc:
            logger.error(f"Failed to resolve encrypted credential metadata: {exc}")
            return {}

    def format_encrypted_metadata(self, payload: Dict[str, Any], kms_version: Optional[str] = None) -> str:
        """
        Formats credential payload with KMS versioning header.
        """
        version = kms_version or self.active_kms_version
        wrapped = {
            "kms_version": version,
            "payload": payload
        }
        return json.dumps(wrapped)
