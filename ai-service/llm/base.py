"""
Base LLM Client Interface
All LLM providers must implement this interface
"""

import logging
logger = logging.getLogger(__name__)

import time
import random
import threading
from abc import ABC, abstractmethod


class NonRetryableLLMError(RuntimeError):
    """Raised when retrying the same provider cannot fix the request."""


class RateLimitedLLMError(RuntimeError):
    """Raised when a provider/key is rate limited and the pool should fail over."""


def is_payload_too_large_error(error: Exception) -> bool:
    error_str = str(error).lower()
    return (
        "413" in error_str
        or "payload too large" in error_str
        or "request too large" in error_str
        or "context_length_exceeded" in error_str
        or "maximum context length" in error_str
    )


def is_rate_limit_error(error: Exception) -> bool:
    error_str = str(error).lower()
    return (
        "429" in error_str
        or "rate_limit" in error_str
        or "rate limit" in error_str
        or "rate limited" in error_str
        or "quota" in error_str
        or "too many requests" in error_str
    )


class TokenBucket:
    """
    Token bucket rate limiter — FAANG-grade.
    Allows burst up to capacity, then throttles to refill_rate per second.
    Thread-safe (all agents share one bucket).
    """
    def __init__(self, capacity: int, refill_rate: float):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.tokens = capacity
        self.last_refill = time.monotonic()
        self._lock = threading.Lock()

    def _refill(self):
        now = time.monotonic()
        elapsed = now - self.last_refill
        self.tokens = min(self.capacity, self.tokens + elapsed * self.refill_rate)
        self.last_refill = now

    def acquire(self, tokens: int = 1, timeout: float = 60.0) -> bool:
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            with self._lock:
                self._refill()
                if self.tokens >= tokens:
                    self.tokens -= tokens
                    return True
            time.sleep(0.05)
        return False


class CircuitBreaker:
    """
    Circuit breaker — after N consecutive failures, open the circuit
    and reject all requests for cooldown seconds.
    """
    def __init__(self, threshold: int = 3, cooldown: float = 60.0):
        self.threshold = threshold
        self.cooldown = cooldown
        self.failures = 0
        self.last_failure = 0.0
        self._lock = threading.Lock()

    def record_success(self):
        with self._lock:
            self.failures = 0

    def record_failure(self):
        with self._lock:
            self.failures += 1
            self.last_failure = time.monotonic()

    def is_open(self) -> bool:
        with self._lock:
            if self.failures >= self.threshold:
                if time.monotonic() - self.last_failure < self.cooldown:
                    return True
                self.failures = 0
            return False


class ProviderPool:
    """
    Provider pool with automatic fallback and key rotation.
    When one key hits rate limit, tries the next key automatically.
    Skips clients with open circuit breakers.
    """
    def __init__(self, providers: list):
        self.providers = providers
        self._idx = 0
        self._lock = threading.Lock()

    def get(self):
        with self._lock:
            for _ in range(len(self.providers)):
                p = self.providers[self._idx]
                self._idx = (self._idx + 1) % len(self.providers)
                if not p[1].circuit_breaker.is_open():
                    return p
            p = self.providers[self._idx]
            self._idx = (self._idx + 1) % len(self.providers)
            return p

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        attempts = len(self.providers)
        last_error = None
        for _ in range(attempts):
            name, client = self.get()
            if client.circuit_breaker.is_open():
                continue
            try:
                result = client.generate(prompt, temperature, max_tokens)
                client.circuit_breaker.record_success()
                return result
            except Exception as e:
                client.circuit_breaker.record_failure()
                last_error = e
                logger.warning(f"⚠️ {name} key failed ({str(e)[:60]}), trying next...")
        raise last_error or RuntimeError("All providers/keys exhausted")

    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7, max_tokens: int = 4000):
        attempts = len(self.providers)
        last_error = None
        for _ in range(attempts):
            name, client = self.get()
            if client.circuit_breaker.is_open():
                continue
            try:
                result = client.generate_structured(prompt, response_model, temperature, max_tokens)
                client.circuit_breaker.record_success()
                return result
            except Exception as e:
                client.circuit_breaker.record_failure()
                last_error = e
                logger.warning(f"⚠️ {name} key failed ({str(e)[:60]}), trying next...")
        raise last_error or RuntimeError("All providers/keys exhausted")


# Global shared rate limiter — aggregate safety net across all providers
# Capped burst capacity set to 8 to allow parallel focus-group persona calls without queuing
GLOBAL_RATE_LIMITER = TokenBucket(capacity=8, refill_rate=0.5)



class BaseLLMClient(ABC):
    """Abstract base class for all LLM clients"""

    def __init__(self):
        self.rate_limiter = GLOBAL_RATE_LIMITER
        self.circuit_breaker = CircuitBreaker(threshold=5, cooldown=60.0)  # per-instance

    def _wait_for_rate_limit(self, timeout: float = 60.0):
        if self.circuit_breaker.is_open():
            wait = 5.0
            logger.info(f"🔴 Circuit breaker open — pausing {wait}s before retry")
            time.sleep(wait)
            if self.circuit_breaker.is_open():
                raise RuntimeError(
                    "Circuit breaker is open — all providers rate-limited. "
                    "Try again later or add more API keys."
                )

        if not self.rate_limiter.acquire(timeout=timeout):
            raise RuntimeError(
                "Rate limit timeout exceeded — too many concurrent requests. "
                "Reduce agent parallelism or increase rate limit capacity."
            )

    def _handle_rate_limit(self, attempt: int, max_retries: int) -> bool:
        """Returns True if should retry, False if should raise."""
        self.circuit_breaker.record_failure()

        if attempt >= max_retries - 1:
            return False

        base_delay = 2.0
        delay = base_delay * (2 ** attempt) + random.uniform(0, 1.0)  # exponential + jitter
        logger.info(f"⏳ Rate limit hit. Retrying in {delay:.1f}s... (Attempt {attempt + 1}/{max_retries})")
        time.sleep(delay)
        return True

    def _record_success(self):
        self.circuit_breaker.record_success()

    @abstractmethod
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000, seed: int | None = None) -> str:
        pass

    @abstractmethod
    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7, max_tokens: int = 4000, seed: int | None = None):
        pass


class PoolClient(BaseLLMClient):
    """Wraps a ProviderPool to act as a single BaseLLMClient for callers."""
    def __init__(self, pool: ProviderPool):
        self._pool = pool

    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000, seed: int | None = None) -> str:
        return self._pool.generate(prompt, temperature, max_tokens, seed=seed)

    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7, max_tokens: int = 4000, seed: int | None = None):
        return self._pool.generate_structured(prompt, response_model, temperature, max_tokens, seed=seed)
