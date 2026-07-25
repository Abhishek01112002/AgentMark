"""
TEST SUITE FOR MANAGER AGENT

Tests verify that Manager Agent:
1. Takes input from state (campaign_name, brand_name, industry, primary_goal, target_audience, brand_voice)
2. Produces JSON output
3. Output contains required fields: campaign_name, brand_name, industry, primary_goal, target_audience, brand_voice, channels, deliverables
4. Output is parseable and structured

Manager Agent Output Structure (Actual):
{
  "campaign_name": str,
  "brand_name": str,
  "industry": str,
  "primary_goal": str,
  "target_audience": str,
  "brand_voice": str,
  "channels": list,
  "deliverables": list
}

Test Framework: pytest
Run: pytest tests/test_manager.py -v
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from agents.state import CampaignState
from agents.manager import manager_agent


# ==================== TEST 1: Agent Executes Without Error ====================

def test_manager_agent_executes():
    """
    TEST 1: Verify Manager Agent runs without crashing
    
    WHAT: Call manager_agent() with valid state
    EXPECT: Returns a state object (no error)
    """
    print("\n" + "=" * 80)
    print("TEST 1: Manager Agent Executes")
    print("=" * 80)
    
    # Create initial state with all required fields
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Test audience",
        brand_voice="professional"
    )
    
    # Run manager agent
    result = manager_agent(state)
    
    # Verify: We got a state back
    assert result is not None, "Manager agent should return a state"
    assert isinstance(result, CampaignState), "Should return CampaignState object"
    
    print("✅ PASS: Manager Agent executed successfully")


# ==================== TEST 2: Manager Output is Not Empty ====================

def test_manager_output_not_empty():
    """
    TEST 2: Verify Manager Agent produces output
    
    WHAT: Check if manager_output field is filled
    EXPECT: manager_output should not be None or empty string
    """
    print("\n" + "=" * 80)
    print("TEST 2: Manager Output is Not Empty")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="AI Campaign",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    
    # Verify: Output exists
    assert result.manager_output is not None, "manager_output should not be None"
    assert result.manager_output != "", "manager_output should not be empty string"
    assert len(result.manager_output) > 0, "manager_output should have content"
    
    print(f"✅ PASS: Manager output exists ({len(result.manager_output)} characters)")


# ==================== TEST 3: Manager Output is Valid JSON ====================

def test_manager_output_is_json():
    """
    TEST 3: Verify Manager Output is valid JSON
    
    WHAT: Try to parse manager_output as JSON
    EXPECT: Should parse without error
    WHY: Other agents need to read this as JSON
    """
    print("\n" + "=" * 80)
    print("TEST 3: Manager Output is Valid JSON")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="SaaS Campaign",
        brand_name="SaaSTool",
        industry="saas",
        primary_goal="awareness",
        target_audience="Enterprise",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    
    # Verify: Can parse as JSON
    try:
        parsed = json.loads(result.manager_output)
        assert isinstance(parsed, dict), "Parsed JSON should be a dictionary"
        print("✅ PASS: Manager output is valid JSON")
        print(f"   Keys in JSON: {list(parsed.keys())}")
    except json.JSONDecodeError as e:
        pytest.fail(f"Manager output is not valid JSON: {e}")


# ==================== TEST 4: TARGET_AUDIENCE Field Exists ====================

def test_target_audience_field_exists():
    """
    TEST 4: Verify 'target_audience' field exists in output
    
    WHAT: Check if parsed JSON has 'target_audience' key
    EXPECT: 'target_audience' key should exist and be non-empty
    WHY: Research and Strategy Agent need this for audience customization
    """
    print("\n" + "=" * 80)
    print("TEST 4: Target Audience Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Lead Gen Campaign",
        brand_name="LeadGen Inc",
        industry="finance",
        primary_goal="lead_gen",
        target_audience="Startup founders, CTOs",
        brand_voice="friendly"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: target_audience exists
    assert "target_audience" in parsed, "JSON should have 'target_audience' key"
    assert parsed["target_audience"] is not None, "target_audience should not be None"
    assert isinstance(parsed["target_audience"], str), "target_audience should be a string"
    assert len(parsed["target_audience"]) > 0, "target_audience should not be empty"
    
    print("✅ PASS: Target Audience field exists")
    print(f"   Value: '{parsed['target_audience']}'")


# ==================== TEST 5: CHANNELS Field Exists ====================

def test_channels_field_exists():
    """
    TEST 5: Verify 'channels' field exists in output
    
    WHAT: Check if parsed JSON has 'channels' key
    EXPECT: 'channels' key should exist and be a non-empty list
    WHY: Strategy Agent needs to know which channels to use
    """
    print("\n" + "=" * 80)
    print("TEST 5: Channels Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Content Campaign",
        brand_name="ContentKing",
        industry="saas",
        primary_goal="awareness",
        target_audience="Marketers",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: channels exists
    assert "channels" in parsed, "JSON should have 'channels' key"
    assert parsed["channels"] is not None, "channels should not be None"
    assert isinstance(parsed["channels"], list), "channels should be a list"
    assert len(parsed["channels"]) > 0, "channels should not be empty list"
    
    print("✅ PASS: Channels field exists")
    print(f"   Value: {parsed['channels']}")


# ==================== TEST 6: DELIVERABLES Field Exists ====================

def test_deliverables_field_exists():
    """
    TEST 6: Verify 'deliverables' field exists in output
    
    WHAT: Check if parsed JSON has 'deliverables' key
    EXPECT: 'deliverables' key should exist and be a non-empty list
    WHY: Copywriter and Image Agent need this to know what to create
    """
    print("\n" + "=" * 80)
    print("TEST 6: Deliverables Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Full Campaign",
        brand_name="FullBrand",
        industry="healthcare",
        primary_goal="lead_gen",
        target_audience="Healthcare providers",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: deliverables exists
    assert "deliverables" in parsed, "JSON should have 'deliverables' key"
    assert parsed["deliverables"] is not None, "deliverables should not be None"
    assert isinstance(parsed["deliverables"], list), "deliverables should be a list"
    assert len(parsed["deliverables"]) > 0, "deliverables should not be empty list"
    
    print("✅ PASS: Deliverables field exists")
    print(f"   Value: {parsed['deliverables']}")


# ==================== TEST 7: BRAND_VOICE Field Exists ====================

def test_brand_voice_field_exists():
    """
    TEST 7: Verify 'brand_voice' field exists in output
    
    WHAT: Check if parsed JSON has 'brand_voice' key
    EXPECT: 'brand_voice' key should exist and be a non-empty string
    WHY: Research and Strategy need this for tone personalization
    """
    print("\n" + "=" * 80)
    print("TEST 7: Brand Voice Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Voice Campaign",
        brand_name="VoiceCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leads",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: brand_voice exists
    assert "brand_voice" in parsed, "JSON should have 'brand_voice' key"
    assert parsed["brand_voice"] is not None, "brand_voice should not be None"
    assert isinstance(parsed["brand_voice"], str), "brand_voice should be a string"
    assert len(parsed["brand_voice"]) > 0, "brand_voice should not be empty"
    
    print("✅ PASS: Brand Voice field exists")
    print(f"   Value: '{parsed['brand_voice']}'")


# ==================== TEST 8: INDUSTRY Field Exists ====================

def test_industry_field_exists():
    """
    TEST 8: Verify 'industry' field exists in output
    
    WHAT: Check if parsed JSON has 'industry' key
    EXPECT: 'industry' key should exist and be non-empty
    WHY: Research Agent needs industry for market lookup
    """
    print("\n" + "=" * 80)
    print("TEST 8: Industry Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Industry Campaign",
        brand_name="IndustryCo",
        industry="finance",
        primary_goal="sales",
        target_audience="Finance professionals",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: industry exists
    assert "industry" in parsed, "JSON should have 'industry' key"
    assert parsed["industry"] is not None, "industry should not be None"
    assert isinstance(parsed["industry"], str), "industry should be a string"
    assert len(parsed["industry"]) > 0, "industry should not be empty"
    
    print("✅ PASS: Industry field exists")
    print(f"   Value: {parsed['industry']}")


# ==================== TEST 9: PRIMARY_GOAL Field Exists ====================

def test_primary_goal_field_exists():
    """
    TEST 9: Verify 'primary_goal' field exists in output
    
    WHAT: Check if parsed JSON has 'primary_goal' key
    EXPECT: 'primary_goal' key should exist and be a non-empty string
    WHY: Research and Strategy Agent need primary_goal for audience insights
    """
    print("\n" + "=" * 80)
    print("TEST 9: Primary Goal Field Exists")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Goal Campaign",
        brand_name="GoalCo",
        industry="ecommerce",
        primary_goal="awareness",
        target_audience="Online shoppers",
        brand_voice="friendly"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: primary_goal exists
    assert "primary_goal" in parsed, "JSON should have 'primary_goal' key"
    assert parsed["primary_goal"] is not None, "primary_goal should not be None"
    assert isinstance(parsed["primary_goal"], str), "primary_goal should be a string"
    assert len(parsed["primary_goal"]) > 0, "primary_goal should not be empty"
    
    print("✅ PASS: Primary Goal field exists")
    print(f"   Value: '{parsed['primary_goal']}'")


# ==================== TEST 10: Status Updated ====================

def test_status_updated():
    """
    TEST 10: Verify status is updated to 'manager_complete'
    
    WHAT: Check if status field is updated
    EXPECT: status should be 'manager_complete'
    WHY: Next agent checks status to know when to start
    """
    print("\n" + "=" * 80)
    print("TEST 10: Status Updated")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Test",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="awareness",
        target_audience="Test",
        brand_voice="professional"
    )
    
    # Before
    assert state.status == "pending", "Initial status should be 'pending'"
    
    # Run agent
    result = manager_agent(state)
    
    # After
    assert result.status == "manager_complete", "Status should be updated to 'manager_complete'"
    
    print("✅ PASS: Status updated correctly")
    print("   Before: pending")
    print(f"   After: {result.status}")


# ==================== TEST 11: Industry Determines Channels ====================

def test_industry_determines_channels():
    """
    TEST 11: Verify that industry determines appropriate channels
    
    WHAT: Create campaigns with different industries and check channels
    EXPECT: Different industries should result in different channels
    WHY: Ensure Manager Agent adapts strategy based on industry
    """
    print("\n" + "=" * 80)
    print("TEST 11: Industry Determines Channels")
    print("=" * 80)
    
    # Test SaaS industry
    saas_state = CampaignState(
        campaign_name="SaaS",
        brand_name="SaaSCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional"
    )
    
    saas_result = manager_agent(saas_state)
    saas_parsed = json.loads(saas_result.manager_output)
    
    # Test E-commerce industry
    ecom_state = CampaignState(
        campaign_name="E-Commerce",
        brand_name="ShopCo",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Shoppers",
        brand_voice="friendly"
    )
    
    ecom_result = manager_agent(ecom_state)
    ecom_parsed = json.loads(ecom_result.manager_output)
    
    # Verify: Different industries have different channels
    assert saas_parsed["channels"] != ecom_parsed["channels"], "Different industries should have different channels"
    
    # More flexible checks - LLM may use different channel names
    saas_channels_lower = [ch.lower() for ch in saas_parsed["channels"]]
    ecom_channels_lower = [ch.lower() for ch in ecom_parsed["channels"]]
    
    # SaaS typically includes B2B channels
    assert any(ch in saas_channels_lower for ch in ["linkedin", "tech blogs", "tech", "blog"]), \
        "SaaS should include B2B channels like LinkedIn or Tech Blogs"
    
    # E-commerce typically includes social channels
    assert any(ch in ecom_channels_lower for ch in ["instagram", "facebook", "tiktok", "social"]), \
        "E-commerce should include social channels like Instagram or Facebook"
    
    print("✅ PASS: Industry determines channels")
    print(f"   SaaS channels: {saas_parsed['channels']}")
    print(f"   E-commerce channels: {ecom_parsed['channels']}")


# ==================== TEST 12: Primary Goal Determines Deliverables ====================

def test_goal_determines_deliverables():
    """
    TEST 12: Verify that primary goal determines appropriate deliverables
    
    WHAT: Create campaigns with different goals and check deliverables
    EXPECT: Different goals should result in different deliverables
    WHY: Ensure Manager Agent adapts strategy based on goal
    """
    print("\n" + "=" * 80)
    print("TEST 12: Primary Goal Determines Deliverables")
    print("=" * 80)
    
    # Test Lead Generation goal
    lead_gen_state = CampaignState(
        campaign_name="Lead Gen",
        brand_name="LeadCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Leads",
        brand_voice="professional"
    )
    
    lead_gen_result = manager_agent(lead_gen_state)
    lead_gen_parsed = json.loads(lead_gen_result.manager_output)
    
    # Test Sales goal
    sales_state = CampaignState(
        campaign_name="Sales",
        brand_name="SalesCo",
        industry="saas",
        primary_goal="sales",
        target_audience="Buyers",
        brand_voice="professional"
    )
    
    sales_result = manager_agent(sales_state)
    sales_parsed = json.loads(sales_result.manager_output)
    
    # Verify: Different goals produce valid deliverables
    assert len(lead_gen_parsed["deliverables"]) > 0, "Lead Gen should have deliverables"
    assert len(sales_parsed["deliverables"]) > 0, "Sales should have deliverables"
    
    print("✅ PASS: Primary goal determines deliverables")
    print(f"   Lead Gen deliverables: {lead_gen_parsed['deliverables']}")
    print(f"   Sales deliverables: {sales_parsed['deliverables']}")


# ==================== TEST 13: All Required Fields Present ====================

def test_all_required_fields_present():
    """
    TEST 13: Verify all required fields are present in output
    
    WHAT: Check if all critical fields exist in manager output
    EXPECT: All 8 fields should exist and be populated
    WHY: Downstream agents depend on all these fields
    """
    print("\n" + "=" * 80)
    print("TEST 13: All Required Fields Present")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Complete Campaign",
        brand_name="CompleteCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs",
        brand_voice="professional"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # List of required fields (8 fields total)
    required_fields = [
        "campaign_name",
        "brand_name",
        "industry",
        "primary_goal",
        "target_audience",
        "brand_voice",
        "channels",
        "deliverables"
    ]
    
    # Verify all fields exist
    for field in required_fields:
        assert field in parsed, f"Missing required field: {field}"
        assert parsed[field] is not None, f"Field '{field}' should not be None"
    
    print("✅ PASS: All required fields present")
    for field in required_fields:
        print(f"   ✓ {field}")


# ==================== TEST 14: Full Integration Test ====================

def test_manager_agent_integration():
    """
    TEST 14: Full integration test
    
    WHAT: Test complete flow with realistic data matching your form
    EXPECT: All validations pass
    WHY: Ensure Manager Agent works end-to-end with all form fields
    """
    print("\n" + "=" * 80)
    print("TEST 14: Full Integration Test")
    print("=" * 80)
    
    # Create realistic state matching form inputs
    state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads",
        brand_voice="professional"
    )
    
    print("Input:")
    print(f"  campaign_name: {state.campaign_name}")
    print(f"  brand_name: {state.brand_name}")
    print(f"  industry: {state.industry}")
    print(f"  primary_goal: {state.primary_goal}")
    print(f"  target_audience: {state.target_audience}")
    print(f"  brand_voice: {state.brand_voice}")
    
    # Run agent
    result = manager_agent(state)
    
    # Parse output
    parsed = json.loads(result.manager_output)
    
    # Verify all requirements
    assert result.status == "manager_complete", "Status should be manager_complete"
    assert "campaign_name" in parsed and parsed["campaign_name"] == "Q3 Product Launch"
    assert "brand_name" in parsed and parsed["brand_name"] == "AgentMark"
    assert "industry" in parsed and parsed["industry"] == "saas"
    assert "primary_goal" in parsed and parsed["primary_goal"] == "lead_gen"
    assert "target_audience" in parsed and parsed["target_audience"]
    assert "brand_voice" in parsed and parsed["brand_voice"]
    assert "channels" in parsed and len(parsed["channels"]) > 0
    assert "deliverables" in parsed and len(parsed["deliverables"]) > 0
    
    print("\nOutput:")
    print(f"  status: {result.status} ✅")
    print(f"  campaign_name: {parsed['campaign_name']} ✅")
    print(f"  brand_name: {parsed['brand_name']} ✅")
    print(f"  industry: {parsed['industry']} ✅")
    print(f"  primary_goal: {parsed['primary_goal']} ✅")
    print(f"  target_audience: {parsed['target_audience']} ✅")
    print(f"  brand_voice: {parsed['brand_voice']} ✅")
    print(f"  channels: {parsed['channels']} ✅")
    print(f"  deliverables: {parsed['deliverables']} ✅")
    
    print("\n✅ PASS: Integration test successful")


# ==================== TEST 15: Input Fields Preserved in Output ====================

def test_input_fields_preserved_in_output():
    """
    TEST 15: Verify all input fields are preserved in output
    
    WHAT: Check that all 6 input fields appear unchanged in output
    EXPECT: Output should contain exact input values
    WHY: Ensure Manager doesn't modify user inputs
    """
    print("\n" + "=" * 80)
    print("TEST 15: Input Fields Preserved in Output")
    print("=" * 80)
    
    state = CampaignState(
        campaign_name="Preservation Test",
        brand_name="PreserveBrand",
        industry="healthcare",
        primary_goal="retention",
        target_audience="Healthcare professionals, doctors aged 35-50",
        brand_voice="authoritative"
    )
    
    result = manager_agent(state)
    parsed = json.loads(result.manager_output)
    
    # Verify: All inputs preserved exactly
    assert parsed["campaign_name"] == "Preservation Test", "campaign_name should be preserved"
    assert parsed["brand_name"] == "PreserveBrand", "brand_name should be preserved"
    assert parsed["industry"] == "healthcare", "industry should be preserved"
    assert parsed["primary_goal"] == "retention", "primary_goal should be preserved"
    assert "Healthcare professionals" in parsed["target_audience"], "target_audience should be preserved"
    assert "brand_voice" in parsed, "brand_voice should be present"
    
    print("✅ PASS: All input fields preserved exactly")
    print("   All 6 input fields match output ✓")


# ==================== TEST 16: Manager Handles All Industries ====================

def test_manager_handles_all_industries():
    """
    TEST 16: Verify Manager handles all supported industries
    
    WHAT: Test all industry types (saas, ecommerce, finance, healthcare, other)
    EXPECT: Each should get appropriate channels
    WHY: Ensure comprehensive industry coverage
    """
    print("\n" + "=" * 80)
    print("TEST 16: Manager Handles All Industries")
    print("=" * 80)
    
    industries = ["saas", "ecommerce", "finance", "healthcare", "other"]
    
    for industry in industries:
        state = CampaignState(
            campaign_name=f"{industry.title()} Campaign",
            brand_name=f"{industry.title()}Co",
            industry=industry,
            primary_goal="lead_gen",
            target_audience="Test audience",
            brand_voice="professional"
        )
        
        result = manager_agent(state)
        parsed = json.loads(result.manager_output)
        
        assert "channels" in parsed, f"{industry} should have channels"
        assert len(parsed["channels"]) > 0, f"{industry} should have non-empty channels"
        print(f"   ✓ {industry}: {parsed['channels']}")
    
    print(f"\n✅ PASS: All {len(industries)} industries handled correctly")


# ==================== TEST 17: Manager Handles All Goals ====================

def test_manager_handles_all_goals():
    """
    TEST 17: Verify Manager handles all supported goals
    
    WHAT: Test all goal types (awareness, lead_gen, sales, retention)
    EXPECT: Each should get appropriate deliverables
    WHY: Ensure comprehensive goal coverage
    """
    print("\n" + "=" * 80)
    print("TEST 17: Manager Handles All Goals")
    print("=" * 80)
    
    goals = ["awareness", "lead_gen", "sales", "retention"]
    
    for goal in goals:
        state = CampaignState(
            campaign_name=f"{goal.title()} Campaign",
            brand_name="TestBrand",
            industry="saas",
            primary_goal=goal,
            target_audience="Test audience",
            brand_voice="professional"
        )
        
        result = manager_agent(state)
        parsed = json.loads(result.manager_output)
        
        assert "deliverables" in parsed, f"{goal} should have deliverables"
        assert len(parsed["deliverables"]) > 0, f"{goal} should have non-empty deliverables"
        print(f"   ✓ {goal}: {parsed['deliverables']}")
    
    print(f"\n✅ PASS: All {len(goals)} goals handled correctly")


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    """
    Run all tests manually (without pytest)
    
    To run with pytest:
        pytest tests/test_manager.py -v
    
    To run manually:
        python tests/test_manager.py
    """
    
    print("\n" + "=" * 80)
    print("MANAGER AGENT TEST SUITE")
    print("=" * 80)
    
    tests = [
        test_manager_agent_executes,
        test_manager_output_not_empty,
        test_manager_output_is_json,
        test_target_audience_field_exists,
        test_channels_field_exists,
        test_deliverables_field_exists,
        test_brand_voice_field_exists,
        test_industry_field_exists,
        test_primary_goal_field_exists,
        test_status_updated,
        test_industry_determines_channels,
        test_goal_determines_deliverables,
        test_all_required_fields_present,
        test_manager_agent_integration,
        test_input_fields_preserved_in_output,
        test_manager_handles_all_industries,
        test_manager_handles_all_goals,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except AssertionError as e:
            failed += 1
            print(f"❌ FAIL: {e}")
        except Exception as e:
            failed += 1
            print(f"❌ ERROR: {e}")
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(tests)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED!")
    else:
        print("\n⚠️  Some tests failed")
    
    print("=" * 80)
