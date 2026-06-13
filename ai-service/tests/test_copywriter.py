"""
TEST SUITE FOR COPYWRITER AGENT

Tests verify that Copywriter Agent:
1. Takes strategy_output from Strategy Agent (13 fields) as PRIMARY input
2. Reads metadata (brand_name, brand_voice, brief) from state directly
3. Produces channel-organized copy output (email, linkedin, social, ads, messaging_framework)
4. All copy contains required sub-fields (subject/headline/body/ctas)
5. Copy reflects brand_voice, inferred_goal, and research pain points
6. Status is updated to 'copy_complete'

Copywriter Agent Output Structure:
{
  "inferred_goal": str,
  "email": { "subject", "headline", "body", "ctas" },
  "linkedin": { "headline", "body", "ctas" },
  "social": { "headline", "body", "ctas" },
  "ads": { "headline", "body", "ctas" },
  "messaging_framework": { "brand_promise", "message_hierarchy", "segment_messaging",
                           "channel_messaging", "voice_guidelines", "messaging_principles" },
  "strategic_alignment": { ... },
  "copy_readiness": { ... }
}

NOTE: campaign_name, brand_name, brand_voice are NOT in copy_output - they are read from state directly

Test Framework: pytest
Run: pytest tests/test_copywriter.py -v
"""

import sys
from pathlib import Path
import json

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import pytest
except ImportError:
    pytest = None

from agents.state import CampaignState
from agents.copywriter import copywriter_agent


# ==================== HELPER FUNCTIONS ====================

def create_mock_strategy_output(
    campaign_name="Test Campaign",
    brand_name="TestBrand",
    positioning="Enterprise AI without the complexity",
    key_messages=None,
    content_pillars=None,
    audience_segments=None,
    inferred_goal="lead_gen",
    competitors=None,
    competitive_advantage=None,
    primary_differentiation=None,
    channels=None,
    deliverables=None,
    pain_points=None,
    motivations=None,
    market_trends=None,
    recommended_approach="Create gated content and webinars to build qualified lead pipeline"
):
    """
    Helper to create realistic mock strategy output.

    This simulates what the Strategy Agent would produce (13 fields).
    """
    if key_messages is None:
        key_messages = [
            "Deploy powerful AI workflows in hours, not months",
            "Eliminate integration complexity and costs",
            "Scale operations with enterprise-grade reliability"
        ]
    if content_pillars is None:
        content_pillars = [
            "AI automation insights",
            "ROI and efficiency strategies",
            "Enterprise success stories",
            "Cost comparison analysis"
        ]
    if audience_segments is None:
        audience_segments = [
            {
                "segment_name": "High-Intent Enterprise",
                "pain_point": "Integration complexity",
                "motivation": "Save time and money",
                "channels": ["linkedin", "tech blogs"]
            },
            {
                "segment_name": "Growth-Stage Teams",
                "pain_point": "Long setup time",
                "motivation": "Scale operations",
                "channels": ["product hunt", "startup newsletters"]
            },
            {
                "segment_name": "Technical Leaders",
                "pain_point": "Complex setup and maintenance",
                "motivation": "Focus on innovation",
                "channels": ["industry blogs", "webinars"]
            }
        ]
    if competitors is None:
        competitors = ["Zapier", "Make", "n8n"]
    if competitive_advantage is None:
        competitive_advantage = f"While Zapier and Make focus on complexity, {brand_name} delivers enterprise AI without the complexity"
    if primary_differentiation is None:
        primary_differentiation = "Enterprise AI without the complexity - easier integration and faster setup"
    if channels is None:
        channels = ["linkedin", "tech blogs", "product hunt"]
    if deliverables is None:
        deliverables = ["gated whitepaper", "landing page", "webinar"]
    if pain_points is None:
        pain_points = ["Integration complexity", "High costs", "Long setup time"]
    if motivations is None:
        motivations = ["Save time", "Reduce costs", "Scale operations"]
    if market_trends is None:
        market_trends = ["AI adoption", "automation", "cost reduction", "workflow optimization"]

    return {
        "positioning": positioning,
        "key_messages": key_messages,
        "content_pillars": content_pillars,
        "audience_segments": audience_segments,
        "channel_strategy": {
            "linkedin": {
                "priority": "HIGH",
                "rationale": "Audience prefers LinkedIn",
                "frequency": "4-5 posts per week",
                "content_focus": "Address integration complexity"
            }
        },
        "timeline": {
            "phase_1": {
                "name": "Planning & Setup",
                "duration": "Week 1",
                "focus": "Campaign setup"
            },
            "phase_2": {
                "name": "Content Creation",
                "duration": "Week 2-3",
                "focus": "Create content"
            }
        },
        "success_metrics": {
            "primary": ["Lead volume", "Conversion rate"],
            "targets": {"leads": "500+", "conversion": "3-5%"},
            "research_alignment": "Metrics support lead gen approach"
        },
        "competitive_differentiation": {
            "primary_differentiation": primary_differentiation,
            "competitors": competitors,
            "competitive_advantage": competitive_advantage,
            "market_position": "Target $50B market with 40% YoY growth"
        },
        "market_opportunities": [
            {"opportunity_1": "Vertical SaaS expansion", "execution": "Create content pillar"},
            {"opportunity_2": "AI-powered automation", "execution": "Thought leadership"},
        ],
        "strategic_approach": recommended_approach,
        "inferred_goal": inferred_goal,
        "research_foundation": {
            "market_analysis": {
                "total_addressable_market": "$50B",
                "growth_rate": "40% YoY",
                "market_trends": market_trends
            },
            "competitor_analysis": {
                "top_competitors": competitors,
                "differentiation_opportunity": primary_differentiation
            },
            "audience_insights": {
                "pain_points": pain_points,
                "motivations": motivations,
                "preferred_channels": ["LinkedIn", "Industry blogs", "Webinars"]
            },
            "market_opportunities": ["Vertical SaaS expansion", "AI-powered automation"],
            "recommended_approach": recommended_approach
        },
        "execution": {
            "channels": channels,
            "deliverables": deliverables,
            "budget_allocation": {
                "high_priority_channels": "50%",
                "medium_priority_channels": "30%",
                "content_creation": "15%",
                "community_management": "5%"
            }
        }
    }


