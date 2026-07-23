# AgentMark — Enterprise Multi-Agent AI Marketing Platform

AgentMark is an AI-powered, enterprise-grade **Multi-Agent Marketing Campaign Generator** and pre-launch audience simulation system. It automates the entire lifecycle of marketing campaign creation—from initial market research and strategy formulation to copywriting, visual asset prompting, quality assurance, human-in-the-loop (HITL) approval, focus group testing, and multi-channel publishing.

---

## 🏗️ System Architecture & Services

AgentMark consists of four core micro-services:

```
┌────────────────────────────────────────────────────────┐
│                   1. React Frontend                    │
│      React 18 + TypeScript + Vite + Custom CSS System   │
│                (Runs on http://localhost:5001)         │
└───────────┬──────────────────────────────▲─────────────┘
            │ HTTP (REST API)              │ WebSockets (Real-time Progress)
┌───────────▼──────────────────────────────┴─────────────┘
│                   2. Express Backend                   │
│   Node.js + Express + PostgreSQL (Prisma) + Socket.IO  │
│                (Runs on http://localhost:5003)         │
└───────────┬──────────────────────────────▲─────────────┘
            │ HTTP / ioredis               │ Redis Pub/Sub Events
┌───────────▼──────────────────────────────┴─────────────┐
│                   3. Python AI Service                 │
│      Python 3.12 + FastAPI + LangGraph + LangChain     │
│                (Runs on http://localhost:5002)         │
└────────────────────────────────────────────────────────┘
            ▲
            │ MCP Protocol (HTTPX REST Client)
┌───────────┴────────────────────────────────────────────┐
│                4. AgentMark MCP Server                 │
│           Python 3.12 + FastMCP (Claude Desktop)       │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### **Frontend (`/frontend`)**
- **Core:** React 18, TypeScript, Vite
- **Styling:** Custom CSS System with HSL tokens (`index.css`), Glassmorphism UI
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Routing:** React Router DOM v6
- **Real-Time:** Socket.IO Client (`socket.io-client`)

### **Backend (`/backend`)**
- **Core:** Node.js, Express, TypeScript
- **Database & ORM:** PostgreSQL managed via Prisma ORM
- **Authentication:** Dual-Mode — JWT Bearer Auth & Developer API Keys (`am_<hex>`)
- **Real-Time & Caching:** Socket.IO, Redis (`ioredis`), Rate Limiter
- **Media Storage:** ImageKit API integration

### **AI Service (`/ai-service`)**
- **Framework:** Python 3.12, FastAPI, Uvicorn
- **Orchestration:** LangGraph (Stateful Multi-Agent State Machine)
- **LLM Integrations:** Google Gemini 1.5/2.0, OpenAI GPT-4o, Groq (Llama 3)
- **Validation:** Pydantic v2 structured output schemas

### **MCP Integration (`/agentmark-mcp-server`)**
- **Protocol:** Model Context Protocol (MCP) via FastMCP SDK
- **Integration:** Claude Desktop, Cursor IDE, Windsurf

---

## 📁 Repository Structure

```
AgentMark/
├── frontend/                     # React 18 + Vite frontend application (Port 5001)
│   ├── src/
│   │   ├── components/           # UI components (pages, modals, shared layout)
│   │   ├── contexts/             # AuthContext & state providers
│   │   ├── services/             # API & LLM Settings services
│   │   └── index.css             # Dark Luxury Tech CSS design system
│   ├── vite.config.ts            # Vite configuration
│   └── package.json
│
├── backend/                      # Express.js + Prisma PostgreSQL server (Port 5003)
│   ├── prisma/
│   │   └── schema.prisma         # Database models (User, Project, Campaign, ApiKey, etc.)
│   ├── src/
│   │   ├── modules/              # Feature routes & controllers (campaigns, developer, focus-group)
│   │   ├── middlewares/          # Auth & API key role-scoping security guards
│   │   ├── utils/                # Redis subscriber, AI client, & Claude config generator
│   │   └── index.ts              # Express server entry point
│   └── package.json
│
├── ai-service/                   # LangGraph Multi-Agent Engine (Port 5002)
│   ├── agents/                   # Agent nodes (manager, research, strategy, copy, image, review, publisher)
│   ├── workflow/                 # LangGraph graph assembly & score-based routing
│   ├── schemas/                  # Pydantic structured output definitions
│   └── run.py                    # FastAPI Uvicorn server entry point
│
├── agentmark-mcp-server/         # FastMCP Server for Claude Desktop
│   ├── src/agentmark_mcp/
│   │   ├── server.py             # MCP server definition & tool registration
│   │   └── tools/                # Tool implementations (campaign, focus_group, project, publish, revision)
│   └── pyproject.toml
│
├── PROJECT_EXPLANATION.md        # Comprehensive Architecture & Multi-Agent Guide
├── PROJECT_FOLDER_FILE_STRUCTURE.md # Detailed repository file map
├── PROJECT_STYLE.md              # Design system & UI specifications
└── README.md                     # Project overview (This document)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL Database
- Redis Instance (`localhost:6379`)

---

### Step 1: Backend Setup (`/backend`)

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```
*Backend runs on: **http://localhost:5003***

---

### Step 2: AI Service Setup (`/ai-service`)

```bash
cd ai-service
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
python run.py
```
*AI Service runs on: **http://127.0.0.1:5002***

---

### Step 3: Frontend Setup (`/frontend`)

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: **http://localhost:5001***

---

### Step 4: MCP Server Setup (`/agentmark-mcp-server`)

```bash
cd agentmark-mcp-server
uv venv
.venv\Scripts\activate
uv pip install -e .
```

---

## 🔑 Environment Variables Reference

### Frontend (`frontend/.env`)
```env
VITE_API_URL=http://localhost:5003
```

### Backend (`backend/.env`)
```env
PORT=5003
DATABASE_URL="postgresql://postgres:password@localhost:5432/agentmark?schema=public"
JWT_SECRET="your-jwt-secret-key"
REDIS_URL="redis://localhost:6379"
AI_SERVICE_URL="http://127.0.0.1:5002"
```

### AI Service (`ai-service/.env`)
```env
SERVICE_PORT=5002
SERVICE_HOST=127.0.0.1
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your-openai-key
GEMINI_API_KEY=your-gemini-key
GROQ_API_KEY=your-groq-key
TAVILY_API_KEY=your-tavily-key
```

---

## ⚖️ License & Credits

Developed by **Novateches Software Pvt Ltd**. All Rights Reserved.
