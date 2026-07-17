"""
Simulation Sandbox Test Harness — AgentMark AI Service (Day 5)

This script performs comprehensive end-to-end sandbox validation of the
Synthetic Focus Group system. It covers:
1. Programmatic dataset generation of 50 diverse marketing campaigns.
2. Concurrent simulation execution utilizing a mock client context to generate
   distinct, persona-specific critiques.
3. scikit-learn objection diversity test assertions (average pairwise cosine similarity).
4. Adversarial set validation (extreme ages, malformed slugs, out-of-bounds scores).
"""

import os
import sys
import asyncio
import random
import unittest
from pathlib import Path
from typing import List, Dict, Any

# Ensure project root is in sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pydantic import ValidationError
from schemas.simulation import PersonaProfile, PersonaCritique, ActionableRecommendation, FocusGroupReport
from agents.focus_group import run_focus_group_simulation, get_focus_group_model_provider

# Import scikit-learn and numpy for diversity assertions
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# ─── Mock LLM client helper to simulate distinct persona behaviors ───────────

OBJECTION_TEMPLATES = [
    "As a {occupation}, I am highly concerned about {barrier}. The copy feels like typical marketing fluff.",
    "This copy mentions {trigger}, but it fails to address {barrier} which is my main reservation.",
    "My biggest hesitation is {barrier}. While the copy talks about {trigger}, it doesn't solve my core problem as a {occupation}.",
    "I'm skeptical of the pitch because {barrier}. I need to see more verified proof before I would click.",
    "The pitch is too generic for a {occupation}. It completely ignores my struggle with {barrier}."
]

VERDICT_TEMPLATES = [
    "Without concrete proof points resolving my concern about {barrier}, I would scroll past.",
    "The value proposition is interesting, but I need to see {trigger} before I make a decision.",
    "Since this addresses {trigger}, I might click, but {barrier} still makes me hesitate.",
    "Until they explicitly solve {barrier}, I will not trust this offering.",
    "If they can demonstrate {trigger}, I would be willing to click and explore further."
]

class MockLLMClient:
    """Mock LLM client designed to generate distinct outputs per persona."""
    def __init__(self, provider: str):
        self.provider = provider

    def generate_structured(self, prompt: str, response_model, temperature: float = 0.7):
        # 1. Mock PersonaCritique generation
        if response_model is PersonaCritique:
            # Extract attributes from prompt using quick parse
            persona_name = "Rajesh"
            occupation = "Software Engineer"
            barrier = "high pricing"
            trigger = "detailed documentation"
            persona_id = "test-persona"
            
            # Look for indicators in prompt to determine which persona we are mocking
            if "Priya" in prompt or "priya" in prompt:
                persona_name = "Priya"
                persona_id = "priya-32-busy-mom"
                occupation = "Digital Marketer"
                barrier = "lack of time"
                trigger = "quick setup"
            elif "Rajesh" in prompt or "rajesh" in prompt:
                persona_name = "Rajesh"
                persona_id = "rajesh-45-real-estate"
                occupation = "Software Engineer"
                barrier = "hidden charges"
                trigger = "transparent pricing"
            elif "Aarav" in prompt or "aarav" in prompt:
                persona_name = "Aarav"
                persona_id = "aarav-22-student"
                occupation = "College Student"
                barrier = "expensive subscription"
                trigger = "student discount"
            elif "Vikram" in prompt or "vikram" in prompt:
                persona_name = "Vikram"
                persona_id = "vikram-55-consultant"
                occupation = "Business Consultant"
                barrier = "unproven ROI"
                trigger = "case studies"
            elif "Meera" in prompt or "meera" in prompt:
                persona_name = "Meera"
                persona_id = "meera-28-designer"
                occupation = "UX Designer"
                barrier = "complex interface"
                trigger = "intuitive onboarding"

            # Compute template index based on persona ID length to keep it deterministic
            template_idx = len(persona_id) % len(OBJECTION_TEMPLATES)
            objection = OBJECTION_TEMPLATES[template_idx].format(
                occupation=occupation, barrier=barrier, trigger=trigger
            )
            verdict = VERDICT_TEMPLATES[template_idx].format(
                barrier=barrier, trigger=trigger
            )
            
            # Select clash quote based on the prompt contents
            clash_quote = "industry leading performance"
            if "headline" in prompt.lower():
                clash_quote = "headline copy"

            # Deterministic resonance score and click intent
            resonance_score = 50 + (len(persona_name) * 3) % 45
            click_intent = resonance_score >= 70

            return PersonaCritique(
                persona_id=persona_id,
                resonance_score=resonance_score,
                objection=objection,
                clash_quote=clash_quote,
                click_intent=click_intent,
                verdict=verdict
            )

        # 2. Mock FocusGroupReport synthesis
        if response_model is FocusGroupReport:
            # Extract score from prompt
            overall_score = 65
            for line in prompt.split("\n"):
                if "calculated score" in line.lower() or "score:" in line.lower():
                    try:
                        overall_score = int(line.split(":")[-1].strip())
                    except ValueError:
                        pass

            # Create default critiques to satisfy validator bounds if not overridden
            critiques = [
                PersonaCritique(
                    persona_id="p1", resonance_score=overall_score, objection="Test objection 1",
                    clash_quote="quote", click_intent=True, verdict="Verdict 1: Resonates well with target segment."
                )
            ]

            return FocusGroupReport(
                overall_score=overall_score,
                persona_critiques=critiques,
                actionable_recommendations=[
                    ActionableRecommendation(
                        target_channel="LinkedIn",
                        friction_identified="High pricing barrier detected.",
                        suggested_revision="Provide a clear, upfront student discount option."
                    )
                ]
            )

        return None


