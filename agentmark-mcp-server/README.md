# AgentMark MCP Server

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)

**AgentMark MCP Server** is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that connects AI assistants — Claude Desktop, Cursor, Windsurf, and any other MCP-compatible host — directly to the AgentMark AI marketing platform.

Generate complete multi-channel campaigns, simulate audience reactions, check campaign status, and revise copy without leaving your chat window.

> **Local-only server.** The MCP server is bundled inside the AgentMark monorepo and runs as a local Python process. It is **not** published to PyPI. Setup requires the monorepo to be installed and the backend to be running.

---

## What You Can Do

| Command | What Happens |
|---|---|
| "Generate a campaign for my SaaS product" | Full LangGraph pipeline runs: Research → Strategy → Copy → Visuals → Review. Structured Markdown brief delivered in-chat. |
| "Run the focus group on that campaign" | AI personas evaluate your copy, score it, list objections, and suggest revisions. |
| "Publish the LinkedIn post now" | Publisher agent triggers, formats distribution schedule, returns confirmation. |
| "Create a project called Q3 Launch" | Creates a new project workspace and returns the UUID. |
| "Revise the LinkedIn copy — make it punchier" | Re-runs the Copywriter agent with your feedback, then auto-runs Focus Group. |
| "What's the status of campaign X?" | Returns current status, review score, version history, and any pending approvals. |

---

## Architecture

```
+-------------------+   stdin/stdout   +----------------------+   HTTP REST   +---------------------+
|   MCP Host        | <=============>  | AgentMark MCP Server | <==========>  |  AgentMark Backend  |
| (Claude / Cursor) |   MCP Protocol   |  (this directory)    |  Port 5003    |  (Node.js/Express)  |
+-------------------+                  +----------------------+               +---------------------+
```

- **No direct database access.** All calls go through the AgentMark REST API, preserving authorization and rate limit policies.
- **Long-running jobs are polled safely.** The LangGraph pipeline takes 60–120 seconds. The MCP server wraps this in a fault-tolerant polling loop with live progress milestones delivered to the chat window.
- **Fire-and-forget progress.** Every agent milestone (`[Research]`, `[Strategy]`, `[Copywriter]`, etc.) surfaces as a live notification in the chat client so users never see a silent spinner.

---

## Prerequisites

- Python 3.10 or higher
- [`uv`](https://docs.astral.sh/uv/) package manager
- A running AgentMark backend (Port 5003)
- A **Developer API Key** generated from your AgentMark account (see below)

---

## Installation

The MCP server lives inside the AgentMark monorepo at `agentmark-mcp-server/`. No separate clone is needed.

```bash
cd agentmark-mcp-server

# Create virtual environment and install
uv venv
.venv\Scripts\activate       # Windows
# or: source .venv/bin/activate   # macOS / Linux

uv pip install -e .
```

---

## Generating a Developer API Key

**Recommended (automatic):** Log into the AgentMark web app → **Settings → Integrations → Connect Claude Desktop**. Click the button to generate an API key and auto-write the claude_desktop_config.json.

**Manual via REST API:**

```bash
# Step 1: Get your JWT token from any authenticated browser request (DevTools → Network → Authorization header)

# Step 2: Create a Developer API key
curl -X POST http://localhost:5003/api/developer/keys \
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"label": "Claude Desktop"}'
```

**Response (save the key — it is shown only once):**

```json
{
  "id": "a1b2c3d4-...",
  "label": "Claude Desktop",
  "key": "am_4f3a8b2c1d...",
  "warning": "Store this key securely. It will not be shown again.",
  "createdAt": "2026-07-31T00:00:00.000Z",
  "isActive": true
}
```

---

## Configuration

### Claude Desktop

Config file location:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**From source (standard setup):**

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

> **Windows path:** Replace `E:/AgentMark/AgentMark` with your actual clone location. Use forward slashes or escaped backslashes.

> **macOS / Linux path:** Use `agentmark-mcp-server/.venv/bin/python` instead.

**Using `uv run` (alternative):**

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "/path/to/agentmark-mcp-server",
        "python",
        "-m",
        "agentmark_mcp.server"
      ],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5003",
        "AGENTMARK_API_KEY": "am_your_developer_key_here"
      }
    }
  }
}
```

**Restart Claude Desktop completely** (close from system tray, not just the window) after editing the config.

---

### Cursor IDE

1. Open **Settings** → **Features** → **MCP**
2. Click **+ Add New MCP Server**
3. Set **Type** to `command`
4. **Command:** `E:/AgentMark/AgentMark/agentmark-mcp-server/.venv/Scripts/python.exe`
5. **Args:** `-m agentmark_mcp.server`
6. **Environment Variables:**
   - `AGENTMARK_API_URL` = `http://localhost:5003`
   - `AGENTMARK_API_KEY` = `am_your_developer_key_here`

---

### Windsurf

