"""
COPYWRITER AGENT - Marketing Copy & Messaging Creator

Role: Creative Copywriter / Marketing Messaging Expert

INPUT (From Strategy Agent + State):
  FROM state (metadata - direct access):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand for consistent messaging
    ✅ brand_voice: Tone and style (professional, friendly, bold, etc.)
    ✅ brief: Campaign context and objectives
  
  FROM strategy_output (PRIMARY INPUT - 13 fields):
    ✅ positioning: Brand positioning for headlines/copy
    ✅ key_messages: Strategic messages for headlines/framework
    ✅ content_pillars: Content themes for framework
    ✅ audience_segments: Audience breakdown for body copy
    ✅ channel_strategy: Channel guidance for copy notes
    ✅ timeline: Campaign phases for urgency in headlines/CTAs
    ✅ success_metrics: KPIs (context)
    ✅ competitive_differentiation: Competitive positioning for copy
    ✅ market_opportunities: Tactical opportunities (context)
    ✅ strategic_approach: Strategic direction (context)
    ✅ inferred_goal: Campaign objective for CTA strategy
    ✅ research_foundation: Market/competitor/audience data for insights
    ✅ execution: Channels + deliverables + budget

OUTPUT (Channel-Organized Copy - JSON - ready for execution):
  1. inferred_goal: Campaign goal from Strategy (awareness/lead_gen/sales/retention)
  2. email: Complete email copy (subject, headline, body, CTAs)
  3. linkedin: Complete LinkedIn copy (headline, body, CTAs)
  4. social: Complete social media copy (headline, body, CTAs)
  5. ads: Complete ad copy (headline, body, CTAs)
  6. messaging_framework: Complete messaging architecture for all channels
  7. strategic_alignment: Strategy validation (positioning, message counts, deliverables)
  8. copy_readiness: Channel readiness flags (email_ready, linkedin_ready, social_ready, ads_ready)

HOW IT WORKS:
1. Takes strategic positioning and key messages
2. Creates channel-specific copy variations
3. Generates compelling CTAs aligned with goal
4. Builds complete messaging framework
5. Ensures brand voice consistency throughout

COPYWRITER DECISIONS:
- Headlines: Based on key_messages + brand_voice + goal
- Body Copy: Based on research insights + positioning + audience_segments
- CTAs: Based on inferred_goal + primary_goal
- Tone: From brand_voice in every piece
- Content: Leveraging research pain points, motivations, market trends
"""

import sys
from pathlib import Path
import json

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


# ==================== COPYWRITING TEMPLATES ====================

def generate_email_copy(
    brand_name: str,
    key_messages: list,
    positioning: str,
    pain_points: list,
    brand_voice: str,
    inferred_goal: str,
    timeline: dict = None
) -> dict:
    """
    Generate complete email campaign copy.
    """
    # Email subject (short, attention-grabbing)
    if inferred_goal == "lead_gen":
        subject = f"Limited spots: {brand_name} early access available now"
    elif inferred_goal == "sales":
        subject = f"See how {brand_name} delivers 3x ROI"
    elif inferred_goal == "retention":
        subject = f"Exclusive: {brand_name} member benefits inside"
    else:  # awareness
        subject = f"Meet {brand_name}: {positioning[:40]}..."
    
    subject = subject[:60]  # Email subject line limit
    
    # Email headline (hero section)
    headline = key_messages[0] if key_messages else f"Transform your workflow with {brand_name}"
    
    # Email body
    body = f"""Hi,

Quick question: Are you still struggling with {pain_points[0].lower() if pain_points else 'inefficiencies'}?

{brand_name} helps teams like yours solve this in a completely different way.

Instead of the complex, expensive approach, we've built something that:
• Works out of the box
• Saves time (your most valuable resource)
• Doesn't break the bank

Want to see it in action? We have 3 spots available for a personalized demo this week.

Best,
The {brand_name} Team
"""
    
    # Email CTAs
    primary_cta_map = {
        "awareness": f"Learn More About {brand_name}",
        "lead_gen": f"Get Free Access to {brand_name}",
        "sales": f"Schedule a Demo of {brand_name}",
        "retention": f"Explore Your Benefits"
    }
    
    primary_cta = primary_cta_map.get(inferred_goal, f"Get Started with {brand_name}")
    
    # Add urgency if early phase
    urgency = ""
    if timeline and "phase_1" in timeline:
        phase_1 = timeline.get("phase_1", {})
        if "Planning" in phase_1.get("name", "") or "Setup" in phase_1.get("name", ""):
            urgency = " (Limited spots available)"
    
    ctas = {
        "hero_cta": primary_cta + urgency,
        "secondary_cta": f"See {brand_name} in action →",
        "footer_cta": "Questions? Reply to this email"
    }
    
    return {
        "subject": subject,
        "headline": headline,
        "body": body,
        "ctas": ctas
    }


