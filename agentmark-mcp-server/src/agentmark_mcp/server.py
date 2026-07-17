import logging
import sys
from typing import Optional
from contextlib import asynccontextmanager
from mcp.server.fastmcp import FastMCP
from .client import AgentMarkClient
from .tools.campaign import generate_campaign_impl
from .tools.focus_group import run_focus_group_impl
from .tools.publish import publish_to_channel_impl

# Configure standard stream logging to stderr (stdout is used for MCP protocol communication)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stderr
)
logger = logging.getLogger("agentmark-mcp-server")

# Global singleton client managed by the server lifespan hook
_client_instance: Optional[AgentMarkClient] = None

@asynccontextmanager
async def mcp_lifespan(server: FastMCP):
    global _client_instance
    logger.info("⚡ Initializing AgentMark Client connection pool (lifespan start)")
    _client_instance = AgentMarkClient()
    try:
        yield
    finally:
        logger.info("🔌 Closing AgentMark Client connection pool (lifespan end)")
        if _client_instance:
            await _client_instance.close()
            _client_instance = None

# Initialize FastMCP with the lifecycle context manager
mcp = FastMCP(
    "AgentMark",
    description="Model Context Protocol (MCP) server for AgentMark AI marketing platform",
    lifespan=mcp_lifespan
)

def get_client() -> AgentMarkClient:
    """Helper to retrieve the active singleton client, with fallback."""
    global _client_instance
    if _client_instance is None:
        logger.warning("AgentMarkClient accessed outside lifespan context. Creating fallback client.")
        return AgentMarkClient()
    return _client_instance

@mcp.tool()
async def generate_campaign(
    project_id: str,
    name: str,
    brand_name: str,
    industry: str,
    primary_goal: str,
    target_audience: str,
    brand_voice: str,
    additional_info: str = "",
    openai_api_key: str = "",
    gemini_api_key: str = "",
    groq_api_key: str = "",
    tavily_api_key: str = ""
) -> str:
    """
    Generate a complete multi-channel marketing campaign with strategy and copy.
    Runs the full LangGraph agent pipeline synchronously by polling status.
    
    Args:
        project_id: The UUID of the project this campaign belongs to.
        name: Name of the campaign.
        brand_name: Name of the brand.
        industry: Industry sector (e.g. SaaS, E-commerce, Finance, Healthcare, Real Estate).
        primary_goal: Goal of the campaign (e.g. awareness, lead_gen, sales, retention).
        target_audience: Description of the target audience.
        brand_voice: Tone and brand voice directives.
        additional_info: Any additional context or constraints for the campaign.
        openai_api_key: Optional OpenAI API key override.
        gemini_api_key: Optional Gemini API key override.
        groq_api_key: Optional Groq API key override.
        tavily_api_key: Optional Tavily API key override.
    """
    client = get_client()
    try:
        return await generate_campaign_impl(
            client=client,
            project_id=project_id,
            name=name,
            brand_name=brand_name,
            industry=industry,
            primary_goal=primary_goal,
            target_audience=target_audience,
            brand_voice=brand_voice,
            additional_info=additional_info if additional_info.strip() else None,
            openai_api_key=openai_api_key if openai_api_key.strip() else None,
            gemini_api_key=gemini_api_key if gemini_api_key.strip() else None,
            groq_api_key=groq_api_key if groq_api_key.strip() else None,
            tavily_api_key=tavily_api_key if tavily_api_key.strip() else None
        )
    except Exception as e:
        logger.error(f"Error in generate_campaign tool: {str(e)}")
        raise e

@mcp.tool()
async def run_focus_group(
    campaign_id: str,
    copy_text: str = "",
    negativity_bias: float = 0.3
) -> str:
    """
    Simulate audience reaction to your campaign copy using synthetic customer personas.
    Automatically retrieves the campaign copy and project context if copy_text is not supplied.
    
    Args:
        campaign_id: The UUID of the campaign being tested.
        copy_text: Optional copy text to evaluate. If empty, the system will automatically extract and evaluate the campaign's generated copy.
        negativity_bias: Score weighting bias toward worst score (0.0 to 1.0). Default is 0.3.
    """
    client = get_client()
    try:
        return await run_focus_group_impl(
            client=client,
            campaign_id=campaign_id,
            copy_text=copy_text if copy_text.strip() else None,
            negativity_bias=negativity_bias
        )
    except Exception as e:
        logger.error(f"Error in run_focus_group tool: {str(e)}")
        raise e

@mcp.tool()
async def publish_to_channel(
    campaign_id: str
) -> str:
    """
    Approve and finalize the campaign. Triggers the publisher agent to
    generate the channel distribution plan and publication-ready assets.
    
    Args:
        campaign_id: The UUID of the campaign to publish.
    """
    client = get_client()
    try:
        return await publish_to_channel_impl(
            client=client,
            campaign_id=campaign_id
        )
    except Exception as e:
        logger.error(f"Error in publish_to_channel tool: {str(e)}")
        raise e

def main():
    mcp.run()

if __name__ == "__main__":
    main()
