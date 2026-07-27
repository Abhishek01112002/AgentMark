import sys
import re
import json
from pathlib import Path
import pytest
from unittest.mock import patch
from pydantic import BaseModel
from enum import Enum
import typing
from typing import get_origin, get_args, Type

# Add project root to path so imports work correctly in tests
sys.path.insert(0, str(Path(__file__).parent.parent))

from llm.base import BaseLLMClient
from llm.factory import SmartClient
from llm.gemini_client import GeminiClient
from llm.groq_client import GroqClient
from llm.openai_client import OpenAIClient
from services.search_service import SearchResult, SourceMeta


def extract_context_from_prompt(prompt: str) -> dict:
    """Extract key contextual entities from LLM input prompt to make mock responses accurate."""
    ctx = {
        "brand_name": "AgentMark",
        "campaign_name": "Q3 Launch Campaign",
        "industry": "saas",
        "primary_goal": "lead_gen",
        "target_audience": "enterprise CTOs and tech leads",
        "brand_voice": "professional and authoritative",
        "channels": ["linkedin", "email", "facebook", "google_ads"],
        "deliverables": ["landing page", "webinar banner", "email series", "social ads"],
        "pain_points": ["legacy system migration nightmares", "manual campaign creation", "integration complexity", "lack of ROI tracking"],
        "market_trends": ["quantum computing", "edge ai", "zero-trust architecture", "AI Automation"],
        "recommended_approach": "gated whitepaper webinar lead pipeline generation",
    }
    if not prompt:
        return ctx

    # Match brand name
    brand_m = re.search(r'(?:brand_name|brand|Brand Name|Brand):\s*["\']?([^"\',\n\}]+)', prompt, re.IGNORECASE)
    if brand_m:
        ctx["brand_name"] = brand_m.group(1).strip()

    # Match campaign name
    camp_m = re.search(r'(?:campaign_name|campaign|Campaign Name):\s*["\']?([^"\',\n\}]+)', prompt, re.IGNORECASE)
    if camp_m:
        ctx["campaign_name"] = camp_m.group(1).strip()

    # Match goal
    goal_m = re.search(r'(?:primary_goal|inferred_goal|goal|Goal):\s*["\']?([^"\',\n\}]+)', prompt, re.IGNORECASE)
    if goal_m:
        ctx["primary_goal"] = goal_m.group(1).strip()
        if "sales" in ctx["primary_goal"]:
            ctx["deliverables"] = ["product page", "discount email", "retargeting ad"]
        elif "awareness" in ctx["primary_goal"]:
            ctx["deliverables"] = ["infographic", "social video", "press release"]

    # Match industry
    ind_m = re.search(r'(?:industry|Industry):\s*["\']?([^"\',\n\}]+)', prompt, re.IGNORECASE)
    if ind_m:
        ctx["industry"] = ind_m.group(1).strip()
        if "ecom" in ctx["industry"].lower() or "retail" in ctx["industry"].lower():
            ctx["channels"] = ["instagram", "tiktok", "facebook", "google_ads"]
        elif "saas" in ctx["industry"].lower() or "tech" in ctx["industry"].lower():
            ctx["channels"] = ["linkedin", "email", "tech blogs", "product hunt"]

    # Match target audience
    aud_m = re.search(r'(?:target_audience|audience|Audience):\s*["\']?([^"\',\n\}]+)', prompt, re.IGNORECASE)
    if aud_m:
        ctx["target_audience"] = aud_m.group(1).strip()

    # Match channels list
    chan_m = re.search(r'channels:\s*(\[[^\]]+\])', prompt, re.IGNORECASE)
    if chan_m:
        try:
            parsed = json.loads(chan_m.group(1).replace("'", '"'))
            if isinstance(parsed, list) and parsed:
                ctx["channels"] = parsed
        except Exception:
            pass

    # Match deliverables list
    deliv_m = re.search(r'deliverables:\s*(\[[^\]]+\])', prompt, re.IGNORECASE)
    if deliv_m:
        try:
            parsed = json.loads(deliv_m.group(1).replace("'", '"'))
            if isinstance(parsed, list) and parsed:
                ctx["deliverables"] = parsed
        except Exception:
            pass

    # Match pain points from prompt text if mentioned
    if "legacy" in prompt.lower() or "migration" in prompt.lower():
        ctx["pain_points"].extend(["legacy", "system", "migration", "nightmares"])

    # Pass through key phrases if present in prompt
    if "quantum" in prompt.lower():
        ctx["market_trends"].append("quantum computing")
    if "edge ai" in prompt.lower():
        ctx["market_trends"].append("edge ai")
    if "zero-trust" in prompt.lower():
        ctx["market_trends"].append("zero-trust")

    return ctx