def create_state_with_strategy(
    campaign_name="Test Campaign",
    brand_name="TestBrand",
    industry="saas",
    primary_goal="lead_gen",
    target_audience="Enterprise CTOs, tech leads",
    brand_voice="professional",
    brief="Test brief for copywriter",
    strategy_data=None
):
    """
    Helper to create a CampaignState ready for the Copywriter Agent.
    """
    if strategy_data is None:
        strategy_data = create_mock_strategy_output(
            campaign_name=campaign_name,
            brand_name=brand_name
        )

    state = CampaignState(
        campaign_name=campaign_name,
        brand_name=brand_name,
        industry=industry,
        primary_goal=primary_goal,
        target_audience=target_audience,
        brand_voice=brand_voice,
        brief=brief,
        strategy_output=json.dumps(strategy_data),
        status="strategy_complete"
    )
    return state


# ==================== TEST 1: Copywriter Agent Executes Without Error ====================

def test_copywriter_agent_executes():
    """
    TEST 1: Verify Copywriter Agent runs without crashing

    WHAT: Call copywriter_agent() with valid state
    EXPECT: Returns a state object (no error)
    """
    print("\n" + "=" * 80)
    print("TEST 1: Copywriter Agent Executes")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)

    assert result is not None, "Copywriter agent should return a state"
    assert isinstance(result, CampaignState), "Should return CampaignState object"

    print("✅ PASS: Copywriter Agent executed successfully")


# ==================== TEST 2: Copy Output is Not Empty ====================

def test_copy_output_not_empty():
    """
    TEST 2: Verify Copywriter Agent produces output

    WHAT: Check if copy_output field is filled
    EXPECT: copy_output should not be None or empty string
    """
    print("\n" + "=" * 80)
    print("TEST 2: Copy Output is Not Empty")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)

    assert result.copy_output is not None, "copy_output should not be None"
    assert result.copy_output != "", "copy_output should not be empty string"
    assert len(result.copy_output) > 0, "copy_output should have content"

    print(f"✅ PASS: Copy output exists ({len(result.copy_output)} characters)")


# ==================== TEST 3: Copy Output is Valid JSON ====================

def test_copy_output_is_json():
    """
    TEST 3: Verify Copy Output is valid JSON

    WHAT: Try to parse copy_output as JSON
    EXPECT: Should parse without error
    WHY: Next agents and frontend need to read this as JSON
    """
    print("\n" + "=" * 80)
    print("TEST 3: Copy Output is Valid JSON")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)

    try:
        parsed = json.loads(result.copy_output)
        assert isinstance(parsed, dict), "Parsed JSON should be a dictionary"
        print(f"✅ PASS: Copy output is valid JSON")
        print(f"   Keys in JSON: {list(parsed.keys())}")
    except json.JSONDecodeError as e:
        raise AssertionError(f"Copy output is not valid JSON: {e}")


# ==================== TEST 4: All Top-Level Output Fields Exist ====================

def test_all_top_level_fields_exist():
    """
    TEST 4: Verify all required top-level fields exist in copy output

    WHAT: Check copy_output contains every expected key
    EXPECT: inferred_goal, email, linkedin, social, ads,
            messaging_framework, strategic_alignment, copy_readiness
    WHY: Downstream consumers depend on all these fields
    NOTE: campaign_name, brand_name, brand_voice removed (read from state instead)
    """
    print("\n" + "=" * 80)
    print("TEST 4: All Top-Level Output Fields Exist")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)

    required_fields = [
        "inferred_goal",
        "email",
        "linkedin",
        "social",
        "ads",
        "messaging_framework",
        "strategic_alignment",
        "copy_readiness"
    ]

    for field in required_fields:
        assert field in parsed, f"Missing required field: {field}"
        assert parsed[field] is not None, f"Field '{field}' should not be None"

    print(f"✅ PASS: All top-level output fields exist")
    for field in required_fields:
        print(f"   ✓ {field}")


# ==================== TEST 5: Email Copy Has Required Sub-fields ====================

def test_email_copy_has_required_subfields():
    """
    TEST 5: Verify email copy contains all required sub-fields

    WHAT: Check email object has subject, headline, body, ctas
    EXPECT: All four keys present and non-empty
    WHY: Email rendering depends on these exact fields
    """
    print("\n" + "=" * 80)
    print("TEST 5: Email Copy Has Required Sub-fields")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    email = parsed["email"]

    required_subfields = ["subject", "headline", "body", "ctas"]

    for subfield in required_subfields:
        assert subfield in email, f"Email missing sub-field: {subfield}"
        assert email[subfield] is not None, f"Email '{subfield}' should not be None"

    # Type checks
    assert isinstance(email["subject"], str) and len(email["subject"]) > 0, "subject should be non-empty string"
    assert isinstance(email["headline"], str) and len(email["headline"]) > 0, "headline should be non-empty string"
    assert isinstance(email["body"], str) and len(email["body"]) > 0, "body should be non-empty string"
    assert isinstance(email["ctas"], dict) and len(email["ctas"]) > 0, "ctas should be non-empty dict"

    print(f"✅ PASS: Email copy has all required sub-fields")
    print(f"   Subject: {email['subject']}")
    print(f"   Headline: {email['headline'][:60]}...")
    print(f"   CTAs: {list(email['ctas'].keys())}")


# ==================== TEST 6: LinkedIn Copy Has Required Sub-fields ====================