def generate_linkedin_copy(
    brand_name: str,
    key_messages: list,
    positioning: str,
    market_analysis: dict,
    competitive_advantage: str,
    brand_voice: str,
    inferred_goal: str
) -> dict:
    """
    Generate complete LinkedIn content copy.
    """
    # LinkedIn post headline
    headline = key_messages[0][:100] if key_messages else f"{brand_name}: {positioning}"[:100]
    
    # LinkedIn article/post body
    market_trends = market_analysis.get("market_trends", [])
    growth_rate = market_analysis.get("growth_rate", "an unprecedented pace")
    
    body = f"""The market is evolving at {growth_rate}.

Here's what we're seeing in the field:
1. {market_trends[0] if market_trends else 'Digital transformation'} is accelerating
2. Teams need {positioning.lower()}
3. {competitive_advantage if competitive_advantage else f"{brand_name} is the answer many are looking for"}

In this article, we'll explore how to navigate these changes and stay ahead of the curve.

{key_messages[1] if len(key_messages) > 1 else 'The future belongs to those who adapt.'}

What challenges are you facing in your organization? Let's discuss in the comments.
"""
    
    # LinkedIn CTAs
    ctas = {
        "post_cta": "👇 Tell us in the comments: Are you facing this challenge?",
        "article_cta": "For the full analysis, read the full article →",
        "ad_cta": "View This Opportunity →"
    }
    
    return {
        "headline": headline,
        "body": body,
        "ctas": ctas
    }


def generate_social_copy(
    brand_name: str,
    key_messages: list,
    pain_points: list,
    brand_voice: str,
    inferred_goal: str
) -> dict:
    """
    Generate complete social media copy.
    """
    # Social headline (short for Twitter/X)
    if inferred_goal == "lead_gen":
        headline = f"Unlock productivity with {brand_name} - no credit card needed"
    elif inferred_goal == "sales":
        headline = f"Why Fortune 500 companies use {brand_name}"
    elif inferred_goal == "retention":
        headline = f"Join 10,000+ teams using {brand_name}"
    else:  # awareness
        headline = f"Meet the {brand_name} difference"
    
    headline = headline[:140]  # Twitter/X limit
    
    # Social body (concise, engaging)
    body = f"""Problem: {pain_points[0].lower() if pain_points else 'complexity'}

Solution: {brand_name}

We've helped 100+ companies streamline their operations. You're next.

Ready to try it? [Learn More →]
"""
    
    # Social CTAs (platform-specific)
    ctas = {
        "twitter_cta": "Learn more →",
        "instagram_cta": "Link in bio 🔗",
        "facebook_cta": "See how it works →",
        "tiktok_cta": "Full story on our site →"
    }
    
    return {
        "headline": headline,
        "body": body,
        "ctas": ctas
    }


