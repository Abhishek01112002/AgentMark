"""
Pipeline Tracer — Records execution timestamps, latency, prompt sizes, and cache hits per agent node.
"""

import time
import logging
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

logger = logging.getLogger("agentmark.telemetry.tracer")


class TimelineEvent(BaseModel):
    timestamp: float
    elapsed_ms: float
    event_type: str
    message: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentTrace(BaseModel):
    agent_name: str
    start_time: float
    end_time: float = 0.0
    duration_ms: float = 0.0
    prompt_build_ms: float = 0.0
    llm_latency_ms: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0
    static_prefix_tokens: int = 0
    dynamic_tokens: int = 0
    cache_hit: bool = False
    trimmed_fields: List[str] = Field(default_factory=list)
    tavily_latency_ms: float = 0.0
    redis_publish_ms: float = 0.0
    # Enhanced diagnostics
    retry_count: int = 0
    retry_reasons: List[str] = Field(default_factory=list)
    model_name: str = "gpt-4o"
    finish_reason: str = "stop"
    provider_request_id: str = ""
    # OpenTelemetry compatibility
    span_id: str = ""
    parent_span_id: str = ""

    def to_otel_span(self, trace_id: str) -> Dict[str, Any]:
        """Export trace as OpenTelemetry compliant span representation."""
        return {
            "trace_id": trace_id,
            "span_id": self.span_id or f"span_{self.agent_name}",
            "parent_span_id": self.parent_span_id,
            "name": f"agentmark.{self.agent_name}",
            "kind": "INTERNAL",
            "start_time_unix_nano": int(self.start_time * 1e9),
            "end_time_unix_nano": int(self.end_time * 1e9),
            "attributes": {
                "ai.agent.name": self.agent_name,
                "ai.model.name": self.model_name,
                "ai.input_tokens": self.input_tokens,
                "ai.output_tokens": self.output_tokens,
                "ai.cache_hit": self.cache_hit,
                "ai.llm_latency_ms": self.llm_latency_ms,
                "ai.tavily_latency_ms": self.tavily_latency_ms,
                "ai.retry_count": self.retry_count,
            }
        }


class CampaignTrace(BaseModel):
    campaign_id: str
    trace_id: str = ""
    request_id: str = ""
    workspace_id: str = ""
    workflow_version: str = "2.0.0"
    prompt_version: str = "1.0.0"
    telemetry_schema_version: str = "1.0.0"
    start_time: float = Field(default_factory=time.time)
    end_time: float = 0.0
    total_duration_ms: float = 0.0
    agent_traces: Dict[str, AgentTrace] = Field(default_factory=dict)
    event_timeline: List[TimelineEvent] = Field(default_factory=list)
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    estimated_cost_usd: float = 0.0
    cache_hit_rate: float = 0.0
    cached_tokens_saved: int = 0


class PipelineTracer:
    """In-memory collector for active campaign execution traces."""

    _active_traces: Dict[str, CampaignTrace] = {}

    @classmethod
    def start_campaign(cls, campaign_id: str) -> CampaignTrace:
        trace = CampaignTrace(campaign_id=campaign_id, start_time=time.time())
        cls._active_traces[campaign_id] = trace
        return trace

    @classmethod
    def start_agent(cls, campaign_id: str, agent_name: str) -> AgentTrace:
        trace = cls._active_traces.get(campaign_id)
        if not trace:
            trace = cls.start_campaign(campaign_id)

        agent_trace = AgentTrace(agent_name=agent_name, start_time=time.time())
        trace.agent_traces[agent_name] = agent_trace
        return agent_trace

    @classmethod
    def end_agent(
        cls,
        campaign_id: str,
        agent_name: str,
        input_tokens: int = 0,
        output_tokens: int = 0,
        llm_latency_ms: float = 0.0,
        prompt_build_ms: float = 0.0,
        cache_hit: bool = False,
        tavily_latency_ms: float = 0.0,
        redis_publish_ms: float = 0.0,
    ) -> Optional[AgentTrace]:
        trace = cls._active_traces.get(campaign_id)
        if not trace or agent_name not in trace.agent_traces:
            return None

        ag = trace.agent_traces[agent_name]
        ag.end_time = time.time()
        ag.duration_ms = round((ag.end_time - ag.start_time) * 1000, 2)
        ag.input_tokens = input_tokens
        ag.output_tokens = output_tokens
        ag.llm_latency_ms = round(llm_latency_ms, 2)
        ag.prompt_build_ms = round(prompt_build_ms, 2)
        ag.cache_hit = cache_hit
        ag.tavily_latency_ms = round(tavily_latency_ms, 2)
        ag.redis_publish_ms = round(redis_publish_ms, 2)

        return ag

    @classmethod
    def end_campaign(cls, campaign_id: str) -> Optional[CampaignTrace]:
        trace = cls._active_traces.get(campaign_id)
        if not trace:
            return None

        trace.end_time = time.time()
        trace.total_duration_ms = round((trace.end_time - trace.start_time) * 1000, 2)

        total_in = 0
        total_out = 0
        cache_hits = 0
        total_agents = len(trace.agent_traces)

        for ag in trace.agent_traces.values():
            total_in += ag.input_tokens
            total_out += ag.output_tokens
            if ag.cache_hit:
                cache_hits += 1

        trace.total_input_tokens = total_in
        trace.total_output_tokens = total_out
        trace.cache_hit_rate = round((cache_hits / total_agents * 100), 1) if total_agents > 0 else 0.0
        # Estimated cost: ~$0.003 / 1k input tokens, ~$0.015 / 1k output tokens
        trace.estimated_cost_usd = round((total_in * 0.000003) + (total_out * 0.000015), 4)

        return trace
