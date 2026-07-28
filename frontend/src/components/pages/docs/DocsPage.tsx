import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronRight, ShieldCheck, Brain, 
  Sparkles, Zap, Search, 
  Palette, Send, Rocket, Waypoints, Eye, 
  CheckCircle2, RotateCcw, Terminal, Check,
  Copy, Wand2, Cpu
} from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: JSX.Element;
  content: JSX.Element;
}

const sections: DocSection[] = [
  {
    id: 'overview',
    title: '1. What is AgentMark?',
    category: 'Getting Started',
    icon: <Sparkles size={16} className="text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
          <strong className="text-white font-semibold">AgentMark</strong> is an enterprise AI Marketing Platform operating on the <strong className="text-indigo-300 font-semibold">EMOS v9 Architecture Baseline</strong>. Provide a high-level campaign goal, and <strong className="text-indigo-300 font-semibold">7 autonomous AI specialist agents</strong> collaborate in a stateful LangGraph pipeline to conduct live web market research (LiteRAG), formulate positioning strategy, write multi-channel copy, generate visual prompts, execute synthetic focus group simulations, and schedule your publishing calendar — all in under 90 seconds.
        </p>

        <div className="p-4 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-[#12121a] to-purple-950/30 border border-indigo-500/30 shadow-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Zap size={13} className="text-indigo-400" /> EMOS v9 Baseline Active
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Automate Your Marketing Lifecycle with Event-Sourced Agent Collaboration
          </h3>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
            AgentMark combines strict minimal JSON Context Contracts (&lt;250 tokens), Brand Vault snapshot isolation, 4-tier policy enforcement, and multi-provider failover (Gemini, Groq, OpenAI) to deliver high-converting campaigns with 0% brand drift.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-3">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-400">7 AI Agents</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">LangGraph Pipeline</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-emerald-400">45-90s</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Average Execution</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-purple-400">6+ Channels</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Multi-Channel Copy</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-cyan-400">100%</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">HITL Human Oversight</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'quickstart',
    title: '2. Quick Start User Guide',
    category: 'Getting Started',
    icon: <Rocket size={16} className="text-emerald-400 filter drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Creating and launching a campaign with AgentMark takes just 4 easy steps:</p>
        <div className="p-4 md:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-center flex-wrap gap-2 text-xs font-mono text-slate-300 shadow-sm">
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">1. Dashboard</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">2. New Campaign</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">3. Fill Brief</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">4. AI Execution & HITL Review</span>
        </div>
      </div>
    )
  },
  {
    id: 'agent-pipeline',
    title: '3. Multi-Agent Pipeline & Specialized Nodes',
    category: 'Architecture',
    icon: <Waypoints size={16} className="text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">AgentMark runs a stateful LangGraph pipeline across 7 specialized agent nodes:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-indigo-400 font-bold block">1. Manager Agent</strong>
            <p>Formulates channel strategy, campaign scope, and target deliverables list.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-cyan-400 font-bold block">2. Research Agent (LiteRAG)</strong>
            <p>Executes live Tavily web search for market TAM, CAGR, competitor analysis, and trends.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-purple-400 font-bold block">3. Strategy Agent</strong>
            <p>Defines audience personas, messaging pillars, positioning angles, and creative hooks.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-emerald-400 font-bold block">4. Copywriter Agent</strong>
            <p>Generates multi-channel copy variants tailored for X, Instagram, LinkedIn, Email, YouTube.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-pink-400 font-bold block">5. Visual Prompt Agent</strong>
            <p>Produces detailed art prompts, HSL color palettes, visual keywords, and studio bridges.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1">
            <strong className="text-amber-400 font-bold block">6. Quality Reviewer & Evaluator</strong>
            <p>Audits copy for claim proof, readability, compliance, and assigns a 0-100 score.</p>
          </div>
          <div className="p-4 rounded-xl bg-[#12121a] border border-[#1e1e2d] space-y-1 md:col-span-2">
            <strong className="text-blue-400 font-bold block">7. Publisher Agent</strong>
            <p>Generates distribution calendar, posting schedule, and channel publication steps.</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'copy-variants',
    title: '4. Copy Variant Steering & Direct Social CTAs',
    category: 'Features',
    icon: <Copy size={16} className="text-rose-400 filter drop-shadow-[0_0_8px_rgba(251,113,133,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">AgentMark provides on-demand copy variant generation and direct platform posting CTAs:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-2">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <Wand2 size={18} /> Steered Copy Variant Generator
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Click <strong>"Generate Variant"</strong> on any channel card. Add custom steering notes like <em>"Make this 50% shorter with punchy bullet points"</em> to instantly create tailored variations.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Send size={18} /> 1-Click Platform Posting CTAs
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Click <strong>"Post on X"</strong>, <strong>"Share on LinkedIn"</strong>, or <strong>"Compose in Gmail"</strong>. Automatically copies pre-filled copy to clipboard and opens the platform posting window.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'studio-bridges',
    title: '5. Visual Prompts & Image Studio Bridges',
    category: 'Features',
    icon: <Palette size={16} className="text-pink-400 filter drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Generate visual asset prompts with direct studio bridge integrations:</p>
        <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3">
          <h4 className="text-white font-bold text-sm flex items-center gap-2">
            <Palette size={18} className="text-pink-400" /> Supported Studio Bridges:
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono text-slate-300">
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a] text-center font-bold text-indigo-300">Midjourney v6</div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a] text-center font-bold text-emerald-300">DALL-E 3</div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a] text-center font-bold text-purple-300">Leonardo AI</div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a] text-center font-bold text-cyan-300">Flux.1 Schnell</div>
          </div>
          <p className="text-xs text-slate-400">Clicking "Generate" next to any prompt card copies the formatted art prompt with aspect ratios (`--ar 16:9`) and opens the selected studio in a new tab.</p>
        </div>
      </div>
    )
  },
  {
    id: 'focus-groups',
    title: '6. Synthetic Focus Group Persona Testing & Q&A',
    category: 'Features',
    icon: <Eye size={16} className="text-purple-400 filter drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Test copy against representative consumer personas before spending ad budget:</p>
        <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a]">
              <strong className="text-purple-300 block mb-1">Persona Critiques & Objections</strong>
              Identifies exact consumer hesitation reasons, financial anxiety, and trust barriers.
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a]">
              <strong className="text-emerald-300 block mb-1">Sentiment & Click-Intent %</strong>
              Calculates approval score (0-100%) and estimated click probability.
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a]">
              <strong className="text-cyan-300 block mb-1">Clash Quotes & Objections</strong>
              Surfaces head-to-head persona debates comparing copy angles.
            </div>
            <div className="p-3 rounded-xl bg-[#161622] border border-[#2a2a3a]">
              <strong className="text-amber-300 block mb-1">Interactive Focus Group Q&A</strong>
              Ask real-time questions to synthetic personas regarding your campaign copy.
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'hitl-review',
    title: '7. Human-in-the-Loop (HITL) Review & Revisions',
    category: 'Features',
    icon: <RotateCcw size={16} className="text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">The workflow pauses automatically at the Human Approval Gate for creative control:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 size={18} /> Option A: Approve Campaign
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Unlocks 1-click publishing and records winning messaging patterns into the Memory Hub.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <RotateCcw size={18} /> Option B: Targeted Agent Revisions
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Select specific agents (e.g., <em>Copywriter</em>), enter custom steering notes, and trigger an automated re-run.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'emos-v9-baseline',
    title: '8. EMOS v9 Baseline & Enterprise Quality Gates',
    category: 'Architecture',
    icon: <ShieldCheck size={16} className="text-emerald-400 filter drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200 leading-relaxed">
          AgentMark operates on the <strong className="text-white font-semibold">EMOS v9 Architecture Baseline</strong> (Enterprise Marketing Operating System):
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-[#12121a] border border-emerald-500/30 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck size={18} /> Brand Vault & Context Contracts
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Append-only event log with snapshot isolation. Generates minimal JSON Context Contracts (&lt;250 tokens) containing brand rules, CTAs, and forbidden terms.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#12121a] border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Search size={18} /> Hybrid RRF Retrieval Engine
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Combines BM25 keyword matching with pgvector HNSW vector similarity using Reciprocal Rank Fusion (Source Precedence: Manual User 1.0 &gt; Guidelines 0.9 &gt; Website 0.7 &gt; Competitor 0.3, K ≤ 5).
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#12121a] border border-purple-500/30 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <Zap size={18} /> 4-Tier Layered Policy Engine
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Sequential compliance checks: Platform (safety/fraud) → Industry (SEC finance & HIPAA health) → Tenant (brand rules) → Campaign (discount caps).
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#12121a] border border-amber-500/30 space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Brain size={18} /> Independent Evaluator Score Routing
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Evaluates copy with prompt isolation. Score routing: ≥80 Auto Approve | 65–79 Human Review | 50–64 Auto Revision | &lt;50 Strategy + Copy Rewrite Loop.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'memory-hub',
    title: '9. Memory Hub & Cross-Campaign Learning',
    category: 'Features',
    icon: <Brain size={16} className="text-indigo-400 filter drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">The Memory Hub tracks performance patterns across your project history:</p>
        <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3">
          <ul className="space-y-2 text-xs text-slate-300">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>90-Day Decay Half-Life Weighting:</strong> Memory influence decays exponentially over 90 days (Half-life = 90 days).
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Source Reliability Filter:</strong> Learning weight events below 0.65 threshold are discarded to prevent memory pollution.
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Human Edit Diff Ingestion:</strong> Tracks similarity ratio between original AI copy and human edits without mutating Brand Vault.
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'mcp-integration',
    title: '10. Claude Desktop & Cursor IDE MCP Integration',
    category: 'Integrations',
    icon: <Cpu size={16} className="text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Connect Claude Desktop, Cursor, or Windsurf directly to AgentMark via Model Context Protocol (MCP):</p>
        <div className="p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Terminal size={18} /> FastMCP Server & 1-Click Installer
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Go to <strong>Settings &gt; Integrations</strong> and click <strong>"Connect Claude Desktop"</strong>. Our system automatically writes the required configuration to your desktop config file with your Developer API Key.
          </p>
        </div>
      </div>
    )
  }
];