def test_linkedin_copy_has_required_subfields():
    """
    TEST 6: Verify LinkedIn copy contains all required sub-fields

    WHAT: Check linkedin object has headline, body, ctas
    EXPECT: All three keys present and non-empty
    WHY: LinkedIn publishing depends on these exact fields
    """
    print("\n" + "=" * 80)
    print("TEST 6: LinkedIn Copy Has Required Sub-fields")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    linkedin = parsed["linkedin"]

    required_subfields = ["headline", "body", "ctas"]

    for subfield in required_subfields:
        assert subfield in linkedin, f"LinkedIn missing sub-field: {subfield}"
        assert linkedin[subfield] is not None, f"LinkedIn '{subfield}' should not be None"

    assert isinstance(linkedin["headline"], str) and len(linkedin["headline"]) > 0
    assert isinstance(linkedin["body"], str) and len(linkedin["body"]) > 0
    assert isinstance(linkedin["ctas"], dict) and len(linkedin["ctas"]) > 0

    print(f"✅ PASS: LinkedIn copy has all required sub-fields")
    print(f"   Headline: {linkedin['headline'][:60]}...")
    print(f"   CTAs: {list(linkedin['ctas'].keys())}")


# ==================== TEST 7: Social Copy Has Required Sub-fields ====================

def test_social_copy_has_required_subfields():
    """
    TEST 7: Verify social media copy contains all required sub-fields

    WHAT: Check social object has headline, body, ctas
    EXPECT: All three keys present and non-empty
    WHY: Social media scheduler depends on these exact fields
    """
    print("\n" + "=" * 80)
    print("TEST 7: Social Copy Has Required Sub-fields")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    social = parsed["social"]

    required_subfields = ["headline", "body", "ctas"]

    for subfield in required_subfields:
        assert subfield in social, f"Social missing sub-field: {subfield}"
        assert social[subfield] is not None, f"Social '{subfield}' should not be None"

    assert isinstance(social["headline"], str) and len(social["headline"]) > 0
    assert isinstance(social["body"], str) and len(social["body"]) > 0
    assert isinstance(social["ctas"], dict) and len(social["ctas"]) > 0

    print(f"✅ PASS: Social copy has all required sub-fields")
    print(f"   Headline: {social['headline'][:60]}...")
    print(f"   CTAs: {list(social['ctas'].keys())}")


# ==================== TEST 8: Ads Copy Has Required Sub-fields ====================

def test_ads_copy_has_required_subfields():
    """
    TEST 8: Verify ads copy contains all required sub-fields

    WHAT: Check ads object has headline, body, ctas
    EXPECT: All three keys present and non-empty
    WHY: Ad platform integration depends on these exact fields
    """
    print("\n" + "=" * 80)
    print("TEST 8: Ads Copy Has Required Sub-fields")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    ads = parsed["ads"]

    required_subfields = ["headline", "body", "ctas"]

    for subfield in required_subfields:
        assert subfield in ads, f"Ads missing sub-field: {subfield}"
        assert ads[subfield] is not None, f"Ads '{subfield}' should not be None"

    assert isinstance(ads["headline"], str) and len(ads["headline"]) > 0
    assert isinstance(ads["body"], str) and len(ads["body"]) > 0
    assert isinstance(ads["ctas"], dict) and len(ads["ctas"]) > 0

    print(f"✅ PASS: Ads copy has all required sub-fields")
    print(f"   Headline: {ads['headline'][:60]}...")
    print(f"   CTAs: {list(ads['ctas'].keys())}")


# ==================== TEST 9: Messaging Framework Has Required Sub-fields ====================

def test_messaging_framework_has_required_subfields():
    """
    TEST 9: Verify messaging_framework contains all required sub-fields

    WHAT: Check messaging_framework has brand_promise, message_hierarchy,
          segment_messaging, channel_messaging, voice_guidelines, messaging_principles
    EXPECT: All six keys present and non-empty
    WHY: Brand consistency tools depend on this framework
    """
    print("\n" + "=" * 80)
    print("TEST 9: Messaging Framework Has Required Sub-fields")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    framework = parsed["messaging_framework"]

    required_subfields = [
        "brand_promise",
        "message_hierarchy",
        "segment_messaging",
        "channel_messaging",
        "voice_guidelines",
        "messaging_principles"
    ]

    for subfield in required_subfields:
        assert subfield in framework, f"Messaging framework missing sub-field: {subfield}"
        assert framework[subfield] is not None, f"Framework '{subfield}' should not be None"

    assert isinstance(framework["brand_promise"], str) and len(framework["brand_promise"]) > 0
    assert isinstance(framework["message_hierarchy"], dict)
    assert isinstance(framework["segment_messaging"], list) and len(framework["segment_messaging"]) > 0
    assert isinstance(framework["channel_messaging"], dict) and len(framework["channel_messaging"]) > 0
    assert isinstance(framework["messaging_principles"], list) and len(framework["messaging_principles"]) > 0

    print(f"✅ PASS: Messaging framework has all required sub-fields")
    for subfield in required_subfields:
        print(f"   ✓ {subfield}")


# ==================== TEST 10: Status Updated ====================

def test_status_updated():
    """
    TEST 10: Verify status is updated to 'copy_complete'

    WHAT: Check if status field is updated
    EXPECT: status should be 'copy_complete'
    WHY: Next agent checks status to know when to start
    """
    print("\n" + "=" * 80)
    print("TEST 10: Status Updated")
    print("=" * 80)

    state = create_state_with_strategy()
    assert state.status == "strategy_complete", "Initial status should be 'strategy_complete'"

    result = copywriter_agent(state)

    assert result.status == "copy_complete", "Status should be updated to 'copy_complete'"

    print(f"✅ PASS: Status updated correctly")
    print(f"   Before: strategy_complete")
    print(f"   After: {result.status}")


# ==================== TEST 11: Brand Name Appears in Copy ====================

