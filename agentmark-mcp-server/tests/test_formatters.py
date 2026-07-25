"""
test_formatters.py — Unit tests for all three MCP formatter modules.

Tests are pure unit tests (no network I/O, no server required).
All three formatters accept plain Python dicts and return Markdown strings.

Run with: pytest tests/test_formatters.py -v
"""

import pytest
from agentmark_mcp.formatters.brief_formatter import format_campaign_brief
from agentmark_mcp.formatters.publisher_formatter import format_publisher_report
from agentmark_mcp.formatters.fg_formatter import format_focus_group_report, _score_band


# ─── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def full_campaign() -> dict:
    """Full campaign DB record with all aiOutputs populated."""
    return {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "Summer Launch 2026",
        "brandName": "Nvara Soft",
        "industry": "saas",
        "primaryGoal": "sales",
        "targetAudience": "Developers",
        "brandVoice": "bold",
        "status": "completed",
        "reviewScore": 8.8,
        "aiOutputs": {
            "strategy_output": {
                "positioning": "The premier tool for agentic workflows.",
                "key_messages": ["Fast", "Robust", "Scalable"],
                "content_pillars": ["Tech Innovation", "Developer Efficiency"],
                "strategic_approach": "Direct developer outreach",
                "channel_strategy": {
                    "linkedin": {
                        "priority": "High",
                        "rationale": "Where developers hang out.",
                        "tactics": ["Post updates", "Engage influencers"],
                    }
                },
                "success_metrics": {
                    "kpis": ["CTR", "Signups"],
                    "targets": {"CTR": "2.5%", "Signups": "1000"},
                },
                "competitive_differentiation": {
                    "unique_value_proposition": "Build apps in minutes.",
                    "primary_differentiation": "Real-time SSE pipelines",
                },
            },
            "research_output": {
                "recommended_approach": "Leverage organic community channels.",
                "market_analysis": {
                    "total_addressable_market": "$5B",
                    "market_trends": ["AI growth", "Automation"],
                },
                "competitor_analysis": {
                    "differentiation_opportunity": "Unique open-source integration"
                },
            },
            "copy_output": {
                "copies": {
                    "linkedin": {
                        "headline": "Code Faster!",
                        "body": "Check out our brand new platform.",
                        "ctas": {
                            "primary": "Try Free",
                            "secondary": "Read Docs",
                        },
                    }
                }
            },
            "review_output": {
                "status": "approved",
                "can_publish": True,
                "overall": {
                    "quality_score": 88,
                    "summary": "Excellent work across the board.",
                    "strengths": ["Clear value prop", "Strong visuals"],
                    "critical_improvements": ["Add email CTA variant"],
                },
                "research_review": {"score": 90},
                "strategy_review": {"score": 85},
                "copy_review": {"score": 88},
                "image_review": {"score": 89},
            },
        },
    }


@pytest.fixture
def full_publisher_output() -> dict:
    """Typical publisher_output dict as stored in campaign.aiOutputs."""
    return {
        "publishing_decision": "APPROVED_FOR_PUBLISHING",
        "decision_rationale": "Assets are fully finalized and ready for release.",
        "executive_summary": "This campaign focuses on Q3 product launches.",
        "projected_metrics": {
            "total_reach": "50K",
            "lead_target": "500",
            "estimated_ctr": "3.2%",
            "estimated_cost": "$2,500",
            "roi_projection": "4x",
            "projection_confidence": "High",
            "projection_note": "Based on previous Q2 benchmarks.",
        },
        "publishing_plan": [
            {
                "channel": "linkedin",
                "priority": "High",
                "publish_frequency": "3 posts/week",
                "optimal_timing": "Tuesday 9 AM EST",
                "launch_date": "2026-08-01",
                "status": "ready",
            }
        ],
        "content_calendar": {
            "weeks": [
                {
                    "week_label": "Week 1",
                    "theme": "Introduction to Agentic workflows",
                    "week_start_date": "2026-08-01",
                    "activities": [
                        {
                            "day": "Monday",
                            "channel": "linkedin",
                            "content_type": "Post",
                            "description": "Explaining the core value proposition.",
                            "caption_hook": "Tired of boilerplate?",
                            "effort": "low",
                        }
                    ],
                }
            ]
        },
        "asset_checklist": {
            "copy_assets": [
                {
                    "asset": "LinkedIn Ad Copy",
                    "status": "completed",
                    "notes": "Approved by Editor",
                }
            ],
            "visual_assets": [
                {
                    "asset": "Banner image",
                    "status": "completed",
                    "aspect_ratio": "16:9",
                    "notes": "High res",
                }
            ],
            "missing_assets": ["Email template banner"],
        },
    }


