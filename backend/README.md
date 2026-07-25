# AgentMark Backend

> Node.js + Express + Prisma + PostgreSQL + Redis + Socket.IO

The Express backend is the central orchestration hub for AgentMark. It handles authentication, campaign lifecycle management, real-time event routing (Redis → Socket.IO), Developer API key management, and the internal bridge to the Python AI Service.

---

## Ports

| Service | Default Port |
|---|---|
| Express HTTP server | `5003` |
| Socket.IO (same process) | `5003` |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database (creates tables if they don't exist)
npx prisma db push

# 5. Start development server with hot-reload
npm run dev
```

Verify: `curl http://localhost:5003/health` → `{"status":"ok"}`

---

## Environment Variables

Copy `.env.example` to `.env` and set the following:

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | HTTP port (default: `5003`) |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | **Strong random string** — signs/verifies JWTs. Min 64 chars. |
| `NODE_ENV` | Yes | Set to `production` for deployments |
| `AI_SERVICE_URL` | Yes | URL of the Python AI Service (default: `http://127.0.0.1:5002`) |
| `INTERNAL_SERVICE_SECRET` | Yes | **Strong random string** — shared secret for backend↔AI service auth. Must match `ai-service/.env`. |
| `GEMINI_API_KEY` | No | System-level Gemini key (user-provided keys take precedence) |
| `GROQ_API_KEY` | No | System-level Groq key |
| `TAVILY_API_KEY` | No | System-level Tavily search key |
| `IMAGEKIT_URL_ENDPOINT` | No | ImageKit CDN endpoint |
| `IMAGEKIT_PUBLIC_KEY` | No | ImageKit public key |
| `IMAGEKIT_PRIVATE_KEY` | No | ImageKit private key (server-side only) |
| `REDIS_HOST` | Yes | Redis host (default: `localhost`) |
| `REDIS_PORT` | Yes | Redis port (default: `6379`) |
| `FRONTEND_URL` | Yes | Allowed CORS origin for Socket.IO (e.g., `http://localhost:5173`) |

> **Generate secrets:** `openssl rand -hex 32`

---

## Project Structure

```
src/
├── index.ts                          # Server entry point, graceful shutdown
├── db.ts                             # Prisma client singleton
│
├── middlewares/
│   ├── auth.middleware.ts            # Dual-mode: JWT Bearer + Developer API Key
│   ├── mcp-logger.middleware.ts      # Logs MCP tool invocations to McpActivity table
│   └── rate-limit.middleware.ts      # Express rate limiter for sensitive endpoints
│
├── modules/
│   ├── auth/                         # POST /api/auth/signup, /login, /me, /logout
│   ├── campaigns/                    # Full campaign CRUD + AI orchestration + HITL
│   │   ├── campaign.controller.ts    # Background AI runner, variant generation, HITL
│   │   ├── campaign.service.ts       # DB operations + memory snapshot writes
│   │   └── campaign.routes.ts        # Route definitions
│   ├── developer/                    # API key lifecycle + Claude Desktop SSE flow
│   │   ├── developer.controller.ts   # Key creation, listing, revocation, Claude flow
│   │   └── developer.routes.ts       # JWT-only key management routes
│   ├── focus-group/                  # Synthetic focus group proxy + auth guard
│   ├── imagekit/                     # ImageKit auth token endpoint
│   ├── notifications/                # Notification CRUD + real-time delivery
│   └── projects/                     # Project CRUD + memory status
│
└── utils/
    ├── ai-client.ts                  # HTTP client for AI Service (10-min timeout)
    ├── redis-subscriber.ts           # Redis psubscribe('campaign:*') → Socket.IO bridge
    ├── jwt.ts                        # JWT sign/verify helpers
    └── password.ts                   # bcrypt hash + compare
```

---

## Database Schema (Prisma)

| Model | Key Fields |
|---|---|
| `User` | `id`, `email` (unique), `password` (bcrypt), `avatarUrl` |
| `Project` | `id`, `userId`, `name`, `description`, `status` |
| `Campaign` | `id`, `projectId`, `status`, `aiOutputs` (JSON), HITL fields, revision counts, review score |
| `Notification` | `id`, `userId`, `type`, `title`, `message`, `isRead` |
| `CampaignMemorySnapshot` | `id`, `projectId`, `campaignId`, approval flags, tones, channels used |
| `ApiKey` | `id`, `userId`, `keyHash` (SHA-256), `label`, `isActive`, `lastUsedAt` |
| `McpActivity` | `id`, `userId`, `toolName`, `campaignId`, `metadata` |

---

## Authentication

The backend supports two authentication modes, both handled by `auth.middleware.ts`:

### Mode 1 — JWT Session (Web App)
- Client sends `Authorization: Bearer <jwt_token>`
- JWT is verified against `JWT_SECRET`
- Sets `req.authMethod = 'jwt'`

### Mode 2 — Developer API Key (MCP / Programmatic)
- Client sends `Authorization: Bearer am_<hex>`
- Token is SHA-256 hashed and looked up in the `api_keys` table
- Sets `req.authMethod = 'api_key'`

**Security boundary:** Key management routes (`POST/GET/DELETE /api/developer/keys`) require JWT authentication only (`jwtOnly` middleware in `developer.routes.ts`). A leaked API key cannot create or revoke other keys.

---

## Key API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create account |
| POST | `/api/auth/login` | Public | Get JWT token |
| GET | `/api/auth/me` | JWT/Key | Current user info |
| GET | `/api/projects` | JWT/Key | List user projects |
| POST | `/api/projects` | JWT/Key | Create project |
| GET | `/api/campaigns` | JWT/Key | List campaigns |
| POST | `/api/campaigns` | JWT/Key | Create + launch campaign |
| POST | `/api/campaigns/:id/approve` | JWT/Key | Approve HITL gate |
| POST | `/api/campaigns/:id/reject` | JWT/Key | Reject + request revision |
| POST | `/api/campaigns/:id/generate-copy-variant` | JWT/Key | Generate copy variant for channel |
| POST | `/api/focus-group/simulate` | JWT/Key | Run synthetic focus group simulation |
| POST | `/api/focus-group/interview` | JWT/Key | Ask focus group panel a custom question |
| GET | `/api/focus-group/personas` | JWT/Key | List available personas |
| POST | `/api/developer/keys` | **JWT only** | Generate Developer API key |
| GET | `/api/developer/keys` | **JWT only** | List API keys |
| DELETE | `/api/developer/keys/:id` | **JWT only** | Revoke API key |
| GET | `/api/developer/claude-connect-flow` | JWT | SSE stream for Claude Desktop setup |
| GET | `/health` | Public | Health check |

---

## Available npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Development server with `ts-node` hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run Jest test suite |

---

## Redis Architecture

Two Redis connections are maintained:

1. **Redis subscriber** (`redis-subscriber.ts`) — uses `psubscribe('campaign:*')` to receive events from the AI Service. Forwards progress to Socket.IO rooms, and queues terminal DB writes via a `PromiseQueue` to prevent race conditions.

2. **Redis publisher** (via `ioredis` in AI Service) — AI agent nodes publish `AgentUpdatePayload` JSON to `campaign:{id}` channels.

Socket.IO rooms:
- `campaign:{id}` — campaign-specific progress events
- `user:{id}` — user-specific notifications (MCP activity, etc.)
