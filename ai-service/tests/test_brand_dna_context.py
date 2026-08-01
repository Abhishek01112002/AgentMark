import pytest
from utils.brand_dna_context import build_brand_dna_context, BrandDnaContext

def test_empty_or_none_dna():
    ctx = build_brand_dna_context(None, "research")
    assert ctx.source == "none"
    assert ctx.confidence == "LOW"
    assert ctx.fallback_used is False
    assert ctx.text == ""

    ctx_empty = build_brand_dna_context({}, "research")
    assert ctx_empty.source == "none"
    assert ctx_empty.confidence == "LOW"
    assert ctx_empty.text == ""

def test_legacy_fallback():
    dna = {"extracted_hero_text": "Our legacy value prop", "source_url": "example.com"}
    ctx = build_brand_dna_context(dna, "strategy")
    assert ctx.source == "legacy"
    assert ctx.confidence == "LOW"
    assert ctx.fallback_used is True
    assert "Our legacy value prop" in ctx.text

def test_structured_dna():
    dna = {
        "structured_dna": {
            "core_value_proposition": "We make things fast",
            "brand_voice": "Friendly and casual",
            "target_audience": ["Developers"],
            "products": ["Product A", "Product B"]
        },
        "confidence": "HIGH"
    }
    
    # Test research purpose (should include core_value_proposition, target_audience)
    ctx_research = build_brand_dna_context(dna, "research")
    assert ctx_research.source == "structured"
    assert ctx_research.confidence == "HIGH"
    assert ctx_research.fallback_used is False
    assert "We make things fast" in ctx_research.text
    assert "Developers" in ctx_research.text
    assert "Friendly and casual" not in ctx_research.text

    # Test copywriter purpose (should include brand_voice)
    ctx_copy = build_brand_dna_context(dna, "copywriter")
    assert "Friendly and casual" in ctx_copy.text
    
def test_budget_enforcement():
    dna = {
        "structured_dna": {
            "core_value_proposition": "Core",
            "brand_voice": "Voice",
            "target_audience": "Audience",
            "products": ["Long product name " * 50]
        },
        "confidence": "HIGH"
    }
    # Restrict to a very small budget. "products" is lowest priority and should be dropped.
    ctx = build_brand_dna_context(dna, "copywriter", max_tokens=10)
    assert "Long product name" not in ctx.text
    assert "products" in ctx.omitted_fields
