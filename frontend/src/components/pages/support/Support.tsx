import React, { useState } from 'react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

interface FAQItem {
  question: string;
  answer: string;
}

const SupportContent: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number>(0);

  const faqs: FAQItem[] = [
    {
      question: 'How long does campaign generation take?',
      answer: 'Most multi-channel campaigns are generated within 45 to 90 seconds. Complex strategies requiring deep research may take up to 3 minutes as our agents traverse web data and internal knowledge bases.',
    },
    {
      question: 'What happens if an agent failure occurs?',
      answer: 'Our "Self-Healing Architecture" automatically attempts to restart stalled agents. If an agent remains unresponsive, you\'ll see a red status dot. You can manually refresh the node from the Review panel without losing progress.',
    },
    {
      question: 'Can I switch between AI models?',
      answer: 'Yes. Under Settings > Model Config, you can select between our Performance model for speed or Precision model for highly nuanced copy. Enterprise users also have access to custom-tuned local LLMs.',
    },
    {
      question: 'Is my proprietary data kept private?',
      answer: 'Absolutely. We utilize zero-retention data processing. Your strategy inputs and proprietary research are never used to train global models and are encrypted at rest with AES-256 standards.',
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
                <a className="glass-card p-6 rounded-xl flex flex-col items-start group cursor-pointer" href="#">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1", color: '#c0c1ff' }}>
                      menu_book
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Documentation</h3>
                  <p className="text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    Comprehensive guides on setting up workflows and scaling agents.
                  </p>
                  <span className="mt-auto flex items-center text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>
                    Explore Docs <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
                  </span>
                </a>

                <a className="glass-card p-6 rounded-xl flex flex-col items-start group cursor-pointer" href="#">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary mb-6 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[32px]" style={{ fontVariationSettings: "'FILL' 1", color: '#4edea3' }}>
                      play_circle
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Video Tutorials</h3>
                  <p className="text-sm mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    Watch step-by-step masterclasses on high-performance marketing.
                  </p>
                  <span className="mt-auto flex items-center text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                    Watch Now <span className="material-symbols-outlined ml-1 text-[18px]">arrow_forward</span>
                  </span>
                </a>
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
                        <span className="text-sm font-medium pr-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{faq.question}</span>
                        <span
                          className={`material-symbols-outlined chevron transition-transform ${
                            activeAccordion === index ? 'active' : ''
                          }`}
                          style={{ color: '#8B8B9E' }}
                        >
                          expand_more
                        </span>
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
                    <span className="material-symbols-outlined text-[24px]" style={{ color: '#c0c1ff' }}>mail</span>
                    <div className="text-left">
                      <div className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Email Us</div>
                      <div className="text-sm font-medium" style={{ color: '#F1F1F3' }}>info@novateches.com</div>
                    </div>
                  </a>
                  <a
                    href="https://wa.me/916366411798"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-4 bg-[#111118] border border-[#2A2A38] rounded-xl transition-all hover:bg-[#1b1b20] hover:border-[#464554]"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <span className="material-symbols-outlined text-[24px]" style={{ color: '#4edea3' }}>chat</span>
                    <div className="text-left">
                      <div className="text-xs mb-1" style={{ color: '#8B8B9E' }}>Live Chat</div>
                      <div className="text-sm font-medium" style={{ color: '#F1F1F3' }}>+91 63664 11798</div>
                    </div>
                  </a>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
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
