import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, ChevronRight, ShieldCheck, Brain, PenLine, 
  HelpCircle, Mail, Sparkles, Target, Zap, Search, Workflow, Globe2, 
  Palette, Send, Users, Rocket, Waypoints, Eye, Lightbulb, 
  CheckCircle2, RotateCcw, Terminal, ExternalLink, Check,
  Layers, Copy, Wand2, HelpCircle as QuestionIcon
} from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

// Standard 100% Un-truncated Official Green WhatsApp SVG Icon Component
const WhatsAppLogo: React.FC<{ size?: number; className?: string }> = ({ size = 18, className = '' }) => (
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
    icon: <Sparkles size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-normal">
          <strong className="text-white font-semibold">AgentMark</strong> is an all-in-one AI Marketing Department in your browser. Simply provide a high-level campaign goal, and <strong className="text-indigo-300 font-semibold">7 autonomous AI specialist agents</strong> collaborate to conduct live web market research, formulate positioning strategy, write multi-channel copy, generate visual art prompts, run audience focus group simulations, and generate your posting calendar — all in under 90 seconds.
        </p>

        {/* Hero Banner */}
        <div className="p-4 sm:p-6 md:p-7 rounded-2xl bg-gradient-to-br from-indigo-950/50 via-[#12121a] to-purple-950/30 border border-indigo-500/30 shadow-xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
            <Zap size={13} className="text-indigo-400" /> 10x Faster Marketing Output
          </div>
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Automate Your Marketing Lifecycle with AI Agent Collaboration
          </h3>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed max-w-3xl">
            No more waiting weeks for marketing agencies or guessing which ad copy will convert. AgentMark delivers complete, high-converting marketing campaigns tailored specifically to your unique brand voice.
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 py-3">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-indigo-400">7 AI Agents</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Autonomous Team</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-emerald-400">45-90s</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Average Delivery Speed</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-purple-400">6+ Channels</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Multi-Channel Copy</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] text-center shadow-md">
            <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-cyan-400">100%</div>
            <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5">Human Control & Oversight</div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'quickstart',
    title: '2. Quick Start User Guide',
    category: 'Getting Started',
    icon: <Rocket size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Creating and launching a campaign with AgentMark takes just 4 easy steps:</p>

        {/* Step Ribbon */}
        <div className="p-4 md:p-5 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-center flex-wrap gap-2 text-xs font-mono text-slate-300 shadow-sm">
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">1. Dashboard</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">2. New Campaign</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">3. Fill Brief</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">4. AI Execution</span>
          <ChevronRight size={13} className="text-slate-500" />
          <span className="px-3 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30">5. Review & Publish</span>
        </div>

        <div className="space-y-4">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-3 sm:gap-4 shadow-sm">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-md">1</div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Create a Project Workspace & Fill Your Brief</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Click <strong>"New Campaign"</strong> from your dashboard. Select your project workspace, enter your brand name, target audience (e.g. <em>B2B Founders aged 25-45</em>), campaign goal, and preferred tone of voice (e.g. <em>Bold, Professional, Energetic</em>).
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-3 sm:gap-4 shadow-sm">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-md">2</div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Launch the 7 AI Agents</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Click <strong>"Launch Campaign"</strong>. Watch real-time status updates as each AI specialist conducts live research, creates strategy pillars, drafts multi-channel copy, and audits quality.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-3 sm:gap-4 shadow-sm">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-md">3</div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Run Synthetic Focus Group Testing</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Navigate to the Focus Group tab to simulate real consumer reactions. Review objection quotes, click probabilities, and actionable copy improvements before spending real ad budget.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-3 sm:gap-4 shadow-sm">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 shadow-md">4</div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Approve & Publish</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Click <strong>"Approve Campaign"</strong>. Use one-click bridges to post directly to X (Twitter), compose in Gmail, copy formatted text for LinkedIn, or copy image prompts for Midjourney & DALL-E 3.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#12121a] border border-indigo-500/30 text-xs md:text-sm shadow-sm space-y-1">
          <div className="font-bold text-indigo-300 flex items-center gap-1.5">
            <Lightbulb size={16} className="text-indigo-400 shrink-0" /> Prompt Tip for Best Copy Quality:
          </div>
          <div className="text-slate-300 font-mono text-[11px] leading-relaxed">
            "Be specific about your audience pain points in the brief! For example: 'Targeting SaaS founders struggling with high customer acquisition costs'."
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'usecases',
    title: '3. Real-World Use Cases & Prompt Examples',
    category: 'Guides',
    icon: <Sparkles size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Here are 3 concrete real-world campaign examples across different industries:</p>

        <div className="space-y-6">
          
          {/* Example 1: B2B SaaS Product Launch */}
          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">B2B SaaS Launch</span>
              <span className="text-[11px] font-mono text-slate-500">Example Campaign 01</span>
            </div>
            <h4 className="text-base font-bold text-white">AI Analytics Dashboard Launch</h4>
            
            {/* Input Query */}
            <div className="p-4 rounded-xl bg-[#0b0b0f] border-l-4 border-indigo-500 space-y-1.5 text-xs font-mono">
              <div className="text-indigo-300 font-bold flex items-center gap-1.5">
                <QuestionIcon size={14} className="text-indigo-400" /> Campaign Input Query:
              </div>
              <div className="text-slate-300 space-y-1 pl-3 border-l border-indigo-500/20 text-[11px]">
                <div>• <strong>Brand:</strong> DataPulse AI</div>
                <div>• <strong>Audience:</strong> CTOs & VPs of Data (Teams 20-500)</div>
                <div>• <strong>Goal:</strong> Drive 500 Free Trial Signups</div>
                <div>• <strong>Tone:</strong> Authoritative, Data-Driven, High-Tech</div>
              </div>
            </div>

            {/* AI Deliverables Output */}
            <div className="p-4 rounded-xl bg-[#161622] border-l-4 border-emerald-500 space-y-1.5 text-xs">
              <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> AI Agent Output Strategy & Deliverables:
              </div>
              <p className="text-slate-300 leading-relaxed pl-3 border-l border-emerald-500/20 text-[11px]">
                Delivers a technical LinkedIn article on data silos, an X thread breaking down real-time metrics, a promotional cold email sequence, and DALL-E prompt for futuristic dashboard artwork.
              </p>
            </div>
          </div>

          {/* Example 2: D2C E-Commerce Flash Sale */}
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">D2C E-Commerce</span>
              <span className="text-[11px] font-mono text-slate-500">Example Campaign 02</span>
            </div>
            <h4 className="text-base font-bold text-white">Fashion Summer Flash Sale</h4>
            
            {/* Input Query */}
            <div className="p-4 rounded-xl bg-[#0b0b0f] border-l-4 border-emerald-500 space-y-1.5 text-xs font-mono">
              <div className="text-emerald-300 font-bold flex items-center gap-1.5">
                <QuestionIcon size={14} className="text-emerald-400" /> Campaign Input Query:
              </div>
              <div className="text-slate-300 space-y-1 pl-3 border-l border-emerald-500/20 text-[11px]">
                <div>• <strong>Brand:</strong> UrbanThread Co.</div>
                <div>• <strong>Audience:</strong> Gen-Z & Millennial Fashion Enthusiasts (18-34)</div>
                <div>• <strong>Goal:</strong> 48-Hour Summer Sale Revenue Conversion</div>
                <div>• <strong>Tone:</strong> Bold, Energetic, FOMO-Inducing</div>
              </div>
            </div>

            {/* AI Deliverables Output */}
            <div className="p-4 rounded-xl bg-[#161622] border-l-4 border-indigo-500 space-y-1.5 text-xs">
              <div className="text-indigo-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> AI Agent Output Strategy & Deliverables:
              </div>
              <p className="text-slate-300 leading-relaxed pl-3 border-l border-indigo-500/20 text-[11px]">
                Generates punchy Instagram & TikTok caption hooks, urge-to-buy SMS copy, a high-converting broadcast email with discount codes, and Midjourney lifestyle photoshoot prompts.
              </p>
            </div>
          </div>

          {/* Example 3: Mobile App User Acquisition */}
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30">Mobile App Acquisition</span>
              <span className="text-[11px] font-mono text-slate-500">Example Campaign 03</span>
            </div>
            <h4 className="text-base font-bold text-white">Fintech Savings App Campaign</h4>
            
            {/* Input Query */}
            <div className="p-4 rounded-xl bg-[#0b0b0f] border-l-4 border-purple-500 space-y-1.5 text-xs font-mono">
              <div className="text-purple-300 font-bold flex items-center gap-1.5">
                <QuestionIcon size={14} className="text-purple-400" /> Campaign Input Query:
              </div>
              <div className="text-slate-300 space-y-1 pl-3 border-l border-purple-500/20 text-[11px]">
                <div>• <strong>Brand:</strong> SmartStash App</div>
                <div>• <strong>Audience:</strong> Young Professionals saving for first home</div>
                <div>• <strong>Goal:</strong> iOS App Store Downloads & Account Deposits</div>
                <div>• <strong>Tone:</strong> Empathetic, Trustworthy, Simple</div>
              </div>
            </div>

            {/* AI Deliverables Output */}
            <div className="p-4 rounded-xl bg-[#161622] border-l-4 border-cyan-500 space-y-1.5 text-xs">
              <div className="text-cyan-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={14} /> AI Agent Output Strategy & Deliverables:
              </div>
              <p className="text-slate-300 leading-relaxed pl-3 border-l border-cyan-500/20 text-[11px]">
                Runs Synthetic Focus Groups discovering user objections around trust, reassuring social ad copy, and a step-by-step onboarding email.
              </p>
            </div>
          </div>

        </div>
      </div>
    )
  },
  {
    id: 'variants',
    title: '4. Creative Copy Variants & Version History',
    category: 'Features',
    icon: <Copy size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Need alternative copy options for specific social channels? AgentMark allows on-demand copy variant generation and version tracking:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-4 shadow-md">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0"><Wand2 size={20} /></div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Generate Alternative Copy Variants</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                In the Copywriter tab, click <strong>"Generate Variant"</strong> on any channel card (e.g. X or LinkedIn). Type custom steering notes like <em>"Make this 50% shorter with punchy bullet points"</em> to create targeted variations.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] flex items-start gap-4 shadow-md">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0"><Layers size={20} /></div>
            <div>
              <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Version History & Steered Logs</strong>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Every generated variant is saved in your campaign's Version History. Compare draft versions side by side, restore past copy revisions, or submit individual variants to Focus Group simulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'concepts',
    title: '5. Campaign Lifecycle & Status Badges',
    category: 'Workflow',
    icon: <Waypoints size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Every campaign in AgentMark moves through transparent lifecycle states so you always know what is happening:</p>

        <div className="overflow-x-auto rounded-2xl border border-[#1e1e2d] shadow-lg">
          <table className="w-full text-left text-xs bg-[#12121a]">
            <thead className="bg-[#0b0b0f] text-slate-300 uppercase text-[11px] font-bold border-b border-[#1e1e2d]">
              <tr>
                <th className="p-4">Status Badge</th>
                <th className="p-4">Meaning & Description</th>
                <th className="p-4">System Behavior & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e1e2d] text-slate-300">
              <tr>
                <td className="p-4"><span className="px-3 py-1 rounded-md font-mono text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">Draft</span></td>
                <td className="p-4">Campaign brief is filled but generation hasn't started yet.</td>
                <td className="p-4 text-slate-400">Click "Launch Campaign" to trigger execution.</td>
              </tr>
              <tr>
                <td className="p-4"><span className="px-3 py-1 rounded-md font-mono text-[11px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">Processing</span></td>
                <td className="p-4">The 7 AI agents are actively running live web search and copywriting.</td>
                <td className="p-4 text-slate-400">Wait ~60 seconds. Progress streams live.</td>
              </tr>
              <tr>
                <td className="p-4"><span className="px-3 py-1 rounded-md font-mono text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">Awaiting Approval</span></td>
                <td className="p-4">AI execution is complete! Assets are paused for human review.</td>
                <td className="p-4 text-slate-400">Approve campaign or request targeted agent revisions.</td>
              </tr>
              <tr>
                <td className="p-4"><span className="px-3 py-1 rounded-md font-mono text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">Completed</span></td>
                <td className="p-4">Campaign approved! Memory Hub updated and assets ready to publish.</td>
                <td className="p-4 text-slate-400">Use one-click bridges to dispatch creative copy.</td>
              </tr>
              <tr>
                <td className="p-4"><span className="px-3 py-1 rounded-md font-mono text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">Failed</span></td>
                <td className="p-4">Transient issue encountered during agent run.</td>
                <td className="p-4 text-slate-400">Click "Retry" button for instant recovery.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    )
  },
  {
    id: 'agents',
    title: '6. Meet Your 7 AI Specialist Agents',
    category: 'AI Agents',
    icon: <Brain size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-6">
        <p className="text-xs md:text-sm text-slate-200">Here is a breakdown of how each of the 7 AI agents contributes to your campaign:</p>

        {/* Distinct Luxury Colored Cards for Each AI Agent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          
          {/* Agent 1: Manager */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#12121a] to-indigo-900/10 border border-indigo-500/30 hover:border-indigo-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 group-hover:scale-105 transition-transform">
                  <Workflow size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-indigo-200 text-base">1. Manager Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-bold">Orchestrator</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Orchestrates execution flow across all 7 agents, parses campaign briefs, injects memory context, and ensures handoff integrity.
            </p>
          </div>

          {/* Agent 2: Market Research */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-cyan-950/40 via-[#12121a] to-cyan-900/10 border border-cyan-500/30 hover:border-cyan-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:scale-105 transition-transform">
                  <Globe2 size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-cyan-200 text-base">2. Market Research Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">Live Web Search</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Scans live Google and Tavily web data to find trending market topics, competitor positioning, target audience pain points, and live citations.
            </p>
          </div>

          {/* Agent 3: Brand Strategy */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-purple-950/40 via-[#12121a] to-purple-900/10 border border-purple-500/30 hover:border-purple-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:scale-105 transition-transform">
                  <Target size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-purple-200 text-base">3. Brand Strategy Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold">Positioning & Hooks</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Builds key positioning pillars, unique value propositions (UVPs), emotional hook angles, and campaign themes tailored to your audience.
            </p>
          </div>

          {/* Agent 4: Copywriter */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-[#12121a] to-emerald-900/10 border border-emerald-500/30 hover:border-emerald-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                  <PenLine size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-emerald-200 text-base">4. Copywriter Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">Multi-Channel Copy</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Writes channel-optimized copy for X (Twitter) threads, LinkedIn posts, promotional emails, digital ad copy, and SEO blog intros.
            </p>
          </div>

          {/* Agent 5: Visual Prompt */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#12121a] to-amber-900/10 border border-amber-500/30 hover:border-amber-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:scale-105 transition-transform">
                  <Palette size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-amber-200 text-base">5. Visual Prompt Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Art Direction Prompts</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Generates high-detail art direction prompts matching your campaign moodboard for DALL-E 3, Midjourney, Imagen 3, and Flux generators.
            </p>
          </div>

          {/* Agent 6: Quality Reviewer */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-rose-950/40 via-[#12121a] to-rose-900/10 border border-rose-500/30 hover:border-rose-500/60 shadow-lg transition-all group">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 group-hover:scale-105 transition-transform">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-rose-200 text-base">6. Quality Reviewer Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">Policy & Quality Audit</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Audits copy outputs for brand safety, readability, and policy compliance, producing a comprehensive Quality Rating (0-100%).
            </p>
          </div>

          {/* Agent 7: Distribution Publisher */}
          <div className="p-6 md:p-7 rounded-2xl bg-gradient-to-br from-teal-950/40 via-[#12121a] to-teal-900/10 border border-teal-500/30 hover:border-teal-500/60 shadow-lg transition-all group col-span-1 md:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 group-hover:scale-105 transition-transform">
                  <Send size={22} />
                </div>
                <div>
                  <h5 className="font-bold text-teal-200 text-base">7. Distribution Publisher Specialist</h5>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold">1-Click Dispatch & Calendar</span>
                </div>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Formats publication schedules, asset checklists, and one-click bridges for immediate social media broadcast across channels.
            </p>
          </div>

        </div>
      </div>
    )
  },
  {
    id: 'hitl',
    title: '7. Human Approval & Targeted Revisions',
    category: 'Workflow',
    icon: <ShieldCheck size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">You hold <strong>100% creative control</strong>. When the AI agents finish their initial draft, the campaign pauses at the Human Approval Gate:</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-[#12121a] to-emerald-950/10 border border-emerald-500/30 shadow-md">
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm md:text-base mb-2">
              <CheckCircle2 size={18} /> Option A: Approve Campaign
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              If satisfied, click <strong>"Approve Campaign"</strong>. Saves successful messaging angles into your Memory Hub and unlocks 1-click publishing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/30 via-[#12121a] to-amber-950/10 border border-amber-500/30 shadow-md">
            <div className="flex items-center gap-2 font-bold text-amber-400 text-sm md:text-base mb-2">
              <RotateCcw size={18} /> Option B: Request Targeted Revisions
            </div>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Select specific agents to revise (e.g. <em>Copywriter</em>), enter feedback notes (e.g. <em>"Make headline punchier"</em>), and click <strong>"Submit Revision"</strong>.
            </p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'focus-groups',
    title: '8. Synthetic Focus Group Audience Testing',
    category: 'Features',
    icon: <Eye size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">Test your marketing copy against representative consumer personas before spending ad money:</p>

        <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
          <h4 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
            <Users size={18} className="text-indigo-400" /> Focus Group Metrics & Objection Analysis:
          </h4>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs md:text-sm text-slate-300">
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Sentiment Score (0-100%):</strong> Persona approval rating.
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Click-Intent %:</strong> Probability of users clicking your CTA.
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Consumer Objections:</strong> Pinpoints exact hesitation reasons.
            </li>
            <li className="flex items-center gap-2">
              <Check size={16} className="text-indigo-400 shrink-0" />
              <strong>Copy Rewrite Tips:</strong> Actionable suggestions per demographic.
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'mcp',
    title: '9. Claude Desktop & MCP Integration',
    category: 'Integrations',
    icon: <Waypoints size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">
          You can connect AgentMark directly to <strong>Claude Desktop</strong> (Anthropic's desktop app) using something called <strong>MCP (Model Context Protocol)</strong>. Think of MCP as a bridge that lets Claude talk to AgentMark — so you can create campaigns, test copy, and publish content right from your chat with Claude.
        </p>

        <div className="space-y-5">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <h4 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
              <Terminal size={18} className="text-indigo-400" /> Step 1: Install the MCP Server
            </h4>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Make sure you have <strong>Node.js (v18 or higher)</strong> installed on your computer. Then open your terminal and run:
            </p>
            <div className="p-3 sm:p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d] font-mono text-[11px] md:text-xs text-indigo-300 leading-relaxed overflow-x-auto">
              npx @novateches/agentmark-mcp
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              This command downloads and starts the AgentMark MCP server on your machine. Keep this terminal window open — the server needs to keep running.
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <h4 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
              <Terminal size={18} className="text-indigo-400" /> Step 2: Connect Claude Desktop to AgentMark
            </h4>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Open <strong>Claude Desktop</strong> and go to <strong>Settings → MCP Servers</strong>. Click <strong>"Add Server"</strong> and paste the following:
            </p>
            <div className="p-3 sm:p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d] font-mono text-[11px] md:text-xs text-indigo-300 leading-relaxed overflow-x-auto">
              {`{
  "mcpServers": {
    "agentmark": {
      "command": "npx",
      "args": ["@novateches/agentmark-mcp"]
    }
  }
}`}
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
              Save the settings and restart Claude Desktop. You should see a small <strong>plug icon</strong> appear — that means AgentMark is connected!
            </p>
          </div>

          <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
            <h4 className="text-white font-bold text-sm md:text-base flex items-center gap-2">
              <Terminal size={18} className="text-indigo-400" /> Step 3: Start Using It
            </h4>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Once connected, just ask Claude in plain English. Here are some things you can say:
            </p>
            <ul className="space-y-3 text-xs md:text-sm text-slate-300">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                <span><strong className="text-white">"Create a new campaign"</strong> — Claude will ask you for your campaign details (brand name, audience, goal, tone) and launch the full 7-agent pipeline.</span>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                <span><strong className="text-white">"Test my ad copy with a focus group"</strong> — Claude will run a synthetic focus group simulation on your latest campaign copy and show you feedback scores.</span>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
                <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                <span><strong className="text-white">"Publish my campaign"</strong> — Claude will finalize your approved campaign and prepare everything for publishing.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 sm:p-6 rounded-2xl bg-[#12121a] border border-indigo-500/30 space-y-2">
          <p className="text-xs md:text-sm text-indigo-300 font-semibold flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400 shrink-0" /> Need Help?
          </p>
          <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
            If you run into any issues, make sure the MCP server terminal is still running, and that you've added the configuration exactly as shown above. You can also reach out to us on WhatsApp for step-by-step guidance.
          </p>
        </div>
      </div>
    )
  },
  {
    id: 'memory',
    title: '10. Memory Hub & Brand Intelligence',
    category: 'Features',
    icon: <Brain size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">Memory Hub records your brand guidelines, voice parameters, and revision history across past campaigns to guarantee continuous brand alignment over time.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-md">
            <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Brand Voice Guidelines</strong>
            <span className="text-xs md:text-sm text-slate-400 leading-relaxed block">Saved style parameters automatically injected into every new agent prompt.</span>
          </div>

          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-md">
            <strong className="text-white text-xs md:text-sm block mb-1 font-semibold">Historical Performance Insights</strong>
            <span className="text-xs md:text-sm text-slate-400 leading-relaxed block">Aggregated quality scores, approval rates, and revision hotspots.</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'api-keys',
    title: '11. API Keys & Provider Configuration',
    category: 'Setup',
    icon: <ShieldCheck size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">AgentMark uses your own API keys to run LLM calls across all 7 agents and the Research web search Tavily API. Keys are stored in your browser and sent per-request — no keys are stored on our servers.</p>

        <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-4 shadow-md">
          <h4 className="text-white text-sm font-bold">Supported Providers</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
              <strong className="text-indigo-300 text-xs block mb-1">Gemini</strong>
              <span className="text-[11px] text-slate-400">Google&apos;s LLM. Powers all 7 agents via SmartClient failover (position #2).</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
              <strong className="text-indigo-300 text-xs block mb-1">OpenAI / GitHub Models</strong>
              <span className="text-[11px] text-slate-400">GPT-4o / gpt-4o-mini via OpenAI API (sk-...) or free GitHub Models PAT. Tried first in failover chain.</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
              <strong className="text-indigo-300 text-xs block mb-1">Groq</strong>
              <span className="text-[11px] text-slate-400">Meta LLaMA via Groq. Fast, cheap inference. Position #3 in failover chain.</span>
            </div>
            <div className="p-4 rounded-xl bg-[#0b0b0f] border border-[#1e1e2d]">
              <strong className="text-emerald-300 text-xs block mb-1">Tavily</strong>
              <span className="text-[11px] text-slate-400">AI web search for the Research agent only. Not an LLM — does not generate campaign content.</span>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3 shadow-md">
          <h4 className="text-white text-sm font-bold">How Failover Works</h4>
          <p className="text-xs text-slate-400 leading-relaxed">When an LLM call fails (rate limit, timeout, outage), AgentMark automatically retries the next configured provider in the chain: OpenAI → Gemini → Groq. You only need one working key to run campaigns.</p>
        </div>

        <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] space-y-3 shadow-md">
          <h4 className="text-white text-sm font-bold">Adding Keys</h4>
          <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside">
            <li>Go to <strong className="text-indigo-300">Settings &gt; API Keys</strong>.</li>
            <li>Paste your key into the input field for the provider.</li>
            <li>Click <strong className="text-indigo-300">Test</strong> to verify the connection works.</li>
            <li>Click <strong className="text-indigo-300">Save</strong>. The key is stored locally in your browser.</li>
          </ol>
        </div>
      </div>
    )
  },
  {
    id: 'troubleshooting',
    title: '12. Frequently Asked Questions (FAQ)',
    category: 'Support',
    icon: <HelpCircle size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <div className="space-y-4">
          
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-sm space-y-2">
            <strong className="text-white text-xs md:text-sm block font-semibold">Q: How long does campaign generation take?</strong>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">A: Typically between 45 to 90 seconds depending on live web research queries and LLM provider speed.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-sm space-y-2">
            <strong className="text-white text-xs md:text-sm block font-semibold">Q: Can I edit or tweak copy generated by the Copywriter Agent?</strong>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed">A: Yes! You can edit text directly in the Copywriter tab, or use the "Request Revision" button in the review panel to let the AI rewrite it with your feedback notes.</p>
          </div>

        </div>
      </div>
    )
  },
  {
    id: 'contact',
    title: '12. Dedicated Support & Assistance',
    category: 'Support',
    icon: <Mail size={16} className="text-indigo-400" />,
    content: (
      <div className="space-y-5">
        <p className="text-xs md:text-sm text-slate-200">Need 1-on-1 assistance setting up your brand memory, configuring Claude MCP, or optimizing campaign prompts?</p>

        {/* Contact Cards with Scoped Hand Pointer */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-3">
          
          {/* Email Us Card */}
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#1e1e2d] shadow-lg flex flex-col items-start cursor-default">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Mail size={22} className="text-[#a5b4fc]" />
              </div>
              <div>
                <strong className="text-white text-base block font-bold">Email Us</strong>
                <span className="text-xs text-[#a5b4fc] font-mono">info@novateches.com</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-5">
              Send our engineering team an email for detailed technical inquiries or billing assistance.
            </p>
            <a
              href="mailto:info@novateches.com"
              className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-xs font-bold text-indigo-300 hover:text-white transition-all cursor-pointer"
            >
              Send Email <ExternalLink size={14} />
            </a>
          </div>

          {/* WhatsApp Support Card */}
          <div className="p-6 rounded-2xl bg-[#12121a] border border-[#25D366]/30 shadow-lg flex flex-col items-start cursor-default">
            <div className="flex items-center gap-3.5 mb-3">
              <div className="p-3 rounded-xl bg-[#25D366]/15 text-[#25D366] flex items-center justify-center">
                <WhatsAppLogo size={22} className="text-[#25D366]" />
              </div>
              <div>
                <strong className="text-white text-base block font-bold">WhatsApp Support</strong>
                <span className="text-xs text-[#25D366] font-mono font-bold">+91 63664 11798</span>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed mb-5">
              Connect directly with our product specialist engineers on WhatsApp for real-time campaign guidance and setup help.
            </p>
            <a
              href="https://wa.me/916366411798?text=Hi%20AgentMark%20Support,%20I%20need%20assistance%20with%20my%20campaign"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-xs font-bold text-[#25D366] hover:text-white transition-all cursor-pointer"
            >
              Chat on WhatsApp Now <ExternalLink size={14} />
            </a>
          </div>

        </div>
      </div>
    )
  },
];

function DocsContent() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(
      (sec) =>
        sec.title.toLowerCase().includes(query) ||
        sec.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

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
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <>
      <style>{`
        /* AgentMark Luxury SaaS Aesthetics with Generous Spacing */
        .docs-main { 
          color: #8B8B9E; 
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
          font-family: 'Sora', sans-serif;
        }
        @media (min-width: 768px) {
          .docs-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }

        .doc-content h2 { font-size: 16px; font-weight: 700; color: #F1F1F3; margin: 32px 0 12px; padding-bottom: 10px; border-bottom: 1px solid #1E2937; letter-spacing: -0.2px; }
        .doc-content h2:first-child { margin-top: 0; }
        .doc-content section { margin-bottom: 36px; }
        @media (min-width: 768px) {
          .doc-content h2 { font-size: 18px; margin: 44px 0 16px; padding-bottom: 12px; }
          .doc-content section { margin-bottom: 52px; }
        }

        .toc-bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px; margin-bottom: 24px; background: #111118; border: 1px solid #2A2A38; border-radius: 14px; }
        @media (min-width: 768px) {
          .toc-bar { gap: 8px; padding: 14px; margin-bottom: 32px; }
        }
        .toc-pill { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 500; color: #8B8B9E; background: #1A1A24; border: 1px solid #2A2A38; transition: all 0.15s; text-decoration: none; cursor: pointer; }
        @media (min-width: 768px) {
          .toc-pill { padding: 7px 14px; font-size: 12px; }
        }
        .toc-pill:hover { color: #F1F1F3; border-color: #4A4A5E; background: #16161F; transform: translateY(-1px); }
        .toc-pill.active { color: #A5B4FC; background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.4); font-weight: 600; }

        .back-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #8B8B9E; transition: color 0.15s; cursor: pointer; }
        .back-btn:hover { color: #F1F1F3; }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Documentation" />

        <main className="docs-main pt-16 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-6 py-8 md:px-12 lg:px-16 max-w-6xl mx-auto w-full space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <button onClick={() => navigate('/support')} className="back-btn">
                <ArrowLeft size={15} /> Back to Support Center
              </button>

              {/* Instant Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter documentation topics..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#111118] border border-[#2A2A38] text-xs md:text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#6366F1] transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                AgentMark Documentation
              </h1>
              <p className="text-xs md:text-sm text-[#8B8B9E]">Master our 7 autonomous AI specialists, focus group simulations, and campaign workflows.</p>
            </div>

            {/* Wrapped Single-Box Navigation Pills */}
            <div className="toc-bar">
              {filteredSections.map(s => (
                <a 
                  key={s.id} 
                  href={`#${s.id}`} 
                  className={`toc-pill ${activeSection === s.id ? 'active' : ''}`} 
                  onClick={e => { e.preventDefault(); scrollToSection(s.id); }}
                >
                  {s.icon}
                  <span>{s.title}</span>
                </a>
              ))}
            </div>

            {/* Content */}
            <div className="doc-content space-y-12">
              {filteredSections.map(s => (
                <section key={s.id} id={s.id} className="scroll-mt-20">
                  <h2 className="flex items-center gap-3">
                    {s.icon}
                    <span>{s.title}</span>
                  </h2>
                  {s.content}
                </section>
              ))}
            </div>

            <hr style={{ borderColor: '#2A2A38', margin: '56px 0 28px' }} />
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-[#4A4A5E] pb-12 gap-2 font-mono">
              <p>&copy; 2026 AgentMark Inc. All rights reserved.</p>
              <p>Designed for Marketing Leaders & Growth Founders</p>
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
