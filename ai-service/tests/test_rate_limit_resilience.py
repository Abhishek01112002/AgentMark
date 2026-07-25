"""
Day 3: Rate Limit Resilience â€” 4 Failure Scenarios
"""

import time
import pytest
from unittest.mock import patch, MagicMock


@pytest.fixture(autouse=True)
def reset_rate_limiter(monkeypatch):
    """Reset the singleton rate limiter before each test to avoid cross-test contamination."""
    from llm.rate_limiter import reset_rate_limiter
    reset_rate_limiter()
    for key in ("OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "RESPECT_CLIENT_PROVIDER_ORDER"):
        monkeypatch.delenv(key, raising=False)
    yield


# ===================== SCENARIO 1 =====================
# Sirf Groq key valid, Gemini keys missing

class TestScenario1_GroqOnly:
    """Only Groq key available â€” should use Groq for everything, no crash."""

    def test_provider_pool_builds_with_groq_only(self):
        from llm.provider_pool import ProviderPool
        pool = ProviderPool({"groq_api_key": "gsk_test123"})
        assert pool.total_keys == 1
        provider, key, key_id = pool.get_available()
        assert provider == "groq"
        assert key == "gsk_test123"

    def test_provider_pool_skips_empty_gemini(self):
        from llm.provider_pool import ProviderPool
        pool = ProviderPool({
            "groq_api_key": "gsk_test123",
            "gemini_api_key": "",  # empty â†’ should be ignored
        })
        assert pool.total_keys == 1
        provider, _, _ = pool.get_available()
        assert provider == "groq"

    def test_provider_pool_with_only_gemini_and_no_groq(self):
        from llm.provider_pool import ProviderPool
        pool = ProviderPool({"gemini_api_key": "key1,key2"})
        assert pool.total_keys == 2
        assert pool.get_available()[0] == "gemini"

    def test_smart_client_works_with_groq_only(self):
        from llm.factory import SmartClient
        from llm.provider_pool import ProviderPool
        pool = ProviderPool({"groq_api_key": "gsk_test123"})
        client = SmartClient(pool)

        mock_inner = MagicMock()
        mock_inner.generate.return_value = "ok"

        with patch("llm.factory._create_client", return_value=mock_inner):
            result = client.generate("test")
            assert result == "ok"

    def test_no_keys_raises_error(self):
        from llm.provider_pool import ProviderPool
        with pytest.raises(ValueError, match="No LLM API keys found"):
            ProviderPool({})


# ===================== SCENARIO 2 =====================
# Sab providers rate-limited simultaneously

class TestScenario2_AllRateLimited:
    """All providers at rate limit â€” should wait, retry, then raise clear error."""

    def test_rate_limiter_rejects_when_full(self):
        from llm.rate_limiter import get_rate_limiter, RateLimiter
        limiter = get_rate_limiter()
        key_id = "test-ratelimit-1"

        # Fill up the window
        for _ in range(30):  # Groq limit = 30
            limiter.record_request(key_id)

        assert not limiter.can_make_request(key_id, "groq")

    def test_cooling_down_key_is_rejected(self):
        from llm.rate_limiter import RateLimiter
        limiter = RateLimiter()
        key_id = "test-cooldown-1"

        limiter.mark_cooldown(key_id, duration=60.0)
        assert not limiter.can_make_request(key_id, "groq")

    def test_rate_limiter_allows_after_cooldown_expires(self):
        from llm.rate_limiter import RateLimiter
        limiter = RateLimiter()
        key_id = "test-cooldown-2"

        # Very short cooldown
        limiter.mark_cooldown(key_id, duration=0.01)
        time.sleep(0.02)
        assert limiter.can_make_request(key_id, "groq")

    def test_all_providers_rate_limited_raises_error(self):
        from llm.factory import SmartClient, AllProvidersRateLimitedError
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({"groq_api_key": "gsk_test", "gemini_api_key": "key1"})
        client = SmartClient(pool)

        # Mark all providers as rate-limited
        for _, _, key_id in pool.providers:
            pool.mark_failed(key_id)

        with pytest.raises((AllProvidersRateLimitedError, Exception)):
            client.generate("test")

    def test_rate_limiter_prunes_old_entries(self):
        from llm.rate_limiter import RateLimiter
        limiter = RateLimiter()
        key_id = "test-prune-1"

        # Add requests with old timestamps (directly manipulate internal state)
        import time
        limiter._requests[key_id] = [time.time() - 120] * 30  # 2 min old
        assert limiter.can_make_request(key_id, "groq")  # should be pruned


# ===================== SCENARIO 3 =====================
# Cache key collision â€” different inputs produce different keys

class TestScenario3_CacheKeyCollision:
    """Verify cache key uniqueness: same input â†’ same key, different input â†’ different key."""

    def test_same_inputs_same_key(self):
        from utils.llm_cache import make_key
        k1 = make_key("Test", prompt="hello", temperature=0.7, max_tokens=500)
        k2 = make_key("Test", prompt="hello", temperature=0.7, max_tokens=500)
        assert k1 == k2

    def test_different_agent_names_different_keys(self):
        from utils.llm_cache import make_key
        k1 = make_key("Manager", prompt="hello", temperature=0.7)
        k2 = make_key("Research", prompt="hello", temperature=0.7)
        assert k1 != k2

    def test_different_prompts_different_keys(self):
        from utils.llm_cache import make_key
        k1 = make_key("Test", prompt="hello world", temperature=0.7)
        k2 = make_key("Test", prompt="goodbye world", temperature=0.7)
        assert k1 != k2

    def test_different_temperature_different_keys(self):
        from utils.llm_cache import make_key
        k1 = make_key("Test", prompt="hello", temperature=0.7)
        k2 = make_key("Test", prompt="hello", temperature=0.3)
        assert k1 != k2

    def test_deterministic_key_ordering(self):
        from utils.llm_cache import make_key
        k1 = make_key("Test", a=1, b=2, c=3)
        k2 = make_key("Test", c=3, b=2, a=1)  # different kwarg order
        assert k1 == k2  # should be stable regardless of param order

    def test_cache_ttl_expiry(self):
        import utils.llm_cache as llm_cache
        llm_cache.clear()

        key = llm_cache.make_key("Test", prompt="ttl test")
        llm_cache.set(key, "data")

        # Should be available immediately
        assert llm_cache.get(key) == "data"

        # Simulate TTL expiry by manipulating internal cache
        import time
        llm_cache._cache[key] = ("data", time.time() - llm_cache.CACHE_TTL - 1)

        assert llm_cache.get(key) is None  # expired

    def test_cache_get_missing_key(self):
        from utils.llm_cache import get
        assert get("nonexistent-key-12345") is None


# ===================== SCENARIO 4 =====================
# Ek provider beech mein fail ho jaye â€” auto-fallback

class TestScenario4_ProviderFailover:
    """One provider fails â€” system automatically falls back to next."""

    def test_fallback_on_generic_failure(self):
        from llm.factory import SmartClient
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({
            "groq_api_key": "gsk_bad",
            "gemini_api_key": "gemini_good",
        })
        client = SmartClient(pool)

        # First provider fails, second succeeds
        mock_bad = MagicMock()
        mock_bad.generate.side_effect = Exception("rate limit exceeded 429")

        mock_good = MagicMock()
        mock_good.generate.return_value = "success from gemini"

        call_count = 0

        def create_client_side_effect(provider, key, **kwargs):
            nonlocal call_count
            call_count += 1
            if provider == "gemini":
                return mock_bad
            return mock_good

        with patch("llm.factory._create_client", side_effect=create_client_side_effect):
            result = client.generate("test prompt")
            assert result == "success from gemini"

    def test_all_providers_fail_raises_error(self):
        from llm.factory import SmartClient
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({
            "groq_api_key": "gsk_bad",
            "gemini_api_key": "gemini_bad",
        })
        client = SmartClient(pool)

        mock_bad = MagicMock()
        mock_bad.generate.side_effect = Exception("rate limit exceeded 429")

        with patch("llm.factory._create_client", return_value=mock_bad):
            with pytest.raises(Exception, match="rate limit"):
                client.generate("test prompt")

    def test_fallback_on_invalid_key(self):
        from llm.factory import SmartClient
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({
            "groq_api_key": "gsk_bad",
            "gemini_api_key": "gemini_good",
        })
        client = SmartClient(pool)

        mock_invalid = MagicMock()
        mock_invalid.generate.side_effect = Exception("invalid API key")

        mock_valid = MagicMock()
        mock_valid.generate.return_value = "fallback success"

        call_log = []

        def create_client_side_effect(provider, key, **kwargs):
            call_log.append(provider)
            if provider == "gemini":
                return mock_invalid
            return mock_valid

        with patch("llm.factory._create_client", side_effect=create_client_side_effect):
            result = client.generate("test prompt")
            assert result == "fallback success"

    def test_mark_failed_affects_provider_pool(self):
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({
            "groq_api_key": "gsk_1",
            "gemini_api_key": "gemini_1",
        })

        # Both should be available initially
        result = pool.get_available()
        assert result is not None
        provider = result[0]
        first_key_id = result[2]

        # Mark first key as failed
        pool.mark_failed(first_key_id)

        # Should now get the other provider
        result2 = pool.get_available()
        assert result2 is not None, "second provider should be available"
        assert result2[0] != provider

    def test_non_rate_limit_error_propagates(self):
        """Non-rate-limit errors (e.g., auth, model not found) should propagate immediately."""
        from llm.factory import SmartClient
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({"groq_api_key": "gsk_test"})
        client = SmartClient(pool)

        mock_client = MagicMock()
        # Non-rate-limit errors should propagate immediately without retry
        mock_client.generate.side_effect = Exception("Model not found")

        with patch("llm.factory._create_client", return_value=mock_client):
            # The error message should contain "Model not found" not "rate-limited"
            with pytest.raises(Exception) as exc_info:
                client.generate("test")
            assert "Model not found" in str(exc_info.value) or "not found" in str(exc_info.value).lower()

    def test_create_client_failure_fallthrough(self):
        """If _create_client itself raises (e.g. invalid key format), failover
        should catch it and try the next key, not crash the entire call."""
        from llm.factory import SmartClient, AllProvidersRateLimitedError
        from llm.provider_pool import ProviderPool

        pool = ProviderPool({
            "groq_api_key": "gsk_bad",
            "gemini_api_key": "gemini_good",
        })
        client = SmartClient(pool)

        good_mock = MagicMock()
        good_mock.generate.return_value = "from fallback"

        call_log = []

        def create_client_side_effect(provider, key, **kwargs):
            call_log.append((provider, key))
            if provider == "gemini":
                raise ValueError("bad key format")
            return good_mock

        with patch("llm.factory._create_client", side_effect=create_client_side_effect):
            result = client.generate("test")
            assert result == "from fallback"
            assert len(call_log) == 2, f"Expected 2 attempts, got {call_log}"


# ===================== SCENARIO 5 =====================
# FAANG-level edge case hardening

class TestScenario5_EdgeCaseHardening:
    """Thread safety, cache bounds, key limit â€” production hardening."""

    def test_rate_limiter_thread_safety(self):
        """Concurrent access to RateLimiter must not corrupt internal state."""
        from llm.rate_limiter import RateLimiter
        import threading

        limiter = RateLimiter()
        errors = []

        def hammer(key_id: str, provider: str):
            try:
                for _ in range(100):
                    if limiter.can_make_request(key_id, provider):
                        limiter.record_request(key_id)
                    limiter.mark_cooldown(key_id, 0.001)
            except Exception as e:
                errors.append(e)

        threads = [
            threading.Thread(target=hammer, args=(f"key-{i}", "groq"))
            for i in range(10)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors, f"Thread safety violation: {errors}"

    def test_cache_max_size_eviction(self):
        """Cache must not exceed MAX_CACHE_SIZE entries."""
        from utils.llm_cache import make_key, get, set, clear
        clear()

        inserted_keys = []
        for i in range(1100):
            key = make_key("test", n=i)
            set(key, f"val-{i}")
            inserted_keys.append(key)

        from utils.llm_cache import MAX_CACHE_SIZE
        from utils.llm_cache import _cache
        assert len(_cache) <= MAX_CACHE_SIZE, (
            f"Cache exceeded max size: {len(_cache)} > {MAX_CACHE_SIZE}"
        )

        # Recent entries should still exist
        last_key = make_key("test", n=1099)
        assert get(last_key) == "val-1099", "Recent entry should survive eviction"

        clear()

    def test_cache_max_size_enforced_on_set(self):
        """set() should never let cache exceed MAX_CACHE_SIZE even under bulk insert."""
        from utils.llm_cache import make_key, get, set, clear, MAX_CACHE_SIZE
        clear()

        for i in range(MAX_CACHE_SIZE + 500):
            key = make_key("bulk", n=i)
            set(key, f"v-{i}")

        from utils.llm_cache import _cache
        assert len(_cache) <= MAX_CACHE_SIZE, (
            f"Cache overflow: {len(_cache)} > {MAX_CACHE_SIZE}"
        )

        clear()

    def test_rate_limiter_key_limit(self):
        """RateLimiter must not accumulate unlimited unique keys."""
        from llm.rate_limiter import RateLimiter, MAX_KEYS_TRACKED
        limiter = RateLimiter()

        for i in range(MAX_KEYS_TRACKED + 50):
            limiter.record_request(f"unique-key-{i}")

        assert len(limiter._requests) <= MAX_KEYS_TRACKED, (
            f"Too many keys tracked: {len(limiter._requests)} > {MAX_KEYS_TRACKED}"
        )

    def test_mark_cooldown_unknown_provider(self):
        """mark_cooldown with an unknown key ID format should not crash."""
        from llm.rate_limiter import RateLimiter
        limiter = RateLimiter()

        # No crash for any of these
        limiter.mark_cooldown("unknown-provider-key-1")
        limiter.mark_cooldown("justakey")
        limiter.mark_cooldown("a-b-c-d-e")

        assert not limiter.can_make_request("unknown-provider-key-1", "unknown")

    def test_cache_get_after_eviction_stale_lru(self):
        """Recently accessed entries survive LRU eviction; least-recently used get evicted."""
        from utils.llm_cache import make_key, get, set, clear, MAX_CACHE_SIZE
        clear()

        # Fill to just under capacity
        survivor_key = make_key("lru", target="survivor")
        set(survivor_key, "survivor")
        for i in range(MAX_CACHE_SIZE - 5):
            key = make_key("lru", n=i)
            set(key, f"filler-{i}")

        # Access survivor to promote it to most recently used
        assert get(survivor_key) == "survivor"

        # Add more entries past capacity â€” survivor should survive
        for i in range(20):
            key = make_key("lru", n=MAX_CACHE_SIZE + i)
            set(key, f"new-{i}")

        from utils.llm_cache import _cache
        assert survivor_key in _cache, "Recently accessed key should survive LRU eviction"

        clear()

    def test_rate_limiter_can_make_request_unknown_key(self):
        """can_make_request for a never-before-seen key should return True."""
        from llm.rate_limiter import RateLimiter
        limiter = RateLimiter()
        assert limiter.can_make_request("brand-new-key", "unknown-provider")

