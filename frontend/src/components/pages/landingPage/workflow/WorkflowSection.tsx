import { useState, useEffect, memo } from 'react';
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

const PIPELINE_STEPS = [
  { icon: <BriefcaseIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Manager", text: "Initializing campaign pipeline, assigning roles, and defining goals..." },
  { icon: <SearchIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Research", text: "Researching competitors, market trends, and audience opportunities..." },
  { icon: <TargetIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Strategy", text: "Shaping angles, positioning, and channel strategy for the campaign..." },
  { icon: <PenToolIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Copywriter", text: "Drafting multi-variant ad copy for Facebook and LinkedIn based on strategic brief..." },
  { icon: <LightbulbIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Creative Hooks", text: "Formulating psychological hook matrices, emotional angles, and viral frameworks..." },
  { icon: <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Visual", text: "Creating visual prompt directions and asset-ready creative variations..." },
  { icon: <CheckSquareIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Review", text: "Reviewing tone, brand alignment, and quality constraints before launch..." },
  { icon: <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" />, label: "Publish", text: "Packaging the final campaign assets and preparing everything for deployment..." },
] as const;

export const WorkflowSection = memo(() => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    const text = PIPELINE_STEPS[activeStepIndex].text;
    let charIndex = 0;
    let typingTimer: number | undefined;
    let advanceTimer: number | undefined;

    setDisplayedText('');

    const typeNextChar = () => {
      charIndex += 1;
      setDisplayedText(text.slice(0, charIndex));

      if (charIndex < text.length) {
        typingTimer = window.setTimeout(typeNextChar, 42);
        return;
      }

      advanceTimer = window.setTimeout(() => {
        setActiveStepIndex((current) => (current + 1) % PIPELINE_STEPS.length);
      }, 4200);
    };

    typingTimer = window.setTimeout(typeNextChar, 300);

    return () => {
      if (typingTimer) window.clearTimeout(typingTimer);
      if (advanceTimer) window.clearTimeout(advanceTimer);
    };
  }, [activeStepIndex]);

  const agentNodes = PIPELINE_STEPS.map((step, index) => ({
    ...step,
    active: index === activeStepIndex,
    done: index <= activeStepIndex,
  }));

  return (
    <>
      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="section-veil" />
        <div className="section-aurora aurora-indigo -left-24 top-10 hidden h-72 w-96 lg:block" />
        <div className="section-aurora aurora-cyan -right-28 bottom-8 hidden h-72 w-96 lg:block opacity-75" />
        <div className="section-aurora aurora-deep left-1/2 top-1/2 h-40 w-[28rem] -translate-x-1/2 -translate-y-1/2 opacity-35" />
        
        <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
          <div className="text-center mb-8 sm:mb-12 md:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
              The Workflow
            </h2>
            <p className="text-xs sm:text-sm md:text-base px-4" style={{ color: "#8B8B9E" }}>
              Seamless execution from idea to asset delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 xl:gap-8 relative pt-4">
            {/* Connector line - hidden on mobile */}
            <div
              className="hidden xl:block absolute h-px -z-10"
              style={{
                top: "8.1rem",
                left: "5rem",
                right: "5rem",
                borderTop: "2px solid #343447",
                boxShadow: "0 0 12px rgba(99,102,241,0.08)",
              }}
            />

            {[
              {
                num: "01",
                title: "Brief",
                desc: "Input your goal, target audience, and core message in a single prompt.",
              },
              {
                num: "02",
                title: "Agents Execute",
                desc: "The 8-agent pipeline autonomously researches, strategizes, drafts, and simulates responses.",
              },
              {
                num: "03",
                title: "Review & Iterate",
                desc: "Critique agents review outputs. You approve or request precise tweaks.",
              },
              {
                num: "04",
                title: "Deploy",
                desc: "Download finalized copy, visuals, and strategy documents instantly.",
              },
            ].map((step) => (
              <div
                key={step.num}
                className="hover-card group relative overflow-hidden rounded-xl sm:rounded-2xl border p-4 sm:p-5 md:p-6 lg:p-7"
                style={{ 
                  background: "linear-gradient(180deg, rgba(17,17,24,0.98) 0%, rgba(14,14,20,0.98) 100%)", 
                  borderColor: "#2A2A38" 
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_60%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div
                  className="relative z-10 w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-full border flex items-center justify-center text-indigo-400 text-xs sm:text-sm font-medium mb-3 sm:mb-4 mx-auto sm:mx-0 shadow-[0_0_0_1px_rgba(99,102,241,0.08)]"
                  style={{
                    background: "rgba(99,102,241,0.10)",
                    borderColor: "rgba(99,102,241,0.22)",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {step.num}
                </div>
                <h3 className="relative z-10 text-base sm:text-lg md:text-xl font-semibold mb-1.5 sm:mb-2 text-center sm:text-left">
                  {step.title}
                </h3>
                <p
                  className="relative z-10 text-xs sm:text-sm leading-5 sm:leading-6 text-center sm:text-left"
                  style={{ color: "#8B8B9E" }}
                >
                  {step.desc}
                </p>
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.18),transparent)]" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline Visualization Section */}
      <section className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="section-veil" />
        <div className="section-aurora aurora-cyan left-[-7rem] top-1/2 hidden h-80 w-[28rem] -translate-y-1/2 lg:block" />
        <div className="section-aurora aurora-indigo right-[-8rem] top-16 hidden h-80 w-[30rem] lg:block opacity-80" />
        <div className="section-aurora aurora-deep bottom-[-5rem] left-1/2 h-48 w-[34rem] -translate-x-1/2 opacity-45" />
        
        <div className="relative mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12 pt-4 sm:pt-6 md:pt-8">
          <div className="absolute left-3 sm:left-6 top-0 hidden rounded-full border border-[#2A2A38] bg-[#111118] px-3 sm:px-4 py-1 sm:py-1.5 shadow-lg sm:flex">
            <div className="flex items-center gap-1.5 sm:gap-2 text-[#10B981]">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#10B981] pulse-anim" />
              <span className="text-[10px] sm:text-xs font-medium font-mono">Live Campaign Running</span>
            </div>
          </div>

          <div className="hover-card float-slow rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.45)] sm:shadow-[0_24px_64px_rgba(0,0,0,0.55)] border bg-[#111118] border-[#2A2A38] relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none z-10" />
            <div className="absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#6366F1]/40 to-transparent opacity-70" />
            <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#6366F1]/25 to-transparent opacity-50" />
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px overflow-hidden">
              <div className="scan-line h-full w-1/2 bg-[linear-gradient(90deg,transparent,rgba(99,102,241,0.9),transparent)]" />
            </div>
            <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-32 w-32 sm:h-40 sm:w-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(99,102,241,0.09)] blur-3xl" />

             <div className="flex flex-col gap-4 sm:gap-6 relative z-20">
              <div className="flex flex-col gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] border-b pb-3 sm:pb-4 text-[#8B8B9E] border-[#2A2A38] font-mono min-[380px]:flex-row min-[380px]:items-center min-[380px]:justify-between">
                <span className="inline-flex items-center gap-1.5 sm:gap-2">
                  <span className="h-1 w-1 sm:h-1.5 sm:w-1.5 rounded-full bg-[#10B981] pulse-anim" />
                  <span>Campaign: <strong className="text-[#F1F1F3] font-bold">Q3 Product Launch</strong></span>
                </span>
                <span>Status: <strong className="text-[#A5B4FC] font-bold animate-pulse">Generating Assets</strong></span>
              </div>

              {/* Agent nodes - Responsive grid */}
              <div className="relative flex gap-3 overflow-x-auto pb-2 sm:gap-4 md:grid md:grid-cols-8 md:overflow-visible md:gap-3">
                {agentNodes.map((node, i) => (
                  <div key={i} className="relative flex min-w-[4.35rem] flex-col items-center gap-1 sm:min-w-[4.75rem] sm:gap-2 md:min-w-0">
                    <div
                      className={`z-10 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg border transition-all duration-300 ${
                        node.active || node.done ? 'shadow-[0_0_14px_rgba(99,102,241,0.18)] sm:shadow-[0_0_18px_rgba(99,102,241,0.22)]' : ''
                      }`}
                      style={{
                        background: node.active || node.done ? "rgba(99,102,241,0.16)" : "#1A1A24",
                        borderColor: node.active || node.done ? "rgba(99,102,241,0.8)" : "#313144",
                        color: node.active || node.done ? "#6366F1" : "#8B8B9E",
                      }}
                    >
                      {node.icon}
                    </div>
                    <span
                      className="text-[8px] sm:text-[9px] md:text-[10px] text-center"
                      style={{
                        color: node.active ? "#C0C1FF" : node.done ? "#10B981" : "#6B6B80",
                        fontWeight: node.active ? 600 : 500,
                        fontFamily: "JetBrains Mono, monospace",
                      }}
                    >
                      {node.label}
                    </span>
                    {node.active && (
                      <div className="absolute top-0.5 sm:top-1 -right-0.5 sm:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2 pulse-anim shadow-[0_0_10px_rgba(99,102,241,0.35)] sm:shadow-[0_0_12px_rgba(99,102,241,0.45)]" style={{ background: "#6366F1", borderColor: "#111118" }} />
                    )}
                    {!node.active && node.done && (
                      <div className="absolute top-0.5 sm:top-1 -right-0.5 sm:-right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full border-2" style={{ background: "#10B981", borderColor: "#111118" }} />
                    )}
                    {i < agentNodes.length - 1 && (
                      <div
                        className="absolute top-[18px] sm:top-[22px]"
                        style={{
                          left: "50%",
                          width: "calc(100% + 1rem)",
                          height: "2px",
                          borderTop: `2px solid ${
                            i < activeStepIndex ? 'rgba(99,102,241,0.48)' : 'rgba(74,74,94,0.65)'
                          }`,
                          transform: "translateX(1.25rem)",
                          boxShadow: i < activeStepIndex ? "0 0 14px rgba(99,102,241,0.18)" : "none",
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div
                className="rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 border text-xs sm:text-sm flex items-start min-h-24 sm:min-h-32 bg-[#0A0A0F] relative overflow-hidden"
                style={{
                  borderColor: "#2A2A38",
                  color: "#F1F1F3",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),transparent)]" />
                <div className="pointer-events-none absolute left-0 top-0 h-full w-16 sm:w-24 bg-[linear-gradient(90deg,rgba(99,102,241,0.08),transparent)]" />
                <span className="mr-1.5 sm:mr-2 text-indigo-400 shrink-0">&gt;</span>
                <span className="leading-5 sm:leading-6 md:leading-7 text-[#F1F1F3]">{displayedText}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
});
