import logging
from typing import Dict, Any, Optional
from client import AgentMarkClient
from formatters.fg_formatter import format_focus_group_report

logger = logging.getLogger("agentmark-mcp-server")

async def run_focus_group_impl(
    client: AgentMarkClient,
    campaign_id: str,
    copy_text: Optional[str] = None,
    negativity_bias: float = 0.3
) -> str:
    """
    Asynchronous implementation for synthetic focus group simulation.
    If copy_text is not provided, it fetches the campaign details from the backend,
    auto-extracts generated copy channels, and constructs the simulation context.
    """
    # 1. Fetch campaign details if copy_text or context is missing
    logger.info(f"Retrieving details for campaign {campaign_id}")
    campaign_details = await client.get(f"/api/campaigns/{campaign_id}")
    
    brand_name = campaign_details.get("brandName") or campaign_details.get("brand_name") or "Unnamed Brand"
    industry = campaign_details.get("industry") or "Unknown"
    primary_goal = campaign_details.get("primaryGoal") or "Unknown"
    target_audience = campaign_details.get("targetAudience") or "Unknown"

    campaign_context = {
        "brand_name": brand_name,
        "brand": brand_name,
        "industry": industry,
        "goal": primary_goal,
        "target_audience": target_audience,
        "audience": target_audience
    }

    # Extract copy if not explicitly provided
    if not copy_text:
        ai_outputs = campaign_details.get("aiOutputs") or {}
        copywriter = ai_outputs.get("copywriter") or {}
        copies = copywriter.get("copies") or {}
        
        extracted_copy_parts = []
        for channel, copy_obj in copies.items():
            if not copy_obj:
                continue
            headline = copy_obj.get("headline", "")
            body = copy_obj.get("body", "")
            subject = copy_obj.get("subject", "")
            
            part = f"--- {channel.upper()} CHANNEL ---\n"
            if subject:
                part += f"Subject: {subject}\n"
            if headline:
                part += f"Headline: {headline}\n"
            if body:
                part += f"Body:\n{body}\n"
            extracted_copy_parts.append(part)
            
        if not extracted_copy_parts:
            raise ValueError(
                "No generated copy found in the campaign. "
                "Please generate campaign content first, or provide copy_text explicitly."
            )
        copy_text = "\n".join(extracted_copy_parts)

    # 2. Call simulate endpoint
    payload = {
        "campaign_id": campaign_id,
        "copy_text": copy_text[:4000],  # safety cap
        "campaign_context": campaign_context,
        "negativity_bias": negativity_bias
    }

    logger.info(f"Triggering focus group simulation | campaign={campaign_id}")
    simulation_response = await client.post("/api/focus-group/simulate", payload)
    
    # 3. Format and return
    return format_focus_group_report(simulation_response)
