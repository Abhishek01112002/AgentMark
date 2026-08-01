# 📁 AgentMark — Enterprise Repository Architecture & File Blueprint

> [!IMPORTANT]
> **Production Documentation Standard**: This document serves as the authoritative, 100% synchronized file structure specification for the **AgentMark Enterprise AI Marketing Platform**. It outlines every service, module, controller, schema, agent, utility, and configuration file across the monorepo with exact paths and functional responsibilities.

---

## 📊 System Overview & Subsystem Metrics

```
                                  AgentMark Monorepo
                                           │
  ┌───────────────────┬────────────────────┼────────────────────┬───────────────────┐
  │                   │                    │                    │                   │
  ▼                   ▼                    ▼                    ▼                   ▼
Frontend           Backend             AI Service           MCP Server         E2E Testing
React 18 + Vite   Express + Prisma    FastAPI + LangGraph   FastMCP (Python)   Playwright + Jest
Port: 5173         Port: 5003           Port: 5002           Stdio / REST       Integration
```

| Subsystem | Primary Tech Stack | Runtime / Port | Role & Responsibility | File Count |
| :--- | :--- | :--- | :--- | :---: |
| **Frontend** | React 18, TypeScript, Vite | Node.js (Port `5173`) | Single-page UI, live agent progress visualizer, 7-tab dashboard | ~65 files |
| **Backend** | Express, Prisma, PostgreSQL, Redis | Node.js (Port `5003`) | API Gateway, JWT/API Key auth, Redis subscriber, DB storage | ~45 files |
| **AI Service** | FastAPI, LangGraph, LangChain, Pydantic v2 | Python 3.10+ (Port `5002`) | Stateful multi-agent graph execution, LLM failover, Tavily search | ~55 files |
| **MCP Server** | FastMCP SDK, httpx | Python 3.10+ (Stdio/REST) | Claude Desktop / Cursor IDE integration via 6 tools | ~15 files |
| **E2E Suite** | Playwright, Jest, Socket.IO Client | Node.js / Headless Browser | End-to-end user flow, HITL race condition & concurrency tests | ~10 files |

---

## 🗂 Directory Navigation & Structural Map

