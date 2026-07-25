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
    logger.info(
        "Submitting human approval | campaign=%s | decision=%s", campaign_id, decision
    )
    try:
        result = await client.submit_human_approval(campaign_id, decision, feedback)
        logger.info("Human approval submitted | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "submit_human_approval failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Failed to submit approval for campaign '%s': %s" % (campaign_id, exc)
        ) from exc


async def request_targeted_revision_impl(
    client: AgentMarkClient,
    campaign_id: str,
    target_agent: str,
    feedback: str,
) -> Dict[str, Any]:
    VALID_AGENTS = {"copywriter", "strategy", "research", "reviewer", "manager"}
    if target_agent.lower() not in VALID_AGENTS:
        raise ValueError(
            "Invalid target_agent '%s'. Must be one of: %s"
            % (target_agent, sorted(VALID_AGENTS))
        )
    logger.info(
        "Requesting targeted revision | campaign=%s | agent=%s", campaign_id, target_agent
    )
    try:
        result = await client.request_targeted_revision(campaign_id, target_agent, feedback)
        logger.info(
            "Targeted revision request sent | campaign=%s | agent=%s",
            campaign_id, target_agent,
        )
        return result
    except Exception as exc:
        logger.error(
            "request_targeted_revision failed | campaign=%s | agent=%s | error=%s",
            campaign_id, target_agent, exc,
        )
        raise RuntimeError(
            "Failed to request targeted revision for campaign '%s' (agent: %s): %s"
            % (campaign_id, target_agent, exc)
        ) from exc


async def update_client_memory_impl(
    client: AgentMarkClient,
    project_id: str,
    brand_voice: Optional[str] = None,
    target_audience: Optional[str] = None,
    key_insights: Optional[str] = None,
) -> Dict[str, Any]:
    logger.info("Updating client memory | project=%s", project_id)
    try:
        result = await client.update_client_memory(
            project_id, brand_voice, target_audience, key_insights
        )
        logger.info("Client memory updated | project=%s", project_id)
        return result
    except Exception as exc:
        logger.error(
            "update_client_memory failed | project=%s | error=%s", project_id, exc
        )
        raise RuntimeError(
            "Failed to update client memory for project '%s': %s" % (project_id, exc)
        ) from exc


async def clear_client_memory_impl(
    client: AgentMarkClient,
    project_id: str,
) -> Dict[str, Any]:
    logger.info("Clearing client memory | project=%s", project_id)
    try:
        result = await client.clear_client_memory(project_id)
        logger.info("Client memory cleared | project=%s", project_id)
        return result
    except Exception as exc:
        logger.error(
            "clear_client_memory failed | project=%s | error=%s", project_id, exc
        )
        raise RuntimeError(
            "Failed to clear client memory for project '%s': %s" % (project_id, exc)
        ) from exc


async def export_campaign_pdf_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    logger.info("Exporting campaign PDF | campaign=%s", campaign_id)
    try:
        result = await client.export_campaign_pdf(campaign_id)
        logger.info("Campaign PDF export complete | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "export_campaign_pdf failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Failed to export PDF for campaign '%s': %s" % (campaign_id, exc)
        ) from exc


async def export_campaign_json_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    logger.info("Exporting campaign JSON | campaign=%s", campaign_id)
    try:
        result = await client.export_campaign_json(campaign_id)
        logger.info("Campaign JSON export complete | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "export_campaign_json failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Failed to export JSON for campaign '%s': %s" % (campaign_id, exc)
        ) from exc


async def get_publishing_schedule_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    logger.info("Fetching publishing schedule | campaign=%s", campaign_id)
    try:
        result = await client.get_publishing_schedule(campaign_id)
        logger.info("Publishing schedule retrieved | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "get_publishing_schedule failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Failed to get publishing schedule for campaign '%s': %s"
            % (campaign_id, exc)
        ) from exc


