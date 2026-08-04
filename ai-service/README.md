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
| `ENABLE_CREATIVE_HOOK_MATRIX` | No | Set to `true` to enable the Creative Hook Matrix agent step (default: `false`) |
| `LOG_LEVEL` | No | `INFO` for development, **`ERROR` for production**. Python's `logging` module silently drops lower-level calls at zero CPU/disk cost. (default: `INFO`) |
| `SENTRY_DSN` | No | Sentry DSN for free crash tracking ($0/month, FastAPI integration). Leave empty in development. Get it from [sentry.io](https://sentry.io/signup/). |

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
│   ├── creative_hook_matrix.py       # Viral hook angles per channel (feature-flagged: ENABLE_CREATIVE_HOOK_MATRIX)
│   ├── image_prompt.py               # Visual prompt generation
│   ├── reviewer.py                   # Quality scoring (0–100) + compliance
│   ├── publisher.py                  # Publishing plan + content calendar
│   ├── human_approval.py             # HITL gate — pauses workflow for review
│   ├── focus_group.py                # Synthetic persona simulation
│   ├── evaluator.py                  # Independent evaluator for EMOS quality gates
│   ├── persona_composer.py           # Persona composition utilities for focus group
│   ├── devils_advocate.py            # Adversarial critique generator
│   └── trust_analyzer.py             # Trust signal analyzer for copy quality
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
│   ├── logger.py                     # Structured logger — reads LOG_LEVEL env var + Sentry init
│   ├── redis_publisher.py            # publish_agent_event() — Redis Pub/Sub publisher
│   └── ...                           # Additional utilities
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
┌────────────────────────────────────┐
│ creative_hook_matrix (conditional) │   — Viral hook angles per channel
│ Enabled via ENABLE_CREATIVE_HOOK_MATRIX │   Falls back silently if disabled
└──────┬─────────────────────────────┘
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

---

## Observability & Logging

The AI Service uses a **zero-cost structured logging architecture**. See the [root README Observability section](../README.md#observability--logging-zero-cost-strategy) for the full strategy.

### Logger Usage

All new code should use the named logger instead of `print()` or raw `logging` calls:

```python
from utils.logger import get_logger
logger = get_logger(__name__)  # Best practice: use module name

# Routine information (only visible in development when LOG_LEVEL=INFO)
logger.info("🚀 Campaign workflow started for campaign_id=%s", campaign_id)
logger.warning("[ResearchAgent] Tavily returned 0 results, using cached data")

# Errors (always visible, forwarded to Sentry in production)
logger.error("[CopywriterAgent] LLM API call failed: %s", str(e))
```

### How LOG_LEVEL Works

| `LOG_LEVEL` | `logger.debug` | `logger.info` | `logger.warning` | `logger.error` |
|---|---|---|---|---|
| `DEBUG` | ✅ printed | ✅ printed | ✅ printed | ✅ printed |
| `INFO` | ❌ silent | ✅ printed | ✅ printed | ✅ printed |
| `ERROR` | ❌ silent | ❌ silent | ❌ silent | ✅ printed |

In production, set `LOG_LEVEL=ERROR` in `ai-service/.env`. Python's `logging` module is optimised for this — it discards lower-level calls at zero CPU/string-formatting overhead.

### File Logging

- **Development only:** `logs/ai_service.log` is written when `ENV != production`.
- **Production:** File handler is disabled. All output goes to `stdout` only (captured by Docker, PM2, or systemd for free).
- **Cleanup:** Use `scripts/setup_logrotate.sh` to auto-delete logs older than 3 days on Linux servers.

### Sentry (Crash Tracking)

`utils/logger.py` initialises the `sentry-sdk[fastapi]` integration only when `SENTRY_DSN` is set. It is a complete no-op otherwise. In production, it automatically captures:
- Uncaught FastAPI/Uvicorn exceptions
- Asyncio task crashes
- Any call to `logger.error()` or above that escalates to an exception

Routine `logger.info()` calls are **never** sent to Sentry — only real crashes and errors.
