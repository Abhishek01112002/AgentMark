# AgentMark Frontend

> React 18 + TypeScript + Vite + Socket.IO + Custom CSS Design System

The AgentMark frontend is a single-page application providing the complete user interface for campaign management, real-time agent progress monitoring, focus group simulation, Memory Hub analytics, and Claude Desktop MCP integration.

---

## Port

| Service | Default Port |
|---|---|
| Vite Dev Server | `5173` |

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env

# 3. Start development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables

Copy `.env.example` to `.env`:

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | Yes | Base URL of the Express backend (e.g., `http://localhost:5003`) |
| `VITE_SOCKET_URL` | Yes | Socket.IO server URL — usually the same as `VITE_API_URL` |
| `VITE_EMOS_BRAND_VAULT_ENABLED` | Conditional | Set to `true` to enable EMOS v9 Brand Vault API & Evaluator Surface |

---

## Project Structure

```
src/
├── main.tsx                          # React entry point
├── App.tsx                           # Router + AuthContext provider
├── index.css                         # Global CSS design system (HSL custom properties)
│
├── contexts/
│   └── AuthContext.tsx               # Authentication state + token management
│
├── services/
│   ├── api.ts                        # Axios HTTP client + request interceptors
│   └── llmSettings.ts                # LLM API key local storage management
│
└── components/
    ├── shared/
    │   ├── sidebar/Sidebar.tsx        # Collapsible navigation sidebar
    │   └── topNav/TopNav.tsx          # Page title + notification bell
    │
    └── pages/
        ├── landingPage/              # Public marketing landing page
        ├── login/                    # Login form
        ├── signup/                   # Registration form
        ├── dashboard/                # Project overview + campaign stats
        ├── projects/                 # Project list + project detail
        ├── campaign/                 # Campaign detail view:
        │   │                         #   - Live agent progress panel (Socket.IO)
        │   │                         #   - Copywriter tab (copy variants per channel)
        │   │                         #   - Visuals tab (image prompts + studio bridges)
        │   │                         #   - Research tab
        │   │                         #   - Strategy tab
        │   │                         #   - Focus Group tab (persona simulation)
        │   │                         #   - Review tab (agent scores + HITL approval)
        │   │                         #   - Publisher tab (distribution plan)
        │   └── ...
        ├── history/                  # Searchable campaign history
        ├── memoryHub/                # Brand memory analytics + campaign timeline
        ├── settings/                 # API key config + Claude Desktop integration
        ├── docs/                     # In-app documentation (DocsPage.tsx)
        └── support/                  # FAQ + video tutorial lightbox (Support.tsx)
```

---

## Design System

The design system is defined entirely in `src/index.css` using CSS custom properties (HSL tokens). There is no Tailwind or external CSS framework — all styling uses the custom token system.

**Key design tokens:**
```css
--color-primary: hsl(239, 84%, 67%);      /* Indigo — primary actions */
--color-secondary: hsl(161, 70%, 58%);    /* Emerald — success states */
--color-bg: hsl(240, 12%, 8%);            /* Near-black background */
--color-surface: hsl(240, 10%, 10%);      /* Card surfaces */
--color-border: hsl(240, 8%, 18%);        /* Subtle borders */
--color-text-primary: hsl(240, 10%, 95%); /* Body text */
--color-text-muted: hsl(240, 5%, 55%);    /* Secondary text */
```

**Typography:**
- **Sora** — headings and UI text
- **JetBrains Mono** — code, labels, monospace elements
- **Inter** — body fallback

---

## Real-Time Architecture

The frontend maintains a persistent Socket.IO connection to the backend. Campaign progress events flow as:

```
AI Service → Redis (publish) → Backend Redis Subscriber → Socket.IO → Frontend
```

**Socket.IO events the frontend listens to:**

| Event | Payload | Description |
|---|---|---|
| `agent_update` | `{ campaign_id, agent, status, outputs }` | Individual agent progress tick |
| `campaign_complete` | `{ campaign_id, outputs }` | Entire pipeline finished |
| `human_approval_required` | `{ campaign_id, outputs }` | Paused at HITL gate |
| `campaign_failed` | `{ campaign_id, error }` | Pipeline error |
| `focus_group_complete` | `{ campaignId, report, score }` | Focus group simulation done |
| `campaign_data_updated` | `{ campaignId, updatedField }` | Lightweight data refresh signal |
| `mcp_activity` | `{ id, toolName, campaignId }` | New MCP tool invocation logged |

---

## Pages Overview

| Route | Page | Description |
|---|---|---|
| `/` | Landing Page | Public marketing page |
| `/login` | Login | JWT authentication |
| `/signup` | Signup | Account creation |
| `/dashboard` | Dashboard | Project + campaign overview |
| `/projects` | Projects | Project list |
| `/projects/:id` | Project Detail | Campaign list for a project |
| `/campaigns/:id` | Campaign Detail | Full campaign result view + live panel |
| `/history` | History | All campaigns searchable/filterable list |
| `/memory-hub` | Memory Hub | Brand memory analytics |
| `/settings` | Settings | API keys, integrations, Claude Desktop setup |
| `/docs` | Documentation | In-app docs with TOC navigation |
| `/support` | Support | FAQ accordion + video tutorial modal |

---

## npm Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check |
