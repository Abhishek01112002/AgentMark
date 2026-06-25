"""
AgentMark AI Service - FastAPI Server

Multi-Agent Marketing Campaign Orchestration with LangGraph
"""

import logging
import os
import sys
from contextlib import asynccontextmanager

# Reconfigure stdout/stderr to UTF-8 to prevent UnicodeEncodeError on Windows terminals
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
if hasattr(sys.stderr, 'reconfigure'):
    try:
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.health import router as health_router
from api.routes.campaigns import router as campaign_router
from workflow.graph import create_campaign_graph
from version import __version__

load_dotenv()
logger = logging.getLogger("agentmark.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize workflow on startup, cleanup on shutdown."""
    logger.info("🚀 Starting AgentMark AI Service v%s", __version__)
    
    # Compile LangGraph workflow once at startup
    logger.info("🔧 Compiling LangGraph workflow...")
    workflow = create_campaign_graph()
    app.state.workflow = workflow
    logger.info("✅ Workflow compiled and cached")
    
    yield
    
    logger.info("🛑 Shutting down AgentMark AI Service")


app = FastAPI(
    title="AgentMark AI Service",
    description="Multi-Agent Marketing Campaign Generation System",
    version=__version__,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health_router)
app.include_router(campaign_router)


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("SERVICE_PORT", 5002))
    host = os.getenv("SERVICE_HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info",
    )