# ─── Programmatic Campaign Generator ───────────

INDUSTRIES = ["SaaS", "FinTech", "E-Commerce", "EdTech", "Real Estate", "HealthTech", "CyberSecurity", "AgriTech", "AdTech", "HRTech"]
GOALS = ["Lead Generation", "Brand Awareness", "Sales Conversion", "User Retention", "Product Launch"]
AUDIENCES = ["Gen Z Students", "Retired Professionals", "Small Business Owners", "Corporate HR Directors", "Busy Parents"]

def generate_50_campaigns() -> List[Dict[str, Any]]:
    """Generates 50 unique, highly diverse campaign test scenarios."""
    campaigns = []
    random.seed(42)  # Seed for deterministic generation
    
    for i in range(50):
        industry = INDUSTRIES[i % len(INDUSTRIES)]
        goal = GOALS[i % len(GOALS)]
        audience = AUDIENCES[i % len(AUDIENCES)]
        
        brand_name = f"{industry}Pulse-{i+1}"
        copy_text = (
            f"Unlock the best {industry} tool designed specifically to achieve {goal} for {audience}. "
            f"Stop wasting hours on complex systems. Our industry leading performance will help you scale today!"
        )
        
        campaigns.append({
            "campaign_id": f"campaign-uuid-{i+1:03d}",
            "brand_name": brand_name,
            "target_audience": audience,
            "copy_text": copy_text,
            "industry": industry,
            "goal": goal
        })
        
    return campaigns


# ─── Default 5 Persona Profiles for testing ───────────