def test_brand_name_appears_in_copy():
    """
    TEST 11: Verify brand name is consistently used across all copy channels

    WHAT: Check brand name appears in email, linkedin, social, and ads copy
    EXPECT: brand_name should appear in at least the subject/headline of each channel
    WHY: Brand consistency is a core requirement for all copy
    NOTE: brand_name not in copy_output (read from state), but must appear in copy content
    """
    print("\n" + "=" * 80)
    print("TEST 11: Brand Name Appears in Copy")
    print("=" * 80)

    brand = "UniqueTestBrand"
    strategy_data = create_mock_strategy_output(brand_name=brand)
    state = create_state_with_strategy(brand_name=brand, strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)

    # Verify brand_name NOT in output (should read from state)
    assert "brand_name" not in parsed, "brand_name should NOT be in copy_output (read from state instead)"

    # But verify brand name IS used in actual copy content
    email_text = parsed["email"]["subject"] + " " + parsed["email"]["headline"] + " " + parsed["email"]["body"]
    linkedin_text = parsed["linkedin"]["headline"] + " " + parsed["linkedin"]["body"]
    social_text = parsed["social"]["headline"] + " " + parsed["social"]["body"]
    ads_text = parsed["ads"]["headline"] + " " + parsed["ads"]["body"]

    assert brand in email_text, f"Brand name '{brand}' should appear in email copy"
    assert brand in linkedin_text, f"Brand name '{brand}' should appear in LinkedIn copy"
    assert brand in social_text, f"Brand name '{brand}' should appear in social copy"
    assert brand in ads_text, f"Brand name '{brand}' should appear in ads copy"

    print(f"✅ PASS: Brand name '{brand}' appears consistently across all channels")
    print(f"   (brand_name correctly NOT in output - read from state instead)")


# ==================== TEST 12: Email Subject Line Length ====================

def test_email_subject_line_length():
    """
    TEST 12: Verify email subject line respects character limit

    WHAT: Check email subject is 60 chars or fewer (standard email limit)
    EXPECT: Subject length <= 60 characters
    WHY: Email clients truncate subjects beyond 60 characters
    """
    print("\n" + "=" * 80)
    print("TEST 12: Email Subject Line Length")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    subject = parsed["email"]["subject"]

    assert len(subject) <= 60, f"Email subject should be <= 60 chars but got {len(subject)}: '{subject}'"

    print(f"✅ PASS: Email subject is within limit")
    print(f"   Subject ({len(subject)} chars): {subject}")


# ==================== TEST 13: Social Headline Length ====================

def test_social_headline_length():
    """
    TEST 13: Verify social media headline respects character limit

    WHAT: Check social headline is 140 chars or fewer (Twitter/X limit)
    EXPECT: Headline length <= 140 characters
    WHY: Social media platforms truncate beyond character limits
    """
    print("\n" + "=" * 80)
    print("TEST 13: Social Headline Length")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    headline = parsed["social"]["headline"]

    assert len(headline) <= 140, f"Social headline should be <= 140 chars but got {len(headline)}"

    print(f"✅ PASS: Social headline is within limit")
    print(f"   Headline ({len(headline)} chars): {headline}")


# ==================== TEST 14: Ads Headline Length ====================

def test_ads_headline_length():
    """
    TEST 14: Verify ads headline respects character limit

    WHAT: Check ads headline is 60 chars or fewer (Google Ads limit)
    EXPECT: Headline length <= 60 characters
    WHY: Ad platforms reject headlines that exceed character limits
    """
    print("\n" + "=" * 80)
    print("TEST 14: Ads Headline Length")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    headline = parsed["ads"]["headline"]

    assert len(headline) <= 60, f"Ads headline should be <= 60 chars but got {len(headline)}: '{headline}'"

    print(f"✅ PASS: Ads headline is within limit")
    print(f"   Headline ({len(headline)} chars): {headline}")


# ==================== TEST 15: Inferred Goal Determines CTA Strategy ====================

def test_inferred_goal_determines_cta_strategy():
    """
    TEST 15: Verify inferred_goal produces goal-appropriate CTAs

    WHAT: Create campaigns with different inferred goals, check CTAs
    EXPECT: lead_gen should have lead-focused CTAs; sales should have demo/purchase CTAs
    WHY: CTAs must align with campaign objective
    """
    print("\n" + "=" * 80)
    print("TEST 15: Inferred Goal Determines CTA Strategy")
    print("=" * 80)

    goal_keyword_map = {
        "lead_gen": ["Access", "access", "free", "Free"],
        "sales":    ["Demo", "demo", "ROI", "roi"],
        "retention":["Benefits", "benefits", "Upgrade", "upgrade"],
        "awareness":["Learn", "learn", "Meet", "meet"]
    }

    for goal, expected_keywords in goal_keyword_map.items():
        strategy_data = create_mock_strategy_output(inferred_goal=goal)
        state = create_state_with_strategy(
            campaign_name=f"{goal.title()} Campaign",
            strategy_data=strategy_data
        )

        result = copywriter_agent(state)
        parsed = json.loads(result.copy_output)

        # Check inferred_goal is stored correctly
        assert parsed["inferred_goal"] == goal, f"inferred_goal should be '{goal}'"

        # Combine all CTA text across channels
        all_ctas = (
            " ".join(parsed["email"]["ctas"].values()) + " " +
            " ".join(parsed["linkedin"]["ctas"].values()) + " " +
            " ".join(parsed["social"]["ctas"].values()) + " " +
            " ".join(parsed["ads"]["ctas"].values())
        )

        assert any(kw in all_ctas for kw in expected_keywords), \
            f"Goal '{goal}' should produce CTAs with keywords {expected_keywords}, got: {all_ctas[:200]}"

        print(f"   ✓ goal='{goal}': CTA keywords found ✓")

    print(f"\n✅ PASS: Inferred goal correctly shapes CTA strategy for all 4 goals")


# ==================== TEST 16: Pain Points Appear in Copy ====================

def test_pain_points_appear_in_copy():
    """
    TEST 16: Verify research pain points are used in copy

    WHAT: Create campaign with specific pain points, check copy references them
    EXPECT: Email body and/or ads body should mention the primary pain point
    WHY: Copy must speak directly to audience pain points (research-driven)
    """
    print("\n" + "=" * 80)
    print("TEST 16: Pain Points Appear in Copy")
    print("=" * 80)

    unique_pain = "legacy system migration nightmares"
    strategy_data = create_mock_strategy_output(
        pain_points=[unique_pain, "High costs", "Long setup"]
    )
    state = create_state_with_strategy(strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)

    # Pain points should show up in email body or ads body
    email_body = parsed["email"]["body"].lower()
    ads_body = parsed["ads"]["body"].lower()
    combined = email_body + " " + ads_body

    # The first pain point (or its words) should appear somewhere in copy
    pain_keywords = [w for w in unique_pain.lower().split() if len(w) > 4]
    found = any(kw in combined for kw in pain_keywords)

    assert found, f"Pain point keywords {pain_keywords} should appear in email or ads body"

    print(f"✅ PASS: Pain points referenced in copy")
    print(f"   Pain point: '{unique_pain}'")
    print(f"   Keywords found: {[kw for kw in pain_keywords if kw in combined]}")