@pytest.fixture
def full_focus_group_report() -> dict:
    """Typical FocusGroupReport as returned by the AI service."""
    return {
        "overall_score": 75,
        "personas": [
            {
                "id": "sarah-32",
                "name": "Sarah",
                "age": 32,
                "occupation": "Product Manager",
            }
        ],
        "persona_critiques": [
            {
                "persona_id": "sarah-32",
                "rubric": {"clarity": 4, "trust": 3, "value": 5, "urgency": 4},
                "resonance_score": 80,
                "click_intent": True,
                "verdict": "Likely to sign up.",
                "objection": "Lack of pricing details.",
                "clash_quote": "Call for details",
            }
        ],
        "actionable_recommendations": [
            {
                "target_channel": "LinkedIn",
                "friction_identified": "Pricing obscurity",
                "suggested_revision": "Display starting price.",
            }
        ],
    }


# ─── Brief Formatter Tests ─────────────────────────────────────────────────────

class TestBriefFormatter:
    def test_all_sections_rendered(self, full_campaign):
        md = format_campaign_brief(full_campaign, awaiting_approval=True)

        # Header
        assert "# Campaign Brief: Summer Launch 2026" in md
        assert "**Brand:** Nvara Soft" in md
        assert "**Industry:** SAAS" in md
        assert "**Goal:** `sales`" in md
        assert "**AI Review Score:** `88/100`" in md

        # Strategy
        assert "## Marketing Strategy" in md
        assert "The premier tool for agentic workflows." in md
        assert "Fast" in md
        assert "Strategic Approach" in md

        # Research
        assert "## Market Intelligence (Summary)" in md
        assert "$5B" in md
        assert "AI growth" in md

        # Copy
        assert "## Generated Creative Copy" in md
        assert "### LinkedIn" in md
        assert "Code Faster!" in md
        assert "Try Free" in md

        # Review
        assert "## Quality Review" in md
        assert "**Overall Quality Score:** `88/100`" in md
        assert "Clear value prop" in md
        assert "**Research:** `90/100`" in md

        # Awaiting approval banner
        assert "Human Review Required" in md

    def test_review_score_scaling(self):
        """Score stored as 0-10 float should be scaled to /100 display."""
        campaign = {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Test",
            "brandName": "X",
            "industry": "tech",
            "primaryGoal": "awareness",
            "targetAudience": "All",
            "brandVoice": "neutral",
            "status": "completed",
            "reviewScore": 7.5,  # stored as 0-10
            "aiOutputs": {},
        }
        md = format_campaign_brief(campaign)
        assert "**AI Review Score:** `75/100`" in md

    def test_next_steps_without_approval(self, full_campaign):
        md = format_campaign_brief(full_campaign, awaiting_approval=False)
        assert "run_focus_group" in md
        assert "publish_to_channel" in md
        assert "Human Review Required" not in md

    def test_minimal_campaign_no_ai_outputs(self):
        """Formatter must not raise on a campaign with no aiOutputs."""
        campaign = {
            "id": "00000000-0000-0000-0000-000000000002",
            "name": "Minimal",
            "brandName": "Brand",
            "industry": "other",
            "primaryGoal": "awareness",
            "targetAudience": "Everyone",
            "brandVoice": "casual",
            "status": "processing",
            "aiOutputs": None,
        }
        md = format_campaign_brief(campaign)
        assert "# Campaign Brief: Minimal" in md

    def test_stringified_ai_outputs(self):
        """aiOutputs stored as a JSON string must be parsed transparently."""
        import json
        campaign = {
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "Stringified",
            "brandName": "B",
            "industry": "saas",
            "primaryGoal": "sales",
            "targetAudience": "Devs",
            "brandVoice": "technical",
            "status": "completed",
            "reviewScore": None,
            "aiOutputs": json.dumps({
                "strategy_output": {"positioning": "Parsed from string."}
            }),
        }
        md = format_campaign_brief(campaign)
        assert "Parsed from string." in md


# ─── Publisher Formatter Tests ─────────────────────────────────────────────────

