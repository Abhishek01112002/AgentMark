"""
Tests for LiteLLM Gateway Integration — AgentMark AI Service

Covers:
- Default-OFF safety guarantees
- Configuration and boolean parsing
- Secret scanning (no hardcoded credentials)
- Gateway readiness caching (zero per-call network penalty)
- Client selection in factory.py (flag OFF => SmartClient; flag ON => GatewayClient)
- Non-destructive failure fallback to direct SmartClient
- Structured output validation and Pydantic parsing
"""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest
import yaml
from pydantic import BaseModel

# Ensure ai-service root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import (
    LLM_GATEWAY_ENABLED,
    LLM_GATEWAY_URL,
    LLM_GATEWAY_API_KEY,
    LLM_GATEWAY_MODEL,
    LLM_GATEWAY_TIMEOUT,
    LLM_GATEWAY_FALLBACK_ON_FAILURE,
    _parse_bool_env,
)
from llm.factory import (
    get_llm_client,
    SmartClient,
    set_llm_config,
)
from llm.gateway_client import (
    GatewayClient,
    GatewayUnavailableError,
    check_gateway_readiness,
    get_cached_gateway_readiness,
    reset_readiness_cache,
)


class SampleModel(BaseModel):
    summary: str
    confidence: float


# ── 1. Configuration & Security Safety ────────────────────────────────────────

class TestGatewayConfigurationAndSecurity:

    def test_gateway_disabled_by_default(self):
        """Production safety: LLM_GATEWAY_ENABLED must evaluate to False by default."""
        assert LLM_GATEWAY_ENABLED is False

    def test_parse_bool_env_permutations(self):
        """All variations of disabled states must resolve to False."""
        assert _parse_bool_env(None, default=False) is False
        assert _parse_bool_env("", default=False) is False
        assert _parse_bool_env("0") is False
        assert _parse_bool_env("false") is False
        assert _parse_bool_env("False") is False
        assert _parse_bool_env("no") is False
        assert _parse_bool_env("off") is False

        # Only explicit truthy strings resolve to True
        assert _parse_bool_env("1") is True
        assert _parse_bool_env("true") is True
        assert _parse_bool_env("True") is True
        assert _parse_bool_env("yes") is True
        assert _parse_bool_env("on") is True

    def test_no_hardcoded_secrets_in_litellm_config(self):
        """Ensure litellm/config.yaml contains zero hardcoded API keys or credentials."""
        config_path = Path(__file__).parent.parent.parent / "litellm" / "config.yaml"
        assert config_path.exists(), f"Configuration file not found at {config_path}"

        content = config_path.read_text(encoding="utf-8")
        parsed = yaml.safe_load(content)

        # Check model list credentials
        for model_entry in parsed.get("model_list", []):
            litellm_params = model_entry.get("litellm_params", {})
            api_key_ref = litellm_params.get("api_key", "")
            assert api_key_ref.startswith("os.environ/"), (
                f"Model {model_entry.get('model_name')} has non-environment API key: {api_key_ref}"
            )

        # Check general settings master key
        general_settings = parsed.get("general_settings", {})
        master_key_ref = general_settings.get("master_key", "")
        assert master_key_ref.startswith("os.environ/"), (
            f"Master key is not an environment reference: {master_key_ref}"
        )

    def test_docker_compose_config_safeguards(self):
        """Ensure docker-compose files have safe default-OFF environment variables."""
        dev_compose = (Path(__file__).parent.parent.parent / "docker-compose.yml").read_text(encoding="utf-8")
        prod_compose = (Path(__file__).parent.parent.parent / "docker-compose.prod.yml").read_text(encoding="utf-8")

        assert "LLM_GATEWAY_ENABLED: ${LLM_GATEWAY_ENABLED:-false}" in dev_compose
        assert "LLM_GATEWAY_ENABLED: ${LLM_GATEWAY_ENABLED:-false}" in prod_compose

        # Production compose must NOT expose public port for litellm
        prod_parsed = yaml.safe_load(prod_compose)
        litellm_prod = prod_parsed.get("services", {}).get("litellm", {})
        assert "ports" not in litellm_prod, "Production litellm service must not expose public ports"


