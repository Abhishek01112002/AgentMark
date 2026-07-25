"""
Simulation Schemas for Synthetic Focus Group — Optimized Production Version

This file defines the structured Pydantic v2 schemas used by the
Persona Factory, Persona Agents, and Analyst Agent. It includes strict
constraints, custom validators, and performance configurations.
"""

import re
import logging
from typing import List
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

logger = logging.getLogger("agentmark.simulation")

# ── Pre-compiled Regex Patterns (Module-level for O(1) compilation overhead) ──
SLUG_REGEX = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

# ── Base Model Config ──────────────────────────────────────────────────────────
SIMULATION_CONFIG = ConfigDict(
    extra="forbid",             # Prevent LLM from hallucinating extra fields
    str_strip_whitespace=True,  # Auto-strip whitespaces and newlines
    validate_assignment=True,   # Re-validate fields if mutated programmatically
    populate_by_name=True       # Allow population by field names or aliases
)


class PersonaProfile(BaseModel):
    """Profile representing a virtual target consumer."""
    model_config = SIMULATION_CONFIG

    id: str = Field(
        ..., 
        max_length=50,
        description="Unique URL-friendly slug (e.g., 'rajesh-45-real-estate')"
    )
    name: str = Field(
        ..., 
        max_length=100,
        description="Realistic local name based on target region"
    )
    age: int = Field(
        ..., 
        ge=1, 
        le=100, 
        description="Age matching target segment"
    )
    occupation: str = Field(
        ..., 
        max_length=100, 
        description="Specific job title"
    )
    income_bracket: str = Field(
        ..., 
        max_length=50, 
        description="Income category or range"
    )
    buying_barriers: List[str] = Field(
        ..., 
        min_length=1, 
        max_length=10,
        description="Specific fears/doubts when purchasing"
    )
    trust_triggers: List[str] = Field(
        ..., 
        min_length=1, 
        max_length=10,
        description="Specific elements that build credibility"
    )
    cognitive_profile: str = Field(
        ..., 
        max_length=1500, 
        description="Behavioral instructions for LLM simulation roleplay"
    )
    company_size: str | None = Field(default=None, description="Target company size segment")
    buying_stage: str | None = Field(default=None, description="Stage in purchase decision process")
    risk_tolerance: str | None = Field(default=None, description="Risk tolerance level")
    trust_sensitivity: str | None = Field(default=None, description="Sensitivity to evidence & proof")
    objection_patterns: List[str] | None = Field(default=None, description="Specific objection patterns")
    communication_style: str | None = Field(default=None, description="Communication style preference")

    @field_validator("id")
    @classmethod
    def validate_slug_format(cls, value: str) -> str:
        """Enforces URL-friendly alphanumeric slug format, auto-correcting separators."""
        # Replace underscores and spaces with hyphens, convert to lowercase
        cleaned = value.strip().replace("_", "-").replace(" ", "-").lower()
        # Collapse multiple hyphens into a single hyphen and strip trailing/leading hyphens
        cleaned = re.sub(r"-+", "-", cleaned).strip("-")
        
        if not SLUG_REGEX.match(cleaned):
            raise ValueError(f"id must be a valid lowercase slug (e.g. 'rajesh-45'). Got: {value}")
        return cleaned


class PersonaRubric(BaseModel):
    """4-axis Likert rubric evaluation (1-5 scale)."""
    model_config = SIMULATION_CONFIG

    clarity: int = Field(default=3, ge=1, le=5, description="1=Confusing/Vague, 5=Crystal Clear")
    trust: int = Field(default=3, ge=1, le=5, description="1=Unbelievable/Fake, 5=Highly Credible")
    value: int = Field(default=3, ge=1, le=5, description="1=Weak/Irrelevant, 5=Must-Have Benefit")
    urgency: int = Field(default=3, ge=1, le=5, description="1=Zero Urgency, 5=Immediate Action")


class PersonaCritique(BaseModel):
    """Critique output from an individual persona auditing copy."""
    model_config = SIMULATION_CONFIG

    persona_id: str = Field(
        ..., 
        max_length=50,
        description="Reference to the persona ID"
    )
    rubric: PersonaRubric = Field(
        default_factory=PersonaRubric,
        description="4-axis Likert rubric scoring breakdown"
    )
    resonance_score: int = Field(
        default=60, 
        ge=0, 
        le=100, 
        description="Score from 0 to 100 on alignment with needs"
    )
    objection: str = Field(
        ..., 
        min_length=10, 
        max_length=1000, 
        description="Main objection or reason for hesitation"
    )
    clash_quote: str = Field(
        ..., 
        max_length=500, 
        description="Direct quote from the ad copy that triggered the objection"
    )
    click_intent: bool = Field(
        ..., 
        description="True if they would click, False if they would scroll past"
    )
    verdict: str = Field(
        ..., 
        min_length=10, 
        max_length=1000, 
        description="Short explanation of their final decision"
    )

    @model_validator(mode="before")
    @classmethod
    def compute_resonance_score_from_rubric(cls, data: any) -> any:
        if isinstance(data, dict):
            rubric_raw = data.get("rubric")
            if isinstance(rubric_raw, dict):
                c = rubric_raw.get("clarity", 3)
                t = rubric_raw.get("trust", 3)
                v = rubric_raw.get("value", 3)
                u = rubric_raw.get("urgency", 3)
                computed = (c + t + v + u) * 5
                data["resonance_score"] = max(0, min(100, computed))
            elif isinstance(rubric_raw, PersonaRubric):
                computed = (rubric_raw.clarity + rubric_raw.trust + rubric_raw.value + rubric_raw.urgency) * 5
                data["resonance_score"] = max(0, min(100, computed))
        return data


