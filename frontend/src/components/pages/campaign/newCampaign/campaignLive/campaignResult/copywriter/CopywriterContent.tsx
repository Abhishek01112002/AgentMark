import React, { useState } from 'react';
import { PenTool, Link, BookOpen, Copy, Check, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

interface CopywriterContentProps {
  data?: any;
}

const platforms = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'email', label: 'Email' },
  { id: 'google_ads', label: 'Google Ads' },
];

const CopywriterContent: React.FC<CopywriterContentProps> = ({ data }) => {
  const parsedData = React.useMemo(() => {
    if (!data) return null;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data; }
    }
    return data;
  }, [data]);

  const flatData = React.useMemo(() => {
    if (!parsedData) return null;
    return parsedData.copies ? { ...parsedData, ...parsedData.copies } : parsedData;
  }, [parsedData]);

  const hasRealData = flatData && Object.keys(flatData).length > 0;
  const [copied, setCopied] = useState(false);

  // Extract data from AI output
  const inferredGoal = flatData?.inferred_goal || '';
  const messagingFramework = flatData?.messaging_framework || {};
  const strategicAlignment = flatData?.strategic_alignment || {};
  const copyReadiness = flatData?.copy_readiness || {};

  // Get available platforms from data
  const availablePlatforms = platforms.filter(p => flatData?.[p.id]);

  const tabs = availablePlatforms.length > 0 ? availablePlatforms : platforms.slice(0, 4);

  // Set default active tab to instagram if available, otherwise first available platform
  const defaultTab = availablePlatforms.find(p => p.id === 'instagram')?.id || tabs[0]?.id || 'instagram';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Extract copy from AI output
  const activePlatformData = flatData?.[activeTab] || {};
  const ctas = activePlatformData?.ctas || {};

  /** Build a readable text block for the active platform's copy */
  const buildCopyText = (): string => {
    const parts: string[] = [];
    const platform = tabs.find(t => t.id === activeTab)?.label || activeTab;
    parts.push(`=== ${platform.toUpperCase()} COPY ===`);
    parts.push('');
    if (activePlatformData.subject) {
      parts.push(`Subject: ${activePlatformData.subject}`);
      parts.push('');
    }
    if (activePlatformData.headline) {
      parts.push(`Headline: ${activePlatformData.headline}`);
      parts.push('');
    }
    if (activePlatformData.body) {
      parts.push(activePlatformData.body);
      parts.push('');
    }
    if (ctas.primary || ctas.secondary || ctas.tertiary) {
      parts.push('CTAs:');
      if (ctas.primary) parts.push(`  Primary:   ${ctas.primary}`);
      if (ctas.secondary) parts.push(`  Secondary: ${ctas.secondary}`);
      if (ctas.tertiary) parts.push(`  Tertiary:  ${ctas.tertiary}`);
    }
    return parts.join('\n');
  };

  const handleCopyToClipboard = async () => {
    const text = buildCopyText();
    if (!text.trim()) {
      toast.error('No copy content to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Campaign copy copied to clipboard!', { id: 'copy-success' });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for environments where clipboard API is not available
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopied(true);
        toast.success('Campaign copy copied to clipboard!', { id: 'copy-success' });
        setTimeout(() => setCopied(false), 2500);
      } catch {
        toast.error('Unable to copy — please copy manually.', { id: 'copy-success' });
      }
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Campaign Copywriter</h2>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{hasRealData ? 'AI-generated marketing copy across channels' : 'Generating AI-optimized copy for "Q4 Product Launch".'}</p>
        </div>
      </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 mb-6">
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
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
              <ChannelIcon channel={tab.id} size={14} />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left Column - Copy Content */}
        <div className="xl:col-span-7 space-y-6">
          <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-50" />
            <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <PenTool size={20} className="text-[#6366F1]" />
                <h3 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{tabs.find(t => t.id === activeTab)?.label || 'Copy'}</h3>
              </div>
              <button
                onClick={handleCopyToClipboard}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-transparent border border-[#2A2A38] transition-all hover:bg-[#1A1A24] hover:border-[#6366F1]/40"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: copied ? '#4edea3' : '#8B8B9E' }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>

            {/* Channel-Specific Messaging (Strategy Box) */}
            {(() => {
              const framework = parsedData?.messaging_framework || {};
              const activeChannelMessaging = framework.channel_messaging?.find(
                (ch: any) => {
                  if (!ch?.channel_name) return false;
                  const name = ch.channel_name.toLowerCase().replace(/[^a-z0-9]/g, '');
                  const tab = activeTab.toLowerCase().replace(/[^a-z0-9]/g, '');
                  return name === tab || name.includes(tab) || tab.includes(name);
                }
              );
              if (!activeChannelMessaging) return null;
              return (
                <div className="mb-6 p-4 rounded-xl bg-[#0A0A0F] border border-[#2A2A38]/80 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#6366F1]" />
                  <div className="text-[10px] uppercase tracking-wider text-[#A0A0D2] font-semibold mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    <Target size={12} className="inline-block mr-1 -mt-0.5" /> Channel Strategy & Angle
                  </div>
                  <p className="text-sm font-medium mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                    {activeChannelMessaging.approach}
                  </p>
                  {activeChannelMessaging.key_points?.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeChannelMessaging.key_points.map((point: string, idx: number) => (
                        <span 
                          key={idx} 
                          className="px-2.5 py-1 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-semibold"
                          style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8083ff' }}
                        >
                          #{point}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-4">
              {activePlatformData.headline && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Headline</label>
                  <p className="text-sm md:text-base outline-none" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{activePlatformData.headline}</p>
                </div>
              )}

              {activePlatformData.subject && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Subject</label>
                  <p className="text-sm md:text-base outline-none" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{activePlatformData.subject}</p>
                </div>
              )}

              {activePlatformData.body && (
                <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                  <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Body</label>
                  <div className="text-sm md:text-base outline-none min-h-[120px] whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
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
            <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                <Link size={20} className="text-[#6366F1]" />
                Strategic Alignment
              </h4>
              <div className="space-y-3">
                <div>
                  <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Positioning Used</span>
                  <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{strategicAlignment.positioning_used}</p>
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
            <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                <BookOpen size={20} className="text-[#6366F1]" />
                Messaging Framework
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Brand Promise</span>
                  <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{messagingFramework.brand_promise}</p>
                </div>
                {messagingFramework.value_proposition && (
                  <div>
                    <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Value Proposition</span>
                    <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{messagingFramework.value_proposition}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segment Messaging */}
          {messagingFramework.segment_messaging?.length > 0 && (
            <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-base font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Segment Messaging</h4>
              <div className="space-y-3">
                {messagingFramework.segment_messaging.map((seg: any, idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-3">
                    <h5 className="text-xs font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{seg.segment_name}</h5>
                    <p className="text-xs mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{seg.message}</p>
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
        <div className="card-elevate mt-8 bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Copy Readiness Status</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {Object.entries(copyReadiness).map(([channel, ready]: [string, any]) => (
              <div key={channel} className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${ready ? 'bg-[#4edea3]' : 'bg-[#8B8B9E]'}`} />
                <ChannelIcon channel={channel} size={12} className={ready ? 'text-[#4edea3]' : 'text-[#8B8B9E]'} />
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

export default React.memo(CopywriterContent);
