"""
IMAGE PROMPT AGENT - DALL-E Visual Prompt Generator

Role: Visual Creative Director / AI Image Prompt Engineer

INPUT (From Upstream Agents):
  
  FROM state (campaign metadata):
    ✅ campaign_name: Campaign identifier
    ✅ brand_name: Brand for visual consistency
    ✅ brand_voice: Tone for visual style (professional, bold, luxury, etc.)
    ✅ target_audience: Audience for visual relevance
    ✅ industry: Industry context for visual themes
  
  FROM strategy_output (PRIMARY - required):
    ✅ positioning: Brand positioning for visual direction
    ✅ content_pillars: Content themes for visual concepts
    ✅ strategic_approach: Strategic direction for visual storytelling
    ✅ execution.deliverables: List of image assets to create
    ✅ execution.channels: Distribution channels for aspect ratio decisions
    ✅ research_foundation: Nested research (audience pain points, market trends)
  
  FROM copy_output (for text overlay alignment):
    Copy Agent produces 8 top-level outputs:
    1. inferred_goal
    2. email (contains: subject, headline, body, ctas)
    3. linkedin (contains: headline, body, ctas)
    4. social (contains: headline, body, ctas)
    5. ads (contains: headline, body, ctas)
    6. messaging_framework
    7. strategic_alignment
    8. copy_readiness
    
    Image Agent uses PARTIAL data from outputs #2-5 (only headlines + CTAs):
    ✅ USED BY IMAGE:
       • email.subject, email.headline, email.ctas.hero_cta
       • linkedin.headline, linkedin.ctas.post_cta
       • social.headline, social.ctas
       • ads.headline, ads.ctas.primary_cta
    
    ❌ NOT USED BY IMAGE (used by Review/Publisher):
       • Outputs #1, #6, #7, #8 (inferred_goal, messaging_framework, strategic_alignment, copy_readiness)
       • Body copy from outputs #2-5 (email.body, linkedin.body, social.body, ads.body)
       • Secondary CTAs from outputs #2-5 (all footer/secondary CTAs)

OUTPUT (DALL-E 3 Prompts - JSON):
  1. visual_direction: Overall visual strategy and design themes
  2. image_prompts: Array of prompt objects, each containing:
     - deliverable: Asset type (e.g., "linkedin post", "email banner")
     - prompt: Production-ready DALL-E 3 prompt (detailed, 50+ chars)
     - style: Artistic style (modern, minimalist, bold, luxury, etc.)
     - color_palette: Color scheme aligned with brand_voice
     - text_overlay: Suggested text placement and copy from copy_output
     - aspect_ratio: Image dimensions (16:9, 1:1, 9:16, 4:5)

WORKFLOW (Parallel Branching Architecture):
  Manager → Strategy (embeds Research)
              ↓
         ┌────┴────┐
         ↓         ↓
      Copy      (waits)
         ↓         ↓
         └────→ Image ← reads Strategy directly
                  ↓
               Review ← reads ALL outputs
                  ↓
              Publisher
  
  Step 1: Read strategy_output for positioning, deliverables, research_foundation
  Step 2: Read copy_output for headlines + CTAs (text overlay alignment)
  Step 3: Generate DALL-E 3 prompts for each deliverable
  Step 4: Ensure visual consistency across all campaign assets
  Step 5: Output production-ready prompts for DALL-E image generation
  
  NOTE: Image runs AFTER Copy completes, but reads BOTH Copy AND Strategy.
        This is NOT linear - it's parallel branching converging at Image.

IMAGE PROMPT DECISIONS:
  - Visual Style: Derived from brand_voice + industry + positioning
  - Color Palette: Aligned with brand_voice + industry standards
  - Text Overlay: Uses copy_output headlines + CTAs
  - Visual Metaphors: Based on research pain points + market trends
  - Aspect Ratios: Optimized for deliverable type and channel requirements

WHY COPY OUTPUTS ARE SPLIT:
  - Image Agent: Uses headlines + CTAs for text overlay composition
  - Review Agent: Validates ALL 8 copy outputs for quality and alignment
  - Publisher Agent: Publishes complete content packages (images + full copy + CTAs)
  
  This prevents Image Agent from processing unnecessary body copy while ensuring
  downstream agents have complete content for review and distribution.
"""

