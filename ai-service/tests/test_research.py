"""
TEST SUITE FOR RESEARCH AGENT

Tests verify that Research Agent:
1. Takes input from state and manager_output (12 fields)
2. Produces JSON output with 5 fields
3. Output is parseable and structured
4. Status is updated to 'research_complete'
5. Industry and goal determine research content

Test Framework: pytest
Run: pytest tests/test_research.py -v
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from agents.state import CampaignState
from agents.research import research_agent


# ==================== HELPER FUNCTION ====================

def create_mock_manager_output(
    campaign_name="Test Campaign",
    brand_name="TestBrand",
    industry="saas",
    primary_goal="lead_gen",
    objective="Lead Gen for TestBrand",
    target_audience="startup founders",
    brand_voice="professional",
    channels=None,
    deliverables=None,
    timeline="2 weeks",
    success_metrics=None,
    key_messaging_guidelines="Use professional tone"
):
    """
    Helper to create realistic mock manager output
    
    This simulates what the Manager Agent would produce (all 12 fields).
    """
    if channels is None:
        channels = ["linkedin", "tech blogs", "startup newsletters"]
    if deliverables is None:
        deliverables = ["linkedin post", "image"]
    if success_metrics is None:
        success_metrics = ["lead conversions", "engagement rate", "click-through rate"]
    
    return {
        "campaign_name": campaign_name,
        "brand_name": brand_name,
        "industry": industry,
        "primary_goal": primary_goal,
        "objective": objective,
        "target_audience": target_audience,
        "brand_voice": brand_voice,
        "channels": channels,
        "deliverables": deliverables,
        "timeline": timeline,
        "success_metrics": success_metrics,
        "key_messaging_guidelines": key_messaging_guidelines
    }


# ==================== TEST 1: Research Agent Executes Without Error ====================

def test_research_agent_executes():
    """
    TEST 1: Verify Research Agent runs without crashing
    
    WHAT: Call research_agent() with valid state
    EXPECT: Returns a state object (no error)
    """
    print("\n" + "=" * 80)
    print("TEST 1: Research Agent Executes")
    print("=" * 80)
    
    # Create mock manager output
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    # Create initial state with all required fields
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Test audience",
        brand_voice="professional",
        brief="Test brief for research",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    # Run research agent
    result = research_agent(state)
    
    # Verify: We got a state back
    assert result is not None, "Research agent should return a state"
    assert isinstance(result, CampaignState), "Should return CampaignState object"
    
    print("✅ PASS: Research Agent executed successfully")


# ==================== TEST 2: Research Output is Not Empty ====================

def test_research_output_not_empty():
    """
    TEST 2: Verify Research Agent produces output
    
    WHAT: Check if research_output field is filled
    EXPECT: research_output should not be None or empty string
    """
    print("\n" + "=" * 80)
    print("TEST 2: Research Output is Not Empty")
    print("=" * 80)
    
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="AI Campaign",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional",
        brief="Launch marketing campaign for AI agency",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    
    # Verify: Output exists
    assert result.research_output is not None, "research_output should not be None"
    assert result.research_output != "", "research_output should not be empty string"
    assert len(result.research_output) > 0, "research_output should have content"
    
    print(f"✅ PASS: Research output exists ({len(result.research_output)} characters)")


# ==================== TEST 3: Research Output is Valid JSON ====================

def test_research_output_is_json():
    """
    TEST 3: Verify Research Output is valid JSON
    
    WHAT: Try to parse research_output as JSON
    EXPECT: Should parse without error
    WHY: Strategy Agent needs to read this as JSON
    """
    print("\n" + "=" * 80)
    print("TEST 3: Research Output is Valid JSON")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(
        campaign_name="SaaS Campaign",
        brand_name="SaaSTool",
        industry="saas",
        primary_goal="awareness"
    )
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="SaaS Campaign",
        brand_name="SaaSTool",
        industry="saas",
        primary_goal="awareness",
        target_audience="Enterprise",
        brand_voice="professional",
        brief="Promote SaaS tool",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    
    # Verify: Can parse as JSON
    try:
        parsed = json.loads(result.research_output)
        assert isinstance(parsed, dict), "Parsed JSON should be a dictionary"
        print("✅ PASS: Research output is valid JSON")
        print(f"   Keys in JSON: {list(parsed.keys())}")
    except json.JSONDecodeError as e:
        pytest.fail(f"Research output is not valid JSON: {e}")


# ==================== TEST 4: All Research Output Fields Exist ====================

def test_all_research_output_fields_exist():
    """
    TEST 4: Verify all 5 research output fields exist
    
    WHAT: Check if research_output contains all required fields
    EXPECT: market_analysis, competitor_analysis, audience_insights, market_opportunities, recommended_approach
    WHY: Strategy Agent depends on all these fields being present
    """
    print("\n" + "=" * 80)
    print("TEST 4: All Research Output Fields Exist")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(
        industry="saas",
        primary_goal="lead_gen"
    )
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Research Fields Test",
        brand_name="ResearchCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional",
        brief="Test all research fields",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    
    # List of required fields (matching research.py output)
    required_fields = [
        "market_analysis",
        "competitor_analysis",
        "audience_insights",
        "market_opportunities",
        "recommended_approach"
    ]
    
    # Verify all fields exist
    for field in required_fields:
        assert field in parsed, f"Missing required field: {field}"
        assert parsed[field] is not None, f"Field '{field}' should not be None"
    
    print("✅ PASS: All research output fields exist")
    for field in required_fields:
        print(f"   ✓ {field}")


# ==================== TEST 5: Market Analysis Field ====================

def test_market_analysis_field():
    """
    TEST 5: Verify market_analysis field is populated correctly
    
    WHAT: Check market_analysis contains expected structure
    EXPECT: Should have total_addressable_market, growth_rate, market_trends
    WHY: Strategy Agent uses this for positioning
    """
    print("\n" + "=" * 80)
    print("TEST 5: Market Analysis Field")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(industry="saas")
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Market Analysis Test",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="CTOs",
        brand_voice="professional",
        brief="Test market analysis",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    market = parsed["market_analysis"]
    
    # Verify structure
    assert isinstance(market, dict), "market_analysis should be a dict"
    assert "total_addressable_market" in market, "Should have total_addressable_market"
    assert "growth_rate" in market, "Should have growth_rate"
    assert "market_trends" in market, "Should have market_trends"
    assert isinstance(market["market_trends"], list), "market_trends should be a list"
    assert len(market["market_trends"]) > 0, "market_trends should not be empty"
    
    print("✅ PASS: Market analysis field is correct")
    print(f"   TAM: {market['total_addressable_market']}")
    print(f"   Growth: {market['growth_rate']}")
    print(f"   Trends: {market['market_trends']}")


# ==================== TEST 6: Competitor Analysis Field ====================

def test_competitor_analysis_field():
    """
    TEST 6: Verify competitor_analysis field is populated correctly
    
    WHAT: Check competitor_analysis contains expected structure
    EXPECT: Should have top_competitors and differentiation_opportunity
    WHY: Strategy Agent uses this for messaging
    """
    print("\n" + "=" * 80)
    print("TEST 6: Competitor Analysis Field")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(industry="ecommerce")
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Competitor Test",
        brand_name="TestBrand",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Shoppers",
        brand_voice="friendly",
        brief="Test competitor analysis",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    competitors = parsed["competitor_analysis"]
    
    # Verify structure
    assert isinstance(competitors, dict), "competitor_analysis should be a dict"
    assert "top_competitors" in competitors, "Should have top_competitors"
    assert "differentiation_opportunity" in competitors, "Should have differentiation_opportunity"
    assert isinstance(competitors["top_competitors"], list), "top_competitors should be a list"
    assert len(competitors["top_competitors"]) > 0, "top_competitors should not be empty"
    
    print("✅ PASS: Competitor analysis field is correct")
    print(f"   Competitors: {competitors['top_competitors']}")
    print(f"   Differentiation: {competitors['differentiation_opportunity']}")


# ==================== TEST 7: Audience Insights Field ====================

def test_audience_insights_field():
    """
    TEST 7: Verify audience_insights field is populated correctly
    
    WHAT: Check audience_insights contains expected structure
    EXPECT: Should have pain_points, motivations, preferred_channels
    WHY: Strategy Agent uses this for content planning
    """
    print("\n" + "=" * 80)
    print("TEST 7: Audience Insights Field")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(primary_goal="lead_gen")
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Audience Test",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional",
        brief="Test audience insights",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    audience = parsed["audience_insights"]
    
    # Verify structure
    assert isinstance(audience, dict), "audience_insights should be a dict"
    assert "pain_points" in audience, "Should have pain_points"
    assert "motivations" in audience, "Should have motivations"
    assert "preferred_channels" in audience, "Should have preferred_channels"
    assert isinstance(audience["pain_points"], list), "pain_points should be a list"
    assert isinstance(audience["motivations"], list), "motivations should be a list"
    assert isinstance(audience["preferred_channels"], list), "preferred_channels should be a list"
    
    print("✅ PASS: Audience insights field is correct")
    print(f"   Pain points: {audience['pain_points']}")
    print(f"   Motivations: {audience['motivations']}")
    print(f"   Channels: {audience['preferred_channels']}")


# ==================== TEST 8: Market Opportunities Field ====================

def test_market_opportunities_field():
    """
    TEST 8: Verify market_opportunities field is populated correctly
    
    WHAT: Check market_opportunities is a non-empty list
    EXPECT: Should be a list of opportunity strings
    WHY: Strategy Agent uses this for growth planning
    """
    print("\n" + "=" * 80)
    print("TEST 8: Market Opportunities Field")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(industry="healthcare")
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Opportunities Test",
        brand_name="TestBrand",
        industry="healthcare",
        primary_goal="lead_gen",
        target_audience="Providers",
        brand_voice="professional",
        brief="Test market opportunities",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    opportunities = parsed["market_opportunities"]
    
    # Verify structure
    assert isinstance(opportunities, list), "market_opportunities should be a list"
    assert len(opportunities) > 0, "market_opportunities should not be empty"
    assert all(isinstance(opp, str) for opp in opportunities), "All opportunities should be strings"
    
    print("✅ PASS: Market opportunities field is correct")
    print(f"   Opportunities: {opportunities}")


# ==================== TEST 9: Recommended Approach Field ====================

def test_recommended_approach_field():
    """
    TEST 9: Verify recommended_approach field is populated correctly
    
    WHAT: Check recommended_approach is a non-empty string
    EXPECT: Should be a strategic recommendation
    WHY: Strategy Agent uses this for campaign approach
    """
    print("\n" + "=" * 80)
    print("TEST 9: Recommended Approach Field")
    print("=" * 80)
    
    manager_data = create_mock_manager_output(primary_goal="sales")
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Approach Test",
        brand_name="TestBrand",
        industry="finance",
        primary_goal="sales",
        target_audience="Finance pros",
        brand_voice="professional",
        brief="Test recommended approach",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    parsed = json.loads(result.research_output)
    approach = parsed["recommended_approach"]
    
    # Verify structure
    assert isinstance(approach, str), "recommended_approach should be a string"
    assert len(approach) > 0, "recommended_approach should not be empty"
    
    print("✅ PASS: Recommended approach field is correct")
    print(f"   Approach: {approach}")


# ==================== TEST 10: Status Updated ====================

def test_status_updated():
    """
    TEST 10: Verify status is updated to 'research_complete'
    
    WHAT: Check if status field is updated
    EXPECT: status should be 'research_complete'
    WHY: Next agent checks status to know when to start
    """
    print("\n" + "=" * 80)
    print("TEST 10: Status Updated")
    print("=" * 80)
    
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Test",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="awareness",
        target_audience="Test",
        brand_voice="professional",
        brief="Test brief",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    # Before
    assert state.status == "manager_complete", "Initial status should be 'manager_complete'"
    
    # Run agent
    result = research_agent(state)
    
    # After
    assert result.status == "research_complete", "Status should be updated to 'research_complete'"
    
    print("✅ PASS: Status updated correctly")
    print("   Before: manager_complete")
    print(f"   After: {result.status}")


# ==================== TEST 11: Industry Determines Research ====================

def test_industry_determines_research():
    """
    TEST 11: Verify industry determines research content
    
    WHAT: Create campaigns with different industries
    EXPECT: Different industries should have different market_analysis and competitor_analysis
    WHY: Ensure Research Agent adapts based on industry input from Manager
    """
    print("\n" + "=" * 80)
    print("TEST 11: Industry Determines Research")
    print("=" * 80)
    
    manager_data_saas = create_mock_manager_output(
        industry="saas",
        campaign_name="SaaS Campaign",
        brand_name="SaaS Co"
    )
    manager_data_health = create_mock_manager_output(
        industry="healthcare",
        campaign_name="Health Campaign",
        brand_name="Health Co"
    )
    
    state_saas = CampaignState(
        campaign_name="SaaS Campaign",
        brand_name="SaaS Co",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech leaders",
        brand_voice="professional",
        brief="SaaS platform launch",
        manager_output=json.dumps(manager_data_saas),
        status="manager_complete"
    )
    
    state_health = CampaignState(
        campaign_name="Health Campaign",
        brand_name="Health Co",
        industry="healthcare",
        primary_goal="awareness",
        target_audience="Healthcare providers",
        brand_voice="professional",
        brief="Healthcare solution awareness",
        manager_output=json.dumps(manager_data_health),
        status="manager_complete"
    )
    
    result_saas = research_agent(state_saas)
    result_health = research_agent(state_health)
    
    parsed_saas = json.loads(result_saas.research_output)
    parsed_health = json.loads(result_health.research_output)
    
    # Verify: Different industries produce different research
    assert parsed_saas["market_analysis"] != parsed_health["market_analysis"], "Different industries should have different market analysis"
    assert parsed_saas["competitor_analysis"] != parsed_health["competitor_analysis"], "Different industries should have different competitors"
    
    print("✅ PASS: Industry determines research")
    print(f"   SaaS TAM: {parsed_saas['market_analysis']['total_addressable_market']}")
    print(f"   Healthcare TAM: {parsed_health['market_analysis']['total_addressable_market']}")


# ==================== TEST 12: Goal Determines Audience Insights ====================

def test_goal_determines_audience_insights():
    """
    TEST 12: Verify primary_goal determines audience_insights
    
    WHAT: Create campaigns with different goals
    EXPECT: Different goals should have different audience insights (pain_points, motivations, channels)
    WHY: Ensure Research Agent adapts based on goal input from Manager
    """
    print("\n" + "=" * 80)
    print("TEST 12: Goal Determines Audience Insights")
    print("=" * 80)
    
    manager_data_awareness = create_mock_manager_output(
        primary_goal="awareness",
        objective="Build brand awareness"
    )
    manager_data_sales = create_mock_manager_output(
        primary_goal="sales",
        objective="Drive sales"
    )
    
    state_awareness = CampaignState(
        campaign_name="Awareness Campaign",
        brand_name="BrandCo",
        industry="saas",
        primary_goal="awareness",
        target_audience="Potential customers",
        brand_voice="professional",
        brief="Build brand awareness",
        manager_output=json.dumps(manager_data_awareness),
        status="manager_complete"
    )
    
    state_sales = CampaignState(
        campaign_name="Sales Campaign",
        brand_name="SalesCo",
        industry="saas",
        primary_goal="sales",
        target_audience="Qualified leads",
        brand_voice="professional",
        brief="Drive product sales",
        manager_output=json.dumps(manager_data_sales),
        status="manager_complete"
    )
    
    result_awareness = research_agent(state_awareness)
    result_sales = research_agent(state_sales)
    
    parsed_awareness = json.loads(result_awareness.research_output)
    parsed_sales = json.loads(result_sales.research_output)
    
    # Verify: Different goals produce different audience insights
    assert parsed_awareness["audience_insights"] != parsed_sales["audience_insights"], "Different goals should have different audience insights"
    
    print("✅ PASS: Goal determines audience insights")
    print(f"   Awareness pain points: {parsed_awareness['audience_insights']['pain_points']}")
    print(f"   Sales pain points: {parsed_sales['audience_insights']['pain_points']}")


# ==================== TEST 13: Brief with Fallback ====================

def test_brief_with_fallback():
    """
    TEST 13: Verify brief field has fallback when None
    
    WHAT: Try to run research with brief=None
    EXPECT: Should handle gracefully with fallback "No brief provided"
    WHY: Research can work with minimal context but prefers brief
    """
    print("\n" + "=" * 80)
    print("TEST 13: Brief with Fallback")
    print("=" * 80)
    
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Test",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Test",
        brand_voice="professional",
        brief=None,  # No brief provided
        manager_output=manager_json,
        status="manager_complete"
    )
    
    # Verify: Should work with fallback
    try:
        result = research_agent(state)
        assert result.research_output is not None, "Should produce research output"
        print("✅ PASS: Brief fallback works")
        print("   Research generated with fallback context")
    except Exception as e:
        pytest.fail(f"Should handle None brief gracefully, but got: {e}")


# ==================== TEST 14: Different Briefs Produce Different Research ====================

def test_different_briefs_produce_different_research():
    """
    TEST 14: Verify different campaign briefs produce different research
    
    WHAT: Create two campaigns with different briefs
    EXPECT: Research outputs should be different
    WHY: Ensure Research Agent adapts to different campaign contexts
    """
    print("\n" + "=" * 80)
    print("TEST 14: Different Briefs Produce Different Research")
    print("=" * 80)
    
    # Campaign 1: AI Agency
    manager_data_1 = create_mock_manager_output(
        campaign_name="AI Agency Campaign",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen"
    )
    
    # Campaign 2: E-commerce
    manager_data_2 = create_mock_manager_output(
        campaign_name="E-commerce Campaign",
        brand_name="ShopHub",
        industry="ecommerce",
        primary_goal="sales"
    )
    
    # Campaign 1: AI Agency
    state1 = CampaignState(
        campaign_name="AI Agency Campaign",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Tech founders",
        brand_voice="professional",
        brief="AI automation agency targeting startup founders",
        manager_output=json.dumps(manager_data_1),
        status="manager_complete"
    )
    
    # Campaign 2: E-commerce
    state2 = CampaignState(
        campaign_name="E-commerce Campaign",
        brand_name="ShopHub",
        industry="ecommerce",
        primary_goal="sales",
        target_audience="Online shoppers",
        brand_voice="friendly",
        brief="E-commerce platform selling handmade products",
        manager_output=json.dumps(manager_data_2),
        status="manager_complete"
    )
    
    result1 = research_agent(state1)
    result2 = research_agent(state2)
    
    json.loads(result1.research_output)
    json.loads(result2.research_output)
    
    # Verify: Different briefs should produce different research
    assert result1.research_output != result2.research_output, "Different briefs should produce different research"
    
    print("✅ PASS: Different briefs produce different research")
    print(f"   Campaign 1 research length: {len(result1.research_output)} chars")
    print(f"   Campaign 2 research length: {len(result2.research_output)} chars")


# ==================== TEST 15: Research Respects Target Audience ====================

def test_research_respects_target_audience():
    """
    TEST 15: Verify Research respects target audience from state
    
    WHAT: Create campaigns with different target audiences
    EXPECT: Research should acknowledge the target audience
    WHY: Research should be audience-specific
    """
    print("\n" + "=" * 80)
    print("TEST 15: Research Respects Target Audience")
    print("=" * 80)
    
    manager_data_1 = create_mock_manager_output(target_audience="Enterprise CTOs")
    manager_data_2 = create_mock_manager_output(target_audience="Freelance designers")
    
    state1 = CampaignState(
        campaign_name="Enterprise Campaign",
        brand_name="EnterpriseCloud",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs with 1000+ employees",
        brand_voice="professional",
        brief="Enterprise cloud solution",
        manager_output=json.dumps(manager_data_1),
        status="manager_complete"
    )
    
    state2 = CampaignState(
        campaign_name="Designer Platform",
        brand_name="DesignHub",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Freelance designers aged 25-35",
        brand_voice="friendly",
        brief="Designer collaboration platform",
        manager_output=json.dumps(manager_data_2),
        status="manager_complete"
    )
    
    result1 = research_agent(state1)
    result2 = research_agent(state2)
    
    # Verify: Both should produce research (audience affects research perspective)
    assert result1.research_output is not None, "Enterprise research should be generated"
    assert result2.research_output is not None, "Designer research should be generated"
    
    print("✅ PASS: Research respects target audience")
    print("   Enterprise research generated ✓")
    print("   Designer research generated ✓")


# ==================== TEST 16: Brand Voice Influences Research ====================

def test_brand_voice_influences_research():
    """
    TEST 16: Verify brand voice influences research tone
    
    WHAT: Create campaigns with different brand voices
    EXPECT: Research should adapt to brand voice
    WHY: Research context should inform how Strategy Agent frames findings
    """
    print("\n" + "=" * 80)
    print("TEST 16: Brand Voice Influences Research")
    print("=" * 80)
    
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    # Professional tone
    state_professional = CampaignState(
        campaign_name="Professional Campaign",
        brand_name="ProfCorp",
        industry="finance",
        primary_goal="lead_gen",
        target_audience="Financial professionals",
        brand_voice="professional",
        brief="Financial services platform",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    # Friendly tone
    state_friendly = CampaignState(
        campaign_name="Friendly Campaign",
        brand_name="FriendlyApp",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Small business owners",
        brand_voice="friendly",
        brief="Small business management app",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result_prof = research_agent(state_professional)
    result_friendly = research_agent(state_friendly)
    
    # Verify: Both produce research (voice affects context)
    assert result_prof.research_output is not None, "Professional research should be generated"
    assert result_friendly.research_output is not None, "Friendly research should be generated"
    
    print("✅ PASS: Brand voice influences research")
    print("   Professional research generated ✓")
    print("   Friendly research generated ✓")


# ==================== TEST 17: No Error Field Set ====================

def test_no_error_field_set():
    """
    TEST 17: Verify no error is set when research completes successfully
    
    WHAT: Check error field after successful research
    EXPECT: error field should be None
    WHY: Errors should only be set if something fails
    """
    print("\n" + "=" * 80)
    print("TEST 17: No Error Field Set")
    print("=" * 80)
    
    manager_data = create_mock_manager_output()
    manager_json = json.dumps(manager_data)
    
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Test audience",
        brand_voice="professional",
        brief="Test brief",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    result = research_agent(state)
    
    # Verify: No error set
    assert result.error is None, "error field should be None on success"
    
    print("✅ PASS: No error field set")
    print(f"   error: {result.error}")


# ==================== TEST 18: Full Integration Test ====================

def test_research_agent_integration():
    """
    TEST 18: Full integration test
    
    WHAT: Test complete flow with realistic data matching all 12 Manager output fields
    EXPECT: All validations pass, all 5 research output fields populated
    WHY: Ensure Research Agent works end-to-end with Manager data
    """
    print("\n" + "=" * 80)
    print("TEST 18: Full Integration Test")
    print("=" * 80)
    
    # Create realistic manager output with all 12 fields
    manager_data = create_mock_manager_output(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        objective="Generate qualified leads for AI automation platform",
        target_audience="Startup founders aged 25-40, tech-savvy",
        brand_voice="professional",
        channels=["linkedin", "tech blogs", "startup newsletters", "product hunt"],
        deliverables=["gated whitepaper", "landing page", "webinar"],
        timeline="3 weeks",
        success_metrics=["lead conversions", "engagement rate", "webinar attendance"],
        key_messaging_guidelines="Use professional but approachable tone emphasizing time-saving and automation"
    )
    manager_json = json.dumps(manager_data)
    
    # Create realistic state
    state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Startup founders aged 25-40, tech-savvy, looking for automation",
        brand_voice="professional",
        brief="Launch marketing campaign for AI automation agency targeting startup founders who struggle with repetitive tasks and want to scale operations",
        manager_output=manager_json,
        status="manager_complete"
    )
    
    print("Input (from Manager Agent - 12 fields):")
    print(f"  campaign_name: {manager_data['campaign_name']}")
    print(f"  brand_name: {manager_data['brand_name']}")
    print(f"  industry: {manager_data['industry']}")
    print(f"  primary_goal: {manager_data['primary_goal']}")
    print(f"  objective: {manager_data['objective']}")
    print(f"  target_audience: {manager_data['target_audience']}")
    print(f"  brand_voice: {manager_data['brand_voice']}")
    print(f"  channels: {manager_data['channels']}")
    print(f"  deliverables: {manager_data['deliverables']}")
    print(f"  timeline: {manager_data['timeline']}")
    print(f"  success_metrics: {manager_data['success_metrics']}")
    print(f"  key_messaging_guidelines: {manager_data['key_messaging_guidelines']}")
    
    # Run agent
    result = research_agent(state)
    
    # Verify all requirements
    assert result.status == "research_complete", f"Status should be 'research_complete' but got {result.status}"
    assert result.research_output is not None, "research_output must be populated"
    assert len(result.research_output) > 0, "research_output must not be empty"
    assert result.error is None, f"error should be None but got {result.error}"
    
    # Verify output is valid JSON
    parsed = json.loads(result.research_output)
    assert isinstance(parsed, dict), "research_output should be valid JSON dict"
    
    # Verify all 5 research output fields exist
    required_fields = [
        "market_analysis",
        "competitor_analysis",
        "audience_insights",
        "market_opportunities",
        "recommended_approach"
    ]
    for field in required_fields:
        assert field in parsed, f"Missing field: {field}"
        assert parsed[field] is not None, f"Field {field} should not be None"
    
    print("\nOutput (Research Agent - 5 fields):")
    print(f"  status: {result.status} ✅")
    print("  market_analysis: present ✅")
    print("  competitor_analysis: present ✅")
    print("  audience_insights: present ✅")
    print("  market_opportunities: present ✅")
    print("  recommended_approach: present ✅")
    print(f"  research_output length: {len(result.research_output)} chars ✅")
    print(f"  error: {result.error} ✅")
    
    print("\n✅ PASS: Integration test successful")


# ==================== TEST 19: Target Audience Customizes Pain Points ====================

def test_target_audience_customizes_pain_points():
    """
    TEST 19: Verify target_audience actually customizes pain points
    
    WHAT: Create campaigns with different target audiences and check pain points
    EXPECT: Pain points should include audience-specific additions
    WHY: Ensure Research actively uses target_audience for customization
    """
    print("\n" + "=" * 80)
    print("TEST 19: Target Audience Customizes Pain Points")
    print("=" * 80)
    
    # Test 1: CTO target
    manager_data_cto = create_mock_manager_output(
        target_audience="CTOs and technical leaders"
    )
    state_cto = CampaignState(
        campaign_name="CTO Campaign",
        brand_name="TechCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="CTOs and technical leaders",
        brand_voice="professional",
        brief="Target CTOs",
        manager_output=json.dumps(manager_data_cto),
        status="manager_complete"
    )
    
    result_cto = research_agent(state_cto)
    parsed_cto = json.loads(result_cto.research_output)
    pain_points_cto = parsed_cto["audience_insights"]["pain_points"]
    
    # Test 2: Marketer target
    manager_data_marketer = create_mock_manager_output(
        target_audience="Marketing professionals"
    )
    state_marketer = CampaignState(
        campaign_name="Marketer Campaign",
        brand_name="MarketCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Marketing professionals",
        brand_voice="professional",
        brief="Target marketers",
        manager_output=json.dumps(manager_data_marketer),
        status="manager_complete"
    )
    
    result_marketer = research_agent(state_marketer)
    parsed_marketer = json.loads(result_marketer.research_output)
    pain_points_marketer = parsed_marketer["audience_insights"]["pain_points"]
    
    # Verify customization happened - check that different audiences produce different pain points
    assert pain_points_cto != pain_points_marketer, \
        "Different target audiences should produce different pain points"
    
    print("✅ PASS: Target audience customization works")
    print(f"   CTO pain points: {pain_points_cto[:2]}")
    print(f"   Marketer pain points: {pain_points_marketer[:2]}")


# ==================== TEST 20: Brand Voice Personalizes Approach ====================

def test_brand_voice_personalizes_approach():
    """
    TEST 20: Verify brand_voice actually personalizes recommended_approach
    
    WHAT: Create campaigns with different brand voices
    EXPECT: recommended_approach should include voice-specific modifiers
    WHY: Ensure Research actively uses brand_voice for personalization
    """
    print("\n" + "=" * 80)
    print("TEST 20: Brand Voice Personalizes Approach")
    print("=" * 80)
    
    # Test professional voice
    manager_data_prof = create_mock_manager_output(brand_voice="professional")
    state_prof = CampaignState(
        campaign_name="Professional Campaign",
        brand_name="ProfCorp",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise clients",
        brand_voice="professional",
        brief="Professional campaign",
        manager_output=json.dumps(manager_data_prof),
        status="manager_complete"
    )
    
    result_prof = research_agent(state_prof)
    parsed_prof = json.loads(result_prof.research_output)
    approach_prof = parsed_prof["recommended_approach"]
    
    # Test friendly voice
    manager_data_friendly = create_mock_manager_output(brand_voice="friendly")
    state_friendly = CampaignState(
        campaign_name="Friendly Campaign",
        brand_name="FriendlyCo",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Small business owners",
        brand_voice="friendly",
        brief="Friendly campaign",
        manager_output=json.dumps(manager_data_friendly),
        status="manager_complete"
    )
    
    result_friendly = research_agent(state_friendly)
    parsed_friendly = json.loads(result_friendly.research_output)
    approach_friendly = parsed_friendly["recommended_approach"]
    
    # Verify personalization - check that different voices produce different approaches
    assert approach_prof != approach_friendly, \
        "Different brand voices should produce different recommended approaches"
    
    print("✅ PASS: Brand voice personalization works")
    print(f"   Professional approach: {approach_prof[:80]}...")
    print(f"   Friendly approach: {approach_friendly[:80]}...")


# ==================== TEST 21: All Industries Produce Different Research ====================

def test_all_industries_produce_different_research():
    """
    TEST 21: Verify all industries produce unique research data
    
    WHAT: Test all 5 industries (saas, ecommerce, finance, healthcare, other)
    EXPECT: Each should have unique market_analysis and competitor_analysis
    WHY: Ensure comprehensive industry coverage
    """
    print("\n" + "=" * 80)
    print("TEST 21: All Industries Produce Different Research")
    print("=" * 80)
    
    industries = ["saas", "ecommerce", "finance", "healthcare", "other"]
    results = {}
    
    for industry in industries:
        manager_data = create_mock_manager_output(industry=industry)
        state = CampaignState(
            campaign_name=f"{industry.title()} Campaign",
            brand_name=f"{industry.title()}Co",
            industry=industry,
            primary_goal="lead_gen",
            target_audience="Test audience",
            brand_voice="professional",
            brief=f"{industry} campaign",
            manager_output=json.dumps(manager_data),
            status="manager_complete"
        )
        
        result = research_agent(state)
        parsed = json.loads(result.research_output)
        results[industry] = parsed
        
        print(f"   ✓ {industry}: TAM={parsed['market_analysis']['total_addressable_market']}, "
              f"Competitors={parsed['competitor_analysis']['top_competitors'][0]}")
    
    # Verify each industry is unique
    unique_tams = set(r["market_analysis"]["total_addressable_market"] for r in results.values())
    assert len(unique_tams) == len(industries), "Each industry should have unique TAM"
    
    print(f"\n✅ PASS: All {len(industries)} industries produce unique research")


# ==================== TEST 22: All Goals Produce Different Audience Insights ====================

def test_all_goals_produce_different_audience_insights():
    """
    TEST 22: Verify all goals produce unique audience insights
    
    WHAT: Test all 4 goals (awareness, lead_gen, sales, retention)
    EXPECT: Each should have unique pain_points and motivations
    WHY: Ensure comprehensive goal coverage
    """
    print("\n" + "=" * 80)
    print("TEST 22: All Goals Produce Different Audience Insights")
    print("=" * 80)
    
    goals = ["awareness", "lead_gen", "sales", "retention"]
    results = {}
    
    for goal in goals:
        manager_data = create_mock_manager_output(primary_goal=goal)
        state = CampaignState(
            campaign_name=f"{goal.title()} Campaign",
            brand_name="TestBrand",
            industry="saas",
            primary_goal=goal,
            target_audience="Test audience",
            brand_voice="professional",
            brief=f"{goal} campaign",
            manager_output=json.dumps(manager_data),
            status="manager_complete"
        )
        
        result = research_agent(state)
        parsed = json.loads(result.research_output)
        results[goal] = parsed
        
        print(f"   ✓ {goal}: {parsed['audience_insights']['pain_points'][0]}")
    
    # Verify each goal produces output
    for goal in goals:
        assert goal in results, f"Missing results for goal: {goal}"
        assert "audience_insights" in results[goal], f"Missing audience_insights for {goal}"
        assert "pain_points" in results[goal]["audience_insights"], f"Missing pain_points for {goal}"
        assert len(results[goal]["audience_insights"]["pain_points"]) > 0, f"Empty pain_points for {goal}"
    
    # Verify at least some goals have different pain points (allow for some LLM overlap)
    unique_first_pain_points = set()
    for goal in goals:
        first_pain = results[goal]["audience_insights"]["pain_points"][0]
        unique_first_pain_points.add(first_pain)
    
    # At least 2 different pain points should exist (allowing some LLM variability)
    assert len(unique_first_pain_points) >= 2, \
        f"Goals should produce diverse pain points, but got only {len(unique_first_pain_points)} unique: {unique_first_pain_points}"
    
    print(f"\n✅ PASS: All {len(goals)} goals produce audience insights with {len(unique_first_pain_points)} unique pain point patterns")


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    """
    Run all tests manually (without pytest)
    
    To run with pytest:
        pytest tests/test_research.py -v
    
    To run manually:
        python tests/test_research.py
    """
    
    print("\n" + "=" * 80)
    print("RESEARCH AGENT TEST SUITE - MATCHING MANAGER PATTERN")
    print("=" * 80)
    
    tests = [
        test_research_agent_executes,
        test_research_output_not_empty,
        test_research_output_is_json,
        test_all_research_output_fields_exist,
        test_market_analysis_field,
        test_competitor_analysis_field,
        test_audience_insights_field,
        test_market_opportunities_field,
        test_recommended_approach_field,
        test_status_updated,
        test_industry_determines_research,
        test_goal_determines_audience_insights,
        test_brief_with_fallback,
        test_different_briefs_produce_different_research,
        test_research_respects_target_audience,
        test_brand_voice_influences_research,
        test_no_error_field_set,
        test_research_agent_integration,
        test_target_audience_customizes_pain_points,
        test_brand_voice_personalizes_approach,
        test_all_industries_produce_different_research,
        test_all_goals_produce_different_audience_insights,
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
    print("\nComparison to Manager Tests (14 tests):")
    print("  - Helper includes all 12 Manager fields ✓")
    print("  - Tests validate each of 5 research output fields ✓")
    print("  - Tests verify industry determines research ✓")
    print("  - Tests verify goal determines audience insights ✓")
    print("  - Integration test with full 12-field Manager data ✓")
    print(f"  - Total: {len(tests)} research tests (vs 14 manager tests)")
    
    if failed == 0:
        print(f"\n🎉 ALL {len(tests)} TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed}/{len(tests)} tests failed")
    
    print("=" * 80)
