import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from './navbar/Navbar';
import { HeroSection } from './hero/HeroSection';
import { WorkflowSection } from './workflow/WorkflowSection';
import { TeamSection } from './teams/TeamSection';
import { InnovationsSection } from './innovations/InnovationsSection';
import { ScaleSection } from './scale/ScaleSection';
import { SavingsSection } from './saving/SavingsSection';
import { RoiCalculatorSection } from './roi/RoiCalculatorSection';
import { FaqSection } from './faq/FaqSection';
import { Footer } from './footer/Footer';

const TUTORIALS = [
  {
    title: 'How to Launch Your First Campaign',
    duration: '3:32',
    videoUrl: '/create_campaign.mp4',
    description: 'A quick walkthrough showing how to enter target parameters and trigger the multi-agent campaign runner.',
    steps: [
      'Click on "New Campaign" in the sidebar dashboard.',
      'Fill in the target audience, industry, and primary campaign goals.',
      'Choose a brand voice and click "Launch Campaign" to start the AI runner.',
    ],
  },
  {
    title: 'Reviewing & Sharing Copy Variants',
    duration: '1:04',
    videoUrl: '/customize_copy.mp4',
    description: 'Learn how to inspect the generated copywriter outputs and use the one-click brand bridges.',
    steps: [
      'Navigate to the Copywriter tab in your completed campaign results.',
      'Select any channel tab (e.g., X, LinkedIn, Email) to view the generated drafts.',
      'Click the bottom CTA button (like "Compose in Gmail" or "Post on X") to copy the text and open the bridge.',
    ],
  },
  {
    title: 'Generating Visual Prompts via AI Bridges',
    duration: '0:55',
    videoUrl: '/visual_studio_bridges.mp4',
    description: 'Learn how to copy generated image prompts and launch external image generation tools.',
    steps: [
      'Navigate to the Visuals tab in your campaign results.',
      'Scroll to any generated prompt card.',
      'Click the "Generate" button on the card, select an AI Studio engine (like DALL-E or Imagen 3), and let the bridge pre-fill the prompt.',
    ],
  },
  {
    title: 'Configuring API Keys & Credentials',
    duration: '0:38',
    videoUrl: '/setup_api_keys.mp4',
    description: 'A step-by-step guide to adding your LLM credentials for campaign execution.',
    steps: [
      'Click on "Settings" in the main sidebar.',
      'Add your Gemini or OpenAI API keys into the respective input fields.',
      'Click "Save Credentials" and wait for the green confirmation toast.',
    ],
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [showTutorialModal, setShowTutorialModal] = useState<boolean>(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeVideoIndex, showTutorialModal]);

  const handleLoginClick = useCallback(() => navigate('/login'), [navigate]);
  const handleGetStartedClick = useCallback(() => navigate('/signup'), [navigate]);
  const handleViewDemoClick = useCallback(() => setShowTutorialModal(true), []);

  return (
    <div className="min-h-screen overflow-x-hidden antialiased bg-[#0A0A0F] text-[#F1F1F3]">
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scan {
          0% { transform: translateX(-120%); opacity: 0; }
          10% { opacity: 0.8; }
          50% { opacity: 0.55; }
          100% { transform: translateX(120%); opacity: 0; }
        }
        .pulse-anim {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }
        .scan-line {
          animation: scan 4.5s linear infinite;
        }
        .hover-card {
          position: relative;
          overflow: hidden;
          transition: transform 280ms ease, border-color 280ms ease, box-shadow 280ms ease, background 280ms ease;
        }
        .hover-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at top, rgba(99,102,241,0.12), transparent 58%);
          opacity: 0;
          transition: opacity 280ms ease;
          pointer-events: none;
        }
        .hover-card::after {
          content: '';
          position: absolute;
          inset: auto -20% -30% -20%;
          height: 55%;
          background: linear-gradient(180deg, transparent, rgba(99,102,241,0.08));
          opacity: 0;
          filter: blur(14px);
          transition: opacity 280ms ease;
          pointer-events: none;
        }
        .hover-card:hover {
          transform: translateY(-4px);
          border-color: rgba(99, 102, 241, 0.45) !important;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.32);
        }
        .hover-card:hover svg {
          filter: drop-shadow(0 0 10px rgba(99,102,241,0.35));
        }
        .hover-card:hover::before,
        .hover-card:hover::after {
          opacity: 1;
        }
        .glass-card {
          background: rgba(17, 17, 24, 0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(42, 42, 56, 0.5);
        }
        .section-aurora {
          position: absolute;
          pointer-events: none;
          border-radius: 9999px;
          filter: blur(72px);
          opacity: 0.9;
          mix-blend-mode: screen;
        }
        .aurora-indigo {
          background:
            radial-gradient(circle at 35% 35%, rgba(99,102,241,0.18), transparent 52%),
            radial-gradient(circle at 70% 65%, rgba(56,189,248,0.09), transparent 62%);
        }
        .aurora-cyan {
          background:
            radial-gradient(circle at 45% 35%, rgba(56,189,248,0.14), transparent 54%),
            radial-gradient(circle at 70% 70%, rgba(99,102,241,0.11), transparent 64%);
        }
        .aurora-deep {
          background:
            radial-gradient(circle at 30% 40%, rgba(79,70,229,0.16), transparent 56%),
            radial-gradient(circle at 75% 50%, rgba(14,165,233,0.08), transparent 66%);
        }
        .section-veil {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(99,102,241,0.035), transparent 22%, transparent 78%, rgba(56,189,248,0.035)),
            radial-gradient(ellipse at center, rgba(255,255,255,0.018), transparent 62%);
        }
        
        @media (max-width: 640px) {
          .hover-card:hover {
            transform: translateY(-2px);
          }
        }
      `}</style>

      <Navbar
        onLoginClick={handleLoginClick}
        onGetStartedClick={handleGetStartedClick}
      />

      <HeroSection onViewDemoClick={handleViewDemoClick} />

      <main className="relative w-full overflow-hidden">
        <div className="pointer-events-none absolute left-[-4rem] sm:left-[-6rem] top-20 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-[radial-gradient(circle,rgba(99,102,241,0.12)_0%,rgba(99,102,241,0.04)_58%,transparent_80%)] blur-3xl" />
        <div className="pointer-events-none absolute right-[-3rem] sm:right-[-4rem] top-[28rem] sm:top-[34rem] h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-[radial-gradient(circle,rgba(129,140,248,0.12)_0%,rgba(129,140,248,0.04)_58%,transparent_80%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-[50rem] sm:top-[62rem] h-48 w-[24rem] sm:h-64 sm:w-[32rem] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08)_0%,transparent_72%)] blur-3xl" />

        <WorkflowSection />
        <TeamSection />
        <InnovationsSection />
        <ScaleSection />
        <SavingsSection />
        <RoiCalculatorSection />
        <FaqSection />
      </main>

      <Footer />

      {/* Interactive Demo Video Player Modal */}
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
              <span className="material-symbols-outlined text-[20px] block" style={{ color: '#8B8B9E' }}>close</span>
            </button>

            {/* Left Column: Player (Theater View) */}
            <div className="flex-1 lg:col-span-2 bg-black flex flex-col">
              <div className="relative aspect-video w-full flex-1 bg-black">
                <video
                  ref={videoRef}
                  key={activeVideoIndex}
                  controls
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain"
                  src={TUTORIALS[activeVideoIndex].videoUrl}
                  onPlay={() => {
                    if (videoRef.current) {
                      videoRef.current.playbackRate = playbackSpeed;
                    }
                  }}
                />
              </div>
              <div className="p-5 border-t border-[#2A2A38] max-h-[220px] overflow-y-auto">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono text-[#4edea3] bg-[#4edea3]/10 border border-[#4edea3]/20">
                    APP DEMO
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider font-mono text-[#F59E0B] bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                    SILENT WALKTHROUGH
                  </span>
                  <span className="text-xs text-[#8B8B9E] font-mono">
                    Duration: {TUTORIALS[activeVideoIndex].duration}
                  </span>
                  
                  {/* Playback Speed Toggles */}
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[9px] uppercase text-[#8B8B9E] font-mono mr-1">Speed</span>
                    {[0.5, 1, 1.5, 2].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => setPlaybackSpeed(speed)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border transition-all ${
                          playbackSpeed === speed
                            ? 'bg-[#4edea3]/10 border-[#4edea3] text-[#4edea3]'
                            : 'bg-transparent border-[#2A2A38] text-[#8B8B9E] hover:border-[#8B8B9E]/50'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>
                <h4 className="text-xl font-bold mb-2 text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {TUTORIALS[activeVideoIndex].title}
                </h4>
                <p className="text-sm text-[#8B8B9E] leading-relaxed mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {TUTORIALS[activeVideoIndex].description}
                </p>

                {/* Step by Step Guide */}
                {TUTORIALS[activeVideoIndex].steps && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A38]/50">
                    <span className="text-[10px] font-semibold tracking-wider font-mono text-[#A0A0D2] uppercase block mb-2">
                      Key Steps Shown in Video:
                    </span>
                    <ul className="space-y-1.5">
                      {TUTORIALS[activeVideoIndex].steps.map((step, sIdx) => (
                        <li key={sIdx} className="text-xs text-[#8B8B9E] flex items-start gap-2 leading-relaxed">
                          <span className="text-[#4edea3] font-mono font-semibold mt-0.5 shrink-0">{sIdx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Playlist */}
            <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-[#2A2A38] bg-[#16161F] flex flex-col max-h-[600px] lg:max-h-none overflow-y-auto">
              <div className="p-4 border-b border-[#2A2A38]">
                <h5 className="font-semibold text-[#F1F1F3] text-xs tracking-wider uppercase font-mono">
                  Walkthrough Playlists
                </h5>
                <p className="text-[11px] text-[#8B8B9E] mt-1">
                  Watch AgentMark in action
                </p>
              </div>
              <div className="flex-1 divide-y divide-[#2A2A38]/50">
                {TUTORIALS.map((video, idx) => {
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
    </div>
  );
}