import sys
from pathlib import Path
import json

# Add project root to path so imports work
sys.path.insert(0, str(Path(__file__).parent.parent))

from agents.state import CampaignState


# ==================== UTILITY FUNCTIONS ====================

def _extract_copy_context(state: CampaignState) -> dict:
    """
    Reads copy_output from state and extracts key elements for visual alignment.
    Returns a dict with headlines, body copy, and CTAs for text_overlay use.
    """
    context = {
        "email_subject": "",
        "email_headline": "",
        "email_cta": "",
        "linkedin_headline": "",
        "linkedin_cta": "",
        "social_headline": "",
        "social_cta": "",
        "ads_headline": "",
        "ads_cta": ""
    }
    
    if not state.copy_output:
        return context
    
    try:
        copy_data = json.loads(state.copy_output)
        
        # Extract email copy (subject, headline, hero_cta)
        email = copy_data.get("email", {})
        context["email_subject"] = email.get("subject", "")
        context["email_headline"] = email.get("headline", "")
        email_ctas = email.get("ctas", {})
        context["email_cta"] = email_ctas.get("hero_cta", "")
        
        # Extract LinkedIn copy (headline, post_cta)
        linkedin = copy_data.get("linkedin", {})
        context["linkedin_headline"] = linkedin.get("headline", "")
        linkedin_ctas = linkedin.get("ctas", {})
        context["linkedin_cta"] = linkedin_ctas.get("post_cta", "")
        
        # Extract social copy (headline, primary CTA)
        social = copy_data.get("social", {})
        context["social_headline"] = social.get("headline", "")
        social_ctas = social.get("ctas", {})
        context["social_cta"] = social_ctas.get("primary_cta", "")
        
        # Extract ads copy (headline, primary_cta)
        ads = copy_data.get("ads", {})
        context["ads_headline"] = ads.get("headline", "")
        ads_ctas = ads.get("ctas", {})
        context["ads_cta"] = ads_ctas.get("primary_cta", "")
        
    except (json.JSONDecodeError, AttributeError) as e:
        print(f"⚠️  Could not parse copy_output: {e}")
    
    return context


def _extract_research_context(strategy_data: dict) -> dict:
    """
    Reads research data FROM strategy_output.research_foundation.
    Research Agent → Strategy Agent (embeds research) → Image Agent reads from strategy.
    Returns pain points, trends for visual metaphors.
    """
    context = {
        "audience_pain_points": "",
        "competitor_landscape": "",
        "market_trends": ""
    }
    
    if not strategy_data:
        return context
    
    try:
        # Read from strategy's research_foundation (nested)
        research_foundation = strategy_data.get("research_foundation", {})
        
        # Extract audience insights
        audience = research_foundation.get("audience_insights", {})
        if isinstance(audience, dict):
            pain_points = audience.get("pain_points", [])
            if isinstance(pain_points, list):
                context["audience_pain_points"] = ", ".join(pain_points)
            elif isinstance(pain_points, str):
                context["audience_pain_points"] = pain_points
        
        # Extract competitor info
        competitors = research_foundation.get("competitor_analysis", {})
        if isinstance(competitors, dict):
            diff = competitors.get("differentiation_opportunity", "")
            context["competitor_landscape"] = diff if isinstance(diff, str) else str(diff)
        
        # Extract market trends
        market = research_foundation.get("market_analysis", {})
        if isinstance(market, dict):
            trends = market.get("market_trends", [])
            if isinstance(trends, list):
                context["market_trends"] = ", ".join(str(t) for t in trends)
            elif isinstance(trends, str):
                context["market_trends"] = trends
        
    except (AttributeError, TypeError) as e:
        print(f"⚠️  Could not parse research_foundation from strategy: {e}")
    
    return context