- 🚀 [1. Root Workspace Configuration](#1-root-workspace-configuration)
- 🧠 [2. Python AI Service (`/ai-service`)](#2-python-ai-service-ai-service)
- 🔌 [3. AgentMark MCP Server (`/agentmark-mcp-server`)](#3-agentmark-mcp-server-agentmark-mcp-server)
- ⚙️ [4. Express Backend (`/backend`)](#4-express-backend-backend)
- 💻 [5. React Frontend (`/frontend`)](#5-react-frontend-frontend)
- 🧪 [6. End-to-End Testing Suite (`/e2e`)](#6-end-to-end-testing-suite-e2e)

---

## 🚀 1. Root Workspace Configuration

> [!NOTE]
> Root-level orchestration scripts, environment definitions, and global specifications.

### Complete Root Files Directory Table

| File Path | Component Type | Purpose & Description |
| :--- | :--- | :--- |
| [`start-agentmark.bat`](file:///e:/AgentMark/AgentMark/start-agentmark.bat) | Batch Script | One-click Windows startup script. Launches Redis, Express Backend, Python AI Service, and Vite Frontend concurrently in separate terminal windows. |
| [`run_all_tests.ps1`](file:///e:/AgentMark/AgentMark/run_all_tests.ps1) | PowerShell | Unified test runner executing Jest backend tests, Vitest frontend tests, AI service Pytests, and MCP server tests in sequence. |
| [`README.md`](file:///e:/AgentMark/AgentMark/README.md) | Documentation | Primary project documentation containing system architecture diagrams, quickstart instructions, environment references, and MCP setup. |
| [`PROJECT_EXPLANATION.md`](file:///e:/AgentMark/AgentMark/PROJECT_EXPLANATION.md) | Documentation | In-depth technical architecture guide detailing data flow, LangGraph state machine, database schemas, and multi-agent coordination. |
| [`PROJECT_FOLDER_FILE_STRUCTURE.md`](file:///e:/AgentMark/AgentMark/PROJECT_FOLDER_FILE_STRUCTURE.md) | Documentation | (This file) Complete structural blueprint and interactive reference for all repository files. |
| [`PROJECT_STYLE.md`](file:///e:/AgentMark/AgentMark/PROJECT_STYLE.md) | Documentation | Design system specification for the "Dark Luxury Tech" aesthetic (HSL CSS tokens, typography, component layout rules). |
| [`MISSING_AI_OUTPUT_DATA.md`](file:///e:/AgentMark/AgentMark/MISSING_AI_OUTPUT_DATA.md) | Audit Spec | Comprehensive data coverage matrix tracking field rendering (~96% coverage) across all 7 agent deliverables in the frontend. |
| [`default_personas.json`](file:///e:/AgentMark/AgentMark/default_personas.json) | JSON Dataset | Baseline demographic and psychographic persona definitions for synthetic Focus Group simulation panels. |
| [`package.json`](file:///e:/AgentMark/AgentMark/package.json) | Configuration | Monorepo root package manifest for workspace task orchestration. |
| [`.gitignore`](file:///e:/AgentMark/AgentMark/.gitignore) | Git Spec | Exclusion rules preventing secrets, build artifacts, virtual environments, and database dumps from entering source control. |

---

## 🧠 2. Python AI Service (`/ai-service`)

> [!TIP]
> The core intelligence engine. Operates a stateful **LangGraph** workflow across specialized AI agents with automatic LLM provider failover (OpenAI → Gemini → Groq).

```
ai-service/
├── main.py                         # FastAPI lifespan entry & prompt cache preloader
├── run.py                          # Uvicorn launcher (Port 5002, loopback binding)
├── pyproject.toml / requirements.txt# Dependency definitions & Pytest configuration
├── agents/                         # 15 Specialized Agent Nodes & Utilities
├── workflow/                       # LangGraph StateGraph assembly & EMOS engines
├── llm/                            # Multi-provider LLM factory & failover clients
├── api/ & routers/                 # FastAPI REST endpoint definitions & security guards
├── schemas/                        # Pydantic structured output models
├── services/                       # Live web search abstraction (Tavily)
└── utils/ & utils/telemetry/       # OpenTelemetry context tracing & Redis Pub/Sub
```

### File-by-File Breakdown & Functional Reference

#### ⚙️ Service Infrastructure & Configuration
- [`ai-service/main.py`](file:///e:/AgentMark/AgentMark/ai-service/main.py): Application entry point. Configures UTF-8 stream re-encoding, CORS policy, request correlation middleware (`X-Request-ID`), pre-loads prompt templates into RAM cache, and compiles the singleton LangGraph graph during lifespan startup.
- [`ai-service/run.py`](file:///e:/AgentMark/AgentMark/ai-service/run.py): Uvicorn server launcher configured to bind strictly to loopback (`127.0.0.1:5002`) for security.
- [`ai-service/config/settings.py`](file:///e:/AgentMark/AgentMark/ai-service/config/settings.py): Centralized environment variable parser loading secrets, model defaults, and feature flags (`ENABLE_CREATIVE_HOOK_MATRIX`).
- [`ai-service/config/emos_config.py`](file:///e:/AgentMark/AgentMark/ai-service/config/emos_config.py): Subsystem parameters for EMOS Brand Vault, Retrieval budgets ($K \le 5$), and Policy tiers.

#### 🤖 Agent Nodes (`ai-service/agents/`)
| Agent Module | Primary Role | Inputs & Key Outputs |
| :--- | :--- | :--- |
| [`state.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/state.py) | **State Definition** | Defines `CampaignState`, the shared Pydantic TypedDict model passed between all nodes. |
| [`manager.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/manager.py) | **Orchestrator** | Parses campaign brief, validates input constraints, and initializes workflow metadata. |
| [`research.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/research.py) | **Market Intelligence** | Conducts live web research via Tavily API; extracts TAM, growth rate, and competitor profiles. |
| [`strategy.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/strategy.py) | **Brand Positioning** | Establishes positioning statement, messaging pillars, target channels, and KPI targets. |
| [`copywriter.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/copywriter.py) | **Multi-Channel Copy** | Crafts tailored creative copy for X threads, LinkedIn, promotional Email, Google Ads, and Meta. |
| [`creative_hook_matrix.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/creative_hook_matrix.py) | **Viral Hook Matrix** | Generates high-converting angle hooks per channel (gated by `ENABLE_CREATIVE_HOOK_MATRIX`). |
| [`image_prompt.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/image_prompt.py) | **Visual Art Prompts** | Formulates art direction prompts for DALL-E 3, Midjourney, Imagen 3, and Flux generators. |
| [`reviewer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/reviewer.py) | **Quality Audit** | Audits all deliverables against brand guidelines and policy, issuing a 0–100 score. |
| [`publisher.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/publisher.py) | **Distribution Planner** | Generates multi-week content calendars, asset checklists, and scheduled post timelines. |
| [`human_approval.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/human_approval.py) | **HITL Gate Node** | Intercepts workflow execution and sets state to `awaiting_human_approval` for user review. |
| [`focus_group.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/focus_group.py) | **Audience Simulator** | Simulates parallel demographic consumer persona reactions, objection scores, and rewrite tips. |
| [`evaluator.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/evaluator.py) | **Independent Gate** | Executes prompt-isolated quality evaluations for EMOS Phase 3 verification gates. |
| [`persona_composer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/persona_composer.py) | **Persona Helper** | Dynamically synthesizes custom target audience personas for simulation panels. |
| [`devils_advocate.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/devils_advocate.py) | **Adversarial Audit** | Generates critical counter-arguments and vulnerability checks for marketing copy. |
| [`trust_analyzer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/trust_analyzer.py) | **Trust Analyzer** | Analyzes social proof, claim credibility, and trust signals within generated copy. |

#### 🔁 LangGraph Workflow Engine (`ai-service/workflow/`)
- [`workflow/graph.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/graph.py): Constructs the `StateGraph` DAG, registers node transitions, attaches `MemorySaver` checkpointer, and exposes `get_compiled_campaign_graph()`.
- [`workflow/routing.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/routing.py): Conditional routing logic evaluating Reviewer scores against `MIN_AGENT_SCORE = 75` and enforcing max revision limits (`MAX_REVISIONS = 3`).
- [`workflow/context.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/context.py): EMOS Phase 1: Minimal Context Contract Builder (<250 tokens) derived from Brand Vault snapshots.
- [`workflow/retrieval.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/retrieval.py): EMOS Phase 2: Hybrid RRF engine combining BM25 keyword matching with pgvector HNSW similarity.
- [`workflow/policy.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/policy.py): EMOS Phase 3: 4-Tier Layered Policy Engine (Platform → Industry → Tenant → Campaign).
- [`workflow/learning.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/learning.py): EMOS Phase 4: Memory Decay weighting engine calculating score half-life decay ($\lambda = \frac{\ln 2}{90}$).

#### 🌐 HTTP Routes & Schemas
- [`api/routes/campaigns.py`](file:///e:/AgentMark/AgentMark/ai-service/api/routes/campaigns.py): Core workflow trigger endpoints (`POST /campaigns/create`, `/generate-copy-variant`, `/enhance-prompt`, `/test-key`).
- [`api/dependencies.py`](file:///e:/AgentMark/AgentMark/ai-service/api/dependencies.py): Middleware enforcing constant-time `INTERNAL_SERVICE_SECRET` header validation (`secrets.compare_digest`).
- [`routers/focus_group_router.py`](file:///e:/AgentMark/AgentMark/ai-service/routers/focus_group_router.py): Endpoints for Focus Group persona simulation (`POST /focus-group/simulate` and `/interview`).
- [`schemas/agent_outputs.py`](file:///e:/AgentMark/AgentMark/ai-service/schemas/agent_outputs.py): Pydantic validation schemas for all agent deliverable objects.

---

## 🔌 3. AgentMark MCP Server (`/agentmark-mcp-server`)

> [!IMPORTANT]
> Bridge connecting Anthropic **Claude Desktop**, **Cursor IDE**, and **Windsurf** directly to the AgentMark platform via natural language tools.

```
agentmark-mcp-server/
├── pyproject.toml                  # FastMCP dependencies & environment definitions
├── test_audit.py                   # Script for auditing active MCP tool registrations
└── src/agentmark_mcp/
    ├── server.py                   # FastMCP server entry point & tool definitions
    ├── client.py                   # Async HTTP client calling Express backend REST API
    ├── session_status.py           # Session evidence status file generator
    ├── formatters/
    │   └── hook_formatter.py       # Terminal & Markdown output formatting utilities
    │   └── hook_formatter.py       # Terminal & Markdown output formatting utilities
    └── tools/                      # Tool implementations (18 Tools total)
        ├── campaign.py             # generate_campaign tool
        ├── extended.py             # create_project, publish_to_channel, request_targeted_revision, etc.
        ├── focus_group.py          # run_focus_group tool
        └── revision.py             # revise_copy_with_feedback & get_campaign_status tools
```

### Registered Tool Reference Suite

| MCP Tool Name | Implementation File | Functionality & Output |
| :--- | :--- | :--- |
| `generate_campaign` | [`tools/campaign.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/campaign.py) | Triggers the complete 8-agent LangGraph pipeline from a brief; streams progress and returns a Markdown campaign brief. |
| `run_focus_group` | [`tools/focus_group.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/focus_group.py) | Runs synthetic consumer focus group testing on campaign copy; returns persona scores, objection quotes, and rewrite tips. |
| `publish_to_channel` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Approves campaign and invokes Publisher agent to generate distribution schedules and content calendars. |
| `create_project` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Programmatically creates a new project workspace and returns its unique UUID. |
| `revise_copy_with_feedback` | [`tools/revision.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/revision.py) | Re-runs Copywriter agent with specific steering notes, then automatically re-evaluates copy with Focus Group. |
| `get_campaign_status` | [`tools/revision.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/revision.py) | Returns real-time status badge, quality score, revision count, and version history array. |
| `request_targeted_revision` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Target specific upstream agent (`copywriter`, `strategy`, `research`, `creative_hook_matrix`, `image_prompt`) for re-execution. |
| `submit_human_approval` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Submit approval decision (`approved` or `rejected`) at the HITL gate. |
| `update_client_memory` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Update brand guidelines, tone of voice, or audience context in Memory Hub. |
| `clear_client_memory` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Reset Memory Hub context for a project. |
| `export_campaign_pdf` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Export strategy, copy, visual prompts, and content calendar as a PDF document. |
| `export_campaign_json` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Export raw creative assets as JSON payload for integrations. |
| `get_publishing_schedule` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Retrieve 4-week content calendar publishing timeline and channel readiness status. |
| `verify_channel_credentials` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Test connected social media and email publishing API credentials. |
| `generate_image_asset` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Directly generate visual image asset from prompt using Gemini or DALL-E. |
| `get_campaign_analytics` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Fetch projected reach, estimated CTR, conversion targets, and performance ROI. |
| `synthesize_brand_memory_intelligence` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Synthesize brand voice guidelines and winning positioning patterns into Memory Hub. |
| `compare_campaign_performance_vectors` | [`tools/extended.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/tools/extended.py) | Perform comparative performance analysis between a target campaign and baseline. |

---

## ⚙️ 4. Express Backend (`/backend`)

> [!NOTE]
> Node.js Express server running on port **5003**. Serves as the central API gateway, database controller, and Redis Pub/Sub → Socket.IO WebSocket broadcaster.

```
backend/
├── prisma/schema.prisma            # PostgreSQL Prisma schema (9 Core Models)
├── .env.example                    # Environment variable template (PORT=5003)
└── src/
    ├── index.ts                    # Express entry point & Socket.IO server initialization
    ├── db.ts                       # Prisma Client singleton
    ├── middlewares/                # Auth, MCP Logger, and Rate Limiting middlewares
    ├── modules/                    # 8 Domain Feature Modules
    └── utils/                      # AI Client, Redis Subscriber, Claude Config State Machine
```

### Domain Feature Modules (`backend/src/modules/`)

```
backend/src/modules/
├── auth/           # Login, signup, JWT token issuance, /api/auth/me
├── brand-vault/    # Brand Vault events, snapshot materialization, context contracts
├── campaigns/      # Campaign CRUD, AI runner, HITL approval/rejection, copy variants
├── developer/      # Developer API key management (SHA-256) & Claude config installer
├── focus-group/    # Focus group proxy & Q&A interview router
├── imagekit/       # ImageKit CDN authentication token provider
├── notifications/  # Notification CRUD & real-time WebSocket delivery
└── projects/       # Project CRUD & Memory Hub status management
```

#### Detailed Module & Utility File Table

| File Path | Description & Responsibilities |
| :--- | :--- |
| [`prisma/schema.prisma`](file:///e:/AgentMark/AgentMark/backend/prisma/schema.prisma) | PostgreSQL database schema defining `User`, `Project`, `Campaign`, `Notification`, `CampaignMemorySnapshot`, `ApiKey`, `McpActivity`, `BrandVaultEvent`, and `BrandVaultSnapshot`. |
| [`src/index.ts`](file:///e:/AgentMark/AgentMark/backend/src/index.ts) | Main entry point. Starts Express HTTP server on port 5003, binds Socket.IO WebSocket server, initializes Redis subscriber, and registers graceful shutdown handlers (`SIGTERM`/`SIGINT`). |
| [`src/db.ts`](file:///e:/AgentMark/AgentMark/backend/src/db.ts) | Global Prisma Client singleton with connection management. |
| [`src/middlewares/auth.middleware.ts`](file:///e:/AgentMark/AgentMark/backend/src/middlewares/auth.middleware.ts) | Dual-mode authentication middleware verifying both JWT session tokens and `am_` Developer API Keys. |
| [`src/middlewares/mcp-logger.middleware.ts`](file:///e:/AgentMark/AgentMark/backend/src/middlewares/mcp-logger.middleware.ts) | Logs all MCP tool invocations to the `McpActivity` database table for audit trails. |
| [`src/middlewares/rate-limit.middleware.ts`](file:///e:/AgentMark/AgentMark/backend/src/middlewares/rate-limit.middleware.ts) | Express rate limiters protecting authentication and campaign creation endpoints. |
| [`src/modules/campaigns/campaign.controller.ts`](file:///e:/AgentMark/AgentMark/backend/src/modules/campaigns/campaign.controller.ts) | Core controller for launching AI runs, processing HITL approval/rejection, and generating channel copy variants. |
| [`src/modules/developer/developer.controller.ts`](file:///e:/AgentMark/AgentMark/backend/src/modules/developer/developer.controller.ts) | Manages Developer API Key lifecycle (SHA-256 hashing) and auto-writing `claude_desktop_config.json`. |
| [`src/utils/ai-client.ts`](file:///e:/AgentMark/AgentMark/backend/src/utils/ai-client.ts) | Axios HTTP client communicating with Python AI Service with a 10-minute execution timeout guard. |
| [`src/utils/redis-subscriber.ts`](file:///e:/AgentMark/AgentMark/backend/src/utils/redis-subscriber.ts) | Listens to Redis `campaign:*` Pub/Sub channels, writes terminal state to PostgreSQL via Prisma, and emits live Socket.IO events to React clients. |
| [`src/utils/claude-config.ts`](file:///e:/AgentMark/AgentMark/backend/src/utils/claude-config.ts) | Truthful 9-state machine tracking Claude Desktop connection status, process PIDs, and signed status evidence files. |

---

## 💻 5. React Frontend (`/frontend`)

> [!TIP]
> Modern Single-Page Application built with **React 18**, **TypeScript**, and **Vite** running on port `5173`. Uses a custom **HSL CSS Design System** (Dark Luxury Tech) without external utility framework overhead.

```
frontend/
├── index.html                      # SPA entry point with Sora & JetBrains Mono font links
├── vite.config.ts / package.json   # Vite configuration, dev server proxies, and dependencies
├── public/                         # Public assets & masterclass tutorial MP4 video files
└── src/
    ├── main.tsx & App.tsx          # React application mounting & React Router DOM v6 routes
    ├── index.css                   # Global HSL CSS design system tokens & animation keyframes
    ├── contexts/AuthContext.tsx    # JWT session authentication state & user context provider
    ├── services/                   # Axios API client, local storage manager, and notification bridge
    ├── types/                      # TypeScript definitions for EMOS contracts & copy variants
    └── components/
        ├── shared/                 # Navigation Sidebar, TopNav, and Responsive UI components
        └── pages/                  # 12 Route Pages (Dashboard, Live Visualizer, Results, Docs, Support)
```

### Frontend Component Directory Map

#### 📦 Shared Components (`frontend/src/components/shared/`)
- [`Sidebar.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/shared/sidebar/Sidebar.tsx): Collapsible navigation sidebar featuring active route highlighting and project switcher.
- [`TopNav.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/shared/topNav/TopNav.tsx): Top navigation bar containing active page titles, user avatar, and notification bell popover.
- [`responsive/`](file:///e:/AgentMark/AgentMark/frontend/src/components/shared/responsive/): Responsive stat cards (`ResponsiveStatCard.tsx`), grids (`ResponsiveGrid.tsx`), and drawers.

#### 📄 Route Pages (`frontend/src/components/pages/`)

```
frontend/src/components/pages/
├── landingPage/          # Public marketing landing page with ROI calculator
├── login/ & signup/      # JWT authentication & registration forms
├── dashboard/            # Overview dashboard with campaign metrics & MCP activity log
├── projects/             # Project list, creation, rename, and campaign management
├── campaign/             # Campaign Brief form, Live Visualizer, and 7-Tab Results Suite
├── history/              # Searchable campaign history with filters and status badges
├── memoryHub/            # Brand Memory Hub displaying voice parameters and performance trends
├── settings/             # API key config, profile settings, and 1-Click Claude MCP connector
├── docs/DocsPage.tsx     # In-app documentation page with wrapped TOC and live search
└── support/Support.tsx   # Support center with FAQ accordion and video tutorial lightbox
```

#### 🎨 7-Tab Campaign Result Suite (`campaign/newCampaign/campaignLive/campaignResult/`)
| Result Tab Component | Deliverables Displayed |
| :--- | :--- |
| [`OverviewContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/overview/OverviewContent.tsx) | Executive summary, campaign metadata, target audience, and primary CTA cards. |
| [`ResearchContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/research/ResearchContent.tsx) | TAM metrics, growth rates, competitor differentiation grids, and pain point cards. |
| [`StrategyContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/strategy/StrategyContent.tsx) | Positioning statement, content pillars, channel budget allocation, and KPI targets. |
| [`CopywriterContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/copywriter/CopywriterContent.tsx) | Multi-channel copy cards (X, LinkedIn, Email, Ads) with 1-click brand bridges and copy variant generator. |
| [`VisualsContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/visuals/VisualsContent.tsx) | Art direction prompts for Midjourney/DALL-E 3 with 1-click prompt generator bridges. |
| [`FocusGroupPanel.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/focusGroup/FocusGroupPanel.tsx) | Persona simulation scores, objection quotes, click intent ratios, and interactive Q&A interview panel. |
| [`ReviewContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/review/ReviewContent.tsx) | Quality Reviewer scores (0–100) and Human Approval Gate (Approve / Request Revision form). |
| [`PublisherContent.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/components/pages/campaign/newCampaign/campaignLive/campaignResult/publisher/PublisherContent.tsx) | Content calendar timeline, asset checklist, projected reach, and scheduled post plan. |

---

## 🧪 6. End-to-End Testing Suite (`/e2e`)

> [!NOTE]
> Automated integration and concurrency testing suite validating system stability under load.

- [`e2e/config/playwright.config.ts`](file:///e:/AgentMark/AgentMark/e2e/config/playwright.config.ts): Playwright browser test runner configuration.
- [`e2e/orchestrator/e2e-runner.ts`](file:///e:/AgentMark/AgentMark/e2e/orchestrator/e2e-runner.ts): Test environment lifecycle manager performing preflight health checks.
- [`e2e/helpers/state-assertions.ts`](file:///e:/AgentMark/AgentMark/e2e/helpers/state-assertions.ts): Helper functions verifying database, Redis, and Socket.IO states.
- [`e2e/specs/campaign-flow.spec.ts`](file:///e:/AgentMark/AgentMark/e2e/specs/campaign-flow.spec.ts): E2E test verifying full campaign creation from UI brief submit to publishing.
- [`e2e/specs/campaign-hitl.spec.ts`](file:///e:/AgentMark/AgentMark/e2e/specs/campaign-hitl.spec.ts): E2E test verifying Human-in-the-Loop review and revision flow.
