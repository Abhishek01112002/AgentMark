"""
Automated Security, Failover, and Functional Tests for Brand DNA Service.
Tests SSRF Protection, Alternative IP Notation Evasion, DNS Resolution Validation,
ReDoS-Safe HTML Cleaning, and Fail-Fast Timeout Behavior.
"""

import asyncio
import pytest
from unittest.mock import patch, MagicMock
from services.brand_dna_service import (
    is_ip_private_or_reserved,
    validate_url_ip_resolution,
    clean_html_content_safe,
    fetch_brand_website_dna,
    fetch_brand_website_dna_async,
)


class TestBrandDNASecuritySSRF:
    """Test Suite for SSRF Hardening & Evasion Defense."""

    @pytest.mark.parametrize(
        "ip_str",
        [
            "127.0.0.1",
            "127.0.0.2",
            "10.0.0.1",
            "10.255.255.255",
            "192.168.1.1",
            "172.16.0.1",
            "172.31.255.255",
            "169.254.169.254",  # AWS/GCP Metadata Endpoint
            "0.0.0.0",
            "::1",  # IPv6 Loopback
            "fe80::1",  # IPv6 Link-Local
            "::ffff:127.0.0.1",  # IPv4-mapped IPv6
            "0177.0.0.1",  # Octal 127.0.0.1
            "2130706433",  # Integer 127.0.0.1
        ],
    )
    def test_private_ip_detection(self, ip_str: str):
        """Verify native ipaddress engine flags all private/loopback/reserved IP variants."""
        assert is_ip_private_or_reserved(ip_str) is True

    @pytest.mark.parametrize(
        "public_ip",
        [
            "8.8.8.8",
            "1.1.1.1",
            "142.250.190.46",
            "2607:f8b0:4005:805::200e",
        ],
    )
    def test_public_ip_detection(self, public_ip: str):
        """Verify public IPs pass the private IP filter."""
        assert is_ip_private_or_reserved(public_ip) is False

    @pytest.mark.parametrize(
        "invalid_url",
        [
            "http://localhost",
            "http://localhost:5003",
            "http://127.0.0.1/admin",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]:8080",
            "ftp://example.com/file",
            "file:///etc/passwd",
            "javascript:alert(1)",
            "",
            None,
        ],
    )
    def test_validate_url_blocks_unsafe_targets(self, invalid_url):
        """Verify validate_url_ip_resolution blocks invalid protocols and internal hosts."""
        assert validate_url_ip_resolution(invalid_url) is None

    def test_dns_rebinding_preflight_protection(self):
        """Verify DNS preflight resolution blocks hostname that resolves to internal IP."""
        with patch("socket.getaddrinfo") as mock_getaddrinfo:
            # Simulate DNS resolving host to loopback IP 127.0.0.1
            mock_getaddrinfo.return_value = [
                (2, 1, 6, "", ("127.0.0.1", 0))
            ]
            assert validate_url_ip_resolution("https://rebinding-attack.evil.com") is None


class TestBrandDNAHTMLParser:
    """Test Suite for ReDoS-Safe BeautifulSoup HTML Parsing."""

    def test_clean_html_strips_scripts_and_styles(self):
        raw_html = """
        <html>
            <head>
                <style>body { background: red; }</style>
                <script>alert('xss');</script>
            </head>
            <body>
                <header><nav><a href="#">Home</a></nav></header>
                <main>
                    <h1>Acme Cloud Services</h1>
                    <p>We provide enterprise AI automation tools for modern teams.</p>
                </main>
                <footer><p>Copyright 2026</p></footer>
            </body>
        </html>
        """
        cleaned = clean_html_content_safe(raw_html)
        assert "background: red" not in cleaned
        assert "alert('xss')" not in cleaned
        assert "Home" not in cleaned
        assert "Copyright 2026" not in cleaned
        assert "Acme Cloud Services" in cleaned
        assert "enterprise AI automation tools" in cleaned

    def test_clean_html_handles_empty_or_malformed(self):
        assert clean_html_content_safe("") == ""
        assert clean_html_content_safe(None) == ""
        malformed = "<div><p>Unclosed paragraph tag<div>Nested text</div>"
        cleaned = clean_html_content_safe(malformed)
        assert "Unclosed paragraph tag" in cleaned
        assert "Nested text" in cleaned


class TestBrandDNAServiceFunctional:
    """Test Suite for End-to-End Brand DNA Fetching & Fail-Fast Execution."""

    def test_fetch_brand_website_dna_async_success(self):
        sample_html = """
        <html>
            <body>
                <main>
                <h1>Stripe Payments</h1>
                <p>Financial infrastructure for the internet. Millions of businesses use Stripe to accept payments online. We provide the most powerful and easiest-to-use APIs for internet businesses.</p>
                </main>
            </body>
        </html>
        """

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html; charset=utf-8"}
        mock_response.content = sample_html.encode("utf-8")

        async def _run():
            with patch("services.brand_dna_service.validate_url_ip_resolution", return_value="https://stripe.com"):
                with patch("httpx.AsyncClient.get", return_value=mock_response):
                    res = await fetch_brand_website_dna_async("Stripe", "https://stripe.com", timeout_seconds=2.0)
                    assert res is not None
                    assert res["source_url"] == "https://stripe.com"
                    assert "Stripe Payments" in res["extracted_hero_text"]
                    assert "Financial infrastructure" in res["extracted_hero_text"]

        asyncio.run(_run())

    def test_fetch_brand_website_dna_sync_wrapper(self):
        sample_html = "<html><body><main><h1>Shopify Platform</h1><p>Build your online store with Shopify today. We provide the best e-commerce solution for businesses of all sizes to sell online, in-store, and everywhere in between.</p></main></body></html>"

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.headers = {"Content-Type": "text/html"}
        mock_response.content = sample_html.encode("utf-8")

        with patch("services.brand_dna_service.validate_url_ip_resolution", return_value="https://shopify.com"):
            with patch("httpx.AsyncClient.get", return_value=mock_response):
                res = fetch_brand_website_dna("Shopify", "https://shopify.com", timeout_seconds=2.0)
                assert res is not None
                assert "Shopify Platform" in res["extracted_hero_text"]

    def test_fetch_brand_website_dna_fail_fast_on_ssrf(self):
        """Verify non-blocking failover when URL fails SSRF check."""
        res = fetch_brand_website_dna("InternalAdmin", "http://169.254.169.254/latest/meta-data/")
        assert res is None