class ActionableRecommendation(BaseModel):
    """Actionable advice generated by the Analyst Agent."""
    model_config = SIMULATION_CONFIG

    target_channel: str = Field(
        ..., 
        max_length=50,
        description="Target marketing channel (e.g., 'LinkedIn', 'Instagram', 'Email')"
    )
    friction_identified: str = Field(
        ..., 
        min_length=10, 
        max_length=1000, 
        description="Specific objection or gap found"
    )
    suggested_revision: str = Field(
        ..., 
        min_length=10, 
        max_length=2000, 
        description="Rewrite copy suggestion to resolve friction"
    )


class DevilsAdvocateIssue(BaseModel):
    """Specific risk or friction point identified by the Devil's Advocate Agent."""
    model_config = SIMULATION_CONFIG

    issue: str = Field(..., min_length=5, max_length=500, description="The specific risk or claim weakness")
    severity: str = Field(..., description="CRITICAL, HIGH, MEDIUM, or LOW")
    evidence: str = Field(..., min_length=5, max_length=500, description="Quote or missing proof trigger")
    recommended_fix: str = Field(..., min_length=5, max_length=1000, description="Actionable revision step")


class GatedReadiness(BaseModel):
    """Pre-Flight gate evaluation results."""
    model_config = SIMULATION_CONFIG

    passed_gates: bool = Field(default=True, description="True if trust >= 75% and critical issues == 0")
    trust_score: float = Field(default=80.0, ge=0.0, le=100.0, description="Calculated Trust & Credibility metric (0-100)")
    evidence_score: float = Field(default=75.0, ge=0.0, le=100.0, description="60% Evidence Signals score")
    persona_perception_score: float = Field(default=80.0, ge=0.0, le=100.0, description="40% Persona Perception score")
    cognitive_load: float = Field(default=30.0, ge=0.0, le=100.0, description="Mental processing effort score (lower is better)")
    failed_reasons: List[str] = Field(default_factory=list, description="List of gate violation reasons if failed")


class DecisionExplanation(BaseModel):
    """Structured decision rationale and detected trust signals (replaces ReasoningSummary)."""
    model_config = SIMULATION_CONFIG

    positive_drivers: List[str] = Field(default_factory=list, description="Top copy elements driving conversion")
    negative_drivers: List[str] = Field(default_factory=list, description="Top copy elements causing friction")
    detected_signals: List[str] = Field(default_factory=list, description="Verifiable trust elements found in text")
    recommendations: List[str] = Field(default_factory=list, description="Actionable revision steps")
    confidence_factors: List[str] = Field(default_factory=list, description="Calibration evidence factors")
    confidence_score: float = Field(default=0.92, ge=0.0, le=1.0, description="Prediction calibration score (0.0 to 1.0)")


class TrustSignalAnalysis(BaseModel):
    """Output from independent Trust Analyzer Agent."""
    model_config = SIMULATION_CONFIG

    evidence_score: float = Field(default=70.0, ge=0.0, le=100.0, description="60% Evidence Signals score")
    detected_proof_elements: List[str] = Field(default_factory=list, description="Verifiable proof found (logos, metrics, guarantees)")
    missing_proof_elements: List[str] = Field(default_factory=list, description="Missing proof elements causing skepticism")


class ExecutionTelemetry(BaseModel):
    """Observability metadata for latency, tokens, model, and cost."""
    model_config = SIMULATION_CONFIG

    latency_ms: float = Field(default=0.0, ge=0.0, description="Execution duration in milliseconds")
    token_count: int = Field(default=0, ge=0, description="Total prompt + completion tokens used")
    model_used: str = Field(default="smart_client", description="Primary LLM provider/model used")
    estimated_cost_usd: float = Field(default=0.0, ge=0.0, description="Estimated API cost in USD")


class DebateRound(BaseModel):
    """Transcript summary for a single round of persona debate."""
    model_config = SIMULATION_CONFIG
    round_number: int = Field(..., ge=1, le=3, description="Debate round number (1=Initial, 2=Cross-Objections, 3=Final Decision)")
    speaker_persona_id: str = Field(..., description="Persona ID of speaker")
    target_persona_id: str | None = Field(default=None, description="Persona ID being addressed in cross-objections")
    transcript: str = Field(..., max_length=2000, description="Persona statement referencing campaign claims or evidence")


