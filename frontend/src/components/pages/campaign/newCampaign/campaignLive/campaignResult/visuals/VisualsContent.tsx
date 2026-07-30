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
  campaign?: any;
}

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
  const [userEnhanceInput, setUserEnhanceInput] = useState<Record<string, string>>({});
  const [enhancedPrompt, setEnhancedPrompt] = useState<Record<string, string>>({});
  const [enhanceLoading, setEnhanceLoading] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [enhancedCopiedIdx, setEnhancedCopiedIdx] = useState<string | null>(null);
  const [sharedCardId, setSharedCardId] = useState<string | null>(null);
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
      return `https://gemini.google.com/app`;
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

  const handleSharePrompt = async (promptText: string, title: string, cardId?: string) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `Image Prompt - ${title}`, text: promptText });
        if (cardId) { setSharedCardId(cardId); setTimeout(() => setSharedCardId(null), 2000); }
      } catch (err: any) {
        if (err.name !== 'AbortError') toast.error('Failed to share');
      }
    } else {
      try {
        await navigator.clipboard.writeText(promptText);
        if (cardId) { setSharedCardId(cardId); setTimeout(() => setSharedCardId(null), 2000); }
        else toast.success('Prompt copied to clipboard!');
      } catch {
        toast.error('Failed to copy');
      }
    }
  };


  const handleEnhancePrompt = async (assetId: string, originalPrompt: string) => {
    setEnhanceLoading(prev => ({ ...prev, [assetId]: true }));
    try {
      const customText = userEnhanceInput[assetId] || '';
      const combinedInstructions = customText.trim();
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
    <div className="space-y-6 font-sans text-slate-200">

      {/* ── PAGE HEADER (Apple Pro Glassmorphic Card) ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
                <Palette size={20} />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sora text-white">Visual Assets Studio</h2>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans">
              Generative prompt directions and visual asset specifications across all channels
            </p>
          </div>
          <div className="flex gap-2.5 flex-wrap items-center">
            {promptsList.length > 0 && (
              <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs font-mono font-semibold text-[#818CF8]">
                Goal: VISUAL CREATION
              </span>
            )}
            <button
              onClick={handleCopyAllPrompts}
              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-xs font-semibold text-white transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 font-sora border-none cursor-pointer"
            >
              <Copy size={13} />
              <span>Copy All Prompts</span>
            </button>
          </div>
        </div>

        {/* Platform Selection Segmented Control */}
        {activeTabs.length > 1 && (
          <div className="mt-5 pt-5 border-t border-[#262636]">
            <div className="flex items-center gap-1 p-1.5 bg-[#0D0D14] rounded-2xl border border-[#262636] overflow-x-auto">
              {activeTabs.map(tab => {
                const label = tab === 'all' ? 'All Visuals' : PLATFORM_CONFIG[tab]?.label || tab;
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 whitespace-nowrap px-4 py-2 rounded-xl text-xs font-semibold font-sora transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-2 ${
                      isActive
                        ? 'bg-[#6366F1] text-white shadow-sm'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    {tab !== 'all' && <ChannelIcon channel={tab} className="w-3.5 h-3.5" />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── PROMPT CARDS ──────────────────────────────────────────────────── */}
      {promptsList.length > 0 ? (
        <div className="space-y-6">
          {displayPrompts.map(({ card, originalIdx }) => {
            const cardId = getCardId(card, originalIdx);
            const isUsed = usedPrompts.includes(cardId);
            const isCopied = copiedCardId === cardId;

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
            const isAccordionOpen = expandedRationale.includes(cardId);
            const isEnhancing = enhanceLoading[cardId] || false;

            return (
              <article
                key={cardId}
                className={`rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 shadow-[0_20px_50px_rgba(0,0,0,0.6)] ${
                  isUsed ? 'opacity-60' : ''
                }`}
              >
                {/* ── CARD TOP BAR ── */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#262636]">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: brandAccent }} />
                    <span
                      className="px-3 py-1 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider border inline-flex items-center gap-1.5"
                      style={{ backgroundColor: bgAccent, color: brandAccent, borderColor }}
                    >
                      <ChannelIcon channel={platformKey} size={12} />
                      {label}
                    </span>
                    {card.style && (
                      <span className="text-xs font-semibold font-sora text-white ml-1">
                        {card.style}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleToggleUsed(cardId)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sora transition-all cursor-pointer border ${
                      isUsed
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-[#1A1A26] text-[#94A3B8] border-white/10 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {isUsed ? '✓ Marked as Used' : 'Mark as Used'}
                  </button>
                </div>

                {/* ── CARD BODY ── */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

                  {/* LEFT – Visual mockup + specs */}
                  <div className="flex flex-col gap-4">
                    {/* Mockup canvas */}
                    <div className="bg-[#0B0B12] border border-[#262636] rounded-2xl flex items-center justify-center p-5 relative overflow-hidden shadow-inner">
                      <div
                        className="relative bg-gradient-to-br from-[#161622] to-[#0B0B12] border border-[#262636] rounded-xl overflow-hidden flex flex-col items-center justify-center shadow-md"
                        style={{
                          width: '100%',
                          maxWidth: ratio === '16:9' ? '220px' : ratio === '9:16' || ratio === '4:5' || ratio === '2:3' ? '100px' : '150px',
                          aspectRatio: ratio.replace(':', '/'),
                        }}
                      >
                        {headlineText ? (
                          <p className="text-[10px] font-bold text-white text-center leading-snug px-2 drop-shadow-md select-all">
                            {headlineText}
                          </p>
                        ) : (
                          <span className="text-[9px] text-[#94A3B8]/40 italic select-none">No Text Overlay</span>
                        )}
                        <div
                          className="absolute bottom-1.5 right-1.5 px-2 py-0.5 rounded-md text-[9px] font-mono text-[#94A3B8] border border-white/10 bg-black/60 backdrop-blur-sm select-none"
                        >
                          {ratio}
                        </div>
                      </div>
                    </div>

                    {/* Specs table */}
                    <div className="bg-[#0B0B12] border border-[#262636] rounded-2xl p-4 space-y-3 font-sans text-xs">
                      <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8]">
                        Technical Specs
                      </p>
                      {[
                        { label: 'Aspect Ratio', value: ratio },
                        { label: 'Text Zone', value: card.text_overlay?.placement || 'N/A' },
                        { label: 'Platform', value: label },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between gap-3 pb-2 border-b border-[#1F1F2E] last:border-none last:pb-0">
                          <span className="text-[#94A3B8]">{row.label}</span>
                          <span className="font-semibold text-white font-mono truncate max-w-[110px]" title={row.value}>
                            {row.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT – Prompt + tools */}
                  <div className="flex flex-col gap-5">

                    {/* Prompt Strength score — Apple Recessed Meter Tile */}
                    <div className="bg-[#0B0B12] border border-[#262636] rounded-2xl overflow-hidden shadow-inner">
                      <button
                        onClick={() =>
                          setScoreOpen(prev =>
                            prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
                          )
                        }
                        className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors cursor-pointer border-none"
                      >
                        <div className="flex flex-col shrink-0 font-sans">
                          <span className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider font-mono">
                            Prompt Strength
                          </span>
                          <span className="text-[10px] text-[#64748B]">
                            Technical keywords check
                          </span>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-[#181824] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${score}%`,
                              background: score >= 80
                                ? 'linear-gradient(90deg, #10B981, #34D399)'
                                : score >= 50
                                ? 'linear-gradient(90deg, #F59E0B, #FBBF24)'
                                : 'linear-gradient(90deg, #EF4444, #F87171)',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs font-bold font-mono shrink-0"
                          style={{ color: score >= 80 ? '#34D399' : score >= 50 ? '#FBBF24' : '#F87171' }}
                        >
                          {score}<span className="text-[10px] text-[#94A3B8] font-normal">/100</span>
                        </span>
                        <span className="text-[#94A3B8] shrink-0">
                          {scoreOpen.includes(cardId) ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </span>
                      </button>

                      {/* Expanded checks panel */}
                      {scoreOpen.includes(cardId) && (
                        <div className="border-t border-[#262636] px-4 pt-3.5 pb-4 bg-black/20 font-sans text-xs">
                          <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                            ℹ️ Checks presence of optimal prompt engineering parameters (lighting, lens, exclusion keywords, composition) for high-fidelity rendering.
                          </p>
                          <p className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8] mb-2.5 border-t border-[#262636] pt-2.5">
                            Parameters Breakdown — {checks.filter((c: { passed: boolean }) => c.passed).length}/{checks.length} passed
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
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
                                <div key={i} className="flex items-center gap-2">
                                  {item.passed ? (
                                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                  ) : (
                                    <AlertCircle size={13} className="text-amber-400 shrink-0" />
                                  )}
                                  <span
                                    className={`text-xs font-medium ${
                                      item.passed ? 'text-emerald-300' : 'text-amber-200'
                                    }`}
                                  >
                                    <span className="opacity-50 text-[9px] uppercase font-mono mr-1.5 border border-current px-1 rounded-sm">
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
                          name: 'DALL-E 3',
                          ready: readiness.dalle.ready,
                          issue: readiness.dalle.issue,
                        },
                        {
                          name: 'Midjourney v6',
                          ready: readiness.midjourney.ready,
                          issue: readiness.midjourney.issue,
                        },
                        {
                          name: 'Stable Diffusion XL',
                          ready: readiness.stable_diffusion.ready,
                          issue: readiness.stable_diffusion.issue,
                        },
                      ].map(ai => (
                        <div key={ai.name} className="relative group/pill">
                          <div
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all ${
                              ai.ready
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
                            }`}
                          >
                            {ai.ready ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                            <span>{ai.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Original prompt box */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                          </div>
                          <span className="text-[11px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">
                            Generative Prompt
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyPrompt(card.prompt || '', cardId)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sora font-semibold border transition-all cursor-pointer ${
                              isCopied
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            onClick={() => handleSharePrompt(card.prompt || '', `${card.platform || 'Platform'} Prompt`, cardId)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-sora font-semibold border transition-all cursor-pointer ${
                              sharedCardId === cardId
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : 'bg-white/5 text-[#94A3B8] border-white/10 hover:text-white hover:bg-white/10'
                            }`}
                            title="Share Prompt"
                          >
                            {sharedCardId === cardId ? <Check size={12} /> : <Share2 size={12} />}
                            <span>{sharedCardId === cardId ? 'Shared' : 'Share'}</span>
                          </button>
                          {/* AI Studio Bridges Dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => setStudioDropdownOpen(prev => prev === cardId ? null : cardId)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-sora font-semibold border bg-[#6366F1] text-white hover:bg-[#5254D8] border-transparent transition-all cursor-pointer shadow-sm"
                              title="Open in AI Studio"
                            >
                              <ExternalLink size={12} />
                              <span>Generate</span>
                              <ChevronDown size={11} className={`transition-transform ${studioDropdownOpen === cardId ? 'rotate-180' : ''}`} />
                            </button>
                            {studioDropdownOpen === cardId && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setStudioDropdownOpen(null)} />
                                <div className="absolute right-0 top-full mt-2 w-60 bg-[#12121A]/95 border border-white/[0.12] rounded-2xl shadow-2xl z-50 p-1.5 backdrop-blur-2xl animate-in fade-in slide-in-from-top-1 space-y-1">
                                  <div className="px-3 py-2 border-b border-[#262636]">
                                    <p className="text-[10px] font-bold font-mono uppercase tracking-wider text-[#94A3B8]">Copy &amp; Open Studio</p>
                                  </div>
                                  {AI_STUDIOS.map(studio => (
                                    <button
                                      key={studio.name}
                                      onClick={() => openInStudio(card.prompt || '', studio.name, studio.url)}
                                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-xs font-sora font-semibold text-slate-200 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer border-none group/studio"
                                    >
                                      <span className="flex items-center justify-center shrink-0 w-5 h-5 bg-[#0B0B12] border border-[#262636] rounded-lg">{studio.icon}</span>
                                      <span className="flex-1 truncate">{studio.label}</span>
                                      <ExternalLink size={11} className="text-[#94A3B8] group-hover/studio:text-white transition-colors shrink-0" />
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`rounded-2xl bg-[#0B0B12] border border-[#262636] p-4 text-xs font-mono leading-relaxed text-slate-200 min-h-[120px] max-h-[220px] overflow-y-auto whitespace-pre-wrap select-all shadow-inner ${
                          isEnhancing ? 'border-[#6366F1] animate-pulse' : ''
                        }`}
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
                          <p className="text-[10px] text-[#8B8B9E] leading-tight">Refine prompts with custom instructions</p>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-4 space-y-5">

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
                                  onClick={() => handleSharePrompt(enhancedPromptText, `${card.platform || 'Platform'} Enhanced Prompt`, `${cardId}-enh`)}
                                  className={`flex items-center justify-center gap-1.5 px-4 py-3 min-h-[44px] rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                    sharedCardId === `${cardId}-enh`
                                      ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                                      : 'bg-[#1A1A24] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40'
                                  }`}
                                  title="Share Enhanced Prompt"
                                >
                                  {sharedCardId === `${cardId}-enh` ? <Check size={11} /> : <Share2 size={11} />}
                                  {sharedCardId === `${cardId}-enh` ? 'Shared' : 'Share'}
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