export default function DocsPage() {
  const navigate = useNavigate();
  const [activeSectionId, setActiveSectionId] = useState<string>('overview');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeSection = useMemo(() => {
    return sections.find(s => s.id === activeSectionId) || sections[0];
  }, [activeSectionId]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(s => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
  }, [searchQuery]);

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#08080c] text-white flex flex-col font-sans antialiased">
        <TopNav />
        <div className="flex flex-1 relative">
          <Sidebar />
          <main className="flex-1 dashboard-main p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-xl bg-[#12121a] hover:bg-[#1a1a26] border border-[#1e1e2d] text-slate-400 hover:text-white transition-all"
                  title="Back"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    Documentation & Capabilities Catalog
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Official Guide & Feature Reference for AgentMark (EMOS v9 Baseline)
                  </p>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search capabilities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#12121a] border border-[#1e1e2d] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar Navigation */}
              <div className="lg:col-span-1 space-y-2">
                <div className="p-3 rounded-xl bg-[#12121a] border border-[#1e1e2d] mb-4">
                  <div className="text-[11px] font-mono font-bold text-indigo-400 uppercase tracking-wider mb-2">Navigation</div>
                  <nav className="space-y-1">
                    {filteredSections.map((sec) => (
                      <button
                        key={sec.id}
                        onClick={() => setActiveSectionId(sec.id)}
                        className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium transition-all ${
                          activeSectionId === sec.id
                            ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                            : 'text-slate-400 hover:bg-[#181824] hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          {sec.icon}
                          <span className="truncate">{sec.title}</span>
                        </span>
                        <ChevronRight size={14} className={activeSectionId === sec.id ? 'text-indigo-400' : 'text-slate-600'} />
                      </button>
                    ))}
                  </nav>
                </div>
              </div>

              {/* Active Section Content */}
              <div className="lg:col-span-3">
                <div className="p-6 sm:p-8 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-xl space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-[#1e1e2d]">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                      {activeSection.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                        {activeSection.category}
                      </span>
                      <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                        {activeSection.title}
                      </h2>
                    </div>
                  </div>

                  <div>{activeSection.content}</div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
