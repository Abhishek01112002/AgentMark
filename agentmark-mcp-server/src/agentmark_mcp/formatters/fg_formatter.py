"""
fg_formatter.py — Focus Group Simulation Report Formatter

Converts the raw FocusGroupReport dict returned by POST /api/focus-group/simulate
into a structured Markdown report for MCP chat clients.

Expected top-level keys (aligned with AI service FocusGroupReport schema):
  - overall_score              int|float  (0-100)
  - personas                   list[PersonaProfile]
  - persona_critiques          list[PersonaCritique]
  - actionable_recommendations list[ActionableRecommendation]

PersonaCritique keys:
  - persona_id      str
  - resonance_score int|float  (0-100)
  - click_intent    bool
  - verdict         str
  - objection       str
  - clash_quote     str

ActionableRecommendation keys:
  - target_channel      str
  - friction_identified str
  - suggested_revision  str

All string interpolation uses %-style formatting for consistency with the
rest of the codebase's logging/output conventions.
"""

from typing import Any, Dict, List, Optional


def _score_band(score: float) -> str:
    """
    Map an overall_score (0–100) to a human-readable reception tier and verdict.

    Thresholds are calibrated to the AI service's rubric:
      80+  → Strong Reception — campaign resonates well across all persona types
      65+  → Mixed Reception  — solid core but notable friction points exist
      50+  → Lukewarm         — significant objections; revisions strongly advised
      <50  → Weak Reception   — fundamental message or positioning issues
    """
    if score >= 80:
        return "Strong Reception — Approved for publication"
    if score >= 65:
        return "Mixed Reception — Approved with minor revisions"
    if score >= 50:
        return "Lukewarm Reception — Revisions recommended before publishing"
    return "Weak Reception — Major revision required"


def format_focus_group_report(report: Dict[str, Any]) -> str:
    """
    Format a FocusGroupReport into a rich Markdown brief.

    Args:
        report: The raw dict from POST /api/focus-group/simulate (or from DB).

    Returns:
        A Markdown string ready for MCP chat client rendering.
    """
    overall_score: float = float(report.get("overall_score") or 0)
    personas: List[Any] = report.get("personas") or []
    persona_critiques: List[Any] = report.get("persona_critiques") or []
    recommendations: List[Any] = report.get("actionable_recommendations") or []

    # Build persona lookup map for O(1) profile retrieval per critique
    persona_map: Dict[str, Dict[str, Any]] = {}
    for p in personas:
        if isinstance(p, dict) and "id" in p:
            persona_map[p["id"]] = p

    md: List[str] = []

    # ── Header & Summary ──────────────────────────────────────────────────────
    verdict = _score_band(overall_score)

    md.append("# Focus Group Simulation Report")
    md.append("**Overall Group Score:** `%.0f/100`" % overall_score)
    md.append("**Verdict:** %s" % verdict)

    # Click-intent ratio summary: count how many personas indicate willingness to act
    if persona_critiques:
        click_count = sum(
            1 for c in persona_critiques
            if isinstance(c, dict) and c.get("click_intent")
        )
        total_critiques = len(persona_critiques)
        md.append(
            "**Click Intent:** %d / %d personas indicate intent to engage"
            % (click_count, total_critiques)
        )

    md.append("\n---")

    # ── 1. Per-Persona Feedback ───────────────────────────────────────────────
    if persona_critiques:
        md.append("\n## Audience Persona Feedback")

        for critique in persona_critiques:
            if not isinstance(critique, dict):
                continue

            persona_id: Optional[str] = critique.get("persona_id")
            profile: Dict[str, Any] = persona_map.get(persona_id, {}) if persona_id else {}

            name: str = profile.get("name") or persona_id or "Unknown Persona"
            age: Any = profile.get("age", "N/A")
            occupation: str = profile.get("occupation", "N/A")

            resonance_score: float = float(critique.get("resonance_score") or 0)
            click_intent: Optional[bool] = critique.get("click_intent")
            # Use explicit None check so False is not confused with missing
            if click_intent is True:
                click_status = "Will Click"
            elif click_intent is False:
                click_status = "Will Scroll Past"
            else:
                click_status = "Undetermined"

            md.append("\n### %s (Age: %s | %s)" % (name, age, occupation))
            md.append(
                "* **Resonance Score:** `%.0f/100` | **Action:** %s"
                % (resonance_score, click_status)
            )

            rubric = critique.get("rubric")
            if isinstance(rubric, dict):
                c_val = rubric.get("clarity", 3)
                t_val = rubric.get("trust", 3)
                v_val = rubric.get("value", 3)
                u_val = rubric.get("urgency", 3)
                md.append(
                    "* **Rubric Breakdown:** Clarity: %d/5 | Trust: %d/5 | Value: %d/5 | Urgency: %d/5"
                    % (c_val, t_val, v_val, u_val)
                )

            verdict_text: str = critique.get("verdict") or "No verdict provided"
            md.append("* **Final Verdict:** *%s*" % verdict_text)

            objection: str = critique.get("objection", "")
            if objection:
                md.append('* **Key Objection:** "%s"' % objection)

            clash_quote: str = critique.get("clash_quote", "")
            if clash_quote:
                md.append('* **Trigger Content:** "%s"' % clash_quote)
    else:
        md.append("\n*No persona critiques were generated for this simulation.*")

    # ── 2. Actionable Recommendations ────────────────────────────────────────
    if recommendations:
        md.append("\n---")
        md.append("\n## Actionable Recommendations")

        for idx, rec in enumerate(recommendations, start=1):
            if not isinstance(rec, dict):
                continue

            channel: str = rec.get("target_channel", "General").upper()
            friction: str = rec.get("friction_identified", "")
            suggestion: str = rec.get("suggested_revision", "")

            md.append("\n### Recommendation %d: %s" % (idx, channel))
            if friction:
                md.append("**Friction Identified:**\n> %s" % friction)
            if suggestion:
                md.append("\n**Suggested Revision:**\n```\n%s\n```" % suggestion)
    else:
        md.append("\n---")
        md.append("\n*No actionable recommendations were provided.*")

    return "\n".join(md)
