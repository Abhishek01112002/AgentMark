import json
from typing import Dict, Any, List

def format_focus_group_report(report: Dict[str, Any]) -> str:
    overall_score = report.get("overall_score", 0)
    persona_critiques = report.get("persona_critiques") or []
    recommendations = report.get("actionable_recommendations") or []
    personas = report.get("personas") or []
    
    # Map personas by id for easy metadata retrieval
    persona_map = {}
    for p in personas:
        if isinstance(p, dict) and "id" in p:
            persona_map[p["id"]] = p
            
    markdown = []
    markdown.append("# 👥 Focus Group Simulation Report")
    markdown.append(f"**Overall Group Score:** `{overall_score}/100`")
    markdown.append("\n---")
    
    # 1. Individual critiques
    if persona_critiques:
        markdown.append("\n## 💬 Audience Persona Feedback")
        for critique in persona_critiques:
            if not isinstance(critique, dict):
                continue
            persona_id = critique.get("persona_id")
            profile = persona_map.get(persona_id) or {}
            
            name = profile.get("name", persona_id)
            age = profile.get("age", "N/A")
            occupation = profile.get("occupation", "N/A")
            score = critique.get("resonance_score", 0)
            click_intent = critique.get("click_intent")
            click_status = "✅ Will Click" if click_intent else "❌ Will Scroll Past"
            
            markdown.append(f"\n### {name} (Age: {age} | {occupation})")
            markdown.append(f"* **Resonance Score:** `{score}/100` | **Action:** {click_status}")
            markdown.append(f"* **Final Verdict:** *{critique.get('verdict', 'No verdict provided')}*")
            
            objection = critique.get("objection")
            if objection:
                markdown.append(f"* **Key Objection:** \"{objection}\"")
                
            clash_quote = critique.get("clash_quote")
            if clash_quote:
                markdown.append(f"* **Trigger Content:** \"{clash_quote}\"")
    else:
        markdown.append("\n*No persona critiques generated.*")
        
    # 2. Actionable recommendations
    if recommendations:
        markdown.append("\n---")
        markdown.append("\n## 💡 Actionable Recommendations")
        for idx, rec in enumerate(recommendations, 1):
            if not isinstance(rec, dict):
                continue
            channel = rec.get("target_channel", "General")
            friction = rec.get("friction_identified", "")
            suggestion = rec.get("suggested_revision", "")
            
            markdown.append(f"\n### Recommendation {idx}: {channel.upper()}")
            markdown.append(f"**Friction Identified:**\n> {friction}")
            markdown.append(f"\n**Suggested Revision:**\n```\n{suggestion}\n```")
    else:
        markdown.append("\n*No actionable recommendations provided.*")
        
    return "\n".join(markdown)
