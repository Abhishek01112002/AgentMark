import React, { useState, useEffect } from 'react';
import {
  Palette,
  Plus,
  Check,
  Copy,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  PLATFORM_CONFIG,
  detectPlatform,
  getUsedPrompts,
  toggleUsedPrompt,
  scorePrompt,
  checkPlatformReadiness,
  enhancePromptWithAI
} from './visualsHelpers';

interface VisualsContentProps {
  data?: any;
  campaignId?: string;
}

const PRESET_MODIFIERS = [
  "Dramatic Rim Lighting",
  "Soft Studio Glow",
  "85mm Cinematic Lens",
  "Macro Close-Up",
  "8K Ultra-Detailed",
  "Editorial / High-Fashion",
  "No Text / Logo"
];

const getRatioClass = (ratio: string) => {
  const cleanRatio = ratio.replace(/\s+/g, '');
  if (cleanRatio === '16:9') return 'aspect-video w-full max-w-[320px]';
  if (cleanRatio === '9:16') return 'aspect-[9/16] h-[170px]';
  if (cleanRatio === '4:5') return 'aspect-[4/5] h-[170px]';
  if (cleanRatio === '2:3') return 'aspect-[2/3] h-[170px]';
  return 'aspect-square w-full';
};

const VisualsContent: React.FC<VisualsContentProps> = ({ data }) => {
  const prompts = data?.image_prompts || [];
  const promptsList = Array.isArray(prompts) ? prompts : [];

  // State Variables
  const [activeTab, setActiveTab] = useState<string>('all');
  const [exportDrawerOpen, setExportDrawerOpen] = useState<boolean>(false);
  const [usedPrompts, setUsedPrompts] = useState<string[]>([]);
  const [expandedRationale, setExpandedRationale] = useState<string[]>([]);
  const [enhancerOpen, setEnhancerOpen] = useState<string[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [userEnhanceInput, setUserEnhanceInput] = useState<Record<string, string>>({});
  const [enhancedPrompt, setEnhancedPrompt] = useState<Record<string, string>>({});
  const [enhanceLoading, setEnhanceLoading] = useState<Record<string, boolean>>({});
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [enhancedCopiedIdx, setEnhancedCopiedIdx] = useState<string | null>(null);
  const [moodboardOpen, setMoodboardOpen] = useState<boolean>(true);

  // Load used state from localStorage on mount
  useEffect(() => {
    setUsedPrompts(getUsedPrompts());
  }, []);

  const getCardId = (card: any, idx: number) => {
    return `${card.deliverable_name || card.deliverable || 'asset'}_${idx}`;
  };

  const handleToggleUsed = (id: string) => {
    const updated = toggleUsedPrompt(id);
    setUsedPrompts(updated);
  };

  const handleCopyPrompt = async (promptText: string, idKey: string) => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedCardId(idKey);
      toast.success('Prompt copied!', { id: `toast-copy-${idKey}` });
      setTimeout(() => setCopiedCardId(null), 2000);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleToggleEnhancer = (assetId: string) => {
    setEnhancerOpen(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );
  };

  const handleEnhanceInputChange = (assetId: string, value: string) => {
    setUserEnhanceInput(prev => ({ ...prev, [assetId]: value }));
  };

  const handleToggleOption = (assetId: string, option: string) => {
    setSelectedOptions(prev => {
      const current = prev[assetId] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [assetId]: updated };
    });
  };

  const handleEnhancePrompt = async (assetId: string, originalPrompt: string) => {
    setEnhanceLoading(prev => ({ ...prev, [assetId]: true }));
    try {
      const presets = selectedOptions[assetId] || [];
      const customText = userEnhanceInput[assetId] || '';
      let combinedInstructions = '';
      if (presets.length > 0) {
        combinedInstructions += `Add these details: ${presets.join(', ')}. `;
      }
      if (customText.trim()) {
        combinedInstructions += customText.trim();
      }

      const result = await enhancePromptWithAI(
        originalPrompt,
        combinedInstructions
      );
      setEnhancedPrompt(prev => ({ ...prev, [assetId]: result }));
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Enhancement failed';
      toast.error(msg);
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
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const handleCopyAllPrompts = async () => {
    if (promptsList.length === 0) {
      toast.error('No prompts to copy');
      return;
    }
    const formattedText = promptsList.map((card, idx) => {
      const cardId = getCardId(card, idx);
      const text = enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : (card.prompt || '');
      const platformKey = detectPlatform(card.deliverable_name || card.deliverable || '');
      const platformLabel = PLATFORM_CONFIG[platformKey]?.label || 'General';
      return `=== ${platformLabel} ===\n${text}`;
    }).join('\n\n');

    try {
      await navigator.clipboard.writeText(formattedText);
      toast.success('All prompts copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy all prompts');
    }
  };

  // Derive unique detected platforms count from prompt list
  const detectedPlatforms = Array.from(
    new Set(
      promptsList.map((p: any) => detectPlatform(p.deliverable_name || p.deliverable || ''))
    )
  ).filter(Boolean) as string[];

  const uniquePlatformsCount = detectedPlatforms.length;

  // Tabs derive from image_prompts via detectPlatform
  const activeTabs = ['all', ...detectedPlatforms];

  // Filtering list
  const displayPrompts = activeTab === 'all'
    ? promptsList
    : promptsList.filter(p => detectPlatform(p.deliverable_name || p.deliverable || '') === activeTab);

  const fontStyle = { fontFamily: 'Sora, Inter, sans-serif' };
  const monoStyle = { fontFamily: 'JetBrains Mono, monospace' };

  return (
    <div
      className="space-y-8 text-[#D1D1E0] bg-[#08080F] -m-4 sm:-m-5 md:-m-6 p-6 sm:p-8 md:p-10 rounded-2xl transition-all duration-300 relative overflow-hidden"
      style={fontStyle}
    >
      {/* Section 1 — Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-[#1E1E2D] max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#6366F1] shadow-inner">
            <Palette size={20} />
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-white tracking-tight leading-none" style={fontStyle}>
              Visual Assets
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-[#8B8B9E]">
              <span className="bg-[#1E1E2D] px-3 py-1 rounded-full border border-[#2E2E3D]/50 text-white font-semibold">
                {promptsList.length} prompts
              </span>
              <span>•</span>
              <span className="bg-[#1E1E2D] px-3 py-1 rounded-full border border-[#2E2E3D]/50 text-white font-semibold">
                {uniquePlatformsCount} {uniquePlatformsCount === 1 ? 'platform' : 'platforms'}
              </span>
              <span>•</span>
              <span className="text-[#10B981] font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
                Ready to use
              </span>
            </div>
          </div>
        </div>
        <div>
          <button
            onClick={() => setExportDrawerOpen(true)}
            className="bg-[#6366F1] hover:bg-[#5254d8] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm font-semibold shadow-lg shadow-[#6366F1]/10 hover:shadow-[#6366F1]/20 active:scale-[0.98]"
          >
            Export Panel
          </button>
        </div>
      </div>

      {/* Section 2 — Platform Filter Tabs */}
      {promptsList.length > 0 && (
        <div className="flex border-b border-[#1E1E2D] gap-6 overflow-x-auto scrollbar-none py-1.5 max-w-3xl mx-auto w-full">
          {activeTabs.map((tab) => {
            const count = tab === 'all'
              ? promptsList.length
              : promptsList.filter((p: any) => detectPlatform(p.deliverable_name || p.deliverable || '') === tab).length;

            const config = PLATFORM_CONFIG[tab] || PLATFORM_CONFIG.general;
            const isActive = activeTab === tab;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-[#8B8B9E] hover:text-white'
                }`}
                style={fontStyle}
              >
                <span>{config.label}</span>
                <span className="ml-1.5 opacity-50 font-mono text-xs">({count})</span>
                {isActive && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-[2px] transition-all rounded-full"
                    style={{ backgroundColor: config.accent }}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Section 3 — Prompt Cards Grid (One Card Per Line, FAANG Aesthetics) */}
      {promptsList.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 max-w-3xl mx-auto w-full">
          {displayPrompts.map((card: any, idx: number) => {
            const cardId = getCardId(card, idx);
            const isUsed = usedPrompts.includes(cardId);
            const isCopied = copiedCardId === cardId;
            const isAccordionOpen = expandedRationale.includes(cardId);
            const isEnhancerOpen = enhancerOpen.includes(cardId);

            const platformName = card.deliverable_name || card.deliverable || '';
            const platformKey = detectPlatform(platformName);
            const { accent: brandAccent, bgAccent, borderColor, label } = PLATFORM_CONFIG[platformKey] || PLATFORM_CONFIG.general;

            const ratio = card.aspect_ratio || '1:1';
            const headlineText = card.text_overlay?.headline || '';

            // Calculate current prompt text: use enhanced version if it exists
            const promptText = enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : (card.prompt || '');
            
            // Recalculate score & readiness
            const { score, checks } = scorePrompt(promptText);
            const readiness = checkPlatformReadiness(promptText);

            // Scorer details for footer
            const originalScore = scorePrompt(card.prompt || '').score;
            const scoreDiff = score - originalScore;
            const enhancedPromptText = enhancedPrompt[cardId];
            const isEnhancing = enhanceLoading[cardId] || false;

            return (
              <article
                key={cardId}
                className={`bg-[#0E0E16] border border-[#1E1E2D] rounded-2xl p-6 md:p-8 flex flex-col justify-between hover:border-[#2E2E3D] hover:shadow-xl hover:shadow-black/20 transition-all duration-300 ${
                  isUsed ? 'opacity-60 scale-[0.99] grayscale-[10%]' : 'opacity-100 scale-100'
                }`}
              >
                {/* Card Header */}
                <div className="flex items-center justify-between gap-4">
                  {/* Platform badge */}
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-4 rounded-sm" style={{ backgroundColor: brandAccent }} />
                    <span
                      className="px-2.5 py-1 rounded-md text-xs font-mono font-bold uppercase tracking-wider border"
                      style={{ backgroundColor: bgAccent, color: brandAccent, borderColor: borderColor }}
                    >
                      {label}
                    </span>
                  </div>

                  {/* Mark as Used toggle */}
                  <button
                    onClick={() => handleToggleUsed(cardId)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isUsed
                        ? 'bg-[#10B981] text-[#08080F] border-[#10B981] shadow-sm shadow-[#10B981]/10'
                        : 'bg-transparent text-[#8B8B9E] border-[#1E1E2D] hover:text-white hover:border-[#2E2E3D] active:scale-95'
                    }`}
                  >
                    {isUsed ? 'Used' : 'Mark as Used'}
                  </button>
                </div>

                {/* Style Name */}
                <div className="mt-4 text-base font-bold text-white tracking-tight text-left" style={fontStyle}>
                  {card.style || 'Custom Composition Style'}
                </div>

                <div className="border-b border-[#1E1E2D]/60 my-4" />

                {/* Mockup Preview & Specs Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Left Column: Mockup Preview */}
                  <div className="group/mockup bg-[#050508] border border-[#1E1E2D] rounded-xl flex items-center justify-center p-4 h-[210px] relative overflow-hidden transition-colors hover:border-[#6366F1]/20">
                    <div className={`relative ${getRatioClass(ratio)} bg-gradient-to-br from-[#12121c] to-[#0A0A0F] border border-[#1E1E2D]/80 rounded-lg overflow-hidden flex flex-col items-center justify-center p-3 shadow-inner`}>
                      {/* Rule of thirds grid overlay */}
                      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-0 group-hover/mockup:opacity-20 transition-opacity duration-300">
                        <div className="border-r border-b border-[#6366F1]/40" />
                        <div className="border-r border-b border-[#6366F1]/40" />
                        <div className="border-b border-[#6366F1]/40" />
                        <div className="border-r border-b border-[#6366F1]/40" />
                        <div className="border-r border-b border-[#6366F1]/40" />
                        <div className="border-b border-[#6366F1]/40" />
                        <div className="border-r border-[#6366F1]/40" />
                        <div className="border-r border-[#6366F1]/40" />
                        <div />
                      </div>

                      {/* Headline text */}
                      {headlineText ? (
                        <div className="text-center z-10 max-w-[95%] px-1">
                          <p className="text-xs font-bold text-white leading-snug tracking-tight drop-shadow-md select-all">
                            {headlineText}
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#8B8B9E]/35 italic font-medium select-none">No Text Overlay</span>
                      )}

                      {/* Aspect ratio label */}
                      <div className="absolute bottom-1.5 right-2 bg-[#050508]/90 px-2 py-0.5 rounded text-[9px] font-mono text-[#8B8B9E] border border-[#1E1E2D]/80 select-none">
                        {ratio}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Quick Specs */}
                  <div className="flex flex-col justify-between py-1.5 text-sm">
                    <div className="space-y-3.5 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[#8B8B9E] font-mono text-xs uppercase tracking-wider">Aspect Ratio</span>
                        <span className="font-semibold text-white font-mono text-sm">{ratio}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8B8B9E] font-mono text-xs uppercase tracking-wider">Text Zone</span>
                        <span className="font-semibold text-white capitalize text-sm truncate max-w-[140px]" title={card.text_overlay?.placement || 'N/A'}>
                          {card.text_overlay?.placement || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#8B8B9E] font-mono text-xs uppercase tracking-wider">Platform</span>
                        <span className="font-semibold text-white text-sm truncate max-w-[140px]" title={platformName}>
                          {label}
                        </span>
                      </div>
                    </div>

                    {/* Bullet elements */}
                    {card.visual_elements && card.visual_elements.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-[#1E1E2D] text-left">
                        <span className="text-[#8B8B9E] font-mono text-xs uppercase tracking-wider block mb-2">Visual Elements</span>
                        <ul className="text-xs text-[#D1D1E0]/90 space-y-1.5 pl-1.5">
                          {card.visual_elements.slice(0, 3).map((el: string, eidx: number) => (
                            <li key={eidx} className="flex items-center gap-2 truncate">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/60 flex-shrink-0" />
                              <span className="truncate">{el}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Score Section */}
                <div className="mt-6 p-4 rounded-xl bg-[#050508] border border-[#1E1E2D] space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#8B8B9E] font-mono uppercase tracking-wider">Quality Score</span>
                    <span className="font-bold text-white font-mono text-sm">{score}/100</span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-[#1A1A24] h-2 rounded-full overflow-hidden border border-[#2E2E3D]/50 shadow-inner">
                    <div
                      className="h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{
                        width: `${score}%`,
                        backgroundColor: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'
                      }}
                    />
                  </div>

                  {/* Dynamic checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 pt-2 text-xs font-semibold text-left">
                    {checks.map((item, cidx) => (
                      <div key={cidx} className="flex items-center gap-2.5 truncate">
                        {item.passed ? (
                          <CheckCircle2 size={15} className="text-[#10B981] flex-shrink-0" />
                        ) : (
                          <AlertCircle size={15} className="text-[#F59E0B] flex-shrink-0" />
                        )}
                        <span className={item.passed ? 'text-[#10B981]' : 'text-[#F59E0B] truncate'}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Platform Readiness Row */}
                <div className="mt-5 flex flex-wrap gap-2.5 text-xs select-none text-left">
                  {/* DALL-E readiness */}
                  <div className="relative group/readiness">
                    <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 font-bold tracking-tight cursor-default ${
                      readiness.dalle.ready
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25'
                        : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/25'
                    }`}>
                      <span>DALL-E</span>
                      {readiness.dalle.ready ? (
                        <CheckCircle2 size={13} className="text-[#10B981]" />
                      ) : (
                        <AlertCircle size={13} className="text-[#EF4444]" />
                      )}
                    </div>
                    {readiness.dalle.issue && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-56 bg-[#0E0E16] border border-[#2E2E3D] p-3 rounded-xl shadow-2xl z-20 hidden group-hover/readiness:block">
                        <p className="text-xs text-[#EF4444] font-bold flex items-center gap-1">
                          <AlertCircle size={13} /> DALL-E Issue
                        </p>
                        <p className="text-[11px] text-[#8B8B9E] mt-1.5 leading-normal">{readiness.dalle.issue}</p>
                      </div>
                    )}
                  </div>

                  {/* Midjourney readiness */}
                  <div className="relative group/readiness">
                    <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 font-bold tracking-tight cursor-default ${
                      readiness.midjourney.ready
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25'
                    }`}>
                      <span>Midjourney</span>
                      {readiness.midjourney.ready ? (
                        <CheckCircle2 size={13} className="text-[#10B981]" />
                      ) : (
                        <AlertCircle size={13} className="text-[#F59E0B]" />
                      )}
                    </div>
                    {!readiness.midjourney.ready && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 bg-[#0E0E16] border border-[#2E2E3D] p-3 rounded-xl shadow-2xl z-20 hidden group-hover/readiness:block text-left">
                        <p className="text-xs text-[#F59E0B] font-bold flex items-center gap-1.5">
                          <AlertCircle size={13} /> Midjourney Check
                        </p>
                        <p className="text-[11px] text-[#8B8B9E] mt-1.5 leading-normal">{readiness.midjourney.issue}</p>
                      </div>
                    )}
                  </div>

                  {/* Stable Diffusion readiness */}
                  <div className="relative group/readiness">
                    <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 font-bold tracking-tight cursor-default ${
                      readiness.stable_diffusion.ready
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/25'
                        : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/25'
                    }`}>
                      <span>Stable Diffusion</span>
                      {readiness.stable_diffusion.ready ? (
                        <CheckCircle2 size={13} className="text-[#10B981]" />
                      ) : (
                        <AlertCircle size={13} className="text-[#F59E0B]" />
                      )}
                    </div>
                    {!readiness.stable_diffusion.ready && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-60 bg-[#0E0E16] border border-[#2E2E3D] p-3 rounded-xl shadow-2xl z-20 hidden group-hover/readiness:block text-left">
                        <p className="text-xs text-[#F59E0B] font-bold flex items-center gap-1.5">
                          <AlertCircle size={13} /> Stable Diffusion Check
                        </p>
                        <p className="text-[11px] text-[#8B8B9E] mt-1.5 leading-normal">{readiness.stable_diffusion.issue}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Original Prompt Box Terminal */}
                <div className="mt-5 relative text-left">
                  <div className="flex justify-between items-center mb-2 px-1">
                    <span className="text-xs font-mono text-[#8B8B9E] uppercase tracking-wider font-semibold">
                      Original Prompt
                    </span>
                    <button
                      onClick={() => handleCopyPrompt(card.prompt || '', cardId)}
                      className={`px-3 py-1 rounded-md text-xs font-mono border flex items-center gap-2 transition-all ${
                        isCopied
                          ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 font-bold'
                          : 'bg-[#1A1A24] text-[#A0A0D2] border-[#1E1E2D] hover:text-[#6366F1] hover:border-[#6366F1]/50 active:scale-95'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy Prompt</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div
                    className={`bg-[#050508] border border-[#1E1E2D] rounded-xl p-4 font-mono text-sm leading-relaxed text-[#D1D1E0] h-28 overflow-y-auto whitespace-pre-wrap select-all scrollbar-thin shadow-inner border-t-[#222235] transition-all duration-300 ${
                      isEnhancing ? 'animate-pulse border-[#6366F1]/50 shadow-lg shadow-[#6366F1]/5' : ''
                    }`}
                    style={monoStyle}
                  >
                    {card.prompt || 'No prompt generated.'}
                  </div>
                </div>

                {/* Interactive AI Enhancer Accordion */}
                <div className="mt-4 border border-[#1E1E2D] rounded-xl bg-[#0E0E16]/30 overflow-hidden shadow-inner">
                  <button
                    onClick={() => handleToggleEnhancer(cardId)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-white bg-[#0E0E16]/50 hover:bg-[#1E1E2D]/40 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-[#6366F1]">
                      <Sparkles size={14} />
                      <span>Enhance with AI</span>
                    </span>
                    <span className="text-[#8B8B9E]">
                      {isEnhancerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </button>

                  {isEnhancerOpen && (
                    <div className="p-4 border-t border-[#1E1E2D]/40 space-y-4 bg-[#050508]/30">
                      {/* Presets Grid */}
                      <div className="space-y-2 text-left">
                        <label className="text-xs text-[#8B8B9E] font-medium font-mono uppercase tracking-wider block">
                          Style Presets (optional)
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {PRESET_MODIFIERS.map(opt => {
                            const isActive = (selectedOptions[cardId] || []).includes(opt);
                            return (
                              <button
                                key={opt}
                                onClick={() => handleToggleOption(cardId, opt)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 active:scale-95 ${
                                  isActive
                                    ? 'bg-[#6366F1]/10 text-white border-[#6366F1] shadow-sm shadow-[#6366F1]/10'
                                    : 'bg-transparent text-[#8B8B9E] border-[#1E1E2D] hover:text-white hover:border-[#2E2E3D]'
                                }`}
                              >
                                {isActive && <Check size={10} className="text-[#6366F1]" />}
                                <span>{opt}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional instructions textarea */}
                      <div className="space-y-2 text-left">
                        <label className="text-xs text-[#8B8B9E] font-medium font-mono uppercase tracking-wider block">
                          Want to add something specific? (optional)
                        </label>
                        <textarea
                          value={userEnhanceInput[cardId] || ''}
                          onChange={(e) => handleEnhanceInputChange(cardId, e.target.value)}
                          placeholder='e.g. "dramatic lighting, cinematic feel, sunset background..."'
                          className="w-full bg-[#050508] border border-[#1E1E2D] rounded-lg p-2.5 text-xs text-[#D1D1E0] placeholder-[#8B8B9E]/50 focus:outline-none focus:border-[#6366F1]/50 h-16 resize-none font-sans"
                        />
                        <div className="text-[10px] text-[#8B8B9E]/60 text-left font-mono">
                          Leave empty for automatic AI enhancement
                        </div>
                      </div>

                      {/* Enhance / Regenerate Button */}
                      <div className="text-left">
                        {isEnhancing ? (
                          <button
                            disabled
                            className="bg-[#6366F1] text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 opacity-50 cursor-not-allowed"
                          >
                            <Loader2 size={12} className="animate-spin" />
                            <span>Enhancing...</span>
                          </button>
                        ) : enhancedPromptText ? (
                          <button
                            onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                            className="bg-[#1A1A24] border border-[#1E1E2D] hover:border-[#6366F1]/50 text-[#A0A0D2] hover:text-white px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                          >
                            <RotateCw size={12} />
                            <span>Regenerate</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                            className="bg-[#6366F1] hover:bg-[#5254d8] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#6366F1]/10 flex items-center gap-1.5 active:scale-95"
                          >
                            <Sparkles size={12} />
                            <span>Enhance Prompt</span>
                          </button>
                        )}
                      </div>

                      {/* Enhanced version result section */}
                      {enhancedPromptText && !isEnhancing && (
                        <>
                          <div className="border-t border-dashed border-[#1E1E2D]/60 my-4" />

                          <div className="space-y-3.5 transition-all duration-300 animate-fadeIn text-left">
                            <div className="text-[10px] font-mono text-[#8B8B9E] uppercase tracking-wider font-semibold">
                              ENHANCED VERSION
                            </div>

                            <div className="flex justify-between items-center px-1">
                              {/* Score comparison */}
                              <div className="text-left font-mono text-xs">
                                {scoreDiff > 0 ? (
                                  <span className="text-[#8B8B9E]">
                                    Score: <span className="text-white">{originalScore}</span>
                                    <span className="text-[#8B8B9E] mx-1">{"->"}</span>
                                    <span className="text-[#10B981] font-bold">{score}</span>
                                    <span className="text-[#10B981] font-bold ml-1.5">+{scoreDiff}</span>
                                  </span>
                                ) : (
                                  <span className="text-[#8B8B9E]">
                                    Score: <span className="text-white font-bold">{score}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div
                              className="bg-[#050508] border border-[#1E1E2D] rounded-xl p-3 font-mono text-xs leading-relaxed text-[#D1D1E0] h-24 overflow-y-auto whitespace-pre-wrap select-all scrollbar-thin shadow-inner"
                              style={monoStyle}
                            >
                              {enhancedPromptText}
                            </div>

                            <div className="text-left pt-1">
                              <button
                                onClick={() => handleCopyEnhanced(cardId)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-mono border flex items-center gap-2 transition-all ${
                                  enhancedCopiedIdx === cardId
                                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 font-bold'
                                    : 'bg-[#1A1A24] text-[#A0A0D2] border-[#1E1E2D] hover:text-[#6366F1] hover:border-[#6366F1]/50 active:scale-95'
                                }`}
                              >
                                {enhancedCopiedIdx === cardId ? (
                                  <>
                                    <Check size={12} />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy size={12} />
                                    <span>Copy Enhanced Prompt</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Rationale Accordion */}
                <div className="mt-4 pt-3.5 border-t border-[#1E1E2D]/40 text-left">
                  <button
                    onClick={() => {
                      setExpandedRationale(prev =>
                        prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
                      );
                    }}
                    className="flex items-center gap-2 text-xs font-mono text-[#8B8B9E] hover:text-white transition-colors"
                  >
                    <span>Strategic Rationale</span>
                    {isAccordionOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <div
                    className={`transition-all duration-150 overflow-hidden ${
                      isAccordionOpen ? 'max-h-24 opacity-100 mt-2.5' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <p className="text-xs text-[#8B8B9E] italic leading-relaxed pl-3 border-l border-[#1E1E2D]">
                      {card.rationale || 'No strategic rationale available.'}
                    </p>
                  </div>
                </div>

                {/* Style Keywords */}
                {card.style_keywords && card.style_keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-3.5 border-t border-[#1E1E2D]/25">
                    {card.style_keywords.slice(0, 3).map((kw: string, kidx: number) => (
                      <span
                        key={kidx}
                        className="px-2.5 py-0.5 rounded text-xs font-mono bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/15 font-semibold"
                      >
                        #{kw.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}

          {/* Add custom visual prompt card */}
          <div
            onClick={() => toast.success('Custom visual prompt request workflow placeholder')}
            className="border border-dashed border-[#1E1E2D] hover:border-[#6366F1]/40 bg-transparent rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-[#1A1A24] flex items-center justify-center text-[#8B8B9E] group-hover:text-[#6366F1] group-hover:bg-[#6366F1]/10 transition-colors border border-[#1E1E2D] mb-3 shadow-inner">
              <Plus size={18} />
            </div>
            <span className="text-sm font-semibold text-[#F1F1F3] group-hover:text-white transition-colors" style={fontStyle}>
              Request a custom visual
            </span>
            <p className="text-xs text-[#8B8B9E] mt-1.5 max-w-xs mx-auto" style={fontStyle}>
              Request custom parameters for new campaign visual prompts.
            </p>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-[#0E0E16] border border-[#1E1E2D] rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-3xl mx-auto w-full">
          <div className="w-12 h-12 rounded-full bg-[#1A1A24] border border-[#1E1E2D] flex items-center justify-center text-[#6366F1] mb-4">
            <Palette size={20} />
          </div>
          <p className="text-base font-semibold mb-1.5 text-[#F1F1F3]" style={fontStyle}>
            No visual assets generated yet
          </p>
          <p className="text-xs max-w-sm text-[#8B8B9E]" style={fontStyle}>
            Prompts will show up here once the campaign visual creation finishes.
          </p>
        </div>
      )}

      {/* Section 4 — Visual Inspiration Moodboard (Placeholder) */}
      <div className="border border-[#1E1E2D] rounded-[14px] bg-[#0E0E16] overflow-hidden max-w-3xl mx-auto w-full shadow-lg">
        <div
          onClick={() => setMoodboardOpen(!moodboardOpen)}
          className="flex items-center justify-between px-4 py-3.5 cursor-pointer hover:bg-[#1E1E2D]/20 transition-colors select-none"
        >
          <span className="text-xs font-mono text-[#8B8B9E] uppercase tracking-wider flex items-center gap-2 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]" />
            Visual Inspiration Board
          </span>
          <span className="text-[#8B8B9E] hover:text-white transition-colors text-xs font-mono">
            {moodboardOpen ? 'Collapse' : 'Expand'}
          </span>
        </div>

        {moodboardOpen && (
          <div className="p-5 border-t border-[#1E1E2D]/40 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Tile 1: Lighting */}
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#12121c] to-[#0A0A0F] border border-[#1E1E2D] flex flex-col items-center justify-center p-3 relative overflow-hidden group transition-all hover:scale-[1.02] hover:border-[#2E2E3D]">
                <div className="absolute inset-0 bg-[#6366F1]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold text-white z-10">Lighting</span>
                <span className="text-[10px] font-mono text-[#8B8B9E] mt-1 z-10 font-semibold">Ref Preview</span>
              </div>

              {/* Tile 2: Color */}
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#12121c] to-[#0A0A0F] border border-[#1E1E2D] flex flex-col items-center justify-center p-3 relative overflow-hidden group transition-all hover:scale-[1.02] hover:border-[#2E2E3D]">
                <div className="absolute inset-0 bg-[#6366F1]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold text-white z-10">Color</span>
                <span className="text-[10px] font-mono text-[#8B8B9E] mt-1 z-10 font-semibold">Ref Preview</span>
              </div>

              {/* Tile 3: Composition */}
              <div className="aspect-[4/3] rounded-lg bg-gradient-to-br from-[#12121c] to-[#0A0A0F] border border-[#1E1E2D] flex flex-col items-center justify-center p-3 relative overflow-hidden group transition-all hover:scale-[1.02] hover:border-[#2E2E3D]">
                <div className="absolute inset-0 bg-[#6366F1]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-xs font-bold text-white z-10">Composition</span>
                <span className="text-[10px] font-mono text-[#8B8B9E] mt-1 z-10 font-semibold">Ref Preview</span>
              </div>

              {/* Tile 4: Add Ref */}
              <div className="aspect-[4/3] rounded-lg border border-dashed border-[#1E1E2D] hover:border-[#6366F1]/40 flex flex-col items-center justify-center p-3 cursor-pointer group transition-all hover:scale-[1.02]">
                <Plus size={18} className="text-[#8B8B9E] group-hover:text-white transition-colors mb-1" />
                <span className="text-xs font-semibold text-[#8B8B9E] group-hover:text-white transition-colors">Add Ref</span>
              </div>
            </div>
            <p className="text-xs text-[#8B8B9E] text-center" style={fontStyle}>
              Upload reference images to guide your visual direction - <span className="italic font-medium">Coming Soon</span>
            </p>
          </div>
        )}
      </div>

      {/* Section 5 — Export Drawer (Slide-in right-side panel) */}
      {exportDrawerOpen && (
        <div
          onClick={() => setExportDrawerOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[90] transition-opacity duration-300 animate-fadeIn"
        />
      )}
      <div
        className={`fixed right-0 top-0 bottom-0 w-80 bg-[#0E0E16] border-l border-[#1E1E2D] p-6 z-[100] shadow-2xl transition-transform duration-300 transform ${
          exportDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={fontStyle}
      >
        <div className="flex justify-between items-center pb-4 border-b border-[#1E1E2D] mb-6">
          <h3 className="text-sm font-semibold text-white tracking-tight">Export Assets</h3>
          <button
            onClick={() => setExportDrawerOpen(false)}
            className="text-[#8B8B9E] hover:text-white transition-colors p-1.5 hover:bg-[#1E1E2D]/50 rounded-lg flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Action 1: Copy All */}
          <div className="p-4 rounded-xl bg-[#050508] border border-[#1E1E2D] space-y-2 text-left">
            <h4 className="text-xs font-semibold text-white">Copy All Prompts</h4>
            <p className="text-[10px] text-[#8B8B9E]">
              Copies all prompts (including enhancements) as formatted text.
            </p>
            <button
              onClick={handleCopyAllPrompts}
              className="w-full mt-2 bg-[#6366F1] hover:bg-[#5254d8] text-white py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-[#6366F1]/10 hover:shadow-[#6366F1]/20"
            >
              Copy All
            </button>
          </div>

          {/* Action 2: PDF Brief */}
          <div className="p-4 rounded-xl bg-[#050508]/40 border border-[#1E1E2D]/60 space-y-2 opacity-60 text-left">
            <h4 className="text-xs font-semibold text-[#8B8B9E]">Download PDF Brief</h4>
            <p className="text-[10px] text-[#8B8B9E]/80">
              Generate print-ready visual brief documents.
            </p>
            <button
              disabled
              className="w-full mt-2 bg-[#1A1A24] text-[#8B8B9E] py-2 rounded-lg text-xs font-semibold cursor-not-allowed border border-[#1E1E2D]/50"
            >
              Coming Soon
            </button>
          </div>

          {/* Action 3: Design Tool */}
          <div className="p-4 rounded-xl bg-[#050508]/40 border border-[#1E1E2D]/60 space-y-2 opacity-60 text-left">
            <h4 className="text-xs font-semibold text-[#8B8B9E]">Send to Design Tool</h4>
            <p className="text-[10px] text-[#8B8B9E]/80">
              Push prompt variables directly to DALL-E or Midjourney.
            </p>
            <button
              disabled
              className="w-full mt-2 bg-[#1A1A24] text-[#8B8B9E] py-2 rounded-lg text-xs font-semibold cursor-not-allowed border border-[#1E1E2D]/50"
            >
              Coming Soon
            </button>
          </div>

          {/* Action 4: Share Campaign Brief */}
          <div className="p-4 rounded-xl bg-[#050508]/40 border border-[#1E1E2D]/60 space-y-2 opacity-60 text-left">
            <h4 className="text-xs font-semibold text-[#8B8B9E]">Share Campaign Brief</h4>
            <p className="text-[10px] text-[#8B8B9E]/80">
              Generate a secure viewing link for team review.
            </p>
            <button
              disabled
              className="w-full mt-2 bg-[#1A1A24] text-[#8B8B9E] py-2 rounded-lg text-xs font-semibold cursor-not-allowed border border-[#1E1E2D]/50"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualsContent;