def mock_field_value(field_name: str, field_type, ctx: dict, overrides: dict = None):
    """Recursively generates a mock value based on field name, type annotations, and prompt context."""
    if overrides is None:
        overrides = {}

    if field_type is None:
        return None

    origin = get_origin(field_type)
    args = get_args(field_type)

    # Handle Optional / Union types
    if origin is typing.Union or origin is getattr(typing, "Optional", None):
        non_none_types = [t for t in args if t is not type(None)]
        if non_none_types:
            return mock_field_value(field_name, non_none_types[0], ctx, overrides)
        return None

    # Handle Literal types
    if origin is typing.Literal:
        return args[0] if args else None

    # Handle Lists
    if origin is list or origin is typing.List:
        item_type = args[0] if args else str
        
        # Timeline phases
        if "timeline" in field_name or "phase" in field_name:
            if isinstance(item_type, type) and issubclass(item_type, BaseModel):
                return [
                    generate_mock_pydantic(item_type, ctx, phase_name="Phase 1: Research & Strategy", duration="1 week"),
                    generate_mock_pydantic(item_type, ctx, phase_name="Phase 2: Content Creation", duration="2 weeks"),
                    generate_mock_pydantic(item_type, ctx, phase_name="Phase 3: Campaign Launch", duration="1 week"),
                    generate_mock_pydantic(item_type, ctx, phase_name="Phase 4: Optimization", duration="2 weeks"),
                ]

        # Channel lists (e.g. publishing_plan, channels)
        if field_name == "channels":
            return ctx["channels"]
        if "channel" in field_name or "plan" in field_name:
            if isinstance(item_type, type) and issubclass(item_type, BaseModel):
                return [generate_mock_pydantic(item_type, ctx, channel=ch) for ch in ctx["channels"]]
            return ctx["channels"]

        # Deliverables lists (e.g. image_prompts, assets)
        if field_name == "deliverables":
            return ctx["deliverables"]
        if "deliverable" in field_name or "prompt" in field_name or "asset" in field_name:
            if isinstance(item_type, type) and issubclass(item_type, BaseModel):
                return [generate_mock_pydantic(item_type, ctx, deliverable=d) for d in ctx["deliverables"]]
            return ctx["deliverables"]

        # Pain points / market trends / competitors / pillars
        if "pain_point" in field_name:
            return ctx["pain_points"]
        if "competitor" in field_name:
            return ["Competitor Alpha", "Competitor Beta", "Competitor Gamma"]
        if "pillar" in field_name or "trend" in field_name or "opportunity" in field_name:
            return ctx["market_trends"]

        if item_type is dict:
            return [{
                "title": "Mock Source Title",
                "url": "https://example.com",
                "snippet": "Mock search snippet content",
                "domain": "example.com"
            }]

        # Default multi-item list if item_type is BaseModel
        if isinstance(item_type, type) and issubclass(item_type, BaseModel):
            return [generate_mock_pydantic(item_type, ctx), generate_mock_pydantic(item_type, ctx)]

        return [mock_field_value(field_name, item_type, ctx, overrides)]

    # Handle Dicts
    if field_type is dict or origin is dict or origin is getattr(typing, "Dict", None):
        if field_name == "copy_readiness":
            res = {"messaging_framework_complete": True, "all_channels_ready": True}
            for ch in ctx["channels"]:
                res[ch] = True
            return res

        if not args:
            return {
                "title": "Mock Source Title",
                "url": "https://example.com",
                "snippet": "Mock search snippet content",
                "domain": "example.com"
            }
        key_type = args[0] if args else str
        val_type = args[1] if len(args) > 1 else str
        
        if isinstance(key_type, type) and issubclass(key_type, Enum):
            return {e.value: mock_field_value(field_name, val_type, ctx, overrides) for e in key_type}
        
        return {ch: mock_field_value(field_name, val_type, ctx, overrides) for ch in ctx["channels"]}

    # Handle Enums
    if isinstance(field_type, type) and issubclass(field_type, Enum):
        return list(field_type)[0].value

    # Handle Nested Pydantic Models
    if isinstance(field_type, type) and issubclass(field_type, BaseModel):
        return generate_mock_pydantic(field_type, ctx)

    # Primitive types fallback with contextual field matching
    if field_type is str:
        b_name = ctx.get("brand_name", "AgentMark")
        c_name = ctx.get("campaign_name", "Q3 Launch")
        p_goal = ctx.get("primary_goal", "lead_gen")
        ind = ctx.get("industry", "saas")
        t_aud = ctx.get("target_audience", "enterprise CTOs")

        if field_name == "priority":
            return "HIGH"
        if field_name == "channel":
            return overrides.get("channel", "linkedin")
        if field_name == "deliverable":
            return overrides.get("deliverable", "linkedin social post")
        if field_name == "aspect_ratio":
            deliv = str(overrides.get("deliverable", "")).lower()
            if "email" in deliv or "banner" in deliv:
                return "16:9"
            if "story" in deliv or "reel" in deliv:
                return "9:16"
            return "1:1"

        if field_name == "prompt" or field_name == "image_prompt":
            deliv = overrides.get("deliverable", "social asset")
            return (
                f"Professional high resolution studio photography of an enterprise tech workstation for {b_name} {c_name} "
                f"deliverable {deliv}. Shot with an 85mm prime lens at f/1.8 aperture for soft bokeh background depth of field. "
                f"Modern cinematic lighting with vibrant indigo and electric blue ambient accents. Clean minimalist composition, "
                f"no text, no watermark, perfectly balanced exposure and photorealistic detail."
            )

        if "brand_name" in field_name or field_name == "brand":
            return b_name
        if "campaign_name" in field_name or field_name == "campaign":
            return c_name
        if "goal" in field_name:
            return p_goal
        if "industry" in field_name:
            return ind
        if "target_audience" in field_name or field_name == "audience":
            return t_aud
        if "summary" in field_name or "executive" in field_name or "overview" in field_name:
            return (
                f"Executive summary for {b_name}'s campaign '{c_name}' in {ind}. "
                f"Goal is {p_goal} targeting {t_aud} with high ROI and seamless integration."
            )
        if "status" in field_name:
            return "approved"
        if "decision" in field_name:
            return "APPROVED_FOR_PUBLISHING"
        if "cta" in field_name or "call_to_action" in field_name:
            if "sales" in p_goal:
                return f"Buy {b_name} now and transform your workflow today!"
            if "retention" in p_goal:
                return f"Discover new features in {b_name} for your team!"
            if "awareness" in p_goal:
                return f"Learn more about {b_name}'s next-gen solution."
            return f"Schedule a demo with {b_name} today to capture leads!"

        if "key_message" in field_name or "message" in field_name:
            return f"Cost reduction, simplified setup, and time saving automation for {b_name} {t_aud}"

        if "recommended_approach" in field_name or "strategic_approach" in field_name or "approach" in field_name:
            return ctx["recommended_approach"]

        if "differentiation" in field_name or "positioning" in field_name:
            return f"Differentiate {b_name} via AI speed, automation, and enterprise security for {t_aud}."

        # Default contextual fallback
        return f"{b_name} {c_name} {p_goal} {ind} {t_aud} pain points metrics integration complexity"

    if field_type is int:
        if "score" in field_name or "quality" in field_name:
            return 90
        return 85

    if field_type is float:
        return 8.5

    if field_type is bool:
        if field_name == "approved" or "met" in field_name or "complete" in field_name or field_name == "can_publish":
            return True
        return True

    return None