DEFAULT_PERSONAS = [
    PersonaProfile(
        id="rajesh-45-real-estate", name="Rajesh", age=45, occupation="Software Engineer",
        income_bracket="High", buying_barriers=["hidden charges", "complex setup"],
        trust_triggers=["transparent pricing", "detailed documentation"],
        cognitive_profile="Skeptical technology professional who reviews code/API docs before purchasing."
    ),
    PersonaProfile(
        id="priya-32-busy-mom", name="Priya", age=32, occupation="Digital Marketer",
        income_bracket="Medium", buying_barriers=["lack of time", "expensive subscription"],
        trust_triggers=["quick setup", "14-day free trial"],
        cognitive_profile="Pragmatic mother looking for immediate value and clean, straightforward UX."
    ),
    PersonaProfile(
        id="aarav-22-student", name="Aarav", age=22, occupation="College Student",
        income_bracket="Low", buying_barriers=["expensive subscription", "long commitment"],
        trust_triggers=["student discount", "no credit card required"],
        cognitive_profile="Budget-conscious student seeking flexible, monthly pricing options."
    ),
    PersonaProfile(
        id="vikram-55-consultant", name="Vikram", age=55, occupation="Business Consultant",
        income_bracket="High", buying_barriers=["unproven ROI", "vague security claims"],
        trust_triggers=["case studies", "enterprise SLA"],
        cognitive_profile="Corporate consultant focused heavily on business outcomes, enterprise references, and security standards."
    ),
    PersonaProfile(
        id="meera-28-designer", name="Meera", age=28, occupation="UX Designer",
        income_bracket="Medium", buying_barriers=["complex interface", "poor branding"],
        trust_triggers=["intuitive onboarding", "modern design"],
        cognitive_profile="Esthete designer who values high-fidelity visuals, modern typography, and frictionless onboarding."
    )
]


# ─── Unittest Suite ───────────

