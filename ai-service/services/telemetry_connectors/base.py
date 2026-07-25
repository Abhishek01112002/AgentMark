"""
Abstract Base Ad Telemetry Connector — AgentMark AI Pre-Flight Engine
"""

from abc import ABC, abstractmethod
from typing import Dict, Any
from domain.telemetry import CanonicalAdMetrics, NormalizedPerformanceEvent


class BaseTelemetryConnector(ABC):
    """Interface for ad platform telemetry ingestion connectors."""

    @property
    @abstractmethod
    def platform_name(self) -> str:
        """Returns platform identifier ('meta', 'google', 'linkedin')."""
        pass

    @abstractmethod
    def verify_webhook_signature(self, payload_bytes: bytes, signature: str, secret: str) -> bool:
        """Verifies incoming webhook payload signature."""
        pass

    @abstractmethod
    def parse_webhook_payload(self, raw_payload: Dict[str, Any]) -> NormalizedPerformanceEvent:
        """Parses raw webhook JSON payload into Canonical NormalizedPerformanceEvent."""
        pass