def _infer_deliverables_from_channels(channels: list) -> list:
    """
    Smart fallback: infer likely deliverables from channel list when
    deliverables are not explicitly provided. Much better than defaulting
    to a generic 'campaign banner'.
    
    Matches channels from Manager Agent:
    - SaaS: linkedin, tech blogs, product hunt, startup newsletters
    - Ecommerce: instagram, tiktok, facebook, pinterest
    - Finance: linkedin, financial blogs, podcasts, webinars
    - Healthcare: healthcare forums, medical journals, webinars, conferences
    - Other: linkedin, social media, email, content marketing
    """
    channel_to_deliverable = {
        "linkedin": "linkedin social post",
        "instagram": "instagram story",
        "tiktok": "short-form video",
        "facebook": "social media post",
        "pinterest": "pinterest pin",
        "email": "email banner",
        "blog": "blog header image",
        "podcast": "podcast cover art",
        "webinar": "webinar promotional banner",
        "product hunt": "product showcase image",
        "social media": "social media post",
    }
    
    deliverables = []
    for channel in channels:
        channel_lower = channel.lower().strip()
        for key, deliverable in channel_to_deliverable.items():
            if key in channel_lower:
                deliverables.append(deliverable)
                break
    
    return deliverables if deliverables else ["campaign hero banner"]


def generate_image_prompts(
    deliverables: list,
    brand_name: str,
    brand_voice: str,
    positioning: str,
    industry: str,
    copy_context: dict,
    research_context: dict
) -> dict:
    """
    Generate DALL-E 3 image prompts for each deliverable.
    Uses hardcoded logic based on brand_voice, industry, and deliverable type.
    """
    
    # Map brand_voice to visual style
    style_map = {
        "professional": "modern corporate",
        "friendly": "approachable and warm",
        "bold": "dramatic and eye-catching",
        "luxury": "elegant and sophisticated",
        "casual": "relaxed and authentic",
        "authoritative": "powerful and commanding"
    }
    
    # Map brand_voice to color palette
    color_map = {
        "professional": "navy blue, white, silver accents",
        "friendly": "warm orange, light blue, cream",
        "bold": "vibrant red, black, electric blue",
        "luxury": "deep purple, gold, black",
        "casual": "soft pastels, natural tones",
        "authoritative": "deep charcoal, burgundy, white"
    }
    
    # Map deliverable to aspect ratio (based on actual deliverables from Manager)
    aspect_ratio_map = {
        "linkedin social post": "1:1",
        "linkedin post": "1:1",
        "instagram story": "9:16",
        "instagram post": "1:1",
        "social media post": "1:1",
        "pinterest pin": "2:3",
        "short-form video": "9:16",
        "email banner": "16:9",
        "email newsletter": "16:9",
        "blog header": "16:9",
        "blog post": "16:9",
        "landing page": "16:9",
        "webinar": "16:9",
        "podcast cover": "1:1",
        "gated whitepaper": "8.5:11",
        "product showcase": "1:1",
        "lead magnet": "16:9",
        "video": "16:9",
        "tutorial": "16:9",
        "case study": "16:9"
    }
    
    style = style_map.get(brand_voice, "modern corporate")
    color_palette = color_map.get(brand_voice, "blue, white, gray accents")
    
    # Build visual direction
    visual_direction = (
        f"Visual style: {style}. "
        f"Color palette: {color_palette}. "
        f"Brand positioning: {positioning}. "
        f"Industry context: {industry}. "
    )
    
    if research_context.get("market_trends"):
        visual_direction += f"Incorporate visual themes from: {research_context['market_trends']}. "
    
    # Generate prompts for each deliverable
    image_prompts = []
    
    for deliverable in deliverables:
        deliverable_lower = deliverable.lower()
        
        # Determine aspect ratio
        aspect_ratio = "1:1"  # default
        for key, ratio in aspect_ratio_map.items():
            if key in deliverable_lower:
                aspect_ratio = ratio
                break
        
        # Build base prompt
        if "email" in deliverable_lower:
            base_prompt = f"Professional email header banner for {brand_name}, "
            text_overlay = copy_context.get("email_headline", f"{brand_name} - {positioning}")
        elif "linkedin" in deliverable_lower:
            base_prompt = f"LinkedIn professional post image for {brand_name}, "
            text_overlay = copy_context.get("linkedin_headline", positioning)
        elif "instagram" in deliverable_lower:
            base_prompt = f"Instagram story visual for {brand_name}, "
            text_overlay = copy_context.get("social_headline", positioning)
        elif "tiktok" in deliverable_lower or "video" in deliverable_lower:
            base_prompt = f"Short-form video cover for {brand_name}, "
            text_overlay = copy_context.get("social_headline", positioning)
        elif "social" in deliverable_lower or "facebook" in deliverable_lower:
            base_prompt = f"Eye-catching social media visual for {brand_name}, "
            text_overlay = copy_context.get("social_headline", positioning)
        elif "pinterest" in deliverable_lower:
            base_prompt = f"Pinterest pin design for {brand_name}, "
            text_overlay = copy_context.get("social_headline", positioning)
        elif "landing" in deliverable_lower:
            base_prompt = f"Hero banner for {brand_name} landing page, "
            text_overlay = f"{brand_name}: {positioning}"
        elif "blog" in deliverable_lower:
            base_prompt = f"Blog header image for {brand_name}, "
            text_overlay = positioning
        elif "webinar" in deliverable_lower:
            base_prompt = f"Professional webinar promotional image for {brand_name}, "
            text_overlay = copy_context.get("email_headline", f"{brand_name} Webinar")
        elif "whitepaper" in deliverable_lower:
            base_prompt = f"Professional whitepaper cover for {brand_name}, "
            text_overlay = copy_context.get("linkedin_headline", f"{brand_name} Industry Report")
        elif "podcast" in deliverable_lower:
            base_prompt = f"Podcast cover art for {brand_name}, "
            text_overlay = f"{brand_name} Podcast"
        elif "product" in deliverable_lower:
            base_prompt = f"Product showcase image for {brand_name}, "
            text_overlay = copy_context.get("ads_headline", positioning)
        else:
            base_prompt = f"Professional marketing visual for {brand_name}, "
            text_overlay = positioning
        
        # Add industry context
        if industry == "saas":
            base_prompt += "modern tech interface, clean dashboard UI, "
        elif industry == "ecommerce":
            base_prompt += "product showcase, shopping experience, "
        elif industry == "finance":
            base_prompt += "financial charts, security imagery, "
        elif industry == "healthcare":
            base_prompt += "healthcare professionals, medical technology, "
        
        # Add style and color
        base_prompt += f"{style} aesthetic, {color_palette} color scheme, "
        
        # Add visual metaphors from research
        if research_context.get("audience_pain_points"):
            pain_point = research_context["audience_pain_points"].split(",")[0]
            if "complexity" in pain_point.lower():
                base_prompt += "simplified workflow visualization, "
            elif "cost" in pain_point.lower():
                base_prompt += "value and efficiency symbolism, "
            elif "time" in pain_point.lower():
                base_prompt += "speed and automation imagery, "
        
        # Final touches
        base_prompt += "professional lighting, high quality, marketing ready, no text overlay"
        
        # Ensure minimum 50 characters
        if len(base_prompt) < 50:
            base_prompt += f", promoting {brand_name} brand identity and market positioning"
        
        image_prompts.append({
            "deliverable": deliverable,
            "prompt": base_prompt,
            "style": style,
            "color_palette": color_palette,
            "text_overlay": text_overlay[:100],  # Truncate if too long
            "aspect_ratio": aspect_ratio
        })
    
    return {
        "visual_direction": visual_direction,
        "image_prompts": image_prompts
    }