def generate_ads_copy(
    brand_name: str,
    key_messages: list,
    positioning: str,
    competitive_differentiation: dict,
    pain_points: list,
    motivations: list,
    brand_voice: str,
    inferred_goal: str,
    timeline: dict = None
) -> dict:
    """
    Generate complete ad copy (Google, Facebook, etc.).
    """
    # Ad headline (short, compelling)
    competitive_advantage = competitive_differentiation.get("primary_differentiation", "") if competitive_differentiation else ""
    
    if inferred_goal == "lead_gen":
        headline = f"Get {brand_name} free - see results in 7 days"
    elif inferred_goal == "sales":
        headline = f"Proven: {brand_name} generates 3x ROI"
    elif inferred_goal == "retention":
        headline = f"{brand_name} Pro features - upgrade now"
    else:  # awareness
        headline = competitive_advantage if competitive_advantage else f"Transform your workflow with {brand_name}"
    
    headline = headline[:60]  # Ad headline limit
    
    # Ad body (problem-solution-benefit)
    opening = f"In today's competitive landscape, {brand_name} delivers" if brand_voice == "professional" else f"Tired of complexity? {brand_name} makes it simple."
    
    problem = pain_points[0] if pain_points else "inefficiencies"
    solution = positioning or f"{brand_name} solves what others can't"
    benefit = motivations[0] if motivations else "better results"
    
    body = f"""{opening}

{problem}? Most solutions require months to implement and cost a fortune.

That's where {brand_name} changes everything:

✓ {solution}
✓ {benefit} for your team
✓ Deploy in days, not months
✓ Trusted by industry leaders

The bottom line? {brand_name} isn't just another tool. It's your competitive advantage.
"""
    
    # Ad CTAs
    primary_cta_map = {
        "awareness": "Learn More",
        "lead_gen": "Get Free Access",
        "sales": "Schedule Demo",
        "retention": "Upgrade Now"
    }
    
    primary_cta = primary_cta_map.get(inferred_goal, "Get Started")
    
    # Add urgency
    urgency_cta = f"Claim your spot (3 left for this month)"
    if timeline and "phase_1" in timeline:
        phase_1 = timeline.get("phase_1", {})
        if "Planning" in phase_1.get("name", "") or "Setup" in phase_1.get("name", ""):
            urgency_cta = "Limited early access - claim your spot now"
    
    ctas = {
        "primary_cta": primary_cta,
        "urgency_cta": urgency_cta,
        "secondary_cta": f"Try {brand_name} for Free →"
    }
    
    return {
        "headline": headline,
        "body": body,
        "ctas": ctas
    }


