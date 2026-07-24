import logging
from typing import Any, Dict, List, Optional
from ..client import AgentMarkClient

logger = logging.getLogger("agentmark-mcp-server")


async def submit_human_approval_impl(
    client: AgentMarkClient,
    campaign_id: str,
    decision: str,
    feedback: Optional[str] = None,
) -> Dict[str, Any]:
    return await client.submit_human_approval(campaign_id, decision, feedback)


async def request_targeted_revision_impl(
    client: AgentMarkClient,
    campaign_id: str,
    target_agent: str,
    feedback: str,
) -> Dict[str, Any]:
    return await client.request_targeted_revision(campaign_id, target_agent, feedback)


async def update_client_memory_impl(
    client: AgentMarkClient,
    project_id: str,
    brand_voice: Optional[str] = None,
    target_audience: Optional[str] = None,
    key_insights: Optional[str] = None,
) -> Dict[str, Any]:
    return await client.update_client_memory(project_id, brand_voice, target_audience, key_insights)


async def clear_client_memory_impl(
    client: AgentMarkClient,
    project_id: str,
) -> Dict[str, Any]:
    return await client.clear_client_memory(project_id)


async def export_campaign_pdf_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    return await client.export_campaign_pdf(campaign_id)


async def export_campaign_json_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    return await client.export_campaign_json(campaign_id)


async def get_publishing_schedule_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    return await client.get_publishing_schedule(campaign_id)


async def verify_channel_credentials_impl(
    client: AgentMarkClient,
    campaign_id: str,
    channels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    return await client.verify_channel_credentials(campaign_id, channels)


async def generate_image_asset_impl(
    client: AgentMarkClient,
    prompt: str,
    aspect_ratio: Optional[str] = "1:1",
) -> Dict[str, Any]:
    return await client.generate_image_asset(prompt, aspect_ratio)


async def get_campaign_analytics_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    return await client.get_campaign_analytics(campaign_id)


async def synthesize_brand_memory_impl(
    client: AgentMarkClient,
    project_id: str,
) -> Dict[str, Any]:
    return await client.synthesize_brand_memory(project_id)


async def compare_campaigns_impl(
    client: AgentMarkClient,
    target_campaign_id: str,
    baseline_campaign_id: Optional[str] = None,
) -> Dict[str, Any]:
    return await client.compare_campaigns(target_campaign_id, baseline_campaign_id)
