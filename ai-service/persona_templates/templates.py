"""
Persona Template Library — AgentMark AI Pre-Flight Engine

Base industry templates for B2B SaaS, DTC E-Commerce, and Healthcare.
Used as initial seed structures by the Dynamic Persona Composer.
"""

from typing import Dict, List, Any

PERSONA_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "b2b_saas": [
        {
            "id": "b2b-ciso",
            "role": "Chief Information Security Officer (CISO)",
            "industry": "B2B SaaS",
            "company_size": "Enterprise (1000+ employees)",
            "buying_stage": "Vendor Risk Assessment",
            "risk_tolerance": "Low",
            "trust_sensitivity": "High",
            "decision_weights": {"security": 0.50, "compliance": 0.30, "price": 0.20},
            "objection_patterns": ["SOC2 Type II compliance proof missing", "Data residency unverified"],
            "communication_style": "Analytical & Direct",
            "pain_points": ["Data breaches", "Regulatory non-compliance penalties"],
            "trust_triggers": ["SOC2 / ISO 27001 badges", "Zero-trust architecture documentation"]
        },
        {
            "id": "b2b-cfo",
            "role": "Chief Financial Officer (CFO)",
            "industry": "B2B SaaS",
            "company_size": "Mid-Market to Enterprise",
            "buying_stage": "ROI & Budget Approval",
            "risk_tolerance": "Medium",
            "trust_sensitivity": "High",
            "decision_weights": {"roi": 0.50, "price": 0.30, "implementation_cost": 0.20},
            "objection_patterns": ["Unclear payback period", "Hidden licensing fees"],
            "communication_style": "Data-Driven & Concise",
            "pain_points": ["Runaway SaaS spend", "Unclear ROI calculations"],
            "trust_triggers": ["Audited ROI case studies", "Flexible annual billing discounts"]
        },
        {
            "id": "b2b-vp-eng",
            "role": "VP of Engineering",
            "industry": "B2B SaaS",
            "company_size": "Growth Stage (100-500 employees)",
            "buying_stage": "Technical Evaluation",
            "risk_tolerance": "Medium",
            "trust_sensitivity": "Medium",
            "decision_weights": {"api_quality": 0.40, "scalability": 0.40, "support": 0.20},
            "objection_patterns": ["High integration overhead", "Lack of SDK support"],
            "communication_style": "Technical & Pragmatic",
            "pain_points": ["Developer bandwidth bottlenecks", "Maintenance tech debt"],
            "trust_triggers": ["OpenAPI specifications", "99.99% SLA guarantees"]
        },
        {
            "id": "b2b-end-user",
            "role": "Senior Marketing Operations Lead",
            "industry": "B2B SaaS",
            "company_size": "Any",
            "buying_stage": "Workflow Adoption",
            "risk_tolerance": "High",
            "trust_sensitivity": "Low",
            "decision_weights": {"ease_of_use": 0.60, "speed": 0.30, "ui": 0.10},
            "objection_patterns": ["Steep learning curve", "Clunky UI navigation"],
            "communication_style": "Action-Oriented",
            "pain_points": ["Repetitive manual tasks", "Slow turnaround times"],
            "trust_triggers": ["1-click workflow templates", "Live chat support"]
        }
    ],
    "dtc": [
        {
            "id": "dtc-price-sensitive",
            "role": "Budget-Conscious Shopper",
            "industry": "DTC E-Commerce",
            "company_size": "Consumer",
            "buying_stage": "Price Comparison",
            "risk_tolerance": "Low",
            "trust_sensitivity": "High",
            "decision_weights": {"price": 0.60, "discounts": 0.30, "shipping": 0.10},
            "objection_patterns": ["Shipping costs too high", "No discount code available"],
            "communication_style": "Transactional",
            "pain_points": ["Unexpected checkout fees", "Buyer remorse"],
            "trust_triggers": ["Free shipping threshold", "30-day money-back guarantee"]
        },
        {
            "id": "dtc-brand-loyal",
            "role": "Premium Lifestyle Buyer",
            "industry": "DTC E-Commerce",
            "company_size": "Consumer",
            "buying_stage": "Brand Exploration",
            "risk_tolerance": "High",
            "trust_sensitivity": "Medium",
            "decision_weights": {"quality": 0.50, "brand_reputation": 0.30, "design": 0.20},
            "objection_patterns": ["Cheap packaging perception", "Lack of brand story"],
            "communication_style": "Visual & Emotional",
            "pain_points": ["Inconsistent product quality", "Generic commodities"],
            "trust_triggers": ["Unboxing reviews", "Ethical sourcing stories"]
        },
        {
            "id": "dtc-impulse",
            "role": "Social Media Impulse Shopper",
            "industry": "DTC E-Commerce",
            "company_size": "Consumer",
            "buying_stage": "Instant Purchase",
            "risk_tolerance": "High",
            "trust_sensitivity": "Low",
            "decision_weights": {"novelty": 0.50, "speed": 0.30, "social_proof": 0.20},
            "objection_patterns": ["Checkout takes too many steps", "Slow loading page"],
            "communication_style": "Fast-Paced",
            "pain_points": ["FOMO", "Boredom"],
            "trust_triggers": ["Apple Pay / Shop Pay 1-click", "TikTok viral video clips"]
        }
    ],
    "healthcare": [
        {
            "id": "health-doctor",
            "role": "Attending Physician / Specialist",
            "industry": "Healthcare",
            "company_size": "Hospital / Clinic Network",
            "buying_stage": "Clinical Evaluation",
            "risk_tolerance": "Low",
            "trust_sensitivity": "Very High",
            "decision_weights": {"clinical_efficacy": 0.60, "patient_safety": 0.30, "cost": 0.10},
            "objection_patterns": ["Lack of peer-reviewed clinical trial data", "Unsubstantiated efficacy claims"],
            "communication_style": "Clinical & Evidence-Based",
            "pain_points": ["Adverse patient outcomes", "Unreliable clinical software"],
            "trust_triggers": ["PubMed citations", "Double-blind study results"]
        },
        {
            "id": "health-compliance",
            "role": "Healthcare Compliance & HIPAA Officer",
            "industry": "Healthcare",
            "company_size": "Health System",
            "buying_stage": "Regulatory Audit",
            "risk_tolerance": "Zero",
            "trust_sensitivity": "Very High",
            "decision_weights": {"hipaa_compliance": 0.70, "phi_protection": 0.30},
            "objection_patterns": ["Missing Business Associate Agreement (BAA)", "Unencrypted PHI storage"],
            "communication_style": "Formal & Legalistic",
            "pain_points": ["HIPAA violations", "HHS audits"],
            "trust_triggers": ["Executed BAA template", "SOC2 Type II + HITRUST certification"]
        },
        {
            "id": "health-patient",
            "role": "Chronic Condition Patient",
            "industry": "Healthcare",
            "company_size": "Consumer",
            "buying_stage": "Personal Care Decision",
            "risk_tolerance": "Medium",
            "trust_sensitivity": "High",
            "decision_weights": {"side_effects": 0.40, "ease_of_use": 0.40, "cost": 0.20},
            "objection_patterns": ["Scary potential side effects", "Insurance coverage unverified"],
            "communication_style": "Empathetic & Clear",
            "pain_points": ["Complex medical jargon", "High out-of-pocket costs"],
            "trust_triggers": ["Real patient testimonials", "Doctor endorsement videos"]
        }
    ]
}