def generate_messaging_framework(
    brand_name: str,
    positioning: str,
    key_messages: list,
    content_pillars: list,
    audience_segments: list,
    brand_voice: str,
    inferred_goal: str
) -> dict:
    """
    Generate complete messaging framework for the campaign.
    """
    
    # Brand promise
    brand_promise = f"{brand_name}: {positioning}"
    
    # Message hierarchy
    message_hierarchy = {
        "level_1_primary": key_messages[0] if key_messages else positioning,
        "level_2_supporting": key_messages[1:3] if len(key_messages) > 1 else [],
        "level_3_proof": [
            "Trusted by industry leaders",
            "Proven ROI and results",
            f"Join thousands of {brand_name} users"
        ]
    }
    
    # Segment-specific messaging
    segment_messaging = []
    for i, segment in enumerate(audience_segments[:3]):
        segment_name = segment.get("segment_name", f"Segment {i+1}")
        pain_point = segment.get("pain_point", "business challenges")
        motivation = segment.get("motivation", "success")
        
        segment_messaging.append({
            "segment": segment_name,
            "message": f"For {segment_name}: Solve {pain_point} and achieve {motivation}",
            "tone": brand_voice
        })
    
    # Messaging by channel (only channels with actual copy outputs)
    channel_messaging = {
        "email": {
            "tone": "Personalized, valuable",
            "themes": content_pillars[:2] if content_pillars else [],
            "frequency": "2x per week",
            "format": "Educational, promotional, community"
        },
        "linkedin": {
            "tone": "Professional, thought-leading",
            "themes": content_pillars[:2] if content_pillars else [],
            "frequency": "2-3x per week",
            "format": "Articles, carousel posts, insights"
        },
        "social": {
            "tone": "Friendly, engaging",
            "themes": content_pillars[:2] if content_pillars else [],
            "frequency": "Daily",
            "format": "Short-form, visual, behind-the-scenes"
        },
        "ads": {
            "tone": "Direct, compelling",
            "themes": content_pillars[:2] if content_pillars else [],
            "frequency": "Continuous",
            "format": "Problem-solution, benefit-driven"
        }
    }
    
    # Brand voice guidelines
    voice_guidelines = {
        "do": [],
        "dont": []
    }
    
    if brand_voice == "professional":
        voice_guidelines["do"] = ["Use industry terms", "Provide data/proof", "Be clear and concise"]
        voice_guidelines["dont"] = ["Casual language", "Exaggeration", "Hype"]
    elif brand_voice == "friendly":
        voice_guidelines["do"] = ["Use conversational tone", "Ask questions", "Share stories"]
        voice_guidelines["dont"] = ["Overly formal", "Jargon without explanation"]
    elif brand_voice == "bold":
        voice_guidelines["do"] = ["Strong claims", "Provocative questions", "Challenge status quo"]
        voice_guidelines["dont"] = ["Play it safe", "Wishy-washy language"]
    elif brand_voice == "luxury":
        voice_guidelines["do"] = ["Premium language", "Exclusivity", "Sophistication"]
        voice_guidelines["dont"] = ["Cheap terms", "Mass-market speak"]
    
    return {
        "brand_promise": brand_promise,
        "message_hierarchy": message_hierarchy,
        "segment_messaging": segment_messaging,
        "channel_messaging": channel_messaging,
        "voice_guidelines": voice_guidelines,
        "messaging_principles": [
            "Always reinforce brand positioning",
            "Speak to audience pain points first",
            "Follow up with solution and benefit",
            "Include proof/social proof",
            "End with clear call-to-action",
            "Maintain brand voice consistency"
        ]
    }


# ==================== COPYWRITER AGENT FUNCTION ====================

