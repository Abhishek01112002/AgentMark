import { memo } from 'react';
import { 
  BriefcaseIcon, 
  SearchIcon, 
  TargetIcon, 
  PenToolIcon, 
  ImageIcon, 
  LightbulbIcon,
  CheckSquareIcon, 
  SendIcon 
} from '../icons';

export const TeamSection = memo(() => {
  const agents = [
    {
      icon: <BriefcaseIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Campaign Manager",
      desc: "Orchestrates the entire pipeline, delegates tasks, and ensures alignment with the initial brief.",
    },
    {
      icon: <SearchIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Research Analyst",
      desc: "Scours the web for market trends, competitor data, and audience insights to inform strategy.",
    },
    {
      icon: <TargetIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Chief Strategist",
      desc: "Synthesizes research into actionable campaign angles, positioning, and channel selection.",
    },
    {
      icon: <PenToolIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Master Copywriter",
      desc: "Drafts compelling ad copy, landing pages, and emails optimized for conversion.",
    },
    {
      icon: <LightbulbIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Creative Hook Analyst",
      desc: "Formulates psychological hook matrices, emotional angles, and viral pattern-interrupt frameworks.",
    },
    {
      icon: <ImageIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Visual Prompt Engineer",
      desc: "Translates strategy into precise prompts for image generation models to create stunning assets.",
    },
    {
      icon: <CheckSquareIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Quality Reviewer",
      desc: "Critiques outputs against brand voice and brief constraints, enforcing high standards before delivery.",
    },
    {
      icon: <SendIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Publisher Protocol",
      desc: "Packages all approved assets into structured, ready-to-deploy formats for your ad platforms.",
    },
  ];

  return (
    <section id="agents" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-deep -left-28 top-20 hidden h-80 w-[30rem] lg:block opacity-80" />
      <div className="section-aurora aurora-cyan -right-24 top-1/2 hidden h-72 w-[28rem] -translate-y-1/2 lg:block opacity-65" />
      <div className="section-aurora aurora-indigo left-1/2 bottom-[-6rem] h-56 w-[36rem] -translate-x-1/2 opacity-35" />
      
      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Meet Your New Team
          </h2>
          <p className="text-xs sm:text-sm md:text-base px-4" style={{ color: "#8B8B9E" }}>
            8 specialized AI models working in perfect sync.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {agents.map((agent, i) => (
            <div
              key={i}
              className="hover-card glass-card rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6"
            >
              <div className="text-indigo-400 mb-3 sm:mb-4">{agent.icon}</div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2">{agent.title}</h3>
              <p className="text-xs sm:text-sm leading-5 sm:leading-6" style={{ color: "#8B8B9E" }}>
                {agent.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