async def verify_channel_credentials_impl(
    client: AgentMarkClient,
    campaign_id: str,
    channels: Optional[List[str]] = None,
) -> Dict[str, Any]:
    if channels is not None:
        if not isinstance(channels, list) or not all(
            isinstance(c, str) for c in channels
        ):
            raise ValueError(
                "Parameter 'channels' must be a list of strings. Received: %r" % channels
            )
    logger.info(
        "Verifying channel credentials | campaign=%s | channels=%s",
        campaign_id, channels,
    )
    try:
        result = await client.verify_channel_credentials(campaign_id, channels)
        logger.info("Channel credentials verified | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "verify_channel_credentials failed | campaign=%s | error=%s",
            campaign_id, exc,
        )
        raise RuntimeError(
            "Failed to verify channel credentials for campaign '%s': %s"
            % (campaign_id, exc)
        ) from exc


async def generate_image_asset_impl(
    client: AgentMarkClient,
    prompt: str,
    aspect_ratio: Optional[str] = "1:1",
) -> Dict[str, Any]:
    if not prompt or not prompt.strip():
        raise ValueError("Parameter 'prompt' cannot be empty.")
    if len(prompt) > 4000:
        raise ValueError(
            "Parameter 'prompt' exceeds maximum length of 4000 characters (received %d)."
            % len(prompt)
        )
    logger.info(
        "Generating image asset | ratio=%s | prompt_chars=%d", aspect_ratio, len(prompt)
    )
    try:
        result = await client.generate_image_asset(prompt, aspect_ratio)
        logger.info("Image asset generated | ratio=%s", aspect_ratio)
        return result
    except Exception as exc:
        logger.error(
            "generate_image_asset failed | ratio=%s | error=%s", aspect_ratio, exc
        )
        raise RuntimeError(
            "Failed to generate image asset: %s" % exc
        ) from exc


async def get_campaign_analytics_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> Dict[str, Any]:
    logger.info("Fetching campaign analytics | campaign=%s", campaign_id)
    try:
        result = await client.get_campaign_analytics(campaign_id)
        logger.info("Campaign analytics retrieved | campaign=%s", campaign_id)
        return result
    except Exception as exc:
        logger.error(
            "get_campaign_analytics failed | campaign=%s | error=%s", campaign_id, exc
        )
        raise RuntimeError(
            "Failed to get analytics for campaign '%s': %s" % (campaign_id, exc)
        ) from exc


async def synthesize_brand_memory_impl(
    client: AgentMarkClient,
    project_id: str,
) -> Dict[str, Any]:
    logger.info("Synthesizing brand memory | project=%s", project_id)
    try:
        result = await client.synthesize_brand_memory(project_id)
        logger.info("Brand memory synthesized | project=%s", project_id)
        return result
    except Exception as exc:
        logger.error(
            "synthesize_brand_memory failed | project=%s | error=%s", project_id, exc
        )
        raise RuntimeError(
            "Failed to synthesize brand memory for project '%s': %s"
            % (project_id, exc)
        ) from exc


async def compare_campaigns_impl(
    client: AgentMarkClient,
    target_campaign_id: str,
    baseline_campaign_id: Optional[str] = None,
) -> Dict[str, Any]:
    if not target_campaign_id or not target_campaign_id.strip():
        raise ValueError("Parameter 'target_campaign_id' cannot be empty.")
    logger.info(
        "Comparing campaigns | target=%s | baseline=%s",
        target_campaign_id, baseline_campaign_id,
    )
    try:
        result = await client.compare_campaigns(
            target_campaign_id, baseline_campaign_id
        )
        logger.info(
            "Campaign comparison complete | target=%s", target_campaign_id
        )
        return result
    except Exception as exc:
        logger.error(
            "compare_campaigns failed | target=%s | error=%s",
            target_campaign_id, exc,
        )
        raise RuntimeError(
            "Failed to compare campaigns (target: '%s'): %s"
            % (target_campaign_id, exc)
        ) from exc
