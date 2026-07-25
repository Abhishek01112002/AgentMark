# AgentMark: Complete Project Architecture & Multi-Agent Workflow Guide

This document is designed to give an AI assistant (like Claude) a comprehensive, 360-degree understanding of the **AgentMark** codebase. It covers the project's core use case, system architecture, tech stack, directory structure, file-by-file logic, multi-agent workflow (LangGraph), and communication protocols.

---

## 1. Project Overview & Use Case

**AgentMark** is an AI-powered, enterprise-grade **Multi-Agent Marketing Campaign Generator**. It automates the entire lifecycle of creating a marketing campaign—from initial market research and strategy formulation to copywriting, visual asset prompting, quality assurance, human-in-the-loop review, and publishing.

### Core Use Case
Instead of a human marketing team spending weeks conducting research, brainstorming strategies, writing copy, and planning schedules, a user inputs a simple **Campaign Brief** (target product, audience, budget, objectives). AgentMark's network of specialized AI agents collaborates in a stateful workflow to deliver a complete, reviewable, and ready-to-publish marketing campaign in minutes.

---

## 2. Directory Structure & Key Files

Below is the directory mapping of the key files and folders in the project:

```
AgentMark/
├── ai-service/                         # Python AI Service (LangGraph)
│   ├── agents/                         # Agent definitions and prompt execution
│   │   ├── copywriter.py
│   │   ├── human_approval.py           # Handles HITL pausing logic
│   │   ├── image_prompt.py
│   │   ├── manager.py                  # Coordinates routing instructions
│   │   ├── publisher.py                # Finalizes content calendar
│   │   ├── research.py
│   │   ├── reviewer.py                 # Evaluates quality scores
│   │   ├── state.py                    # CampaignState definition
│   │   └── strategy.py
│   ├── api/
│   │   ├── dependencies.py
│   │   └── routes/
│   │       └── campaigns.py            # FastAPI endpoints for triggering/resuming graph
│   ├── llm/                            # LLM API Client implementations
│   │   ├── base.py
│   │   ├── factory.py                  # Client provider (Gemini, OpenAI, Groq)
│   │   ├── gemini_client.py
│   │   ├── groq_client.py
│   │   └── openai_client.py
│   ├── schemas/                        # Pydantic Schemas
│   │   ├── agent_outputs.py            # Output structure schemas for all agents
│   │   └── websocket.py
│   ├── utils/
│   │   ├── logger.py                   # Centralized file and console logger
│   │   └── prompts/                    # Raw text prompt templates
│   │       ├── copywriter_prompt.txt
│   │       ├── image_prompt.txt
│   │       ├── publisher_prompt.txt
│   │       ├── research_prompt.txt
│   │       └── strategy_prompt.txt
│   ├── workflow/
│   │   ├── graph.py                    # LangGraph configuration and node assembly
│   │   └── routing.py                  # Score-based and HITL conditional routing logic
│   ├── run.py                          # Starts the FastAPI server
│   └── requirements.txt
│
├── agentmark-mcp-server/                # Model Context Protocol (MCP) Integration
│   ├── pyproject.toml
│   └── src/agentmark_mcp/
│       ├── server.py                   # FastMCP server definition & tool registration
│       ├── client.py                   # HTTP Client for Express backend communication
│       └── tools/                      # Tool modules (campaign, focus_group, project, publish, revision)
│
├── backend/                            # Node.js Express Server
│   ├── prisma/
│   │   └── schema.prisma               # PostgreSQL Prisma Schema & Database models
│   ├── src/
│   │   ├── index.ts                    # Express app setup, Prisma DB & Socket.io initialization
│   │   ├── db.ts                       # Prisma Client singleton
│   │   ├── modules/
│   │   │   ├── campaigns/              # Campaign management, status transitions, revision reset
│   │   │   ├── developer/              # API key verification & Claude Desktop connect flow
│   │   │   ├── focus-group/            # Synthetic persona factory & interview Q&A
│   │   │   └── notifications/
│   │   └── utils/
│   │       ├── ai-client.ts            # REST client for Python AI service (Port 5002)
│   │       ├── redis-subscriber.ts     # ioredis Pub/Sub listener for real-time campaign status
│   │       └── redis.ts                # Shared ioredis connection client
│   └── package.json
│
└── frontend/                           # React Client Application
    ├── src/
    │   ├── components/
    │   │   ├── pages/
    │   │   │   ├── campaign/
    │   │   │   │   └── newCampaign/
    │   │   │   │       ├── NewCampaignPage.tsx # Brief configuration form
    │   │   │   │       └── campaignLive/
    │   │   │   │           ├── CampaignLivePage.tsx # Live workflow visualizer
    │   │   │   │           └── campaignResult/
    │   │   │   │               ├── CampaignResultPage.tsx # Main dashboard for results
    │   │   │   │               ├── copywriter/CopywriterContent.tsx
    │   │   │   │               ├── publisher/PublisherContent.tsx
    │   │   │   │               ├── review/ReviewContent.tsx
    │   │   │   │               ├── strategy/StrategyContent.tsx
    │   │   │   │               └── visuals/VisualsContent.tsx
    │   │   │   └── dashboard/DashboardPage.tsx
    │   ├── services/
    │   │   └── notifications.service.ts
    │   └── utils/
    │       └── formatDate.ts           # Standardized date formatting helper
```

