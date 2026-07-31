import json
from typing import Any, Dict, List, Optional

def format_creative_hook_matrix(matrix: Dict[str, Any], filters: Optional[Dict[str, Any]] = None, output_format: str = "markdown") -> str:
    if not matrix or not isinstance(matrix, dict):
        return "No Creative Hook Matrix available."

    hooks: List[Dict[str, Any]] = matrix.get("hooks", [])
    
    # Apply filters
    if filters:
        if filters.get("category"):
            hooks = [h for h in hooks if h.get("category", "").lower() == filters["category"].lower()]
        if filters.get("min_virality_score"):
            hooks = [h for h in hooks if h.get("viralityScore", 0) >= filters["min_virality_score"]]
        if filters.get("platform"):
            platform = filters["platform"].lower()
            hooks = [h for h in hooks if platform in [p.lower() for p in h.get("platforms", [])]]
        if filters.get("favorites_only"):
            hooks = [h for h in hooks if h.get("is_favorite") or h.get("is_pinned")]

    if output_format == "json":
        return json.dumps({"hooks": hooks}, indent=2)

    if not hooks:
        return "No creative hooks match the given criteria."

    md = []
    md.append("## Creative Hook Matrix")
    md.append("")
    md.append("| ID | Category | Headline | Virality Score | Status | Pinned |")
    md.append("|---|---|---|---|---|---|")

    for h in hooks:
        hid = h.get("id", "N/A")
        cat = h.get("category", "N/A")
        headline = str(h.get("headline", "N/A")).replace("\n", " ")
        score = h.get("viralityScore", "N/A")
        status = h.get("status", "pending")
        pinned = "⭐" if h.get("is_pinned") else ("❤️" if h.get("is_favorite") else " ")
        if h.get("is_locked"):
            pinned += " 🔒"
        md.append(f"| {hid} | {cat} | {headline} | {score} | {status} | {pinned} |")

    md.append("\n### Detailed Hooks\n")
    for h in hooks:
        hid = h.get("id", "N/A")
        cat = h.get("category", "N/A")
        headline = h.get("headline", "N/A")
        angle = h.get("psychologicalAngle", "N/A")
        ctas = ", ".join(h.get("ctas", [])) if isinstance(h.get("ctas"), list) else h.get("ctas", "N/A")
        platforms = ", ".join(h.get("platforms", [])) if isinstance(h.get("platforms"), list) else h.get("platforms", "N/A")
        
        md.append(f"#### [{hid}] {cat} (Score: {h.get('viralityScore', 'N/A')})")
        md.append(f"- **Headline:** {headline}")
        md.append(f"- **Psychological Angle:** {angle}")
        md.append(f"- **CTAs:** {ctas}")
        md.append(f"- **Platforms:** {platforms}")
        md.append("")

    return "\n".join(md)

def format_creative_hook_delta(before: Dict[str, Any], after: Dict[str, Any]) -> str:
    if not before or not after:
        return "Delta unavailable."
        
    before_hooks = {h.get("id"): h for h in before.get("hooks", []) if h.get("id")}
    after_hooks = {h.get("id"): h for h in after.get("hooks", []) if h.get("id")}
    
    md = []
    md.append("## Creative Hook Revision Delta")
    md.append("")
    
    new_hooks = [h for hid, h in after_hooks.items() if hid not in before_hooks]
    modified_hooks = []
    for hid, ah in after_hooks.items():
        bh = before_hooks.get(hid)
        if bh and (bh.get("headline") != ah.get("headline") or bh.get("viralityScore") != ah.get("viralityScore")):
            modified_hooks.append((bh, ah))
            
    if new_hooks:
        md.append("### ✨ New Hooks Generated")
        for h in new_hooks:
            md.append(f"- **{h.get('category', 'Unknown')}**: {h.get('headline')} (Score: {h.get('viralityScore', 'N/A')})")
        md.append("")
        
    if modified_hooks:
        md.append("### 📝 Modified Hooks")
        for bh, ah in modified_hooks:
            md.append(f"#### [{ah.get('id')}] {ah.get('category', 'Unknown')}")
            md.append(f"- **Before** (Score: {bh.get('viralityScore')}): {bh.get('headline')}")
            md.append(f"- **After**  (Score: {ah.get('viralityScore')}): {ah.get('headline')}")
            md.append("")
            
    if not new_hooks and not modified_hooks:
        md.append("No significant changes in headlines or scores detected.")
        
    return "\n".join(md)

def export_hooks_csv(matrix: Dict[str, Any]) -> str:
    if not matrix or not isinstance(matrix, dict):
        return ""
    hooks = matrix.get("hooks", [])
    if not hooks:
        return ""
        
    import csv
    import io
    output = io.StringIO()
    writer = csv.writer(output)
    
    headers = ["ID", "Category", "Headline", "Psychological Angle", "CTAs", "Platforms", "Virality Score"]
    writer.writerow(headers)
    
    for h in hooks:
        ctas = ", ".join(h.get("ctas", [])) if isinstance(h.get("ctas"), list) else h.get("ctas", "")
        platforms = ", ".join(h.get("platforms", [])) if isinstance(h.get("platforms"), list) else h.get("platforms", "")
        writer.writerow([
            h.get("id", ""),
            h.get("category", ""),
            h.get("headline", ""),
            h.get("psychologicalAngle", ""),
            ctas,
            platforms,
            h.get("viralityScore", "")
        ])
    return output.getvalue()

def export_hooks_ad_script(matrix: Dict[str, Any]) -> str:
    if not matrix or not isinstance(matrix, dict):
        return ""
    hooks = matrix.get("hooks", [])
    if not hooks:
        return ""
        
    md = []
    md.append("# Ad Scripts")
    for h in hooks:
        md.append(f"\n## Hook: {h.get('headline', '')}")
        md.append(f"**Angle:** {h.get('psychologicalAngle', '')}")
        ctas = ", ".join(h.get("ctas", [])) if isinstance(h.get("ctas"), list) else h.get("ctas", "")
        md.append(f"**Call to Action:** {ctas}")
        md.append("---\n[Video/Visual placeholder]\n[Voiceover starts]\n\n")
        
    return "\n".join(md)