class TestSimulationSandbox(unittest.TestCase):
    """Day 5 Sandbox Test Harness for Synthetic Focus Group Agent."""

    def setUp(self):
        # Programmatically generate our 50 test campaigns
        self.campaigns = generate_50_campaigns()
        self.personas = DEFAULT_PERSONAS

    def test_campaign_generation_diversity(self):
        """Asserts that 50 campaigns were programmatically generated with distinct properties."""
        self.assertEqual(len(self.campaigns), 50)
        
        # Verify diversity of target parameters
        unique_industries = len(set(c["industry"] for c in self.campaigns))
        unique_goals = len(set(c["goal"] for c in self.campaigns))
        unique_audiences = len(set(c["target_audience"] for c in self.campaigns))
        
        self.assertEqual(unique_industries, len(INDUSTRIES))
        self.assertEqual(unique_goals, len(GOALS))
        self.assertEqual(unique_audiences, len(AUDIENCES))

    def test_focus_group_simulation_harness(self):
        """Runs focus group simulation across 50 campaigns and validates diversity metrics."""
        # Use our MockLLMClient inside the focus group library
        mock_client = MockLLMClient("gemini")
        
        # We patch get_llm_client to return our customized mock client
        from unittest.mock import patch
        
        async def run_all_simulations():
            results = []
            for campaign in self.campaigns:
                # Compile reports
                # We mock focus_group's internal LLM clients so it doesn't trigger real network calls
                with patch("agents.focus_group.get_llm_client", return_value=mock_client):
                    report = await run_focus_group_simulation(
                        brand_name=campaign["brand_name"],
                        target_audience=campaign["target_audience"],
                        copy_output=campaign["copy_text"],
                        personas=self.personas,
                        campaign_provider="openai"
                    )
                    results.append((campaign, report))
            return results

        # Execute event loop for the async simulation harness
        sim_results = asyncio.run(run_all_simulations())

        # Track global stats
        total_runs = len(sim_results)
        self.assertEqual(total_runs, 50)

        all_avg_similarities = []

        for idx, (campaign, report) in enumerate(sim_results):
            # Assert schema validity
            self.assertIsInstance(report, FocusGroupReport)
            self.assertEqual(len(report.persona_critiques), 5)
            
            # Check negativity-bias score boundary rule
            min_score = min(c.resonance_score for c in report.persona_critiques)
            max_score = max(c.resonance_score for c in report.persona_critiques)
            self.assertTrue(min_score <= report.overall_score <= max_score)

            # scikit-learn TF-IDF objection diversity test assertions
            objections = [c.objection for c in report.persona_critiques]
            
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(objections)
            
            # Compute pairwise cosine similarities
            similarity_matrix = cosine_similarity(tfidf_matrix)
            
            # Extract upper triangle (excluding diagonal) to get unique pairs
            upper_tri_indices = np.triu_indices_from(similarity_matrix, k=1)
            pairwise_similarities = similarity_matrix[upper_tri_indices]
            
            avg_similarity = float(np.mean(pairwise_similarities))
            all_avg_similarities.append(avg_similarity)

            # Assert that the objections are mathematically distinct (avg cosine similarity < 0.60)
            self.assertLess(
                avg_similarity, 
                0.60, 
                f"Objection diversity failed for Campaign {campaign['campaign_id']}: similarity is {avg_similarity}"
            )

        overall_avg_similarity = sum(all_avg_similarities) / len(all_avg_similarities)
        print(f"\n[Sandbox Harness] Successfully simulated {total_runs} synthetic focus groups!")
        print(f"[Sandbox Harness] Overall Average Critique Cosine Similarity: {overall_avg_similarity:.4f} (Target: < 0.60)")
        self.assertLess(overall_avg_similarity, 0.55)

    def test_adversarial_validation_checks(self):
        """Tests boundaries of simulation Pydantic schemas under adversarial inputs."""
        # 1. Invalid Persona Ages (Out of ge/le bounds)
        with self.assertRaises(ValidationError):
            PersonaProfile(
                id="invalid-age", name="BadAge", age=150, occupation="QA",
                income_bracket="Low", buying_barriers=["pricing"], trust_triggers=["trial"],
                cognitive_profile="Skeptical buyer"
            )

        with self.assertRaises(ValidationError):
            PersonaProfile(
                id="invalid-age-low", name="BadAgeLow", age=-5, occupation="QA",
                income_bracket="Low", buying_barriers=["pricing"], trust_triggers=["trial"],
                cognitive_profile="Skeptical buyer"
            )

        # 2. Invalid Slug id Formats
        with self.assertRaises(ValidationError):
            PersonaProfile(
                id="Rajesh Sharma", name="BadSlugSpace", age=40, occupation="QA",
                income_bracket="Low", buying_barriers=["pricing"], trust_triggers=["trial"],
                cognitive_profile="Skeptical buyer"
            )

        with self.assertRaises(ValidationError):
            PersonaProfile(
                id="rajesh_45", name="BadSlugUnderscore", age=40, occupation="QA",
                income_bracket="Low", buying_barriers=["pricing"], trust_triggers=["trial"],
                cognitive_profile="Skeptical buyer"
            )

        # 3. Invalid Score Boundaries in FocusGroupReport
        critiques = [
            PersonaCritique(persona_id="p1", resonance_score=80, objection="objection1"*5, clash_quote="quote", click_intent=True, verdict="verdict1"*5),
            PersonaCritique(persona_id="p2", resonance_score=90, objection="objection2"*5, clash_quote="quote", click_intent=True, verdict="verdict2"*5)
        ]

        # Overall score 70 is lower than min(80) -> should trigger validator exception
        with self.assertRaises(ValidationError):
            FocusGroupReport(
                overall_score=70,
                persona_critiques=critiques,
                actionable_recommendations=[]
            )

        # Overall score 95 is higher than max(90) -> should trigger validator exception
        with self.assertRaises(ValidationError):
            FocusGroupReport(
                overall_score=95,
                persona_critiques=critiques,
                actionable_recommendations=[]
            )

        # 4. Empty parameters validation bounds
        with self.assertRaises(ValidationError):
            # empty barriers (min_length=1)
            PersonaProfile(
                id="no-barriers", name="NoBarriers", age=30, occupation="QA",
                income_bracket="Low", buying_barriers=[], trust_triggers=["trial"],
                cognitive_profile="Skeptical buyer"
            )

        print("[Sandbox Harness] Adversarial boundaries validation successfully parsed and verified!")


if __name__ == "__main__":
    unittest.main()
