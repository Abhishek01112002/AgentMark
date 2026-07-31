import { memo } from 'react';
import { 
  SparklesIcon, 
  BrainIcon, 
  SearchIcon, 
  ShieldCheckIcon, 
  LayersIcon, 
  ZapIcon,
  SendIcon
} from '../icons';

export const FeaturesShowcaseSection = memo(() => {
  const capabilities = [
    {
      icon: <BrainIcon className="w-6 h-6 text-[#A5B4FC]" />,
      badge: "EVENT-SOURCED MEMORY",
      title: "Brand Memory Vault",
      subtitle: "Never re-explain your brand again",
      description: "Upload brand guidelines, tone rules, and past winning ads once. The Memory Vault automatically feeds materialized snapshots into every agent run to guarantee zero brand drift."
    },
    {
      icon: <SearchIcon className="w-6 h-6 text-[#38BDF8]" />,
      badge: "LIVE WEB RAG",
      title: "Real-Time Market Search",
      subtitle: "Live intelligence from Google & Tavily",
      description: "Unlike static AI models, AgentMark scours live search engines before drafting strategy—discovering current competitor moves, industry trends, and real audience pain points."
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-[#4EDEA3]" />,
      badge: "100% HUMAN CONTROL",
      title: "HITL Quality Inspector",
      subtitle: "0-100 Quality Scores & Targeted Revisions",
      description: "Review technical quality audits, inspect raw drafts, and trigger targeted single-agent revision loops (max 3 budget) before approving any campaign."
    },
    {
      icon: <SendIcon className="w-6 h-6 text-[#F59E0B]" />,
      badge: "1-CLICK DISPATCH",
      title: "Omnichannel Social Bridges",
      subtitle: "Instant export to platforms & art generators",
      description: "Dispatch ready-to-publish assets directly to Gmail, X (Twitter), LinkedIn markdown, or copy structured image prompts tailored for Midjourney & DALL-E 3."
    },
    {
      icon: <ZapIcon className="w-6 h-6 text-[#818CF8]" />,
      badge: "DESKTOP MCP SERVER",
      title: "Claude Desktop Integration",
      subtitle: "Model Context Protocol native support",
      description: "Run campaigns, query past memory insights, and generate ad copy right inside Anthropic's Claude Desktop application via native MCP server tools."
    },
    {
      icon: <LayersIcon className="w-6 h-6 text-[#EC4899]" />,
      badge: "ZERO HALLUCINATION",
      title: "LangGraph State Contracts",
      subtitle: "Structured JSON contracts (<250 tokens)",
      description: "Agents pass lightweight, strictly validated JSON state schemas across the graph. Eliminates context bloat and prevents model hallucination across complex workflows."
    }
  ];

  return (
    <section id="capabilities" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-indigo left-1/2 top-10 h-80 w-[42rem] -translate-x-1/2 opacity-40" />
      <div className="section-aurora aurora-cyan -left-32 bottom-20 hidden h-80 w-[30rem] lg:block opacity-60" />

      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[#111118] px-3.5 py-1 mb-4 shadow-sm">
            <SparklesIcon className="w-3.5 h-3.5 text-[#6366F1]" />
            <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-[#A5B4FC]">
              Breakthrough AI Features
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Why Marketing Teams Choose AgentMark
          </h2>
          <p className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4" style={{ color: "#8B8B9E" }}>
            Proprietary multi-agent architecture built to deliver agency-grade campaigns with speed, precision, and complete human oversight.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {capabilities.map((item, i) => (
            <div
              key={i}
              className="hover-card glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 md:p-7 border border-[#2A2A38] bg-[#111118]/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-[#1A1A24] border border-[#2A2A38]">
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20">
                    {item.badge}
                  </span>
                </div>
                
                <h3 className="text-base sm:text-lg font-semibold text-[#F1F1F3] mb-1">
                  {item.title}
                </h3>
                <p className="text-xs font-mono text-[#A5B4FC] mb-3">
                  {item.subtitle}
                </p>
                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
