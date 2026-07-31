import { useState, memo } from 'react';
import { ChevronDownIcon, CheckCircleIcon } from '../icons';

const FAQS = [
  {
    q: "How do the 8 AI agents communicate with each other?",
    a: "AgentMark uses LangGraph state persistence and Context JSON Contracts (<250 tokens). The Manager Agent parses your prompt and passes structured state sequentially through Research, Strategy, Copywriter, Creative Hooks, Visual Prompt, Quality Reviewer, and Publisher agents without data loss or hallucination."
  },
  {
    q: "How does AgentMark maintain my exact brand voice?",
    a: "We feature an event-sourced Context Memory Vault. Upload your brand guidelines, past winning ads, or forbidden terms once. The 4-tier policy engine automatically injects your materialized brand snapshot into every single agent run."
  },
  {
    q: "Do I retain 100% human control over published campaigns?",
    a: "Yes. Every campaign pauses at the Human-in-the-Loop Inspector Panel. You get a technical audit score (0-100%), can inspect raw drafts, request targeted single-agent revisions (max 3 budget), or approve with 1-click."
  },
  {
    q: "Are my API keys and brand data kept private?",
    a: "Absolutely. AgentMark supports direct BYOK (Bring Your Own Key) for OpenAI and Gemini APIs. Your credentials and campaign data are encrypted locally and never used to train public LLM models."
  },
  {
    q: "Can I connect AgentMark directly to Anthropic's Claude Desktop?",
    a: "Yes! AgentMark includes a native Model Context Protocol (MCP) Python server. You can issue campaigns, test copy, and retrieve performance insights right from your Claude Desktop chat interface."
  }
];

export const FaqSection = memo(() => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section id="faq" className="relative z-10 w-full overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
      <div className="section-veil" />
      <div className="section-aurora aurora-cyan -left-28 top-20 hidden h-80 w-[30rem] lg:block opacity-70" />
      <div className="section-aurora aurora-indigo -right-28 bottom-10 hidden h-80 w-[30rem] lg:block opacity-65" />

      <div className="mx-auto max-w-screen-xl px-3 sm:px-6 md:px-12">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(99,102,241,0.25)] bg-[#111118] px-3.5 py-1 mb-4 shadow-sm">
            <CheckCircleIcon className="w-3.5 h-3.5 text-[#4edea3]" />
            <span className="text-[10px] sm:text-xs font-mono font-semibold uppercase tracking-wider text-[#818CF8]">
              Got Questions?
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4" style={{ letterSpacing: "-0.01em" }}>
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm md:text-base max-w-2xl mx-auto px-4" style={{ color: "#8B8B9E" }}>
            Everything you need to know about AgentMark's multi-agent architecture and enterprise safeguards.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 sm:space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="hover-card glass-card rounded-xl sm:rounded-2xl border border-[#2A2A38] bg-[#111118]/90 overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-none"
                >
                  <span className="text-sm sm:text-base font-semibold text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full border border-[#2A2A38] flex items-center justify-center text-[#8B8B9E] transition-transform duration-300 shrink-0 ${
                      isOpen ? 'rotate-180 bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/30' : ''
                    }`}
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-[#2A2A38]/50 text-xs sm:text-sm leading-6 text-[#8B8B9E] animate-fadeIn">
                    <p className="pt-3">{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
