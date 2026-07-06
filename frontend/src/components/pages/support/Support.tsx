import React, { useState } from 'react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

interface FAQItem {
  question: string;
  answer: string;
}

const SupportContent: React.FC = () => {
  const [activeAccordion, setActiveAccordion] = useState<number>(0);
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);

  const faqs: FAQItem[] = [
    {
      question: 'How long does campaign generation take?',
      answer: 'Most multi-channel campaigns are generated within 45 to 90 seconds. Complex strategies requiring deep research may take up to 3 minutes as our agents traverse web data and internal knowledge bases.',
    },
    {
      question: 'How do I generate images directly from my prompt cards?',
      answer: 'In the Visuals tab of your campaign results, click "Generate" next to any prompt. A dropdown will appear containing popular studio bridges (DALL-E 3, Midjourney, Leonardo, Flux.1, etc.). Selecting one copies the prompt to your clipboard and opens the platform with the prompt pre-loaded in the generation box.',
    },
    {
      question: 'How do I post or compose drafts from generated marketing copy?',
      answer: 'In the Copywriter tab, each copy card has a highlighted direct-action CTA button at the bottom (e.g., "Post on X", "Share on LinkedIn", "Compose in Gmail", or "Default Mail Client"). Clicking this button copies your copy variant to the clipboard and opens the composing page of the specific platform with the content pre-filled.',
    },
    {
      question: 'What is the Memory Hub and how does it optimize my campaigns over time?',
      answer: 'The Memory Hub aggregates cross-campaign insights for your brand. It monitors which copy tones receive first-try approvals, profiles agent rejection feedback (e.g., if the compliance agent flags certain phrasing), and uses these historical learnings to automatically adjust future LLM guidance for that specific project.',
    },
    {
      question: 'How does the Tavily web search integration assist the market research phase?',
      answer: 'During campaign strategy generation, our Research Agent utilizes Tavily API to fetch real-time market trends, competitor insights, and public sentiment. It then synthesizes this live data directly into the campaign strategy outline instead of relying solely on static model training data.',
    },

    {
      question: 'How do I customize the brand voice or tone parameters?',
      answer: 'Under Campaign Settings, you can define custom brand directives, target audience profiles, and tone constraints. These rules are injected as system prompts across the entire agent cluster, ensuring all generated copy and visuals strictly align with your corporate guidelines.',
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

  const tutorials = [
    {
      title: 'Introduction to Agent Clusters',
      duration: '2:40',
      videoUrl: '/videos/intro_clusters.mp4',
      description: 'Understand how the 7 autonomous agents inside the AgentMark cluster collaborate, from market research to automated publishing.',
    },
    {
      title: 'Refining Copy with the Co-Creation Workbench',
      duration: '3:15',
      videoUrl: '/videos/refining_copy.mp4',
      description: 'Learn how to fine-tune copy drafts, issue revisions, and pin copy variations on the co-creation workbench.',
    },
    {
      title: 'Setting up Tavily & LLM API Keys',
      duration: '1:50',
      videoUrl: '/videos/api_keys.mp4',
      description: 'A step-by-step walkthrough of adding provider credentials and testing API connection states.',
    },
    {
      title: 'Customizing Brand Voice & Directives',
      duration: '4:10',
      videoUrl: '/videos/brand_voice.mp4',
      description: 'Master advanced prompt configurations to enforce brand tone, style guidelines, and compliance rules.',
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
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
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
                <a className="glass-card p-6 rounded-xl flex flex-col items-start group cursor-pointer" href="/docs">
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

                <button 
                  onClick={() => setShowTutorialModal(true)}
                  className="glass-card p-6 rounded-xl flex flex-col items-start group cursor-pointer w-full text-left bg-[#111118] border border-[#2A2A38]"
                >
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
                </button>
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

      {/* Immersive Lightbox Theater Modal */}
      {showTutorialModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0F]/85 backdrop-blur-md animate-fadeIn modal-overlay"
          onClick={() => setShowTutorialModal(false)}
        >
          <div 
            className="w-full max-w-5xl bg-[#111118] border border-[#2A2A38] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row relative animate-scaleIn modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ minHeight: '520px' }}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowTutorialModal(false)}
              className="absolute top-4 right-4 z-50 p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-[#16161F]/90 border border-[#2A2A38] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
              title="Close Player"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            {/* Left Column: Player (Theater View) */}
            <div className="flex-1 lg:col-span-2 bg-black flex flex-col">
              <div className="relative aspect-video w-full flex-1 bg-black">
                <video
                  key={activeVideoIndex}
                  controls
                  autoPlay
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  src={tutorials[activeVideoIndex].videoUrl}
                />
              </div>
              <div className="p-5 border-t border-[#2A2A38]">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/20">
                    MASTERCLASS
                  </span>
                  <span className="text-xs text-[#8B8B9E] font-mono">
                    Duration: {tutorials[activeVideoIndex].duration}
                  </span>
                </div>
                <h4 className="text-xl font-bold mb-2 text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {tutorials[activeVideoIndex].title}
                </h4>
                <p className="text-sm text-[#8B8B9E] leading-relaxed" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {tutorials[activeVideoIndex].description}
                </p>
              </div>
            </div>

            {/* Right Column: Playlist */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#2A2A38] bg-[#16161F] flex flex-col max-h-[600px] lg:max-h-none overflow-y-auto">
              <div className="p-4 border-b border-[#2A2A38]">
                <h5 className="font-semibold text-[#F1F1F3] text-xs tracking-wider uppercase font-mono">
                  Tutorials & Guides
                </h5>
                <p className="text-[11px] text-[#8B8B9E] mt-1">
                  Learn how to master the AgentMark cluster
                </p>
              </div>
              <div className="flex-1 divide-y divide-[#2A2A38]/50">
                {tutorials.map((video, idx) => {
                  const isActive = idx === activeVideoIndex;
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveVideoIndex(idx)}
                      className={`w-full text-left p-4 transition-all flex items-start gap-3 border-l-2 ${
                        isActive 
                          ? 'border-[#4edea3] bg-[#111118]' 
                          : 'border-transparent hover:bg-[#111118]/50'
                      }`}
                      style={{ cursor: 'pointer' }}
                    >
                      <span 
                        className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${
                          isActive ? 'text-[#4edea3]' : 'text-[#8B8B9E]'
                        }`}
                      >
                        {isActive ? 'play_circle' : 'play_arrow'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[#F1F1F3] line-clamp-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {video.title}
                        </div>
                        <div className="text-xs text-[#8B8B9E] mt-1 font-mono">
                          {video.duration}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
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
