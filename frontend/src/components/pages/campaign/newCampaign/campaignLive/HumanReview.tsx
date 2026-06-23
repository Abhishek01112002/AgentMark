import React, { useState, useEffect } from 'react';

const CampaignLive: React.FC = () => {
  const [typewriterText, setTypewriterText] = useState('');
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(true);

  const typewriterStrings = [
    "Drafting introduction paragraph based on Hook 2...",
    "Optimizing sentence length for readability...",
    "Injecting brand voice variables...",
    "Cross-referencing compliance guidelines..."
  ];

  // Typewriter effect
  useEffect(() => {
    const currentString = typewriterStrings[currentStringIndex];
    let timeout: ReturnType<typeof setTimeout>;

    const type = () => {
      if (isDeleting) {
        setTypewriterText(currentString.substring(0, currentCharIndex - 1));
        setCurrentCharIndex(prev => prev - 1);
      } else {
        setTypewriterText(currentString.substring(0, currentCharIndex + 1));
        setCurrentCharIndex(prev => prev + 1);
      }

      let typeSpeed = isDeleting ? 30 : 60;

      if (!isDeleting && currentCharIndex === currentString.length) {
        typeSpeed = 2000;
        setTimeout(() => setIsDeleting(true), typeSpeed);
        return;
      } else if (isDeleting && currentCharIndex === 0) {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % typewriterStrings.length);
        typeSpeed = 500;
      }

      timeout = setTimeout(type, typeSpeed);
    };

    timeout = setTimeout(type, isDeleting ? 30 : 60);

    return () => clearTimeout(timeout);
  }, [currentCharIndex, currentStringIndex, isDeleting]);

  return (
    <div className="w-full h-full relative">
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
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2A2A38; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #464554; }
      `}</style>

      {/* Main Content Canvas */}
      <main className="overflow-y-auto px-margin-mobile md:px-margin-desktop py-8 h-full">
        <div className="max-w-container-max mx-auto max-w-5xl">
          
          {/* Page Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-2 flex-wrap gap-2">
                <div className="flex items-center space-x-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary pulse-dot"></span>
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Campaign Running</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container border border-border-base font-label-sm text-label-sm text-text-muted">
                  ID: CMP-8921X
                </span>
              </div>
              <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-text-primary">
                Q4 Product Launch Multi-Channel
              </h1>
            </div>
            <div className="flex space-x-3">
              <button className="px-4 py-2 rounded border border-border-base text-text-primary hover:bg-surface-container transition-colors font-label-md text-label-md">
                Pause
              </button>
              <button className="px-4 py-2 rounded border border-danger text-danger hover:bg-danger/10 transition-colors font-label-md text-label-md">
                Abort
              </button>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
            
            {/* Left Column: Agent Pipeline */}
            <div className="lg:col-span-4 flex flex-col space-y-4">
              <div className="bg-surface border border-border-base rounded-lg p-6 relative">
                <h2 className="font-label-md text-label-md text-text-muted mb-4 uppercase tracking-wider">
                  Agent Pipeline
                </h2>
                
                {/* Progress */}
                <div className="mb-8">
                  <div className="flex justify-between font-label-sm text-label-sm mb-2">
                    <span className="text-text-primary">Progress</span>
                    <span className="text-secondary">43%</span>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full transition-all duration-500" style={{ width: '43%' }}></div>
                  </div>
                  <div className="mt-2 font-body-sm text-body-sm text-text-muted">3 / 7 agents complete</div>
                </div>

                {/* Pipeline List */}
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-[1px] border-l border-dashed border-border-base z-0"></div>
                  
                  {/* Agent 1: Completed */}
                  <div className="relative z-10 flex items-start mb-6 group">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary text-secondary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(78,222,163,0.1)]">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-primary">Manager Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Orchestrated sequence</div>
                    </div>
                    <div className="ml-auto font-label-sm text-label-sm text-text-muted mt-1">1m 12s</div>
                  </div>

                  {/* Agent 2: Completed */}
                  <div className="relative z-10 flex items-start mb-6">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary text-secondary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(78,222,163,0.1)]">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-primary">Research Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Competitor analysis generated</div>
                    </div>
                    <div className="ml-auto font-label-sm text-label-sm text-text-muted mt-1">45s</div>
                  </div>

                  {/* Agent 3: Completed */}
                  <div className="relative z-10 flex items-start mb-6">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 border border-secondary text-secondary flex items-center justify-center shrink-0 mt-0.5 shadow-[0_0_10px_rgba(78,222,163,0.1)]">
                      <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-primary">Strategy Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Angles and hooks defined</div>
                    </div>
                    <div className="ml-auto font-label-sm text-label-sm text-text-muted mt-1">2m 04s</div>
                  </div>

                  {/* Agent 4: Running */}
                  <div className="relative z-10 flex items-start mb-6 bg-surface-container-low -mx-4 px-4 py-3 rounded-lg border-l-2 border-l-primary shadow-[inset_0_0_20px_rgba(192,193,255,0.05)] pulse-indigo">
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary text-primary flex items-center justify-center shrink-0 mt-0.5 relative">
                      <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-primary">Copywriter Agent</div>
                      <div className="font-body-sm text-body-sm text-text-secondary">Drafting social variants...</div>
                    </div>
                    <div className="ml-auto font-label-sm text-label-sm text-primary mt-1 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-2"></span>
                      Running
                    </div>
                  </div>

                  {/* Agent 5: Pending */}
                  <div className="relative z-10 flex items-start mb-6 opacity-60 grayscale">
                    <div className="w-8 h-8 rounded-full bg-surface-container border border-border-base text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">image</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-muted">Image Prompt Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Pending previous steps</div>
                    </div>
                  </div>

                  {/* Agent 6: Pending */}
                  <div className="relative z-10 flex items-start mb-6 opacity-60 grayscale">
                    <div className="w-8 h-8 rounded-full bg-surface-container border border-border-base text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">fact_check</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-muted">Reviewer Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Pending previous steps</div>
                    </div>
                  </div>

                  {/* Agent 7: Pending */}
                  <div className="relative z-10 flex items-start opacity-60 grayscale">
                    <div className="w-8 h-8 rounded-full bg-surface-container border border-border-base text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="font-label-md text-label-md text-text-muted">Publisher Agent</div>
                      <div className="font-body-sm text-body-sm text-text-muted">Pending previous steps</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Reasoning */}
            <div className="lg:col-span-8 flex flex-col h-[700px]">
              <div className="bg-surface border border-border-base rounded-lg flex flex-col h-full overflow-hidden">
                
                {/* Reasoning Header */}
                <div className="px-6 py-4 border-b border-border-base flex items-center justify-between bg-surface-container-low">
                  <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-primary">terminal</span>
                    <h3 className="font-label-md text-label-md text-text-primary">Live Reasoning Panel</h3>
                  </div>
                  <div className="flex items-center space-x-2 bg-surface px-3 py-1.5 rounded-full border border-border-base">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="font-label-sm text-label-sm text-text-secondary">Copywriter Agent Active</span>
                  </div>
                </div>

                {/* Terminal Content */}
                <div className="flex-1 p-6 font-label-sm text-label-sm font-mono text-text-secondary overflow-y-auto space-y-4 bg-[#0A0A0F]">
                  <div className="text-text-muted">System: Initiating Copywriter Agent instance...</div>
                  <div className="text-text-muted">System: Loading context from Strategy Agent...</div>
                  <div className="text-secondary">&gt; Context loaded successfully. Parsing primary hooks.</div>
                  <div className="pl-4 border-l border-border-base space-y-1 my-2">
                    <div>Hook 1: "Speed meets precision."</div>
                    <div>Hook 2: "The luxury of saving time."</div>
                    <div>Target Audience: CMOs, Marketing Directors.</div>
                  </div>
                  <div className="text-primary">&gt; Generating Twitter variant sequence...</div>
                  <div className="bg-surface-container p-4 rounded border border-border-base text-text-primary mt-2">
                    <span className="text-secondary block mb-2">Drafting Tweet 1/3:</span>
                    Stop compromising between speed and quality. The new Q4 suite brings surgical precision to your ad campaigns. Deploy 10x faster without dropping a single brand guideline. <br /><br />
                    #MarketingTech #FutureOfWork
                  </div>
                  <div className="text-primary">&gt; Generating LinkedIn thought-leadership post...</div>
                  <div><span className="text-secondary">&gt; Analyzing tone requirements:</span> Professional, authoritative, slightly aggressive.</div>
                  
                  {/* Typewriter effect container */}
                  <div className="mt-4 flex">
                    <span className="text-primary mr-2">&gt;</span>
                    <span className="text-text-primary">{typewriterText}</span>
                    <span className="w-2 h-4 bg-primary ml-1 animate-pulse inline-block align-middle mt-[2px]"></span>
                  </div>
                </div>

                {/* Processing Footer */}
                <div className="px-6 py-4 border-t border-border-base bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <span className="material-symbols-outlined text-text-muted animate-spin">progress_activity</span>
                    <span className="font-label-md text-label-md text-text-muted">Waiting for agent to finish generating 5 variants...</span>
                  </div>
                  <div className="font-label-sm text-label-sm text-text-muted">
                    Tokens: <span className="text-text-primary">1,402</span> / 8,000
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Human Checkpoint Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-primary/30 rounded-2xl p-8 max-w-lg w-full shadow-2xl relative">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 ring-4 ring-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-[32px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
              </div>
              <h2 className="font-headline-md text-[20px] font-bold text-text-primary mb-2">Human Review Required</h2>
              <p className="font-body-sm text-body-sm text-text-secondary">
                The generated content has passed automated checks but requires final human approval before publishing.
              </p>
            </div>

            <div className="bg-surface-container-low rounded-xl p-4 mb-6 border border-border-base flex items-center justify-between">
              <div className="font-label-md text-label-md text-text-primary">Quality Score</div>
              <div className="font-display-lg text-[40px] leading-none text-secondary">
                8.7<span className="text-lg text-text-muted">/10</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-label-md text-label-md text-text-primary mb-3">Reviewer Notes:</h3>
              <ul className="space-y-3">
                <li className="flex items-start text-text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-primary mr-2 shrink-0 mt-0.5">info</span>
                  <span>Hook 1 matches target audience intent exceptionally well.</span>
                </li>
                <li className="flex items-start text-text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-primary mr-2 shrink-0 mt-0.5">info</span>
                  <span>Tone is slightly more aggressive than standard guidelines; consider adjusting if targeting conservative demographics.</span>
                </li>
                <li className="flex items-start text-text-secondary font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px] text-primary mr-2 shrink-0 mt-0.5">info</span>
                  <span>Character count optimized for social limits.</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-4 rounded-lg border border-danger text-danger hover:bg-danger/10 transition-colors font-label-md text-label-md font-bold"
              >
                Request Revision
              </button>
              <button 
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-4 rounded-lg bg-primary text-on-primary hover:bg-primary-fixed-dim transition-colors font-label-md text-label-md font-bold flex items-center justify-center space-x-2"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Approve &amp; Publish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignLive;