# ── 2. Gateway Readiness & Caching ────────────────────────────────────────────

class TestGatewayReadiness:

    def setup_method(self):
        reset_readiness_cache()

    def teardown_method(self):
        reset_readiness_cache()

    @patch("urllib.request.urlopen")
    def test_readiness_probe_healthy(self, mock_urlopen):
        mock_resp = MagicMock()
        mock_resp.status = 200
        mock_resp.__enter__.return_value = mock_resp
        mock_urlopen.return_value = mock_resp

        assert check_gateway_readiness("http://localhost:4000") is True

    @patch("urllib.request.urlopen")
    def test_readiness_probe_unhealthy(self, mock_urlopen):
        import urllib.error
        mock_urlopen.side_effect = urllib.error.URLError("Connection refused")

        assert check_gateway_readiness("http://localhost:4000") is False

    @patch("llm.gateway_client.check_gateway_readiness")
    def test_readiness_caching_avoids_per_request_penalty(self, mock_check):
        mock_check.return_value = True

        # First call hits the probe
        assert get_cached_gateway_readiness("http://localhost:4000", ttl_seconds=30.0) is True
        assert mock_check.call_count == 1

        # Subsequent calls within TTL hit memory cache directly (zero network call)
        for _ in range(5):
            assert get_cached_gateway_readiness("http://localhost:4000", ttl_seconds=30.0) is True

        assert mock_check.call_count == 1


# ── 3. Factory Routing (SmartClient vs GatewayClient) ─────────────────────────

class TestFactoryGatewayRouting:

    def setup_method(self):
        set_llm_config(None)
        reset_readiness_cache()

    def teardown_method(self):
        set_llm_config(None)
        reset_readiness_cache()

    def test_gateway_disabled_returns_smart_client(self):
        """When LLM_GATEWAY_ENABLED is false (default), get_llm_client() returns SmartClient."""
        with patch("llm.factory.get_cached_gateway_readiness") as mock_probe:
            client = get_llm_client()
            assert isinstance(client, SmartClient)
            # Must not probe gateway when flag is OFF
            mock_probe.assert_not_called()

    def test_gateway_enabled_and_ready_returns_gateway_client(self):
        """When gateway is enabled and healthy, GatewayClient is returned."""
        set_llm_config({"llm_gateway_enabled": "true", "llm_gateway_url": "http://localhost:4000"})

        with patch("llm.factory.get_cached_gateway_readiness", return_value=True):
            client = get_llm_client()
            assert isinstance(client, GatewayClient)
            assert client.gateway_url == "http://localhost:4000"
            assert isinstance(client.fallback_client, SmartClient)

    def test_gateway_enabled_but_unreachable_falls_back_to_smart_client(self):
        """When gateway is enabled but fails readiness check, it falls back to SmartClient safely."""
        set_llm_config({
            "llm_gateway_enabled": "true",
            "llm_gateway_url": "http://unreachable-gateway:4000",
            "llm_gateway_fallback_on_failure": "true",
        })

        with patch("llm.factory.get_cached_gateway_readiness", return_value=False):
            client = get_llm_client()
            assert isinstance(client, SmartClient)

    def test_gateway_enabled_unreachable_raises_when_fallback_disabled(self):
        """When gateway is unreachable and fallback is explicitly disabled, raise GatewayUnavailableError."""
        set_llm_config({
            "llm_gateway_enabled": "true",
            "llm_gateway_url": "http://unreachable-gateway:4000",
            "llm_gateway_fallback_on_failure": "false",
        })

        with patch("llm.factory.get_cached_gateway_readiness", return_value=False):
            with pytest.raises(GatewayUnavailableError):
                get_llm_client()

    def test_explicit_provider_unaffected_by_gateway_flag(self):
        """Explicit provider calls (e.g. 'openai') bypass gateway and return provider client."""
        set_llm_config({"llm_gateway_enabled": "true", "openai_api_key": "test-key"})

        client = get_llm_client(provider="openai")
        from llm.openai_client import OpenAIClient
        assert isinstance(client, OpenAIClient)


