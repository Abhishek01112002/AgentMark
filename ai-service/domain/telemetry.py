"""
Telemetry Domain Layer — AgentMark AI Pre-Flight Engine (Phase 2A)

Provider-agnostic canonical data models for ad platform metrics, telemetry events,
and normalized performance schemas.
"""

from datetime import datetime
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class CanonicalAdMetrics(BaseModel):
    """Normalized performance metrics across Meta, Google, and LinkedIn Ads."""
    platform: str = Field(description="Ad platform identifier: 'meta', 'google', or 'linkedin'")
    campaign_id: str = Field(description="Internal or platform campaign ID")
    external_ad_id: Optional[str] = Field(default=None, description="External ad or creative ID")
    
    impressions: int = Field(default=0, ge=0)
    clicks: int = Field(default=0, ge=0)
    conversions: int = Field(default=0, ge=0)
    spend_usd: float = Field(default=0.0, ge=0.0)
    
    observed_ctr: float = Field(default=0.0, description="Click-Through Rate (clicks / impressions)")
    observed_cvr: float = Field(default=0.0, description="Conversion Rate (conversions / clicks)")
    observed_roas: float = Field(default=0.0, description="Return On Ad Spend")


class NormalizedPerformanceEvent(BaseModel):
    """Immutable event payload for telemetry ingestion pipeline."""
    event_id: str = Field(description="Unique deterministic nonce or event UUID")
    organization_id: str = Field(description="Tenant organization ID")
    project_id: str = Field(description="Project ID associated with campaign")
    campaign_id: str = Field(description="Campaign ID")
    platform: str = Field(description="'meta', 'google', or 'linkedin'")
    
    metrics: CanonicalAdMetrics
    event_timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload_version: str = Field(default="v1.0")
