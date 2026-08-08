"""
BRAND DNA SERVICE — Autonomous Website Ingestion & Intelligence Engine
Role: Extract grounded brand messaging, hero value props, and product facts
from official brand websites with zero SSRF security risk and fail-fast guarantees.

Security Features:
- DNS Resolution Pre-flight Check (Prevents DNS Rebinding / TOCTOU SSRF attacks)
- Per-hop HTTP Redirect Tracking & Validation
- Standard Library `ipaddress` Engine (Prevents IPv6, Octal, Hex, and Integer IP evasion)
- Non-blocking Async HTTP I/O (`httpx.AsyncClient`)
- ReDoS-Safe HTML Parsing via BeautifulSoup4
"""

import asyncio
import ipaddress
import logging
import socket
import urllib.parse
from typing import Any, Dict, Optional
import httpx
from bs4 import BeautifulSoup
import hashlib
import json
from utils.llm_cache import make_key, get as cache_get, set as cache_set

logger = logging.getLogger(__name__)

# Maximum raw response bytes (300KB cap — sufficient to capture full hero/above-the-fold HTML;
# reduced from 500KB to avoid unnecessary memory pressure on large brand sites)
MAX_RESPONSE_BYTES = 300_000
# Raised from 5.0s to 10.0s: heavy brand sites (e.g. FMCG, retail) often take 6-8s to
# respond due to CDN routing and JS-heavy page skeletons. 5s was too aggressive, causing
# silent failures and downstream 'Brand DNA missing' reviewer flags.
DEFAULT_TIMEOUT_SECONDS = 10.0


def is_ip_private_or_reserved(ip_str: str) -> bool:
    """
    Check if an IP string (IPv4 or IPv6) belongs to private, loopback, link-local,
    reserved, or multicast space using Python's native `ipaddress` engine.
    Handles alternative formats (octal, hex, dword) parsed by `ipaddress`.
    """
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        return (
            ip_obj.is_private
            or ip_obj.is_loopback
            or ip_obj.is_link_local
            or ip_obj.is_reserved
            or ip_obj.is_multicast
            or ip_obj.is_unspecified
        )
    except ValueError:
        # If it's not a valid IP string (e.g. a domain name like 'netflix.com'),
        # it is NOT a private IP. Return False so the DNS resolver can check it.
        return False

def validate_url_ip_resolution(url: str) -> Optional[str]:
    """
    Perform DNS resolution on host and verify EVERY resolved IP against private networks.
    Prevents SSRF evasion via alternative IP representations, IPv6, and DNS Rebinding.
    Returns target URL string if valid, None if blocked.
    """
    if not url or not isinstance(url, str):
        return None

    url = url.strip()
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return None

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None

    hostname = parsed.hostname.strip("[]")  # Strip brackets for IPv6 literals

    # 1. Direct IP Check
    if is_ip_private_or_reserved(hostname):
        logger.warning("🛡️ [SSRF GUARD] Blocked direct private IP attempt: %s", hostname)
        return None

    # 2. Perform DNS Lookup and validate all resolved addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM)
        resolved_ips = {info[4][0] for info in addr_info}

        for resolved_ip in resolved_ips:
            if is_ip_private_or_reserved(resolved_ip):
                logger.warning(
                    "🛡️ [SSRF GUARD] Blocked DNS Rebinding attempt! Host '%s' resolved to internal IP '%s'",
                    hostname,
                    resolved_ip,
                )
                return None
    except socket.gaierror as err:
        logger.debug("DNS resolution failed for '%s': %s", hostname, err)
        return None
    except Exception as exc:
        logger.warning("Unexpected error during DNS validation for '%s': %s", hostname, exc)
        return None

    return url


async def validate_url_ip_resolution_async(url: str) -> "Optional[str]":
    """
    Async variant of validate_url_ip_resolution for use inside coroutines.
    The synchronous socket.getaddrinfo() system call is offloaded to a thread-pool
    worker via asyncio.to_thread so the event loop is not blocked during DNS
    resolution (which can take 100–1000 ms on slow resolvers or cold caches).
    The synchronous validate_url_ip_resolution() is preserved for callers that
    run in non-async contexts (e.g. the sync wrapper fetch_brand_website_dna).
    """
    if not url or not isinstance(url, str):
        return None

    url = url.strip()
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        return None

    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        return None

    hostname = parsed.hostname.strip("[]")  # Strip brackets for IPv6 literals

    # Direct IP check is synchronous and CPU-only — safe on the event loop thread.
    if is_ip_private_or_reserved(hostname):
        logger.warning("\U0001f6e1\ufe0f [SSRF GUARD] Blocked direct private IP attempt: %s", hostname)
        return None

    # DNS resolution is a blocking I/O call — offload it to avoid stalling the loop.
    try:
        addr_info = await asyncio.to_thread(
            socket.getaddrinfo, hostname, None, socket.AF_UNSPEC, socket.SOCK_STREAM
        )
        resolved_ips = {info[4][0] for info in addr_info}

        for resolved_ip in resolved_ips:
            if is_ip_private_or_reserved(resolved_ip):
                logger.warning(
                    "\U0001f6e1\ufe0f [SSRF GUARD] Blocked DNS Rebinding attempt! Host '%s' resolved to internal IP '%s'",
                    hostname,
                    resolved_ip,
                )
                return None
    except socket.gaierror as err:
        logger.debug("DNS resolution failed for '%s': %s", hostname, err)
        return None
    except Exception as exc:
        logger.warning("Unexpected error during async DNS validation for '%s': %s", hostname, exc)
        return None

    return url


