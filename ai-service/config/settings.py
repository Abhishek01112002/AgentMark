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
SERVICE_PORT = int(os.getenv("SERVICE_PORT", 5002))
SERVICE_HOST = os.getenv("SERVICE_HOST", "0.0.0.0")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Backend Service URL
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5001")

# WebSocket Configuration
WS_URL = os.getenv("WS_URL", "ws://localhost:5002")

# Verify critical keys
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not set in .env file")
