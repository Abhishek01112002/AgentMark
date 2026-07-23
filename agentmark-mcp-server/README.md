# AgentMark MCP Server

[![PyPI version](https://img.shields.io/pypi/v/agentmark-mcp-server.svg)](https://pypi.org/project/agentmark-mcp-server/)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**AgentMark MCP Server** is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI assistants — Claude Desktop, Cursor, Windsurf, and any other MCP-compatible host — directly to the AgentMark AI marketing platform.

Generate complete multi-channel campaigns, simulate audience reactions, and publish content without leaving your chat window.

---

## What You Can Do

| Command | What Happens |
|---|---|
| "Generate a campaign for my SaaS product" | Full LangGraph pipeline runs: Research → Strategy → Copy → Visuals → Review. Structured Markdown brief delivered in-chat. |
| "Run the focus group on that campaign" | AI personas evaluate your copy, score it, list objections, and suggest revisions. |
| "Publish the LinkedIn post now" | Publisher agent triggers, formats distribution schedule, returns confirmation. |

---

## Architecture

```
+-------------------+   stdin/stdout   +----------------------+   HTTPS   +---------------------+
|   MCP Host        | <=============>  | AgentMark MCP Server | <=======> |  AgentMark Backend  |
| (Claude / Cursor) |   MCP Protocol   |  (this package)      |  REST API |  (Node.js/Express)  |
+-------------------+                  +----------------------+           +---------------------+
```

- **No direct database access.** All calls go through the AgentMark REST API, preserving authorization and rate limit policies.
- **Long-running jobs are polled safely.** The LangGraph pipeline takes 2–4 minutes. The MCP server wraps this in a fault-tolerant polling loop with simulated progress milestones delivered to the chat window.
- **Fire-and-forget progress.** Every agent milestone (`[Research]`, `[Strategy]`, `[Copywriter]`, etc.) surfaces as a live notification in the chat client so users never see a silent spinner.

---

## Prerequisites

- Python 3.10 or higher
- A running AgentMark instance (self-hosted or cloud)
- A **Developer API Key** generated from your AgentMark account (see below)

---

## Generating a Developer API Key

Developer API keys (`am_<hex>`) are separate from your web login session. They are long-lived, revocable, and designed for programmatic access.

**Step 1:** Log into the AgentMark web app and obtain a JWT token (from your browser DevTools → Network → any authenticated request → `Authorization` header).

**Step 2:** Create a Developer API key:

```bash
curl -X POST https://your-agentmark-url/api/developer/keys \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label": "Claude Desktop - MacBook Pro"}'
```

**Response (save the key — it is shown only once):**

```json
{
  "id": "a1b2c3d4-...",
  "label": "Claude Desktop - MacBook Pro",
  "key": "am_4f3a8b2c1d...",
  "warning": "Store this key securely. It will not be shown again.",
  "createdAt": "2026-07-21T07:00:00.000Z",
  "isActive": true
}
```

**Step 3:** Use the `am_...` key as your `AGENTMARK_API_KEY` in the configuration below.

---

## Installation

### Option A — Install from PyPI (recommended)

```bash
# Using uvx (no install needed, runs in isolated env):
uvx agentmark-mcp-server

# Or install permanently:
pip install agentmark-mcp-server
```

### Option B — Run from source

```bash
git clone https://github.com/agentmark/agentmark-mcp-server
cd agentmark-mcp-server
uv venv && uv pip install -e .
```

---

## Configuration

### Claude Desktop

Config file location:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Rationality\Claude\claude_desktop_config.json`

**From PyPI (recommended):**

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "uvx",
      "args": ["agentmark-mcp-server"],
      "env": {
        "AGENTMARK_API_URL": "https://your-agentmark-api.com",
        "AGENTMARK_API_KEY": "am_your_developer_key_here"
      }
    }
  }
}
```

**From source:**

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/agentmark-mcp-server",
        "agentmark-mcp-server"
      ],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5003",
        "AGENTMARK_API_KEY": "am_your_developer_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

---

### Cursor IDE

1. Open **Settings** → **Features** → **MCP**
2. Click **+ Add New MCP Server**
3. Set **Type** to `command`
4. **Command:**
   ```
   uvx agentmark-mcp-server
   ```
5. **Environment Variables:**
   - `AGENTMARK_API_URL` = `https://your-agentmark-api.com`
   - `AGENTMARK_API_KEY` = `am_your_developer_key_here`

---

### Windsurf

Add to your Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "uvx",
      "args": ["agentmark-mcp-server"],
      "env": {
        "AGENTMARK_API_URL": "https://your-agentmark-api.com",
        "AGENTMARK_API_KEY": "am_your_developer_key_here"
      }
    }
  }
}
```

---

## Available Tools

### `generate_campaign`

Generates a complete multi-channel marketing campaign using the full LangGraph agent pipeline.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `project_id` | string (UUID) | Yes | Project to attach this campaign to |
| `name` | string | Yes | Display name for the campaign |
| `brand_name` | string | Yes | Name of the brand being marketed |
| `industry` | string | Yes | Industry sector (e.g., SaaS, E-commerce) |
| `primary_goal` | string | Yes | One of: `awareness`, `lead_gen`, `sales`, `retention` |
| `target_audience` | string | Yes | Description of the intended audience |
| `brand_voice` | string | Yes | Tone directives (e.g., "bold and direct") |
| `additional_info` | string | No | Supplementary context or constraints |
| `openai_api_key` | string | No | OpenAI key override (falls back to env var) |
| `gemini_api_key` | string | No | Gemini key override |
| `groq_api_key` | string | No | Groq key override |
| `tavily_api_key` | string | No | Tavily search key override |

**Returns:** Structured Markdown campaign brief with strategy, channel copy, review score, and next-action prompts.

---

### `run_focus_group`

Simulates target audience persona reactions to campaign copy.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `campaign_id` | string (UUID) | Yes | ID returned by `generate_campaign` |
| `copy_text` | string | No | Explicit copy to test. Auto-extracted from campaign if empty |
| `negativity_bias` | float (0.0–1.0) | No | Weighting toward worst persona score. Default: 0.3 |

**Returns:** Structured Markdown report with persona scores, objections, click-intent ratios, and revision suggestions.

---

### `publish_to_channel`

Approves the campaign and triggers the Publisher agent to produce the final distribution plan.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `campaign_id` | string (UUID) | Yes | Campaign in `awaiting_human_approval` status |
| `openai_api_key` | string | No | OpenAI key override for the Publisher agent |
| `gemini_api_key` | string | No | Gemini key override |
| `groq_api_key` | string | No | Groq key override |

**Returns:** Distribution plan, content calendar, asset checklist, and scheduled post confirmations.

---

## Example Conversation Flow

The following is a complete generate → simulate → publish workflow in Claude Desktop:

```
You: Generate a campaign for Novateches CRM.
     Brand: Novateches
     Industry: SaaS
     Goal: lead_gen
     Audience: B2B sales managers at SMBs
     Voice: bold and data-driven
     Project ID: [your-project-uuid]

