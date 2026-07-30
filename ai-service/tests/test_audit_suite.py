import time
import pytest
from services.brand_dna_service import fetch_brand_website_dna, validate_url_ip_resolution
from schemas.agent_outputs import ResearchOutput

def test_suite_2_ssrf_penetration():
    attack_vectors = [
        "http://127.0.0.1:8000",
        "http://169.254.169.254/latest/meta-data",
        "http://localhost:5432",
        "http://[::1]"
    ]
    for url in attack_vectors:
        valid_url = validate_url_ip_resolution(url)
        assert valid_url is None, f"SSRF Penetration Failure: {url} was NOT blocked! Result: {valid_url}"
        print(f"✅ Intercepted SSRF Attack Vector: {url} -> BLOCKED (Returns None)")

def test_suite_5_schema_backward_compatibility():
    # Condition A: All fields populated
    res_a = ResearchOutput(
        customer_voice_insights=["Slow loading times on G2"],
        competitor_vulnerabilities=["High enterprise pricing"],
        proven_ad_hooks=["Stop wasting 3 hours per day"],
        brand_dna={"source_url": "https://novateches.com", "extracted_hero_text": "AI Automation"}
    )
    dump_a = res_a.model_dump_json()
    assert "Slow loading times" in dump_a

    # Condition B: Empty lists
    res_b = ResearchOutput(
        customer_voice_insights=[],
        competitor_vulnerabilities=[],
        proven_ad_hooks=[]
    )
    dump_b = res_b.model_dump_json()
    assert res_b.customer_voice_insights == []

    # Condition C: Legacy DB record (brand_dna is None)
    res_c = ResearchOutput(brand_dna=None)
    dump_c = res_c.model_dump_json()
    assert res_c.brand_dna is None
    print("✅ Schema Backward Compatibility: All 3 Conditions PASSED 100%")

if __name__ == "__main__":
    test_suite_2_ssrf_penetration()
    test_suite_5_schema_backward_compatibility()