# ==================== MAIN AGENT FUNCTION ====================

def image_prompt_agent(state: CampaignState) -> CampaignState:
    """
    Image Prompt Agent Node - Generates production-quality DALL-E 3 prompts
    for campaign deliverables, integrating strategy, copy, and research context.
    
    Args:
        state: CampaignState with strategy_output (required),
               copy_output (optional but used if available)
        
    Returns:
        CampaignState with image_output filled
    """
    print("\n" + "=" * 80)
    print("🎨 IMAGE PROMPT AGENT ACTIVATED")
    print("=" * 80)
    
    # ========== STEP 1: READ STRATEGY OUTPUT (REQUIRED) ==========
    print("\n[STEP 1] Reading strategy output from state...")
    print("-" * 80)
    
    if not state.strategy_output:
        raise ValueError("No strategy_output found in state. Image Prompt Agent requires Strategy.")
        
    try:
        strategy_data = json.loads(state.strategy_output)
        print("✓ Strategy output parsed successfully")
    except Exception as e:
        raise ValueError(f"Failed to parse strategy_output: {e}")
        
    # Extract strategic context
    positioning = strategy_data.get("positioning", "N/A")
    content_pillars = strategy_data.get("content_pillars", [])
    strategic_approach = strategy_data.get("strategic_approach", "N/A")
    
    # Extract deliverables from execution plan
    execution = strategy_data.get("execution", {})
    deliverables = execution.get("deliverables", [])
    channels = execution.get("channels", [])
    
    # If deliverables list is empty, try manager_output
    if not deliverables and state.manager_output:
        try:
            manager_data = json.loads(state.manager_output)
            deliverables = manager_data.get("deliverables", [])
            if not channels:
                channels = manager_data.get("channels", [])
        except Exception:
            pass
    
    # Smart fallback: infer from channels instead of generic "campaign banner"
    if not deliverables:
        deliverables = _infer_deliverables_from_channels(channels)
        print(f"⚠️  No explicit deliverables found - inferred from channels: {deliverables}")
        
    # Extract metadata
    campaign_name = state.campaign_name or "Unnamed Campaign"
    brand_name = state.brand_name or "Unnamed Brand"
    target_audience = state.target_audience or "General Audience"
    brand_voice = state.brand_voice or "professional"
    industry = state.industry or "other"
    
    print(f"✓ Campaign: {campaign_name}")
    print(f"✓ Brand: {brand_name}")
    print(f"✓ Industry: {industry}")
    print(f"✓ Target Audience: {target_audience}")
    print(f"✓ Brand Voice: {brand_voice}")
    print(f"✓ Deliverables to design: {deliverables}")
    
    # ========== STEP 2: READ COPY OUTPUT (OPTIONAL) ==========
    print("\n[STEP 2] Reading copy output for visual-copy alignment...")
    print("-" * 80)
    
    copy_context = _extract_copy_context(state)
    if any(copy_context.values()):
        print("✓ Copy context extracted:")
        for key, val in copy_context.items():
            if val:
                # Truncate for console readability
                display_val = val[:60] + "..." if len(val) > 60 else val
                print(f"   • {key}: {display_val}")
    else:
        print("⚠️  No copy output available - proceeding without text overlay context")
    
    # ========== STEP 3: READ RESEARCH OUTPUT (FROM STRATEGY) ==========
    print("\n[STEP 3] Reading research context from strategy.research_foundation...")
    print("-" * 80)
    
    research_context = _extract_research_context(strategy_data)
    if any(research_context.values()):
        print("✓ Research context extracted from strategy:")
        for key, val in research_context.items():
            if val:
                display_val = val[:60] + "..." if len(val) > 60 else val
                print(f"   • {key}: {display_val}")
    else:
        print("⚠️  No research foundation in strategy - proceeding without audience insight context")
    
    # ========== STEP 4: GENERATE IMAGE PROMPTS ==========
    print("\n[STEP 4] Generating DALL-E 3 prompts...")
    print("-" * 80)
    
    try:
        image_output = generate_image_prompts(
            deliverables=deliverables,
            brand_name=brand_name,
            brand_voice=brand_voice,
            positioning=positioning,
            industry=industry,
            copy_context=copy_context,
            research_context=research_context
        )
        
        print("✓ Visual prompts generated successfully")
        
    except Exception as e:
        print(f"❌ Failed to generate visual prompts: {e}")
        state.error = f"Image Prompt Agent failed: {str(e)}"
        state.status = "error"
        return state
    
    # ========== STEP 5: DISPLAY RESULTS ==========
    print("\n[STEP 5] Image prompts generated:")
    print("-" * 80)
    
    print(f"\n📐 Visual Direction:")
    print(f"   {image_output['visual_direction'][:100]}...")
    
    print(f"\n🖼️  Image Prompts ({len(image_output['image_prompts'])} total):")
    for i, prompt_obj in enumerate(image_output['image_prompts'], 1):
        print(f"\n   Prompt {i}: {prompt_obj['deliverable']}")
        print(f"   • Style: {prompt_obj['style']}")
        print(f"   • Color: {prompt_obj['color_palette']}")
        print(f"   • Aspect Ratio: {prompt_obj['aspect_ratio']}")
        print(f"   • Text Overlay: {prompt_obj['text_overlay'][:50]}...")
        print(f"   • DALL-E Prompt: {prompt_obj['prompt'][:80]}...")
    
    # ========== STEP 6: WRITE TO STATE ==========
    print("\n[STEP 6] Writing image output to state...")
    print("-" * 80)
    
    state.image_output = json.dumps(image_output, indent=2)
    state.status = "image_complete"
    
    prompt_count = len(image_output.get("image_prompts", []))
    print(f"✅ Image Prompt Agent complete!")
    print(f"   Prompts generated: {prompt_count}")
    print(f"   Status updated to: {state.status}")
    
    print("\n" + "=" * 80)
    print("✅ IMAGE PROMPT AGENT COMPLETE")
    print("=" * 80)
    
    return state


