from api.routes.campaigns import _has_explicit_provider_keys


def test_requires_explicit_provider_keys():
    assert not _has_explicit_provider_keys(None)
    assert not _has_explicit_provider_keys({})
    assert not _has_explicit_provider_keys({"gemini_api_key": "   "})


def test_accepts_non_empty_provider_keys():
    assert _has_explicit_provider_keys({"gemini_api_key": "AIzaTest123456789012345678901234"})
    assert _has_explicit_provider_keys({"groq_api_key": "gsk_test1234567890"})
    assert _has_explicit_provider_keys({"openai_api_key": "sk-test1234567890"})
