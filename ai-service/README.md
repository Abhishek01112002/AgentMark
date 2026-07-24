# AgentMark AI Service

> Python 3.10+ · FastAPI · LangGraph · LangChain · Pydantic v2

The AI Service is the multi-agent execution engine for AgentMark. It runs a LangGraph stateful workflow graph across seven specialized agent nodes, publishes real-time progress events to Redis, and exposes a FastAPI HTTP interface protected by a shared internal secret.

---

## Port

| Service | Default Port | Bind Address |
|---|---|---|
| FastAPI / Uvicorn | `5002` | `127.0.0.1` (loopback only) |

> The AI Service binds to `127.0.0.1` intentionally. It is a private internal service — it **must not** be exposed to the internet. All access is gated by the `INTERNAL_SERVICE_SECRET` header, verified using `secrets.compare_digest`.

---

## Quick Start

```bash
# 1. Create and activate virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Recommended alternative with uv (faster):
uv venv && source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt
# or: uv pip install -r requirements.txt

# 3. Copy and configure environment variables
cp .env.example .env

# 4. Start the service
python run.py
```

Verify: `curl http://127.0.0.1:5002/health` → `{"status":"ok","service":"AgentMark AI Service"}`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `INTERNAL_SERVICE_SECRET` | Yes | Shared secret for backend↔AI service auth. **Must match `backend/.env`**. |
| `ENV` | Yes | Set to `production` to disable `/docs` and `/redoc` Swagger UI |
| `GEMINI_API_KEY` | Conditional | Google Gemini API key (required if using Gemini) |
| `GROQ_API_KEY` | Conditional | Groq API key (required if using Groq/Llama) |
| `TAVILY_API_KEY` | Conditional | Tavily API key for Research Agent web search |
| `OPENAI_API_KEY` | Conditional | OpenAI API key (required if using GPT-4o) |
| `GROQ_MODEL` | No | Groq model name (default: `llama-3.3-70b-versatile`) |
| `COPYWRITER_MODEL` | No | Model used by Copywriter Agent |
| `MAX_CONCURRENT_CAMPAIGNS` | No | Max parallel workflow executions (default: `4`) |

> At least one LLM provider key (`GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY`) must be set. Users can also provide keys per-campaign via the web app settings.

---

## Project Structure

```
ai-service/
│
├── main.py                           # FastAPI app factory + lifespan (workflow init)
├── run.py                            # Uvicorn server entry point
│
├── agents/                           # LangGraph node implementations
│   ├── state.py                      # CampaignState — shared TypedDict for all nodes
│   ├── manager.py                    # Orchestration coordinator
│   ├── research.py                   # Market intelligence + Tavily web search
│   ├── strategy.py                   # Campaign framework + messaging pillars
│   ├── copywriter.py                 # Multi-channel copy generation
│   ├── image_prompt.py               # Visual prompt generation
│   ├── reviewer.py                   # Quality scoring (0–100) + compliance
│   ├── publisher.py                  # Publishing plan + content calendar
│   ├── human_approval.py             # HITL gate — pauses workflow for review
│   └── focus_group.py                # Synthetic persona simulation
│
├── workflow/                         # LangGraph graph assembly
│   └── graph.py                      # StateGraph build + routing logic
│
├── api/
│   ├── dependencies.py               # INTERNAL_SERVICE_SECRET header verification
│   └── routes/
│       └── campaigns.py              # POST /campaigns/create, /test-key, /enhance-prompt, /generate-copy-variant
│
├── routers/
│   └── focus_group_router.py         # POST /focus-group/simulate, /interview
│
├── schemas/
│   ├── campaign.py                   # CampaignCreateRequest, CampaignCreateResponse
│   ├── agent_outputs.py              # Structured output schemas per agent
│   └── simulation.py                 # FocusGroupReport, PersonaCritique schemas
│
├── llm/
│   ├── factory.py                    # LLM provider selection + priority order
│   └── clients/                      # Gemini, OpenAI, Groq client wrappers
│
├── services/
│   └── search_service.py             # Tavily web search abstraction
│
├── utils/
│   └── redis_publisher.py            # publish_agent_event() — Redis Pub/Sub publisher
│
├── config/
│   └── settings.py                   # Environment variable loading
│
├── .env.example                      # Template for new deployments
└── requirements.txt                  # Python dependencies
```