def clean_html_content_safe(raw_html: str) -> str:
    """
    Extract clean, high-signal text from raw HTML using BeautifulSoup (ReDoS Safe).
    Strips noise elements (script, style, nav, footer, header, cookie banners, modals, buttons).
    Uses semantic extraction (main, article, section) and deduplicates lines.
    """
    if not raw_html:
        return ""

    try:
        soup = BeautifulSoup(raw_html, "html.parser")

        # Strip unneeded noise HTML tags
        for element in soup(["script", "style", "svg", "nav", "footer", "header", "form", "iframe", "noscript", "button"]):
            element.decompose()

        # Strip cookie banners, privacy notices, modals, popups, and GDPR elements by class/id
        noise_keywords = ("cookie", "privacy", "banner", "modal", "popup", "consent", "gdpr", "cookie-notice", "accept-cookies", "legal", "investors", "careers", "terms", "case-studies", "blog")
        for element in soup.find_all(True):
            if element.name and element.parent:
                element_id = str(element.get("id", "")).lower()
                element_cls = " ".join(element.get("class", [])) if isinstance(element.get("class"), list) else str(element.get("class", ""))
                element_cls = element_cls.lower()
                if any(noise in element_id or noise in element_cls for noise in noise_keywords):
                    element.decompose()

        # Semantic extraction: prioritize <main>, <article>, <section>, <h1-h3>
        high_value_tags = soup.find_all(["main", "article", "section", "h1", "h2", "h3"])
        
        if high_value_tags:
            text_blocks = []
            for tag in high_value_tags:
                text_blocks.append(tag.get_text(separator="\n", strip=True))
            text = "\n".join(text_blocks)
        else:
            text = soup.get_text(separator="\n", strip=True)

        # Deduplicate lines while preserving order
        seen_lines = set()
        unique_lines = []
        for line in text.splitlines():
            line_clean = line.strip()
            if len(line_clean) > 3 and line_clean not in seen_lines:
                seen_lines.add(line_clean)
                unique_lines.append(line_clean)
                
        return "\n".join(unique_lines)
    except Exception as exc:
        logger.warning("HTML parsing fallback error: %s", exc)
        return ""


