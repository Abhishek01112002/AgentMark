import json
from typing import Dict, Any, Optional

def format_campaign_brief(campaign: Dict[str, Any]) -> str:
    campaign_id = campaign.get("id", "Unknown ID")
    name = campaign.get("name", "Unnamed Campaign")
    brand_name = campaign.get("brandName", "Unnamed Brand")
    industry = campaign.get("industry", "Unknown Industry")
    primary_goal = campaign.get("primaryGoal", "Unknown Goal")
    target_audience = campaign.get("targetAudience", "Unknown Audience")
    brand_voice = campaign.get("brandVoice", "Unknown Voice")
    status = campaign.get("status", "draft")
    review_score = campaign.get("reviewScore")
    
    # Extract AI outputs
    ai_outputs = campaign.get("aiOutputs") or {}
    if isinstance(ai_outputs, str):
        try:
            ai_outputs = json.loads(ai_outputs)
        except Exception:
            ai_outputs = {}
            
    strategy = ai_outputs.get("strategy") or {}
    copywriter = ai_outputs.get("copywriter") or {}
    reviewer = ai_outputs.get("reviewer") or {}
    
    markdown = []
    markdown.append(f"# 📋 Campaign Brief: {name}")
    markdown.append(f"**Brand:** {brand_name} | **Industry:** {industry} | **Goal:** {primary_goal}")
    markdown.append(f"**Target Audience:** {target_audience}")
    markdown.append(f"**Brand Voice:** {brand_voice}")
    markdown.append(f"**Status:** `{status.upper()}`")
    
    if review_score is not None:
        markdown.append(f"**AI Review Score:** `{review_score}/100`")
    markdown.append("\n---")
    
    # 1. Strategy Section
    if strategy:
        markdown.append("\n## 📊 Marketing Strategy")
        positioning = strategy.get("positioning", "")
        if positioning:
            markdown.append(f"\n### Positioning Statement\n> {positioning}")
            
        key_messages = strategy.get("key_messages")
        if key_messages:
            markdown.append("\n### Key Messaging Pillars")
            for msg in key_messages:
                markdown.append(f"- {msg}")
                
        channel_strategy = strategy.get("channel_strategy")
        if channel_strategy:
            markdown.append("\n### Channel Strategy")
            for ch, plan in channel_strategy.items():
                markdown.append(f"\n#### {ch.upper()}")
                markdown.append(f"* **Priority:** {plan.get('priority', 'N/A')}")
                markdown.append(f"* **Rationale:** {plan.get('rationale', 'N/A')}")
                tactics = plan.get("tactics", [])
                if tactics:
                    markdown.append("* **Tactics:**")
                    for t in tactics:
                        markdown.append(f"  - {t}")
                        
        success_metrics = strategy.get("success_metrics")
        if success_metrics:
            markdown.append("\n### Success Metrics & KPIs")
            kpis = success_metrics.get("kpis", [])
            targets = success_metrics.get("targets", {})
            for k in kpis:
                target = targets.get(k, "TBD")
                markdown.append(f"- **{k}:** {target}")

    # 2. Copywriter Section
    if copywriter:
        markdown.append("\n---")
        markdown.append("\n## ✍️ Generated Creative Copy")
        copies = copywriter.get("copies", {})
        if copies:
            for channel, copy_obj in copies.items():
                if not copy_obj:
                    continue
                markdown.append(f"\n### {channel.upper()} Copy")
                
                # Check for email subject
                subject = copy_obj.get("subject")
                if subject:
                    markdown.append(f"* **Subject:** {subject}")
                    
                headline = copy_obj.get("headline", "")
                if headline:
                    markdown.append(f"* **Headline:** {headline}")
                    
                body = copy_obj.get("body", "")
                if body:
                    markdown.append(f"\n**Body Copy:**\n{body}")
                    
                ctas = copy_obj.get("ctas", {})
                if ctas:
                    markdown.append("\n**Calls to Action (CTAs):**")
                    if ctas.get("primary"):
                        markdown.append(f"  - **Primary:** {ctas['primary']}")
                    if ctas.get("secondary"):
                        markdown.append(f"  - **Secondary:** {ctas['secondary']}")
                    if ctas.get("tertiary"):
                        markdown.append(f"  - **Tertiary:** {ctas['tertiary']}")
        else:
            markdown.append("\n*No copywriting assets generated yet.*")

    # 3. Next Steps / Actions
    markdown.append("\n---")
    markdown.append("\n## 🚀 Action Items & Next Steps")
    markdown.append(f"1. **Simulate Focus Group Feedback:** run `run_focus_group(campaign_id=\"{campaign_id}\")` to test engagement with AI personas.")
    markdown.append(f"2. **Publish Campaign:** run `publish_to_channel(campaign_id=\"{campaign_id}\", channel=\"<channel_name>\")` to distribute this content.")
    
    return "\n".join(markdown)