[AgentMark] Campaign "Novateches CRM Launch" is being generated...
[AgentMark] [Manager] Analyzing campaign brief and dispatching agents...
[AgentMark] [Research] Gathering market intelligence and competitor data...
[AgentMark] [Strategy] Building campaign framework and messaging pillars...
[AgentMark] [Copywriter] Generating multi-channel creative copy...
[AgentMark] [Reviewer] Scoring and quality-checking all outputs...
[AgentMark] Complete! Review Score: 84/100

Claude: ## Campaign Brief: Novateches CRM Launch — Lead Generation
        ...

---

You: Run the focus group on that campaign.

Claude: ## Focus Group Simulation Results
        Overall Score: 7.8 / 10 — Mixed Reception
        ...

---

You: Publish to channel.

Claude: ## Distribution Plan
        Campaign approved and Publisher agent triggered.
        ...
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGENTMARK_API_URL` | Yes | `http://localhost:5003` | Base URL of your AgentMark backend |
| `AGENTMARK_API_KEY` | Yes | — | Developer API key (format: `am_<hex>`) |
| `OPENAI_API_KEY` | No | — | Server-level OpenAI key (tool params take precedence) |
| `GEMINI_API_KEY` | No | — | Server-level Gemini key |
| `GROQ_API_KEY` | No | — | Server-level Groq key |
| `TAVILY_API_KEY` | No | — | Server-level Tavily search key |
| `LOG_LEVEL` | No | `INFO` | Logging level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `AGENTMARK_POLL_INTERVAL_SECS` | No | `5` | Seconds between campaign status polls |
| `AGENTMARK_CAMPAIGN_TIMEOUT_SECS` | No | `900` | Max seconds to wait for campaign generation |
| `AGENTMARK_PUBLISH_TIMEOUT_SECS` | No | `450` | Max seconds to wait for publisher agent |
| `AGENTMARK_HTTP_MAX_CONNECTIONS` | No | `100` | HTTP connection pool size |
| `AGENTMARK_HTTP_CONNECT_TIMEOUT` | No | `10.0` | TCP connect timeout in seconds |
| `AGENTMARK_HTTP_READ_TIMEOUT` | No | `300.0` | HTTP read timeout in seconds |

---

## Local Development and Testing

```bash
# Clone and install in editable mode
git clone https://github.com/agentmark/agentmark-mcp-server
cd agentmark-mcp-server
uv venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
uv pip install -e ".[dev]"

# Run unit tests
pytest tests/ -v

# Launch MCP Inspector (interactive browser-based debugger)
export AGENTMARK_API_URL="http://localhost:5003"
export AGENTMARK_API_KEY="am_your_key_here"
npx @modelcontextprotocol/inspector uv run --directory . agentmark-mcp-server
```

The Inspector runs at `http://localhost:5173` and lets you invoke every tool manually, inspect request/response payloads, and audit progress messages.

---

## Managing Your API Keys

```bash
# List all your keys
curl https://your-agentmark-url/api/developer/keys \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Revoke a key
curl -X DELETE https://your-agentmark-url/api/developer/keys/<KEY_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## Publishing to PyPI

```bash
cd agentmark-mcp-server
uv build
uv publish --token $PYPI_API_TOKEN
```

---

## License

MIT — see [LICENSE](LICENSE) for details.
