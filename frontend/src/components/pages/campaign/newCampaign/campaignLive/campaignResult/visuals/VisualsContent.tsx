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

const VisualsContent: React.FC<VisualsContentProps> = ({ data }) => {
  const prompts = data?.image_prompts || [];
  const promptsList = Array.isArray(prompts) ? prompts : [];

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
  const [moodboardOpen, setMoodboardOpen] = useState<boolean>(false);

  useEffect(() => {
    setUsedPrompts(getUsedPrompts());
  }, []);

  const getCardId = (card: any, idx: number) =>
    `${card.deliverable_name || card.deliverable || 'asset'}_${idx}`;

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

  const handleToggleEnhancer = (assetId: string) =>
    setEnhancerOpen(prev =>
      prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
    );

  const handleEnhanceInputChange = (assetId: string, value: string) =>
    setUserEnhanceInput(prev => ({ ...prev, [assetId]: value }));

  const handleToggleOption = (assetId: string, option: string) =>
    setSelectedOptions(prev => {
      const current = prev[assetId] || [];
      const updated = current.includes(option)
        ? current.filter(o => o !== option)
        : [...current, option];
      return { ...prev, [assetId]: updated };
    });

  const handleEnhancePrompt = async (assetId: string, originalPrompt: string) => {
    setEnhanceLoading(prev => ({ ...prev, [assetId]: true }));
    try {
      const presets = selectedOptions[assetId] || [];
      const customText = userEnhanceInput[assetId] || '';
      let combinedInstructions = '';
      if (presets.length > 0) combinedInstructions += `Add these details: ${presets.join(', ')}. `;
      if (customText.trim()) combinedInstructions += customText.trim();
      const result = await enhancePromptWithAI(originalPrompt, combinedInstructions);
      setEnhancedPrompt(prev => ({ ...prev, [assetId]: result }));
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
    if (promptsList.length === 0) { toast.error('No prompts to copy'); return; }
    const formattedText = promptsList
      .map((card, idx) => {
        const cardId = getCardId(card, idx);
        const text = enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : (card.prompt || '');
        const platformKey = detectPlatform(card.deliverable_name || card.deliverable || '');
        const platformLabel = PLATFORM_CONFIG[platformKey]?.label || 'General';
        return `=== ${platformLabel} ===\n${text}`;
      })
      .join('\n\n');
    try {
      await navigator.clipboard.writeText(formattedText);
      toast.success('All prompts copied to clipboard!');
    } catch {
      toast.error('Failed to copy all prompts');
    }
  };

  const detectedPlatforms = Array.from(
    new Set(promptsList.map((p: any) => detectPlatform(p.deliverable_name || p.deliverable || '')))
  ).filter(Boolean) as string[];

  const uniquePlatformsCount = detectedPlatforms.length;
  const activeTabs = ['all', ...detectedPlatforms];

  const displayPrompts =
    activeTab === 'all'
      ? promptsList
      : promptsList.filter(
          (p: any) => detectPlatform(p.deliverable_name || p.deliverable || '') === activeTab
        );

  return (
    <div className="space-y-8" style={inter}>

      {/* ── PAGE HEADER ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#2A2A38]">
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
              <span className="px-3 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs font-semibold text-[#F1F1F3]">
                {uniquePlatformsCount} {uniquePlatformsCount === 1 ? 'platform' : 'platforms'}
              </span>
            </div>
          )}
          <button
            onClick={() => setExportDrawerOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254d8] text-white text-sm font-semibold transition-all shadow-md shadow-[#6366F1]/10 hover:shadow-[#6366F1]/20 active:scale-[0.98]"
          >
            Export
          </button>
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
                    (p: any) => detectPlatform(p.deliverable_name || p.deliverable || '') === tab
                  ).length;
            const config = PLATFORM_CONFIG[tab] || PLATFORM_CONFIG.general;
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-[#8B8B9E] hover:text-[#D1D1E0]'
                }`}
              >
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
          {displayPrompts.map((card: any, idx: number) => {
            const cardId = getCardId(card, idx);
            const isUsed = usedPrompts.includes(cardId);
            const isCopied = copiedCardId === cardId;
            const isAccordionOpen = expandedRationale.includes(cardId);
            const isEnhancerOpen = enhancerOpen.includes(cardId);

            const platformName = card.deliverable_name || card.deliverable || '';
            const platformKey = detectPlatform(platformName);
            const { accent: brandAccent, bgAccent, borderColor, label } =
              PLATFORM_CONFIG[platformKey] || PLATFORM_CONFIG.general;

            const ratio = card.aspect_ratio || '1:1';
            const headlineText = card.text_overlay?.headline || '';
            const promptText =
              enhancedPrompt[cardId] !== undefined ? enhancedPrompt[cardId] : card.prompt || '';
            const { score, checks } = scorePrompt(promptText);
            const readiness = checkPlatformReadiness(promptText);
            const originalScore = scorePrompt(card.prompt || '').score;
            const scoreDiff = score - originalScore;
            const enhancedPromptText = enhancedPrompt[cardId];
            const isEnhancing = enhanceLoading[cardId] || false;

            return (
              <article
                key={cardId}
                className={`bg-[#111118] border border-[#2A2A38] rounded-2xl overflow-hidden transition-all duration-300 hover:border-[#6366F1]/30 hover:shadow-xl hover:shadow-black/30 ${
                  isUsed ? 'opacity-55' : ''
                }`}
              >
                {/* ── CARD TOP BAR ── */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-[#2A2A38]/60">
                  <div className="flex items-center gap-3">
                    {/* Platform accent stripe + badge */}
                    <div className="w-1 h-6 rounded-full" style={{ backgroundColor: brandAccent }} />
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border"
                      style={{ backgroundColor: bgAccent, color: brandAccent, borderColor }}
                    >
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
                    <div className="group bg-[#0A0A0F] border border-[#2A2A38] rounded-xl flex items-center justify-center p-5 min-h-[200px] relative overflow-hidden hover:border-[#6366F1]/20 transition-colors">
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

                    {/* Quality score */}
                    <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider">
                          Quality Score
                        </span>
                        <span
                          className="text-lg font-bold font-mono"
                          style={{ color: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }}
                        >
                          {score}<span className="text-xs text-[#8B8B9E] font-normal">/100</span>
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full h-2 rounded-full bg-[#1A1A24] border border-[#2A2A38]/50 overflow-hidden mb-4">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${score}%`,
                            backgroundColor: score >= 80 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                      {/* Checklist */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {checks.map((item, cidx) => (
                          <div key={cidx} className="flex items-center gap-2 text-xs">
                            {item.passed ? (
                              <CheckCircle2 size={13} className="text-[#10B981] flex-shrink-0" />
                            ) : (
                              <AlertCircle size={13} className="text-[#F59E0B] flex-shrink-0" />
                            )}
                            <span className={item.passed ? 'text-[#10B981]' : 'text-[#F59E0B]'}>
                              {item.label}
                            </span>
                          </div>
                        ))}
                      </div>
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
                      </div>
                      <div
                        className={`bg-[#0A0A0F] border rounded-xl p-4 text-sm leading-relaxed text-[#D1D1E0] min-h-[80px] max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all transition-all ${
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
                    <div className="border border-[#2A2A38] rounded-xl overflow-hidden">
                      <button
                        onClick={() => handleToggleEnhancer(cardId)}
                        className="w-full flex items-center justify-between px-5 py-3.5 bg-[#0A0A0F] hover:bg-[#111118] transition-colors"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-[#6366F1]">
                          <Sparkles size={15} />
                          Enhance with AI
                        </span>
                        <span className="text-[#8B8B9E]">
                          {isEnhancerOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                        </span>
                      </button>

                      {isEnhancerOpen && (
                        <div className="p-5 border-t border-[#2A2A38]/50 space-y-5 bg-[#0A0A0F]/40">
                          {/* Presets */}
                          <div>
                            <p className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider mb-2">
                              Style Presets
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {PRESET_MODIFIERS.map(opt => {
                                const isActive = (selectedOptions[cardId] || []).includes(opt);
                                return (
                                  <button
                                    key={opt}
                                    onClick={() => handleToggleOption(cardId, opt)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                      isActive
                                        ? 'bg-[#6366F1]/15 text-white border-[#6366F1]/60'
                                        : 'bg-transparent text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/30'
                                    }`}
                                  >
                                    {isActive && <Check size={10} className="text-[#6366F1]" />}
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Custom input */}
                          <div>
                            <p className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider mb-2">
                              Custom Instructions (optional)
                            </p>
                            <textarea
                              value={userEnhanceInput[cardId] || ''}
                              onChange={e => handleEnhanceInputChange(cardId, e.target.value)}
                              placeholder='e.g. "dramatic lighting, cinematic feel, golden hour..."'
                              className="w-full bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-3.5 text-sm text-[#D1D1E0] placeholder-[#8B8B9E]/40 focus:border-[#6366F1]/40 focus:outline-none h-20 resize-none"
                              style={inter}
                            />
                          </div>

                          {/* Enhance button */}
                          <div>
                            {isEnhancing ? (
                              <button
                                disabled
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1]/50 text-white text-sm font-semibold cursor-not-allowed"
                              >
                                <Loader2 size={14} className="animate-spin" />
                                Enhancing...
                              </button>
                            ) : enhancedPromptText ? (
                              <button
                                onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1A1A24] border border-[#2A2A38] hover:border-[#6366F1]/50 text-[#8B8B9E] hover:text-white text-sm font-semibold transition-all active:scale-95"
                              >
                                <RotateCw size={13} />
                                Regenerate
                              </button>
                            ) : (
                              <button
                                onClick={() => handleEnhancePrompt(cardId, card.prompt || '')}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254d8] text-white text-sm font-semibold transition-all shadow-md shadow-[#6366F1]/20 active:scale-95"
                              >
                                <Sparkles size={13} />
                                Enhance Prompt
                              </button>
                            )}
                          </div>

                          {/* Enhanced result */}
                          {enhancedPromptText && !isEnhancing && (
                            <div className="border-t border-dashed border-[#2A2A38] pt-5 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider">
                                  Enhanced Version
                                </span>
                                {scoreDiff > 0 && (
                                  <span className="text-xs font-semibold text-[#10B981]">
                                    Score {originalScore} → {score} (+{scoreDiff})
                                  </span>
                                )}
                              </div>
                              <div
                                className="bg-[#0A0A0F] border border-[#6366F1]/20 rounded-xl p-4 text-sm text-[#D1D1E0] leading-relaxed max-h-[140px] overflow-y-auto whitespace-pre-wrap select-all"
                                style={mono}
                              >
                                {enhancedPromptText}
                              </div>
                              <button
                                onClick={() => handleCopyEnhanced(cardId)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all active:scale-95 ${
                                  enhancedCopiedIdx === cardId
                                    ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30'
                                    : 'bg-[#1A1A24] text-[#8B8B9E] border-[#2A2A38] hover:text-white hover:border-[#6366F1]/40'
                                }`}
                              >
                                {enhancedCopiedIdx === cardId ? <Check size={11} /> : <Copy size={11} />}
                                {enhancedCopiedIdx === cardId ? 'Copied' : 'Copy Enhanced'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
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
                        <p className="mt-3 text-sm text-[#8B8B9E] leading-relaxed italic pl-4 border-l-2 border-[#2A2A38]">
                          {card.rationale || 'No strategic rationale available.'}
                        </p>
                      )}
                    </div>

                    {/* Style keywords */}
                    {card.style_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {card.style_keywords.slice(0, 5).map((kw: string, kidx: number) => (
                          <span
                            key={kidx}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold font-mono bg-[#8B5CF6]/10 text-[#A78BFA] border border-[#8B5CF6]/20"
                          >
                            #{kw.replace(/^#/, '')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}

          {/* Add custom prompt CTA */}
          <div
            onClick={() => toast.success('Custom visual prompt request workflow placeholder')}
            className="border-2 border-dashed border-[#2A2A38] hover:border-[#6366F1]/40 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer group transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-[#1A1A24] border border-[#2A2A38] flex items-center justify-center text-[#8B8B9E] group-hover:text-[#6366F1] group-hover:bg-[#6366F1]/10 group-hover:border-[#6366F1]/30 transition-all mb-4">
              <Plus size={20} />
            </div>
            <p className="text-sm font-semibold text-[#F1F1F3] group-hover:text-white transition-colors">
              Request a Custom Visual
            </p>
            <p className="text-xs text-[#8B8B9E] mt-1.5 max-w-sm">
              Request custom parameters for new campaign visual prompts.
            </p>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div className="bg-[#111118] border border-[#2A2A38] rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#1A1A24] border border-[#2A2A38] flex items-center justify-center text-[#6366F1] mb-5">
            <Palette size={24} />
          </div>
          <p className="text-base font-semibold text-[#F1F1F3] mb-2">No visual assets generated yet</p>
          <p className="text-sm text-[#8B8B9E] max-w-sm leading-relaxed">
            Prompts will appear here once the campaign visual creation agent finishes.
          </p>
        </div>
      )}

      {/* ── VISUAL INSPIRATION BOARD ────────────────────────────────────── */}
      <div className="border border-[#2A2A38] rounded-2xl bg-[#111118] overflow-hidden">
        <button
          onClick={() => setMoodboardOpen(!moodboardOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-[#2A2A38]/10 transition-colors"
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold text-[#8B8B9E] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
            Visual Inspiration Board
          </span>
          <span className="text-xs text-[#8B8B9E] font-medium">
            {moodboardOpen ? 'Collapse' : 'Expand'}
          </span>
        </button>

        {moodboardOpen && (
          <div className="p-6 border-t border-[#2A2A38]/50 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['Lighting', 'Color', 'Composition'].map(label => (
                <div
                  key={label}
                  className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#1A1A24] to-[#0A0A0F] border border-[#2A2A38] flex flex-col items-center justify-center gap-1 relative overflow-hidden group hover:border-[#6366F1]/30 hover:scale-[1.02] transition-all"
                >
                  <div className="absolute inset-0 bg-[#6366F1]/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-sm font-semibold text-white z-10">{label}</span>
                  <span className="text-[10px] font-mono text-[#8B8B9E] z-10">Ref Preview</span>
                </div>
              ))}
              <div className="aspect-[4/3] rounded-xl border border-dashed border-[#2A2A38] hover:border-[#6366F1]/40 flex flex-col items-center justify-center gap-1 cursor-pointer group hover:scale-[1.02] transition-all">
                <Plus size={18} className="text-[#8B8B9E] group-hover:text-[#6366F1] transition-colors" />
                <span className="text-xs font-semibold text-[#8B8B9E] group-hover:text-white transition-colors">Add Ref</span>
              </div>
            </div>
            <p className="text-xs text-center text-[#8B8B9E]">
              Upload reference images to guide your visual direction —{' '}
              <span className="italic font-medium">Coming Soon</span>
            </p>
          </div>
        )}
      </div>

      {/* ── EXPORT DRAWER ───────────────────────────────────────────────── */}
      {exportDrawerOpen && (
        <div
          onClick={() => setExportDrawerOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] animate-fadeIn"
        />
      )}
      <div
        className={`fixed right-0 top-0 bottom-0 w-[340px] bg-[#111118] border-l border-[#2A2A38] p-7 z-[100] shadow-2xl shadow-black/50 transition-transform duration-300 ${
          exportDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={inter}
      >
        <div className="flex items-center justify-between mb-7">
          <h3 className="text-base font-semibold text-white">Export Assets</h3>
          <button
            onClick={() => setExportDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8B8B9E] hover:text-white hover:bg-[#2A2A38] transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {[
            {
              title: 'Copy All Prompts',
              desc: 'Copies all prompts (including enhancements) as formatted text.',
              action: handleCopyAllPrompts,
              cta: 'Copy All',
              active: true,
            },
            {
              title: 'Download PDF Brief',
              desc: 'Generate print-ready visual brief documents.',
              action: undefined,
              cta: 'Coming Soon',
              active: false,
            },
            {
              title: 'Send to Design Tool',
              desc: 'Push prompts directly to DALL-E or Midjourney.',
              action: undefined,
              cta: 'Coming Soon',
              active: false,
            },
            {
              title: 'Share Campaign Brief',
              desc: 'Generate a secure viewing link for team review.',
              action: undefined,
              cta: 'Coming Soon',
              active: false,
            },
          ].map(item => (
            <div
              key={item.title}
              className={`p-4 rounded-xl border space-y-2 ${
                item.active
                  ? 'bg-[#0A0A0F] border-[#2A2A38]'
                  : 'bg-[#0A0A0F]/40 border-[#2A2A38]/50 opacity-55'
              }`}
            >
              <h4 className={`text-sm font-semibold ${item.active ? 'text-white' : 'text-[#8B8B9E]'}`}>
                {item.title}
              </h4>
              <p className="text-xs text-[#8B8B9E] leading-relaxed">{item.desc}</p>
              <button
                onClick={item.action}
                disabled={!item.active}
                className={`w-full mt-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                  item.active
                    ? 'bg-[#6366F1] hover:bg-[#5254d8] text-white shadow-md shadow-[#6366F1]/10'
                    : 'bg-[#1A1A24] text-[#8B8B9E] cursor-not-allowed border border-[#2A2A38]/50'
                }`}
              >
                {item.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VisualsContent;