class TestPublisherFormatter:
    def test_all_sections_rendered(self, full_publisher_output):
        md = format_publisher_report(full_publisher_output, "campaign-123")

        assert "# Campaign Distribution Plan" in md
        assert "campaign-123" in md
        assert "APPROVED FOR PUBLISHING" in md

        # Metrics table
        assert "Estimated Reach" in md
        assert "50K" in md
        assert "3.2%" in md

        # Launch plan
        assert "### LINKEDIN" in md
        assert "3 posts/week" in md
        assert "2026-08-01" in md

        # Calendar
        assert "Week 1" in md
        assert "Tired of boilerplate?" in md

        # Checklist
        assert "LinkedIn Ad Copy" in md
        assert "Banner image" in md
        assert "Email template banner" in md

        # Next steps section (Phase 3 addition)
        assert "What To Do Next" in md
        assert "Export Assets" in md

    def test_empty_publisher_output(self):
        """Empty output must produce a graceful placeholder message."""
        md = format_publisher_report({}, "camp-empty")
        assert "No publishing data" in md
        assert "camp-empty" in md

    def test_none_publisher_output(self):
        md = format_publisher_report(None, "camp-none")
        assert "No publishing data" in md

    def test_missing_optional_sections(self):
        """Formatter must not raise when optional sections are absent."""
        minimal = {
            "publishing_decision": "APPROVED_FOR_PUBLISHING",
            "executive_summary": "Minimal test summary.",
        }
        md = format_publisher_report(minimal, "camp-minimal")
        assert "Campaign Distribution Plan" in md
        assert "Minimal test summary." in md
        # Sections that depend on optional keys must not appear
        assert "## Projected Campaign Metrics" not in md
        assert "## Channel Launch Plan" not in md
        assert "## Weekly Content Calendar" not in md


# ─── Focus Group Formatter Tests ──────────────────────────────────────────────

class TestFocusGroupFormatter:
    def test_all_sections_rendered(self, full_focus_group_report):
        md = format_focus_group_report(full_focus_group_report)

        # Header with score and verdict
        assert "# Focus Group Simulation Report" in md
        assert "**Overall Group Score:** `75/100`" in md
        assert "Mixed Reception" in md          # 75 falls in 65-79 band

        # Click-intent summary (Phase 2 enhancement)
        assert "1 / 1 personas indicate intent to engage" in md

        # Persona feedback
        assert "Audience Persona Feedback" in md
        assert "Sarah (Age: 32 | Product Manager)" in md
        assert "**Resonance Score:** `80/100`" in md
        assert "Will Click" in md
        assert "Lack of pricing details." in md

        # Recommendations
        assert "Actionable Recommendations" in md
        assert "Recommendation 1: LINKEDIN" in md
        assert "Display starting price." in md

    def test_score_band_thresholds(self):
        """_score_band must map scores to the correct reception tier."""
        assert "Strong Reception" in _score_band(80)
        assert "Strong Reception" in _score_band(100)
        assert "Mixed Reception" in _score_band(65)
        assert "Mixed Reception" in _score_band(79)
        assert "Lukewarm" in _score_band(50)
        assert "Lukewarm" in _score_band(64)
        assert "Weak Reception" in _score_band(0)
        assert "Weak Reception" in _score_band(49)

    def test_click_intent_false_not_treated_as_missing(self):
        """click_intent=False must render 'Will Scroll Past', not 'Undetermined'."""
        report = {
            "overall_score": 40,
            "personas": [{"id": "p1", "name": "Bob", "age": 45, "occupation": "CFO"}],
            "persona_critiques": [
                {
                    "persona_id": "p1",
                    "resonance_score": 30,
                    "click_intent": False,
                    "verdict": "Not interested.",
                }
            ],
            "actionable_recommendations": [],
        }
        md = format_focus_group_report(report)
        assert "Will Scroll Past" in md
        assert "Undetermined" not in md

    def test_zero_click_intent(self):
        """Click-intent ratio should show 0 / N when no persona clicks."""
        report = {
            "overall_score": 35,
            "personas": [
                {"id": "p1", "name": "A", "age": 20, "occupation": "Student"},
                {"id": "p2", "name": "B", "age": 30, "occupation": "Manager"},
            ],
            "persona_critiques": [
                {
                    "persona_id": "p1",
                    "resonance_score": 20,
                    "click_intent": False,
                    "verdict": "Skipped.",
                },
                {
                    "persona_id": "p2",
                    "resonance_score": 25,
                    "click_intent": False,
                    "verdict": "Not relevant.",
                },
            ],
            "actionable_recommendations": [],
        }
        md = format_focus_group_report(report)
        assert "0 / 2 personas indicate intent to engage" in md
        assert "Weak Reception" in md

    def test_empty_critiques_graceful(self):
        """Formatter must not raise when persona_critiques is empty."""
        report = {"overall_score": 50, "personas": [], "persona_critiques": [], "actionable_recommendations": []}
        md = format_focus_group_report(report)
        assert "Focus Group Simulation Report" in md
        assert "No persona critiques" in md

    def test_unknown_persona_fallback(self):
        """Critique with persona_id not in personas list uses ID as display name."""
        report = {
            "overall_score": 70,
            "personas": [],  # Empty — persona_map will be empty
            "persona_critiques": [
                {
                    "persona_id": "ghost-persona",
                    "resonance_score": 65,
                    "click_intent": True,
                    "verdict": "Interesting.",
                }
            ],
            "actionable_recommendations": [],
        }
        md = format_focus_group_report(report)
        # Should fall back to persona_id as display name
        assert "ghost-persona" in md
