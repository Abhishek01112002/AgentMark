"""
Configuration and environment variable management
"""

from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Groq Configuration (Optional)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Redis Configuration
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_DB = int(os.getenv("REDIS_DB", 0))

# Service Configuration
SERVICE_PORT = int(os.getenv("SERVICE_PORT", os.getenv("PORT", 5002)))
SERVICE_HOST = os.getenv("SERVICE_HOST", os.getenv("HOST", "0.0.0.0"))
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Backend Service URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5003")

# WebSocket Configuration
WS_URL = os.getenv("WS_URL", "ws://localhost:5002")

# Feature Flags
ENABLE_CREATIVE_HOOK_MATRIX = os.getenv("ENABLE_CREATIVE_HOOK_MATRIX", "false").lower() in ("true", "1")

# Quality and Revision Threshold Constants (Single Source of Truth)
MAX_AUTO_REVISIONS: int = 3
MAX_HUMAN_REVISIONS: int = 3
MIN_AGENT_SCORE: int = 60
MIN_QUALITY_SCORE: int = 70

# Keys are optional now; the frontend can supply them per request.
