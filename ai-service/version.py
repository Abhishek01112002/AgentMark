"""
AI Service Version

This file defines the version of the AI Service.
Used for tracking API contracts, debugging, and dependency management.

Version Format: MAJOR.MINOR.PATCH
- MAJOR: Breaking changes (state schema changes, agent removal, workflow redesign)
- MINOR: New features (new agents, new fields, backward-compatible changes)
- PATCH: Bug fixes (no API changes)

Current Version: 1.0.0
- 7 AI Agents (Manager, Research, Strategy, Copywriter, Image, Reviewer, Publisher)
- LangGraph Workflow with Revision Loops
- Human-in-the-Loop (HITL) Approval
- Structured Output with Pydantic
- Complete Test Suite

Status: FROZEN
After v1.0.0 freeze, only bug fixes allowed (1.0.1, 1.0.2, etc.)
No new agents, no state schema changes, no workflow changes until v2.0.0
"""

VERSION = "1.0.0"
AI_SERVICE_NAME = "AgentMark AI Service"
STATUS = "FROZEN"

__version__ = VERSION

# Version metadata
VERSION_INFO = {
    "version": VERSION,
    "name": AI_SERVICE_NAME,
    "status": STATUS,
    "agents": [
        "Manager Agent",
        "Research Agent",
        "Strategy Agent",
        "Copywriter Agent",
        "Image Prompt Agent",
        "Reviewer Agent",
        "Publisher Agent"
    ],
    "features": [
        "Multi-Agent LangGraph Workflow",
        "Revision Loops (Max 3 per agent)",
        "Human-in-the-Loop Approval",
        "Structured Output (Pydantic)",
        "Complete Test Suite",
        "Dynamic Agent Routing",
        "Quality Scoring System"
    ],
    "frozen_components": [
        "State Schema (CampaignState)",
        "Agent Interfaces",
        "Workflow Graph",
        "Agent Count (7)",
        "Revision Logic"
    ]
}


def get_version():
    """Return current version string"""
    return VERSION


def get_version_info():
    """Return complete version metadata"""
    return VERSION_INFO


def print_version():
    """Print version information"""
    print("=" * 80)
    print(f"{AI_SERVICE_NAME}")
    print("=" * 80)
    print(f"Version: {VERSION}")
    print(f"Status:  {STATUS}")
    print(f"\nAgents: {len(VERSION_INFO['agents'])}")
    for agent in VERSION_INFO["agents"]:
        print(f"  • {agent}")
    print(f"\nFeatures: {len(VERSION_INFO['features'])}")
    for feature in VERSION_INFO["features"]:
        print(f"  • {feature}")
    print("=" * 80)


if __name__ == "__main__":
    print_version()