Add to your Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "/path/to/agentmark-mcp-server/.venv/bin/python",
      "args": ["-m", "agentmark_mcp.server"],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5003",
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

### `create_project`

Creates a new AgentMark project workspace.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `name` | string | Yes | Project display name |
| `description` | string | No | Optional project description |

**Returns:** Project UUID to use with `generate_campaign`.

---

### `revise_copy_with_feedback`

Re-runs the Copywriter agent with specific feedback notes, then automatically runs a Focus Group simulation on the revised copy.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `campaign_id` | string (UUID) | Yes | Campaign to revise |
| `feedback` | string | Yes | Revision instructions (e.g., "Make the headline punchier and cut 30 words") |
| `openai_api_key` | string | No | LLM key override |
| `gemini_api_key` | string | No | Gemini key override |
| `groq_api_key` | string | No | Groq key override |

**Returns:** Revised copy + Focus Group scores.

---

### `get_campaign_status`

Returns the current status, quality scores, and version history for a campaign.

**Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `campaign_id` | string (UUID) | Yes | Campaign to query |

**Returns:** Status badge (`draft`, `processing`, `awaiting_human_approval`, `completed`, `failed`), review score, revision count, and version list.

---

### `request_targeted_revision`

Re-runs a specific upstream agent (`copywriter`, `strategy`, `research`, `creative_hook_matrix`, `image_prompt`) with targeted feedback.

---

### `submit_human_approval`

Submits human approval decision (`approved` or `rejected`) at the HITL gate.

---

### `update_client_memory` & `clear_client_memory`

Update or reset brand guidelines, target audience context, and strategic takeaways in the Memory Hub.

---

### `export_campaign_pdf` & `export_campaign_json`

Export full campaign strategy and schedule as downloadable PDF or structured JSON payload.

---

### `get_publishing_schedule` & `verify_channel_credentials`

Retrieve 4-week content publishing timeline and test connected channel credentials.

---

### `generate_image_asset`

Directly generate visual image assets from prompts using Gemini or DALL-E.

---

### `get_campaign_analytics`, `synthesize_brand_memory_intelligence`, `compare_campaign_performance_vectors`

Fetch performance metrics, synthesize historical brand intelligence, and analyze comparative performance vectors against baseline top-performing campaigns.

---

## Example Conversation Flow

```
You: Create a project called "Q3 SaaS Launch"

Claude: Project created. ID: abc-123-...

---

You: Generate a campaign for Novateches CRM.
     Brand: Novateches, Industry: SaaS, Goal: lead_gen
     Audience: B2B sales managers at SMBs
     Voice: bold and data-driven, Project ID: abc-123-...

[AgentMark] [Manager] Analyzing campaign brief...
[AgentMark] [Research] Gathering market intelligence...
[AgentMark] [Strategy] Building messaging pillars...
[AgentMark] [Copywriter] Generating multi-channel copy...
[AgentMark] [Reviewer] Scoring outputs...
[AgentMark] Complete! Review Score: 84/100

Claude: ## Campaign Brief: Novateches CRM Launch
        ...

---

You: Run the focus group.

Claude: ## Focus Group Results — Overall: 7.8/10
        ...

---

You: Revise the LinkedIn copy — make it 30% shorter with bullet points.

[AgentMark] Revising Copywriter output...
[AgentMark] Running Focus Group on revised copy...

Claude: ## Revised Copy + Focus Group
        LinkedIn Score: 8.4/10 (improved)
        ...

---

You: Publish to channel.

Claude: ## Distribution Plan
        Campaign approved. Publisher agent triggered.
        ...
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `AGENTMARK_API_URL` | Yes | `http://localhost:5003` | Base URL of your AgentMark backend |
| `AGENTMARK_API_KEY` | Yes | — | Developer API key (format: `am_<hex>`) |
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
cd agentmark-mcp-server

# Install in editable mode with dev dependencies
uv venv
.venv\Scripts\activate    # Windows
# or: source .venv/bin/activate

uv pip install -e ".[dev]"

# Run unit tests
uv run pytest tests/ -v

# Audit registered tools
python test_audit.py

# Launch MCP Inspector (interactive browser-based debugger)
set AGENTMARK_API_URL=http://localhost:5003
set AGENTMARK_API_KEY=am_your_key_here
npx @modelcontextprotocol/inspector python -m agentmark_mcp.server
```

The Inspector runs at `http://localhost:5173` and lets you invoke every tool manually, inspect request/response payloads, and audit progress messages.

---

## Managing Your API Keys

From the AgentMark web app: **Settings → Integrations** — create, view, and revoke Developer API Keys.

Via REST API:

```bash
# List all your keys
curl http://localhost:5003/api/developer/keys \
  -H "Authorization: Bearer <JWT_TOKEN>"

# Revoke a key
curl -X DELETE http://localhost:5003/api/developer/keys/<KEY_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

---

## License

Developed by **Novateches Software Pvt Ltd**. All Rights Reserved.
