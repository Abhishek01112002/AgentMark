# 📘 AgentMark — Technical Architecture & Multi-Agent Engine Specification

> [!IMPORTANT]
> **FAANG-Grade System Specification**: This document provides a 360-degree architectural reference for the **AgentMark** multi-agent marketing campaign generation platform. It details system micro-services, data flow, state machine topology, Pydantic schemas, database relations, and security boundaries.

---

## 📑 Executive Architecture Index

- 🏗️ [1. Core System Architecture & Microservices](#1-core-system-architecture--microservices)
- 🔁 [2. LangGraph Workflow & State Engine](#2-langgraph-workflow--state-engine)
- 🤖 [3. Agent Pipeline & Deliverable Schemas](#3-agent-pipeline--deliverable-schemas)
- 🔒 [4. Authentication & Security Boundary Model](#4-authentication--security-boundary-model)
- 📡 [5. Event-Driven Communication Protocol](#5-event-driven-communication-protocol)
- 🏛️ [6. EMOS Baseline Subsystems](#6-emos-baseline-subsystems)
- 🗄️ [7. PostgreSQL Schema & Entity Relations](#7-postgresql-schema--entity-relations)

---

## 🏗️ 1. Core System Architecture & Microservices

AgentMark is constructed as a decoupled, multi-service architecture communicating via REST APIs, Redis Pub/Sub, and WebSockets (Socket.IO):

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          1. React 18 SPA                                │
│          Vite + TypeScript + Custom HSL CSS + Socket.IO Client         │
│                   http://localhost:5173                                 │
└──────────────────────────────┬────────────────────────▲─────────────────┘
                               │ HTTP REST              │ WebSockets (Socket.IO)
┌──────────────────────────────▼────────────────────────┴─────────────────┐
│                      2. Express Backend API                             │
│         Node.js + Express + Prisma ORM + PostgreSQL + Redis             │
│                   http://localhost:5003                                 │
└──────────────────────────────┬────────────────────────▲─────────────────┘
                               │ HTTP (INTERNAL_SECRET) │ Redis Pub/Sub
┌──────────────────────────────▼────────────────────────┴─────────────────┐
│                     3. Python FastAPI AI Service                        │
│         FastAPI + LangGraph + LangChain + Pydantic v2 + Tavily          │
│                   http://127.0.0.1:5002 (Loopback)                      │
└─────────────────────────────────────────────────────────────────────────┘
                               ▲
                               │ HTTP REST via Developer API Key (am_...)
┌──────────────────────────────┴──────────────────────────────────────────┐
│                   4. FastMCP AgentMark Server                           │
│        Python + FastMCP — Integrates Claude Desktop / Cursor IDE        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Microservice Subsystem Breakdown

| Service | Primary Tech Stack | Port | Responsibilities | Key Files |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | `5173` | SPA interface, brief configuration, real-time agent visualizer, 7-tab campaign result suite. | [`App.tsx`](file:///e:/AgentMark/AgentMark/frontend/src/App.tsx), [`api.ts`](file:///e:/AgentMark/AgentMark/frontend/src/services/api.ts) |
| **Backend** | Express, Node.js, Prisma, Redis | `5003` | User authentication, campaign orchestration trigger, WebSocket bridge, PostgreSQL persistence. | [`index.ts`](file:///e:/AgentMark/AgentMark/backend/src/index.ts), [`schema.prisma`](file:///e:/AgentMark/AgentMark/backend/prisma/schema.prisma) |
| **AI Service** | FastAPI, LangGraph, Pydantic v2 | `5002` | Stateful multi-agent graph execution, LLM provider failover pool, live Tavily web search. | [`main.py`](file:///e:/AgentMark/AgentMark/ai-service/main.py), [`graph.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/graph.py) |
| **MCP Server** | Python 3.10+, FastMCP, httpx | Stdio | Exposes 6 natural language tools to Claude Desktop/Cursor IDE; handles polling and progress events. | [`server.py`](file:///e:/AgentMark/AgentMark/agentmark-mcp-server/src/agentmark_mcp/server.py) |

---

## 🔁 2. LangGraph Workflow & State Engine

The core execution engine is a stateful Directed Acyclic Graph (DAG) built using **LangGraph** in [`ai-service/workflow/graph.py`](file:///e:/AgentMark/AgentMark/ai-service/workflow/graph.py).

### Execution Flow & Graph Topology

```
                                  [START]
                                     │
                                     ▼
                           ┌───────────────────┐
                           │   Manager Agent   │
                           └─────────┬─────────┘
                                     ▼
                           ┌───────────────────┐
                           │  Research Agent   │  (Tavily Live Web Search)
                           └─────────┬─────────┘
                                     ▼
                           ┌───────────────────┐
                           │  Strategy Agent   │
                           └─────────┬─────────┘
                                     ▼
                           ┌───────────────────┐
                           │ Copywriter Agent  │  (Multi-Channel Deliverables)
                           └─────────┬─────────┘
                                     ▼
                     ┌───────────────────────────────┐
                     │ Creative Hook Matrix (Opt)   │  (Feature-Flagged: ENABLE_CREATIVE_HOOK_MATRIX)
                     └───────────────┬───────────────┘
                                     ▼
                           ┌───────────────────┐
                           │ Image Prompt Agent│  (Art Direction & Prompt Engineering)
                           └─────────┬─────────┘
                                     ▼
                           ┌───────────────────┐
                           │  Reviewer Agent   │  (Score 0–100 & Compliance Check)
                           └─────────┬─────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     │                               │
            (Score < 75 & Revs < 3)         (Score ≥ 75 or Revs = 3)
                     │                               │
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │ Auto-Revision Routing     │   │   Human Approval Gate     │ (Pauses status: awaiting_human_approval)
       │ (Target failing node)     │   └─────────────┬─────────────┘
       └─────────────┬─────────────┘                 │
                     │                               ├──────────────────────────┐
                     └───────────────┐               │                          │
                                     │           (Approved)                 (Rejected)
                                     │               │                          │
                                     │               ▼                          ▼
                                     │     ┌───────────────────┐      ┌───────────────────┐
                                     │     │  Publisher Agent  │      │ Targeted Agent    │
                                     │     └─────────┬─────────┘      │ Revision Node     │
                                     │               │                └─────────┬─────────┘
                                     │               ▼                          │
                                     └──────────► [ END ] ◄─────────────────────┘
```

> [!NOTE]
> **State Persistence & Checkpointing**: LangGraph utilizes `MemorySaver` checkpointer instances. When a workflow reaches `human_approval`, execution pauses and state is checkpointed until an explicit approve or reject HTTP call is received.

---

## 🤖 3. Agent Pipeline & Deliverable Schemas

Each agent produces structured JSON outputs strictly validated via **Pydantic v2** models in [`ai-service/schemas/agent_outputs.py`](file:///e:/AgentMark/AgentMark/ai-service/schemas/agent_outputs.py).

### 1. Manager Agent ([`manager.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/manager.py))
- **Role:** Parses brief parameters (`product_name`, `target_audience`, `primary_goal`, `brand_voice`).
- **Output:** Validated execution metadata and channel assignment list.

### 2. Market Research Agent ([`research.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/research.py))
- **Role:** Executes live Tavily web searches to extract market intelligence.
- **Deliverables:**
  - `total_addressable_market` & `growth_rate`
  - `top_competitors[]` & `differentiation_opportunity`
  - `audience_insights`: `pain_points[]`, `motivations[]`, `preferred_channels[]`

### 3. Brand Strategy Agent ([`strategy.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/strategy.py))
- **Role:** Formulates campaign framework and positioning.
- **Deliverables:**
  - `positioning`: Core value proposition
  - `content_pillars[]` & `key_messages[]`
  - `channel_strategy{}`: Channel allocation and rationale
  - `success_metrics`: KPIs and target conversion ratios

### 4. Copywriter Agent ([`copywriter.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/copywriter.py))
- **Role:** Crafts multi-channel creative marketing copy.
- **Deliverables:**
  - Channel-specific copy blocks (`x_twitter`, `linkedin`, `email`, `google_ads`, `meta_facebook`, `tiktok`)
  - Each block contains `headline`, `body_text`, and `call_to_action`

### 5. Creative Hook Matrix Agent ([`creative_hook_matrix.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/creative_hook_matrix.py))
- **Role:** Generates viral angle hooks per channel (gated by `ENABLE_CREATIVE_HOOK_MATRIX=true`).

### 6. Visual Prompt Agent ([`image_prompt.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/image_prompt.py))
- **Role:** Formulates art direction and image prompts.
- **Deliverables:**
  - `visual_direction`: Color palette, mood, and style keywords
  - `image_prompts[]`: Prompts optimized for DALL-E 3, Midjourney, Imagen 3, and Flux

### 7. Quality Reviewer Agent ([`reviewer.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/reviewer.py))
- **Role:** Audits copy safety, brand alignment, and regulatory compliance.
- **Deliverables:**
  - Rating score ($0 - 100$)
  - Individual breakdown: `research_review`, `strategy_review`, `copy_review`, `image_review`

### 8. Distribution Publisher Agent ([`publisher.py`](file:///e:/AgentMark/AgentMark/ai-service/agents/publisher.py))
- **Role:** Constructs publication timelines and checklists.
- **Deliverables:**
  - `publishing_plan[]`: Channel timing, priority, and format
  - `content_calendar`: Multi-week schedule breakdown
  - `asset_checklist`: Required copy and visual assets

---

## 🔒 4. Authentication & Security Boundary Model

AgentMark implements a dual-mode security boundary in [`backend/src/middlewares/auth.middleware.ts`](file:///e:/AgentMark/AgentMark/backend/src/middlewares/auth.middleware.ts):

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
> **API Key Security Policy**: Key management routes (`POST/GET/DELETE /api/developer/keys`) enforce `jwtOnly` authorization. Programmatic `am_` API keys cannot generate or revoke other keys, preventing escalation of privilege attacks.

---

## 📡 5. Event-Driven Communication Protocol

Real-time campaign progress updates flow from the Python service through Redis to React frontend clients:

```
┌──────────────────┐               ┌──────────────────┐               ┌──────────────────┐
│ Python AI Node   │               │ Express Subscriber│               │ React Frontend   │
│ (redis_publisher)│               │(redis-subscriber)│               │ (Socket.IO Room) │
└────────┬─────────┘               └────────┬─────────┘               └────────┬─────────┘
         │                                  │                                  │
         │  1. Redis PUBLISH campaign:{id}   │                                  │
         ├─────────────────────────────────►│                                  │
         │  Payload: { agent, status }      │                                  │
         │                                  │  2. Socket.IO EMIT agent_update  │
         │                                  ├─────────────────────────────────►│
         │                                  │  To Room: campaign_{id}          │
         │                                  │                                  │
```

---

## 🏛️ 6. EMOS Baseline Subsystems

The Enterprise Marketing Operating System (EMOS) introduces five architectural layers:

1. **Brand Vault & Context Contracts (Phase 1):** Append-only event-sourced brand facts. Materializes snapshot isolation into JSON Context Contracts (<250 tokens).
2. **Hybrid RRF Retrieval (Phase 2):** Combines PostgreSQL tsvector BM25 keyword matching with pgvector HNSW vector similarity using Reciprocal Rank Fusion:
   $$RRF\_Score(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$
   Weighted by Source Precedence (`MANUAL_USER: 1.0 > GUIDELINES: 0.9 > WEBSITE: 0.7 > COMPETITOR: 0.3`), bounded to $K \le 5$ chunks.
3. **4-Tier Layered Policy Engine (Phase 3):** Sequential compliance checks: Platform Safety $\rightarrow$ Industry Regulations $\rightarrow$ Tenant Guidelines $\rightarrow$ Campaign Caps.
4. **Memory Decay Engine (Phase 4):** 90-Day half-life decay calculation:
   $$\lambda = \frac{\ln 2}{90}$$
5. **OpenTelemetry Telemetry (Phase 5):** Distributed tracing context propagation (`trace_id`, `span_id`, `evidence_id`) across all components.

---

## 🗄️ 7. PostgreSQL Schema & Entity Relations

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
