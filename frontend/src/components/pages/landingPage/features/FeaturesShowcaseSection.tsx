import { memo } from 'react';
import { 
  BrainIcon, 
  SearchIcon, 
  ShieldCheckIcon,
  LightbulbIcon,
  ZapIcon
} from '../icons';

export const FeaturesShowcaseSection = memo(() => {
  const highlights = [
    {
      icon: <BrainIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      tag: "BRAND MEMORY",
      title: "Context Memory Vault",
      desc: "Upload brand guidelines once. Event-sourced memory automatically feeds brand snapshots into every agent run to guarantee zero brand drift."
    },
    {
      icon: <SearchIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      tag: "LIVE SEARCH RAG",
      title: "Real-Time Market Research",
      desc: "Scours live web data via Google & Tavily before drafting strategy—discovering current competitor trends and real audience pain points."
    },
    {
      icon: <LightbulbIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      tag: "HOOK MATRIX",
      title: "Creative Hook Analyst",
      desc: "Formulates psychological hook matrices, emotional angles, and viral pattern-interrupt frameworks before visual prompt generation."
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      tag: "100% OVERSIGHT",
      title: "HITL Quality Inspector",
      desc: "Get 0-100 technical quality audit scores, inspect raw agent drafts, and trigger targeted single-agent revision loops before approval."
    },
    {
      icon: <ZapIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      tag: "DESKTOP MCP",
      title: "Claude Desktop Integration",
      desc: "Connect AgentMark natively to Anthropic's Claude Desktop application via Model Context Protocol to run campaigns directly from chat."
    }
  ];

  return (
    <section id="features-showcase" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-deep -left-28 top-20 hidden h-80 w-[30rem] lg:block opacity-80" />
      <div className="section-aurora aurora-cyan -right-24 top-1/2 hidden h-72 w-[28rem] -translate-y-1/2 lg:block opacity-65" />
      
      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Core AI Engine Features
          </h2>
          <p className="text-xs sm:text-sm md:text-base px-4" style={{ color: "#8B8B9E" }}>
            The breakthrough capabilities that power AgentMark's 8-agent pipeline.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {highlights.map((item, i) => (
            <div
              key={i}
              className="hover-card glass-card rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="text-indigo-400">{item.icon}</div>
                  <span className="text-[9px] font-mono font-semibold uppercase px-2 py-0.5 rounded bg-[#6366F1]/10 text-[#818CF8] border border-[#6366F1]/20">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm leading-5 sm:leading-6" style={{ color: "#8B8B9E" }}>
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