def copywriter_agent(state: CampaignState) -> CampaignState:
    """
    Copywriter Agent - Creates compelling marketing copy and messaging
    
    Args:
        state: CampaignState with strategy_output, research_output
    
    Returns:
        Modified state with copy_output filled
    """
    
    print("\n" + "=" * 80)
    print("✍️  COPYWRITER AGENT ACTIVATED")
    print("=" * 80)
    
    # ========== STEP 1: READ STRATEGY OUTPUT (PRIMARY INPUT) ==========
    print("\n[STEP 1] Reading strategy output (PRIMARY copy source)...")
    print("-" * 80)
    
    strategy = None
    if state.strategy_output:
        try:
            strategy = json.loads(state.strategy_output)
            print("✓ Strategy output found and parsed")
            print(f"   Fields: {list(strategy.keys())}")
        except (json.JSONDecodeError, TypeError):
            raise ValueError("strategy_output is required and must be valid JSON")
    else:
        raise ValueError("strategy_output is required - Copywriter needs Strategy insights")
    
    # Extract strategy data for copywriting
    positioning = strategy.get("positioning", "")
    key_messages = strategy.get("key_messages", [])
    content_pillars = strategy.get("content_pillars", [])
    audience_segments = strategy.get("audience_segments", [])
    # channel_strategy = strategy.get("channel_strategy", {})
    timeline = strategy.get("timeline", {})
    competitive_differentiation = strategy.get("competitive_differentiation", {})
    inferred_goal = strategy.get("inferred_goal", "awareness")
    research_foundation = strategy.get("research_foundation", {})
    execution = strategy.get("execution", {})
    deliverables = execution.get("deliverables", [])
    channels = execution.get("channels", [])
    
    print(f"✓ Positioning: {positioning[:50]}...")
    print(f"✓ Key Messages: {len(key_messages)} found")
    print(f"✓ Content Pillars: {len(content_pillars)} defined")
    print(f"✓ Audience Segments: {len(audience_segments)} identified")
    print(f"✓ Timeline: {len(timeline)} phases")
    print(f"✓ Competitive Differentiation: {competitive_differentiation.get('primary_differentiation', 'N/A')[:50]}...")
    print(f"✓ Goal Inferred: {inferred_goal}")
    print(f"✓ Deliverables: {deliverables}")
    print(f"✓ Channels: {channels}")
    
    # ========== STEP 2: READ STATE METADATA (NOT FROM STRATEGY) ==========
    print("\n[STEP 2] Reading campaign metadata from state (not strategy)...")
    print("-" * 80)
    
    # Read metadata from state (single source of truth)
    brand_name = state.brand_name
    campaign_name = state.campaign_name
    brand_voice = state.brand_voice
    brief = state.brief or "Campaign brief not available"
    
    print(f"✓ Campaign (from state): {campaign_name}")
    print(f"✓ Brand (from state): {brand_name}")
    print(f"✓ Brand Voice (from state): {brand_voice}")
    print(f"✓ Brief (from state): {brief[:60]}...")
    
    # ========== STEP 3: EXTRACT RESEARCH DATA ==========
    print("\n[STEP 3] Extracting research data...")
    print("-" * 80)
    
    # Extract research insights for copy generation
    market_analysis = research_foundation.get("market_analysis", {})
    audience_insights = research_foundation.get("audience_insights", {})
    
    pain_points = audience_insights.get("pain_points", [])
    motivations = audience_insights.get("motivations", [])
    
    # Extract competitive advantage
    competitive_advantage = competitive_differentiation.get("competitive_advantage", "")
    
    print(f"✓ Pain Points: {pain_points[:2]}")
    print(f"✓ Motivations: {motivations[:2]}")
    print(f"✓ Competitive Advantage: {competitive_advantage[:60]}...")
    
    # ========== STEP 4: GENERATE EMAIL COPY ==========
    print("\n[STEP 4] Generating EMAIL copy...")
    print("-" * 80)
    
    email_copy = generate_email_copy(
        brand_name=brand_name,
        key_messages=key_messages,
        positioning=positioning,
        pain_points=pain_points,
        brand_voice=brand_voice,
        inferred_goal=inferred_goal,
        timeline=timeline
    )
    
    print("✅ Email copy generated:")
    print(f"   Subject: {email_copy['subject']}")
    print(f"   Headline: {email_copy['headline'][:60]}...")
    print(f"   Body: {len(email_copy['body'])} characters")
    print(f"   CTAs: {list(email_copy['ctas'].keys())}")
    
    # ========== STEP 5: GENERATE LINKEDIN COPY ==========
    print("\n[STEP 5] Generating LINKEDIN copy...")
    print("-" * 80)
    
    linkedin_copy = generate_linkedin_copy(
        brand_name=brand_name,
        key_messages=key_messages,
        positioning=positioning,
        market_analysis=market_analysis,
        competitive_advantage=competitive_advantage,
        brand_voice=brand_voice,
        inferred_goal=inferred_goal
    )
    
    print("✅ LinkedIn copy generated:")
    print(f"   Headline: {linkedin_copy['headline'][:60]}...")
    print(f"   Body: {len(linkedin_copy['body'])} characters")
    print(f"   CTAs: {list(linkedin_copy['ctas'].keys())}")
    
    # ========== STEP 6: GENERATE SOCIAL COPY ==========
    print("\n[STEP 6] Generating SOCIAL MEDIA copy...")
    print("-" * 80)
    
    social_copy = generate_social_copy(
        brand_name=brand_name,
        key_messages=key_messages,
        pain_points=pain_points,
        brand_voice=brand_voice,
        inferred_goal=inferred_goal
    )
    
    print("✅ Social media copy generated:")
    print(f"   Headline: {social_copy['headline'][:60]}...")
    print(f"   Body: {len(social_copy['body'])} characters")
    print(f"   CTAs: {list(social_copy['ctas'].keys())}")
    
    # ========== STEP 7: GENERATE ADS COPY ==========
    print("\n[STEP 7] Generating ADS copy...")
    print("-" * 80)
    
    ads_copy = generate_ads_copy(
        brand_name=brand_name,
        key_messages=key_messages,
        positioning=positioning,
        competitive_differentiation=competitive_differentiation,
        pain_points=pain_points,
        motivations=motivations,
        brand_voice=brand_voice,
        inferred_goal=inferred_goal,
        timeline=timeline
    )
    
    print("✅ Ads copy generated:")
    print(f"   Headline: {ads_copy['headline'][:60]}...")
    print(f"   Body: {len(ads_copy['body'])} characters")
    print(f"   CTAs: {list(ads_copy['ctas'].keys())}")
    
    # ========== STEP 8: GENERATE MESSAGING FRAMEWORK ==========
    print("\n[STEP 8] Building messaging framework...")
    print("-" * 80)
    
    messaging_framework = generate_messaging_framework(
        brand_name=brand_name,
        positioning=positioning,
        key_messages=key_messages,
        content_pillars=content_pillars,
        audience_segments=audience_segments,
        brand_voice=brand_voice,
        inferred_goal=inferred_goal
    )
    
    print("✅ Messaging framework built:")
    print(f"   Brand Promise: {messaging_framework['brand_promise'][:60]}...")
    print(f"   Message Hierarchy Levels: 3")
    print(f"   Segment-specific Messages: {len(messaging_framework['segment_messaging'])}")
    print(f"   Channel Strategies: {len(messaging_framework['channel_messaging'])}")
    
    # ========== STEP 9: COMPILE COMPLETE COPY OUTPUT (CHANNEL-ORGANIZED) ==========
    print("\n[STEP 9] Compiling channel-organized copy output...")
    print("-" * 80)
    
    copy_output_dict = {
        # Goal from Strategy (not metadata - this is strategic output)
        "inferred_goal": inferred_goal,
        
        # Channel-organized copy (complete per channel)
        "email": email_copy,
        "linkedin": linkedin_copy,
        "social": social_copy,
        "ads": ads_copy,
        
        # Messaging framework (applies to all channels)
        "messaging_framework": messaging_framework,
        
        # Strategic alignment (for quality assurance)
        "strategic_alignment": {
            "positioning_used": positioning,
            "key_messages_count": len(key_messages),
            "content_pillars_count": len(content_pillars),
            "audience_segments_count": len(audience_segments),
            "deliverables": deliverables
        },
        
        # Copy readiness
        "copy_readiness": {
            "email_ready": True,
            "linkedin_ready": True,
            "social_ready": True,
            "ads_ready": True,
            "messaging_framework_complete": True
        }
    }
    
    # NOTE: campaign_name, brand_name, brand_voice are read from state (not duplicated here)
    
    print("✅ Copy output compiled!")
    print(f"   Email: ✓")
    print(f"   LinkedIn: ✓")
    print(f"   Social: ✓")
    print(f"   Ads: ✓")
    print(f"   Messaging Framework: ✓")
    
    # ========== STEP 10: CONVERT TO JSON STRING ==========
    print("\n[STEP 10] Converting copy to JSON...")
    print("-" * 80)
    
    copy_output_json = json.dumps(copy_output_dict, indent=2)
    
    print("Copy Output (First 400 chars):")
    print(copy_output_json[:400] + "...\n")
    
    # ========== STEP 11: WRITE TO STATE ==========
    print("[STEP 11] Writing to state...")
    print("-" * 80)
    
    state.copy_output = copy_output_json
    state.status = "copy_complete"
    
    print("✅ State updated:")
    print(f"   copy_output: {len(state.copy_output)} characters")
    print(f"   status: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ COPYWRITER AGENT COMPLETE")
    print("=" * 80)
    
    return state


