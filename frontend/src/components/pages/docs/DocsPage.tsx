import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Layers, ShieldCheck, Share2, Brain, PenLine, Image, Globe, Waypoints, Eye, Rocket, Hammer, HelpCircle, Mail, MessageCircle, Code, Cpu, Database, Terminal, RefreshCw, Key } from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import { useEffect, useState, useCallback } from 'react';

interface Section {
  id: string;
  title: string;
  icon: JSX.Element;
  content: JSX.Element;
}

const sections: Section[] = [
  {
    id: 'overview', title: 'System Overview', icon: <Layers size={16} />,
    content: (
      <>
        <p className="lead">AgentMark is an enterprise-grade multi-agent campaign orchestration platform. It replaces manual marketing agency workflows by operating a stateful network of specialized AI agents that execute market research, strategic positioning, copywriting, visual prompting, audience simulation, compliance auditing, and publishing calendar generation in a synchronized pipeline.</p>
        
        <h4>Core Architecture & Distributed Microservices</h4>
        <p>The platform is composed of four decoupled microservices communicating across HTTP REST, WebSockets, and Redis Pub/Sub event streams:</p>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon"><Code size={18} /></div>
            <div>
              <strong>1. React 18 SPA (`:5173`)</strong>
              <span>Vite-powered reactive interface utilizing standard HSL design tokens, custom glassmorphism components, and Socket.IO real-time progress listeners.</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Database size={18} /></div>
            <div>
              <strong>2. Express.js Gateway (`:5003`)</strong>
              <span>Node.js server backed by PostgreSQL (Prisma ORM) and Redis. Handles authentication (JWT + Developer API Keys), session state, Redis Pub/Sub bridging, and client notifications.</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Cpu size={18} /></div>
            <div>
              <strong>3. Python AI Engine (`:5002`)</strong>
              <span>FastAPI service running LangGraph state machines. Features multi-LLM failover (Gemini, GPT-4o, Groq Llama-3.3-70b), Tavily web search, and Pydantic v2 validation. Bound exclusively to internal loopback (`127.0.0.1`).</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><Terminal size={18} /></div>
            <div>
              <strong>4. FastMCP Server</strong>
              <span>Model Context Protocol server enabling local AI desktop assistants (Claude Desktop, Cursor, Windsurf) to trigger campaign creation, focus group simulations, and distribution.</span>
            </div>
          </div>
        </div>

        <h4>Enterprise Platform Guarantees</h4>
        <table>
          <thead>
            <tr><th>Metric / Guarantee</th><th>Specification</th><th>Implementation Detail</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Data Privacy</strong></td><td>Zero-Retention Processing</td><td>Prompts and proprietary market research are never used to train global LLM models. Encrypted at rest via AES-256.</td></tr>
            <tr><td><strong>Pipeline Speed</strong></td><td>45s – 90s Execution</td><td>Async event-driven execution with parallel LLM agent worker pools and distributed Redis caching.</td></tr>
            <tr><td><strong>Reliability</strong></td><td>Self-Healing Resilience</td><td>Automatic LLM fallback hierarchy (Gemini → OpenAI → Groq) with exponential retry policies.</td></tr>
            <tr><td><strong>Security Boundary</strong></td><td>Constant-Time HMAC & Dual Auth</td><td>Inter-service requests authenticated via SHA-256 secret timing-safe comparisons; API keys hashed with SHA-256 at rest.</td></tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'quickstart', title: 'Developer Quick Start', icon: <Rocket size={16} />,
    content: (
      <>
        <p className="lead">Follow this quick step-by-step guide to launch your first end-to-end multi-agent marketing campaign.</p>

        <div className="step-flow">
          <span>Dashboard</span><ChevronRight size={13} />
          <span>New Campaign</span><ChevronRight size={13} />
          <span>Brief Input</span><ChevronRight size={13} />
          <span>Agent Execution</span><ChevronRight size={13} />
          <span>HITL Review</span><ChevronRight size={13} />
          <span>Final Publish</span>
        </div>

        <div className="steps-list">
          <div className="step-item">
            <div className="step-num">1</div>
            <div>
              <strong>Initiate Brief:</strong> Click <strong>New Campaign</strong> from your project dashboard. Assign a campaign title, select the parent project container, and set your target industry sector (e.g., B2B SaaS, E-commerce, FinTech).
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div>
              <strong>Define Target Objectives & Audience:</strong> Describe your ideal customer profile (demographics, pain points, core motivations) and specify primary goal parameters (`awareness`, `lead_gen`, `sales`, or `retention`).
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div>
              <strong>Select Channels & Brand Voice:</strong> Toggle active distribution channels (LinkedIn, X/Twitter, Email, Instagram, Google Ads, SMS) and specify custom tone guidelines (e.g., <em>"Bold, data-backed, authoritative yet approachable"</em>).
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">4</div>
            <div>
              <strong>Trigger Execution Engine:</strong> Click <strong>Launch Campaign</strong>. The backend initiates the LangGraph state machine. You can observe live progress steps in real time via WebSockets on the Campaign Live page.
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">5</div>
            <div>
              <strong>Human-in-the-Loop Review:</strong> Upon pipeline completion, inspect individual outputs across the <strong>Research</strong>, <strong>Strategy</strong>, <strong>Copywriter</strong>, and <strong>Visuals</strong> tabs. Either approve to proceed to publishing or submit targeted feedback for revision.
            </div>
          </div>
        </div>
      </>
    )
  },
  {
    id: 'concepts', title: 'Core Concepts & Lifecycle', icon: <Waypoints size={16} />,
    content: (
      <>
        <div className="concept-cards">
          <div className="concept-card">
            <h4>Projects</h4>
            <p>Isolated workspace containers grouping related campaigns, memory snapshot timelines, learned brand guidelines, and API key metrics.</p>
          </div>
          <div className="concept-card">
            <h4>Campaigns</h4>
            <p>Single execution instances containing stateful agent outputs, copy version histories, simulation records, and review scorecards.</p>
          </div>
          <div className="concept-card">
            <h4>Strategies</h4>
            <p>Reusable agent execution templates (e.g., Product Launch, Always-On Lead Gen, Flash Sale) specifying agent weighting and target KPIs.</p>
          </div>
        </div>

        <h4>Campaign State Machine & Transitions</h4>
        <p>Every campaign traverses a strictly enforced state machine managed in PostgreSQL and Redis:</p>

        <table>
          <thead>
            <tr><th>Status Tag</th><th>Internal Code</th><th>Description & State Behaviors</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><span className="tag tag-blue">Draft</span></td>
              <td><code>draft</code></td>
              <td>Campaign parameters are being configured in the brief editor; no AI resources invoked.</td>
            </tr>
            <tr>
              <td><span className="tag tag-blue">Processing</span></td>
              <td><code>processing</code></td>
              <td>LangGraph pipeline actively running nodes. Socket.IO streams live progress ticks to the UI.</td>
            </tr>
            <tr>
              <td><span className="tag tag-blue">Awaiting Approval</span></td>
              <td><code>awaiting_human_approval</code></td>
              <td>Reviewer agent finished scoring. Workflow is safely suspended at the HITL gate awaiting user interaction.</td>
            </tr>
            <tr>
              <td><span className="tag tag-green">Completed</span></td>
              <td><code>completed</code></td>
              <td>Human reviewer approved outputs. Publisher agent finished calendar schedule generation and outputs are locked.</td>
            </tr>
            <tr>
              <td><span className="tag tag-red">Failed</span></td>
              <td><code>failed</code></td>
              <td>An unrecoverable exception occurred in the agent runner. Error message logged in `aiError`.</td>
            </tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'agents', title: 'Multi-Agent Architecture', icon: <Brain size={16} />,
    content: (
      <>
        <p className="lead">AgentMark deploys seven specialized autonomous agents organized in a sequential, feedback-driven LangGraph workflow graph (`ai-service/workflow/graph.py`). Each agent consumes shared state and outputs structured Pydantic v2 validated JSON.</p>

        <div className="agent-grid">
          <div className="agent-card">
            <div className="agent-icon"><Hammer size={16} /></div>
            <h5>1. Manager Agent (`manager.py`)</h5>
            <p>Analyzes the brief objectives, industry context, and active channels. Formulates the overall orchestration blueprint and initializes execution metrics.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><Globe size={16} /></div>
            <h5>2. Research Agent (`research.py`)</h5>
            <p>Queries Tavily API for real-time competitor intelligence, market trends, and target buyer pain points. Synthesizes web data into structured research context.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><Waypoints size={16} /></div>
            <h5>3. Strategy Agent (`strategy.py`)</h5>
            <p>Constructs core positioning statements, messaging pillars, target audience segmentations, budget channel allocation, and measurable success KPIs.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><PenLine size={16} /></div>
            <h5>4. Copywriter Agent (`copywriter.py`)</h5>
            <p>Generates tailored creative copy variants for each enabled channel (headlines, body copy, CTA buttons, subject lines) following global brand voice rules.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><Image size={16} /></div>
            <h5>5. Image Prompt Agent (`image_prompt.py`)</h5>
            <p>Translates copy themes into detailed visual prompts containing lighting, composition, aspect ratios, and style keywords for DALL-E 3, Midjourney, and Flux.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><Eye size={16} /></div>
            <h5>6. Reviewer Agent (`reviewer.py`)</h5>
            <p>Evaluates outputs across tone consistency, messaging clarity, and policy compliance. Emits a quantitative score (0–100) and detailed critique.</p>
          </div>
          <div className="agent-card">
            <div className="agent-icon"><Share2 size={16} /></div>
            <h5>7. Publisher Agent (`publisher.py`)</h5>
            <p>Triggered post-human approval. Generates an actionable distribution plan, multi-channel publishing calendar, asset checklist, and projected delivery metrics.</p>
          </div>
        </div>

        <h4>Agent Data Flow & Output Contracts</h4>
        <pre className="code-block">{`Brief Input -> [Manager] -> [Research + Tavily Search]
                         -> [Strategy Framework]
                         -> [Multi-Channel Copywriter]
                         -> [Visual Prompt Generator]
                         -> [Reviewer Scoring Gate]
                         -> (Suspend for HITL Gate)
                         -> [Publisher Distribution Plan]`}</pre>
      </>
    )
  },
  {
    id: 'hitl', title: 'Human-in-the-Loop (HITL) Gate', icon: <ShieldCheck size={16} />,
    content: (
      <>
        <p className="lead">The Human-in-the-Loop (HITL) architecture ensures that no campaign content is finalized without human verification and optional iterative revision.</p>

        <h4>Approval & Targeted Revision Workflow</h4>
        <div className="steps-list">
          <div className="step-item">
            <div className="step-num">1</div>
            <div>
              <strong>Gate Suspension:</strong> When the Reviewer agent finishes evaluation, `human_approval.py` sets campaign status to `awaiting_human_approval` and suspends graph execution.
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div>
              <strong>Inspection:</strong> The user reviews all agent outputs in the tabbed interface, inspecting individual quality scores, tone warnings, and visual prompts.
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div>
              <strong>Decision Matrix:</strong>
              <ul>
                <li><strong>Approve:</strong> Posts `status: "approved"` to `/api/campaigns/:id/approve`. Resumes execution at the `Publisher` node.</li>
                <li><strong>Request Changes:</strong> Posts `status: "rejected"`, `targetAgent`, and explicit feedback instructions to `/api/campaigns/:id/reject`.</li>
              </ul>
            </div>
          </div>
          <div className="step-item">
            <div className="step-num">4</div>
            <div>
              <strong>Selective Rollback & Re-execution:</strong> LangGraph routes execution back directly to the selected `targetAgent` (e.g., `copywriter` or `strategy`), injecting user notes into the system prompt. Downstream agents re-run automatically to maintain consistency.
            </div>
          </div>
        </div>

        <h4>Targeted Revision Mapping</h4>
        <table>
          <thead>
            <tr><th>Target Agent ID</th><th>Re-Execution Entry Point</th><th>Typical Use Case</th></tr>
          </thead>
          <tbody>
            <tr><td><code>research</code></td><td>Node 2: Research Agent</td><td>Competitor data is incomplete or market scope needs expanding.</td></tr>
            <tr><td><code>strategy</code></td><td>Node 3: Strategy Agent</td><td>Core messaging angle or target audience segmentation needs pivot.</td></tr>
            <tr><td><code>copywriter</code></td><td>Node 4: Copywriter Agent</td><td>Copy tone is inappropriate, too verbose, or missing mandatory CTAs.</td></tr>
            <tr><td><code>image_prompt</code></td><td>Node 5: Image Prompt Agent</td><td>Visual aesthetic does not match corporate brand guidelines.</td></tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'focus-groups', title: 'Synthetic Focus Groups', icon: <Eye size={16} />,
    content: (
      <>
        <p className="lead">The Synthetic Focus Group engine runs parallel LLM persona agents representing diverse demographic and psychographic consumer segments to evaluate campaign copy prior to ad spend commitment.</p>

        <h4>Persona Simulation Pipeline</h4>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon"><Brain size={18} /></div>
            <div>
              <strong>Parallel Persona Evaluation</strong>
              <span>Executes LLM persona simulations in parallel (`ai-service/agents/focus_group.py`). Evaluates copy for resonance (0–100%), primary objections, and purchasing friction points.</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><RefreshCw size={18} /></div>
            <div>
              <strong>Distributed Redis Caching</strong>
              <span>Simulation reports are cached in Redis for 72 hours using an MD5 hash of the tested copy text, delivering instant cached responses for duplicate requests.</span>
            </div>
          </div>
        </div>

        <h4>Simulation Report Schema Breakdown</h4>
        <table>
          <thead>
            <tr><th>Field Name</th><th>Data Type</th><th>Description & Analytics Impact</th></tr>
          </thead>
          <tbody>
            <tr><td><code>overallScore</code></td><td>Float (0–100)</td><td>Composite score representing cross-persona campaign acceptance.</td></tr>
            <tr><td><code>personas[].resonanceScore</code></td><td>Integer (0–100)</td><td>Individual persona alignment rating with the messaging tone.</td></tr>
            <tr><td><code>personas[].objection</code></td><td>String</td><td>Primary skepticism or reservation voiced by the persona.</td></tr>
            <tr><td><code>personas[].clashQuote</code></td><td>String</td><td>Direct verbatim quote highlighting copy phrasing that caused friction.</td></tr>
            <tr><td><code>personas[].clickIntent</code></td><td>Boolean</td><td>Predicted probability of persona clicking the primary CTA button.</td></tr>
            <tr><td><code>actionableRecommendations</code></td><td>Array of Strings</td><td>Prioritized list of copy modifications to eliminate buyer objections.</td></tr>
          </tbody>
        </table>

        <h4>Interactive Panel Q&A (Interview Mode)</h4>
        <p>In addition to standard batch simulations, users can open an interactive text dialogue with the focus group panel. The endpoint (`POST /api/focus-group/interview`) processes custom user queries against the persona pool, applying rule-based sentiment extraction with an 8-second execution guard to guarantee instant feedback.</p>
      </>
    )
  },
  {
    id: 'copy-variants', title: 'Copy Variant Engine', icon: <PenLine size={16} />,
    content: (
      <>
        <p className="lead">Generate channel-specific copy variants on demand without re-running the entire 7-agent pipeline. All variants maintain isolated version histories and performance analytics.</p>

        <h4>Distributed Concurrency & Locking</h4>
        <p>Variant generation requests trigger the Copywriter agent in isolation (`POST /api/campaigns/:id/generate-copy-variant`). To prevent race conditions and duplicate LLM billing when double-clicking UI buttons, the backend enforces Redis distributed locking:</p>

        <pre className="code-block">{`Lock Key: lock:variant:<campaignId>:<channel>
TTL: 60 Seconds
Behavior: Concurrent requests for the same channel return HTTP 429 immediately.`}</pre>

        <h4>Variant Steering & Focus Group Loop</h4>
        <div className="steps-list">
          <div className="step-item">
            <div className="step-num">1</div>
            <div>Select target channel tab (e.g., LinkedIn or Email) in the Copywriter view and click <strong>Generate Variant</strong>.</div>
          </div>
          <div className="step-item">
            <div className="step-num">2</div>
            <div>Provide an optional steering note (e.g., <em>"Make headline shorter and emphasize 30-day free trial"</em>).</div>
          </div>
          <div className="step-item">
            <div className="step-num">3</div>
            <div>The new copy version is appended to the campaign's `copy_versions` JSON history and set as the active display variant.</div>
          </div>
          <div className="step-item">
            <div className="step-num">4</div>
            <div>Submit the new variant directly to the Focus Group engine to measure score improvements against earlier drafts.</div>
          </div>
        </div>
      </>
    )
  },
  {
    id: 'mcp', title: 'Model Context Protocol (MCP)', icon: <Waypoints size={16} />,
    content: (
      <>
        <p className="lead">The AgentMark MCP Server (`agentmark-mcp-server`) exposes campaign orchestration tools directly to local AI desktop hosts (Claude Desktop, Cursor IDE, Windsurf) over standard Model Context Protocol via stdin/stdout.</p>

        <h4>Supported Tool Suites</h4>
        <table>
          <thead>
            <tr><th>Tool Name</th><th>Required Parameters</th><th>Functionality & Return Value</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><code>generate_campaign</code></td>
              <td>`project_id`, `name`, `brand_name`, `industry`, `primary_goal`, `target_audience`, `brand_voice`</td>
              <td>Executes full LangGraph agent pipeline with polling. Returns structured Markdown brief, review scores, and channel copy.</td>
            </tr>
            <tr>
              <td><code>run_focus_group</code></td>
              <td>`campaign_id`, optional `copy_text`</td>
              <td>Runs synthetic persona focus group simulation on campaign copy. Returns resonance scores and actionable objections.</td>
            </tr>
            <tr>
              <td><code>publish_to_channel</code></td>
              <td>`campaign_id`</td>
              <td>Approves campaign at HITL gate and triggers Publisher agent to generate distribution calendar and asset checklists.</td>
            </tr>
          </tbody>
        </table>

        <h4>Claude Desktop Setup Guide</h4>
        <p>Location of configuration file:</p>
        <ul>
          <li><strong>Windows:</strong> `%APPDATA%\Claude\claude_desktop_config.json`</li>
          <li><strong>macOS:</strong> `~/Library/Application Support/Claude/claude_desktop_config.json`</li>
        </ul>

        <pre className="code-block">{`{
  "mcpServers": {
    "agentmark": {
      "command": "uvx",
      "args": ["agentmark-mcp-server"],
      "env": {
        "AGENTMARK_API_URL": "http://localhost:5003",
        "AGENTMARK_API_KEY": "am_your_developer_api_key_here"
      }
    }
  }
}`}</pre>

        <h4>Audit Logging & Security Controls</h4>
        <p>All tool calls executed via MCP pass through `mcp-logger.middleware.ts` on the backend, creating immutable audit logs in the `McpActivity` PostgreSQL table visible under <strong>Settings → Integrations</strong>.</p>
      </>
    )
  },
  {
    id: 'api-keys', title: 'Developer API Keys & Security', icon: <Key size={16} />,
    content: (
      <>
        <p className="lead">AgentMark implements a dual-mode authentication scheme separating user browser sessions from programmatic developer API keys.</p>

        <h4>Key Format & Storage Architecture</h4>
        <ul>
          <li><strong>Key Format:</strong> High-entropy string prefixed with `am_` (e.g., `am_8f4a3c1e2d9b...`).</li>
          <li><strong>Zero Plaintext Storage:</strong> The raw API key is displayed <em>exactly once</em> upon creation. Only its SHA-256 cryptographic hash (`keyHash`) is saved in PostgreSQL.</li>
          <li><strong>Authentication Middleware:</strong> `auth.middleware.ts` validates incoming requests. For `am_` tokens, it computes SHA-256 and matches against active database records.</li>
        </ul>

        <h4>Security Scoping & Privilege Isolation</h4>
        <table>
          <thead>
            <tr><th>Credential Type</th><th>Header Format</th><th>Allowed Operations</th></tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>JWT Bearer Token</strong></td>
              <td>`Authorization: Bearer <jwt_token>`</td>
              <td>Full access — including key creation, key revocation, project deletion, and user account settings.</td>
            </tr>
            <tr>
              <td><strong>Developer API Key</strong></td>
              <td>`Authorization: Bearer am_<hex>`</td>
              <td>Campaign-level access — create/read campaigns, run focus groups, trigger publisher. <strong>Blocked from key management routes (`jwtOnly`).</strong></td>
            </tr>
          </tbody>
        </table>

        <h4>Key Management REST API</h4>
        <pre className="code-block">{`# Create API Key (Requires JWT)
POST /api/developer/keys
Body: { "label": "MacBook Pro Cursor Extension" }

# Revoke API Key (Requires JWT)
DELETE /api/developer/keys/:keyId`}</pre>
      </>
    )
  },
  {
    id: 'publishing', title: 'Publishing & Content Planning', icon: <Share2 size={16} />,
    content: (
      <>
        <p className="lead">The Publisher agent synthesizes finalized campaign copy and visual asset prompts into a structured multi-channel distribution plan.</p>

        <h4>Publisher Output Structure</h4>
        <table>
          <thead>
            <tr><th>Component</th><th>Description</th></tr>
          </thead>
          <tbody>
            <tr><td><strong>Content Calendar</strong></td><td>Chronological posting schedule mapping creative deliverables to specific days and optimal engagement hours.</td></tr>
            <tr><td><strong>Asset Checklist</strong></td><td>Complete inventory of required graphic exports, video snippets, and tracking URLs.</td></tr>
            <tr><td><strong>Platform Specifications</strong></td><td>Pre-formatted text layouts tailored to character limits and markdown rules per platform (LinkedIn, X, Email).</td></tr>
            <tr><td><strong>Projected Reach KPIs</strong></td><td>Estimated impression ranges and engagement targets based on industry benchmarks.</td></tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'memory', title: 'Memory Hub & Brand Intelligence', icon: <Brain size={16} />,
    content: (
      <>
        <p className="lead">The Memory Hub accumulates historical campaign metadata, revision trends, and first-try approval scores to refine future LLM system prompts for your brand.</p>

        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon"><Brain size={18} /></div>
            <div>
              <strong>Brand Voice Consistency</strong>
              <span>Aggregates approved tone directives across campaigns, injecting high-performing style parameters into new agent prompts automatically.</span>
            </div>
          </div>
          <div className="feature-card">
            <div className="feature-icon"><RefreshCw size={18} /></div>
            <div>
              <strong>Revision Hotspot Analytics</strong>
              <span>Tracks which agents receive the highest frequency of human feedback instructions, flagging areas where initial briefs need clarity.</span>
            </div>
          </div>
        </div>
      </>
    )
  },
  {
    id: 'settings', title: 'Settings & Integrations', icon: <Hammer size={16} />,
    content: (
      <>
        <h4>Provider API Keys (Local Storage Vault)</h4>
        <p>Users can configure custom LLM provider keys (OpenAI, Gemini, Groq, Tavily) under <strong>Settings → Model Config</strong>. API keys stored in client local storage take priority over system default fallback keys, giving enterprise accounts total control over billing quota.</p>

        <h4>Real-Time Webhook & Event Notifications</h4>
        <p>Configure notification preferences for pipeline completion, HITL review alerts, and MCP activity logs.</p>
      </>
    )
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting & Support', icon: <HelpCircle size={16} />,
    content: (
      <>
        <table>
          <thead>
            <tr><th>Symptom</th><th>Root Cause</th><th>Recommended Resolution</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>Campaign stuck on "Processing"</td>
              <td>Redis connection loss or LLM API timeout.</td>
              <td>Refresh browser. If status persists, click "Restart Node" in campaign review tab to retry failed agent.</td>
            </tr>
            <tr>
              <td>FastAPI returns 403 Forbidden</td>
              <td>`INTERNAL_SERVICE_SECRET` mismatch between backend and AI service.</td>
              <td>Ensure identical secret strings in `backend/.env` and `ai-service/.env`. Restart both services.</td>
            </tr>
            <tr>
              <td>Claude Desktop MCP disconnect</td>
              <td>Outdated API key or background service stopped.</td>
              <td>Verify backend service on port 5003. Issue a fresh Developer API Key and completely restart Claude Desktop process.</td>
            </tr>
            <tr>
              <td>Copy variant returns 429 Too Many Requests</td>
              <td>Concurrent variant request for same channel active.</td>
              <td>Wait 5 seconds for existing generation to release the Redis distributed lock before retrying.</td>
            </tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'contact', title: 'Enterprise Contact', icon: <Mail size={16} />,
    content: (
      <>
        <p>Need dedicated setup support or custom model fine-tuning? Contact the engineering team:</p>
        <div className="contact-grid">
          <a href="mailto:info@novateches.com" className="contact-card">
            <div className="contact-icon"><Mail size={18} /></div>
            <div><strong>Email Technical Support</strong><span>info@novateches.com</span></div>
          </a>
          <a href="https://wa.me/916366411798" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="contact-icon"><MessageCircle size={18} /></div>
            <div><strong>WhatsApp Direct Engineering Line</strong><span>+91 63664 11798</span></div>
          </a>
        </div>
      </>
    )
  },
];

function DocsContent() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) setActiveSection(entry.target.id);
      });
    }, { rootMargin: '-80px 0px -65% 0px' });
    sections.forEach(s => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && sections.some(s => s.id === hash)) {
      setTimeout(() => scrollToSection(hash), 100);
    }
  }, [scrollToSection]);

  return (
    <>
      <style>{`
        .docs-main { margin-left: 0; transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1); }
        @media (min-width: 768px) { .docs-main { margin-left: var(--sidebar-w, 240px); } }

        /* TOC pills */
        .toc-bar { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid #1f2937; }
        .toc-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 12px; color: #8b8b9e; text-decoration: none; transition: all 0.15s ease; white-space: nowrap; border: 1px solid #2a2a38; background: #111118; }
        .toc-pill:hover { color: #f1f1f3; background: #1a1a24; border-color: #374151; }
        .toc-pill.active { color: #a5b4fc; background: rgba(99,102,241,0.12); border-color: rgba(99,102,241,0.4); }
        .toc-pill svg { opacity: 0.7; }
        .toc-pill.active svg { opacity: 1; color: #818cf8; }

        /* Content */
        .doc-content h2 { font-size: 24px; font-weight: 700; margin: 48px 0 20px; color: #f1f1f3; scroll-margin-top: 80px; letter-spacing: -0.3px; border-bottom: 1px solid #1f2937; padding-bottom: 8px; }
        .doc-content section { scroll-margin-top: 72px; }
        .doc-content h4 { font-size: 15px; font-weight: 600; margin: 28px 0 12px; color: #e5e7eb; letter-spacing: -0.1px; }
        .doc-content p { font-size: 14px; color: #9ca3af; line-height: 1.8; margin-bottom: 16px; }
        .doc-content p.lead { font-size: 15.5px; color: #d1d5db; line-height: 1.85; margin-bottom: 24px; font-weight: 400; }
        .doc-content strong { color: #e5e7eb; font-weight: 600; }
        .doc-content code { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; background: #1a1a24; padding: 3px 7px; border-radius: 4px; color: #a5b4fc; border: 1px solid #2a2a38; }
        .doc-content a { color: #a5b4fc; transition: color 0.15s; text-decoration: underline; text-underline-offset: 3px; }
        .doc-content a:hover { color: #818cf8; }

        /* Code block */
        .code-block { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; background: #0a0a0f; border: 1px solid #2a2a38; border-radius: 8px; padding: 16px; color: #a5b4fc; overflow-x: auto; margin: 18px 0; line-height: 1.6; }

        /* Tables */
        .doc-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 20px 0; font-size: 13px; border-radius: 8px; overflow: hidden; border: 1px solid #2a2a38; }
        .doc-content th { padding: 12px 16px; text-align: left; background: #111118; color: #d1d5db; font-weight: 600; font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #2a2a38; }
        .doc-content td { padding: 12px 16px; border-bottom: 1px solid #1a1a24; color: #9ca3af; line-height: 1.6; }
        .doc-content tr:last-child td { border-bottom: none; }
        .doc-content tr:hover td { background: rgba(255,255,255,0.02); }

        /* Tags */
        .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.2px; }
        .tag-blue { background: rgba(99,102,241,0.12); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.3); }
        .tag-green { background: rgba(52,211,153,0.12); color: #6ee7b7; border: 1px solid rgba(52,211,153,0.3); }
        .tag-red { background: rgba(244,63,94,0.12); color: #fb7185; border: 1px solid rgba(244,63,94,0.3); }

        /* Feature grid */
        .feature-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 20px 0; }
        @media (min-width: 640px) { .feature-grid { grid-template-columns: 1fr 1fr; } }
        .feature-card { display: flex; gap: 12px; padding: 16px; background: #111118; border: 1px solid #2a2a38; border-radius: 10px; transition: all 0.15s; }
        .feature-card:hover { border-color: #6366f1; background: #16161f; }
        .feature-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(99,102,241,0.2); }
        .feature-icon svg { color: #818cf8; }
        .feature-card strong { display: block; font-size: 13.5px; color: #f1f1f3; margin-bottom: 3px; }
        .feature-card span { font-size: 12.5px; color: #8b8b9e; line-height: 1.6; }

        /* Step flow */
        .step-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding: 12px 18px; background: #111118; border: 1px solid #2a2a38; border-radius: 8px; margin: 18px 0; font-size: 12.5px; font-family: 'JetBrains Mono', monospace; color: #a5b4fc; }
        .step-flow svg { color: #6366f1; }
        .step-flow span { font-weight: 500; }

        /* Steps list */
        .steps-list { margin: 18px 0; }
        .step-item { display: flex; gap: 14px; align-items: flex-start; padding: 10px 0; }
        .step-num { width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 11.5px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 2px; }
        .step-item div { font-size: 14px; color: #9ca3af; line-height: 1.7; }

        /* Concept cards */
        .concept-cards { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 18px 0; }
        @media (min-width: 640px) { .concept-cards { grid-template-columns: 1fr 1fr 1fr; } }
        .concept-card { padding: 18px; background: #111118; border: 1px solid #2a2a38; border-radius: 10px; transition: all 0.15s; }
        .concept-card:hover { border-color: #6366f1; }
        .concept-card h4 { font-size: 14px; margin: 0 0 6px; color: #f1f1f3; }
        .concept-card p { font-size: 12.5px; color: #8b8b9e; margin: 0; line-height: 1.6; }

        /* Agent grid */
        .agent-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 18px 0; }
        @media (min-width: 640px) { .agent-grid { grid-template-columns: 1fr 1fr; } }
        .agent-card { padding: 16px; background: #111118; border: 1px solid #2a2a38; border-radius: 10px; transition: all 0.15s; }
        .agent-card:hover { border-color: #6366f1; }
        .agent-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(99,102,241,0.1); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; }
        .agent-icon svg { color: #818cf8; }
        .agent-card h5 { font-size: 14px; font-weight: 600; color: #f1f1f3; margin: 0 0 6px; }
        .agent-card p { font-size: 12.5px; color: #8b8b9e; margin: 0; line-height: 1.6; }

        /* Contact grid */
        .contact-grid { display: grid; grid-template-columns: 1fr; gap: 12px; margin: 20px 0; }
        @media (min-width: 480px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
        .contact-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; background: #111118; border: 1px solid #2a2a38; border-radius: 10px; text-decoration: none; transition: all 0.15s; }
        .contact-card:hover { border-color: #6366f1; background: #16161f; }
        .contact-icon { width: 40px; height: 40px; border-radius: 10px; background: rgba(99,102,241,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .contact-icon svg { color: #818cf8; }
        .contact-card strong { display: block; font-size: 13.5px; color: #f1f1f3; margin-bottom: 2px; font-weight: 600; }
        .contact-card span { font-size: 12.5px; color: #8b8b9e; }

        /* Back button */
        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: #8b8b9e; transition: color 0.15s; font-family: 'JetBrains Mono', monospace; }
        .back-btn:hover { color: #f1f1f3; }
        .back-btn svg { transition: transform 0.15s; }
        .back-btn:hover svg { transform: translateX(-3px); }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Enterprise Documentation" />

        <main className="docs-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-4 py-6 sm:px-6 md:px-10 lg:px-12 xl:px-16 w-full max-w-7xl">
            <button onClick={() => navigate('/support')} className="back-btn mb-6">
              <ArrowLeft size={14} /> Back to Support & Tutorials
            </button>

            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#f1f1f3', letterSpacing: '-0.4px' }}>
                AgentMark Platform Documentation
              </h1>
              <p className="text-sm mt-2" style={{ color: '#8B8B9E' }}>
                Comprehensive technical specifications, multi-agent architecture, state engine transitions, API references, and security controls.
              </p>
            </div>

            {/* TOC pills */}
            <div className="toc-bar">
              {sections.map(s => (
                <a key={s.id} href={`#${s.id}`} className={`toc-pill ${activeSection === s.id ? 'active' : ''}`} onClick={e => { e.preventDefault(); scrollToSection(s.id); }}>
                  {s.icon}{s.title}
                </a>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="doc-content">
                {sections.map(s => (
                  <section key={s.id} id={s.id}>
                    <h2>{s.title}</h2>
                    {s.content}
                  </section>
                ))}
              </div>

              <hr style={{ borderColor: '#1f2937', margin: '64px 0 24px' }} />
              <p className="text-xs pb-12" style={{ color: '#4b5563', fontFamily: 'JetBrains Mono, monospace' }}>
                &copy; 2026 Novateches Software Pvt Ltd. All Rights Reserved. Confidential & Proprietary.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function DocsPage() {
  return (
    <SidebarProvider>
      <DocsContent />
    </SidebarProvider>
  );
}
