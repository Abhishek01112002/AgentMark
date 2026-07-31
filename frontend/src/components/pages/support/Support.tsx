import React, { useState, useRef, useEffect } from 'react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import { BookOpen, PlayCircle, ChevronDown, Mail, X, ArrowRight, Play } from 'lucide-react';

// Authentic Green WhatsApp SVG Icon Component
const WhatsAppLogo: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={`shrink-0 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.012 2C6.48 2 2 6.48 2 12.012c0 1.966.568 3.805 1.554 5.362L2 22l4.745-1.52A9.957 9.957 0 0 0 12.012 22c5.53 0 10.012-4.48 10.012-10.012C22.024 6.48 17.542 2 12.012 2zm0 18.022a8.005 8.005 0 0 1-4.088-1.123l-.293-.174-2.82.903.916-2.748-.19-.303A7.986 7.986 0 0 1 4.012 12c0-4.41 3.59-8 8-8s8 3.59 8 8-3.59 8.022-8 8.022zm4.386-6.012c-.24-.12-1.423-.702-1.644-.782-.22-.08-.38-.12-.54.12-.16.24-.622.782-.762.942-.14.16-.28.18-.52.06a6.55 6.55 0 0 1-1.933-1.193 7.227 7.227 0 0 1-1.338-1.666c-.14-.24-.015-.37.105-.49.108-.108.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.195-.467-.393-.404-.54-.412l-.46-.008c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2.002s.86 2.32 1 2.502c.14.18 1.69 2.58 4.095 3.62.572.247 1.018.395 1.366.505.574.183 1.096.157 1.509.095.46-.069 1.423-.582 1.624-1.143.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
  </svg>
);

interface FAQItem {
  question: string;
  answer: string;
}

const SupportContent: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number>(0);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeVideoIndex, showTutorialModal]);

  const faqs: FAQItem[] = [
    {
      question: 'What is the EMOS v9 Architecture Baseline?',
      answer: 'EMOS v9 (Enterprise Marketing Operating System) is AgentMark\'s frozen production baseline. It introduces event-sourced Brand Vault snapshots, minimal context contracts (<250 tokens), Hybrid RRF retrieval, 4-tier Layered Policy enforcement, and independent evaluator quality gates.',
    },
    {
      question: 'How does the Campaign Review score routing policy work?',
      answer: 'Campaign copy and quality are audited by the Independent Evaluator against a threshold score of MIN_AGENT_SCORE = 75:\n• Score ≥ 75 & Policy Pass: AI approves copy and routes it directly to the Human Approval Gate (HITL).\n• Score < 75 or Policy Failure: Routes back to the specific failing agent for auto-revision (up to MAX_REVISIONS = 3 per agent).\n• Exhausted Revisions: If an agent reaches 3 revisions without passing, the workflow automatically escalates to Human Approval for manual review.\n• Mandatory HITL: 100% of campaigns require human approval prior to publishing; no automatic publishing occurs.',
    },
    {
      question: 'What is the Brand Vault and how do Context Contracts work?',
      answer: 'The Brand Vault is an append-only event-sourced repository of verified enterprise brand facts. Materialized snapshots generate lightweight Context Contracts (<250 tokens) containing brand guidelines, target personas, primary CTAs, and forbidden terms. Downstream agents consume these strict contracts to guarantee zero brand drift.',
    },
    {
      question: 'How does Hybrid RRF Retrieval optimize knowledge search?',
      answer: 'AgentMark combines PostgreSQL tsvector keyword matching (BM25) with pgvector HNSW vector similarity using Reciprocal Rank Fusion (RRF). Retrieval is weighted by Source Precedence: Manual User (1.0) > Brand Guidelines (0.9) > Website (0.7) > Competitor Data (0.3), bounded to a strict max budget of K ≤ 5 chunks.',
    },
    {
      question: 'What is the 4-Tier Layered Policy Engine?',
      answer: 'Prior to publication, generated copy passes sequentially through 4 policy tiers:\n1. Platform Policy: Global safety, anti-defamation, and fraud prevention.\n2. Industry Policy: Sector regulations (SEC finance rules, HIPAA healthcare claims).\n3. Tenant Policy: Enterprise brand rules and forbidden keyword filters.\n4. Campaign Policy: Offer limits and maximum discount caps.',
    },
    {
      question: 'Which features are Production-Ready vs. Feature-Flagged (Experimental)?',
      answer: '• Production-Ready: LangGraph multi-agent orchestration, LiteRAG Tavily search, Focus Group persona simulation, Human-in-the-Loop review, and multi-channel publishing.\n• Feature-Flagged (EMOS_BRAND_VAULT_ENABLED): Event-sourced Brand Vault logs, Hybrid RRF search, 4-tier policy enforcement, 90-day memory decay weighting, and OpenTelemetry component tracing.',
    },
    {
      question: 'Troubleshooting: What should I do if a campaign fails or shows a CTA misalignment warning?',
      answer: '1. Rate Limits / Timeouts: Retry the campaign via the dashboard action menu. Transient errors auto-recover with exponential backoff.\n2. CTA Misalignment Warning: Ensure your primary CTA is specified in project settings so the Context Contract enforces it across all copy channels.\n3. Feature Flag Status: If Brand Vault features are hidden, confirm EMOS_BRAND_VAULT_ENABLED=true in backend environment settings.',
    },
    {
      question: 'How does the Synthetic Focus Group simulation evaluate campaign copy?',
      answer: 'Our Focus Group engine runs parallel LLM persona agents representing diverse demographic and psychographic consumer segments. It analyzes your copy for sentiment score (0–100%), click-intent probability, primary objections, and actionable rewrite recommendations before you spend ad budget.',
    },
    {
      question: 'How do I connect AgentMark to Claude Desktop or Cursor IDE via MCP?',
      answer: 'Go to Settings \u2192 Integrations and click "Connect Claude Desktop". This generates a Developer API Key and automatically writes the configuration to your claude_desktop_config.json. The AgentMark MCP Server is a local Python service — you must have Python 3.10+ and the uv package manager installed. Once configured, completely restart Claude Desktop from your taskbar/tray. You can then use tools like generate_campaign, run_focus_group, create_project, revise_copy_with_feedback, get_campaign_status, and publish_to_channel directly from Claude.',
    },
    {
      question: 'How do Developer API Keys work for programmatic access?',
      answer: 'Developer API Keys are long-lived credentials with the prefix am_ followed by a 32-character hex string. They are stored on the server as SHA-256 hashes — the plaintext key is shown only once at creation time and is never recoverable. Use these keys in the AGENTMARK_API_KEY environment variable for the MCP server, or pass them as Bearer tokens to the AgentMark REST API. You can manage, revoke, and rotate keys from Settings \u2192 Integrations.',
    },
    {
      question: 'My campaign shows "Failed" — how do I recover?',
      answer: 'The "Failed" status indicates a transient error during the AI pipeline (e.g. LLM rate limit, Redis timeout, or network issue). From your Dashboard or Campaign History, click the action menu on the failed campaign and select "Retry". The retry mechanism uses exponential backoff — it will attempt the pipeline again from the beginning. If failures persist, check that your API keys in backend/.env and ai-service/.env are valid and that Redis is running.',
    },
    {
      question: 'How long does campaign generation take?',
      answer: 'Most multi-channel campaigns are generated within 60 to 120 seconds. Complex strategies requiring deep research may take up to 3 minutes as our agents traverse web data and internal knowledge bases.',
    },
  ];

  const tutorials = [
    {
      title: 'How to Launch Your First Campaign',
      duration: '3:32',
      videoUrl: '/create_campaign.mp4',
      description: 'A quick walkthrough showing how to enter target parameters and trigger the multi-agent campaign runner.',
      steps: [
        'Click on "New Campaign" in the sidebar dashboard.',
        'Fill in the target audience, industry, and primary campaign goals.',
        'Choose a brand voice and click "Launch Campaign" to start the AI runner.'
      ]
    },
    {
      title: 'Running Synthetic Focus Group Simulations',
      duration: '2:15',
      videoUrl: '/create_campaign.mp4',
      description: 'Simulate audience segment reactions, objections, and click-intent scores before launch.',
      steps: [
        'Open any generated campaign and navigate to the Focus Group tab.',
        'Select target personas or use the default panel.',
        'View automatic background simulation results including persona critiques, clash quotes, and rewrite suggestions.'
      ]
    },
    {
      title: 'Connecting Claude Desktop & Cursor via MCP',
      duration: '1:45',
      videoUrl: '/setup_api_keys.mp4',
      description: 'Set up Model Context Protocol integration to control AgentMark directly from your AI desktop assistant.',
      steps: [
        'Go to Settings > Integrations in the AgentMark web app.',
        'Click "Connect Claude Desktop" to issue a Developer API Key and auto-generate configuration.',
        'Restart Claude Desktop completely to use natural language tools like generate_campaign and run_focus_group.'
      ]
    },
    {
      title: 'Reviewing & Sharing Copy Variants',
      duration: '1:04',
      videoUrl: '/customize_copy.mp4',
      description: 'Learn how to inspect the generated copywriter outputs and use the one-click brand bridges.',
      steps: [
        'Navigate to the Copywriter tab in your completed campaign results.',
        'Select any channel tab (e.g., X, LinkedIn, Email) to view the generated drafts.',
        'Click the bottom CTA button (like "Compose in Gmail" or "Post on X") to copy the text and open the bridge.'
      ]
    },
    {
      title: 'Generating Visual Prompts via AI Bridges',
      duration: '0:55',
      videoUrl: '/visual_studio_bridges.mp4',
      description: 'Learn how to copy generated image prompts and launch external image generation tools.',
      steps: [
        'Navigate to the Visuals tab in your campaign results.',
        'Scroll to any generated prompt card.',
        'Click the "Generate" button on the card, select an AI Studio engine (like DALL-E or Imagen 3), and let the bridge pre-fill the prompt.'
      ]
    },
    {
      title: 'Configuring API Keys & Credentials',
      duration: '0:38',
      videoUrl: '/setup_api_keys.mp4',
      description: 'A step-by-step guide to adding your LLM credentials for campaign execution.',
      steps: [
        'Click on "Settings" in the main sidebar.',
        'Add your Gemini or OpenAI API keys into the respective input fields.',
        'Click "Save Credentials" and wait for the green confirmation toast.'
      ]
    },
  ];

  const toggleAccordion = (index: number) => {
    setActiveAccordion(activeAccordion === index ? -1 : index);
  };

  return (
    <>
      <style>{`
        .pulse-dot {
            animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.2); }
        }
        .glass-card {
            background: #111118;
            border: 1px solid #2A2A38;
            transition: all 0.2s ease-out;
        }
        .glass-card:hover {
            border-color: #6366F1;
            background: #16161f;
        }
        .accordion-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .accordion-content.active {
            max-height: 300px;
        }
        .chevron {
            transition: transform 0.3s ease-out;
        }
        .chevron.active {
            transform: rotate(180deg);
        }
        .support-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .support-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Support" />

        <main className="support-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="space-y-8">
              <header>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Help & Resources
                </h2>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  Get help, report issues, or browse documentation for the AgentMark platform.
                </p>
              </header>

              {/* Top Row Resource Cards */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                <div className="glass-card p-6 rounded-xl flex flex-col items-start group">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    <BookOpen size={32} className="text-violet-400 filter drop-shadow-[0_0_10px_rgba(167,139,250,0.7)]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Documentation</h3>
                  <p className="text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    Comprehensive guides on setting up workflows, Focus Groups, and Claude MCP.
                  </p>
                  
                  {/* Quick Feature Shortcuts */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <a href="/docs#focus-groups" className="px-2.5 py-1 bg-[#1A1A24] border border-[#2A2A38] hover:border-[#6366F1] rounded text-xs font-mono text-[#a5b4fc] transition-all">
                      Focus Groups Guide →
                    </a>
                    <a href="/docs#mcp" className="px-2.5 py-1 bg-[#1A1A24] border border-[#2A2A38] hover:border-[#6366F1] rounded text-xs font-mono text-[#a5b4fc] transition-all">
                      Claude MCP Setup →
                    </a>
                  </div>

                  <a href="/docs" className="mt-auto flex items-center text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>
                    Explore All Docs <ArrowRight size={18} className="ml-1" />
                  </a>
                </div>

                <button 
                  onClick={() => setShowTutorialModal(true)}
                  className="glass-card p-6 rounded-xl flex flex-col items-start group cursor-pointer w-full text-left bg-[#111118] border border-[#2A2A38]"
                >
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                    <PlayCircle size={32} className="text-emerald-400 filter drop-shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Video Tutorials</h3>
                  <p className="text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    Watch step-by-step masterclasses on high-performance marketing.
                  </p>
                  <span className="mt-auto flex items-center text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                    Watch Now <ArrowRight size={18} className="ml-1" />
                  </span>
                </button>
              </section>

              {/* FAQ Section - Full Width */}
              <section>
                <h3 className="text-xl font-semibold mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Frequently Asked Questions</h3>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <div key={index} className="glass-card rounded-lg overflow-hidden">
                      <button
                        className="w-full p-6 flex justify-between items-center text-left"
                        onClick={() => toggleAccordion(index)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        <span className="text-sm font-medium pr-4" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{faq.question}</span>
                        <ChevronDown
                          size={18}
                          className={`chevron transition-transform ${
                            activeAccordion === index ? 'active' : ''
                          }`}
                          style={{ color: '#8B8B9E' }}
                        />
                      </button>
                      <div className={`accordion-content ${activeAccordion === index ? 'active' : ''}`}>
                        <div className="px-6 pb-6 text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                          {faq.answer}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Contact Options */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a
                    href="mailto:info@novateches.com"
                    className="flex items-center gap-3 px-6 py-4 bg-[#111118] border border-[#2A2A38] rounded-xl transition-all hover:bg-[#1b1b20] hover:border-[#464554]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <Mail size={24} className="text-sky-400 filter drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]" />
                    <div className="text-left">
                      <div className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Email Us</div>
                      <div className="text-sm font-medium" style={{ color: '#F1F1F3' }}>info@novateches.com</div>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/916366411798?text=Hi%20AgentMark%20Support,%20I%20need%20help%20with%20my%20campaign."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-4 bg-[#111118] border border-[#25D366]/30 hover:border-[#25D366] rounded-xl transition-all hover:bg-[#25D366]/10"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <WhatsAppLogo size={24} className="text-[#25D366] filter drop-shadow-[0_0_8px_rgba(37,211,102,0.7)]" />
                    <div className="text-left">
                      <div className="text-xs mb-1 text-[#25D366] font-semibold">WhatsApp Support</div>
                      <div className="text-sm font-medium text-white">+91 63664 11798</div>
                    </div>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Immersive Lightbox Theater Modal */}
      {showTutorialModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0F]/85 backdrop-blur-md animate-fadeIn modal-overlay"
          onClick={() => setShowTutorialModal(false)}
        >
          <div 
            className="w-full max-w-5xl bg-[#111118] border border-[#2A2A38] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row relative animate-scaleIn modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ minHeight: '520px' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowTutorialModal(false)}
              className="absolute top-4 right-4 z-50 p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-[#16161F]/90 border border-[#2A2A38] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
              title="Close Player"
            >
              <X size={20} />
            </button>

            {/* Left Column: Player (Theater View) */}
            <div className="flex-1 lg:col-span-2 bg-black flex flex-col">
              <div className="relative aspect-video w-full flex-1 bg-black">
                <video
                  ref={videoRef}
                  key={activeVideoIndex}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                  src={tutorials[activeVideoIndex].videoUrl}
                  onPlay={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = playbackSpeed;
                    }
                  }}
                />
              </div>
              <div className="p-5 border-t border-[#2A2A38] max-h-[220px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/20">
                    MASTERCLASS
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                    SILENT WALKTHROUGH
                  </span>
                  <span className="text-xs text-[#8B8B9E] font-mono">
                    Duration: {tutorials[activeVideoIndex].duration}
                  </span>
                  
                  {/* Playback Speed Toggles */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[9px] uppercase text-[#8B8B9E] font-mono mr-1">Speed</span>
                    {[0.5, 1, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                          playbackSpeed === speed
                            ? 'bg-[#4edea3]/10 border-[#4edea3] text-[#4edea3]'
                            : 'bg-transparent border-[#2A2A38] text-[#8B8B9E] hover:border-[#8B8B9E]/50'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {tutorials[activeVideoIndex].title}
                </h4>
                <p className="text-sm text-[#8B8B9E] leading-relaxed mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {tutorials[activeVideoIndex].description}
                </p>

                {/* Step by Step Guide (Useful for Silent/Unvoiced Screen Records) */}
                {tutorials[activeVideoIndex].steps && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A38]/50">
                    <span className="text-[10px] font-semibold tracking-wider font-mono text-[#A0A0D2] uppercase block mb-2">
                      Key Steps Shown in Video:
                    </span>
                    <ul className="space-y-1.5">
                      {tutorials[activeVideoIndex].steps.map((step, sIdx) => (
                        <li key={sIdx} className="text-xs text-[#8B8B9E] flex items-start gap-2 leading-relaxed">
                          <span className="text-[#4edea3] font-mono font-semibold mt-0.5 shrink-0">{sIdx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Playlist */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#2A2A38] bg-[#16161F] flex flex-col max-h-[600px] lg:max-h-none overflow-y-auto">
              <div className="p-4 border-b border-[#2A2A38]">
                <h5 className="font-semibold text-[#F1F1F3] text-xs tracking-wider uppercase font-mono">
                  Tutorials & Guides
                </h5>
                <p className="text-[11px] text-[#8B8B9E] mt-1">
                  Learn how to master the AgentMark cluster
                </p>
              </div>
              <div className="flex-1 divide-y divide-[#2A2A38]/50">
                {tutorials.map((video, idx) => {
                  const isActive = idx === activeVideoIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveVideoIndex(idx)}
                      className={`w-full text-left p-4 transition-all flex items-start gap-3 border-l-2 ${
                        isActive 
                          ? 'border-[#4edea3] bg-[#111118]' 
                          : 'border-transparent hover:bg-[#111118]/50'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      {isActive ? (
                        <PlayCircle size={20} className="shrink-0 mt-0.5 text-[#4edea3]" />
                      ) : (
                        <Play size={20} className="shrink-0 mt-0.5 text-[#8B8B9E]" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#F1F1F3] line-clamp-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {video.title}
                        </div>
                        <div className="text-xs text-[#8B8B9E] mt-1 font-mono">
                          {video.duration}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

function Support() {
  return (
    <SidebarProvider>
      <SupportContent />
    </SidebarProvider>
  );
}

export default Support;
