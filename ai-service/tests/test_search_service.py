from services.search_service import search_web, SearchResult

def test_valid_query():
    result = search_web("GPU hardware cooling trends 2026")
    assert isinstance(result, SearchResult)
    assert result.success is True
    assert isinstance(result.snippets, list)
    print(f"Valid query: {len(result.snippets)} snippets returned")

def test_nonsense_query():
    result = search_web("asdkfjasdlkfjasdlkfjqwerty")
    assert isinstance(result, SearchResult)
    assert isinstance(result.snippets, list)  # empty list, not None
    print(f"Nonsense query: success={result.success}, snippets={result.snippets}")

def test_invalid_key(monkeypatch):
    import services.search_service
    monkeypatch.setattr(services.search_service, "_tavily_client", None)
    monkeypatch.setenv("TAVILY_API_KEY", "invalid-key-12345")
    result = search_web("test query")
    assert isinstance(result, SearchResult)
    assert result.success is False
    assert result.snippets == []
    print(f"Invalid key: error='{result.error_message}'")

def test_no_exception_ever():
    """This is the most important test. search_web must never raise."""
    try:
        result = search_web("any query", redis_client=None)
        assert result is not None
        print("No exception raised — correct")
    except Exception as e:
        raise AssertionError(f"search_web raised an exception: {e}")

if __name__ == "__main__":
    test_valid_query()
    test_nonsense_query()
    test_no_exception_ever()
    print("All tests passed")
