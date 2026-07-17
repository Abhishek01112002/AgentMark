"""
Persona Factory Service — AgentMark AI Service

Handles dynamic generation and caching of target personas. Includes:
- L1 Cache: In-memory OrderedDict with LRU eviction (Capped at 100 entries)
- L2 Cache: Redis with SHA-256 caching key and connection pooling
- Lexical Text Normalization: Cleans audience strings to maximize cache hits
- Circuit Breaker Pattern: Disables Redis requests on consecutive failures to prevent latency spikes
"""

import redis
import json
import logging
import hashlib
import time
import re
from collections import OrderedDict
from typing import List, Optional
from schemas.simulation import PersonaProfile, PersonaListContainer
from llm.factory import get_llm_client
from config.settings import REDIS_HOST, REDIS_PORT, REDIS_DB

logger = logging.getLogger("agentmark.simulation")

# ── Pre-compiled Regex & Immutable Stopwords (Performance Optimizations) ────────
CLEAN_REGEX = re.compile(r"[^\w\s]")
STOPWORDS = frozenset({
    "and", "or", "in", "for", "to", "a", "an", "the", "of", "with", "at", "by", "from"
})

# ── Redis Connection Pooling ──────────────────────────────────────────────────
_pool: Optional[redis.ConnectionPool] = None

def _get_pool() -> redis.ConnectionPool:
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            max_connections=15,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
            retry_on_timeout=True,
        )
    return _pool


