import asyncio
import json
import logging
from typing import Dict, Any, List, Optional
from ..client import AgentMarkClient
from ..formatters.brief_formatter import format_campaign_brief
from ..config import POLL_INTERVAL_SECS, CAMPAIGN_TIMEOUT_SECS

logger = logging.getLogger("agentmark-mcp-server")

async def generate_campaign_impl(
    client: AgentMarkClient,
    project_id: str,
    name: str,
    brand_name: str,
    industry: str,
    primary_goal: str,
    target_audience: str,
    brand_voice: str,
    additional_info: Optional[str] = None,
    openai_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    groq_api_key: Optional[str] = None,
    tavily_api_key: Optional[str] = None,
) -> str:
    """
    Asynchronous implementation for campaign generation. 
    Triggers the background workflow on the backend and polls until completion.
    """
    # 1. Build LLM configuration headers if keys are provided
    llm_config = {}
    if openai_api_key:
        llm_config["openai_api_key"] = openai_api_key
    if gemini_api_key:
        llm_config["gemini_api_key"] = gemini_api_key
    if groq_api_key:
        llm_config["groq_api_key"] = groq_api_key
    if tavily_api_key:
        llm_config["tavily_api_key"] = tavily_api_key

    extra_headers = {}
    if llm_config:
        extra_headers["x-llm-config"] = json.dumps(llm_config)

    # 2. Trigger campaign creation
    payload = {
        "projectId": project_id,
        "name": name,
        "brandName": brand_name,
        "industry": industry,
        "primaryGoal": primary_goal,
        "targetAudience": target_audience,
        "brandVoice": brand_voice
    }
    if additional_info:
        payload["additionalInfo"] = additional_info

    logger.info(f"Triggering campaign creation in project {project_id}")
    response = await client.post("/api/campaigns", payload, extra_headers=extra_headers)
    campaign = response.get("campaign")
    if not campaign or "id" not in campaign:
        raise RuntimeError("Backend returned an invalid campaign object on creation.")

    campaign_id = campaign["id"]
    logger.info(f"Campaign {campaign_id} created successfully. Starting execution monitoring.")

    # 3. Synchronous polling loop for asynchronous background task
    retry_interval = POLL_INTERVAL_SECS
    max_retries = max(1, CAMPAIGN_TIMEOUT_SECS // POLL_INTERVAL_SECS)
    consecutive_failures = 0
    
    for attempt in range(max_retries):
        await asyncio.sleep(retry_interval)
        logger.info(f"Polling campaign status | campaign={campaign_id} | attempt={attempt + 1}")
        
        try:
            campaign_details = await client.get(f"/api/campaigns/{campaign_id}")
            consecutive_failures = 0  # Reset on success
        except Exception as e:
            consecutive_failures += 1
            logger.warning(
                f"Transient status check failure ({consecutive_failures}/5) "
                f"for campaign {campaign_id}: {str(e)}"
            )
            if consecutive_failures >= 5:
                logger.error(f"Unrecoverable connection issues polling campaign {campaign_id}.")
                raise RuntimeError(f"Lost communication with AgentMark API: {str(e)}")
            continue

        status = campaign_details.get("status", "draft").lower()

        if status == "completed":
            logger.info(f"Campaign {campaign_id} completed successfully.")
            return format_campaign_brief(campaign_details)
        elif status == "failed":
            error_msg = campaign_details.get("aiError") or "Unknown AI service error occurred"
            logger.error(f"Campaign {campaign_id} failed in background runner: {error_msg}")
            raise RuntimeError(f"Campaign generation failed: {error_msg}")
        
    raise TimeoutError(
        f"Campaign generation timed out after {CAMPAIGN_TIMEOUT_SECS} seconds. "
        "Please check the web dashboard to see the execution status."
    )
