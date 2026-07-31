# AgentMark — Complete Repository Directory & File Structure Guide

This document provides a comprehensive, file-by-file blueprint and detailed explanation of every directory, component, service, and script in the **AgentMark** repository.

---

## Table of Contents

1. [Root Workspace Directory](#1-root-workspace-directory)
2. [AI Service (`/ai-service`)](#2-ai-service-ai-service)
3. [AgentMark MCP Server (`/agentmark-mcp-server`)](#3-agentmark-mcp-server-agentmark-mcp-server)
4. [Express Backend (`/backend`)](#4-express-backend-backend)
5. [React Frontend (`/frontend`)](#5-react-frontend-frontend)
6. [E2E Testing Suite (`/e2e`)](#6-e2e-testing-suite-e2e)

---

## 1. Root Workspace Directory

| File / Folder | Purpose & Explanation |
| :--- | :--- |
| `start-agentmark.bat` | One-click Windows batch startup script. Launches Redis, Backend, AI Service, and Frontend in separate process windows. |
| `run_all_tests.ps1` | Master PowerShell script that runs test suites across Backend (Jest), Frontend (Vitest), AI Service (Pytest), and MCP Server. |
| `README.md` | Primary GitHub repository documentation containing architecture diagrams, quickstart guides, environment variable references, and MCP integration details. |
| `PROJECT_EXPLANATION.md` | Deep architectural guide detailing system data flow, LangGraph state machine, database schemas, and multi-agent coordination. |
| `PROJECT_FOLDER_FILE_STRUCTURE.md` | (This document) Complete inventory and structural reference of all files in the project. |
| `PROJECT_STYLE.md` | Design system documentation for the "Dark Luxury Tech" aesthetic (HSL CSS variables, typography, component rules). |
| `MISSING_AI_OUTPUT_DATA.md` | Data rendering audit document tracking field display coverage (~96%) across all 7 agent outputs in the frontend. |
| `default_personas.json` | Baseline JSON templates for synthetic consumer personas used by the Focus Group engine. |
| `package.json` | Root workspace package manifest for script execution. |

---

## 2. AI Service (`/ai-service`)

Python 3.10+ FastAPI server running the LangGraph state machine on port **5002**.

### Core Files
- `main.py`: FastAPI server entry point. Configures CORS, request correlation ID middleware (`X-Request-ID`), pre-loads prompt templates into RAM, and compiles the singleton LangGraph workflow during startup.
- `run.py`: Uvicorn runner script for launching the FastAPI service.
- `pyproject.toml` & `requirements.txt`: Python package dependencies (LangGraph, LangChain, FastAPI, Pydantic v2, Tavily, Redis, Pytest).
- `version.py`: Centralized version definition file.
- `ADR.md`: Architecture Decision Records register (ADR-001 through ADR-005).
- `ARCHITECTURE_PRINCIPLES.md`: Core system invariants and architectural rules.

### Subdirectories & Modules

#### `agents/` — Autonomous Agent Nodes
- `state.py`: Defines `CampaignState`, the shared Pydantic TypedDict passed between all LangGraph nodes.
- `manager.py`: Manager Specialist. Parses campaign brief, sets execution plan, and coordinates handoffs.
- `research.py`: Market Research Specialist. Conducts real-time web searches via Tavily API and aggregates competitor data.
- `strategy.py`: Brand Strategy Specialist. Formulates positioning pillars, channel allocations, and messaging themes.
- `copywriter.py`: Copywriter Specialist. Generates multi-channel copy for X, LinkedIn, Email, Ads, SMS, etc.
- `creative_hook_matrix.py`: Creative Hook Matrix Agent. Generates viral hook angles per channel (gated by `ENABLE_CREATIVE_HOOK_MATRIX`).
- `image_prompt.py`: Visual Prompt Specialist. Creates detailed art direction prompts for DALL-E 3, Midjourney, Imagen 3, and Flux.
- `reviewer.py`: Quality Reviewer Specialist. Scores outputs (0–100) and checks brand compliance.
- `publisher.py`: Distribution Publisher Specialist. Formulates content calendars and asset checklists.
- `human_approval.py`: Human Approval Gate Node. Pauses graph execution when HITL approval is required.
- `focus_group.py`: Synthetic Focus Group Engine. Simulates audience reactions across demographic personas.
- `evaluator.py`: Independent Evaluator Agent. Runs prompt-isolated quality checks for EMOS quality gates.
- `persona_composer.py`: Constructs demographic and psychographic persona prompts.
- `devils_advocate.py`: Generates adversarial critiques for copy refinement.
- `trust_analyzer.py`: Analyzes copy trust signals and credibility indicators.

#### `workflow/` — LangGraph Assembly & EMOS Engines
- `graph.py`: Builds and pre-compiles the `StateGraph` workflow singleton with `MemorySaver` checkpointer.
- `routing.py`: Conditional routing logic for quality score checks and revision loops.
- `context.py`: EMOS Phase 1: Generates minimal JSON Context Contracts (<250 tokens) from Brand Vault snapshots.
- `retrieval.py`: EMOS Phase 2: Hybrid Reciprocal Rank Fusion (RRF) search engine combining BM25 and vector search.
- `policy.py`: EMOS Phase 3: 4-Tier Layered Policy Engine (Platform → Industry → Tenant → Campaign).
- `learning.py`: EMOS Phase 4: 90-Day Memory Decay weighting engine ($\lambda = \frac{\ln 2}{90}$).

#### `api/` & `routers/` — HTTP API Endpoints
- `api/dependencies.py`: Security middleware verifying `INTERNAL_SERVICE_SECRET` headers.
- `api/routes/campaigns.py`: REST routes for creating campaigns, generating copy variants, testing API keys, and enhancing prompts.
- `api/routes/health.py`: Health check endpoint (`GET /health`).
- `routers/focus_group_router.py`: Secured endpoints for Focus Group simulations (`/focus-group/simulate` and `/interview`).

#### `llm/` — LLM Factory & Failover Pool
- `factory.py`: LLM provider manager supporting Gemini, OpenAI, and Groq with automatic failover fallback.
- `gemini_client.py`: Client wrapper for Google Gemini models with schema auto-repair.
- `openai_client.py`: Client wrapper for OpenAI GPT-4o models.
- `groq_client.py`: Client wrapper for Groq Llama 3.3-70b inference.

#### `schemas/` — Pydantic Validation Models
- `agent_outputs.py`: Output schemas for all 7 specialist agents.
- `campaign.py`: API request/response schemas for campaign management.
- `simulation.py`: Schemas for Focus Group reports, persona critiques, and objection analysis.

#### `utils/` & `utils/telemetry/` — Infrastructure & Tracing
- `redis_publisher.py`: Handles publishing real-time agent execution events to Redis channels.
- `telemetry/emos_tracer.py`: OpenTelemetry context propagator (`trace_id`, `span_id`, `campaign_id`, `evidence_id`).
- `telemetry/execution_analyzer.py`: Tracks P50/P95/P99 latency SLA percentiles.
- `telemetry/execution_report.py`: Generates execution diagnostic reports.
- `telemetry/pipeline_tracer.py`: Timeline event tracer.

---

## 3. AgentMark MCP Server (`/agentmark-mcp-server`)

Python FastMCP server that connects AI desktop hosts (Claude Desktop, Cursor IDE, Windsurf) to AgentMark via Model Context Protocol.

### Core Files
- `pyproject.toml`: Server dependencies and project metadata.
- `test_audit.py`: Lightweight developer script to list registered MCP tools.
- `src/agentmark_mcp/server.py`: FastMCP server entry point. Registers 6 tools via thread-safe lazy loading (`_get_impl`).
- `src/agentmark_mcp/client.py`: Asynchronous HTTP client for interacting with the Express backend REST API.
- `src/agentmark_mcp/session_status.py`: Writes tamper-evident MCP session state evidence.

### `src/agentmark_mcp/tools/` — Tool Implementations
- `campaign.py`: Implements `generate_campaign` (triggers full 7-agent pipeline).
- `focus_group.py`: Implements `run_focus_group` (runs persona simulation).
- `extended.py`: Implements `create_project` (creates project workspace) and `publish_to_channel` (triggers Publisher agent).
- `revision.py`: Implements `revise_copy_with_feedback` (copywriter revision + auto focus group) and `get_campaign_status` (checks progress & review scores).

---

## 4. Express Backend (`/backend`)

Node.js + Express + TypeScript orchestration server running on port **5003**.

### Core Infrastructure
- `src/index.ts`: Entry point. Initializes Express, HTTP server, Socket.IO server, and graceful shutdown handlers.
- `src/db.ts`: Singleton instance of Prisma Client connected to PostgreSQL.
- `prisma/schema.prisma`: Database schema defining `User`, `Project`, `Campaign`, `Notification`, `CampaignMemorySnapshot`, `ApiKey`, `McpActivity`, `BrandVaultEvent`, and `BrandVaultSnapshot`.

### Middlewares (`src/middlewares/`)
- `auth.middleware.ts`: Dual-mode authentication middleware supporting both JWT Bearer tokens and `am_` Developer API Keys.
- `mcp-logger.middleware.ts`: Logs MCP tool invocations to the `McpActivity` database table.
- `rate-limit.middleware.ts`: Express rate limiters for protecting sensitive endpoints.

### Feature Modules (`src/modules/`)
- `auth/`: Account creation (`/api/auth/signup`), authentication (`/login`), user context (`/me`), and token management.
- `campaigns/`: Campaign CRUD operations, background AI runner invocation, HITL approval/rejection, copy variant generation, and Socket.IO progress emission.
- `brand-vault/`: EMOS Phase 1 Brand Vault event logging, snapshot materialization, and Context Contract API routes.
- `developer/`: Developer API key lifecycle management (SHA-256 hash storage) and 1-click Claude Desktop configuration installer.
- `focus-group/`: Proxy router for forwarding Focus Group simulation and interview requests to the AI Service.
- `imagekit/`: Generates authentication signatures for ImageKit CDN media uploads.
- `notifications/`: Notification management and real-time WebSocket delivery.
- `projects/`: Project CRUD operations and Memory Hub status tracking.

### Utilities (`src/utils/`)
- `ai-client.ts`: Axios HTTP client for communicating with the Python AI Service (with 10-minute execution timeout).
- `redis-subscriber.ts`: Listens to Redis `campaign:*` Pub/Sub channels and broadcasts events to frontend Socket.IO rooms.
- `claude-config.ts`: Truthful 9-state machine for tracking Claude Desktop MCP connection status.
- `claude-config-resolver.ts`: Resolves OS-specific `claude_desktop_config.json` paths across Windows, macOS, and Linux.
- `jwt.ts`: Utility for signing and verifying JWT tokens.
- `password.ts`: Utility for bcrypt password hashing and verification.
- `learning.ts`: Backend calculation helpers for 90-day memory decay weighting.
- `retrieval.ts`: Backend helpers for Hybrid RRF search.
- `telemetry.ts`: Backend OpenTelemetry tracer wrapper.

---

## 5. React Frontend (`/frontend`)

Single-Page Application built with React 18, TypeScript, and Vite on port **5173**.

### Application Entry
- `index.html`: Base HTML document including font references for Sora and JetBrains Mono.
- `src/main.tsx`: React DOM root renderer.
- `src/App.tsx`: React Router DOM v6 route definitions wrapped in `AuthProvider`.
- `src/index.css`: Global CSS design system containing HSL CSS custom properties, utility classes, and keyframe animations.

### Public Assets (`public/`)
- `create_campaign.mp4`: Silent masterclass tutorial video for campaign creation.
- `customize_copy.mp4`: Tutorial video for inspecting and editing copywriter deliverables.
- `setup_api_keys.mp4`: Tutorial video for adding LLM provider API credentials.
- `visual_studio_bridges.mp4`: Tutorial video for generating artwork via visual prompts.

### Feature Pages (`src/components/pages/`)
- `landingPage/`: Public marketing landing page with Hero section, Savings section, Scale section, and Workflow overview.
- `login/` & `signup/`: Authentication forms for user login and registration.
- `dashboard/`: Main dashboard presenting project overviews, campaign performance stats, and recent activity logs.
- `projects/`: Project management views including creation, editing, deletion, and project detail campaign lists.
- `campaign/`: Campaign detail suite:
  - `NewCampaignPage.tsx`: Campaign brief configuration form.
  - `campaignLive/CampaignLivePage.tsx`: Real-time agent execution visualizer powered by Socket.IO.
  - `campaignResult/CampaignResultPage.tsx`: Tabbed result viewer displaying Research, Strategy, Copywriter, Visuals, Focus Group, Reviewer, and Publisher outputs.
- `history/`: Searchable and filterable history of all past campaigns.
- `memoryHub/`: Brand Memory Hub displaying saved brand voice parameters and historical quality trends.
- `settings/`: API key configuration, notification preferences, user profile, and 1-click Claude Desktop MCP connector.
- `docs/DocsPage.tsx`: Comprehensive in-app documentation with wrapped table-of-contents navigation and live search.
- `support/Support.tsx`: Help center featuring FAQ accordion, support contact links, and interactive video tutorial lightbox.

### Services & Contexts
- `contexts/AuthContext.tsx`: Manages authentication state, user session, and JWT token persistence.
- `services/api.ts`: Axios HTTP client with request/response interceptors and Brand Vault API methods.
- `services/llm-settings.service.ts`: Helper for reading/writing LLM credentials in local storage.
- `services/notifications.service.ts`: Service for managing user notification streams.

---

## 6. E2E Testing Suite (`/e2e`)

Automated end-to-end testing infrastructure using Playwright and Jest.

- `e2e/config/playwright.config.ts`: Configuration for Playwright browser testing.
- `e2e/orchestrator/e2e-runner.ts`: Orchestrates test environment setup and service health checks.
- `e2e/helpers/`: Observers for monitoring database updates, Redis Pub/Sub messages, and Socket.IO events during test runs.
- `e2e/specs/`: End-to-end test scenarios covering campaign creation flow, HITL review/approval, socket reconnection, and targeted revisions.
