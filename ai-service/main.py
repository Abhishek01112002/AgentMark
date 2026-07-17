"""
AgentMark AI Service - FastAPI Server

Multi-Agent Marketing Campaign Orchestration with LangGraph
"""

import utils.logger  # noqa: F401
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
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.health import router as health_router
from api.routes.campaigns import router as campaign_router
from routers.focus_group_router import router as focus_group_router
from api.dependencies import verify_internal_secret
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
    docs_url="/docs" if os.getenv("ENV", "development") == "development" else None,
    redoc_url="/redoc" if os.getenv("ENV", "development") == "development" else None,
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
app.include_router(campaign_router, dependencies=[Depends(verify_internal_secret)])
# Focus Group router: user-triggered (not internal), exposed under /api prefix via reverse proxy
app.include_router(focus_group_router)


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("SERVICE_PORT", 5002))
    host = os.getenv("SERVICE_HOST", "127.0.0.1")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        log_level="info",
    )
