import { memo } from 'react';
import { BrainIcon, LayersIcon, ShieldCheckIcon, SparklesIcon } from '../icons';

export const InnovationsSection = memo(() => {
  const highlights = [
    {
      icon: <BrainIcon className="w-6 h-6 text-[#A5B4FC]" />,
      badge: "BRAND MEMORY",
      title: "Context Memory Vault",
      desc: "Event-sourced brand snapshots automatically feed tone, guidelines, forbidden terms, and past winning hooks into every campaign run.",
    },
    {
      icon: <LayersIcon className="w-6 h-6 text-[#38BDF8]" />,
      badge: "1-CLICK DISPATCH",
      title: "One-Click Brand Bridges",
      desc: "Instantly draft emails in Gmail, post on X, format markdown for LinkedIn, or dispatch art prompts to Midjourney & DALL-E 3.",
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 text-[#4EDEA3]" />,
      badge: "100% OVERSIGHT",
      title: "HITL Inspector Panel",
      desc: "Review quality scores (0-100%), inspect raw agent drafts, and trigger targeted single-agent revisions with precision.",
    },
    {
      icon: <SparklesIcon className="w-6 h-6 text-[#F59E0B]" />,
      badge: "DESKTOP MCP",
      title: "Claude Desktop Integration",
      desc: "Connect AgentMark natively to Anthropic's Claude Desktop via Model Context Protocol to run campaigns directly from chat.",
    },
  ];

  return (
    <section id="innovations" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-deep left-1/2 top-10 h-72 w-[40rem] -translate-x-1/2 opacity-40" />

      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[#111118] px-3.5 py-1 mb-4 shadow-sm">
            <SparklesIcon className="w-3.5 h-3.5 text-[#6366F1]" />
            <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-[#A5B4FC]">
              Enterprise Architecture
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Engineered for High-Performance Teams
          </h2>
          <p className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4" style={{ color: "#8B8B9E" }}>
            Proprietary AI infrastructure designed to eliminate brand drift, speed up output, and guarantee enterprise compliance.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {highlights.map((item, i) => (
            <div
              key={i}
              className="hover-card glass-card rounded-xl sm:rounded-2xl p-5 sm:p-6 border border-[#2A2A38] bg-[#111118]/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-[#1A1A24] border border-[#2A2A38]">
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20">
                    {item.badge}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-[#F1F1F3]">
                  {item.title}
                </h3>
                <p className="text-xs text-[#8B8B9E] leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
