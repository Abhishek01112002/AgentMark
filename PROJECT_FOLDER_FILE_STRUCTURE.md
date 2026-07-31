# AgentMark Repository Directory & File Structure

This document provides a complete and accurate reference tree of the **AgentMark** repository.

```
AgentMark/
├── agentmark-mcp-server/                   # Python Model Context Protocol (MCP) Server
│   ├── pyproject.toml                      # FastMCP server configuration & dependencies
│   ├── run_audit.py                        # Audit runner for MCP server
│   ├── test_audit.py                       # Test script to verify registered tools
│   ├── src/
│   │   └── agentmark_mcp/
│   │       ├── client.py                   # Async HTTP client calling Express backend API
│   │       ├── server.py                   # FastMCP server & tool registrations (6 tools)
│   │       ├── session_status.py           # Session status evidence writer
│   │       ├── formatters/
│   │       │   └── hook_formatter.py       # Hook formatting utilities
│   │       └── tools/                      # MCP tool implementations
│   │           ├── campaign.py             # generate_campaign tool
│   │           ├── extended.py             # create_project & publish_to_channel tools
│   │           ├── focus_group.py          # run_focus_group tool
│   │           └── revision.py             # revise_copy_with_feedback & get_campaign_status tools
│   └── tests/
│       ├── test_client.py                  # MCP client unit tests
│       ├── test_server.py                  # MCP tool integration tests
│       └── test_session_state_machine.py   # State machine tests
│
├── ai-service/                             # Python FastAPI AI Service (LangGraph Engine)
│   ├── main.py                             # FastAPI app factory, CORS & lifespan startup hook
│   ├── run.py                              # Uvicorn server entry point (Port 5002)
│   ├── pyproject.toml                      # Dependencies & pytest configuration
│   ├── requirements.txt                    # Pip dependencies
│   ├── version.py                          # Service version definition
│   ├── ADR.md                              # Architecture Decision Records
│   ├── ARCHITECTURE_PRINCIPLES.md          # Design principles & invariants
│   ├── agents/                             # LangGraph Agent Nodes
│   │   ├── copywriter.py                   # Multi-channel copy generator
│   │   ├── creative_hook_matrix.py         # Viral hook matrix generator (feature-flagged)
│   │   ├── devils_advocate.py              # Adversarial critique generator
│   │   ├── evaluator.py                    # Independent evaluator for quality gates
│   │   ├── focus_group.py                  # Synthetic persona focus group simulation
│   │   ├── human_approval.py               # HITL approval gate node
│   │   ├── image_prompt.py                 # Visual art prompt generator
│   │   ├── manager.py                      # Workflow orchestrator & coordinator
│   │   ├── persona_composer.py             # Persona composition helper
│   │   ├── publisher.py                    # Distribution planner & content calendar
│   │   ├── research.py                     # LiteRAG market research (Tavily search)
│   │   ├── reviewer.py                     # Quality scoring & compliance check
│   │   ├── state.py                        # Shared CampaignState TypedDict definition
│   │   ├── strategy.py                     # Positioning & messaging strategy
│   │   └── trust_analyzer.py               # Copy trust signal analyzer
│   ├── api/                                # FastAPI Routes & Guards
│   │   ├── dependencies.py                 # INTERNAL_SERVICE_SECRET header verification
│   │   └── routes/
│   │       ├── campaigns.py                # Workflow creation, variant & prompt enhancer endpoints
│   │       └── health.py                   # Health check endpoint
│   ├── config/                             # App Configuration
│   │   ├── emos_config.py                  # EMOS system configuration
│   │   └── settings.py                     # Environment variable loader
│   ├── domain/                             # Core Domain Models
│   │   └── campaign_context.py             # Immutable Campaign Context model
│   ├── llm/                                # Multi-Provider LLM Clients
│   │   ├── gemini_client.py                # Google Gemini client
│   │   ├── groq_client.py                  # Groq (Llama 3.3-70b) client
│   │   └── openai_client.py                # OpenAI (GPT-4o) client
│   ├── persona_templates/                  # Demographic & Psychographic Persona Specs
│   ├── routers/
│   │   └── focus_group_router.py           # Focus group simulation & Q&A endpoints
│   ├── schemas/                            # Pydantic Output Schemas
│   │   ├── agent_outputs.py                # Output models per agent
│   │   ├── campaign.py                     # Request/Response schemas
│   │   └── simulation.py                   # Focus group report schemas
│   ├── services/
│   │   └── search_service.py               # Tavily search abstraction
│   ├── tests/                              # Unit & integration test suites
│   ├── utils/                              # Utilities (Redis publisher, telemetry, sanitizers)
│   │   └── telemetry/                      # OpenTelemetry tracing & diagnostics
│   └── workflow/                           # LangGraph Workflow Assembly
│       ├── context.py                      # Context Contract Builder
│       ├── graph.py                        # LangGraph StateGraph assembly & singleton compilation
│       ├── learning.py                     # Memory decay & learning rules
│       ├── policy.py                       # 4-Tier Layered Policy Engine
│       ├── retrieval.py                    # Hybrid RRF search engine
│       └── routing.py                      # Conditional routing & review thresholds
│
├── backend/                                # Node.js + Express Backend & API Bridge
│   ├── package.json                        # Dependencies & npm scripts
│   ├── tsconfig.json                       # TypeScript compiler options
│   ├── .env.example                        # Template for backend environment variables
│   ├── prisma/
│   │   └── schema.prisma                   # PostgreSQL database models (Prisma)
│   └── src/
│       ├── index.ts                        # Server entry point, Express app & Socket.IO server
│       ├── db.ts                           # Prisma client singleton
│       ├── middlewares/                    # Middlewares
│       │   ├── auth.middleware.ts          # Dual-mode auth (JWT + Developer API Key)
│       │   ├── mcp-logger.middleware.ts    # Logs MCP tool calls to McpActivity table
│       │   └── rate-limit.middleware.ts    # Endpoint rate limiters
│       ├── modules/                        # Feature Modules
│       │   ├── auth/                       # Signup, login, JWT token issuance
│       │   ├── brand-vault/                # Brand Vault events, snapshots & contract endpoints
│       │   ├── campaigns/                  # Campaign CRUD, AI runner, HITL approval & Socket.IO emitter
│       │   ├── developer/                  # Developer API keys & Claude Desktop config auto-installer
│       │   ├── focus-group/                # Focus group proxy & Q&A router
│       │   ├── imagekit/                   # ImageKit CDN auth token endpoint
│       │   ├── notifications/              # Real-time notifications CRUD
│       │   └── projects/                   # Project management & memory status
│       └── utils/                          # Helper utilities
│           ├── ai-client.ts                # HTTP client for Python AI Service
│           ├── claude-config.ts            # Truthful 9-state MCP connection architecture
│           ├── claude-config-resolver.ts   # Configuration path resolver
│           ├── jwt.ts                      # JWT sign/verify
│           ├── learning.ts                 # Memory decay calculation utilities
│           ├── password.ts                 # bcrypt hashing
│           ├── redis-subscriber.ts         # Redis Pub/Sub → Socket.IO bridge
│           ├── retrieval.ts                # Hybrid RRF search helper
│           └── telemetry.ts                # OpenTelemetry backend tracer
│
├── frontend/                               # React 18 + Vite Frontend Application
│   ├── package.json                        # Dependencies & Vite build scripts
│   ├── vite.config.ts                      # Vite configuration & proxy settings
│   ├── tsconfig.json                       # Frontend TypeScript config
│   ├── index.html                          # SPA HTML template
│   ├── .env.example                        # Template for frontend environment variables
│   ├── public/                             # Static assets & tutorial video files
│   │   ├── create_campaign.mp4             # Tutorial video: Launching campaigns
│   │   ├── customize_copy.mp4              # Tutorial video: Reviewing copy
│   │   ├── setup_api_keys.mp4              # Tutorial video: Setting up credentials
│   │   └── visual_studio_bridges.mp4       # Tutorial video: Visual prompt studio
│   └── src/
│       ├── main.tsx                        # React application entry point
│       ├── App.tsx                         # Router definitions & AuthContext provider
│       ├── index.css                       # Global CSS design system (HSL custom properties)
│       ├── contexts/
│       │   └── AuthContext.tsx             # Auth state, login/logout, JWT token storage
│       ├── services/
│       │   ├── api.ts                      # Axios HTTP client, headers & Brand Vault API
│       │   ├── llmSettings.ts              # Local storage manager for API keys
│       │   └── notifications.service.ts    # Real-time notifications service
│       ├── types/
│       │   └── emos.ts                     # EMOS contract interfaces & types
│       └── components/
│           ├── shared/                     # Reusable UI components
│           │   ├── sidebar/Sidebar.tsx     # Navigation sidebar
│           │   └── topNav/TopNav.tsx       # Top navigation bar & notification bell
│           └── pages/                      # Page routes
│               ├── campaign/               # Campaign creation, live runner & multi-tab results
│               ├── dashboard/              # Project & campaign overview dashboard
│               ├── docs/                   # In-app documentation (DocsPage.tsx)
│               ├── history/                # Searchable campaign history list
│               ├── landingPage/            # Marketing landing page
│               ├── login/ & signup/        # Authentication forms
│               ├── memoryHub/              # Brand memory analytics
│               ├── projects/               # Project management views
│               ├── settings/               # API key settings & MCP 1-click installer
│               └── support/                # Support center, FAQs & video modal (Support.tsx)
│
├── run_all_tests.ps1                       # Power-Shell runner for all test suites
├── start-agentmark.bat                     # One-click Windows startup script
├── default_personas.json                   # Default persona definitions for focus group
├── .gitignore                              # Git exclusion rules
└── README.md                               # Root project documentation
```
