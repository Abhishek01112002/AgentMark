import React from 'react';
import { PenTool } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import { useCampaignResultContext } from '../context/CampaignResultContext';

export const ResultSidebar: React.FC = React.memo(() => {
  const {
    campaign,
    showHumanReview,
    isMinimized,
    setIsMinimized,
    selectedAgent,
    setSelectedAgent,
    revisionFeedback,
    setRevisionFeedback,
    revisionCounts,
    qualityScore,
    agentScores,
    drawerTab,
    setDrawerTab,
    reviewerNotes,
    parsedCampaignOutputs,
    handleApprove,
    handleRequestRevision,
  } = useCampaignResultContext();

  const normQualityScore = (qualityScore !== null && qualityScore !== undefined)
    ? (qualityScore > 10 ? qualityScore : qualityScore * 10)
    : null;

  React.useEffect(() => {
    if (!showHumanReview || isMinimized) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active) {
        const tagName = active.tagName.toUpperCase();
        if (
          tagName === 'INPUT' ||
          tagName === 'TEXTAREA' ||
          tagName === 'SELECT' ||
          (active as HTMLElement).isContentEditable
        ) {
          return;
        }
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        setIsMinimized(true);
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleApprove();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHumanReview, isMinimized, handleApprove, setIsMinimized]);

  return (
    <>
      {/* Persistent Floating Approval Actions Bar */}
      {campaign?.status === 'awaiting_human_approval' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F0F15]/90 backdrop-blur-md border-t border-[#2A2A38] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:pl-[272px] pr-8">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#F1F1F3]">Human Review Required</p>
              <p className="text-xs text-[#8B8B9E]">AI agents have generated campaign drafts. Inspect metrics or request changes.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setIsMinimized(false);
                setDrawerTab('scores');
              }}
              className="px-4 py-3 min-h-[44px] rounded-xl bg-[#1A1A24] border border-[#2A2A38] text-xs font-semibold hover:bg-surface hover:border-[#6366F1]/50 text-[#F1F1F3] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Inspect Scores
            </button>
            <button
              onClick={() => {
                setIsMinimized(false);
                setDrawerTab('revise');
              }}
              className="px-4 py-3 min-h-[44px] rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs font-semibold hover:bg-[#DC2626]/20 text-[#EF4444] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Request Revision
            </button>
            <button
              onClick={handleApprove}
              className="px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold bg-[#4edea3] hover:bg-[#3ce595] text-[#0e0e13] transition-all cursor-pointer shadow-[0_0_15px_rgba(78,222,163,0.3)] whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Approve &amp; Publish
            </button>
          </div>
        </div>
      )}

      {/* Partial left-side dim overlay — does NOT block interaction with main content */}
      {showHumanReview && !isMinimized && campaign?.status === 'awaiting_human_approval' && (
        <div
          onClick={() => setIsMinimized(true)}
          className="fixed inset-0 z-[90] cursor-pointer"
          style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
        />
      )}

      {/* Right-side Inspector Drawer */}
      <div
        className={`inspector-drawer fixed top-0 right-0 h-full z-[100] flex flex-col ${
          showHumanReview && !isMinimized && campaign?.status === 'awaiting_human_approval' ? 'open' : ''
        }`}
        style={{ width: '100%', maxWidth: '480px', background: '#0d0d14', borderLeft: '1px solid rgba(192,193,255,0.15)', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2b]" style={{ background: '#0d0d14' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(192,193,255,0.1)', border: '1px solid rgba(192,193,255,0.2)' }}>
              <span className="material-symbols-outlined text-[18px] text-[#4edea3]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Human-in-the-Loop</p>
              <h2 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Inspector Panel</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {normQualityScore !== null && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold mr-1" style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(78,222,163,0.12)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.25)' }}>
                {normQualityScore.toFixed(1)}/100
              </span>
            )}
            {/* Minimize/Collapse Button */}
            <button 
              onClick={() => setIsMinimized(true)} 
              className="p-1 rounded hover:bg-[#1e1e2b] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
              title="Minimize Inspector Panel"
            >
              <span className="material-symbols-outlined text-[20px] block">keyboard_double_arrow_right</span>
            </button>
          </div>
        </div>

        {/* Drawer Tabs */}
        <div className="flex border-b border-[#1e1e2b] px-2 overflow-x-auto scrollbar-none min-w-max w-full">
          <button className={`drawer-tab-btn ${drawerTab === 'scores' ? 'active' : ''}`} onClick={() => setDrawerTab('scores')}>Technical Audit</button>
          <button className={`drawer-tab-btn ${drawerTab === 'inspect' ? 'active' : ''}`} onClick={() => setDrawerTab('inspect')}>Inspect Drafts</button>
          <button className={`drawer-tab-btn ${drawerTab === 'revise' ? 'active' : ''}`} onClick={() => setDrawerTab('revise')}>Request Revision</button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A38 transparent' }}>

          {/* TAB 1 — Review Scores */}
          {drawerTab === 'scores' && (
            <div className="p-6 space-y-5">
              {/* Overall Score Ring */}
              <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                <div className="relative flex-shrink-0 w-[88px] h-[88px]">
                  <svg width="88" height="88" viewBox="0 0 88 88">
                    <circle cx="44" cy="44" r="36" fill="none" stroke="#1e1e2b" strokeWidth="8" />
                    <circle
                      cx="44" cy="44" r="36" fill="none"
                      stroke={normQualityScore !== null && normQualityScore >= 85 ? '#4edea3' : normQualityScore !== null && normQualityScore >= 70 ? '#FFA500' : '#F43F5E'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 36}`}
                      strokeDashoffset={`${2 * Math.PI * 36 * (1 - Math.min((normQualityScore ?? 0), 100) / 100)}`}
                      transform="rotate(-90 44 44)"
                      className="score-ring"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                      {normQualityScore !== null ? normQualityScore.toFixed(1) : '—'}
                    </span>
                    <span className="text-[9px]" style={{ color: '#4A4A5E' }}>/100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Overall Quality</p>
                  <p className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    {normQualityScore !== null && normQualityScore >= 85
                      ? 'Excellent — content meets all quality benchmarks.'
                      : normQualityScore !== null && normQualityScore >= 70
                      ? 'Good — minor improvements suggested below.'
                      : normQualityScore !== null
                      ? 'Needs revision — review issues before publishing.'
                      : 'Score calculating...'}
                  </p>
                </div>
              </div>

              {/* Per-Agent Score Bars */}
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e2b' }}>
                <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Agent Quality Breakdown</p>
                </div>
                <div className="p-4 space-y-4" style={{ background: '#0d0d14' }}>
                  {([
                    { key: 'research', label: 'Research', icon: 'search' },
                    { key: 'strategy', label: 'Strategy', icon: 'lightbulb' },
                    { key: 'copywriter', label: 'Copywriter', icon: 'edit_note' },
                    { key: 'image_prompt', label: 'Image Prompt', icon: 'image' },
                  ] as const).map(({ key, label, icon }) => {
                    const safeAgentScores = agentScores || { research: null, strategy: null, copywriter: null, image_prompt: null };
                    const rawScore = safeAgentScores[key as keyof typeof safeAgentScores];
                    const score = (rawScore !== null && rawScore !== undefined) ? (rawScore > 10 ? rawScore : rawScore * 10) : null;
                    const pct = score !== null ? score : 0;
                    const color = score === null ? '#4A4A5E' : score >= 85 ? '#4edea3' : score >= 70 ? '#FFA500' : '#F43F5E';
                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
                            <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
                            {score !== null ? `${score.toFixed(1)}/100` : '—'}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full" style={{ background: '#1e1e2b' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer Notes */}
              {reviewerNotes && (
                <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                  <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>AI Reviewer Summary</p>
                  </div>
                  <div className="p-4 space-y-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                    {reviewerNotes.feedback && (
                      <p className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{reviewerNotes.feedback}</p>
                    )}
                    {reviewerNotes.issues.length > 0 && (
                      <ul className="space-y-2 mt-2">
                        {reviewerNotes.issues.map((issue, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style={{ color: '#c0c1ff' }}>info</span>
                            <span className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {!reviewerNotes.feedback && reviewerNotes.issues.length === 0 && (
                      <p className="text-xs" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>No specific notes from the reviewer.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Revision budget used */}
              <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                  <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Budget Used</p>
                </div>
                <div className="p-4 grid grid-cols-2 gap-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                  {Object.entries(revisionCounts).map(([key, count]) => {
                    const MAX = 3;
                    const label = key === 'copywriter' ? 'Copywriter' : key === 'image_prompt' ? 'Image Prompt' : key.charAt(0).toUpperCase() + key.slice(1);
                    const isMax = count >= MAX;
                    const isWarn = count === MAX - 1;
                    const dotColor = isMax ? '#F43F5E' : isWarn ? '#FFA500' : '#4edea3';
                    return (
                      <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                        <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                        <span className="flex items-center gap-1.5">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-2 h-2 rounded-full" style={{ background: i < count ? dotColor : '#1e1e2b' }} />
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => setDrawerTab('inspect')}
                className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(192,193,255,0.08)', color: '#c0c1ff', border: '1px solid rgba(192,193,255,0.15)' }}
              >
                <span className="material-symbols-outlined text-[16px]">article</span>
                Review Full Drafts →
              </button>
            </div>
          )}

          {/* TAB 2 — Inspect Drafts */}
          {drawerTab === 'inspect' && (
            <div className="p-6 space-y-4">
              <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Generated Campaign Artifacts</p>

              {parsedCampaignOutputs ? (() => {
                const { copyData, strategyData, imageData, managerData } = parsedCampaignOutputs;
                const sections: Array<{ label: string; icon: string; color: string; content: React.ReactNode }> = [];

                // Strategy preview
                if (strategyData) {
                  sections.push({
                    label: 'Strategy', icon: 'lightbulb', color: '#c0c1ff',
                    content: (
                      <div className="space-y-2">
                        {strategyData.positioning && (
                          <div>
                            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Positioning</p>
                            <p className="text-xs leading-relaxed" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{strategyData.positioning}</p>
                          </div>
                        )}
                        {strategyData.key_messages && strategyData.key_messages.length > 0 && (
                          <div>
                            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Key Messages</p>
                            <ul className="space-y-1">
                              {strategyData.key_messages.slice(0, 3).map((msg: string, i: number) => (
                                <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                                  <span className="text-[#c0c1ff] flex-shrink-0 mt-0.5">→</span>{msg}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ),
                  });
                }

                // Resolve channels to display in preview (ensures warning alert empty states are visible)
                const normalizeChannelName = (ch: string): string => {
                  const normalized = ch.toLowerCase().trim();
                  if (normalized === 'google ads' || normalized === 'google_ads' || normalized === 'googleads') return 'google_ads';
                  return normalized;
                };
                const selectedChannels = (managerData?.channels || []).map(normalizeChannelName);
                const flatCopyData = copyData?.copies ? { ...copyData, ...copyData.copies } : copyData;
                const copyChannels = flatCopyData
                  ? Object.keys(flatCopyData).filter(k => !['inferred_goal', 'copies', 'messaging_framework', 'strategic_alignment', 'copy_readiness'].includes(k))
                  : [];
                const activeChannels = selectedChannels.length > 0 ? selectedChannels : copyChannels;

                // Copy preview (shows all active channels with explicit missing alerts)
                if (flatCopyData && activeChannels.length > 0) {
                  sections.push({
                    label: 'Ad Copy', icon: 'edit_note', color: '#4edea3',
                    content: (
                      <div className="space-y-3">
                        {activeChannels.map((ch: string) => {
                          const ch_data = flatCopyData[ch];
                          const hasCopy = !!ch_data;
                          const headline = ch_data?.headline || ch_data?.subject || '';
                          const body = ch_data?.body || ch_data?.caption || ch_data?.post || '';
                          
                          if (!hasCopy) {
                            return (
                              <div key={ch} className="p-3 rounded-lg border border-[#F43F5E]/20 bg-[#F43F5E]/5">
                                <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: '#F43F5E', fontFamily: 'JetBrains Mono, monospace' }}>
                                  <ChannelIcon channel={ch} size={10} />
                                  <span>{ch.replace('_', ' ')}</span>
                                </p>
                                <p className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                                  ⚠️ Copywriter agent did not generate content for this channel.
                                </p>
                              </div>
                            );
                          }
                          
                          return (
                            <div key={ch} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                              <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                                <ChannelIcon channel={ch} size={10} />
                                <span>{ch.replace('_', ' ')}</span>
                              </p>
                              {headline && <p className="text-xs font-semibold mb-1" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>{headline}</p>}
                              {body && <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{typeof body === 'string' ? body : JSON.stringify(body).slice(0, 200)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    ),
                  });
                }

                // Visuals preview (shows all generated visual prompts)
                if (imageData?.image_prompts) {
                  sections.push({
                    label: 'Image Prompts', icon: 'image', color: '#FFA500',
                    content: (
                      <div className="space-y-3">
                        {imageData.image_prompts.map((p: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                {p.deliverable_name || `Prompt ${i + 1}`}
                              </p>
                              <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,165,0,0.1)', color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                {p.aspect_ratio || '1:1'}
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{p.prompt}</p>
                          </div>
                        ))}
                      </div>
                    ),
                  });
                }

                if (sections.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>article</span>
                      <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Campaign drafts are not yet available.</p>
                    </div>
                  );
                }

                return (
                  <>
                    {sections.map(({ label, icon, color, content }) => (
                      <div key={label} className="draft-card rounded-xl" style={{ border: '1px solid #1e1e2b', background: '#0d0d14' }}>
                        <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #1e1e2b', background: '#111118', borderRadius: '12px 12px 0 0' }}>
                          <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
                          <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>{label}</p>
                        </div>
                        <div className="p-4">{content}</div>
                      </div>
                    ))}
                  </>
                );
              })() : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>hourglass_empty</span>
                  <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Loading campaign data...</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3 — Request Revision */}
          {drawerTab === 'revise' && (
            <div className="p-6 space-y-5">
              {/* Agent Selector */}
              <div>
                <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Select Agent to Revise</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {([
                    { key: 'research', label: 'Research', icon: 'search', downstream: 'Re-runs Strategy → Copy → Image → Reviewer' },
                    { key: 'strategy', label: 'Strategy', icon: 'lightbulb', downstream: 'Re-runs Copy → Image → Reviewer' },
                    { key: 'copywriter', label: 'Copywriter', icon: 'edit_note', downstream: 'Re-runs Image → Reviewer' },
                    { key: 'image_prompt', label: 'Image Prompt', icon: 'image', downstream: 'Re-runs Reviewer only' },
                  ] as const).map(({ key, label, icon, downstream }) => {
                    const count = revisionCounts[key as keyof typeof revisionCounts];
                    const isMax = count >= 3;
                    const isSelected = selectedAgent === key;
                    return (
                      <button
                        key={key}
                        onClick={() => !isMax && setSelectedAgent(key)}
                        disabled={isMax}
                        title={downstream}
                        className="relative flex flex-col items-start p-3 rounded-xl text-left transition-all"
                        style={{
                          background: isSelected ? 'rgba(192,193,255,0.1)' : '#111118',
                          border: isSelected ? '1px solid rgba(192,193,255,0.4)' : '1px solid #1e1e2b',
                          opacity: isMax ? 0.4 : 1,
                          cursor: isMax ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <span className="material-symbols-outlined text-[18px] mb-2" style={{ color: isSelected ? '#c0c1ff' : '#4A4A5E' }}>{icon}</span>
                        <span className="text-xs font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: isSelected ? '#F1F1F3' : '#8B8B9E' }}>{label}</span>
                        <div className="flex items-center gap-1 mt-1.5">
                          {[0,1,2].map(i => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < count ? '#F43F5E' : '#1e1e2b' }} />
                          ))}
                          <span className="text-[9px] ml-1" style={{ color: isMax ? '#F43F5E' : '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>{count}/3{isMax ? ' MAX' : ''}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Downstream Impact */}
              {selectedAgent && (
                <div className="p-3 rounded-xl" style={{ background: 'rgba(192,193,255,0.05)', border: '1px solid rgba(192,193,255,0.15)' }}>
                  <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>⚡ Downstream Impact</p>
                  <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    {selectedAgent === 'research' && 'Revising Research will cascade to Strategy → Copywriter → Image Prompt → Reviewer. All downstream agents will re-run.'}
                    {selectedAgent === 'strategy' && 'Revising Strategy will cascade to Copywriter → Image Prompt → Reviewer.'}
                    {selectedAgent === 'copywriter' && 'Revising Copywriter will cascade to Image Prompt → Reviewer.'}
                    {selectedAgent === 'image_prompt' && 'Only Image Prompt and the Reviewer will re-run.'}
                  </p>
                </div>
              )}

              {/* Feedback Textarea */}
              <div>
                <p className="text-xs mb-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                  <strong>Tip:</strong> For channel changes, use Copywriter or Strategy. For a full campaign rework, use Strategy — it regenerates everything downstream automatically.
                </p>
                <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Instructions</label>
                <textarea
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="e.g., The copywriting tone is too formal. Please make it more casual and conversational for Gen Z."
                  rows={5}
                  className="w-full rounded-xl px-4 py-3 text-xs resize-none focus:outline-none bg-[#111118] text-[#F1F1F3] border border-[#2A2A38] focus:border-[rgba(192,193,255,0.4)] focus:shadow-[0_0_0_3px_rgba(192,193,255,0.1)] transition-all"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                />
                <p className="text-[10px] mt-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
                  Tip: Be specific — mention what's wrong and what tone/direction you prefer.
                </p>
              </div>

              <button
                onClick={handleRequestRevision}
                disabled={revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3}
                className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98] bg-[#DC2626] text-white border-none shadow-[0_4px_24px_rgba(220,38,38,0.4)] disabled:opacity-30 disabled:cursor-not-allowed enabled:hover:bg-[#EF4444] enabled:hover:shadow-[0_6px_32px_rgba(220,38,38,0.55)]"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Request Revision
              </button>
              <p className="text-[10px] text-center mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                <PenTool size={12} className="shrink-0" style={{ color: '#A0A0D2' }} /> Request Revision edits and updates content inside this current campaign draft
              </p>
            </div>
          )}
        </div>

        {/* Sticky Footer — Approve & Publish */}
        {drawerTab !== 'revise' && (
        <div className="px-6 py-4" style={{ borderTop: '1px solid #1e1e2b', background: '#0d0d14' }}>
          <button
            onClick={handleApprove}
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-gradient-to-br from-[#c0c1ff] to-[#a8a9ff] text-[#0e0e13] shadow-[0_4px_20px_rgba(192,193,255,0.25)] hover:shadow-[0_6px_28px_rgba(192,193,255,0.4)]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            Approve &amp; Publish Campaign
          </button>
          <p className="text-[10px] text-center mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
            This will trigger the Publisher Agent to finalize all deliverables.
          </p>
        </div>
        )}
      </div>
    </>
  );
});

