## AgentMark AI Service

FastAPI + LangGraph orchestration service for the AgentMark multi-agent marketing workflow.

### Structure

- `agents/` - Manager, Research, Strategy, Copywriter, Image Prompt, Reviewer, Publisher, and HITL agent logic.
- `workflow/` - LangGraph state machine and routing rules.
- `llm/` - Provider clients, rate-aware failover, model/key selection, and rate limiting.
- `services/` - External service wrappers such as Tavily search and image generation.
- `schemas/` - Pydantic request/response and agent output contracts.
- `api/` - FastAPI routes.
- `utils/prompts/` - Prompt templates used by agents.
- `tests/` - Offline automated pytest suite. Tests mock LLM/search calls by default.
- `examples/` - Manual local demos and exploratory runners.

### Run

```bash
uvicorn main:app --host 0.0.0.0 --port 5002 --reload
```

### Test

Run the safe offline suite:

```bash
pytest
```

Run a focused file:

```bash
pytest tests/test_rate_limit_resilience.py
```

The default pytest suite must not require real OpenAI, Gemini, Groq, Tavily, Redis, or browser access. Live/manual flows belong in `examples/`, not `tests/`.

### Configuration

Provider keys can come from request `llm_config` or environment variables:

- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `GROQ_API_KEY`
- `TAVILY_API_KEY`

Default LLM provider order is OpenAI, Gemini, then Groq. Tavily is used only by the Research Agent for web sources.
