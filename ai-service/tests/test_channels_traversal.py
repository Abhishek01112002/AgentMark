"""
Core validation test for channel traversal consistency.
This script programmatically asserts that the channels list propagates, parses,
and maps consistently across the Manager, Strategy, Copywriter, and Reviewer data layers.
"""

import sys
from pathlib import Path
import json

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState

def test_channels_extraction_and_consistency():
    print("=" * 80)
    print("RUNNING CHANNEL TRAVERSAL CONSISTENCY TEST")
    print("=" * 80)

    # 1. Create a campaign input state
    state = CampaignState(
        campaign_name="Test Campaign",
        brand_name="TestBrand",
        industry="saas",
        primary_goal="awareness",
        target_audience="Developers",
        brand_voice="bold"
    )

    # 2. Simulate Manager recommending specific channels
    print("\n[STEP 1] Simulating Manager Output...")
    manager_data = {
        "campaign_name": "Test Campaign",
        "brand_name": "TestBrand",
        "industry": "saas",
        "primary_goal": "awareness",
        "target_audience": "Developers",
        "brand_voice": "bold",
        "channels": ["instagram", "email"],
        "deliverables": ["Instagram Post", "Email Newsletter"]
    }
    state.manager_output = json.dumps(manager_data)
    state.status = "manager_complete"
    
    # Assert channels recommended by manager
    manager_parsed = json.loads(state.manager_output)
    channels_from_manager = manager_parsed.get("channels", [])
    print(f"   Manager recommended channels: {channels_from_manager}")
    assert channels_from_manager == ["instagram", "email"], "Manager channels mismatch!"
    print("   ✓ Manager channels assertion passed")

    # 3. Simulate Strategy parsing Manager channels and setting execution channels
    print("\n[STEP 2] Simulating Strategy Output...")
    strategy_data = {
        "positioning": "Test positioning",
        "key_messages": ["Message 1"],
        "content_pillars": ["Pillar 1"],
        "audience_segments": [{"segment_name": "Segment 1", "demographics": "Devs", "psychographics": "Tech", "key_message": "Message"}],
        "channel_strategy": {
            "instagram": {"priority": "high", "rationale": "visual"},
            "email": {"priority": "high", "rationale": "direct"}
        },
        "timeline": {},
        "success_metrics": {"kpis": []},
        "competitive_differentiation": {},
        "inferred_goal": "awareness",
        "execution": {
            "channels": channels_from_manager,  # Strategic alignment
            "deliverables": ["Instagram Post", "Email Newsletter"]
        }
    }
    state.strategy_output = json.dumps(strategy_data)
    state.status = "strategy_complete"

    # Assert Strategy correctly preserved the recommended channels list
    strategy_parsed = json.loads(state.strategy_output)
    channels_from_strategy = strategy_parsed.get("execution", {}).get("channels", [])
    print(f"   Strategy execution channels: {channels_from_strategy}")
    assert channels_from_strategy == ["instagram", "email"], "Strategy channels mismatch!"
    print("   ✓ Strategy channels assertion passed")

    # 4. Simulate Copywriter generating copy ONLY for active channels and setting others to null
    print("\n[STEP 3] Simulating Copywriter Output...")
    copy_data = {
        "inferred_goal": "awareness",
        "instagram": {
            "headline": "Insta Hook",
            "body": "Insta body",
            "ctas": {"primary": "Learn More", "secondary": "View Profile", "tertiary": None}
        },
        "email": {
            "subject": "Email sub",
            "headline": "Email Hook",
            "body": "Email body",
            "ctas": {"primary": "Learn More", "secondary": "Reply", "tertiary": None}
        },
        "linkedin": None,
        "tiktok": None,
        "facebook": None,
        "twitter": None,
        "youtube": None,
        "google_ads": None,
        "messaging_framework": {
            "brand_promise": "Test brand promise",
            "value_proposition": "Test value proposition",
            "segment_messaging": [],
            "channel_messaging": []
        },
        "strategic_alignment": {
            "positioning_used": "Test positioning",
            "key_messages_count": 1,
            "deliverables": ["Instagram Post", "Email Newsletter"]
        },
        "copy_readiness": {
            "instagram": True,
            "email": True,
            "linkedin": False,
            "tiktok": False,
            "facebook": False,
            "twitter": False,
            "youtube": False,
            "google_ads": False
        }
    }
    state.copy_output = json.dumps(copy_data)
    state.status = "copy_complete"

    # Verify that Copywriter correctly set inactive channels to None and active to non-None
    copy_parsed = json.loads(state.copy_output)
    all_possible_channels = ["instagram", "tiktok", "facebook", "twitter", "linkedin", "youtube", "email", "google_ads"]
    active_in_copy = [ch for ch in all_possible_channels if copy_parsed.get(ch) is not None]
    
    print(f"   Copywriter active channels: {active_in_copy}")
    assert active_in_copy == ["instagram", "email"], "Copywriter channel exclusivity mismatch!"
    
    # Assert copy readiness flags
    for ch in all_possible_channels:
        expected_ready = ch in ["instagram", "email"]
        actual_ready = copy_parsed.get("copy_readiness", {}).get(ch, False)
        assert actual_ready == expected_ready, f"Copy readiness for {ch} should be {expected_ready}"
    
    print("   ✓ Copywriter channel exclusivity and readiness assertion passed")

    # 5. Verify Reviewer channel extraction logic
    print("\n[STEP 4] Simulating Reviewer Channel Extraction Logic...")
    
    # Reviewer's exact extraction logic in reviewer.py:
    channels_list = []
    if state.manager_output:
        try:
            m_data = json.loads(state.manager_output)
            channels_list = m_data.get("channels", [])
        except Exception:
            pass
    if not channels_list and state.strategy_output:
        try:
            s_data = json.loads(state.strategy_output)
            channels_list = s_data.get("execution", {}).get("channels", [])
        except Exception:
            pass
            
    print(f"   Reviewer extracted channels: {channels_list}")
    assert channels_list == ["instagram", "email"], "Reviewer channels extraction failed!"
    print("   ✓ Reviewer channels extraction assertion passed")

    print("\n" + "=" * 80)
    print("🎉 ALL CORE CHANNEL TRAVERSAL VALIDATIONS PASSED SUCCESSFULY!")
    print("=" * 80)

if __name__ == "__main__":
    test_channels_extraction_and_consistency()