class PersonaFactory:
    """Resilient, high-performance persona generation and caching factory."""

    # Module-level tracking for Redis Circuit Breaker
    _redis_failures = 0
    _circuit_open_until = 0.0
    _circuit_failure_threshold = 3
    _circuit_cooldown_seconds = 300  # 5 minutes

    def __init__(self, redis_client: Optional[redis.Redis] = None):
        # L1 Cache: OrderedDict capped at 100 entries (LRU Eviction)
        self._local_cache: OrderedDict[str, List[PersonaProfile]] = OrderedDict()
        self._l1_max_size = 100
        
        if redis_client is not None:
            self.redis = redis_client
        else:
            try:
                self.redis = redis.Redis(connection_pool=_get_pool(), decode_responses=True)
            except Exception as e:
                logger.warning("Failed to initialize Redis client: %s", e)
                self.redis = None
        self.cache_ttl = 86400 * 7

    def _normalize_text(self, text: str) -> str:
        """
        Normalizes target audience string by removing punctuation/stopwords,
        sorting keywords, and lowering casing. Uses pre-compiled regex for speed.
        """
        # 1. Lowercase and remove punctuation using pre-compiled regex
        clean = CLEAN_REGEX.sub("", text.lower())
        # 2. Tokenize and filter using O(1) frozenset lookups
        words = [w for w in clean.split() if w and w not in STOPWORDS]
        # 3. Sort words alphabetically
        words.sort()
        return " ".join(words)

    def _get_cache_key(self, brand_name: str, target_audience: str) -> str:
        """Create unique SHA-256 cache key using normalized text."""
        norm_brand = brand_name.strip().lower()
        norm_audience = self._normalize_text(target_audience)
        combined = f"{norm_brand}:{norm_audience}"
        
        hasher = hashlib.sha256(combined.encode('utf-8'))
        return f"personas:{hasher.hexdigest()[:16]}"

    def _is_redis_circuit_closed(self) -> bool:
        """Checks if Redis circuit is closed (healthy) or open (tripped)."""
        if self._redis_failures >= self._circuit_failure_threshold:
            now = time.time()
            if now < self._circuit_open_until:
                return False  # Circuit is Open (tripped)
            logger.info("🔧 Redis circuit cooldown expired, testing connectivity...")
            self._redis_failures = 0
        return True

    def _handle_redis_failure(self):
        """Trips the circuit breaker on consecutive failures."""
        type(self)._redis_failures += 1
        if self._redis_failures >= self._circuit_failure_threshold:
            type(self)._circuit_open_until = time.time() + self._circuit_cooldown_seconds
            logger.warning(
                "🚨 Redis circuit breaker TRIPPED! Disabling L2 calls for %d seconds.",
                self._circuit_cooldown_seconds
            )

    def _record_l1_cache(self, key: str, personas: List[PersonaProfile]):
        """Saves item to L1 cache with LRU eviction policy."""
        if len(self._local_cache) >= self._l1_max_size:
            oldest_key, _ = self._local_cache.popitem(last=False)
            logger.debug("L1 Evicted key: %s due to size cap", oldest_key)
        self._local_cache[key] = personas

    def get_personas(self, brand_name: str, target_audience: str) -> List[PersonaProfile]:
        """Retrieve target personas, serving from L1 memory or L2 Redis cache if available."""
        cache_key = self._get_cache_key(brand_name, target_audience)

        # ── 1. L1 Cache Check ────────────────────────────────────────────────
        if cache_key in self._local_cache:
            logger.info("⚡ L1 Cache Hit: Persona profiles retrieved from memory")
            personas = self._local_cache.pop(cache_key)
            self._local_cache[cache_key] = personas
            return personas

        # ── 2. L2 Cache Check (Redis with Circuit Breaker) ───────────────────
        if self.redis and self._is_redis_circuit_closed():
            try:
                cached_data = self.redis.get(cache_key)
                if cached_data:
                    logger.info("⚡ L2 Cache Hit: Persona profiles retrieved from Redis")
                    raw_list = json.loads(cached_data)
                    personas = [PersonaProfile(**item) for item in raw_list]
                    self._record_l1_cache(cache_key, personas)
                    type(self)._redis_failures = 0
                    return personas
            except Exception as e:
                logger.warning("L2 Redis read failed (non-fatal) in PersonaFactory: %s", e)
                self._handle_redis_failure()

        # ── 3. Cache Miss: Generate via LLM ───────────────────────────────────
        logger.info("🔄 Cache miss. Generating 5 new target personas via LLM...")
        start_time = time.time()
        personas = self._generate_via_llm(brand_name, target_audience)
        latency = time.time() - start_time
        logger.info("✅ Generated 5 personas successfully | Latency: %.2fs", latency)

        # Populate caches
        if personas:
            self._record_l1_cache(cache_key, personas)
            if self.redis and self._is_redis_circuit_closed():
                try:
                    serialized = json.dumps([p.model_dump() for p in personas])
                    self.redis.setex(cache_key, self.cache_ttl, serialized)
                    logger.info("💾 Saved generated personas to L2 Redis cache")
                except Exception as e:
                    logger.warning("L2 Redis write failed (non-fatal) in PersonaFactory: %s", e)
                    self._handle_redis_failure()

        return personas

    def _generate_via_llm(self, brand_name: str, target_audience: str) -> List[PersonaProfile]:
        """Calls LLM using Pydantic structured output to generate 5 profiles."""
        client = get_llm_client()
        system_prompt = (
            "You are a Lead Brand Auditor. Generate exactly 5 distinct, highly realistic, "
            "and demographically diverse target customer personas for the given brand "
            "and target audience brief.\n"
            "Ensure that each persona has a detailed and specific 'cognitive_profile' "
            "describing how they act as a consumer and what skeptical objections they have.\n"
            "CRITICAL FORMATTING RULES FOR OBJECTS:\n"
            "- The 'id' field MUST be a valid lowercase URL-friendly slug containing only "
            "lowercase alphanumeric characters and hyphens (e.g. 'rajesh-45-investor' or 'priya-software-engineer'). "
            "Do NOT use spaces, capital letters, or special characters in the 'id' field."
        )
        user_message = f"Brand Name: {brand_name}\nTarget Audience Brief: {target_audience}"
        prompt = f"{system_prompt}\n\n{user_message}"
        
        try:
            container = client.generate_structured(
                prompt=prompt,
                response_model=PersonaListContainer,
                temperature=0.7,
            )
            return container.personas
        except Exception as e:
            logger.error("Failed to generate personas via structured LLM call: %s", e)
            raise e
