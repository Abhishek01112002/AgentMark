import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Layers, ShieldCheck, Share2, Brain, PenLine, Image, Globe, Waypoints, Eye, Rocket, Hammer, HelpCircle, Mail, MessageCircle } from 'lucide-react';
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
    id: 'overview', title: 'Overview', icon: <Layers size={16} />,
    content: (
      <>
        <p className="lead">AgentMark is an AI-powered campaign orchestration platform. Define a campaign once and specialized agents generate copy, visuals, research, review scores, and a publishing plan.</p>
        <div className="feature-grid">
          <div className="feature-card"><div className="feature-icon"><Layers size={18} /></div><div><strong>Multi-agent pipeline</strong><span>7 agents collaborate across the campaign lifecycle — from strategy through review</span></div></div>
          <div className="feature-card"><div className="feature-icon"><ShieldCheck size={18} /></div><div><strong>Human-in-the-loop</strong><span>Optional approval gate before outputs are finalized</span></div></div>
          <div className="feature-card"><div className="feature-icon"><Brain size={18} /></div><div><strong>Memory Hub</strong><span>Stores brand voice, tones, and review history from past campaigns</span></div></div>
          <div className="feature-card"><div className="feature-icon"><Share2 size={18} /></div><div><strong>Publishing plan</strong><span>Generate a structured publishing plan with calendar and asset checklist</span></div></div>
        </div>
      </>
    )
  },
  {
    id: 'quickstart', title: 'Quick Start', icon: <Rocket size={16} />,
    content: (
      <>
        <div className="step-flow">Dashboard<ChevronRight size={13} />New Campaign<ChevronRight size={13} />Fill brief<ChevronRight size={13} />Channels<ChevronRight size={13} />Strategy<ChevronRight size={13} />Generate</div>
        <div className="steps-list">
          <div className="step-item"><div className="step-num">1</div><div>Click <strong>New Campaign</strong> from the dashboard or project view.</div></div>
          <div className="step-item"><div className="step-num">2</div><div>Complete the brief: name, project, objective, audience, channels.</div></div>
          <div className="step-item"><div className="step-num">3</div><div>Choose a <strong>Strategy</strong> template or configure agents manually.</div></div>
          <div className="step-item"><div className="step-num">4</div><div>Enable review if required, then click <strong>Generate</strong>.</div></div>
        </div>
        <p>When ready, review outputs per agent and approve or request changes.</p>
      </>
    )
  },
  {
    id: 'concepts', title: 'Concepts', icon: <Waypoints size={16} />,
    content: (
      <>
        <div className="concept-cards">
          <div className="concept-card"><h4>Projects</h4><p>Containers that group campaigns — like folders for a product launch or client account.</p></div>
          <div className="concept-card"><h4>Campaigns</h4><p>Single marketing runs with defined objectives, audience, channels, and agent outputs.</p></div>
          <div className="concept-card"><h4>Strategies</h4><p>Reusable templates defining agent lineup. Built-in: Launch, Always-On, Seasonal. Custom strategies can be saved.</p></div>
        </div>
        <h4>Campaign States</h4>
        <table>
          <thead><tr><th>State</th><th>Description</th></tr></thead>
          <tbody>
            <tr><td><span className="tag tag-blue">Draft</span></td><td>Being configured, not yet generated</td></tr>
            <tr><td><span className="tag tag-blue">Processing</span></td><td>Agents actively producing outputs</td></tr>
            <tr><td><span className="tag tag-blue">Awaiting Approval</span></td><td>Complete, pending human review</td></tr>
            <tr><td><span className="tag tag-green">Completed</span></td><td>Successfully generated and all outputs finalized</td></tr>
            <tr><td><span className="tag tag-red">Failed</span></td><td>Error during generation</td></tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'agents', title: 'Agents', icon: <Brain size={16} />,
    content: (
      <>
        <p>Specialized AI workers, each with a defined role and output format:</p>
        <div className="agent-grid">
          <div className="agent-card"><div className="agent-icon"><PenLine size={16} /></div><h5>Copywriter</h5><p>Ad copy, email body, SMS text, landing pages. Brand voice can be set at the campaign level.</p></div>
          <div className="agent-card"><div className="agent-icon"><Image size={16} /></div><h5>Image Prompt</h5><p>Detailed prompts for AI image generation. Configure style, aspect ratio, and references.</p></div>
          <div className="agent-card"><div className="agent-icon"><Globe size={16} /></div><h5>Research</h5><p>Market context, competitor intel, and citations from web sources and stored knowledge.</p></div>
          <div className="agent-card"><div className="agent-icon"><Waypoints size={16} /></div><h5>Strategy</h5><p>Campaign structure and agent execution sequence.</p></div>
          <div className="agent-card"><div className="agent-icon"><Hammer size={16} /></div><h5>Manager</h5><p>Coordinates agent execution and handoffs across the pipeline.</p></div>
          <div className="agent-card"><div className="agent-icon"><Eye size={16} /></div><h5>Reviewer</h5><p>Evaluates outputs for tone, clarity, policy compliance. Produces a scorecard with feedback.</p></div>
          <div className="agent-card"><div className="agent-icon"><Share2 size={16} /></div><h5>Publisher</h5><p>Produces a structured publishing plan with calendar, asset checklist, and projected metrics.</p></div>
        </div>
      </>
    )
  },
  {
    id: 'publishing', title: 'Publishing', icon: <Share2 size={16} />,
    content: (
      <>
        <p>The Publisher agent generates a structured <strong>publishing plan</strong> as part of campaign output. This includes a publishing decision, content calendar, asset checklist, and projected metrics. Actual dispatch to external platforms is not yet implemented — the plan serves as a handoff document.</p>
      </>
    )
  },
  {
    id: 'memory', title: 'Memory', icon: <Brain size={16} />,
    content: (
      <>
        <p>Memory Hub stores brand voice details, tone configurations, and revision history across campaigns to maintain long-term brand consistency.</p>
        <div className="feature-grid">
          <div className="feature-card"><div className="feature-icon"><Brain size={18} /></div><div><strong>Brand Voice & Tone</strong><span>Learned style parameters automatically injected into new agent prompts</span></div></div>
          <div className="feature-card"><div className="feature-icon"><Layers size={18} /></div><div><strong>Historical Insights</strong><span>Aggregated scores, approval rates, and revision hotspots</span></div></div>
        </div>

        <h4 className="mt-6">Dashboard Metrics</h4>
        <ul>
          <li><strong>Average Quality Score:</strong> The average rating score computed across all completed campaigns.</li>
          <li><strong>Approved on 1st Try:</strong> The percentage of campaigns that were approved directly by the human reviewer without revisions.</li>
          <li><strong>Revision Focus:</strong> The agent that received the most human feedback instructions, highlighting improvement areas.</li>
        </ul>

        <h4>Campaign Memory Timeline Indicators</h4>
        <table>
          <thead>
            <tr>
              <th>Indicator</th>
              <th>Status</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Numeric Value</strong> (e.g., 93)</td>
              <td>Finalized</td>
              <td>The final review score given to the campaign upon successful completion.</td>
            </tr>
            <tr>
              <td><strong>Dash</strong> (—)</td>
              <td>In Progress / Paused</td>
              <td>Displays when a campaign is active, processing, or awaiting human approval (no final score is saved yet).</td>
            </tr>
            <tr>
              <td><strong>Green Dot with Check</strong></td>
              <td>Direct Approval</td>
              <td>The campaign was approved on the first attempt without any human feedback revisions.</td>
            </tr>
            <tr>
              <td><strong>Red/Orange Dot with Cross</strong></td>
              <td>Revised</td>
              <td>Human revisions were requested and processed before the campaign was finalized.</td>
            </tr>
            <tr>
              <td><strong>Green Color Code</strong></td>
              <td>Quality Score &ge; 80</td>
              <td>Indicates high quality outputs meeting the top tier evaluation baseline.</td>
            </tr>
            <tr>
              <td><strong>Orange Color Code</strong></td>
              <td>Quality Score &ge; 60</td>
              <td>Indicates average quality outputs.</td>
            </tr>
            <tr>
              <td><strong>Red Color Code</strong></td>
              <td>Quality Score &lt; 60</td>
              <td>Indicates low score threshold or an incomplete campaign run.</td>
            </tr>
          </tbody>
        </table>
      </>
    )
  },
  {
    id: 'settings', title: 'Settings', icon: <Hammer size={16} />,
    content: (
      <>
        <h4>API Keys</h4>
        <p>Configure provider API keys for LLM and search services. Keys are stored locally in your browser and sent per-request via headers. Available providers: OpenAI, Gemini, Groq, Tavily.</p>
        <h4>Notifications</h4>
        <p>Configure alerts for campaign events: generation complete, review required, publish status, agent failures.</p>
      </>
    )
  },
  {
    id: 'troubleshooting', title: 'Troubleshooting', icon: <HelpCircle size={16} />,
    content: (
      <>
        <table>
          <thead><tr><th>Issue</th><th>Try</th></tr></thead>
          <tbody>
            <tr><td>Campaign stuck on "Generating"</td><td>Refresh. Disable non-essential agents and retry if persistent.</td></tr>
            <tr><td>Agent shows error state</td><td>Restart from campaign view. Provider pool auto-fails over to next available LLM.</td></tr>
            <tr><td>Output quality below expectations</td><td>Provide clearer audience descriptions and brand references.</td></tr>
          </tbody>
        </table>
        <div className="help-box">
          <HelpCircle size={18} />
          <div><strong>When contacting support</strong><span>Include campaign ID, browser/OS version, screenshots, and steps to reproduce.</span></div>
        </div>
      </>
    )
  },
  {
    id: 'contact', title: 'Contact', icon: <Mail size={16} />,
    content: (
      <>
        <p>Need help? Reach out to the AgentMark team:</p>
        <div className="contact-grid">
          <a href="mailto:info@novateches.com" className="contact-card">
            <div className="contact-icon"><Mail size={18} /></div>
            <div><strong>Email Us</strong><span>info@novateches.com</span></div>
          </a>
          <a href="https://wa.me/916366411798" target="_blank" rel="noopener noreferrer" className="contact-card">
            <div className="contact-icon"><MessageCircle size={18} /></div>
            <div><strong>Live Chat</strong><span>+91 63664 11798</span></div>
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
        .toc-bar { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 1px solid #1f2937; }
        .toc-pill { display: inline-flex; align-items: center; gap: 5px; padding: 5px 10px; border-radius: 5px; font-size: 12px; color: #6b7280; text-decoration: none; transition: all 0.12s ease; white-space: nowrap; border: 1px solid transparent; }
        .toc-pill:hover { color: #d1d5db; background: rgba(255,255,255,0.03); border-color: #1f2937; }
        .toc-pill.active { color: #a5b4fc; background: rgba(99,102,241,0.08); border-color: rgba(99,102,241,0.15); }
        .toc-pill svg { opacity: 0.5; }
        .toc-pill.active svg { opacity: 1; color: #818cf8; }

        /* Content */
        .doc-content h2 { font-size: 22px; font-weight: 600; margin: 40px 0 16px; color: #f1f1f3; scroll-margin-top: 80px; letter-spacing: -0.2px; }
        .doc-content section { scroll-margin-top: 72px; }
        .doc-content h4 { font-size: 14px; font-weight: 600; margin: 24px 0 8px; color: #e5e7eb; }
        .doc-content p { font-size: 14px; color: #9ca3af; line-height: 1.75; margin-bottom: 14px; }
        .doc-content p.lead { font-size: 15px; color: #d1d5db; line-height: 1.85; margin-bottom: 20px; }
        .doc-content strong { color: #e5e7eb; font-weight: 600; }
        .doc-content code { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; background: #1a1a24; padding: 2px 6px; border-radius: 4px; color: #a5b4fc; }
        .doc-content a { color: #a5b4fc; transition: color 0.15s; }
        .doc-content a:hover { color: #818cf8; }

        /* Tables */
        .doc-content table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 16px 0; font-size: 13px; border-radius: 8px; overflow: hidden; border: 1px solid #1f2937; }
        .doc-content th { padding: 10px 14px; text-align: left; background: #0a0a0f; color: #d1d5db; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px; border-bottom: 1px solid #1f2937; }
        .doc-content td { padding: 10px 14px; border-bottom: 1px solid #1a1a24; color: #9ca3af; }
        .doc-content tr:last-child td { border-bottom: none; }
        .doc-content tr:hover td { background: rgba(255,255,255,0.015); }

        /* Tags */
        .tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 600; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.2px; }
        .tag-blue { background: rgba(99,102,241,0.1); color: #a5b4fc; }
        .tag-green { background: rgba(52,211,153,0.1); color: #6ee7b7; }
        .tag-red { background: rgba(244,63,94,0.1); color: #fb7185; }

        /* Feature grid */
        .feature-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 16px 0; }
        @media (min-width: 640px) { .feature-grid { grid-template-columns: 1fr 1fr; } }
        .feature-card { display: flex; gap: 10px; padding: 12px 14px; background: #111118; border: 1px solid #1f2937; border-radius: 8px; transition: all 0.15s; }
        .feature-card:hover { border-color: #374151; }
        .feature-icon { width: 32px; height: 32px; border-radius: 6px; background: rgba(99,102,241,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .feature-icon svg { color: #818cf8; }
        .feature-card strong { display: block; font-size: 12.5px; color: #e5e7eb; margin-bottom: 1px; }
        .feature-card span { font-size: 12px; color: #6b7280; line-height: 1.5; }

        /* Step flow */
        .step-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; padding: 10px 14px; background: #111118; border: 1px solid #1f2937; border-radius: 8px; margin: 14px 0; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #9ca3af; }
        .step-flow svg { color: #6366f1; }
        .step-flow span { font-weight: 500; }

        /* Steps list */
        .steps-list { margin: 14px 0; }
        .step-item { display: flex; gap: 10px; align-items: flex-start; padding: 8px 0; }
        .step-num { width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #6366f1, #8b5cf6); display: flex; align-items: center; justify-content: center; font-size: 10.5px; font-weight: 700; color: #fff; flex-shrink: 0; margin-top: 1px; }
        .step-item div { font-size: 13.5px; color: #9ca3af; line-height: 1.65; }

        /* Concept cards */
        .concept-cards { display: grid; grid-template-columns: 1fr; gap: 10px; margin: 14px 0; }
        @media (min-width: 640px) { .concept-cards { grid-template-columns: 1fr 1fr 1fr; } }
        .concept-card { padding: 16px; background: #111118; border: 1px solid #1f2937; border-radius: 8px; transition: all 0.15s; }
        .concept-card:hover { border-color: #374151; }
        .concept-card h4 { font-size: 13px; margin: 0 0 5px; color: #e5e7eb; }
        .concept-card p { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.55; }

        /* Agent grid */
        .agent-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 14px 0; }
        @media (min-width: 640px) { .agent-grid { grid-template-columns: 1fr 1fr; } }
        .agent-card { padding: 14px; background: #111118; border: 1px solid #1f2937; border-radius: 8px; transition: all 0.15s; }
        .agent-card:hover { border-color: #374151; }
        .agent-icon { width: 28px; height: 28px; border-radius: 6px; background: rgba(99,102,241,0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
        .agent-icon svg { color: #818cf8; }
        .agent-card h5 { font-size: 13px; font-weight: 600; color: #e5e7eb; margin: 0 0 4px; }
        .agent-card p { font-size: 12px; color: #6b7280; margin: 0; line-height: 1.55; }

        /* Help box */
        .help-box { display: flex; gap: 10px; padding: 12px 16px; background: rgba(99,102,241,0.03); border: 1px solid rgba(99,102,241,0.1); border-radius: 8px; margin: 16px 0; }
        .help-box svg { color: #818cf8; flex-shrink: 0; margin-top: 1px; }
        .help-box strong { display: block; font-size: 12.5px; color: #e5e7eb; margin-bottom: 1px; }
        .help-box span { font-size: 12.5px; color: #6b7280; }

        /* Contact grid */
        .contact-grid { display: grid; grid-template-columns: 1fr; gap: 8px; margin: 16px 0; }
        @media (min-width: 480px) { .contact-grid { grid-template-columns: 1fr 1fr; } }
        .contact-card { display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: #111118; border: 1px solid #1f2937; border-radius: 8px; text-decoration: none; transition: all 0.15s; }
        .contact-card:hover { border-color: #374151; background: #16161f; }
        .contact-icon { width: 36px; height: 36px; border-radius: 8px; background: rgba(99,102,241,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .contact-icon svg { color: #818cf8; }
        .contact-card strong { display: block; font-size: 13px; color: #e5e7eb; margin-bottom: 1px; font-weight: 600; }
        .contact-card span { font-size: 12.5px; color: #6b7280; }

        /* Section animation */
        .doc-content section { opacity: 0; transform: translateY(8px); animation: fadeUp 0.35s ease-out forwards; }
        .doc-content section:nth-child(1) { animation-delay: 0.04s; }
        .doc-content section:nth-child(2) { animation-delay: 0.08s; }
        .doc-content section:nth-child(3) { animation-delay: 0.12s; }
        .doc-content section:nth-child(4) { animation-delay: 0.16s; }
        .doc-content section:nth-child(5) { animation-delay: 0.2s; }
        .doc-content section:nth-child(6) { animation-delay: 0.24s; }
        .doc-content section:nth-child(7) { animation-delay: 0.28s; }
        .doc-content section:nth-child(8) { animation-delay: 0.28s; }
        .doc-content section:nth-child(9) { animation-delay: 0.32s; }
        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

        /* Back button */
        .back-btn { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: #6b7280; transition: color 0.15s; }
        .back-btn:hover { color: #d1d5db; }
        .back-btn svg { transition: transform 0.15s; }
        .back-btn:hover svg { transform: translateX(-2px); }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Documentation" />

        <main className="docs-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-4 py-6 sm:px-5 md:px-8 lg:px-10 xl:px-14 2xl:px-16 w-full">
            <button onClick={() => navigate('/support')} className="back-btn mb-4">
              <ArrowLeft size={13} /> Back to Support
            </button>

            <div className="mb-5">
              <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#f1f1f3', letterSpacing: '-0.3px' }}>Documentation</h1>
            </div>

            {/* TOC pills — desktop + mobile, no sidebar */}
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

              <hr style={{ borderColor: '#1f2937', margin: '48px 0 24px' }} />
              <p className="text-xs pb-8" style={{ color: '#4b5563' }}>&copy; 2026 AgentMark</p>
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