---

## Agent Pipeline

The LangGraph workflow is a directed stateful graph. Each node receives the shared `CampaignState`, modifies it, and passes it to the next node.

```
CampaignState (input)
       │
       ▼
┌─────────────┐   Redis: [Manager] running / completed
│   manager   │
└──────┬──────┘
       ▼
┌─────────────┐   Redis: [Research] running / completed
│  research   │   — Tavily web search for market data
└──────┬──────┘
       ▼
┌─────────────┐   Redis: [Strategy] running / completed
│  strategy   │
└──────┬──────┘
       ▼
┌─────────────┐   Redis: [Copywriter] running / completed
│ copywriter  │   — Generates copy for: X, LinkedIn, Email, SMS, Google Ads, Meta, etc.
└──────┬──────┘
       ▼
┌──────────────┐  Redis: [ImagePrompt] running / completed
│ image_prompt │
└──────┬───────┘
       ▼
┌─────────────┐   Redis: [Reviewer] running / completed
│  reviewer   │   — Quality score + per-agent breakdown
└──────┬──────┘
       ▼
┌──────────────────┐   Status → awaiting_human_approval
│ human_approval   │   — Workflow pauses here until frontend sends approve/reject
└──────┬───────────┘
       │ (approved)
       ▼
┌─────────────┐   Redis: [Publisher] running / completed
│  publisher  │   — Content calendar, asset checklist, distribution plan
└──────┬──────┘
       │
       ▼
   campaign_complete → Redis terminal event → Backend → DB update → Socket.IO → Frontend
```

---

## Redis Event Protocol

Every agent node calls `publish_agent_event()` on entry and exit. The backend `redis-subscriber.ts` listens on `campaign:*` and forwards events to Socket.IO.

**Event payload shape:**
```json
{
  "campaign_id": "uuid",
  "agent": "research",
  "status": "running | completed | failed",
  "timestamp": "ISO8601",
  "outputs": { ... },
  "error": null
}
```

**Terminal system events** (`agent: "system"`):
- `status: "campaign_complete"` — full `outputs` dict included
- `status: "awaiting_human_approval"` — partial outputs included
- `status: "failed"` — `error` field populated

---

## Security

All endpoints (except `/health`) require the `X-Internal-Secret` header:

```
X-Internal-Secret: <value of INTERNAL_SERVICE_SECRET>
```

Verified via `secrets.compare_digest()` (constant-time comparison, timing-safe). Requests without a valid secret receive HTTP 403. The AI Service is not directly accessible by end users — only the Express backend can call it.

---

## Focus Group Simulation

The `/focus-group/simulate` endpoint runs parallel LLM persona agents:

- Each persona scores the campaign copy on resonance (0–100)
- Identifies specific objections and clash quotes
- Predicts click intent (boolean)
- Generates a verdict
- Results are cached in Redis for 3 days using an MD5 hash of the copy text as the cache key

The `/focus-group/interview` endpoint is a deterministic, zero-LLM alternative that generates realistic persona responses using rule-based sentiment detection with an 8-second asyncio timeout guard.

---

## Copy Variant Generation

`POST /campaigns/generate-copy-variant` runs the copywriter agent in isolation for a specific channel. This powers the "Generate Variant" button in the UI.

The backend applies Redis-based distributed locking (`lock:variant:<campaignId>:<channel>`) to prevent concurrent variant requests for the same channel on the same campaign.

---

## Concurrency

- **Workflow semaphore:** `MAX_CONCURRENT_CAMPAIGNS` (default 4) limits parallel LangGraph runs
- **Thread pool:** Campaign workflows run in a dedicated `ThreadPoolExecutor(max_workers=50)` to avoid blocking the async FastAPI event loop
- **Semaphore timeout:** If a slot is not available within 15 seconds, HTTP 503 is returned

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/campaigns/create` | Run full agent pipeline |
| POST | `/campaigns/generate-copy-variant` | Generate copy for one channel |
| POST | `/campaigns/enhance-prompt` | Enhance an image prompt using LLM |
| POST | `/campaigns/test-key` | Validate a provider API key |
| POST | `/focus-group/simulate` | Run full persona simulation |
| POST | `/focus-group/interview` | Ask panel a custom question |
