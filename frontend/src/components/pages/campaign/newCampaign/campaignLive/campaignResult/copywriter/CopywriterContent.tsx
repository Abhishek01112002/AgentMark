import React, { useState, useEffect } from 'react';
import { Link, BookOpen, Copy, Target, Plus, Loader2, Eye, EyeOff, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import api from '../../../../../../../services/api';
import { CopyVariant, CopyVariantsMap } from '../../../../../../../types/variants';

interface CopywriterContentProps {
  data?: any;
  campaignId?: string;
  campaign?: any;
  onCopyVariantsUpdate?: (variants: CopyVariantsMap) => void;
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
  { id: 'general', label: 'General' },
];

function getVariantsForChannel(
  channel: string,
  copyVariants: CopyVariantsMap | null,
  legacyCopyData: any
): CopyVariant[] {
  if (copyVariants?.[channel]?.length) {
    return copyVariants[channel];
  }
  const legacyCopy = legacyCopyData?.copies?.[channel] || legacyCopyData?.[channel];
  if (!legacyCopy) return [];
  return [{
    id: 'legacy-' + channel,
    headline: legacyCopy.headline || '',
    body_copy: legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption || '',
    ctas: legacyCopy.ctas || {},
    tags: ['✨ Original'],
    isChampion: true,
    isHidden: false,
    createdAt: new Date().toISOString(),
    generationNote: ''
  }];
}

const CopywriterContent: React.FC<CopywriterContentProps> = ({ data, campaignId, campaign, onCopyVariantsUpdate }) => {
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

  // Variants state management
  const [localVariants, setLocalVariants] = useState<CopyVariantsMap>({});
  const [steeringInput, setSteeringInput] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});

  // Seed localVariants on mount: merge existing copy_variants (from DB) with the
  // original AI output (copy_output / legacy) so the original is never lost when
  // a new variant is generated for the first time on a channel.
  useEffect(() => {
    if (!parsedData) return;

    const existingVariants: CopyVariantsMap = campaign?.aiOutputs?.copy_variants || {};

    // Build a seeded map that guarantees the legacy original is slot-0 for every channel
    const seeded: CopyVariantsMap = {};

    platforms.forEach(({ id: channel }) => {
      const legacyCopy =
        parsedData?.copies?.[channel] ||
        parsedData?.[channel];

      const dbVariants: CopyVariant[] = existingVariants[channel] || [];

      // Only seed the legacy copy if it isn't already persisted in DB variants
      const alreadySeeded = dbVariants.some(v => v.id === `legacy-${channel}`);

      if (legacyCopy && !alreadySeeded) {
        const legacyVariant: CopyVariant = {
          id: `legacy-${channel}`,
          headline: legacyCopy.headline || '',
          body_copy: legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption || '',
          ctas: legacyCopy.ctas || {},
          tags: ['✨ Original'],
          isChampion: dbVariants.length === 0 || !dbVariants.some(v => v.isChampion), // Champion if no active champion is set in DB variants
          isHidden: false,
          createdAt: new Date().toISOString(),
          generationNote: '',
        };
        seeded[channel] = [legacyVariant, ...dbVariants];
      } else if (dbVariants.length > 0) {
        seeded[channel] = dbVariants;
      }
    });

    setLocalVariants(seeded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign, parsedData]);

  const activeChannelVariants = React.useMemo(() => {
    return getVariantsForChannel(activeTab, localVariants, parsedData);
  }, [activeTab, localVariants, parsedData]);

  const activeVariantsCount = React.useMemo(() => {
    return activeChannelVariants.filter(v => !v.isHidden).length;
  }, [activeChannelVariants]);

  const handleGenerateVariant = async (channel: string) => {
    if (!campaignId) {
      toast.error('Campaign ID not found');
      return;
    }
    const note = steeringInput[channel] || '';
    setIsGenerating(prev => ({ ...prev, [channel]: true }));
    try {
      const response = await api.post(`/campaigns/${campaignId}/variants/copy`, {
        channel,
        steeringNote: note,
      });
      const updatedVariants = response.data.variants || [];
      setLocalVariants(prev => {
        const prevChannelVariants: CopyVariant[] = prev[channel] || [];
        const legacyVar = prevChannelVariants.find((v: CopyVariant) => v.id.startsWith('legacy-'));
        
        let newChannelVariants = [...updatedVariants];
        if (legacyVar) {
          const hasLegacy = updatedVariants.some((v: CopyVariant) => v.id === legacyVar.id);
          if (!hasLegacy) {
            newChannelVariants = [legacyVar, ...updatedVariants];
          }
        }
        const updatedMap = {
          ...prev,
          [channel]: newChannelVariants,
        };
        if (onCopyVariantsUpdate) {
          onCopyVariantsUpdate(updatedMap);
        }
        return updatedMap;
      });
      setSteeringInput(prev => ({ ...prev, [channel]: '' }));
      toast.success('Successfully generated new copy variant!');
    } catch (err: any) {
      console.error('Failed to generate variant:', err);
      const rawErr = err.response?.data?.error;
      const errMsg = typeof rawErr === 'string'
        ? rawErr
        : (Array.isArray(rawErr)
            ? rawErr[0]?.message || JSON.stringify(rawErr)
            : (rawErr?.message || err.message || 'Failed to generate variant'));
      toast.error(errMsg);
    } finally {
      setIsGenerating(prev => ({ ...prev, [channel]: false }));
    }
  };

  const handleUpdateMeta = async (channel: string, variantId: string, action: 'pin' | 'hide' | 'unhide') => {
    if (!campaignId) {
      toast.error('Campaign ID not found');
      return;
    }
    const loadingToast = toast.loading(`${action === 'pin' ? 'Pinning champion...' : action === 'hide' ? 'Hiding variant...' : 'Showing variant...'}`);
    try {
      const response = await api.patch(`/campaigns/${campaignId}/variants/copy`, {
        channel,
        variantId,
        action,
      });
      const updatedVariants = response.data.variants || [];
      setLocalVariants(prev => {
        const prevChannelVariants: CopyVariant[] = prev[channel] || [];
        const legacyVar = prevChannelVariants.find((v: CopyVariant) => v.id.startsWith('legacy-'));
        
        let newChannelVariants = [...updatedVariants];
        if (legacyVar) {
          let updatedLegacy = { ...legacyVar };
          if (action === 'pin') {
            updatedLegacy.isChampion = (variantId === legacyVar.id);
          } else if (action === 'hide' && variantId === legacyVar.id) {
            updatedLegacy.isHidden = true;
          } else if (action === 'unhide' && variantId === legacyVar.id) {
            updatedLegacy.isHidden = false;
          }
          
          const hasLegacy = updatedVariants.some((v: CopyVariant) => v.id === legacyVar.id);
          if (!hasLegacy) {
            newChannelVariants = [updatedLegacy, ...updatedVariants];
          }
        }
        const updatedMap = {
          ...prev,
          [channel]: newChannelVariants,
        };
        if (onCopyVariantsUpdate) {
          onCopyVariantsUpdate(updatedMap);
        }
        return updatedMap;
      });
      toast.dismiss(loadingToast);
      toast.success(`Successfully updated variant!`);
    } catch (err: any) {
      console.error('Failed to update metadata:', err);
      toast.dismiss(loadingToast);
      const rawErr = err.response?.data?.error;
      const errMsg = typeof rawErr === 'string'
        ? rawErr
        : (Array.isArray(rawErr)
            ? rawErr[0]?.message || JSON.stringify(rawErr)
            : (rawErr?.message || err.message || 'Failed to update variant'));
      toast.error(errMsg);
    }
  };

  const handleCopyVariantToClipboard = async (variant: CopyVariant, platformLabel: string) => {
    const parts: string[] = [];
    parts.push(`=== ${platformLabel.toUpperCase()} COPY ===`);
    parts.push('');
    if (variant.headline) {
      parts.push(`Headline: ${variant.headline}`);
      parts.push('');
    }
    if (variant.body_copy) {
      parts.push(variant.body_copy);
      parts.push('');
    }
    if (variant.ctas && Object.keys(variant.ctas).length > 0) {
      parts.push('CTAs:');
      Object.entries(variant.ctas).forEach(([key, val]) => {
        if (val) parts.push(`  ${key.toUpperCase()}: ${val}`);
      });
    }
    const text = parts.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copy option copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSingleCtaCopy = (text: string) => {
    if (!text.trim()) return;
    try {
      navigator.clipboard.writeText(text);
      toast.success(`Copied CTA: "${text}"`, { id: `cta-copy-${text.slice(0, 10)}` });
    } catch {
      toast.error('Failed to copy CTA');
    }
  };

  const getChannelTabStyle = (channelId: string, isActive: boolean) => {
    const ch = channelId.toLowerCase();
    
    if (!isActive) {
      return {
        className: "bg-[#0A0A0F] border border-[#2A2A38] text-[#8B8B9E] hover:text-[#F1F1F3] hover:bg-[#111118] hover:border-[#3A3A4A]",
        iconClass: "grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-300"
      };
    }
    
    switch (ch) {
      case 'instagram':
        return {
          className: "bg-[#E1306C]/10 border-[#E1306C]/30 text-[#E1306C] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'facebook':
        return {
          className: "bg-[#1877F2]/10 border-[#1877F2]/30 text-[#1877F2] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'linkedin':
        return {
          className: "bg-[#0077B5]/10 border-[#0077B5]/30 text-[#0077B5] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'youtube':
        return {
          className: "bg-[#FF0000]/10 border-[#FF0000]/30 text-[#FF0000] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'twitter':
      case 'x':
        return {
          className: "bg-white/10 border-white/20 text-white scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'google_ads':
      case 'google':
        return {
          className: "bg-[#4285F4]/10 border-[#4285F4]/30 text-[#4285F4] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      case 'email':
        return {
          className: "bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
      default:
        return {
          className: "bg-[#6366F1]/10 border-[#6366F1]/30 text-[#818CF8] scale-[1.02]",
          iconClass: "scale-110 transition-all duration-300"
        };
    }
  };

  const platformLabel = tabs.find(t => t.id === activeTab)?.label || 'Copy';
  const hasRightPanelContent = Boolean(
    messagingFramework?.brand_promise ||
    messagingFramework?.value_proposition ||
    messagingFramework?.segment_messaging?.length > 0
  );

  return (
    <div className="space-y-6 md:space-y-6">
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
          <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
            Goal: {inferredGoal.replace('_', ' ').toUpperCase()}
          </span>
        )}
        {Object.entries(copyReadiness).filter(([_, ready]) => ready).length > 0 && (
          <span className="px-3 py-1.5 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
            {Object.entries(copyReadiness).filter(([_, ready]) => ready).length} Channels Ready
          </span>
        )}
      </div>

      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2.5 min-w-max p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabStyle = getChannelTabStyle(tab.id, isActive);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2.5 transition-all duration-300 active:scale-95 group select-none cursor-pointer border ${tabStyle.className}`}
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                <ChannelIcon channel={tab.id} size={15} className={tabStyle.iconClass} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={`grid grid-cols-1 ${hasRightPanelContent ? 'xl:grid-cols-12' : 'xl:grid-cols-1'} gap-5`}>
        {/* Left Column - Variants Stack Feed */}
        <div className={`${hasRightPanelContent ? 'xl:col-span-7' : 'xl:col-span-1'} space-y-5`}>
          
          {/* Channel Strategy Angle Box */}
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
              <div className="p-4 rounded-xl bg-[#111118] border border-[#2A2A38] relative overflow-hidden">
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

          {/* Variants List Feed */}
          {activeChannelVariants.map((variant) => {
            if (variant.isHidden) {
              return (
                <div 
                  key={variant.id} 
                  className="flex items-center justify-between p-3.5 rounded-xl border border-[#2A2A38] bg-[#0d0d14] opacity-50 transition-all hover:opacity-80"
                >
                  <span className="text-xs text-[#8B8B9E] font-mono flex items-center gap-2">
                    <EyeOff size={13} />
                    Hidden variant — {variant.tags?.[0] || 'AI Output'}
                  </span>
                  <button 
                    onClick={() => handleUpdateMeta(activeTab, variant.id, 'unhide')}
                    className="text-xs text-[#6366F1] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                  >
                    <Eye size={12} />
                    Show
                  </button>
                </div>
              );
            }

            return (
              <div 
                key={variant.id} 
                className={`card-elevate bg-[#111118] border rounded-xl p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
                  variant.isChampion ? 'champion-card' : 'border-[#2A2A38]'
                }`}
              >
                {variant.isChampion && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-70" />
                )}

                {/* Card Header Actions */}
                <div className="flex justify-between items-start mb-5 flex-wrap gap-2">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {variant.tags?.map((tag, tIdx) => (
                      <span 
                        key={tIdx} 
                        className="px-2.5 py-1 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 text-[10px] font-bold text-[#8083ff]"
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {tag}
                      </span>
                    ))}
                    {variant.generationNote && (
                      <span 
                        className="px-2.5 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-[10px] text-[#8B8B9E] italic max-w-[150px] truncate"
                        title={`Staging Note: ${variant.generationNote}`}
                      >
                        "{variant.generationNote}"
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {/* Copy to Clipboard Icon */}
                    <button
                      onClick={() => handleCopyVariantToClipboard(variant, platformLabel)}
                      className="p-1.5 rounded bg-transparent border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-white hover:border-[#6366F1]/40"
                      title="Copy this variant"
                    >
                      <Copy size={13} />
                    </button>

                    {/* Pin Champion Toggle */}
                    <button
                      onClick={() => handleUpdateMeta(activeTab, variant.id, 'pin')}
                      className={`p-1.5 rounded border transition-all cursor-pointer ${
                        variant.isChampion 
                          ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#8083ff]' 
                          : 'bg-transparent border-[#2A2A38] text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-white'
                      }`}
                      title={variant.isChampion ? 'Active Champion' : 'Pin as Champion'}
                    >
                      <Star size={13} fill={variant.isChampion ? '#6366F1' : 'none'} />
                    </button>

                    {/* Hide Toggle */}
                    <button
                      onClick={() => handleUpdateMeta(activeTab, variant.id, 'hide')}
                      className="p-1.5 rounded bg-transparent border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-red-400 hover:border-red-400/40"
                      title="Hide variant"
                    >
                      <EyeOff size={13} />
                    </button>
                  </div>
                </div>

                {/* Card Fields */}
                <div className="space-y-4">
                  {variant.headline && (
                    <div className="bg-[#0e0e13] border border-[#2A2A38]/60 rounded-lg p-3.5 focus-within:border-[#6366F1] transition-colors relative">
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Headline</label>
                      <p className="text-sm outline-none" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{variant.headline}</p>
                    </div>
                  )}

                  {activeTab === 'email' && variant.headline && (
                    <div className="bg-[#0e0e13] border border-[#2A2A38]/60 rounded-lg p-3.5 focus-within:border-[#6366F1] transition-colors relative">
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Subject</label>
                      <p className="text-sm outline-none" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{variant.headline}</p>
                    </div>
                  )}

                  {variant.body_copy && (
                    <div className="bg-[#0e0e13] border border-[#2A2A38]/60 rounded-lg p-3.5 focus-within:border-[#6366F1] transition-colors relative">
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Body</label>
                      <div className="text-sm outline-none min-h-[80px] whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                        {variant.body_copy}
                      </div>
                    </div>
                  )}

                  {/* CTAs */}
                  {variant.ctas && Object.keys(variant.ctas).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Call to Actions</label>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(variant.ctas).map(([key, val]) => {
                          if (!val) return null;
                          const isHero = key === 'primary' || key === 'hero_cta';
                          return (
                            <button
                              key={key}
                              onClick={() => handleSingleCtaCopy(val)}
                              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border active:scale-95 transition-all cursor-pointer ${
                                isHero
                                  ? 'bg-[#6366F1]/15 hover:bg-[#6366F1]/25 border-[#6366F1]/30 text-[#818CF8]'
                                  : 'bg-[#1A1A24] border-[#2A2A38] hover:bg-[#1C1C28] text-[#F1F1F3]'
                              }`}
                              style={{ fontFamily: 'JetBrains Mono, monospace' }}
                              title="Click to copy CTA"
                            >
                              <span>{val}</span>
                              <Copy size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Shimmering Skeleton Card (while generating) */}
          {isGenerating[activeTab] && (
            <div className="skeleton-card border border-[#2A2A38]/30 rounded-xl p-5 md:p-6 flex flex-col justify-between" style={{ height: '220px' }}>
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-4 w-12 bg-[#2A2A38]/50 rounded animate-pulse" />
              </div>
              <div className="space-y-3 mt-4 flex-1">
                <div className="h-5 w-3/4 bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-3 w-full bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-[#2A2A38]/50 rounded animate-pulse" />
              </div>
              <div className="h-6 w-36 bg-[#2A2A38]/50 rounded mt-4 animate-pulse" />
            </div>
          )}

          {/* Steering Controls Panel */}
          <div className="p-4 rounded-xl bg-[#0d0d14] border border-[#2A2A38]/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Co-Creation Workbench
              </span>
              <span className="text-[10px] text-[#5A5A6E] font-mono">
                Variants: {activeVariantsCount}/4
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text"
                placeholder="Tweak prompt instructions... (e.g. 'Make it shorter and funnier')"
                value={steeringInput[activeTab] || ''}
                onChange={(e) => setSteeringInput(prev => ({ ...prev, [activeTab]: e.target.value }))}
                disabled={isGenerating[activeTab] || activeVariantsCount >= 4}
                className="flex-1 bg-[#0A0A0F] border border-[#2A2A38] rounded-xl px-4 py-2.5 text-sm text-[#D1D1E0] placeholder-[#8B8B9E]/30 focus:border-[#6366F1]/50 focus:outline-none disabled:opacity-40"
              />
              
              {activeVariantsCount >= 4 ? (
                <button
                  disabled
                  className="px-4 py-2.5 rounded-xl border border-[#2A2A38] text-[#8B8B9E] text-xs font-mono disabled:opacity-50 cursor-not-allowed bg-transparent"
                >
                  Limit Reached (4/4)
                </button>
              ) : (
                <button
                  onClick={() => handleGenerateVariant(activeTab)}
                  disabled={isGenerating[activeTab]}
                  className="px-5 py-2.5 bg-[#6366F1] hover:bg-[#5254d8] disabled:bg-[#6366F1]/40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-[#6366F1]/10"
                >
                  {isGenerating[activeTab] ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Generating Variant...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Give Me More Options</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Messaging Framework & Segment Messaging */}
        {hasRightPanelContent && (
          <div className="xl:col-span-5 space-y-5">
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
      )}
      </div>

      {/* Strategic Alignment */}
      {strategicAlignment.positioning_used && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
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

      {/* Copy Readiness Overview */}
      {Object.keys(copyReadiness).length > 0 && (
        <div className="mt-6 bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
          <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Copy Readiness Status</h3>
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
