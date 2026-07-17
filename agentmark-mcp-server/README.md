# AgentMark MCP Server

This package implements a Model Context Protocol (MCP) server for the **AgentMark** AI marketing platform. It allows AI clients (like Anthropic's Claude Desktop, Cursor IDE, or Windsurf) to directly generate campaigns, run focus group simulations, and publish marketing copy.

---

## Architecture Overview

The MCP server runs as a standalone Python process and acts as a protocol bridge:

```
+------------------+                   +----------------------+                   +---------------------+
|   MCP Client     |   stdin/stdout    | AgentMark MCP Server |   HTTP Rest API   |  AgentMark Backend  |
|  (Claude/Cursor) | <===============> |  (this application)  | <===============> |    (Node/Express)   |
+------------------+                   +----------------------+                   +---------------------+
```

* **No direct DB connections:** The MCP server communicates strictly over HTTPS with the backend, preserving authorization policies and rate limit scopes.
* **Synchronous Polling Wrapper:** Since AgentMark's multi-agent LangGraph workflow runs asynchronously in the background (typically taking 2–4 minutes), the MCP server wraps these runs in a synchronous polling loop to deliver finalized briefs back inline to the chat client.

---

## Available Tools

1. **`generate_campaign`**: Triggers a complete multi-channel marketing campaign generation. Exposes parameters for project context, target audience, brand voice, and optional LLM provider API key overrides.
2. **`run_focus_group`**: Simulates target audience persona responses. Evaluates generated creative copy and returns critiques, click intent, verdicts, and actionable recommendations.
3. **`publish_to_channel`**: Submits campaign approval and triggers the Publisher agent to finalize publication schedules and formatted copies.

---

## Installation & Configuration

### Prerequisites
* Python `>= 3.10`
* A running AgentMark instance (`http://localhost:5000` or hosted)
* A valid User JWT token (for `AGENTMARK_API_KEY`)

---

### Integration: Claude Desktop

Add the server configuration to your `claude_desktop_config.json`:

* **MacOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows:** `%APPDATA%\Rationality\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "agentmark": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "E:/AgentMark/AgentMark/agentmark-mcp-server",
        "agentmark-mcp-server"
      ],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5000",
        "AGENTMARK_API_KEY": "YOUR_JWT_BEARER_TOKEN_HERE"
      }
    }
  }
}
```

*Note: Replace `YOUR_JWT_BEARER_TOKEN_HERE` with the token copied from your web browser developer console (localStorage/network headers) when logged into AgentMark.*

---

### Integration: Cursor IDE

1. Go to **Settings** > **Features** > **MCP**.
2. Click **+ Add New MCP Server**.
3. Fill in the details:
   * **Name:** `AgentMark`
   * **Type:** `command`
   * **Command:** `uv run --directory E:/AgentMark/AgentMark/agentmark-mcp-server agentmark-mcp-server`
4. Under environment variables, add:
   * `AGENTMARK_API_URL`: `http://localhost:5000`
   * `AGENTMARK_API_KEY`: `YOUR_JWT_BEARER_TOKEN_HERE`

---

## Local Development & Testing

You can use the MCP CLI tools to test the server configuration locally.

#### 1. Setup Environment
```bash
cd agentmark-mcp-server
uv venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
uv pip install -e .
```

#### 2. Run MCP Inspector (Interactive Debugger)
```bash
export AGENTMARK_API_URL="http://localhost:5000"
export AGENTMARK_API_KEY="YOUR_JWT_BEARER_TOKEN_HERE"

npx @modelcontextprotocol/inspector uv run --directory E:/AgentMark/AgentMark/agentmark-mcp-server agentmark-mcp-server
```
This launches a local web interface on `http://localhost:3000` where you can manually run and audit every tool.
