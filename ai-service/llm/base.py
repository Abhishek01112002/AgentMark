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
    Round-robin provider pool with automatic fallback.
    If primary is rate-limited, falls back to secondary.
    """
    def __init__(self, providers: list):
        self.providers = providers
        self._idx = 0
        self._lock = threading.Lock()

    def get(self):
        with self._lock:
            p = self.providers[self._idx]
            self._idx = (self._idx + 1) % len(self.providers)
            return p


# Global shared instances — all agents share these
# Gemini free tier: 15 RPM = 1 request every 4 seconds (0.25 req/sec)
# capacity=3 allows a small burst for sequential agent calls without hammering the API
GLOBAL_RATE_LIMITER = TokenBucket(capacity=3, refill_rate=0.25)  # 15 RPM safe throttle
GLOBAL_CIRCUIT_BREAKER = CircuitBreaker(threshold=5, cooldown=60.0)


class BaseLLMClient(ABC):
    """Abstract base class for all LLM clients"""

    def __init__(self):
        self.rate_limiter = GLOBAL_RATE_LIMITER
        self.circuit_breaker = GLOBAL_CIRCUIT_BREAKER

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
    def generate(self, prompt: str, temperature: float = 0.7, max_tokens: int = 2000) -> str:
        pass

    @abstractmethod
    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7, max_tokens: int = 4000):
        pass
