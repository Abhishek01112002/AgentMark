"""
LiteLLM Gateway Client — AgentMark AI Service

Provides an OpenAI-compatible client adapter to route requests through a dedicated LiteLLM Proxy.
Includes cached readiness verification, Pydantic structured output validation,
and safe, non-destructive fallback to the existing direct-provider path (SmartClient).
"""

import json
import logging
import threading
import time
import urllib.request
import urllib.error
from typing import Type, TypeVar, Optional

from openai import OpenAI
from pydantic import BaseModel

from .base import (
    BaseLLMClient,
    NonRetryableLLMError,
    RateLimitedLLMError,
    is_payload_too_large_error,
    is_rate_limit_error,
)
from .json_gateway import parse_and_validate, instantiate_fallback_instance

logger = logging.getLogger("agentmark.llm.gateway")
T = TypeVar("T", bound=BaseModel)


class GatewayUnavailableError(RuntimeError):
    """Raised when the LiteLLM Gateway is enabled and unavailable, and fallback is disabled."""
    pass


# ── Thread-Safe Readiness Cache ──────────────────────────────────────────────
_readiness_lock = threading.Lock()
_cached_readiness_status: Optional[bool] = None
_last_readiness_check_time: float = 0.0
READINESS_CACHE_TTL_SECONDS: float = 30.0


def check_gateway_readiness(gateway_url: str, timeout: float = 2.0) -> bool:
    """
    Performs a single HTTP probe to verify the LiteLLM gateway is reachable.
    Checks /health/readiness (LiteLLM standard) with fallback to /health.
    """
    cleaned_url = gateway_url.rstrip("/")
    probe_urls = [f"{cleaned_url}/health/readiness", f"{cleaned_url}/health"]

    for url in probe_urls:
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "AgentMark-GatewayHealthCheck/1.0"},
                method="GET",
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                if resp.status in (200, 204):
                    return True
        except urllib.error.HTTPError as http_err:
            if http_err.code in (200, 204):
                return True
            # If /health/readiness returns 404, try /health
            continue
        except Exception:
            continue

    return False


def get_cached_gateway_readiness(
    gateway_url: str,
    ttl_seconds: float = READINESS_CACHE_TTL_SECONDS,
    force_refresh: bool = False,
) -> bool:
    """
    Thread-safe cached gateway readiness check to avoid per-request latency penalties.
    Refreshes at most once every `ttl_seconds`.
    """
    global _cached_readiness_status, _last_readiness_check_time

    now = time.monotonic()
    if not force_refresh and _cached_readiness_status is not None:
        if (now - _last_readiness_check_time) < ttl_seconds:
            return _cached_readiness_status

    with _readiness_lock:
        # Re-check inside lock
        now = time.monotonic()
        if not force_refresh and _cached_readiness_status is not None:
            if (now - _last_readiness_check_time) < ttl_seconds:
                return _cached_readiness_status

        is_healthy = check_gateway_readiness(gateway_url, timeout=2.0)
        _cached_readiness_status = is_healthy
        _last_readiness_check_time = now

        if not is_healthy:
            logger.warning(
                "LiteLLM Gateway readiness probe failed at %s (cached for %ds)",
                gateway_url,
                int(ttl_seconds),
            )
        else:
            logger.info("LiteLLM Gateway readiness probe verified at %s", gateway_url)

        return _cached_readiness_status


def reset_readiness_cache():
    """Reset cached readiness status (useful for testing)."""
    global _cached_readiness_status, _last_readiness_check_time
    with _readiness_lock:
        _cached_readiness_status = None
        _last_readiness_check_time = 0.0


# ── Gateway Client Implementation ─────────────────────────────────────────────

