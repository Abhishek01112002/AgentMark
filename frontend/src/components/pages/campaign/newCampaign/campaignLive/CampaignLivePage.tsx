import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Loader2, Pause, XCircle } from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../shared/topNav/TopNav';

interface Agent {
  id: number;
  name: string;
  status: 'completed' | 'running' | 'pending';
  description: string;
  duration?: string;
}

const CampaignLivePage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [typewriterText, setTypewriterText] = useState('');
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showHumanReview, setShowHumanReview] = useState(false);

  const strings = [
    "Drafting introduction paragraph based on Hook 2...",
    "Optimizing sentence length for readability...",
    "Injecting brand voice variables...",
    "Cross-referencing compliance guidelines..."
  ];

  const [agents, setAgents] = useState<Agent[]>([
    {
      id: 1,
      name: 'Manager Agent',
      status: 'completed',
      description: 'Orchestrated sequence',
      duration: '1m 12s',
    },
    {
      id: 2,
      name: 'Research Agent',
      status: 'completed',
      description: 'Competitor analysis generated',
      duration: '45s',
    },
    {
      id: 3,
      name: 'Strategy Agent',
      status: 'completed',
      description: 'Angles and hooks defined',
      duration: '2m 04s',
    },
    {
      id: 4,
      name: 'Copywriter Agent',
      status: 'completed',
      description: 'Content drafts completed',
      duration: '3m 22s',
    },
    {
      id: 5,
      name: 'Image Prompt Agent',
      status: 'completed',
      description: 'Visual prompts generated',
      duration: '1m 15s',
    },
    {
      id: 6,
      name: 'Reviewer Agent',
      status: 'running',
      description: 'Evaluating content quality...',
    },
    {
      id: 7,
      name: 'Publisher Agent',
      status: 'pending',
      description: 'Awaiting human approval',
    },
  ]);

  const progress = (agents.filter(a => a.status === 'completed').length / agents.length) * 100;

  const handleRequestRevision = () => {
    setShowHumanReview(false);
    setAgents(prevAgents => {
      const newAgents = [...prevAgents];
      const copywriterIndex = newAgents.findIndex(a => a.name === 'Copywriter Agent');
      const imagePromptIndex = newAgents.findIndex(a => a.name === 'Image Prompt Agent');
      const reviewerIndex = newAgents.findIndex(a => a.name === 'Reviewer Agent');
      
      if (copywriterIndex !== -1) {
        newAgents[copywriterIndex] = {
          ...newAgents[copywriterIndex],
          status: 'running',
          description: 'Revising content based on feedback...',
          duration: undefined,
        };
      }
      if (imagePromptIndex !== -1) {
        newAgents[imagePromptIndex] = {
          ...newAgents[imagePromptIndex],
          status: 'pending',
          description: 'Waiting for revised content...',
          duration: undefined,
        };
      }
      if (reviewerIndex !== -1) {
        newAgents[reviewerIndex] = {
          ...newAgents[reviewerIndex],
          status: 'pending',
          description: 'Will re-evaluate after revision...',
          duration: undefined,
        };
      }
      return newAgents;
    });
  };

  const handleApprove = () => {
    setShowHumanReview(false);
    setAgents(prevAgents => {
      const newAgents = [...prevAgents];
      const publisherIndex = newAgents.findIndex(a => a.name === 'Publisher Agent');
      if (publisherIndex !== -1) {
        newAgents[publisherIndex] = {
          ...newAgents[publisherIndex],
          status: 'running',
          description: 'Publishing content...',
        };
      }
      return newAgents;
    });
  };

  useEffect(() => {
    const reviewerAgent = agents.find(a => a.name === 'Reviewer Agent');
    if (reviewerAgent?.status === 'completed' && !showHumanReview) {
      const timer = window.setTimeout(() => {
        setShowHumanReview(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [agents, showHumanReview]);

  useEffect(() => {
    const publisherCompleted = agents.find(a => a.name === 'Publisher Agent')?.status === 'completed';
    if (publisherCompleted) {
      const timer = window.setTimeout(() => {
        navigate(`/campaign/${campaignId}/result`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [agents, navigate, campaignId]);

  useEffect(() => {
    const progressTimer = window.setTimeout(() => {
      setAgents(prevAgents => {
        const runningIndex = prevAgents.findIndex(a => a.status === 'running');
        if (runningIndex === -1) return prevAgents;

        const newAgents = [...prevAgents];
        newAgents[runningIndex] = {
          ...newAgents[runningIndex],
          status: 'completed',
          duration: `${Math.floor(Math.random() * 3) + 1}m ${Math.floor(Math.random() * 60)}s`,
        };

        const nextPendingIndex = newAgents.findIndex((a, idx) => idx > runningIndex && a.status === 'pending');
        if (nextPendingIndex !== -1 && newAgents[runningIndex].name !== 'Reviewer Agent') {
          newAgents[nextPendingIndex] = {
            ...newAgents[nextPendingIndex],
            status: 'running',
            description: 'Processing...',
          };
        }

        return newAgents;
      });
    }, 5000);

    return () => clearTimeout(progressTimer);
  }, [agents]);

  // Typewriter effect
  useEffect(() => {
    const currentString = strings[currentStringIndex];
    let timeout: number;

    if (isDeleting) {
      if (typewriterText.length > 0) {
        timeout = window.setTimeout(() => {
          setTypewriterText(currentString.substring(0, typewriterText.length - 1));
        }, 30);
      } else {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % strings.length);
        timeout = window.setTimeout(() => {}, 500);
      }
    } else {
      if (typewriterText.length < currentString.length) {
        timeout = window.setTimeout(() => {
          setTypewriterText(currentString.substring(0, typewriterText.length + 1));
        }, 60);
      } else {
        timeout = window.setTimeout(() => {
          setIsDeleting(true);
        }, 2000);
      }
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, currentStringIndex, strings]);

  return (
    <>
      <style>{`
        .pulse-dot {
          box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.7);
          animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(78, 222, 163, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(78, 222, 163, 0); }
        }
        .pulse-indigo {
          box-shadow: 0 0 0 0 rgba(192, 193, 255, 0.4);
          animation: pulse-indigo-anim 2s infinite;
        }
        @keyframes pulse-indigo-anim {
          0% { box-shadow: 0 0 0 0 rgba(192, 193, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(192, 193, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(192, 193, 255, 0); }
        }
        .campaign-live-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .campaign-live-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen h-screen flex overflow-hidden" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Live" />

        <main className="campaign-live-main pt-14 flex-1 overflow-hidden" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="h-full overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] pulse-dot" />
                    <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                      Campaign Running
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#1f1f25] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                      ID: CMP-8921X
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                    Q4 Product Launch Multi-Channel
                  </h1>
                </div>
                <div className="flex gap-3">
                  <button className="px-4 py-2 rounded border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1f1f25] flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                    <Pause size={16} />
                    Pause
                  </button>
                  <button className="px-4 py-2 rounded border border-[#F43F5E] text-sm font-medium transition-colors hover:bg-[#F43F5E]/10 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F43F5E' }}>
                    <XCircle size={16} />
                    Abort
                  </button>
                </div>
              </div>

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Agent Pipeline */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-[#111118] border border-[#2A2A38] rounded-lg p-6 relative">
                    <h2 className="text-xs uppercase tracking-wider mb-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                      Agent Pipeline
                    </h2>

                    {/* Progress */}
                    <div className="mb-8">
                      <div className="flex justify-between text-xs mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ color: '#F1F1F3' }}>Progress</span>
                        <span style={{ color: '#4edea3' }}>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#2a292f] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4edea3] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="mt-2 text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
                        {agents.filter(a => a.status === 'completed').length} / {agents.length} agents complete
                      </div>
                    </div>

                    {/* Pipeline List */}
                    <div className="relative">
                      {/* Vertical connector line */}
                      <div className="absolute left-[15px] top-4 bottom-4 w-[1px] border-l border-dashed border-[#2A2A38] z-0" />

                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          className={`relative z-10 flex items-start mb-6 last:mb-0 ${
                            agent.status === 'running' ? 'bg-[#1b1b20] -mx-4 px-4 py-3 rounded-lg border-l-2 border-l-[#c0c1ff] pulse-indigo' : ''
                          } ${agent.status === 'pending' ? 'opacity-60 grayscale' : ''}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            agent.status === 'completed'
                              ? 'bg-[#4edea3]/10 border border-[#4edea3] text-[#4edea3] shadow-[0_0_10px_rgba(78,222,163,0.1)]'
                              : agent.status === 'running'
                              ? 'bg-[#c0c1ff]/20 border border-[#c0c1ff] text-[#c0c1ff]'
                              : 'bg-[#1f1f25] border border-[#2A2A38] text-[#4A4A5E]'
                          }`}>
                            {agent.status === 'completed' && <CheckCircle size={16} />}
                            {agent.status === 'running' && <Loader2 size={16} className="animate-spin" />}
                            {agent.status === 'pending' && <span className="text-xs">•</span>}
                          </div>
                          <div className="ml-4 flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: agent.status === 'running' ? '#c0c1ff' : '#F1F1F3' }}>
                              {agent.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ fontFamily: 'Sora, sans-serif', color: agent.status === 'running' ? '#8B8B9E' : '#4A4A5E' }}>
                              {agent.description}
                            </div>
                          </div>
                          {agent.duration && (
                            <div className="ml-auto text-xs mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                              {agent.duration}
                            </div>
                          )}
                          {agent.status === 'running' && (
                            <div className="ml-auto flex items-center text-xs mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse mr-2" />
                              Running
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Reasoning */}
                <div className="lg:col-span-8 flex flex-col h-[700px]">
                  <div className="bg-[#111118] border border-[#2A2A38] rounded-lg flex flex-col h-full overflow-hidden">
                    {/* Reasoning Header */}
                    <div className="px-6 py-4 border-b border-[#2A2A38] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1b1b20]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#c0c1ff]">▶</span>
                        <h3 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                          Live Reasoning Panel
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 bg-[#111118] px-3 py-1.5 rounded-full border border-[#2A2A38]">
                        <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
                        <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                          Copywriter Agent Active
                        </span>
                      </div>
                    </div>

                    {/* Terminal Content */}
                    <div className="flex-1 p-6 text-xs font-mono overflow-y-auto space-y-4 bg-[#0A0A0F]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                      <div style={{ color: '#4A4A5E' }}>System: Initiating Copywriter Agent instance...</div>
                      <div style={{ color: '#4A4A5E' }}>System: Loading context from Strategy Agent...</div>
                      <div style={{ color: '#4edea3' }}>&gt; Context loaded successfully. Parsing primary hooks.</div>
                      <div className="pl-4 border-l border-[#2A2A38] space-y-1 my-2">
                        <div>Hook 1: "Speed meets precision."</div>
                        <div>Hook 2: "The luxury of saving time."</div>
                        <div>Target Audience: CMOs, Marketing Directors.</div>
                      </div>
                      <div style={{ color: '#c0c1ff' }}>&gt; Generating Twitter variant sequence...</div>
                      <div className="bg-[#1f1f25] p-4 rounded border border-[#2A2A38] mt-2" style={{ color: '#F1F1F3' }}>
                        <span className="block mb-2" style={{ color: '#4edea3' }}>Drafting Tweet 1/3:</span>
                        Stop compromising between speed and quality. The new Q4 suite brings surgical precision to your ad campaigns. Deploy 10x faster without dropping a single brand guideline.<br /><br />
                        #MarketingTech #FutureOfWork
                      </div>
                      <div style={{ color: '#c0c1ff' }}>&gt; Generating LinkedIn thought-leadership post...</div>
                      <div>
                        <span style={{ color: '#4edea3' }}>&gt; Analyzing tone requirements:</span> Professional, authoritative, slightly aggressive.
                      </div>

                      {/* Typewriter effect container */}
                      <div className="mt-4 flex">
                        <span className="mr-2" style={{ color: '#c0c1ff' }}>&gt;</span>
                        <span style={{ color: '#F1F1F3' }}>{typewriterText}</span>
                        <span className="w-2 h-4 bg-[#c0c1ff] ml-1 animate-pulse inline-block align-middle mt-[2px]" />
                      </div>
                    </div>

                    {/* Processing Footer */}
                    <div className="px-6 py-4 border-t border-[#2A2A38] bg-[#1b1b20] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Loader2 size={16} className="text-[#4A4A5E] animate-spin" />
                        <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                          Waiting for agent to finish generating 5 variants...
                        </span>
                      </div>
                      <div className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                        Tokens: <span style={{ color: '#F1F1F3' }}>1,402</span> / 8,000
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Human Review Modal */}
        {showHumanReview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#111118] border border-[#c0c1ff]/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#c0c1ff]/10 ring-4 ring-[#c0c1ff]/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px] text-[#c0c1ff]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                </div>
                <h2 className="text-[20px] font-bold text-[#F1F1F3] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Human Review Required</h2>
                <p className="text-sm text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  The generated content has passed automated checks but requires final human approval before publishing.
                </p>
              </div>

              <div className="bg-[#1b1b20] rounded-xl p-4 mb-6 border border-[#2A2A38] flex items-center justify-between">
                <div className="text-sm font-medium text-[#F1F1F3]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Quality Score</div>
                <div className="text-[40px] leading-none text-[#4edea3]" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
                  8.7<span className="text-lg text-[#4A4A5E]">/10</span>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-sm font-medium text-[#F1F1F3] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Reviewer Notes:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start text-[#8B8B9E] text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#c0c1ff] mr-2 shrink-0 mt-0.5">info</span>
                    <span>Hook 1 matches target audience intent exceptionally well.</span>
                  </li>
                  <li className="flex items-start text-[#8B8B9E] text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#c0c1ff] mr-2 shrink-0 mt-0.5">info</span>
                    <span>Tone is slightly more aggressive than standard guidelines; consider adjusting if targeting conservative demographics.</span>
                  </li>
                  <li className="flex items-start text-[#8B8B9E] text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#c0c1ff] mr-2 shrink-0 mt-0.5">info</span>
                    <span>Character count optimized for social limits.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={handleRequestRevision}
                  className="flex-1 py-3 px-4 rounded-lg border border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Request Revision
                </button>
                <button 
                  onClick={handleApprove}
                  className="flex-1 py-3 px-4 rounded-lg bg-[#c0c1ff] text-[#0e0e13] hover:bg-[#a8a9ff] transition-colors text-sm font-bold flex items-center justify-center space-x-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Approve &amp; Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Wrap with provider
const CampaignLivePageWithProvider: React.FC = () => (
  <SidebarProvider>
    <CampaignLivePage />
  </SidebarProvider>
);

export default CampaignLivePageWithProvider;