async def fetch_brand_website_dna_async(
    brand_name: str,
    brand_url: Optional[str] = None,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> Optional[Dict[str, Any]]:
    """
    Async Non-blocking Brand DNA web crawler with per-hop redirect SSRF protection.
    Returns structured Brand DNA or None if offline/blocked.
    """
    target_url = None
    if brand_url and await validate_url_ip_resolution_async(brand_url):
        target_url = brand_url.strip()

    # Search fallback if brand_url not provided
    if not target_url and brand_name:
        try:
            from services.search_service import search_web
            search_res = await asyncio.to_thread(search_web, f"official website {brand_name}")
            if search_res and getattr(search_res, "sources", None):
                for source in search_res.sources:
                    if await validate_url_ip_resolution_async(source.url):
                        target_url = source.url
                        break
        except Exception as exc:
            logger.warning("Brand DNA search resolution error: %s", exc)

    if not target_url or not await validate_url_ip_resolution_async(target_url):
        logger.info("ℹ️ [BRAND DNA] Skipped: No validated public URL for brand '%s'", brand_name)
        return None

    logger.info("🌐 [BRAND DNA ENGINE] Ingesting official website: %s (Timeout: %.1fs)", target_url, timeout_seconds)

    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
        ),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(timeout_seconds),
            follow_redirects=False,  # Handle redirects manually to prevent SSRF hops
            verify=True,
        ) as client:
            curr_url = target_url
            max_redirects = 5  # raised from 3: some brands use multi-hop CDN redirect chains
            raw_html = ""

            for _ in range(max_redirects + 1):
                # Validate current URL target BEFORE making request
                if not await validate_url_ip_resolution_async(curr_url):
                    logger.warning("🛡️ [SSRF GUARD] Redirect target blocked: %s", curr_url)
                    return None

                resp = await client.get(curr_url, headers=headers)

                # Handle HTTP redirects with per-hop SSRF validation
                if resp.status_code in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location")
                    if not location:
                        break
                    curr_url = urllib.parse.urljoin(curr_url, location)
                    continue

                if resp.status_code != 200:
                    logger.info("ℹ️ [BRAND DNA] Non-200 HTTP status %d for %s", resp.status_code, curr_url)
                    return None

                content_type = resp.headers.get("Content-Type", "").lower()
                if "text/html" not in content_type and "xml" not in content_type:
                    logger.info("ℹ️ [BRAND DNA] Skipped non-HTML Content-Type: %s", content_type)
                    return None

                # Memory Safety: Cap byte read
                raw_bytes = resp.content[:MAX_RESPONSE_BYTES]
                raw_html = raw_bytes.decode("utf-8", errors="ignore")
                break

        # Extract Clean Content
        clean_text = clean_html_content_safe(raw_html)

        try:
            from utils.token_budget import TokenBudgetManager
            clean_text = TokenBudgetManager.slice_context_to_budget(clean_text, 2500)
        except Exception:
            clean_text = clean_text[:8000]

        if not clean_text or len(clean_text.strip()) < 50:
            return None

        # Caching logic
        content_hash = hashlib.md5(f"{curr_url}:{clean_text}".encode()).hexdigest()
        cache_key = make_key("BrandDNA", hash=content_hash)
        cached_result = cache_get(cache_key)
        
        if cached_result:
            logger.info("📦 [BRAND DNA] Cache hit for %s", curr_url)
            return cached_result
            
        # LLM Summarization
        llm_result = None
        confidence_score = "LOW"
        try:
            from llm import get_llm_client
            from schemas.agent_outputs import BrandDnaOutput
            
            prompt = f"""
            You are a Brand Intelligence engine. Extract facts from the following website content for {brand_name}.
            Rules:
            1. Extract the core value proposition.
            2. List meaningful product features and audience facts (max 6). Return only what exists.
            3. Do NOT invent information.
            4. Do NOT use marketing fluff like "World-class", "Revolutionary", "Global leader", etc.
            
            Website Content:
            {clean_text}
            """
            llm = get_llm_client()
            def run_llm():
                return llm.generate_structured(prompt, BrandDnaOutput, temperature=0.0, max_tokens=1500)
                
            llm_output = await asyncio.to_thread(run_llm)
            if llm_output:
                # Derived confidence: LLM success + sufficient length
                if len(clean_text) > 1000 and len(llm_output.facts) >= 2:
                    confidence_score = "HIGH"
                elif len(clean_text) > 500:
                    confidence_score = "MEDIUM"
                
                llm_output.confidence = confidence_score
                llm_result = llm_output.model_dump()
        except Exception as e:
            logger.warning("⚠️ [BRAND DNA] LLM extraction failed, using fallback: %s", e)
            
        final_result = {
            "source_url": curr_url,
            "extracted_hero_text": clean_text[:1500], # Legacy fallback field
            "crawled_at_host": urllib.parse.urlparse(curr_url).netloc,
        }
        
        if llm_result:
            final_result["structured_dna"] = llm_result
        else:
            final_result["structured_dna"] = {
                "core_value_proposition": clean_text[:200] + "...",
                "brand_voice": "Unknown",
                "facts": [],
                "products": [],
                "target_audience": [],
                "confidence": "LOW"
            }
            
        cache_set(cache_key, final_result)
        return final_result

    except Exception as exc:
        logger.warning("⚠️ [BRAND DNA ENGINE] Non-blocking crawl fallback for '%s': %s", target_url, exc)
        return None


def fetch_brand_website_dna(
    brand_name: str,
    brand_url: Optional[str] = None,
    timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
) -> Optional[Dict[str, Any]]:
    """
    Synchronous Wrapper for backward compatibility in non-async worker threads.
    """
    try:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            import concurrent.futures
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(
                    asyncio.run, fetch_brand_website_dna_async(brand_name, brand_url, timeout_seconds)
                )
                return future.result(timeout=timeout_seconds + 1.0)
        else:
            return asyncio.run(
                fetch_brand_website_dna_async(brand_name, brand_url, timeout_seconds)
            )
    except Exception as exc:
        logger.warning("⚠️ [BRAND DNA ENGINE] Sync wrapper fallback error: %s", exc)
        return None