# ==================== TEST 17: Brand Voice Shapes Voice Guidelines ====================

def test_brand_voice_shapes_voice_guidelines():
    """
    TEST 17: Verify brand_voice produces matching voice guidelines

    WHAT: Create campaigns with different brand voices
    EXPECT: messaging_framework.voice_guidelines should match the brand voice
    WHY: Voice guidelines are the source of truth for creative consistency
    """
    print("\n" + "=" * 80)
    print("TEST 17: Brand Voice Shapes Voice Guidelines")
    print("=" * 80)

    voice_keyword_map = {
        "professional": ["industry", "data", "concise", "professional"],
        "friendly":     ["conversational", "questions", "stories", "tone"],
        "bold":         ["strong", "provocative", "challenge", "status quo"],
        "luxury":       ["premium", "exclusive", "sophisticated", "exclusivity"]
    }

    for voice, expected_keywords in voice_keyword_map.items():
        strategy_data = create_mock_strategy_output()
        state = create_state_with_strategy(brand_voice=voice, strategy_data=strategy_data)

        result = copywriter_agent(state)
        parsed = json.loads(result.copy_output)
        guidelines = parsed["messaging_framework"]["voice_guidelines"]

        do_text = " ".join(guidelines.get("do", [])).lower()
        dont_text = " ".join(guidelines.get("dont", [])).lower()
        combined = do_text + " " + dont_text

        assert any(kw in combined for kw in expected_keywords), \
            f"Voice '{voice}' guidelines should mention {expected_keywords}, got: {combined}"

        print(f"   ✓ voice='{voice}': guidelines contain expected keywords ✓")

    print(f"\n✅ PASS: Brand voice produces matching voice guidelines for all 4 voices")


# ==================== TEST 18: Positioning Used in Messaging Framework ====================