def generate_mock_pydantic(model: Type[BaseModel], ctx: dict = None, **overrides) -> BaseModel:
    """Dynamically instantiates a Pydantic model with context-aware mock field values."""
    if ctx is None:
        ctx = extract_context_from_prompt("")

    data = {}
    for name, field in model.model_fields.items():
        if name in overrides:
            data[name] = overrides[name]
        else:
            data[name] = mock_field_value(name, field.annotation, ctx, overrides)

    # Ensure required fields on specific models have context overrides
    if "brand_name" in model.model_fields and "brand_name" not in overrides:
        data["brand_name"] = ctx.get("brand_name", "AgentMark")
    if "campaign_name" in model.model_fields and "campaign_name" not in overrides:
        data["campaign_name"] = ctx.get("campaign_name", "Q3 Launch")
    if "issues" in model.model_fields and "issues" not in overrides:
        data["issues"] = []
    if "approved" in model.model_fields and "approved" not in overrides:
        data["approved"] = True
    if "score" in model.model_fields and "score" not in overrides:
        data["score"] = 90

    return model(**data)


@pytest.fixture(autouse=True)
def mock_llm_calls(request):
    """
    Autouse fixture that intercepts all LLM client calls.
    Ensures zero actual API requests are made during test execution,
    except for rate_limit_resilience tests which test the real LLM wrapper logic.
    """
    node_id = str(request.node.nodeid).lower()
    if "rate_limit" in node_id or "resilience" in node_id:
        yield
        return

    def mock_generate(self, *args, **kwargs) -> str:
        prompt = kwargs.get("prompt") or (args[0] if len(args) > 0 else "")
        ctx = extract_context_from_prompt(str(prompt))
        return (
            f"Mock raw LLM response for {ctx['brand_name']} {ctx['campaign_name']} "
            f"goal={ctx['primary_goal']} industry={ctx['industry']}."
        )

    def mock_generate_structured(self, *args, **kwargs):
        prompt = kwargs.get("prompt")
        response_model = kwargs.get("response_model")

        for arg in args:
            if isinstance(arg, type) and issubclass(arg, BaseModel):
                response_model = arg
            elif isinstance(arg, str) and not prompt:
                prompt = arg

        if response_model is not None and isinstance(response_model, type) and issubclass(response_model, BaseModel):
            ctx = extract_context_from_prompt(str(prompt or ""))
            return generate_mock_pydantic(response_model, ctx)

        return None

    def mock_search_web(query: str, redis_client=None, max_results: int = 5, api_key: str = None):
        return SearchResult(
            query=query,
            snippets=[
                f"Mock market search snippet 1 for {query}",
                f"Mock market search snippet 2 for {query}"
            ],
            sources=[
                SourceMeta(
                    url="https://example.com/search1",
                    title="Mock Search Title 1",
                    snippet="Mock search snippet details 1",
                    domain="example.com"
                )
            ],
            total_results=2,
            search_type="tavily",
            success=True,
            error_message=""
        )

    with patch.object(BaseLLMClient, "generate", mock_generate), \
         patch.object(BaseLLMClient, "generate_structured", mock_generate_structured), \
         patch.object(SmartClient, "generate", mock_generate), \
         patch.object(SmartClient, "generate_structured", mock_generate_structured), \
         patch.object(GeminiClient, "generate", mock_generate), \
         patch.object(GeminiClient, "generate_structured", mock_generate_structured), \
         patch.object(GroqClient, "generate", mock_generate), \
         patch.object(GroqClient, "generate_structured", mock_generate_structured), \
         patch.object(OpenAIClient, "generate", mock_generate), \
         patch.object(OpenAIClient, "generate_structured", mock_generate_structured), \
         patch("utils.llm_cache.get", return_value=None), \
         patch("agents.research.cache_get", return_value=None), \
         patch("agents.strategy.cache_get", return_value=None), \
         patch("agents.manager.cache_get", return_value=None), \
         patch("agents.copywriter.cache_get", return_value=None), \
         patch("agents.image_prompt.cache_get", return_value=None), \
         patch("agents.publisher.cache_get", return_value=None), \
         patch("agents.reviewer.cache_get", return_value=None), \
         patch("agents.research.search_web", side_effect=mock_search_web):
        yield