class DebateSummary(BaseModel):
    """Multi-Persona Debate Engine summary."""
    model_config = SIMULATION_CONFIG
    buying_probability: float = Field(..., ge=0.0, le=100.0, description="Overall buying committee probability percentage")
    consensus: str = Field(..., description="Committee consensus: 'approve', 'revise', or 'reject'")
    top_objections: List[str] = Field(default_factory=list, description="Top objections raised during debate")
    unresolved_risks: List[str] = Field(default_factory=list, description="Unresolved buying blockers")
    strongest_positive_signals: List[str] = Field(default_factory=list, description="Strongest value drivers agreed upon by panel")
    rounds: List[DebateRound] = Field(default_factory=list, description="Structured 3-round debate transcripts")


class FocusGroupReport(BaseModel):
    """Complete output schema of the Synthetic Focus Group simulation."""
    model_config = SIMULATION_CONFIG

    overall_score: int = Field(..., ge=0, le=100, description="Negativity-biased overall score (0-100)")
    persona_critiques: List[PersonaCritique] = Field(..., min_length=1, description="List of individual persona critiques")
    actionable_recommendations: List[ActionableRecommendation] = Field(..., description="List of actionable recommendations")
    personas: List[PersonaProfile] = Field(default_factory=list, description="List of persona profiles used")
    gated_readiness: GatedReadiness = Field(default_factory=GatedReadiness, description="Hard gate readiness assessment")
    devils_advocate_issues: List[DevilsAdvocateIssue] = Field(default_factory=list, description="Adversarial conversion risk audit")
    decision_explanation: DecisionExplanation = Field(default_factory=DecisionExplanation, description="Structured decision explanation")
    trust_signal_analysis: TrustSignalAnalysis = Field(default_factory=TrustSignalAnalysis, description="Independent evidence signal audit")
    telemetry: ExecutionTelemetry = Field(default_factory=ExecutionTelemetry, description="Execution latency, token, and cost metrics")
    debate_summary: DebateSummary | None = Field(default=None, description="Optional Phase 1B Multi-Persona Debate Engine summary")

    @property
    def reasoning_summary(self) -> DecisionExplanation:
        """Backward compatibility alias for reasoning_summary."""
        return self.decision_explanation

    @model_validator(mode="after")
    def validate_overall_score_boundary(self) -> "FocusGroupReport":
        """
        Validates that the overall score is mathematically logical 
        based on individual critique scores.
        """
        if not self.persona_critiques:
            return self

        max_score = max(c.resonance_score for c in self.persona_critiques)
        min_score = min(c.resonance_score for c in self.persona_critiques)
        
        if self.overall_score > max_score:
             raise ValueError(
                 f"overall_score ({self.overall_score}) cannot be greater than the "
                 f"maximum individual critique score ({max_score})"
             )
        if self.overall_score < min_score:
             raise ValueError(
                 f"overall_score ({self.overall_score}) cannot be lower than the "
                 f"minimum individual critique score ({min_score})"
             )
        return self

    @model_validator(mode="after")
    def validate_persona_id_references(self) -> "FocusGroupReport":
        """
        Fix #10: Cross-validates that all persona_critiques reference valid persona IDs.
        Logs a warning for orphaned critiques instead of crashing,
        preserving graceful degradation.
        """
        if not self.personas or not self.persona_critiques:
            return self
        
        known_ids = {p.id for p in self.personas}
        for critique in self.persona_critiques:
            if critique.persona_id not in known_ids:
                logger.warning(
                    "PersonaCritique references unknown persona_id '%s'. Known IDs: %s",
                    critique.persona_id,
                    list(known_ids)
                )
        return self


class AnalystSynthesis(BaseModel):
    """Lightweight structured output schema for the Analyst LLM call.
    
    Intentionally excludes personas and persona_critiques to reduce
    output token usage and prevent LLM truncation on large panels.
    """
    model_config = SIMULATION_CONFIG

    overall_score: int = Field(
        ..., 
        ge=0, 
        le=100, 
        description="Weighted average of all resonance scores"
    )
    actionable_recommendations: List[ActionableRecommendation] = Field(
        ...,
        min_length=1,  # Fix #6: at least 1 recommendation required
        max_length=10,
        description="Detailed text revision tips to resolve friction — provide at least 1"
    )
    gated_readiness: GatedReadiness = Field(
        default_factory=GatedReadiness,
        description="Gated Pre-Flight readiness results"
    )
    decision_explanation: DecisionExplanation = Field(
        default_factory=DecisionExplanation,
        description="Structured decision rationale and detected trust signals"
    )
    trust_signal_analysis: TrustSignalAnalysis = Field(
        default_factory=TrustSignalAnalysis,
        description="Independent evidence signal audit"
    )

    @property
    def reasoning_summary(self) -> DecisionExplanation:
        """Backward compatibility alias."""
        return self.decision_explanation



class PersonaListContainer(BaseModel):
    """Container schema for generating a list of exactly 5 customer personas."""
    model_config = SIMULATION_CONFIG

    personas: List[PersonaProfile] = Field(
        ..., 
        min_length=5, 
        max_length=5, 
        description="List of exactly 5 distinct target customer personas"
    )