---

## 3. System Architecture & Tech Stack

```
┌────────────────────────────────────────────────────────┐
│                      FRONTEND                          │
│        React 18 + TypeScript + Vite + Custom CSS       │
└───────────┬──────────────────────────────▲─────────────┘
            │ HTTP (REST API)              │ WebSockets (Live Progress)
┌───────────▼──────────────────────────────┴─────────────┐
│                      BACKEND                           │
│  Node.js + Express + TypeScript + PostgreSQL (Prisma)  │
└───────────┬──────────────────────────────▲─────────────┘
            │ HTTP (Trigger Workflow)      │ Redis Pub/Sub (Live Events)
┌───────────▼──────────────────────────────┴─────────────┐
│                    AI-SERVICE                          │
│  Python 3.12 + FastAPI + LangGraph + LangChain         │
└────────────────────────────────────────────────────────┘
```

### 1. Frontend (`/frontend`)
*   **Tech Stack:** React 18, TypeScript, Vite, React Router.
*   **Purpose:** The user interface. Allows users to create projects, configure campaign briefs, monitor the live generation process via progress steps, review agent outputs, provide revision feedback, and view the final generated campaign assets.

### 2. Backend (`/backend`)
*   **Tech Stack:** Node.js, Express, TypeScript, PostgreSQL (via Prisma ORM), Redis (ioredis), Socket.IO.
*   **Purpose:** The orchestrator and data store. Manages user authentication (JWT & Developer API Keys), project/campaign metadata, stores generated campaign states and persona interviews in PostgreSQL, manages WebSocket connections to the frontend for real-time updates, and triggers the Python AI service.

### 3. AI Service (`/ai-service`)
*   **Tech Stack:** Python 3.12, FastAPI, LangGraph (for stateful orchestration), LangChain, Pydantic (for structured outputs), Redis (for event publishing).
*   **Purpose:** The brain of the application. Executes the multi-agent state machine, calls LLMs (OpenAI, Gemini, Groq), processes agent logic, and publishes live execution events.

### 4. MCP Server (`/agentmark-mcp-server`)
*   **Tech Stack:** Python 3.12, FastMCP SDK, HTTPX.
*   **Purpose:** Exposes AgentMark capabilities to AI desktop environments (such as Claude Desktop) via the Model Context Protocol (MCP), providing 5 tool suites for campaign management, focus group simulations, asset publishing, and revision resets.

---

## 4. LangGraph Workflow & State Engine

The Python AI service uses **LangGraph** in `ai-service/workflow/graph.py` to coordinate the agents. It operates as a stateful graph where each node represents an agent's task.

### 1. State Management (`CampaignState`)
The state object is shared across all nodes and is defined in `ai-service/agents/state.py`:
```python
class CampaignState(BaseModel):
    campaign_id: str
    product_name: str
    target_audience: str
    budget: float
    objectives: str
    
    # Agent outputs accumulated throughout the run
    research_data: Optional[Dict] = None
    strategy_data: Optional[Dict] = None
    copywriting_data: Optional[Dict] = None
    image_prompt_data: Optional[Dict] = None
    review_data: Optional[Dict] = None
    content_calendar: Optional[Dict] = None
    
    # HITL (Human-In-The-Loop) state variables
    human_approval_status: Optional[str] = None  # "approved" | "rejected" | "pending"
    human_feedback: Optional[str] = None
    human_revision_target: Optional[str] = None  # E.g., "copywriter", "strategy"
    
    # System metadata
    revisions_count: Dict[str, int] = {}  # Tracks revision cycles per agent
    current_agent: Optional[str] = None
    error: Optional[str] = None
```

### 2. Live Flow & Conditional Routing Logic (`ai-service/workflow/routing.py`)
The routing logic determines the flow of the campaign based on the Reviewer's scores and the human user's decisions:

