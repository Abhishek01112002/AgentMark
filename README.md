# AgentMark — Enterprise Multi-Agent AI Marketing Platform

> **AI-powered campaign orchestration:** from market research and Brand DNA context building to strategy, copywriting, viral hook generation, visual prompting, synthetic focus group simulation, human-in-the-loop review, and multi-channel publishing — all in one automated pipeline.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%2B-DC382D?logo=redis)](https://redis.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Table of Contents

1. [Architecture](#architecture)
2. [EMOS v9 Baseline & Implementation Status](#emos-v9-baseline--implementation-status)
3. [Technology Stack](#technology-stack)
4. [Repository Structure](#repository-structure)
5. [Prerequisites](#prerequisites)
6. [Step-by-Step Setup](#step-by-step-setup)
   - [Step 1 — Backend](#step-1--backend-port-5003)
   - [Step 2 — AI Service](#step-2--ai-service-port-5002)
   - [Step 3 — Frontend](#step-3--frontend-port-5173)
   - [Step 4 — MCP Server](#step-4--mcp-server-optional)
7. [Environment Variables Reference](#environment-variables-reference)
8. [Key Features & EMOS Subsystems](#key-features--emos-subsystems)
9. [Agent Pipeline](#agent-pipeline)
10. [MCP Integration](#mcp-integration)
11. [License](#license)

---

## Architecture

AgentMark consists of four micro-services that communicate via REST, Redis Pub/Sub, and the MCP protocol:

```
┌─────────────────────────────────────────────────────────────┐
│                    1. React Frontend                        │
│          React 18 + TypeScript + Vite + Socket.IO Client    │
│                   http://localhost:5173                     │
└──────────────┬────────────────────────────▲────────────────┘
               │ HTTP REST                  │ WebSocket (Socket.IO)
┌──────────────▼────────────────────────────┴────────────────┐
│                   2. Express Backend                        │
│        Node.js + Express + Prisma + PostgreSQL + Redis      │
│                   http://localhost:5003                     │
└──────────────┬────────────────────────────▲────────────────┘
               │ HTTP (INTERNAL_SERVICE_SECRET) │ Redis Pub/Sub
┌──────────────▼────────────────────────────┴────────────────┐
│                   3. Python AI Service                      │
│         FastAPI + LangGraph + LangChain + Pydantic v2       │
│                   http://localhost:5002                     │
└─────────────────────────────────────────────────────────────┘
               ▲
               │ MCP Protocol (HTTP REST via Developer API Key)
┌──────────────┴─────────────────────────────────────────────┐
│                4. AgentMark MCP Server (optional)           │
│         Python + FastMCP — connects Claude Desktop/Cursor   │
└─────────────────────────────────────────────────────────────┘
```

**Data flow for a campaign run:**
1. Frontend sends `POST /api/campaigns` → Backend creates DB record → Backend calls AI Service
2. AI Service runs LangGraph pipeline; each agent node publishes a Redis event
3. Backend Redis subscriber picks up events → emits Socket.IO events to frontend
4. Frontend live-updates the agent progress panel in real time
5. On completion, backend persists all agent outputs to PostgreSQL

---

## EMOS v9 Baseline & Implementation Status

> **Engineering Status**: Implementation Complete across Phases 1–5 on branch `feature/emos-brand-vault-context-engine` behind dark feature flags (`EMOS_BRAND_VAULT_ENABLED` / `VITE_EMOS_BRAND_VAULT_ENABLED`).
> **Production Acceptance Gates**: PAG-01 through PAG-08 remain strictly **`PENDING STAGING VALIDATION`** awaiting independent staging cluster execution and evidence verification.

### Subsystem Implementation Matrix

| Subsystem / Phase | Core Capability | Implementation Modules | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1: Brand Vault & Contracts** | Append-Only Event Log, Materialized Snapshot Isolation, Minimal JSON Context Contract (<250 tokens) | `backend/src/modules/brand-vault/`, `ai-service/workflow/context.py` | Complete ✅ |
| **Phase 2: Hybrid Retrieval** | Reciprocal Rank Fusion (RRF), Source Precedence Weighting (`MANUAL_USER: 1.0 > GUIDELINES: 0.9 > WEBSITE: 0.7 > COMPETITOR: 0.3`), Retrieval Budget ($K \le 5$) | `backend/src/utils/retrieval.ts`, `ai-service/workflow/retrieval.py` | Complete ✅ |
| **Phase 3: Quality & Policy Gates** | Independent Evaluator with Prompt Isolation, 4-Tier Layered Policy Engine (Platform $\rightarrow$ Industry $\rightarrow$ Tenant $\rightarrow$ Campaign) | `ai-service/agents/evaluator.py`, `ai-service/workflow/policy.py` | Complete ✅ |
| **Phase 4: Memory & Learning Engine** | 90-Day Decay Half-Life Weighting ($\lambda = \frac{\ln 2}{90}$), Source Reliability Filtering ($W_{\text{Learning}} < 0.65$ Discarded), Human Edit Diff Ingestion | `backend/src/utils/learning.ts`, `ai-service/workflow/learning.py` | Complete ✅ |
| **Phase 5: Operations & Telemetry** | OpenTelemetry Tracing Context Propagation (`trace_id`, `span_id`, `campaign_id`, `tenant_id`, `evidence_id`), Structured Component Audit Logging, Chaos Drills | `backend/src/utils/telemetry.ts`, `ai-service/utils/telemetry/emos_tracer.py` | Complete ✅ |
| **Frontend Integration** | Brand Vault API Client, Feature Flag Detection, Contract Type Synchronization, Evaluator Score Surface | `frontend/src/types/emos.ts`, `frontend/src/services/api.ts`, `DashboardPage.tsx` | Complete ✅ |

---

## Technology Stack

### Frontend (`/frontend`)
| Technology | Purpose |
|---|---|
| React 18 + TypeScript | Component framework |
| Vite | Build tool & dev server |
| React Router DOM v6 | Client-side routing |
| Socket.IO Client | Real-time agent progress |
| Lucide React | Icon library |
| React Hot Toast | Toast notifications |
| Custom CSS (HSL tokens) | Dark-luxury design system |

### Backend (`/backend`)
| Technology | Purpose |
|---|---|
| Node.js 18+ + Express | HTTP server |
| TypeScript | Type safety |
| Prisma ORM | Database access layer |
| PostgreSQL | Persistent data store |
| Redis (`ioredis`) | Pub/Sub event bus + Socket.IO adapter |
| Socket.IO | Real-time WebSocket server |
| bcrypt + JWT | Authentication |
| ImageKit | Media/asset storage |
| Zod | Request validation |

### AI Service (`/ai-service`)
| Technology | Purpose |
|---|---|
| Python 3.10+ | Runtime |
| FastAPI + Uvicorn | Async HTTP server |
| LangGraph | Stateful multi-agent workflow graph |
| LangChain | LLM abstraction layer |
| Google Gemini 1.5/2.0 | Primary LLM provider |
| OpenAI GPT-4o | Alternate LLM provider |
| Groq (Llama 3.3-70b) | High-speed inference |
| Tavily | Real-time web search for Research Agent |
| Pydantic v2 | Structured output validation |
| Redis | Agent event publishing |

### MCP Server (`/agentmark-mcp-server`)
| Technology | Purpose |
|---|---|
| Python 3.10+ + FastMCP | MCP server runtime |
| httpx + tenacity | Fault-tolerant HTTP client with retries |
| Claude Desktop / Cursor / Windsurf | Supported MCP hosts |

---

## Repository Structure

```
AgentMark/
│
├── frontend/                        # React 18 + Vite (Port 5173)
│   ├── public/                      # Static assets, tutorial videos
│   ├── src/
│   │   ├── components/
│   │   │   ├── pages/               # Route-level page components
│   │   │   │   ├── campaign/        # Campaign detail view + live panel
│   │   │   │   ├── dashboard/       # Project & campaign overview
│   │   │   │   ├── docs/            # In-app documentation page
│   │   │   │   ├── history/         # Campaign history list
│   │   │   │   ├── memoryHub/       # Brand memory analytics
│   │   │   │   ├── projects/        # Project management
│   │   │   │   ├── settings/        # API keys + integrations
│   │   │   │   └── support/         # FAQ + video tutorials
│   │   │   └── shared/              # Sidebar, TopNav, modals
│   │   ├── contexts/                # AuthContext + React providers
│   │   ├── services/                # API service layer (api.ts, llmSettings.ts)
│   │   └── index.css                # Global CSS design system (HSL tokens)
│   ├── .env                         # VITE_API_URL, VITE_SOCKET_URL
│   └── package.json
│
├── backend/                         # Node.js + Express (Port 5003)
│   ├── prisma/
│   │   ├── schema.prisma            # DB models: User, Project, Campaign, ApiKey, McpActivity
│   │   └── migrations/              # Auto-generated Prisma migrations
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/                # Login, signup, JWT issuance
│   │   │   ├── campaigns/           # Campaign CRUD + AI orchestration + HITL
│   │   │   ├── developer/           # API key lifecycle + Claude Desktop flow
│   │   │   ├── focus-group/         # Focus group simulation proxy
│   │   │   ├── imagekit/            # ImageKit auth token endpoint
│   │   │   ├── notifications/       # Real-time notification service
│   │   │   └── projects/            # Project CRUD + memory status
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts   # Dual-mode: JWT + Developer API Key
│   │   │   ├── mcp-logger.middleware.ts # MCP activity tracker
│   │   │   └── rate-limit.middleware.ts # Express rate limiter
│   │   ├── utils/
│   │   │   ├── ai-client.ts         # HTTP client for AI Service calls
│   │   │   ├── redis-subscriber.ts  # Redis → Socket.IO bridge
│   │   │   └── jwt.ts               # JWT sign/verify
│   │   └── index.ts                 # Server entry point
│   ├── .env                         # See Environment Variables section
│   ├── .env.example                 # Template for new deployments
│   └── package.json
│
├── ai-service/                      # FastAPI + LangGraph (Port 5002)
│   ├── agents/                      # Agent node implementations
│   │   ├── manager.py               # Orchestration coordinator
│   │   ├── research.py              # Market intelligence + Tavily search
│   │   ├── strategy.py              # Campaign framework builder
│   │   ├── copywriter.py            # Multi-channel copy generation
│   │   ├── image_prompt.py          # Visual prompt generation
│   │   ├── reviewer.py              # Quality scoring + compliance check
│   │   ├── publisher.py             # Distribution plan generator
│   │   ├── human_approval.py        # HITL approval gate node
│   │   ├── focus_group.py           # Synthetic persona simulation
│   │   └── state.py                 # Shared LangGraph state definition
│   ├── workflow/                    # LangGraph graph assembly + routing
│   ├── schemas/                     # Pydantic structured output models
│   ├── api/routes/                  # FastAPI route handlers
│   ├── routers/                     # Focus group router
│   ├── llm/                         # LLM factory (Gemini/OpenAI/Groq)
│   ├── services/                    # Search service (Tavily)
│   ├── utils/                       # Redis publisher + helpers
│   ├── .env                         # See Environment Variables section
│   └── run.py                       # Uvicorn server entry point
│
├── agentmark-mcp-server/            # MCP Server for AI assistant integration
│   ├── src/agentmark_mcp/
│   │   ├── server.py                # FastMCP tool registration
│   │   └── tools/                   # Tool implementations
│   └── pyproject.toml
│
├── start-agentmark.bat              # Windows one-click startup script
├── .gitignore
└── README.md                        # This document
```

---

## Prerequisites

Before you begin, ensure the following are installed and running:

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18+ | [Download](https://nodejs.org/) |
| npm | 8+ | Bundled with Node.js |
| Python | 3.10+ | [Download](https://python.org/) |
| PostgreSQL | 15+ | Running on any port |
| Redis | 7+ | Running on `localhost:6379` |
| Git | Any | For cloning |

**Optional (for MCP integration):**
- `uv` Python package manager — [Install](https://docs.astral.sh/uv/)
- Claude Desktop, Cursor IDE, or Windsurf

---

## Step-by-Step Setup

Clone the repository first:

```bash
git clone https://github.com/your-org/agentmark.git
cd agentmark
```

---

### Step 1 — Backend (Port 5003)

```bash
cd backend
```

**1a. Create your environment file:**
```bash
cp .env.example .env
```
Edit `.env` and fill in your values (see [Environment Variables](#environment-variables-reference)).

**1b. Install dependencies:**
```bash
npm install
```

**1c. Generate Prisma client and push schema to the database:**
```bash
npx prisma generate
npx prisma db push
```

> If your database is brand new, this creates all tables automatically. For existing databases with migrations, use `npx prisma migrate deploy` instead.

**1d. Start the development server:**
```bash
npm run dev
```

✅ Backend is running at **http://localhost:5003**

Verify: `curl http://localhost:5003/health` should return `{"status":"ok"}`

---

### Step 2 — AI Service (Port 5002)

```bash
cd ai-service
```

**2a. Create your environment file:**
```bash
cp .env.example .env
```
Edit `.env` — set `INTERNAL_SERVICE_SECRET` to the **same value** as in `backend/.env`.

**2b. Create and activate a virtual environment:**

```bash
# Windows
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Recommended alternative using `uv` (faster):**
```bash
uv venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate
```

**2c. Install Python dependencies:**

```bash
pip install -r requirements.txt
# or with uv:
uv pip install -r requirements.txt
```

**2d. Start the AI Service:**
```bash
python run.py
```

✅ AI Service is running at **http://127.0.0.1:5002**

Verify: `curl http://127.0.0.1:5002/health` should return `{"status":"ok","service":"AgentMark AI Service"}`

> **Note:** The AI Service intentionally binds to `127.0.0.1` only (loopback). It is a private internal service protected by `INTERNAL_SERVICE_SECRET` — it must not be exposed publicly.

---

### Step 3 — Frontend (Port 5173)

```bash
cd frontend
```

**3a. Create your environment file:**
```bash
cp .env.example .env
```

**3b. Install dependencies:**
```bash
npm install
```

**3c. Start the development server:**
```bash
npm run dev
```

✅ Frontend is running at **http://localhost:5173**

Open your browser and navigate to `http://localhost:5173`. Create an account and start your first project.

---

### Step 4 — MCP Server (Optional)

The MCP Server lets AI assistants (Claude Desktop, Cursor, Windsurf) interact with AgentMark directly via chat commands.

```bash
cd agentmark-mcp-server
```

**4a. Install using `uv`:**
```bash
uv venv
.venv\Scripts\activate     # Windows
# or: source .venv/bin/activate
uv pip install -e .
```

**4b. Generate a Developer API Key:**

Log into the AgentMark web app → **Settings → Integrations → Connect Claude Desktop**. The app automatically generates an API key and writes the Claude Desktop configuration file for you.

Alternatively, use the one-click Windows startup script:
```
start-agentmark.bat
```

**4c. Manual Claude Desktop configuration:**

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "E:/AgentMark/AgentMark/agentmark-mcp-server/.venv/Scripts/python.exe",
      "args": ["-m", "agentmark_mcp.server"],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5003",
        "AGENTMARK_API_KEY": "am_your_developer_key_here"
      }
    }
  }
}
```

Restart Claude Desktop completely (close from system tray) after editing the config.

See [`agentmark-mcp-server/README.md`](agentmark-mcp-server/README.md) for Cursor and Windsurf configuration instructions.

---

## Environment Variables Reference

### Frontend — `frontend/.env`

```env
VITE_API_URL=http://localhost:5003
VITE_SOCKET_URL=http://localhost:5003
```

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the Express backend |
| `VITE_SOCKET_URL` | Yes | Socket.IO server URL (usually same as API URL) |
| `VITE_EMOS_BRAND_VAULT_ENABLED` | No | Set to `true` to enable Brand Vault UI features (default: `false`) |

---

### Backend — `backend/.env`

```env
PORT=5003
DATABASE_URL="postgresql://postgres:password@localhost:5432/agentmark?connection_limit=10"
JWT_SECRET="<strong-random-secret-min-64-chars>"
NODE_ENV="production"

# Internal service auth (must match ai-service .env)
AI_SERVICE_URL="http://127.0.0.1:5002"
INTERNAL_SERVICE_SECRET="<strong-random-secret-min-64-chars>"

# LLM Provider API Keys (system-level fallbacks)
GEMINI_API_KEY="your-gemini-key"
TAVILY_API_KEY="your-tavily-key"
GROQ_API_KEY="your-groq-key"

# ImageKit (for visual asset storage)
IMAGEKIT_URL_ENDPOINT="https://ik.imagekit.io/your-id"
IMAGEKIT_PUBLIC_KEY="public_..."
IMAGEKIT_PRIVATE_KEY="private_..."

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# CORS for Socket.IO
FRONTEND_URL=http://localhost:5173
```

> **Security:** `JWT_SECRET` and `INTERNAL_SERVICE_SECRET` must be cryptographically random strings. Generate with: `openssl rand -hex 32`

---

### AI Service — `ai-service/.env`

```env
# Internal service auth (must match backend .env)
INTERNAL_SERVICE_SECRET="<same-value-as-backend>"

# Controls FastAPI docs visibility (set to production to disable /docs and /redoc)
ENV="production"

# LLM Provider API Keys
GEMINI_API_KEY="your-gemini-key"
GROQ_API_KEY="your-groq-key"
TAVILY_API_KEY="your-tavily-key"
# OPENAI_API_KEY="your-openai-key"

# Model selection
GROQ_MODEL="llama-3.3-70b-versatile"
COPYWRITER_MODEL="llama-3.3-70b-versatile"

# Feature flags
# Set to true to enable the Creative Hook Matrix agent between Copywriter and Image Prompt
ENABLE_CREATIVE_HOOK_MATRIX=false
```

> **Critical:** `INTERNAL_SERVICE_SECRET` must be **identical** in both `backend/.env` and `ai-service/.env`. Mismatched values will cause all AI service calls to fail with HTTP 403.

---

### MCP Server — Environment Variables

The MCP server reads two variables (set in the Claude Desktop config `env` block, **not** in a `.env` file):

| Variable | Required | Description |
|---|---|---|
| `AGENTMARK_API_URL` | Yes | URL of the AgentMark backend (e.g. `http://localhost:5003`) |
| `AGENTMARK_API_KEY` | Yes | Developer API key generated in Settings → Integrations (`am_…` prefix) |

---

## Key Features

| Feature | Description |
|---|---|
| **8-Agent Pipeline** | Manager → Research → Strategy → Copywriter → Creative Hook Matrix → Image Prompt → Reviewer → Publisher |
| **Brand DNA Consumption Engine** | Purpose-specific, token-budgeted Brand DNA context builder with grounded claim checking |
| **Real-Time Progress** | Redis Pub/Sub → Socket.IO → Live agent status panel in UI |
| **Human-in-the-Loop (HITL)** | Approval gate after Reviewer agent; supports per-agent revision targeting |
| **Synthetic Focus Groups** | Parallel AI persona agents score copy, list objections, suggest rewrites |
| **Copy Variants** | On-demand alternative copy per channel with dynamic brand extraction & steering |
| **Memory Hub** | Stores brand voice, revision patterns, approval rates across campaigns |
| **MCP Integration** | FastMCP server exposing 18 tools to Claude Desktop, Cursor, and Windsurf |
| **Developer API Keys** | Long-lived programmatic keys (`am_<hex>`) stored as SHA-256 hashes |
| **Multi-LLM Support** | Gemini, GPT-4o, Groq; configurable per campaign with failover |
| **ImageKit Integration** | Visual asset upload and storage |

---

## Agent Pipeline

```
Campaign Created
       │
       ▼
┌─────────────┐
│   Manager   │  — Analyzes brief, sets execution plan
└──────┬──────┘
       ▼
┌─────────────┐
│  Research   │  — Fetches market data via Tavily & scrapes Brand DNA
└──────┬──────┘
       ▼
┌─────────────┐
│  Strategy   │  — Builds campaign framework & messaging pillars
└──────┬──────┘
       ▼
┌─────────────────────────┐
│       Copywriter        │  — Generates multi-channel copy (X, LinkedIn, Email, SMS, Google Ads, etc.)
└──────┬──────────────────┘
       ▼
┌──────────────────────────────────────────┐
│          Creative Hook Matrix            │  — Generates viral angle hooks per channel
└──────┬───────────────────────────────────┘
       ▼
┌─────────────┐
│Image Prompt │  — Creates detailed prompts for DALL-E 3, Midjourney, Imagen 3
└──────┬──────┘
       ▼
┌─────────────┐
│  Reviewer   │  — Scores outputs (0–100), checks tone, Brand DNA claims & compliance
└──────┬──────┘
       ▼
┌──────────────────┐
│ Human Approval   │  — Mandatory HITL gate; revision can target specific upstream agents
│ (awaiting_human_ │
│  _approval)      │
└──────┬───────────┘
       ▼
┌─────────────┐
│  Publisher  │  — Produces content calendar, asset checklist, distribution plan
└─────────────┘
```

---

## MCP Integration

The AgentMark MCP Server exposes 18 tools to AI assistants:

| Tool | Description |
|---|---|
| `generate_campaign` | Run the full multi-agent pipeline from a natural language prompt |
| `run_focus_group` | Simulate audience persona reactions to campaign copy |
| `publish_to_channel` | Approve campaign and trigger the Publisher agent |
| `create_project` | Create a new project workspace and return its ID |
| `revise_copy_with_feedback` | Re-run copywriter with feedback notes and auto-run focus group |
| `get_campaign_status` | Check campaign status, quality scores, and version history |
| `request_targeted_revision` | Target specific upstream agent for re-execution |
| `submit_human_approval` | Submit approved or rejected decision at HITL gate |
| `update_client_memory` | Update brand voice or guidelines in Memory Hub |
| `clear_client_memory` | Reset Memory Hub context for a project |
| `export_campaign_pdf` | Export campaign strategy, copy, and calendar to PDF |
| `export_campaign_json` | Export raw creative assets as JSON payload |
| `get_publishing_schedule` | Retrieve 4-week publishing calendar and readiness |
| `verify_channel_credentials` | Test social media credentials for publishing |
| `generate_image_asset` | Generate visual image asset from prompt |
| `get_campaign_analytics` | Fetch projected reach, CTR, and conversion ROI metrics |
| `synthesize_brand_memory_intelligence` | Synthesize brand memory patterns across past campaigns |
| `compare_campaign_performance_vectors` | Compare performance vectors against baseline campaigns |

**Example conversation in Claude Desktop:**
```
You: Generate a campaign for our SaaS CRM product targeting B2B sales managers.
     Industry: SaaS, Goal: lead_gen, Voice: bold and data-driven

[AgentMark] [Manager] Analyzing brief...
[AgentMark] [Research] Gathering market intelligence & Brand DNA...
[AgentMark] [Strategy] Building campaign framework...
[AgentMark] Complete! Review Score: 84/100

You: Run the focus group on that campaign.

[AgentMark] Persona simulation complete. Overall Score: 7.8/10
```

See [`agentmark-mcp-server/README.md`](agentmark-mcp-server/README.md) for full tool reference and configuration options.

---

## License

Developed by **Novateches Software Pvt Ltd**. All Rights Reserved.
