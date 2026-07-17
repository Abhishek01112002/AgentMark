import asyncio
import logging
from typing import Dict, Any
from ..client import AgentMarkClient

logger = logging.getLogger("agentmark-mcp-server")

async def publish_to_channel_impl(
    client: AgentMarkClient,
    campaign_id: str,
) -> str:
    """
    Asynchronous implementation for campaign publishing.
    Submits approval, which triggers the publisher agent workflow,
    and polls the campaign details until completion.
    """
    logger.info(f"Submitting approval to publish/finalize campaign {campaign_id}")
    
    payload = {
        "action": "approve"
    }

    # Call approval endpoint
    response = await client.post(f"/api/campaigns/{campaign_id}/approve", payload)
    logger.info(f"Campaign approval submitted. Campaign status is now processing.")

    # Poll status until completed (publisher done)
    max_retries = 90  # 7.5 minutes max timeout
    retry_interval = 5
    consecutive_failures = 0
    
    for attempt in range(max_retries):
        await asyncio.sleep(retry_interval)
        logger.info(f"Polling publisher status | campaign={campaign_id} | attempt={attempt + 1}")
        
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
            logger.info(f"Publisher workflow completed for campaign {campaign_id}")
            
            # Extract publisher outputs
            ai_outputs = campaign_details.get("aiOutputs") or {}
            publisher_output = ai_outputs.get("publisher") or {}
            
            markdown = [
                "# ✅ Campaign Approved & Finalized",
                f"Campaign ID: `{campaign_id}`",
                "The Publisher agent has executed successfully and formatted your assets for distribution.",
                "\n---"
            ]
            
            # Extract schedule if available
            scheduled_posts = publisher_output.get("scheduled_posts") or []
            if scheduled_posts:
                markdown.append("\n## 📅 Scheduled Channel Distribution")
                for post in scheduled_posts:
                    channel = post.get("channel", "Unknown")
                    time = post.get("scheduled_time") or post.get("time") or "Immediate"
                    content = post.get("content") or post.get("text") or ""
                    
                    markdown.append(f"\n### {channel.upper()} — Scheduled: {time}")
                    if content:
                        markdown.append(f"```\n{content}\n```")
            else:
                # Fallback to copy output if publisher schedule is formatted differently
                copywriter = ai_outputs.get("copywriter") or {}
                copies = copywriter.get("copies") or {}
                if copies:
                    markdown.append("\n## 📱 Final Creative Assets Ready")
                    for channel, copy_obj in copies.items():
                        if not copy_obj:
                            continue
                        headline = copy_obj.get("headline", "")
                        body = copy_obj.get("body", "")
                        markdown.append(f"\n### {channel.upper()}")
                        if headline:
                            markdown.append(f"**Headline:** {headline}")
                        if body:
                            markdown.append(f"```\n{body}\n```")
                else:
                    markdown.append("\nCampaign finalized in database. Ready for distribution.")
                    
            return "\n".join(markdown)
            
        elif status == "failed":
            error_msg = campaign_details.get("aiError") or "Publisher agent execution failed"
            logger.error(f"Publisher failed for campaign {campaign_id}: {error_msg}")
            raise RuntimeError(f"Publisher execution failed: {error_msg}")
            
    raise TimeoutError(
        f"Publisher workflow timed out after {max_retries * retry_interval} seconds. "
        "Please check the web dashboard to see if publication has completed."
    )