# ==================== TEST THE AGENT ====================

if __name__ == "__main__":
    """
    This section tests the Image Prompt Agent in isolation.
    Shows what input we give and what output we get.
    """
    
    print("\n" + "=" * 80)
    print("IMAGE PROMPT AGENT - STANDALONE TEST")
    print("=" * 80)
    
    # Create mock strategy output
    print("\n[TEST] Creating mock strategy output...")
    strategy_output = {
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
        "strategic_approach": "Create gated content and lead magnets to build qualified lead pipeline with professional communication tailored specifically for Enterprise CTOs",
        "execution": {
            "deliverables": ["gated whitepaper", "landing page", "webinar", "email banner"],
            "channels": ["linkedin", "tech blogs", "email"]
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
    
    # Create mock copy output
    print("\n[TEST] Creating mock copy output...")
    copy_output = {
        "email": {
            "subject": "Limited spots: AgentMark early access available now",
            "headline": "Deploy powerful AI workflows in hours, not months",
            "ctas": {
                "hero_cta": "Get Free Access to AgentMark (Limited spots available)"
            }
        },
        "linkedin": {
            "headline": "Deploy powerful AI workflows in hours, not months",
            "ctas": {
                "post_cta": "👇 Tell us in the comments: Are you facing this challenge?"
            }
        },
        "social": {
            "headline": "Unlock productivity with AgentMark - no credit card needed",
            "ctas": {
                "twitter_cta": "Learn more →"
            }
        },
        "ads": {
            "headline": "Get AgentMark free - see results in 7 days",
            "ctas": {
                "primary_cta": "Get Free Access"
            }
        }
    }
    
    # Create initial state
    print("\n[TEST] Creating initial state...")
    initial_state = CampaignState(
        campaign_name="Q3 Product Launch",
        brand_name="AgentMark",
        industry="saas",
        primary_goal="lead_gen",
        target_audience="Enterprise CTOs, tech leads, companies with 1000+ employees",
        brand_voice="professional"
    )
    
    initial_state.strategy_output = json.dumps(strategy_output)
    initial_state.copy_output = json.dumps(copy_output)
    initial_state.status = "copy_complete"
    
    print(f"✓ Campaign: {initial_state.campaign_name}")
    print(f"✓ Brand: {initial_state.brand_name}")
    print(f"✓ Industry: {initial_state.industry}")
    print(f"✓ Brand Voice: {initial_state.brand_voice}")
    
    # Run Image Prompt Agent
    print("\n[TEST] Running Image Prompt Agent...")
    final_state = image_prompt_agent(initial_state)
    
    # Show results
    print("\n[TEST] Final State:")
    print(f"Status: {final_state.status}")
    print(f"Image Output Length: {len(final_state.image_output)} characters")
    
    # Parse and display structured output
    image_output = json.loads(final_state.image_output)
    print("\n[TEST] Image Output Structure:")
    print(f"  ✓ visual_direction: {image_output['visual_direction'][:80]}...")
    print(f"  ✓ image_prompts: {len(image_output['image_prompts'])} prompts")
    
    for i, prompt in enumerate(image_output['image_prompts'], 1):
        print(f"\n  Prompt {i}:")
        print(f"    Deliverable: {prompt['deliverable']}")
        print(f"    Style: {prompt['style']}")
        print(f"    Aspect Ratio: {prompt['aspect_ratio']}")
        print(f"    Prompt Length: {len(prompt['prompt'])} chars")
    
    print("\n" + "=" * 80)
    print("✅ IMAGE PROMPT AGENT TEST COMPLETE")
    print("=" * 80)