*   **AI Quality Gate (`should_continue`):**
    After the `Reviewer` node executes, `routing.py:should_continue()` checks the quality scores. If any score (Research, Strategy, Copy, Image) falls below **75**, and the specific agent's revision count is less than `MAX_REVISIONS = 3`, the workflow routes back to that agent.
    ```python
    # Example logic snippet from routing.py
    if any_score_low and revisions_count[failed_agent] < 3:
        state.revisions_count[failed_agent] += 1
        return f"revise_{failed_agent}"
    ```
*   **Human Approval Gate (`should_continue_after_human`):**
    If quality scores are met (or max revisions reached), the workflow enters the `human_approval` node and pauses. Once the user submits feedback via the frontend:
    *   If `human_approval_status == "approved"`: The workflow routes to the `publisher` node.
    *   If `human_approval_status == "rejected"`: The workflow routes back to the agent specified in `human_revision_target` (e.g., "copywriter") along with the user's feedback notes.

---

## 5. Detailed Agent Logic & Schemas

Each agent uses **Pydantic** models to guarantee structured, type-safe outputs from the LLMs. These are defined in `ai-service/schemas/agent_outputs.py`.

### 1. Research Agent (`research.py`)
*   **Input:** Campaign Brief (`product_name`, `target_audience`, `objectives`).
*   **Prompt:** `research_prompt.txt` guides the LLM to perform market analysis.
*   **Output Schema (`ResearchOutput`):**
    *   `target_personas`: Detailed profiles of target customers (demographics, pain points, motivations).
    *   `competitor_analysis`: Competitor names, strengths, weaknesses, and market positioning.
    *   `market_trends`: Current trends affecting the product.

### 2. Strategy Agent (`strategy.py`)
*   **Input:** Brief + `research_data`.
*   **Prompt:** `strategy_prompt.txt` guides the LLM to formulate a plan.
*   **Output Schema (`StrategyOutput`):**
    *   `positioning_statement`: Core value proposition.
    *   `channels`: List of selected channels (e.g., Instagram, Email, Google Ads).
    *   `budget_allocation`: Percentage of total budget assigned to each channel.
    *   `kpis`: Key Performance Indicators to track.

### 3. Copywriter Agent (`copywriter.py`)
*   **Input:** Brief + `strategy_data`.
*   **Prompt:** `copywriter_prompt.txt`.
*   **Output Schema (`CopywritingOutput`):**
    *   `deliverables`: A list of content pieces. Each piece has:
        *   `channel`: Target channel (e.g., "Facebook").
        *   `headline`: Attention-grabbing headline.
        *   `body_text`: Body copy.
        *   `cta`: Call to Action.

### 4. Image Prompt Agent (`image_prompt.py`)
*   **Input:** Brief + `copywriting_data`.
*   **Prompt:** `image_prompt.txt` guides the LLM to translate copy into visual concepts.
*   **Output Schema (`ImagePromptOutput`):**
    *   `prompts`: A list of visual assets. Each has:
        *   `channel`: Target channel.
        *   `visual_description`: What the image should depict.
        *   `ai_image_prompt`: Highly optimized prompt for DALL-E 3/Midjourney containing style, lighting, composition, and aspect ratio details.

### 5. Reviewer Agent (`reviewer.py`)
*   **Input:** Accumulation of all deliverables.
*   **Output Schema (`ReviewOutput`):**
    *   `research_review`: Score (0-100) + feedback comments.
    *   `strategy_review`: Score (0-100) + feedback comments.
    *   `copy_review`: Score (0-100) + feedback comments.
    *   `image_review`: Score (0-100) + feedback comments.
    *   `overall_score`: Average rating.
    *   `approved`: Boolean indicating if the campaign meets the minimum threshold.

### 6. Publisher Agent (`publisher.py`)
*   **Input:** Approved deliverables.
*   **Prompt:** `publisher_prompt.txt`.
*   **Output Schema (`ContentCalendar`):**
    *   `schedule`: Weekly timeline mapping out when and where each creative asset (copy + image prompt) should be published.

---

## 6. Express Backend & Python Bridge

The Node.js server (`backend/src/`) manages authentication, database storage, and acts as the bridge between the frontend React application and the Python AI service.

