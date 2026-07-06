import React, { useState, useEffect } from 'react';
import {
  Palette,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  Share2,
  ExternalLink
} from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import toast from 'react-hot-toast';
import {
  PLATFORM_CONFIG,
  detectPlatform,
  getUsedPrompts,
  toggleUsedPrompt,
  scorePrompt,
  checkPlatformReadiness,
  enhancePromptWithAI,
  getEnhancedPrompts,
  saveEnhancedPrompt,
} from './visualsHelpers';

interface VisualsContentProps {
  data?: any;
  campaignId?: string;
}

const PRESET_MODIFIERS = [
  'Dramatic Rim Lighting',
  'Soft Studio Glow',
  '85mm Cinematic Lens',
  'Macro Close-Up',
  '8K Ultra-Detailed',
  'Editorial / High-Fashion',
  'No Text / Logo',
];

const inter = { fontFamily: 'Inter, sans-serif' };
const mono = { fontFamily: 'JetBrains Mono, monospace' };

// Modifiers and styles setup

const VisualsContent: React.FC<VisualsContentProps> = ({ data, campaignId }) => {
  const prompts = data?.image_prompts || [];
  const promptsList = Array.isArray(prompts) ? prompts : [];

  const [activeTab, setActiveTab] = useState<string>('all');
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
  const [expandedRationale, setExpandedRationale] = useState<string[]>([]);
  const [scoreOpen, setScoreOpen] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [userEnhanceInput, setUserEnhanceInput] = useState<Record<string, string>>({});
  const [enhancedPrompt, setEnhancedPrompt] = useState<Record<string, string>>({});
  const [enhanceLoading, setEnhanceLoading] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [enhancedCopiedIdx, setEnhancedCopiedIdx] = useState<string | null>(null);
  const [studioDropdownOpen, setStudioDropdownOpen] = useState<string | null>(null);

  const AI_STUDIOS = [
    { 
      name: 'DALL·E', 
      label: 'Generate on DALL·E', 
      url: 'https://chatgpt.com/?hints=dalle', 
      color: '#10B981', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#10B981] fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.36 11.12a3.84 3.84 0 0 0-1.84-2.91 3.84 3.84 0 0 0 .14-3.41 3.84 3.84 0 0 0-2.82-2.33 3.84 3.84 0 0 0-3.32-.4 3.84 3.84 0 0 0-2.55-2.07h-.06a3.84 3.84 0 0 0-3.42 1.58A3.84 3.84 0 0 0 4 3.3a3.84 3.84 0 0 0-2.33 2.82 3.84 3.84 0 0 0-.4 3.32 3.84 3.84 0 0 0-2.07 2.55 3.84 3.84 0 0 0 1.58 3.42c.07.06.14.12.2.17a3.84 3.84 0 0 0-.2 3.41 3.84 3.84 0 0 0 2.82 2.33 3.84 3.84 0 0 0 3.32.4 3.84 3.84 0 0 0 2.55 2.07A3.84 3.84 0 0 0 15 22.25a3.84 3.84 0 0 0 2.33-2.82 3.84 3.84 0 0 0 .4-3.32 3.84 3.84 0 0 0 2.07-2.55 3.84 3.84 0 0 0-1.58-3.42c-.06-.06-.13-.11-.2-.17a3.84 3.84 0 0 0 .34-2.26zm-9.08 9.5a2.29 2.29 0 0 1-1.12.3 2.31 2.31 0 0 1-1.62-.68l4.47-2.58a.26.26 0 0 0 .13-.23v-6.38l1.79 1.03a.08.08 0 0 1 .04.07v5.27a2.3 2.3 0 0 1-1.74 2.28a2.31 2.31 0 0 1-1.93-.11zm-5.73-3.3a2.31 2.31 0 0 1-.82-1.78v-5.17l4.47 2.58a.26.26 0 0 0 .26 0l5.53-3.19v2.07a.08.08 0 0 1-.04.07l-4.57 2.64a2.3 2.3 0 0 1-2.87-.27c-.43-.44-.72-1-.82-1.61a2.3 2.3 0 0 1-.14-1.35zm-2.07-7.23a2.3 2.3 0 0 1 .82-1.78l4.48-2.59v5.17l-4.47-2.58a.26.26 0 0 0-.26 0l-5.53 3.19v-2.07a.08.08 0 0 1 .04-.07L5.53 10a2.3 2.3 0 0 1 2.87.27a2.31 2.31 0 0 1 .82 1.78v1.35zm2.91-4.7a2.3 2.3 0 0 1 1.12-.3 2.31 2.31 0 0 1 1.62.68l-4.47 2.58a.26.26 0 0 0-.13.23v6.38L9.04 12a.08.08 0 0 1-.04-.07v-5.27a2.3 2.3 0 0 1 1.74-2.28 2.31 2.31 0 0 1 .65-.08zm5.73 3.3a2.31 2.31 0 0 1 .82 1.78v5.17l-4.47-2.58a.26.26 0 0 0-.26 0l-5.53 3.19v-2.07a.08.08 0 0 1 .04-.07l4.57-2.64a2.3 2.3 0 0 1 2.87.27a2.31 2.31 0 0 1 .96 2.96zm2.07 7.23a2.3 2.3 0 0 1-.82 1.78l-4.48 2.59V11.23l4.47 2.58a.26.26 0 0 0 .26 0l5.53-3.19v2.07c0 .03-.02.05-.04.07l-4.57 2.64a2.3 2.3 0 0 1-2.87-.27a2.31 2.31 0 0 1-.82-1.78v-1.35z"/>
        </svg>
      ) 
    },
    { 
      name: 'Midjourney', 
      label: 'Imagine on Midjourney', 
      url: 'https://www.midjourney.com/imagine', 
      color: '#5865F2', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#5865F2] fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M2 17h20L12 4z" />
          <path d="M12 4v13" />
          <path d="M7 17a5 5 0 0 1 10 0" />
        </svg>
      ) 
    },
    { 
      name: 'Leonardo.ai', 
      label: 'Create on Leonardo', 
      url: 'https://app.leonardo.ai/ai-generations', 
      color: '#F97316', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#F97316] fill-none stroke-current" strokeWidth="2.5" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
      ) 
    },
    { 
      name: 'Clipdrop', 
      label: 'Render on Clipdrop', 
      url: 'https://clipdrop.co/stable-diffusion', 
      color: '#8B5CF6', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#8B5CF6] fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L9 9 2 12l7 3 3 7 3-7 7-3-7-3z" />
        </svg>
      ) 
    },
    { 
      name: 'Flux.1', 
      label: 'Generate on Flux.1', 
      url: 'https://replicate.com/black-forest-labs/flux-dev', 
      color: '#3B82F6', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#3B82F6] fill-none stroke-current" strokeWidth="3" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M5 21V3h14M5 11h10" />
        </svg>
      ) 
    },
    { 
      name: 'Ideogram 2.0', 
      label: 'Create on Ideogram', 
      url: 'https://ideogram.ai/', 
      color: '#EC4899', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#EC4899] fill-none stroke-current" strokeWidth="3" strokeLinecap="round" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 4h6M12 4v16M9 20h6" />
        </svg>
      ) 
    },
    { 
      name: 'Google Imagen 3', 
      label: 'Generate on Imagen 3', 
      url: 'https://aistudio.google.com/', 
      color: '#00D2FF', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#00D2FF] fill-current" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2c-.3 2.7-2.3 4.7-5 5 2.7.3 4.7 2.3 5 5 .3-2.7 2.3-4.7 5-5-2.7-.3-4.7-2.3-5-5zM6 14c-.2 1.3-1.2 2.3-2.5 2.5 1.3.2 2.3 1.2 2.5 2.5.2-1.3 1.2-2.3 2.5-2.5-1.3-.2-2.3-1.2-2.5-2.5z" />
        </svg>
      ) 
    },
  ];

  const getStudioUrl = (name: string, baseUrl: string, promptText: string) => {
    const encoded = encodeURIComponent(promptText);
    if (name === 'DALL·E') {
      return `https://chatgpt.com/?hints=dalle&q=${encoded}`;
    }
    if (name === 'Midjourney') {
      return `https://www.midjourney.com/imagine?prompt=${encoded}`;
    }
    if (name === 'Leonardo.ai') {
      return `https://app.leonardo.ai/ai-generations?prompt=${encoded}`;
    }
    if (name === 'Google Imagen 3') {
      return `https://aistudio.google.com/app/prompts/new?prompt=${encoded}`;
    }
    if (name === 'Ideogram 2.0') {
      return `https://ideogram.ai/?prompt=${encoded}`;
    }
    return baseUrl;
  };

  const openInStudio = async (promptText: string, studioName: string, baseUrl: string) => {
    if (!promptText || !promptText.trim()) {
      toast.error('No prompt text available to generate.');
      return;
    }
    try {
      await navigator.clipboard.writeText(promptText);
      const destinationUrl = getStudioUrl(studioName, baseUrl, promptText);
      toast.success('Prompt copied & pre-filled — opening studio...', { duration: 2500 });
      setTimeout(() => {
        window.open(destinationUrl, '_blank', 'noopener,noreferrer');
      }, 400);
    } catch {
      toast.error('Failed to copy prompt');
    }
    setStudioDropdownOpen(null);
  };

  useEffect(() => {
    setUsedPrompts(getUsedPrompts());
    if (campaignId) {
      setEnhancedPrompt(getEnhancedPrompts(campaignId));
    }
  }, [campaignId]);

  const getCardId = (card: any, idx: number) =>
    `${card.deliverable_name || card.deliverable || 'asset'}_${idx}`;

  const getPromptPlatformKey = (p: any): string => {
    const key = detectPlatform(p.deliverable_name || p.deliverable || '');
    return PLATFORM_CONFIG[key] ? key : 'general';
  };

  const handleToggleUsed = (id: string) => setUsedPrompts(toggleUsedPrompt(id));

  const handleCopyPrompt = async (promptText: string, idKey: string) => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedCardId(idKey);
      toast.success('Prompt copied!', { id: `toast-copy-${idKey}` });
      setTimeout(() => setCopiedCardId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleSharePrompt = async (promptText: string, title: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Image Prompt - ${title}`,
          text: promptText,
        });
        toast.success('Prompt shared!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Failed to share');
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(promptText);
        toast.success('Copied to clipboard! (Share API not supported)');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };


  const handleEnhancePrompt = async (assetId: string, originalPrompt: string) => {
    setEnhanceLoading(prev => ({ ...prev, [assetId]: true }));
    try {
      const presets = selectedOptions[assetId] || [];
      const customText = userEnhanceInput[assetId] || '';
      let combinedInstructions = '';
      if (presets.length > 0) combinedInstructions += `Add these details: ${presets.join(', ')}. `;
      if (customText.trim()) combinedInstructions += customText.trim();
      const result = await enhancePromptWithAI(originalPrompt, combinedInstructions);
      setEnhancedPrompt(prev => {
        const updated = { ...prev, [assetId]: result };
        if (campaignId) saveEnhancedPrompt(campaignId, assetId, result);
        return updated;
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Enhancement failed');
    } finally {
      setEnhanceLoading(prev => ({ ...prev, [assetId]: false }));
    }
  };

  const handleCopyEnhanced = async (assetId: string) => {
    const text = enhancedPrompt[assetId];
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setEnhancedCopiedIdx(assetId);
      toast.success('Enhanced prompt copied!');
      setTimeout(() => setEnhancedCopiedIdx(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAllPrompts = async () => {
    const targetPrompts = activeTab === 'all'
      ? promptsList.map((card, idx) => ({ card, originalIdx: idx }))
      : promptsList
          .map((card, idx) => ({ card, originalIdx: idx }))
          .filter(({ card }) => getPromptPlatformKey(card) === activeTab);

    if (targetPrompts.length === 0) { toast.error('No prompts to copy'); return; }
    
    const formattedText = targetPrompts
      .map(({ card, originalIdx }) => {
        const cardId = getCardId(card, originalIdx);
        const text = enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : (card.prompt || '');
        const platformKey = getPromptPlatformKey(card);
        const platformLabel = PLATFORM_CONFIG[platformKey]?.label || platformKey;
        return `=== ${platformLabel} ===\n${text}`;
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(formattedText);
      toast.success(
        activeTab === 'all'
          ? 'All prompts copied to clipboard!'
          : `${PLATFORM_CONFIG[activeTab]?.label || activeTab} prompts copied!`
      );
    } catch {
      toast.error('Failed to copy prompts');
    }
  };

  const detectedPlatforms = Array.from(
    new Set(promptsList.map((p: any) => getPromptPlatformKey(p)))
  ).filter(Boolean) as string[];

  const activeTabs = ['all', ...detectedPlatforms];

  const displayPrompts = (
    activeTab === 'all'
      ? promptsList.map((card, idx) => ({ card, originalIdx: idx }))
      : promptsList
          .map((card, idx) => ({ card, originalIdx: idx }))
          .filter(({ card }) => getPromptPlatformKey(card) === activeTab)
  )
    .map(item => {
      const cardId = getCardId(item.card, item.originalIdx);
      const promptText =
        enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : item.card.prompt || '';
      const { score } = scorePrompt(promptText);
      return { ...item, score };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-8" style={inter}>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
            <Palette size={22} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight">
              Visual Assets
            </h2>
            <p className="text-sm text-[#8B8B9E] mt-0.5">
              Creative prompts and visual direction for every platform
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {promptsList.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs font-semibold text-[#F1F1F3]">
                {promptsList.length} {promptsList.length === 1 ? 'prompt' : 'prompts'}
              </span>
            </div>
          )}
          <button
            onClick={handleCopyAllPrompts}
            className="px-4 py-2 rounded-xl bg-transparent border border-[#2A2A38] hover:bg-[#1A1A24] text-[#F1F1F3] text-sm font-semibold transition-all active:scale-[0.98] flex items-center gap-1.5"
          >
            <Copy size={14} />
            Copy All Prompts
          </button>

        </div>
      </div>
      </div>


      {/* ── PLATFORM TABS ─────────────────────────────────────────────────── */}
      {promptsList.length > 0 && (
        <div className="flex gap-8 border-b border-[#2A2A38] overflow-x-auto scrollbar-none">
          {activeTabs.map(tab => {
            const count =
              tab === 'all'
                ? promptsList.length
                : promptsList.filter(
                    (p: any) => getPromptPlatformKey(p) === tab
                  ).length;
            const config = tab === 'all'
              ? { accent: '#6366F1', label: 'All Platforms', bgAccent: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' }
              : PLATFORM_CONFIG[tab];
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-[#8B8B9E] hover:text-[#D1D1E0]'
                }`}
              >
                {tab !== 'all' && <ChannelIcon channel={tab} size={14} className="inline-block mr-1.5" />}
                {config.label}
                <span className="ml-1.5 text-xs opacity-40 font-mono">({count})</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                    style={{ backgroundColor: config.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── PROMPT CARDS ──────────────────────────────────────────────────── */}
      {promptsList.length > 0 ? (
        <div className="space-y-8">
          {displayPrompts.map(({ card, originalIdx }) => {
            const cardId = getCardId(card, originalIdx);
            const isUsed = usedPrompts.includes(cardId);
            const isCopied = copiedCardId === cardId;
            const isAccordionOpen = expandedRationale.includes(cardId);

            const platformKey = getPromptPlatformKey(card);
            const { accent: brandAccent, bgAccent, borderColor, label } =
              PLATFORM_CONFIG[platformKey];

            const ratio = card.aspect_ratio || '1:1';
            const headlineText = card.text_overlay?.headline || '';
            const promptText = card.prompt || '';
            const { score, checks } = scorePrompt(promptText);
            const readiness = checkPlatformReadiness(promptText);
            const enhancedPromptText = enhancedPrompt[cardId];
            const enhancedScore = enhancedPromptText ? scorePrompt(enhancedPromptText).score : score;
            const scoreDiff = enhancedPromptText ? enhancedScore - score : 0;
            const isEnhancing = enhanceLoading[cardId] || false;

            return (
              <article
                key={cardId}
                className={`card-elevate bg-[#111118] border border-[#2A2A38] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#6366F1]/30 hover:shadow-xl hover:shadow-black/30 ${
                  isUsed ? 'opacity-55' : ''
                }`}
              >
                {/* ── CARD TOP BAR ── */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#2A2A38]/60">
                  <div className="flex items-center gap-3">
                    {/* Platform accent stripe + badge */}
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: brandAccent }} />
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border inline-flex items-center gap-1.5"
                      style={{ backgroundColor: bgAccent, color: brandAccent, borderColor }}
                    >
                      <ChannelIcon channel={platformKey} size={12} />
                      {label}
                    </span>
                    {card.style && (
                      <span className="text-sm font-semibold text-[#F1F1F3] ml-1">
                        {card.style}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleUsed(cardId)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                      isUsed
                        ? 'bg-[#10B981] text-[#0A0A0F] border-[#10B981]'
                        : 'bg-transparent text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40'
                    }`}
                  >
                    {isUsed ? 'Marked as Used' : 'Mark as Used'}
                  </button>
                </div>

                {/* ── CARD BODY ── */}
                <div className="p-7 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">

                  {/* LEFT – Visual mockup + specs */}
                  <div className="flex flex-col gap-5">
                    {/* Mockup canvas */}
                    <div className="group bg-[#0A0A0F] border border-[#2A2A38] rounded-xl flex items-center justify-center p-5 relative overflow-hidden hover:border-[#6366F1]/20 transition-colors">
                      {/* thirds grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-0 group-hover:opacity-15 transition-opacity duration-300">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div key={i} className="border border-[#6366F1]/50" />
                        ))}
                      </div>

                      {/* Aspect frame */}
                      <div
                        className="relative bg-gradient-to-br from-[#1A1A24] to-[#0A0A0F] border border-[#2A2A38] rounded-lg overflow-hidden flex flex-col items-center justify-center shadow-inner"
                        style={{
                          width: '100%',
                          maxWidth: ratio === '16:9' ? '220px' : ratio === '9:16' || ratio === '4:5' || ratio === '2:3' ? '100px' : '160px',
                          aspectRatio: ratio.replace(':', '/'),
                        }}
                      >
                        {headlineText ? (
                          <p className="text-[10px] font-bold text-white text-center leading-snug px-2 drop-shadow-md select-all">
                            {headlineText}
                          </p>
                        ) : (
                          <span className="text-[9px] text-[#8B8B9E]/40 italic select-none">No Text Overlay</span>
                        )}
                        <div
                          className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono text-[#8B8B9E] border border-[#2A2A38]/60 select-none"
                          style={{ background: 'rgba(5,5,8,0.85)' }}
                        >
                          {ratio}
                        </div>
                      </div>
                    </div>

                    {/* Specs table */}
                    <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4 space-y-3">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#8B8B9E] mb-1">
                        Specs
                      </p>
                      {[
                        { label: 'Aspect Ratio', value: ratio },
                        { label: 'Text Zone', value: card.text_overlay?.placement || 'N/A' },
                        { label: 'Platform', value: label },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-3">
                          <span className="text-xs text-[#8B8B9E]">{row.label}</span>
                          <span className="text-xs font-semibold text-[#F1F1F3] font-mono truncate max-w-[110px]" title={row.value}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                      {card.visual_elements?.length > 0 && (
                        <div className="pt-3 border-t border-[#2A2A38]/60">
                          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#8B8B9E] mb-2">
                            Elements
                          </p>
                          <ul className="space-y-1.5">
                            {card.visual_elements.slice(0, 4).map((el: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#D1D1E0]">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/60 flex-shrink-0 mt-1" />
                                {el}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT – Prompt + tools */}
                  <div className="flex flex-col gap-6">

                    {/* Prompt Strength score — compact bar + click-to-expand checks panel */}
                    <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl overflow-hidden">
                      {/* Top row: label + bar + score + toggle */}
                      <button
                        onClick={() =>
                          setScoreOpen(prev =>
                            prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
                          )
                        }
                        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-[#111118] transition-colors"
                      >
                        <div className="flex flex-col shrink-0">
                          <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider">
                            Prompt Strength
                          </span>
                          <span className="text-[9px] text-[#4A4A5E]">
                            Technical keywords check
                          </span>
                        </div>
                        <div className="flex-1 h-1.5 rounded-full bg-[#1A1A24] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${score}%`,
                              backgroundColor: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
                            }}
                          />
                        </div>
                        <span
                          className="text-sm font-bold font-mono shrink-0"
                          style={{ color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }}
                        >
                          {score}<span className="text-[10px] text-[#8B8B9E] font-normal">/100</span>
                        </span>
                        <span className="text-[#8B8B9E] shrink-0">
                          {scoreOpen.includes(cardId) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      </button>

                      {/* Expanded checks panel */}
                      {scoreOpen.includes(cardId) && (
                        <div className="border-t border-[#2A2A38]/60 px-4 pt-4 pb-5 bg-[#0e0e13]/50">
                          <p className="text-[10px] text-[#8B8B9E] leading-relaxed mb-3">
                            ℹ️ This score checks the presence of optimal prompt engineering parameters (like lighting details, lens specifications, exclusion keywords, and composition frames) necessary for high-fidelity rendering on AI models.
                          </p>
                          <p className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#8B8B9E] mb-3 border-t border-[#2A2A38]/40 pt-3">
                            Parameters Breakdown — {checks.filter((c: { passed: boolean }) => c.passed).length}/{checks.length} passed
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                            {checks.map((item: any, i: number) => {
                              const categoryMap: Record<string, string> = {
                                subject: 'Subject',
                                action: 'Subject',
                                camera: 'Camera',
                                resolution: 'Camera',
                                render: 'Engine',
                                lighting: 'Lighting',
                                composition: 'Framing',
                                background: 'Setting',
                                style: 'Style',
                                color: 'Palette',
                                emotion: 'Mood',
                                negative: 'Negative',
                                brand: 'Brand',
                                length: 'Depth',
                                depth: 'Depth',
                              };
                              const category = categoryMap[item.checkKey] || 'General';

                              return (
                                <div key={i} className="flex items-center gap-2.5">
                                  {item.passed ? (
                                    <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
                                  ) : (
                                    <AlertCircle size={13} className="text-[#F59E0B] shrink-0" />
                                  )}
                                  <span
                                    className={`text-xs font-medium ${
                                      item.passed ? 'text-[#A7F3D0]' : 'text-[#FCD34D]'
                                    }`}
                                  >
                                    <span className="opacity-45 text-[9px] uppercase font-mono mr-1.5 border border-current px-1 rounded-sm">
                                      {category}
                                    </span>
                                    {item.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* AI Readiness pills */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        {
                          name: 'DALL-E',
                          ready: readiness.dalle.ready,
                          issue: readiness.dalle.issue,
                          notReadyColor: '#EF4444',
                        },
                        {
                          name: 'Midjourney',
                          ready: readiness.midjourney.ready,
                          issue: readiness.midjourney.issue,
                          notReadyColor: '#F59E0B',
                        },
                        {
                          name: 'Stable Diffusion',
                          ready: readiness.stable_diffusion.ready,
                          issue: readiness.stable_diffusion.issue,
                          notReadyColor: '#F59E0B',
                        },
                      ].map(ai => (
                        <div key={ai.name} className="relative group/pill">
                          <div
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-default transition-all"
                            style={
                              ai.ready
                                ? { background: '#10B981' + '18', color: '#10B981', borderColor: '#10B981' + '40' }
                                : { background: ai.notReadyColor + '18', color: ai.notReadyColor, borderColor: ai.notReadyColor + '40' }
                            }
                          >
                            {ai.ready ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            {ai.name}
                          </div>
                          {!ai.ready && ai.issue && (
                            <div className="absolute bottom-full left-0 mb-2 w-60 bg-[#111118] border border-[#2A2A38] p-3 rounded-xl shadow-2xl z-30 hidden group-hover/pill:block">
                              <p className="text-xs font-semibold text-[#F59E0B] mb-1">{ai.name} Issue</p>
                              <p className="text-xs text-[#8B8B9E] leading-relaxed">{ai.issue}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Original prompt */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider">
                          Image Prompt
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleCopyPrompt(card.prompt || '', cardId)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                              isCopied
                                ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                                : 'bg-[#1A1A24] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40'
                            }`}
                          >
                            {isCopied ? <Check size={11} /> : <Copy size={11} />}
                            {isCopied ? 'Copied' : 'Copy'}
                          </button>
                          <button
                            onClick={() => handleSharePrompt(card.prompt || '', `${card.platform || 'Platform'} Prompt`)}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border bg-[#1A1A24] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40 transition-all active:scale-95"
                            title="Share Prompt"
                          >
                            <Share2 size={11} />
                            Share
                          </button>
                          {/* AI Studio Bridges Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setStudioDropdownOpen(prev => prev === cardId ? null : cardId)}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 text-[#a3a5fc] border-[#6366F1]/25 hover:border-[#6366F1]/50 transition-all active:scale-95"
                              title="Open in AI Studio"
                            >
                              <ExternalLink size={11} />
                              Generate
                              <ChevronDown size={10} className={`transition-transform ${studioDropdownOpen === cardId ? 'rotate-180' : ''}`} />
                            </button>
                            {studioDropdownOpen === cardId && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setStudioDropdownOpen(null)} />
                                <div className="absolute right-0 top-full mt-2 w-56 bg-[#111118] border border-[#2A2A38] rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto scrollbar-none animate-in fade-in slide-in-from-top-1">
                                  <div className="px-3 py-2 border-b border-[#2A2A38]">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B8B9E]">Copy & Open in Studio</p>
                                  </div>
                                  {AI_STUDIOS.map(studio => (
                                    <button
                                      key={studio.name}
                                      onClick={() => openInStudio(card.prompt || '', studio.name, studio.url)}
                                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-medium text-[#D1D1E0] hover:bg-[#1A1A24] transition-colors group/studio"
                                    >
                                      <span className="flex items-center justify-center shrink-0 w-5 h-5 bg-[#1F1F2E] border border-[#2A2A38]/60 rounded">{studio.icon}</span>
                                      <div className="flex-1 min-w-0">
                                        <span className="group-hover/studio:text-white transition-colors">{studio.label}</span>
                                      </div>
                                      <ExternalLink size={10} className="text-[#8B8B9E] group-hover/studio:text-[#6366F1] transition-colors shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`bg-[#0A0A0F] border rounded-xl p-4 text-sm leading-relaxed text-[#D1D1E0] min-h-[130px] max-h-[240px] overflow-y-auto whitespace-pre-wrap select-all transition-all ${
                          isEnhancing
                            ? 'border-[#6366F1]/50 animate-pulse'
                            : 'border-[#2A2A38]'
                        }`}
                        style={mono}
                      >
                        {card.prompt || 'No prompt generated.'}
                      </div>
                    </div>

                    {/* AI Enhancer */}
                    <div className="rounded-xl border border-[#6366F1]/15 bg-gradient-to-br from-[#111118] to-[#0e0e16] overflow-hidden">
                      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#6366F1]/10 bg-[#6366F1]/[0.03]">
                        <div className="w-7 h-7 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                          <Sparkles size={14} className="text-[#6366F1]" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-[#F1F1F3]">AI Enhancement Studio</span>
                          <p className="text-[10px] text-[#8B8B9E] leading-tight">Refine prompts with style presets & custom instructions</p>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-4 space-y-5">
                        {/* Style Presets */}
                        <div>
                          <p className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="w-1 h-3 rounded-full bg-[#6366F1]/60" />
                            Style Presets
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {PRESET_MODIFIERS.map(opt => {
                              const isActive = (selectedOptions[cardId] || []).includes(opt);
                              return (
                                <button
                                  key={opt}
                                  onClick={() => setSelectedOptions(prev => {
                                    const current = prev[cardId] || [];
                                    const updated = current.includes(opt)
                                      ? current.filter(o => o !== opt)
                                      : [...current, opt];
                                    return { ...prev, [cardId]: updated };
                                  })}
                                  className={`flex items-center gap-1.5 px-3 py-2 min-h-[36px] rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                    isActive
                                      ? 'bg-[#6366F1]/15 text-white border-[#6366F1]/60 shadow-sm shadow-[#6366F1]/10'
                                      : 'bg-[#0A0A0F] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/30'
                                  }`}
                                >
                                  {isActive && <Check size={10} className="text-[#6366F1]" />}
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom Instructions */}
                        <div>
                          <p className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                            <span className="w-1 h-3 rounded-full bg-[#6366F1]/60" />
                            Custom Instructions
                          </p>
                          <textarea
                            value={userEnhanceInput[cardId] || ''}
                            onChange={e => setUserEnhanceInput(prev => ({ ...prev, [cardId]: e.target.value }))}
                            placeholder='e.g. "dramatic lighting, cinematic feel, golden hour..."'
                            className="w-full bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-3.5 text-sm text-[#D1D1E0] placeholder-[#8B8B9E]/40 focus:border-[#6366F1]/40 focus:outline-none h-[88px] resize-none"
                            style={inter}
                          />
                        </div>

                        {/* Action bar */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            {isEnhancing ? (
                              <button
                                disabled
                                className="flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#6366F1] text-white text-sm font-semibold cursor-not-allowed opacity-60"
                              >
                                <Loader2 size={14} className="animate-spin" />
                                Enhancing...
                              </button>
                            ) : enhancedPromptText ? (
                              <button
                                onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                                className="flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#1A1A24] border border-[#2A2A38] hover:border-[#6366F1]/50 text-[#8B8B9E] hover:text-white text-sm font-semibold transition-all active:scale-95"
                              >
                                <RotateCw size={13} />
                                Regenerate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                                className="flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-xl bg-[#6366F1] hover:bg-[#5254d8] text-white text-sm font-semibold transition-all shadow-md shadow-[#6366F1]/20 active:scale-95"
                              >
                                <Sparkles size={13} />
                                Enhance Prompt
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Enhanced result */}
                        {enhancedPromptText && !isEnhancing && (
                          <div className="border border-[#6366F1]/20 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-[#6366F1]/5 border-b border-[#6366F1]/10">
                              <div className="flex items-center gap-2">
                                <Sparkles size={14} className="text-[#6366F1]" />
                                <span className="text-sm font-semibold text-[#F1F1F3]">
                                  Enhanced Prompt
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-[11px] text-[#5A5A6E] font-mono">
                                  Score: {score} → {enhancedScore}
                                </span>
                                {scoreDiff > 0 && (
                                  <span className="text-xs font-semibold text-[#10B981] bg-[#10B981]/10 px-2.5 py-1 rounded-lg border border-[#10B981]/20">
                                    +{scoreDiff}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="p-4 space-y-3">
                              <div
                                className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4 text-sm text-[#D1D1E0] leading-relaxed max-h-[200px] overflow-y-auto whitespace-pre-wrap select-all"
                                style={mono}
                              >
                                {enhancedPromptText}
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleCopyEnhanced(cardId)}
                                  className={`flex items-center gap-1.5 px-4 py-3 min-h-[44px] rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                    enhancedCopiedIdx === cardId
                                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                                      : 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20 hover:bg-[#6366F1]/20'
                                  }`}
                                >
                                  {enhancedCopiedIdx === cardId ? <Check size={11} /> : <Copy size={11} />}
                                  {enhancedCopiedIdx === cardId ? 'Copied' : 'Copy Enhanced'}
                                </button>
                                <button
                                  onClick={() => handleSharePrompt(enhancedPromptText, `${card.platform || 'Platform'} Enhanced Prompt`)}
                                  className="flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-lg text-xs font-semibold border bg-[#1A1A24] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40 transition-all active:scale-95"
                                  title="Share Enhanced Prompt"
                                >
                                  <Share2 size={11} />
                                  Share
                                </button>
                                {/* AI Studio Bridges for Enhanced */}
                                <div className="relative">
                                  <button
                                    onClick={() => setStudioDropdownOpen(prev => prev === `${cardId}-enh` ? null : `${cardId}-enh`)}
                                    className="flex items-center gap-1.5 px-4 py-3 min-h-[44px] rounded-lg text-xs font-semibold border bg-gradient-to-r from-[#6366F1]/10 to-[#8B5CF6]/10 text-[#a3a5fc] border-[#6366F1]/25 hover:border-[#6366F1]/50 transition-all active:scale-95"
                                    title="Open in AI Studio"
                                  >
                                    <ExternalLink size={11} />
                                    Generate
                                    <ChevronDown size={10} className={`transition-transform ${studioDropdownOpen === `${cardId}-enh` ? 'rotate-180' : ''}`} />
                                  </button>
                                  {studioDropdownOpen === `${cardId}-enh` && (
                                    <>
                                      <div className="fixed inset-0 z-40" onClick={() => setStudioDropdownOpen(null)} />
                                      <div className="absolute right-0 bottom-full mb-2 w-56 bg-[#111118] border border-[#2A2A38] rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto scrollbar-none">
                                        <div className="px-3 py-2 border-b border-[#2A2A38]">
                                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8B8B9E]">Copy & Open in Studio</p>
                                        </div>
                                        {AI_STUDIOS.map(studio => (
                                          <button
                                            key={studio.name}
                                            onClick={() => openInStudio(enhancedPromptText, studio.name, studio.url)}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-xs font-medium text-[#D1D1E0] hover:bg-[#1A1A24] transition-colors group/studio"
                                          >
                                            <span className="flex items-center justify-center shrink-0 w-5 h-5 bg-[#1F1F2E] border border-[#2A2A38]/60 rounded">{studio.icon}</span>
                                            <div className="flex-1 min-w-0">
                                              <span className="group-hover/studio:text-white transition-colors">{studio.label}</span>
                                            </div>
                                            <ExternalLink size={10} className="text-[#8B8B9E] group-hover/studio:text-[#6366F1] transition-colors shrink-0" />
                                          </button>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rationale */}
                    <div className="border-t border-[#2A2A38]/50 pt-4">
                      <button
                        onClick={() =>
                          setExpandedRationale(prev =>
                            prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
                          )
                        }
                        className="flex items-center gap-2 text-sm text-[#8B8B9E] hover:text-[#D1D1E0] transition-colors font-medium"
                      >
                        Strategic Rationale
                        {isAccordionOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {isAccordionOpen && (
                        <div className="mt-3 space-y-2 pl-4 border-l-2 border-[#2A2A38]">
                          {(() => {
                            const sentences = (card.rationale || '')
                              .split(/(?<=[.!?])\s+/)
                              .filter((s: string) => s.trim().length > 0);
                            
                            if (sentences.length === 0) {
                              return <p className="text-sm text-[#8B8B9E] italic" style={{ fontFamily: 'Inter, sans-serif' }}>No strategic rationale available.</p>;
                            }

                            const colors = ['#CBD5E1', '#94A3B8', '#64748B', '#475569']; // Lower contrast, professional Slate-Gray hierarchy
                            return sentences.map((sentence: string, sIdx: number) => (
                              <p 
                                key={sIdx} 
                                className="text-xs md:text-sm leading-relaxed font-medium"
                                style={{ fontFamily: 'Inter, sans-serif', color: colors[sIdx % colors.length] }}
                              >
                                • {sentence.trim()}
                              </p>
                            ));
                          })()}
                        </div>
                      )}
                    </div>

                    {/* Style keywords */}
                    {card.style_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const tagColors = [
                            { bg: 'rgba(99, 102, 241, 0.08)', text: '#A5B4FC', border: 'rgba(99, 102, 241, 0.15)' }, // Muted Indigo
                            { bg: 'rgba(16, 185, 129, 0.08)', text: '#6EE7B7', border: 'rgba(16, 185, 129, 0.15)' }, // Muted Emerald
                            { bg: 'rgba(245, 158, 11, 0.08)', text: '#FCD34D', border: 'rgba(245, 158, 11, 0.15)' }, // Muted Amber
                            { bg: 'rgba(6, 182, 212, 0.08)', text: '#67E8F9', border: 'rgba(6, 182, 212, 0.15)' }, // Muted Cyan
                            { bg: 'rgba(244, 63, 94, 0.08)', text: '#FDA4AF', border: 'rgba(244, 63, 94, 0.15)' }, // Muted Rose
                          ];
                          return card.style_keywords.slice(0, 5).map((kw: string, kidx: number) => {
                            const color = tagColors[kidx % tagColors.length];
                            return (
                              <span
                                key={kidx}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors"
                                style={{ 
                                  fontFamily: 'Inter, sans-serif',
                                  backgroundColor: color.bg,
                                  borderColor: color.border,
                                  color: color.text
                                }}
                              >
                                #{kw.replace(/^#/, '')}
                              </span>
                            );
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}


        </div>
      ) : (
        /* Empty state */
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#1A1A24] border border-[#2A2A38] flex items-center justify-center text-[#6366F1] mb-5">
            <Palette size={24} />
          </div>
          <p className="text-base font-semibold text-[#F1F1F3] mb-2">No visual assets generated yet</p>
          <p className="text-sm text-[#8B8B9E] max-w-sm leading-relaxed">
            Prompts will appear here once the campaign visual creation agent finishes.
          </p>
        </div>
      )}


    </div>
  );
};

export default React.memo(VisualsContent);
