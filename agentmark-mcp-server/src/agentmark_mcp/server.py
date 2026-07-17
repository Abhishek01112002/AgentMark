import logging
import sys
import uuid
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

def validate_uuid(id_str: str, param_name: str) -> None:
    """Validates if the provided string is a valid UUIDv4."""
    if not id_str or not id_str.strip():
        raise ValueError(f"Parameter '{param_name}' cannot be empty.")
    try:
        uuid.UUID(id_str.strip())
    except ValueError:
        raise ValueError(
            f"Parameter '{param_name}' must be a valid UUID string "
            f"(e.g., '123e4567-e89b-12d3-a456-426614174000'). Received: '{id_str}'"
        )

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
        primary_goal: Goal of the campaign. Must be one of: 'awareness', 'lead_gen', 'sales', 'retention'.
        target_audience: Description of the target audience.
        brand_voice: Tone and brand voice directives.
        additional_info: Any additional context or constraints for the campaign.
        openai_api_key: Optional OpenAI API key override.
        gemini_api_key: Optional Gemini API key override.
        groq_api_key: Optional Groq API key override.
        tavily_api_key: Optional Tavily API key override.
    """
    # FAANG level: Enforce strict input validation before initiating network requests
    validate_uuid(project_id, "project_id")
    
    goal_cleaned = primary_goal.strip().lower()
    allowed_goals = {"awareness", "lead_gen", "sales", "retention"}
    if goal_cleaned not in allowed_goals:
        raise ValueError(
            f"Invalid primary_goal '{primary_goal}'. Must be one of: {sorted(list(allowed_goals))}"
        )

    client = get_client()
    try:
        return await generate_campaign_impl(
            client=client,
            project_id=project_id.strip(),
            name=name.strip(),
            brand_name=brand_name.strip(),
            industry=industry.strip(),
            primary_goal=goal_cleaned,
            target_audience=target_audience.strip(),
            brand_voice=brand_voice.strip(),
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
    # FAANG level: Enforce strict input validation
    validate_uuid(campaign_id, "campaign_id")
    
    if not (0.0 <= negativity_bias <= 1.0):
        raise ValueError(f"negativity_bias must be between 0.0 and 1.0. Received: {negativity_bias}")

    client = get_client()
    try:
        return await run_focus_group_impl(
            client=client,
            campaign_id=campaign_id.strip(),
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
    # FAANG level: Enforce strict input validation
    validate_uuid(campaign_id, "campaign_id")

    client = get_client()
    try:
        return await publish_to_channel_impl(
            client=client,
            campaign_id=campaign_id.strip()
        )
    except Exception as e:
        logger.error(f"Error in publish_to_channel tool: {str(e)}")
        raise e

def main():
    mcp.run()

if __name__ == "__main__":
    main()
