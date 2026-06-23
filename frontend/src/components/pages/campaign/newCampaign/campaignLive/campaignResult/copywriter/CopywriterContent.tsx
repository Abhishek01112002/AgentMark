import React, { useState } from 'react';
import { Share2, Copy, Hash, FileText, Linkedin, Instagram, Facebook, Twitter, Music, Youtube, Mail, Target } from 'lucide-react';

interface CopywriterContentProps {
  data?: any;
}

const platforms = [
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'facebook', label: 'Facebook', icon: Facebook },
  { id: 'twitter', label: 'Twitter', icon: Twitter },
  { id: 'tiktok', label: 'TikTok', icon: Music },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'google_ads', label: 'Google Ads', icon: Target },
];

const CopywriterContent: React.FC<CopywriterContentProps> = ({ data }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  
  // Extract data from AI output
  const inferredGoal = data?.inferred_goal || '';
  const messagingFramework = data?.messaging_framework || {};
  const strategicAlignment = data?.strategic_alignment || {};
  const copyReadiness = data?.copy_readiness || {};
  
  // Get available platforms from data
  const availablePlatforms = platforms.filter(p => data?.[p.id]);
  
  const tabs = availablePlatforms.length > 0 ? availablePlatforms : platforms.slice(0, 4);
  
  // Set default active tab to instagram if available, otherwise first available platform
  const defaultTab = availablePlatforms.find(p => p.id === 'instagram')?.id || tabs[0]?.id || 'instagram';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Extract copy from AI output
  const activePlatformData = data?.[activeTab] || {};
  const ctas = activePlatformData?.ctas || {};

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Campaign Copywriter</h2>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{hasRealData ? 'AI-generated marketing copy across channels' : 'Generating AI-optimized copy for "Q4 Product Launch".'}</p>
        </div>
        <div className="flex items-center gap-2 bg-[#111118] p-1 rounded-lg border border-[#2A2A38]">
          <div className="w-2 h-2 rounded-full bg-[#6366F1] ml-2" style={{ animation: 'pulse 2s infinite' }} />
          <span className="text-xs px-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>AI Active</span>
        </div>
      </header>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 mb-6">
          <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            No copy data available yet. This will be populated after AI copywriter agent completes work.
          </p>
        </div>
      )}

      {/* Inferred Goal & Copy Readiness */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {inferredGoal && (
          <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
            Goal: {inferredGoal.replace('_', ' ').toUpperCase()}
          </span>
        )}
        {Object.entries(copyReadiness).filter(([_, ready]) => ready).length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
            {Object.entries(copyReadiness).filter(([_, ready]) => ready).length} Channels Ready
          </span>
        )}
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === tab.id ? 'bg-[#8083ff] text-[#0d0096] font-bold' : 'bg-[#111118] border border-[#2A2A38] text-[#F1F1F3] hover:bg-[#35343a]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              <tab.icon size={14} />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Copy Content */}
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-50" />
            <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Share2 size={20} className="text-[#6366F1]" />
                <h3 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{tabs.find(t => t.id === activeTab)?.label || 'Copy'}</h3>
              </div>
              <button className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-transparent border border-[#2A2A38] transition-colors hover:text-[#F1F1F3]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                <Copy size={14} />Copy to Clipboard
              </button>
            </div>

            <div className="space-y-4">
              {activePlatformData.headline && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Headline</label>
                  <p className="text-sm md:text-base outline-none" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{activePlatformData.headline}</p>
                </div>
              )}

              {activePlatformData.subject && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Subject</label>
                  <p className="text-sm md:text-base outline-none" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{activePlatformData.subject}</p>
                </div>
              )}

              {activePlatformData.body && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Body</label>
                  <div className="text-sm md:text-base outline-none min-h-[120px] whitespace-pre-wrap" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                    {activePlatformData.body}
                  </div>
                </div>
              )}

              {/* CTAs */}
              {(ctas.primary || ctas.secondary || ctas.tertiary) && (
                <div className="space-y-2">
                  <label className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Call to Actions</label>
                  <div className="flex flex-wrap gap-2">
                    {ctas.primary && (
                      <span className="px-4 py-2 bg-[#6366F1] rounded-lg text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{ctas.primary}</span>
                    )}
                    {ctas.secondary && (
                      <span className="px-4 py-2 bg-[#1A1A24] border border-[#2A2A38] rounded-lg text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{ctas.secondary}</span>
                    )}
                    {ctas.tertiary && (
                      <span className="px-4 py-2 bg-[#1A1A24] border border-[#2A2A38] rounded-lg text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{ctas.tertiary}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Strategic Alignment Below Copy */}
          {strategicAlignment.positioning_used && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                <Hash size={20} className="text-[#6366F1]" />
                Strategic Alignment
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Positioning Used</span>
                  <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{strategicAlignment.positioning_used}</p>
                </div>
                {strategicAlignment.key_messages_count && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Key Messages Integrated:</span>
                    <span className="px-2 py-1 rounded bg-[#6366F1]/10 text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{strategicAlignment.key_messages_count}</span>
                  </div>
                )}
                {strategicAlignment.deliverables?.length > 0 && (
                  <div>
                    <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Deliverables Covered</span>
                    <div className="flex flex-wrap gap-2">
                      {strategicAlignment.deliverables.map((del: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{del}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Messaging Framework & Segment Messaging */}
        <div className="xl:col-span-5 space-y-6">
          {/* Messaging Framework */}
          {messagingFramework.brand_promise && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                <FileText size={20} className="text-[#6366F1]" />
                Messaging Framework
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Brand Promise</span>
                  <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{messagingFramework.brand_promise}</p>
                </div>
                {messagingFramework.value_proposition && (
                  <div>
                    <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Value Proposition</span>
                    <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{messagingFramework.value_proposition}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segment Messaging */}
          {messagingFramework.segment_messaging?.length > 0 && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Segment Messaging</h4>
              <div className="space-y-3">
                {messagingFramework.segment_messaging.map((seg: any, idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-3">
                    <h5 className="text-xs font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{seg.segment_name}</h5>
                    <p className="text-xs mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{seg.message}</p>
                    <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Tone: {seg.tone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Copy Readiness Overview */}
      {Object.keys(copyReadiness).length > 0 && (
        <div className="mt-8 bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Copy Readiness Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {Object.entries(copyReadiness).map(([channel, ready]: [string, any]) => (
              <div key={channel} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${ready ? 'bg-[#4edea3]' : 'bg-[#8B8B9E]'}`} />
                <span className="text-xs capitalize" style={{ fontFamily: 'JetBrains Mono, monospace', color: ready ? '#4edea3' : '#8B8B9E' }}>
                  {channel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CopywriterContent;
