# 📘 AgentMark — Complete FAANG-Grade Architecture & Deep Learning Guide

> [!IMPORTANT]
> **Ultimate System Blueprint**: This master document provides both a **beginner-friendly conceptual walkthrough** and an **exhaustive, FAANG-level technical specification** for the **AgentMark Enterprise AI Marketing Platform**. Whether you are a beginner developer or a Principal Architect, this guide explains every concept, line of data flow, mathematical formula, security boundary, and code component in the repository.

---

## 📚 Table of Contents

1. [🌟 Executive Summary & Beginner Analogy](#1-executive-summary--beginner-analogy)
2. [🏗️ High-Level System Architecture & Microservices](#2-high-level-system-architecture--microservices)
3. [🚀 End-to-End Life of a Campaign (Step-by-Step Flow)](#3-end-to-end-life-of-a-campaign-step-by-step-flow)
4. [🤖 The 7 AI Specialist Agents & Auxiliaries Explained](#4-the-7-ai-specialist-agents--auxiliaries-explained)
5. [🔁 LangGraph State Machine & Conditional Routing](#5-langgraph-state-machine--conditional-routing)
6. [🏛️ EMOS Baseline Architecture & Mathematical Engines](#6-emos-baseline-architecture--mathematical-engines)
7. [📡 Real-Time Streaming Architecture (Redis Pub/Sub → Socket.IO)](#7-real-time-streaming-architecture-redis-pubsub--socketio)
8. [🔒 Dual-Mode Authentication & Security Model](#8-dual-mode-authentication--security-model)
9. [🔌 Model Context Protocol (MCP) & Claude Desktop Integration](#9-model-context-protocol-mcp--claude-desktop-integration)
10. [🗄️ Database Schemas & Data Storage (PostgreSQL & Prisma)](#10-database-schemas--data-storage-postgresql--prisma)
11. [🛠️ Developer Quickstart & Command Reference](#11-developer-quickstart--command-reference)

---

## 1. 🌟 Executive Summary & Beginner Analogy

### What is AgentMark?
In traditional marketing, creating a full promotional campaign requires a team of humans working for weeks:
- A **Market Researcher** searches Google for audience trends and competitors.
- A **Brand Strategist** defines positioning pillars and target channels.
- A **Copywriter** drafts text for social media, email broadcasts, and ads.
- An **Art Director** creates image ideas and prompts for designers.
- A **Quality Reviewer** checks brand guidelines and compliance.
- A **Publisher** builds the posting schedule and distribution checklist.

**AgentMark replaces this manual 3-week workflow with a 90-second automated AI pipeline.** You input a simple prompt (e.g., *"Launch our B2B Analytics Dashboard targeting CTOs"*), and 7 autonomous AI agents collaborate in real-time to conduct web research, write multi-channel copy, generate visual prompts, simulate customer reactions, and deliver a publish-ready marketing package.

---

### 🍳 The Restaurant Analogy (For Beginners)

If you are new to software engineering, think of AgentMark as a **high-tech 5-star restaurant**:

```
 ┌────────────────┐       ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
 │ 1. FRONTEND    │       │ 2. BACKEND     │       │ 3. AI SERVICE  │       │ 4. MCP SERVER  │
 │ (The Dining    │──────►│ (The Kitchen   │──────►│ (The Executive │──────►│ (Drive-Thru /  │
 │  Room & Menu)  │       │  Order Desk)   │       │  Chef & Team)  │       │  API Window)   │
 └────────────────┘       └────────────────┘       └────────────────┘       └────────────────┘
```

1. **The Frontend (React + Vite - Port 5173):** *The Dining Room & Menu.* This is what the customer sees. It takes your order (Campaign Brief), displays live progress as the meal is prepared, and presents the finished 7-course meal (Campaign Results).
2. **The Express Backend (Node.js + Express - Port 5003):** *The Kitchen Order Manager & Cash Register.* It checks customer ID (Authentication), writes orders into the permanent ledger (PostgreSQL Database), and sends orders back to the chefs. It also rings a bell (Socket.IO WebSockets) to update the customer in real time.
3. **The Python AI Service (FastAPI + LangGraph - Port 5002):** *The Executive Chef & Master Station Cooks.* This is the brain. The Executive Chef (Manager Agent) assigns tasks to 6 specialist cooks (Research, Strategy, Copywriter, Image Prompt, Reviewer, Publisher). They use live internet ingredients (Tavily Search) and recipes (LLMs) to cook the campaign.
4. **The MCP Server (FastMCP Python):** *The Express Drive-Thru Window.* Allows outside delivery apps (like Claude Desktop or Cursor IDE) to place orders directly into the kitchen using natural language.

---

## 2. 🏗️ High-Level System Architecture & Microservices

AgentMark is engineered as **4 microservices** working in unison:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            1. REACT 18 FRONTEND                             │
│             React 18 + TypeScript + Vite + Custom HSL CSS tokens            │
│                     URL: http://localhost:5173                              │
└──────────────────────────────┬────────────────────────▲─────────────────────┘
                               │ HTTP REST              │ WebSockets (Socket.IO)
┌──────────────────────────────▼────────────────────────┴─────────────────────┐
│                          2. EXPRESS BACKEND API                             │
│             Node.js + Express + Prisma ORM + PostgreSQL + Redis             │
│                     URL: http://localhost:5003                              │
└──────────────────────────────┬────────────────────────▲─────────────────────┘
                               │ HTTP (INTERNAL_SECRET) │ Redis Pub/Sub
┌──────────────────────────────▼────────────────────────┴─────────────────────┐
│                         3. PYTHON AI SERVICE                                │
│             FastAPI + LangGraph + LangChain + Pydantic v2 + Tavily          │
│                     URL: http://127.0.0.1:5002 (Loopback)                   │
└─────────────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP REST via Developer API Key (am_...)
┌──────────────────────────────┴─────────────────────────────────────────────┐
│                       4. AGENTMARK MCP SERVER                               │
│            Python + FastMCP — Connects Claude Desktop & Cursor              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Microservice Subsystem Matrix

| Service Name | Directory | Tech Stack | Port | Primary Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | [`/frontend`](file:///e:/AgentMark/AgentMark/frontend) | React 18, TypeScript, Vite | `5173` | Renders single-page application, live agent visualizer, and 7-tab deliverable dashboard. |
| **Backend** | [`/backend`](file:///e:/AgentMark/AgentMark/backend) | Node.js, Express, Prisma, PostgreSQL, Redis | `5003` | Manages auth (JWT + API Keys), database storage, Redis Pub/Sub subscriber, and Socket.IO bridge. |
| **AI Service** | [`/ai-service`](file:///e:/AgentMark/AgentMark/ai-service) | Python 3.10+, FastAPI, LangGraph, Pydantic v2 | `5002` | Executes stateful LangGraph agent graph, multi-LLM failover, and Tavily web search. |
| **MCP Server** | [`/agentmark-mcp-server`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server) | Python 3.10+, FastMCP, httpx | Stdio | Exposes 6 tools to AI desktop environments (Claude Desktop / Cursor IDE). |

---

## 3. 🚀 End-to-End Life of a Campaign (Step-by-Step Flow)

Here is the exact journey of a campaign from the moment you click **"Launch Campaign"**:

```
  [User Fills Brief] ──► [Express API Creates DB Record] ──► [Express Calls Python AI Service]
                                                                        │
  [Frontend Displays Results] ◄── [Socket.IO Emits Events] ◄── [Redis Publishes Agent Events]
                                                                        │
                                                         [LangGraph Runs 7-Agent Pipeline]
```

1. **User Submits Brief:** In the React Frontend (`NewCampaignPage.tsx`), you enter product name, audience, goal, tone, and budget. Clicking **Launch** sends `POST /api/campaigns` to the Express Backend.
2. **Backend Storage:** The Express Backend creates a new database row in PostgreSQL with `status = "processing"`.
3. **AI Pipeline Trigger:** Backend calls Python AI Service `POST http://127.0.0.1:5002/campaigns/create`.
4. **LangGraph Graph Execution:** The AI Service initializes `CampaignState` and starts graph traversal:
   - `Manager` analyzes brief constraints.
   - `Research` queries Tavily API for live web market data.
   - `Strategy` builds messaging pillars and channel split.
   - `Copywriter` crafts copy for X, LinkedIn, Email, Google Ads, Meta.
   - `Image Prompt` designs visual artwork prompts.
   - `Reviewer` scores quality (0–100) and checks compliance.
5. **Real-Time Streaming:** As each agent starts and finishes, Python calls `publish_agent_event()`, sending JSON to Redis. Express (`redis-subscriber.ts`) receives the event and immediately forwards it to your browser via Socket.IO.
6. **Human-in-the-Loop (HITL) Review:** If Reviewer score $\ge 75$, workflow pauses at `human_approval` (`status = "awaiting_human_approval"`).
7. **User Approval & Publisher Run:** Clicking **Approve Campaign** triggers `POST /api/campaigns/:id/approve`. The graph resumes, running the `Publisher` agent to create content calendars and distribution schedules. Status turns `completed`.

---

## 4. 🤖 The 7 AI Specialist Agents & Auxiliaries Explained

AgentMark features **7 Core Pipeline Agents** and **5 Auxiliary Intelligence Agents**:

### Core Pipeline Agents

| Agent Name | Source File | Plain English Explanation | Key Output Fields |
| :--- | :--- | :--- | :--- |
| **1. Manager** | [`manager.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/manager.py) | **The Project Manager.** Inspects your input brief, ensures goals are clear, and sets up execution rules. | `campaign_name`, `channels[]` |
| **2. Research** | [`research.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/research.py) | **The Market Researcher.** Runs live web searches to find market size, competitor moves, and buyer pain points. | `total_addressable_market`, `top_competitors[]`, `pain_points[]` |
| **3. Strategy** | [`strategy.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/strategy.py) | **The Strategist.** Decides *how* to position the product, which channels to prioritize, and what key messages to use. | `positioning`, `content_pillars[]`, `kpis` |
| **4. Copywriter** | [`copywriter.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/copywriter.py) | **The Copywriter.** Writes channel-tailored ad copy, subject lines, body text, and calls-to-action (CTAs). | `headline`, `body_text`, `call_to_action` |
| **5. Image Prompt** | [`image_prompt.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/image_prompt.py) | **The Art Director.** Generates visual concepts and exact AI image prompts for Midjourney and DALL-E 3. | `visual_direction`, `ai_image_prompt`, `aspect_ratio` |
| **6. Reviewer** | [`reviewer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/reviewer.py) | **The Quality Inspector.** Grades deliverables on a 0–100 scale and verifies brand safety and compliance. | `overall_score`, `approved`, `issues[]` |
| **7. Publisher** | [`publisher.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/publisher.py) | **The Distribution Manager.** Formulates multi-week publishing schedules, calendars, and asset checklists. | `publishing_plan[]`, `content_calendar` |

---

### Auxiliary Intelligence Agents

- **Creative Hook Matrix ([`creative_hook_matrix.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/creative_hook_matrix.py)):** Generates viral angle hooks per social channel (gated by `ENABLE_CREATIVE_HOOK_MATRIX`).
- **Focus Group Engine ([`focus_group.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/focus_group.py)):** Runs parallel LLM persona simulations representing diverse consumer demographics to score copy resonance and list objections.
- **Independent Evaluator ([`evaluator.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/evaluator.py)):** Prompt-isolated evaluation agent for EMOS Phase 3 quality gates.
- **Persona Composer ([`persona_composer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/persona_composer.py)):** Dynamically synthesizes target consumer personas.
- **Devil's Advocate ([`devils_advocate.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/devils_advocate.py)):** Generates critical counter-arguments to stress-test campaign messaging.

---

## 5. 🔁 LangGraph State Machine & Conditional Routing

LangGraph controls workflow state in [`ai-service/workflow/graph.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/graph.py).

```
                                  [START]
                                     │
                                     ▼
                                  Manager
                                     │
                                     ▼
                                 Research
                                     │
                                     ▼
                                 Strategy
                                     │
                                     ▼
                                Copywriter
                                     │
                                     ▼
                      ┌─────────────────────────────┐
                      │ Creative Hook Matrix (Opt)  │  (Flagged: ENABLE_CREATIVE_HOOK_MATRIX)
                      └──────────────┬──────────────┘
                                     ▼
                                Image Prompt
                                     │
                                     ▼
                                  Reviewer
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
            (Score < 75 & Revs < 3)         (Score ≥ 75 or Revs = 3)
                     │                               │
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │ Auto-Revision Routing     │   │   Human Approval Gate     │ (Pauses status: awaiting_human_approval)
       └─────────────┬─────────────┘   └─────────────┬─────────────┘
                     │                               │
                     └───────────────┐               ├──────────────────────────┐
                                     │               │                          │
                                     │           (Approved)                 (Rejected)
                                     │               │                          │
                                     │               ▼                          ▼
                                     │           Publisher                Targeted Agent
                                     │               │                      Revision
                                     │               ▼                          │
                                     └──────────► [ END ] ◄─────────────────────┘
```

### Routing Rules ([`ai-service/workflow/routing.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/routing.py))
1. **Quality Check (`should_continue_after_reviewer`):**
   - If any deliverable score $< 75$ AND revision count for that agent $< 3$, the workflow automatically routes back to that specific agent with feedback.
   - If score $\ge 75$ OR max revisions ($3$) are reached, execution advances to `human_approval`.
2. **HITL Check (`route_after_human_approval`):**
   - If user clicks **Approve**, graph advances to `publisher` $\rightarrow$ `END`.
   - If user clicks **Reject & Revise**, graph routes to the target agent specified by the user with custom instructions.

---

## 6. 🏛️ EMOS Baseline Architecture & Mathematical Engines

The Enterprise Marketing Operating System (EMOS) baseline introduces five advanced sub-systems:

### 1. Phase 1: Brand Vault & Context Contracts
- Append-only event log recording brand rules. Generates lightweight JSON Context Contracts ($<250$ tokens) injected into agent prompts to eliminate brand drift.

### 2. Phase 2: Hybrid RRF Retrieval Engine
- Combines PostgreSQL tsvector keyword search (BM25) with pgvector vector similarity using Reciprocal Rank Fusion (RRF):

$$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

- Bounded by Retrieval Budget $K \le 5$ and weighted by Source Precedence:
  $$\text{Manual User (1.0)} > \text{Brand Guidelines (0.9)} > \text{Website (0.7)} > \text{Competitor Data (0.3)}$$

### 3. Phase 3: 4-Tier Layered Policy Engine
- Sequential policy compliance checks:
  $$\text{Platform Safety} \longrightarrow \text{Industry Rules (SEC/HIPAA)} \longrightarrow \text{Tenant Brand Rules} \longrightarrow \text{Campaign Offer Caps}$$

### 4. Phase 4: 90-Day Memory Decay Engine
- Calculates memory decay half-life weighting over time:

$$\lambda = \frac{\ln 2}{90} \approx 0.0077 \text{ day}^{-1}, \quad W(t) = W_0 \cdot e^{-\lambda t}$$

- Discards historical insights where reliability score $W_{\text{Learning}} < 0.65$.

### 5. Phase 5: OpenTelemetry Tracing Context
- Propagates distributed trace IDs (`trace_id`, `span_id`, `campaign_id`, `evidence_id`) across Express backend and Python AI service logs for P50/P95/P99 latency SLA analysis.

---

## 7. 📡 Real-Time Streaming Architecture (Redis Pub/Sub → Socket.IO)

How live agent progress updates stream to your browser:

```
  [1. Python AI Agent Node] ──► PUBLISH campaign:{id} ──► [2. Redis Server]
                                                                │
  [4. React Browser UI] ◄── EMIT agent_update ◄── psubscribe ───┘ [3. Express Subscriber]
```

1. **Publish Event:** Python agent calls `publish_agent_event()`, publishing JSON to Redis channel `campaign:{id}`:
   ```json
   {
     "campaign_id": "abc-123",
     "agent": "copywriter",
     "status": "running",
     "outputs": { ... }
   }
   ```
2. **Redis Subscriber:** Express backend ([`redis-subscriber.ts`](file:///e:/AgentMark/AgentMark/backend/src/utils/redis-subscriber.ts)) listens via `psubscribe('campaign:*')`.
3. **Database Write Queue:** Express queues terminal updates into a sequential `PromiseQueue` to update PostgreSQL without race conditions.
4. **WebSocket Emission:** Express emits a Socket.IO event `agent_update` to room `campaign:{id}`. React updates the progress stepper UI live.

---

## 8. 🔒 Dual-Mode Authentication & Security Model

Handled in [`backend/src/middlewares/auth.middleware.ts`](file:///e:/AgentMark/AgentMark/backend/src/middlewares/auth.middleware.ts):

```
                               Incoming Request
                                      │
                         Is Header Authorization?
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        Bearer <jwt_token>                     Bearer am_<hex_32>
                   │                                     │
           Verify JWT Secret                     SHA-256 Digest Hash
                   │                                     │
        Set req.authMethod = 'jwt'            Lookup in api_keys DB Table
                   │                                     │
         Full User Access                     Set req.authMethod = 'api_key'
                                                         │
                                               Programmatic API Access
```

> [!WARNING]
> **API Key Privilege Guard**: Developer API Key management endpoints (`POST/GET/DELETE /api/developer/keys`) enforce `jwtOnly` authorization. An API key cannot create or revoke other keys.

---

## 9. 🔌 Model Context Protocol (MCP) & Claude Desktop Integration

The AgentMark MCP Server ([`agentmark-mcp-server/src/agentmark_mcp/server.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/server.py)) connects AI assistants directly to AgentMark:

### 6 Registered Tools

1. `generate_campaign`: Triggers full 7-agent pipeline from natural language prompts.
2. `run_focus_group`: Simulates target consumer persona reactions to copy.
3. `publish_to_channel`: Approves campaign and generates distribution schedule.
4. `create_project`: Programmatically creates a new project workspace.
5. `revise_copy_with_feedback`: Re-runs copywriter with feedback and auto-runs focus group.
6. `get_campaign_status`: Returns status badge, review score, and version history.

---

## 10. 🗄️ Database Schemas & Data Storage (PostgreSQL & Prisma)

Defined in [`backend/prisma/schema.prisma`](file:///e:/AgentMark/AgentMark/backend/prisma/schema.prisma):

```
┌──────────────┐         1:N         ┌──────────────┐         1:N         ┌──────────────┐
│     User     │────────────────────►│   Project    │────────────────────►│   Campaign   │
└──────────────┘                     └──────────────┘                     └──────────────┘
       │ 1:N                                                                     │ 1:N
       ├───────────────────┐                                                     ├───────────────────┐
       ▼                   ▼                                                     ▼                   ▼
┌──────────────┐   ┌──────────────┐                                      ┌──────────────┐   ┌──────────────┐
│    ApiKey    │   │ McpActivity  │                                      │ MemorySnap   │   │  BrandVault  │
└──────────────┘   └──────────────┘                                      └──────────────┘   └──────────────┘
```

### Core Schema Models

- **`User`**: Account identity, email, password hash (bcrypt), avatar URL.
- **`Project`**: Workspace container grouping related marketing campaigns.
- **`Campaign`**: Campaign brief parameters, execution status, review scores, and full 7-agent outputs stored in `aiOutputs` JSON.
- **`Notification`**: System notifications delivered via WebSockets.
- **`CampaignMemorySnapshot`**: Saved brand voice parameters and historical quality trends.
- **`ApiKey`**: Programmatic Developer API Keys stored as SHA-256 hashes (`am_` prefix).
- **`McpActivity`**: Audit trail logging MCP tool invocations.
- **`BrandVaultEvent` & `BrandVaultSnapshot`**: Event-sourced brand fact store and materialized snapshot isolation records.

---

## 11. 🛠️ Developer Quickstart & Command Reference

### Service Ports

| Service | Port | Health Check Endpoint |
| :--- | :--- | :--- |
| Express Backend | `5003` | `curl http://localhost:5003/health` |
| Python AI Service | `5002` | `curl http://127.0.0.1:5002/health` |
| Vite Frontend | `5173` | Open `http://localhost:5173` in browser |

### One-Click Startup (Windows)
```cmd
start-agentmark.bat
```

### Running Test Suites
```powershell
# Run all test suites across all services
powershell -ExecutionPolicy Bypass -File .\run_all_tests.ps1

# Backend Jest Tests
cd backend && npm test

# AI Service Pytest Suite
cd ai-service && uv run pytest tests/ -m "not live"

# MCP Server Tests
cd agentmark-mcp-server && uv run pytest tests/ -v
```
