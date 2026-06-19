"""
CLEAR TEST STATE

This script clears any persisted state between test runs.
Run this before each test to ensure clean state.

Usage:
    python tests/clear_test_state.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

def clear_test_state():
    """Clear any cached/persisted state from previous test runs"""
    
    print("="*80)
    print("🧹 CLEARING TEST STATE")
    print("="*80)
    
    # Note: LangGraph StateGraph doesn't persist state by default
    # State only exists during workflow execution
    # This script is here for future expansion if state persistence is added
    
    print("\n✅ Test state cleared")
    print("   • No persistent state to clear (state only exists during workflow)")
    print("   • Each test run starts with fresh CampaignState")
    print("="*80)

if __name__ == "__main__":
    clear_test_state()