# ── 4. Gateway Client Execution & Fallback ────────────────────────────────────

class TestGatewayClientExecutionAndFallback:

    def test_gateway_client_generate_success(self):
        fallback_mock = MagicMock(spec=SmartClient)
        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=True,
        )

        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Marketing Campaign Copy"
        mock_response.choices = [mock_choice]

        with patch.object(client.client.chat.completions, "create", return_value=mock_response):
            result = client.generate("Write a campaign headline")
            assert result == "Marketing Campaign Copy"
            fallback_mock.generate.assert_not_called()

    def test_gateway_client_generate_fallback_on_request_error(self):
        fallback_mock = MagicMock(spec=SmartClient)
        fallback_mock.generate.return_value = "Fallback Headline via Direct SmartClient"

        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=True,
        )

        with patch.object(client.client.chat.completions, "create", side_effect=Exception("Gateway 502 Bad Gateway")):
            result = client.generate("Write a campaign headline")
            assert result == "Fallback Headline via Direct SmartClient"
            fallback_mock.generate.assert_called_once()

    def test_gateway_client_generate_raises_when_fallback_disabled(self):
        fallback_mock = MagicMock(spec=SmartClient)
        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=False,
        )

        with patch.object(client.client.chat.completions, "create", side_effect=Exception("Connection refused")):
            with pytest.raises(Exception, match="Connection refused"):
                client.generate("Write a campaign headline")
            fallback_mock.generate.assert_not_called()

    def test_gateway_client_structured_output_success(self):
        fallback_mock = MagicMock(spec=SmartClient)
        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=True,
        )

        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '{"summary": "Test Summary", "confidence": 0.95}'
        mock_response.choices = [mock_choice]

        with patch.object(client.client.chat.completions, "create", return_value=mock_response):
            result = client.generate_structured("Analyze copy", SampleModel)
            assert isinstance(result, SampleModel)
            assert result.summary == "Test Summary"
            assert result.confidence == 0.95
            fallback_mock.generate_structured.assert_not_called()

    def test_gateway_client_structured_output_fallback_on_failure(self):
        fallback_mock = MagicMock(spec=SmartClient)
        fallback_mock.generate_structured.return_value = SampleModel(summary="Direct Fallback", confidence=0.88)

        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=True,
        )

        with patch.object(client.client.chat.completions, "create", side_effect=Exception("Timeout")):
            result = client.generate_structured("Analyze copy", SampleModel)
            assert isinstance(result, SampleModel)
            assert result.summary == "Direct Fallback"
            fallback_mock.generate_structured.assert_called_once()

    def test_gateway_client_timeout_triggers_fallback(self):
        fallback_mock = MagicMock(spec=SmartClient)
        fallback_mock.generate.return_value = "Recovered from timeout"

        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=True,
        )

        with patch.object(client.client.chat.completions, "create", side_effect=TimeoutError("Request timed out after 15s")):
            result = client.generate("Prompt")
            assert result == "Recovered from timeout"
            fallback_mock.generate.assert_called_once()

    def test_gateway_client_timeout_raises_when_fallback_disabled(self):
        fallback_mock = MagicMock(spec=SmartClient)
        client = GatewayClient(
            gateway_url="http://localhost:4000",
            api_key="test-key",
            fallback_client=fallback_mock,
            fallback_on_failure=False,
        )

        with patch.object(client.client.chat.completions, "create", side_effect=TimeoutError("Request timed out after 15s")):
            with pytest.raises(TimeoutError, match="Request timed out"):
                client.generate("Prompt")
            fallback_mock.generate.assert_not_called()
