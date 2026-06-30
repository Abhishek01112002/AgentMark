import datetime
import logging
import os
import time
from typing import List, Optional, Tuple

import redis
from pydantic import BaseModel, Field
from tavily import TavilyClient

from config.settings import REDIS_DB, REDIS_HOST, REDIS_PORT

logger = logging.getLogger(__name__)

DAILY_SEARCH_LIMIT = 100


class SourceMeta(BaseModel):
    url: str
    title: str
    domain: str
    snippet: str


class SearchResult(BaseModel):
    success: bool
    query: str
    snippets: list[str] = Field(default_factory=list)
    error_message: Optional[str] = None
    sources: list[SourceMeta] = Field(default_factory=list)
    query_type: str = ""


# ── Tavily client pool (multi-key rotation) ───────────────────────────────
# Holds (key_id, TavilyClient) tuples in priority order.
# Rebuilt whenever the comma-separated key string changes.
_tavily_clients: List[Tuple[str, TavilyClient]] = []
_tavily_keys_hash: str = ""

_redis_pool: Optional[redis.ConnectionPool] = None


def _get_clients(api_key: Optional[str] = None) -> List[Tuple[str, TavilyClient]]:
    """
    Parse comma-separated Tavily keys, build a client for each, and cache them.
    Returns a *snapshot* list so callers iterate safely even if the global pool
    is rebuilt by another request.
    """
    global _tavily_clients, _tavily_keys_hash

    resolved_keys_str = (api_key or os.getenv("TAVILY_API_KEY") or "").strip()
    if not resolved_keys_str:
        logger.warning("TAVILY_API_KEY not set — search disabled")
        return []

    # Split comma-separated keys (e.g. "tvly-A,tvly-B")
    keys = [k.strip() for k in resolved_keys_str.split(",") if k.strip()]
    new_hash = "|".join(keys)

    if new_hash != _tavily_keys_hash:
        _tavily_clients.clear()
        for i, key in enumerate(keys):
            try:
                client = TavilyClient(api_key=key)
                key_id = f"tavily-{i}"
                _tavily_clients.append((key_id, client))
                logger.info("Tavily client ready for key #%d (…%s)", i, key[-4:])
            except Exception as exc:
                logger.error("Tavily client #%d init failed: %s", i, exc)
        _tavily_keys_hash = new_hash

    return _tavily_clients[:]


def _get_client(api_key: Optional[str] = None) -> Optional[TavilyClient]:
    """Backward-compatible single-client accessor. Returns the first client."""
    clients = _get_clients(api_key=api_key)
    return clients[0][1] if clients else None


def _get_redis_pool() -> redis.ConnectionPool:
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            max_connections=10,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
        )
    return _redis_pool


def _check_redis_rate_limit(redis_client, key_id: str = "default") -> bool:
    """
    Per-key daily rate limit. Each Tavily key gets its own 100-search/day quota.
    """
    try:
        key = f"agentmark:search_count:{key_id}:{datetime.date.today().isoformat()}"
        count = redis_client.incr(key)
        if count == 1:
            redis_client.expire(key, 86400)
        if count > DAILY_SEARCH_LIMIT:
            logger.warning(
                "Daily search limit %s reached for key %s — skipping",
                DAILY_SEARCH_LIMIT,
                key_id,
            )
            return False
        return True
    except Exception as exc:
        logger.warning("Redis rate limit check failed: %s — allowing search", exc)
        return True


def search_web(
    query: str,
    redis_client=None,
    max_results: int = 3,
    api_key: Optional[str] = None,
) -> SearchResult:
    """
    Never raises. Tries each Tavily key in rotation until one succeeds.
    Returns snippets, source metadata, or a clear error message.
    """
    start = time.monotonic()

    clients = _get_clients(api_key=api_key)
    if not clients:
        return SearchResult(
            success=False,
            query=query,
            error_message="Tavily client not initialized. Set TAVILY_API_KEY or pass tavily_api_key in llm_config.",
        )

    if redis_client is None:
        try:
            redis_client = redis.Redis(connection_pool=_get_redis_pool(), decode_responses=True)
        except Exception as exc:
            logger.warning("Could not initialize Redis client in search_service: %s", exc)

    # Try each key in order. Track the last error so we can report it if all fail.
    last_error: Optional[str] = None

    for key_id, client in clients:
        # ── Redis rate-limit gate (per-key) ──
        if redis_client and not _check_redis_rate_limit(redis_client, key_id):
            last_error = f"Daily rate limit reached for key {key_id}"
            continue

        try:
            try:
                response = client.search(
                    query=query,
                    max_results=max_results,
                    search_depth="basic",
                    timeout=5,
                )
            except TypeError:
                response = client.search(
                    query=query,
                    max_results=max_results,
                    search_depth="basic",
                )

            results = response.get("results", []) if isinstance(response, dict) else []
            snippets = [
                result.get("content", "").strip()
                for result in results
                if result.get("content", "").strip()
            ]
            sources = [
                SourceMeta(
                    url=result.get("url", ""),
                    title=result.get("title", "") or result.get("url", ""),
                    domain=_domain_from_url(result.get("url", "")),
                    snippet=result.get("content", "")[:240].strip(),
                )
                for result in results
                if result.get("url")
            ]

            latency_ms = int((time.monotonic() - start) * 1000)
            logger.info(
                "Tavily search OK | query='%s' | snippets=%s | sources=%s | key=%s | latency=%sms",
                query[:80],
                len(snippets),
                len(sources),
                key_id,
                latency_ms,
            )
            return SearchResult(
                success=True, query=query, snippets=snippets, sources=sources
            )

        except Exception as exc:
            latency_ms = int((time.monotonic() - start) * 1000)
            error_str = str(exc).lower()

            # Classify error to decide whether to try next key
            if any(k in error_str for k in ("rate", "429", "limit", "quota", "exceeded")):
                logger.warning(
                    "Tavily key %s rate limited: %s | latency=%sms",
                    key_id,
                    exc,
                    latency_ms,
                )
                last_error = f"Rate limit reached on key {key_id}"
                continue

            if any(k in error_str for k in ("invalid", "unauthorized", "401", "403", "key")):
                logger.warning(
                    "Tavily key %s unauthorized: %s | latency=%sms",
                    key_id,
                    exc,
                    latency_ms,
                )
                last_error = f"Invalid API key {key_id}"
                continue

            # Unknown error — still try next key (network blip, etc.)
            logger.error(
                "Tavily key %s failed: %s | latency=%sms",
                key_id,
                exc,
                latency_ms,
            )
            last_error = f"Search failed on key {key_id}: {exc}"
            continue

    # ── All keys exhausted ──
    logger.error(
        "All Tavily keys failed for query '%s'. Last error: %s",
        query[:80],
        last_error,
    )
    return SearchResult(
        success=False,
        query=query,
        error_message=f"All Tavily keys exhausted. {last_error or 'Unknown error'}",
    )


def _domain_from_url(url: str) -> str:
    return url.replace("https://", "").replace("http://", "").split("/")[0]