def test_positioning_used_in_messaging_framework():
    """
    TEST 18: Verify positioning is embedded in messaging framework brand promise

    WHAT: Check brand_promise contains strategy positioning text
    EXPECT: brand_promise should include the brand name and positioning
    WHY: Brand promise is the north star for all downstream copy
    """
    print("\n" + "=" * 80)
    print("TEST 18: Positioning Used in Messaging Framework")
    print("=" * 80)

    unique_positioning = "The only AI platform that never requires IT involvement"
    strategy_data = create_mock_strategy_output(
        brand_name="NitroAI",
        positioning=unique_positioning
    )
    state = create_state_with_strategy(brand_name="NitroAI", strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    brand_promise = parsed["messaging_framework"]["brand_promise"]

    assert "NitroAI" in brand_promise, "Brand promise should include brand name"
    assert unique_positioning in brand_promise, \
        f"Brand promise should include positioning: {unique_positioning}"

    print(f"✅ PASS: Positioning embedded in brand promise")
    print(f"   Brand Promise: {brand_promise}")


# ==================== TEST 19: Key Messages Appear in Message Hierarchy ====================

def test_key_messages_appear_in_message_hierarchy():
    """
    TEST 19: Verify key messages from strategy appear in messaging framework hierarchy

    WHAT: Check message_hierarchy.level_1_primary uses strategy key messages
    EXPECT: Primary message level should match first key message
    WHY: Message hierarchy is the structured use of strategy key messages
    """
    print("\n" + "=" * 80)
    print("TEST 19: Key Messages Appear in Message Hierarchy")
    print("=" * 80)

    unique_message = "Zero to deployed in under 24 hours - guaranteed"
    strategy_data = create_mock_strategy_output(
        key_messages=[unique_message, "Reduce operational costs by 40%", "Scale instantly"]
    )
    state = create_state_with_strategy(strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    hierarchy = parsed["messaging_framework"]["message_hierarchy"]

    assert "level_1_primary" in hierarchy, "Message hierarchy should have level_1_primary"
    assert unique_message in hierarchy["level_1_primary"], \
        "Primary message should match first strategy key message"

    print(f"✅ PASS: Key messages appear in message hierarchy")
    print(f"   Level 1: {hierarchy['level_1_primary']}")


# ==================== TEST 20: Segment Messaging Matches Audience Segments ====================

def test_segment_messaging_matches_audience_segments():
    """
    TEST 20: Verify segment messaging aligns with strategy audience segments

    WHAT: Check segment_messaging count matches audience_segments count (up to 3)
    EXPECT: Each segment should have dedicated messaging
    WHY: Personalised messaging per segment is a core copywriter responsibility
    """
    print("\n" + "=" * 80)
    print("TEST 20: Segment Messaging Matches Audience Segments")
    print("=" * 80)

    custom_segments = [
        {
            "segment_name": "Enterprise CTOs",
            "pain_point": "Legacy integration",
            "motivation": "Reduce technical debt",
            "channels": ["linkedin"]
        },
        {
            "segment_name": "Startup Founders",
            "pain_point": "Limited budget",
            "motivation": "Fast time to market",
            "channels": ["product hunt"]
        },
        {
            "segment_name": "IT Managers",
            "pain_point": "Security compliance",
            "motivation": "Reduce risk",
            "channels": ["tech blogs"]
        }
    ]

    strategy_data = create_mock_strategy_output(audience_segments=custom_segments)
    state = create_state_with_strategy(strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    segment_messaging = parsed["messaging_framework"]["segment_messaging"]

    assert len(segment_messaging) == len(custom_segments), \
        f"Should have {len(custom_segments)} segment messages, got {len(segment_messaging)}"

    for sm in segment_messaging:
        assert "segment" in sm, "Each segment message should have 'segment' field"
        assert "message" in sm, "Each segment message should have 'message' field"
        assert "tone" in sm, "Each segment message should have 'tone' field"

    print(f"✅ PASS: Segment messaging aligns with audience segments")
    for sm in segment_messaging:
        print(f"   ✓ Segment: {sm['segment']}")


# ==================== TEST 21: Strategic Alignment Section Populated ====================

def test_strategic_alignment_section_populated():
    """
    TEST 21: Verify strategic_alignment section is correctly populated

    WHAT: Check strategic_alignment contains positioning, key_messages_count, deliverables
    EXPECT: All sub-fields present and values reflect strategy input
    WHY: strategic_alignment is the QA record linking copy to strategy
    """
    print("\n" + "=" * 80)
    print("TEST 21: Strategic Alignment Section Populated")
    print("=" * 80)

    strategy_data = create_mock_strategy_output(
        deliverables=["landing page", "email series", "social kit"]
    )
    state = create_state_with_strategy(strategy_data=strategy_data)

    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    alignment = parsed["strategic_alignment"]

    assert "positioning_used" in alignment, "Should have positioning_used"
    assert "key_messages_count" in alignment, "Should have key_messages_count"
    assert "content_pillars_count" in alignment, "Should have content_pillars_count"
    assert "audience_segments_count" in alignment, "Should have audience_segments_count"
    assert "deliverables" in alignment, "Should have deliverables"

    assert isinstance(alignment["key_messages_count"], int) and alignment["key_messages_count"] > 0
    assert isinstance(alignment["deliverables"], list)

    print(f"✅ PASS: Strategic alignment section populated")
    print(f"   Positioning: {alignment['positioning_used'][:50]}...")
    print(f"   Key Messages: {alignment['key_messages_count']}")
    print(f"   Deliverables: {alignment['deliverables']}")


# ==================== TEST 22: Copy Readiness Flags All Channels Ready ====================

def test_copy_readiness_flags_all_channels():
    """
    TEST 22: Verify copy_readiness marks all channels as ready

    WHAT: Check copy_readiness contains True for all channels
    EXPECT: email_ready, linkedin_ready, social_ready, ads_ready, messaging_framework_complete
            should all be True
    WHY: copy_readiness is the handoff signal to the next agent
    """
    print("\n" + "=" * 80)
    print("TEST 22: Copy Readiness Flags All Channels Ready")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    readiness = parsed["copy_readiness"]

    expected_flags = [
        "email_ready",
        "linkedin_ready",
        "social_ready",
        "ads_ready",
        "messaging_framework_complete"
    ]

    for flag in expected_flags:
        assert flag in readiness, f"copy_readiness missing flag: {flag}"
        assert readiness[flag] is True, f"copy_readiness.{flag} should be True"

    print(f"✅ PASS: All copy readiness flags are True")
    for flag in expected_flags:
        print(f"   ✓ {flag}: {readiness[flag]}")


# ==================== TEST 23: Different Inferred Goals Produce Different Email Subjects ====================

def test_different_goals_produce_different_email_subjects():
    """
    TEST 23: Verify different inferred goals produce different email subjects

    WHAT: Run copywriter with all 4 inferred goals, collect subjects
    EXPECT: All 4 subjects should be unique
    WHY: Goal-specific copy prevents misaligned messaging
    """
    print("\n" + "=" * 80)
    print("TEST 23: Different Goals Produce Different Email Subjects")
    print("=" * 80)

    goals = ["awareness", "lead_gen", "sales", "retention"]
    subjects = {}

    for goal in goals:
        strategy_data = create_mock_strategy_output(inferred_goal=goal)
        state = create_state_with_strategy(strategy_data=strategy_data)
        result = copywriter_agent(state)
        parsed = json.loads(result.copy_output)
        subjects[goal] = parsed["email"]["subject"]

    unique_subjects = set(subjects.values())
    assert len(unique_subjects) == len(goals), \
        f"All 4 goals should produce unique email subjects. Got: {subjects}"

    print(f"✅ PASS: All 4 goals produce unique email subjects")
    for goal, subject in subjects.items():
        print(f"   {goal}: {subject}")


# ==================== TEST 24: Different Brands Produce Different Copy ====================

def test_different_brands_produce_different_copy():
    """
    TEST 24: Verify different brand names produce different copy

    WHAT: Run copywriter with two different brand names
    EXPECT: copy_output should differ (brand name embedded in copy)
    WHY: Brand-specific copy must not bleed across campaigns
    """
    print("\n" + "=" * 80)
    print("TEST 24: Different Brands Produce Different Copy")
    print("=" * 80)

    strategy1 = create_mock_strategy_output(brand_name="AlphaAI")
    state1 = create_state_with_strategy(brand_name="AlphaAI", strategy_data=strategy1)

    strategy2 = create_mock_strategy_output(brand_name="BetaBot")
    state2 = create_state_with_strategy(brand_name="BetaBot", strategy_data=strategy2)

    result1 = copywriter_agent(state1)
    result2 = copywriter_agent(state2)

    assert result1.copy_output != result2.copy_output, \
        "Different brands should produce different copy"

    parsed1 = json.loads(result1.copy_output)
    parsed2 = json.loads(result2.copy_output)

    assert "AlphaAI" in parsed1["email"]["body"], "Brand 1 copy should mention AlphaAI"
    assert "BetaBot" in parsed2["email"]["body"], "Brand 2 copy should mention BetaBot"

    print(f"✅ PASS: Different brands produce different copy")
    print(f"   Brand 1 email subject: {parsed1['email']['subject']}")
    print(f"   Brand 2 email subject: {parsed2['email']['subject']}")


# ==================== TEST 25: Channel Messaging in Framework Covers Required Channels ====================

def test_channel_messaging_covers_required_channels():
    """
    TEST 25: Verify channel_messaging in framework covers all standard channels

    WHAT: Check channel_messaging has entries for email, linkedin, social, ads
    EXPECT: All 4 channel sections present with tone, themes, frequency, format
    WHY: Channel messaging guides content teams for each platform
    """
    print("\n" + "=" * 80)
    print("TEST 25: Channel Messaging Covers Required Channels")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    channel_messaging = parsed["messaging_framework"]["channel_messaging"]

    required_channels = ["email", "linkedin", "social", "ads"]
    required_channel_fields = ["tone", "themes", "frequency", "format"]

    for channel in required_channels:
        assert channel in channel_messaging, f"channel_messaging missing channel: {channel}"
        channel_data = channel_messaging[channel]
        for field in required_channel_fields:
            assert field in channel_data, \
                f"Channel '{channel}' missing field: {field}"

    print(f"✅ PASS: Channel messaging covers all required channels")
    for channel in required_channels:
        print(f"   ✓ {channel}: {channel_messaging[channel]['tone']}")


# ==================== TEST 26: Email CTAs Include Hero CTA ====================

def test_email_ctas_include_hero_cta():
    """
    TEST 26: Verify email CTAs always include a hero_cta

    WHAT: Check email.ctas has hero_cta key
    EXPECT: hero_cta should be non-empty string
    WHY: Email templates universally expect a primary hero CTA
    """
    print("\n" + "=" * 80)
    print("TEST 26: Email CTAs Include Hero CTA")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    ctas = parsed["email"]["ctas"]

    assert "hero_cta" in ctas, "Email CTAs should include hero_cta"
    assert isinstance(ctas["hero_cta"], str) and len(ctas["hero_cta"]) > 0, \
        "hero_cta should be a non-empty string"

    print(f"✅ PASS: Email CTAs include hero_cta")
    print(f"   Hero CTA: {ctas['hero_cta']}")


# ==================== TEST 27: Messaging Principles List is Non-Empty ====================

def test_messaging_principles_list_is_non_empty():
    """
    TEST 27: Verify messaging_principles list is non-empty

    WHAT: Check messaging_principles has at least one principle
    EXPECT: List length >= 1
    WHY: Principles guide creative team to maintain brand consistency
    """
    print("\n" + "=" * 80)
    print("TEST 27: Messaging Principles List is Non-Empty")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)
    parsed = json.loads(result.copy_output)
    principles = parsed["messaging_framework"]["messaging_principles"]

    assert isinstance(principles, list), "messaging_principles should be a list"
    assert len(principles) >= 1, "messaging_principles should not be empty"
    assert all(isinstance(p, str) for p in principles), "All principles should be strings"

    print(f"✅ PASS: Messaging principles list is non-empty")
    for principle in principles:
        print(f"   • {principle}")


# ==================== TEST 28: No Error Field Set on Success ====================

def test_no_error_field_set_on_success():
    """
    TEST 28: Verify no error is set when copywriter completes successfully

    WHAT: Check error field after successful copywriting
    EXPECT: error field should be None
    WHY: Errors should only be set if something fails
    """
    print("\n" + "=" * 80)
    print("TEST 28: No Error Field Set on Success")
    print("=" * 80)

    state = create_state_with_strategy()
    result = copywriter_agent(state)

    assert result.error is None, "error field should be None on success"

    print(f"✅ PASS: No error field set")
    print(f"   error: {result.error}")


# ==================== TEST 29: Raises When strategy_output Missing ====================

def test_raises_when_strategy_output_missing():
    """
    TEST 29: Verify Copywriter Agent raises when strategy_output is missing

    WHAT: Call copywriter_agent() with no strategy_output
    EXPECT: Should raise ValueError
    WHY: Copywriter cannot operate without strategy; fail fast is better than silent errors
    """
    print("\n" + "=" * 80)
    print("TEST 29: Raises When strategy_output Missing")
    print("=" * 80)

    state = CampaignState(
        campaign_name="No Strategy",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Test",
        brand_voice="professional",
        brief="Test brief",
        strategy_output=None,   # Intentionally missing
        status="strategy_complete"
    )

    if pytest:
        with pytest.raises((ValueError, Exception)):
            copywriter_agent(state)
    else:
        try:
            copywriter_agent(state)
            assert False, "Should have raised an error"
        except (ValueError, Exception):
            pass  # Expected

    print(f"✅ PASS: Raises correctly when strategy_output is missing")


# ==================== TEST 30: Full Integration Test ====================

def test_copywriter_agent_integration():
    """
    TEST 30: Full integration test

    WHAT: Test complete flow with realistic strategy data matching AgentMark
    EXPECT: All validations pass, all 5 channels populated, brand voice consistent
    WHY: Ensure Copywriter Agent works end-to-end within the multi-agent pipeline
    """
    print("\n" + "=" * 80)
    print("TEST 30: Full Integration Test")
    print("=" * 80)

    strategy_data = create_mock_strategy_output(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        positioning="Enterprise AI without the complexity - easier integration and faster setup",
        key_messages=[
            "Deploy powerful AI workflows in hours, not months",
            "Eliminate integration complexity and costs",
            "Scale operations with enterprise-grade reliability"
        ],
        content_pillars=[
            "AI automation insights",
            "ROI and efficiency strategies",
            "Enterprise success stories",
            "Cost comparison analysis"
        ],
        inferred_goal="lead_gen",
        channels=["linkedin", "tech blogs", "product hunt"],
        deliverables=["gated whitepaper", "landing page", "webinar"],
        pain_points=["Integration complexity", "High costs", "Long setup time"],
        motivations=["Save time", "Reduce costs", "Scale operations"],
        market_trends=["AI adoption", "automation", "cost reduction", "workflow optimization"]
    )

    state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads, companies with 1000+ employees",
        brand_voice="professional",
        brief="Launch marketing campaign for AI automation platform targeting enterprise CTOs who struggle with integration complexity and want to scale operations efficiently",
        strategy_output=json.dumps(strategy_data),
        status="strategy_complete"
    )

    print(f"Input:")
    print(f"  campaign_name: Q3 Product Launch")
    print(f"  brand_name: AgentMark")
    print(f"  industry: saas")
    print(f"  brand_voice: professional")
    print(f"  inferred_goal: lead_gen")

    result = copywriter_agent(state)

    # Core state checks
    assert result.status == "copy_complete", f"Status should be 'copy_complete' but got {result.status}"
    assert result.copy_output is not None, "copy_output must be populated"
    assert len(result.copy_output) > 0, "copy_output must not be empty"
    assert result.error is None, f"error should be None but got {result.error}"

    # JSON validity
    parsed = json.loads(result.copy_output)
    assert isinstance(parsed, dict), "copy_output should be valid JSON dict"

    # All top-level fields
    for field in ["inferred_goal", "email", "linkedin", "social", "ads",
                  "messaging_framework", "strategic_alignment", "copy_readiness"]:
        assert field in parsed, f"Missing field: {field}"

    # Each channel has correct sub-fields
    for channel in ["linkedin", "social", "ads"]:
        for subfield in ["headline", "body", "ctas"]:
            assert subfield in parsed[channel], f"{channel} missing {subfield}"

    for subfield in ["subject", "headline", "body", "ctas"]:
        assert subfield in parsed["email"], f"email missing {subfield}"

    # Brand name present throughout
    assert "AgentMark" in parsed["email"]["body"]
    assert "AgentMark" in parsed["ads"]["body"]

    # All readiness flags are True
    for flag in ["email_ready", "linkedin_ready", "social_ready", "ads_ready",
                 "messaging_framework_complete"]:
        assert parsed["copy_readiness"][flag] is True

    print(f"\nOutput:")
    print(f"  status: {result.status} ✅")
    print(f"  campaign_name (from state): {state.campaign_name} ✅")
    print(f"  brand_name (from state): {state.brand_name} ✅")
    print(f"  brand_voice (from state): {state.brand_voice} ✅")
    print(f"  email subject: {parsed['email']['subject']} ✅")
    print(f"  linkedin headline: {parsed['linkedin']['headline'][:60]}... ✅")
    print(f"  social headline: {parsed['social']['headline'][:60]}... ✅")
    print(f"  ads headline: {parsed['ads']['headline']} ✅")
    print(f"  brand_promise: {parsed['messaging_framework']['brand_promise'][:60]}... ✅")
    print(f"  copy_output length: {len(result.copy_output)} chars ✅")
    print(f"  copy_output fields: 8 (metadata removed - read from state) ✅")
    print(f"\n✅ PASS: Full integration test successful")


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    """
    Run all tests manually (without pytest)

    To run with pytest:
        pytest tests/test_copywriter.py -v

    To run manually:
        python tests/test_copywriter.py
    """

    print("\n" + "=" * 80)
    print("COPYWRITER AGENT TEST SUITE")
    print("=" * 80)

    tests = [
        test_copywriter_agent_executes,
        test_copy_output_not_empty,
        test_copy_output_is_json,
        test_all_top_level_fields_exist,
        test_email_copy_has_required_subfields,
        test_linkedin_copy_has_required_subfields,
        test_social_copy_has_required_subfields,
        test_ads_copy_has_required_subfields,
        test_messaging_framework_has_required_subfields,
        test_status_updated,
        test_brand_name_appears_in_copy,
        test_email_subject_line_length,
        test_social_headline_length,
        test_ads_headline_length,
        test_inferred_goal_determines_cta_strategy,
        test_pain_points_appear_in_copy,
        test_brand_voice_shapes_voice_guidelines,
        test_positioning_used_in_messaging_framework,
        test_key_messages_appear_in_message_hierarchy,
        test_segment_messaging_matches_audience_segments,
        test_strategic_alignment_section_populated,
        test_copy_readiness_flags_all_channels,
        test_different_goals_produce_different_email_subjects,
        test_different_brands_produce_different_copy,
        test_channel_messaging_covers_required_channels,
        test_email_ctas_include_hero_cta,
        test_messaging_principles_list_is_non_empty,
        test_no_error_field_set_on_success,
        test_raises_when_strategy_output_missing,
        test_copywriter_agent_integration,
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
            print(f"❌ ERROR: {type(e).__name__}: {e}")

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"Total Tests: {len(tests)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"\nTest Coverage:")
    print(f"  - Agent execution and output not empty ✓")
    print(f"  - Valid JSON output ✓")
    print(f"  - All top-level fields present (11 fields) ✓")
    print(f"  - All channel sub-fields present (email/linkedin/social/ads) ✓")
    print(f"  - Messaging framework sub-fields present (6 sub-fields) ✓")
    print(f"  - Status updated to 'copy_complete' ✓")
    print(f"  - Brand name consistency across all channels ✓")
    print(f"  - Character limit compliance (email, social, ads) ✓")
    print(f"  - Goal-driven CTA strategy (all 4 goals) ✓")
    print(f"  - Pain points appear in copy ✓")
    print(f"  - Brand voice shapes voice guidelines (all 4 voices) ✓")
    print(f"  - Positioning in brand promise ✓")
    print(f"  - Key messages in message hierarchy ✓")
    print(f"  - Segment messaging alignment ✓")
    print(f"  - Strategic alignment section ✓")
    print(f"  - Copy readiness flags ✓")
    print(f"  - Multi-goal email subject uniqueness ✓")
    print(f"  - Multi-brand copy isolation ✓")
    print(f"  - Channel messaging coverage ✓")
    print(f"  - Hero CTA in email ✓")
    print(f"  - Messaging principles non-empty ✓")
    print(f"  - No error field on success ✓")
    print(f"  - Raises on missing strategy_output ✓")
    print(f"  - Full integration test ✓")
    print(f"  - Total: {len(tests)} copywriter tests")
    print(f"  - Output fields: 8 (inferred_goal + 4 channels + framework + alignment + readiness)")
    print(f"  - Metadata (campaign_name, brand_name, brand_voice) read from state (not duplicated)")

    if failed == 0:
        print(f"\n🎉 ALL {len(tests)} TESTS PASSED!")
    else:
        print(f"\n⚠️  {failed}/{len(tests)} tests failed")

    print("=" * 80)
    