class GatewayClient(BaseLLMClient):
    """
    OpenAI-compatible client adapter for LiteLLM Proxy.
    Preserves all existing safeguards (rate limits, circuit breakers, structured JSON repair).
    Supports safe automatic fallback to direct SmartClient on failure.
    """

    def __init__(
        self,
        gateway_url: str,
        api_key: Optional[str] = None,
        model: str = "gpt-4o-mini",
        timeout: float = 15.0,
        fallback_client: Optional[BaseLLMClient] = None,
        fallback_on_failure: bool = True,
    ):
        super().__init__()
        self.gateway_url = gateway_url.rstrip("/")
        self.api_key = api_key or "sk-dummy-gateway-key"
        self.model = model
        self.timeout = timeout
        self.fallback_client = fallback_client
        self.fallback_on_failure = fallback_on_failure

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=f"{self.gateway_url}/v1",
            timeout=self.timeout,
            max_retries=0,
        )

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: Optional[int] = None,
    ) -> str:
        """Execute text generation through the gateway with safe direct fallback."""
        try:
            return self._call_gateway_generate(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                seed=seed,
            )
        except Exception as exc:
            if self.fallback_on_failure and self.fallback_client is not None:
                logger.warning(
                    "LiteLLM Gateway call failed (%s) — falling back safely to direct provider path",
                    exc,
                )
                return self.fallback_client.generate(
                    prompt,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    seed=seed,
                )
            self._raise_typed_error(exc)

    def generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: Optional[int] = None,
    ) -> T:
        """Execute structured JSON generation through the gateway with safe direct fallback."""
        try:
            return self._call_gateway_generate_structured(
                prompt=prompt,
                response_model=response_model,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                seed=seed,
            )
        except Exception as exc:
            if self.fallback_on_failure and self.fallback_client is not None:
                logger.warning(
                    "LiteLLM Gateway structured call failed (%s) — falling back safely to direct provider path",
                    exc,
                )
                return self.fallback_client.generate_structured(
                    prompt,
                    response_model,
                    system_prompt=system_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    seed=seed,
                )
            self._raise_typed_error(exc)

    # ── Private Gateway Call Helpers ──────────────────────────────────────────

    def _call_gateway_generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: Optional[int] = None,
    ) -> str:
        self._wait_for_rate_limit()

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        token_param = "max_completion_tokens" if self.model.startswith(("o1", "o3")) else "max_tokens"
        kwargs = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            token_param: max_tokens,
        }
        if seed is not None:
            kwargs["seed"] = seed

        response = self.client.chat.completions.create(**kwargs)
        self._record_success()

        choices = getattr(response, "choices", None)
        if choices and len(choices) > 0:
            return choices[0].message.content or ""
        return ""

    def _call_gateway_generate_structured(
        self,
        prompt: str,
        response_model: Type[T],
        system_prompt: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 8192,
        seed: Optional[int] = None,
    ) -> T:
        self._wait_for_rate_limit()

        schema_hint = ""
        try:
            schema = response_model.model_json_schema()
            schema_hint = (
                "\n\nRespond ONLY with a valid JSON object matching this schema:\n"
                + json.dumps(schema, separators=(",", ":"))
            )
        except Exception:
            schema_hint = "\n\nRespond ONLY with a valid JSON object matching the requested structure."

        augmented_prompt = prompt + schema_hint
        full_text_check = (system_prompt or "") + " " + augmented_prompt
        if "json" not in full_text_check.lower():
            augmented_prompt += "\n\nRespond in valid JSON format."

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": augmented_prompt})

        token_param = "max_completion_tokens" if self.model.startswith(("o1", "o3")) else "max_tokens"
        kwargs = {
            "model": self.model,
            "messages": messages,
            "response_format": {"type": "json_object"},
            "temperature": temperature,
            token_param: max_tokens,
        }
        if seed is not None:
            kwargs["seed"] = seed

        try:
            response = self.client.chat.completions.create(**kwargs)
        except Exception as e:
            err_str = str(e).lower()
            if "response_format" in err_str or "unsupported" in err_str or "400" in err_str:
                kwargs.pop("response_format", None)
                response = self.client.chat.completions.create(**kwargs)
            else:
                raise e

        self._record_success()

        raw_json = "{}"
        choices = getattr(response, "choices", None)
        if choices and len(choices) > 0:
            raw_json = choices[0].message.content or "{}"

        model_inst, err_msg, _ = parse_and_validate(raw_json, response_model, agent_name="GatewayClient")
        if model_inst:
            return model_inst

        logger.warning("Gateway JSON validation failed (%s), returning safe fallback instance", err_msg)
        return instantiate_fallback_instance(response_model)

    def _raise_typed_error(self, exc: Exception):
        if isinstance(exc, (NonRetryableLLMError, RateLimitedLLMError, GatewayUnavailableError)):
            raise exc
        if is_payload_too_large_error(exc):
            raise NonRetryableLLMError(
                f"Gateway request is too large for model {self.model}"
            ) from exc
        if is_rate_limit_error(exc):
            raise RateLimitedLLMError(f"Gateway rate limited for model {self.model}") from exc
        raise exc