### 1. Database Model (`backend/prisma/schema.prisma`)
We store the campaign state in PostgreSQL using Prisma ORM. The `Campaign` model in `backend/prisma/schema.prisma` maps to PostgreSQL and stores brief inputs, execution status, all 7 agent outputs (stored in `aiOutputs` JSON), HITL feedback, and revision budget counters:
```prisma
model Campaign {
  id              String   @id @default(uuid())
  name            String
  brandName       String?
  industry        String
  primaryGoal     String
  targetAudience  String   @db.Text
  brandVoice      String
  
  status          String   @default("draft")
  reviewScore     Float?   // AI review agent score (0-100)
  reviewOutput    String?  @db.Text
  
  // AI Service Integration
  aiCampaignId    String?  // FastAPI campaign ID
  aiOutputs       Json?    // All 7 agent outputs (manager, research, strategy, copy, image, review, publisher)
  aiError         String?  @db.Text
  
  // HITL (Human-In-The-Loop) Fields & Revision Counters
  researchRevisionCount  Int?     @default(0)
  strategyRevisionCount  Int?     @default(0)
  copyRevisionCount      Int?     @default(0)
  imageRevisionCount     Int?     @default(0)
  humanApprovalStatus    String?  // 'pending', 'approved', 'rejected'
  humanFeedback          String?  @db.Text
  humanRevisionTarget    String?  // 'research', 'strategy', 'copywriter', 'image_prompt'
  
  additionalInfo  String?  @db.Text
  
  projectId       String
  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@map("campaigns")
  @@index([projectId])
  @@index([status])
}
```

### 2. Python Bridge (`ai-client.ts` & `redis-subscriber.ts`)
The Express server communicates with the Python service using two mechanisms:
*   **REST API Requests (`ai-client.ts`):** Express sends POST/GET requests to the Python service running at `http://127.0.0.1:5002` (e.g. `/api/campaign/generate` or `/focus-group/interview`).
*   **Redis Event Streaming & Persistence (`redis-subscriber.ts`):** The Python service publishes live progress events over Redis. `redis-subscriber.ts` subscribes to pattern `campaign:*` using `ioredis`, writes terminal state updates sequentially to PostgreSQL via Prisma, and broadcasts real-time progress events to connected React clients via Socket.IO:
    ```typescript
    import Redis from 'ioredis';
    import type { Server } from 'socket.io';
    import prisma from '../db';

    const subClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

    export function initRedisSubscriber(io: Server) {
      subClient.psubscribe('campaign:*', (err) => {
        if (err) console.error('[RedisSubscriber] Failed to psubscribe:', err);
      });

      subClient.on('pmessage', async (pattern, channel, message) => {
        const payload = JSON.parse(message);
        const campaignId = channel.replace('campaign:', '');

        // Sequential DB write queue updates Prisma PostgreSQL state
        dbWriteQueue.add(async () => {
          await updateCampaignInDb(campaignId, payload);
        });

        // Broadcast progress update to room subscribers via Socket.IO
        io.to(campaignId).emit('campaign_update', payload);
      });
    }
    ```

---

## 7. Frontend Rendering & User Experience

The React frontend (`frontend/src/`) provides a clean dashboard to track generation and review results.

### 1. Live Progress Visualization (`CampaignLivePage.tsx`)
Connects to the backend WebSocket server using `socket.io-client`. It joins a room dedicated to the `campaignId`. As events arrive, it updates a multi-step stepper representing the agents (Research -> Strategy -> Copywriter -> Visuals -> Reviewer).

### 2. Tabbed Result Dashboard (`CampaignResultPage.tsx`)
Once the campaign generation is complete or pauses for review, the UI presents the data across dedicated tabs:
*   **Research Tab (`ResearchContent.tsx`):** Renders target buyer personas and competitor grids.
*   **Strategy Tab (`StrategyContent.tsx`):** Displays budget allocation using charts and details the KPI objectives.
*   **Copywriter Tab (`CopywriterContent.tsx`):** Shows card layouts containing headlines, body text, and call-to-actions for every generated channel.
*   **Visuals Tab (`VisualsContent.tsx`):** Lists the generated visual prompts, optimized for copy-pasting into Midjourney/DALL-E.
*   **Review Tab (`ReviewContent.tsx`):** Shows the scores and feedback from the AI Reviewer. If the status is `pending_human_review`, it displays an interactive form allowing the user to either approve the campaign or request a revision targeting a specific agent.

---

## 8. Development & Safety Standards

*   **Structured Logging:** All print statements in the core business logic of the Python service have been refactored to use `logging.getLogger(__name__)`. This ensures that logs can be directed to external monitoring tools and are cleanly structured in `logs/ai_service.log`.
*   **Exception Safety:** Every LLM client (`GeminiClient`, `OpenAIClient`, `GroqClient`) includes fallback mechanisms. If an API key is missing or a rate limit is hit, the application logs a detailed traceback and falls back to safe mock structures rather than crashing the active LangGraph thread.
*   **Code Hygiene:** Unused components, dead variables, and redundant exports have been completely purged from both the React frontend and Express backend.
