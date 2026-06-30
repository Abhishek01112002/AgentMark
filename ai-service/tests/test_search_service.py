import services.search_service as search_service
from services.search_service import SearchResult, search_web
import pytest


class FakeTavilyClient:
    """Fake Tavily client that can simulate various behaviors."""

    def __init__(self, response=None, error=None, raise_type_error_once=False):
        self.response = response or {"results": []}
        self.error = error
        self.raise_type_error_once = raise_type_error_once
        self.calls = []

    def search(self, **kwargs):
        self.calls.append(kwargs)
        if self.raise_type_error_once and len(self.calls) == 1:
            raise TypeError("unexpected keyword argument 'timeout'")
        if self.error:
            raise self.error
        return self.response


def test_search_returns_sources_and_snippets(monkeypatch):
    """Search returns parsed snippets and source metadata on success."""
    fake_client = FakeTavilyClient(
        response={
            "results": [
                {
                    "url": "https://example.com/report",
                    "title": "Market Report",
                    "content": "Useful market context.",
                }
            ]
        }
    )
    # Mock _get_clients to return a single valid client
    monkeypatch.setattr(
        search_service, "_get_clients",
        lambda api_key=None: [("tavily-0", fake_client)]
    )

    result = search_web("market trends", redis_client=False, api_key="tvly-test")

    assert isinstance(result, SearchResult)
    assert result.success is True
    assert result.snippets == ["Useful market context."]
    assert result.sources[0].domain == "example.com"
    assert result.sources[0].title == "Market Report"


def test_search_returns_clear_error_when_key_missing(monkeypatch):
    """When no key is available, returns a clear error message."""
    monkeypatch.delenv("TAVILY_API_KEY", raising=False)
    # Clear both the cached client list and the key hash so rebuild happens
    search_service._tavily_clients.clear()
    search_service._tavily_keys_hash = ""

    result = search_web("market trends", redis_client=False, api_key=None)

    assert result.success is False
    assert result.snippets == []
    assert "Tavily client not initialized" in result.error_message


def test_search_falls_back_when_sdk_does_not_accept_timeout(monkeypatch):
    """SDK TypeError on 'timeout' keyword triggers retry without timeout."""
    fake_client = FakeTavilyClient(
        response={"results": [{"url": "https://example.com", "title": "Example", "content": "Snippet"}]},
        raise_type_error_once=True,
    )
    monkeypatch.setattr(
        search_service, "_get_clients",
        lambda api_key=None: [("tavily-0", fake_client)]
    )

    result = search_web("market trends", redis_client=False, api_key="tvly-test")

    assert result.success is True
    assert len(fake_client.calls) == 2
    assert "timeout" in fake_client.calls[0]
    assert "timeout" not in fake_client.calls[1]


def test_search_never_raises_on_provider_error(monkeypatch):
    """Any provider exception is caught and returned gracefully."""
    fake_client = FakeTavilyClient(error=RuntimeError("provider down"))
    monkeypatch.setattr(
        search_service, "_get_clients",
        lambda api_key=None: [("tavily-0", fake_client)]
    )

    result = search_web("any query", redis_client=False, api_key="tvly-test")

    assert result.success is False
    assert result.snippets == []
    assert "provider down" in result.error_message or "All Tavily keys" in result.error_message


def test_search_rotates_to_second_key_on_rate_limit(monkeypatch):
    """When first key is rate limited, the second key is tried automatically."""
    first_client = FakeTavilyClient(error=RuntimeError("rate limit exceeded"))
    second_client = FakeTavilyClient(
        response={"results": [{"url": "https://backup.com", "title": "Backup", "content": "Backup result."}]}
    )
    monkeypatch.setattr(
        search_service, "_get_clients",
        lambda api_key=None: [("tavily-0", first_client), ("tavily-1", second_client)]
    )

    result = search_web("market trends", redis_client=False, api_key="tvly-a,tvly-b")

    assert result.success is True
    assert result.snippets == ["Backup result."]


def test_search_reports_all_keys_exhausted(monkeypatch):
    """When every key fails, a clear 'all keys exhausted' message is returned."""
    clients = [
        ("tavily-0", FakeTavilyClient(error=RuntimeError("rate limit"))),
        ("tavily-1", FakeTavilyClient(error=RuntimeError("invalid key"))),
    ]
    monkeypatch.setattr(
        search_service, "_get_clients",
        lambda api_key=None: clients
    )

    result = search_web("market trends", redis_client=False, api_key="tvly-bad,tvly-worse")

    assert result.success is False
    assert "All Tavily keys exhausted" in result.error_message