# ==================== TEST THE AGENT ====================

if __name__ == "__main__":
    """
    Test Copywriter Agent with strategy-driven approach.
    """
    
    print("\n" + "=" * 80)
    print("COPYWRITER AGENT - STANDALONE TEST")
    print("=" * 80)
    
    # Create mock strategy output (what Copywriter receives)
    print("\n[TEST] Creating mock strategy output...")
    strategy_output = {
        "campaign_name": "Q3 Product Launch",
        "brand_name": "AgentMark",
        "positioning": "Enterprise AI without the complexity",
        "key_messages": [
            "Deploy powerful AI workflows in hours, not months",
            "Eliminate integration complexity and costs",
            "Scale operations with enterprise-grade reliability"
        ],
        "content_pillars": [
            "AI automation insights",
            "ROI and efficiency strategies",
            "Enterprise success stories",
            "Cost comparison analysis"
        ],
        "audience_segments": [
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
        ],
        "inferred_goal": "lead_gen",
        "competitive_differentiation": {
            "primary_differentiation": "Enterprise AI without the complexity",
            "competitors": ["Zapier", "Make", "n8n"],
            "competitive_advantage": "While Zapier and Make focus on complexity, AgentMark delivers enterprise AI without the complexity",
            "market_position": "Target $50B market with 40% YoY growth"
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
        "execution": {
            "deliverables": ["gated whitepaper", "landing page", "webinar", "email series"],
            "channels": ["linkedin", "email", "social", "ads"]
        },
        "research_foundation": {
            "market_analysis": {
                "total_addressable_market": "$50B",
                "growth_rate": "40% YoY",
                "market_trends": ["AI adoption", "automation", "cost reduction", "workflow optimization"]
            },
            "competitor_analysis": {
                "top_competitors": ["Zapier", "Make", "n8n"],
                "differentiation_opportunity": "Enterprise AI without complexity"
            },
            "audience_insights": {
                "pain_points": ["Integration complexity", "High costs", "Long setup time"],
                "motivations": ["Save time", "Reduce costs", "Scale operations"],
                "preferred_channels": ["LinkedIn", "Industry blogs", "Webinars"]
            }
        }
    }
    
    # Create state
    print("\n[TEST] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads, companies with 1000+ employees",
        brand_voice="professional",
        brief="Launch marketing campaign for AI automation platform targeting enterprise CTOs"
    )
    
    initial_state.strategy_output = json.dumps(strategy_output)
    initial_state.status = "strategy_complete"
    
    # Run Copywriter Agent
    print("\n[TEST] Running Copywriter Agent...")
    final_state = copywriter_agent(initial_state)
    
    # Show results
    print("\n[TEST] Final State:")
    print(f"Status: {final_state.status}")
    print(f"Copy Output Length: {len(final_state.copy_output)} characters")
    
    # Parse and display key sections
    copy_output = json.loads(final_state.copy_output)
    
    print("\n[TEST] Copy Output Structure:")
    print(f"  ✓ Email: subject, headline, body, ctas")
    print(f"  ✓ LinkedIn: headline, body, ctas")
    print(f"  ✓ Social: headline, body, ctas")
    print(f"  ✓ Ads: headline, body, ctas")
    print(f"  ✓ Messaging Framework: {list(copy_output['messaging_framework'].keys())}")
    print(f"  ✓ Strategic Alignment: included")
    print(f"  ✓ Copy Readiness: all channels ready")
    
    print("\n[TEST] Sample Email Copy:")
    print(f"  Subject: {copy_output['email']['subject']}")
    print(f"  Headline: {copy_output['email']['headline']}")
    print(f"  Hero CTA: {copy_output['email']['ctas']['hero_cta']}")
    
    print("\n[TEST] Sample LinkedIn Copy:")
    print(f"  Headline: {copy_output['linkedin']['headline']}")
    print(f"  Post CTA: {copy_output['linkedin']['ctas']['post_cta']}")
    
    print("\n" + "=" * 80)
    print("✅ COPYWRITER AGENT TEST COMPLETE")
    print("=" * 80)
