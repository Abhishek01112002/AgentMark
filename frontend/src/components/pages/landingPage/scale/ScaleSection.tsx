import { memo } from 'react';
import { 
  ZapIcon, 
  LayoutGridIcon, 
  BarChart2Icon, 
  ShieldCheckIcon 
} from '../icons';

export const ScaleSection = memo(() => {
  const features = [
    {
      icon: <ZapIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Autonomous 8-Agent Pipeline",
      desc: "Run end-to-end campaigns from brief to deployment. Our 8 AI specialist agents collaborate sequentially using LangGraph state management to deliver market research, positioning angles, ad copy, creative hooks, and visual art direction in under 90 seconds.",
      span: "md:col-span-2",
    },
    {
      icon: <LayoutGridIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Omnichannel Asset Formats",
      desc: "Instantly generate tailored, high-converting copy formats for X (Twitter), LinkedIn, promotional Email, Google Ads, and Facebook simultaneously.",
      span: "md:col-span-1",
    },
    {
      icon: <BarChart2Icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Strategic Angle Synthesis",
      desc: "Transforms market research data into distinct positioning hooks, campaign angles, and compelling unique value propositions (UVPs).",
      span: "md:col-span-1",
    },
    {
      icon: <ShieldCheckIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />,
      title: "Brand Vault & Policy Guardrails",
      desc: "Upload your brand guidelines once to the Context Memory Vault. Our 4-tier policy engine and Quality Reviewer agent strictly enforce tone, terminology, and compliance constraints across every generated asset.",
      span: "md:col-span-2",
    },
  ];

  return (
    <section id="features" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-cyan -left-32 bottom-8 hidden h-80 w-[32rem] lg:block opacity-80" />
      <div className="section-aurora aurora-deep -right-32 top-4 hidden h-96 w-[34rem] lg:block opacity-75" />
      <div className="section-aurora aurora-indigo left-1/2 top-1/2 h-48 w-[30rem] -translate-x-1/2 -translate-y-1/2 opacity-30" />
      
      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Built for Scale
          </h2>
          <p className="text-xs sm:text-sm md:text-base px-4" style={{ color: "#8B8B9E" }}>
            Everything you need to run high-performance marketing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {features.map((f, i) => (
            <div
              key={i}
              className={`hover-card feature-card rounded-lg sm:rounded-xl md:rounded-2xl p-4 sm:p-5 md:p-6 lg:p-8 border ${f.span} ${
                i === 0 || i === 3 ? 'md:col-span-2' : 'md:col-span-1'
              }`}
              style={{ background: "#111118", borderColor: "#2A2A38" }}
            >
              <div className="text-indigo-400 mb-3 sm:mb-4 md:mb-6">{f.icon}</div>
              <h3 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3">{f.title}</h3>
              <p className="text-xs sm:text-sm leading-5 sm:leading-6" style={{ color: "#8B8B9E" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
