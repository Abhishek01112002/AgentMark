# AgentMark — Enterprise Multi-Agent AI Marketing Platform

> AI-powered campaign orchestration platform that turns market research and brand context into strategy, copy, visual prompts, evaluation, human approval, and publishing workflows.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7%2B-DC382D?logo=redis)](https://redis.io/)

## Why this project

AgentMark is designed as a **real software system**, not a single LLM demo. It separates the user-facing application, backend/API layer, AI orchestration service, and MCP integration into independently testable components.

The core workflow combines **LangGraph stateful orchestration, retrieval, policy/evaluation gates, persistent memory, human-in-the-loop approval, Redis events, and observability**.

## Architecture

```text
React + TypeScript + Vite
        │ REST + WebSocket
        ▼
Node.js + Express + Prisma
        │                 │
        │                 └── Redis Pub/Sub ──► Socket.IO
        ▼
FastAPI + LangGraph + LangChain
        │
        ├── Research Agent
        ├── Strategy Agent
        ├── Copywriter Agent
        ├── Visual Prompt Agent
        ├── Reviewer / Evaluator
        ├── Focus Group Simulation
        ├── Human Approval Gate
        └── Publisher
        │
        ▼
PostgreSQL + Redis

Optional: FastMCP server ──► Claude Desktop / Cursor / Windsurf
```

### Campaign execution flow

1. Frontend submits a campaign request.
2. Backend creates the campaign record and invokes the AI service.
3. LangGraph executes the stateful agent workflow.
4. Agent nodes publish progress events through Redis.
5. Backend bridges those events to the frontend through Socket.IO.
6. Evaluation and policy gates validate generated outputs.
7. Human approval can pause the workflow before publishing.
8. Final outputs and campaign state are persisted to PostgreSQL.

## Engineering Highlights

| Area | Implementation |
|---|---|
| **Agent orchestration** | LangGraph state graph with specialized agent nodes and conditional routing |
| **LLM integration** | Gemini, OpenAI, and Groq through a provider abstraction |
| **Retrieval** | Hybrid retrieval with Reciprocal Rank Fusion and source-precedence weighting |
| **Context engineering** | Brand Vault with append-only events, materialized snapshots, and compact context contracts |
| **Quality & safety** | Independent evaluation plus layered policy gates |
| **Memory** | Reliability filtering, time decay, and human edit signals |
| **Human-in-the-loop** | Explicit approval gate before high-impact workflow stages |
| **Realtime UX** | Redis Pub/Sub → Socket.IO event bridge for live agent progress |
| **Backend** | Node.js/Express, TypeScript, Prisma, PostgreSQL, Redis, JWT, Zod |
| **AI service** | FastAPI, Pydantic v2, LangChain, LangGraph |
| **MCP** | FastMCP server exposing AgentMark capabilities to compatible AI clients |
| **Observability** | Structured audit logging and trace context propagation |

## Technology Stack

### Frontend
React 18 · TypeScript · Vite · React Router · Socket.IO Client

### Backend
Node.js 18+ · Express · TypeScript · Prisma · PostgreSQL · Redis · Socket.IO · JWT · Zod

### AI Service
Python 3.10+ · FastAPI · LangGraph · LangChain · Pydantic v2 · Gemini · OpenAI · Groq · Tavily

### MCP Server
Python · FastMCP · httpx · tenacity

## Repository Structure

```text
AgentMark/
├── frontend/                 # React application and realtime campaign UI
├── backend/                  # REST API, auth, persistence, Redis event bridge
├── ai-service/               # FastAPI + LangGraph agent orchestration
├── agentmark-mcp-server/     # MCP integration for AI clients
├── start-agentmark.bat       # Windows startup helper
├── .gitignore
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 18+
- Python 3.10+
- PostgreSQL 15+
- Redis 7+
- Git

### 1. Clone

```bash
git clone https://github.com/Abhishek01112002/AgentMark.git
cd AgentMark
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Backend: `http://localhost:5003`

### 3. AI Service

```bash
cd ../ai-service
cp .env.example .env
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```

AI service: `http://127.0.0.1:5002`

### 4. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend: `http://localhost:5173`

### 5. Environment variables

Never commit secrets. Configure API keys and service credentials in local `.env` files using the supplied `.env.example` templates.

## MCP Integration

The optional `agentmark-mcp-server/` exposes AgentMark capabilities through the **Model Context Protocol**, allowing compatible clients such as Claude Desktop, Cursor, or Windsurf to interact with the platform.

## What this demonstrates

- Designing multi-agent systems around **state and workflow**, rather than independent prompts.
- Separating AI orchestration from application/business logic.
- Using **retrieval + policy + evaluation** as first-class system components.
- Building realtime UX around asynchronous agent execution.
- Applying authentication, validation, persistence, observability, and service boundaries to GenAI applications.

## License

MIT
