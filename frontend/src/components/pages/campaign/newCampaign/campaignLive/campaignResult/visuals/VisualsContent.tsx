import React, { useState } from 'react';
import { Copy, Check, Palette, Sparkles, MonitorUp, ArrowRight, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface VisualsContentProps {
  data?: any;
}

// Helper to extract hex color from strings like "Deep Navy (#0A192F)" or "electric blue #0066FF" or simply "#6366F1"
const extractHexColor = (color: string): string => {
  if (!color) return '#6366F1';
  const match = color.match(/#[0-9a-fA-F]{6}\b/);
  if (match) return match[0];
  const matchShort = color.match(/#[0-9a-fA-F]{3}\b/);
  if (matchShort) return matchShort[0];

  const normalized = color.toLowerCase();
  if (normalized.includes('navy')) return '#0A192F';
  if (normalized.includes('blue')) return '#0066FF';
  if (normalized.includes('silver') || normalized.includes('gray') || normalized.includes('grey')) return '#E0E0E0';
  if (normalized.includes('white')) return '#FFFFFF';
  if (normalized.includes('black') || normalized.includes('dark')) return '#111118';
  if (normalized.includes('gold')) return '#FFD700';
  if (normalized.includes('green')) return '#10B981';
  if (normalized.includes('red')) return '#EF4444';
  if (normalized.includes('orange')) return '#F59E0B';
  if (normalized.includes('purple')) return '#8B5CF6';
  return '#6366F1';
};

// Interactive SVG Aspect Ratio bounding box visualizer
const AspectRatioVisualizer: React.FC<{ ratio: string }> = ({ ratio }) => {
  const cleanRatio = ratio.replace(/\s+/g, '');
  if (cleanRatio === '16:9') {
    return (
      <svg className="w-5 h-3 opacity-60 mr-1.5" viewBox="0 0 20 12" fill="none">
        <rect x="0.5" y="0.5" width="19" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (cleanRatio === '9:16') {
    return (
      <svg className="w-3 h-5 opacity-60 mr-1.5" viewBox="0 0 12 20" fill="none">
        <rect x="0.5" y="0.5" width="11" height="19" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (cleanRatio === '4:5' || cleanRatio === '2:3') {
    return (
      <svg className="w-3.5 h-5 opacity-60 mr-1.5" viewBox="0 0 14 20" fill="none">
        <rect x="0.5" y="0.5" width="13" height="19" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  // Default: 1:1 Square
  return (
    <svg className="w-4 h-4 opacity-60 mr-1.5" viewBox="0 0 16 16" fill="none">
      <rect x="0.5" y="0.5" width="15" height="15" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
};

// Composition mockup preview component with on-hover grid lines
const CompositionMockup: React.FC<{
  ratio: string;
  textOverlay?: { headline?: string; cta?: string; placement?: string };
}> = ({ ratio, textOverlay }) => {
  const headline = textOverlay?.headline || '';
  const cta = textOverlay?.cta || '';
  const placement = (textOverlay?.placement || 'center').toLowerCase();

  // Aspect ratio styling matching design specs
  let ratioClass = 'aspect-square w-full max-w-[180px]';
  const cleanRatio = ratio.replace(/\s+/g, '');
  if (cleanRatio === '16:9') {
    ratioClass = 'aspect-video w-full max-w-[260px]';
  } else if (cleanRatio === '9:16') {
    ratioClass = 'aspect-[9/16] h-[190px] w-auto';
  } else if (cleanRatio === '4:5') {
    ratioClass = 'aspect-[4/5] h-[190px] w-auto';
  } else if (cleanRatio === '2:3') {
    ratioClass = 'aspect-[2/3] h-[190px] w-auto';
  }

  // Positioning class resolver based on placement details
  let positionClass = 'justify-center items-center text-center p-3';
  if (placement.includes('bottom-left') || placement.includes('bottom left') || placement.includes('left-third') || placement.includes('left third')) {
    positionClass = 'justify-end items-start text-left p-4';
  } else if (placement.includes('bottom-right') || placement.includes('bottom right') || placement.includes('right-third') || placement.includes('right third')) {
    positionClass = 'justify-end items-end text-right p-4';
  } else if (placement.includes('top-left') || placement.includes('top left')) {
    positionClass = 'justify-start items-start text-left p-4';
  } else if (placement.includes('top-right') || placement.includes('top right')) {
    positionClass = 'justify-start items-end text-right p-4';
  } else if (placement.includes('bottom')) {
    positionClass = 'justify-end items-center text-center p-4';
  } else if (placement.includes('top')) {
    positionClass = 'justify-start items-center text-center p-4';
  }

  return (
    <div className="group/mockup flex justify-center items-center w-full bg-[#050508] border border-[#1b1b26] rounded-xl p-4 min-h-[210px] relative transition-colors duration-300 hover:border-[#6366F1]/20">
      <div className={`relative ${ratioClass} bg-gradient-to-br from-[#1A1A30] via-[#0D0D18] to-[#05050A] rounded-lg border border-[#222235] flex flex-col shadow-inner overflow-hidden`}>
        {/* Rule of Thirds Grid Overlay (Revealed faintly on hover) */}
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-0 group-hover/mockup:opacity-15 transition-opacity duration-300">
          <div className="border-r border-b border-neutral-400"></div>
          <div className="border-r border-b border-neutral-400"></div>
          <div className="border-b border-neutral-400"></div>
          <div className="border-r border-b border-neutral-400"></div>
          <div className="border-r border-b border-neutral-400"></div>
          <div className="border-b border-neutral-400"></div>
          <div className="border-r border-neutral-400"></div>
          <div className="border-r border-neutral-400"></div>
          <div></div>
        </div>

        {/* Text overlay rendering inside mockup */}
        <div className={`absolute inset-0 flex flex-col z-10 ${positionClass}`}>
          {headline ? (
            <div className="max-w-[95%]">
              <p className="text-[10px] font-bold text-white leading-snug tracking-tight mb-2 drop-shadow-md">
                {headline}
              </p>
              {cta && (
                <span className="inline-block px-1.5 py-0.5 rounded-[3px] text-[7px] font-bold bg-[#6366F1] text-white shadow-md uppercase tracking-wider">
                  {cta}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[8px] text-[#6b6b7a] italic">Composition Preview</span>
          )}
        </div>

        {/* Technical aspect ratio indicator */}
        <div className="absolute bottom-1 right-1.5 bg-black/60 backdrop-blur-md px-1 py-0.5 rounded text-[8px] font-mono text-[#8B8B9E] border border-[#1b1b26] z-20">
          {ratio}
        </div>
      </div>

      {/* Grid Guide Indicator */}
      <span className="absolute bottom-2 left-3 text-[8px] font-mono text-[#555] opacity-0 group-hover/mockup:opacity-100 transition-opacity duration-300">
        Grid lines (rule of thirds) active
      </span>
    </div>
  );
};

const VisualsContent: React.FC<VisualsContentProps> = ({ data }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  const visualDirection = data?.visual_direction || {};
  const prompts = data?.image_prompts || [];
  
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Render all real AI-generated prompts — no hardcoded fallbacks
  const displayPrompts = Array.isArray(prompts) && prompts.length > 0 ? prompts : [];

  const handleCopyPrompt = async (promptText: string, idx: number) => {
    if (!promptText || promptText === 'No prompt available') {
      toast.error('No prompt text to copy');
      return;
    }
    try {
      await navigator.clipboard.writeText(promptText);
      setCopiedIdx(idx);
      toast.success('DALL-E prompt copied to clipboard!', { id: 'copy-success' });
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = promptText;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        setCopiedIdx(idx);
        toast.success('DALL-E prompt copied to clipboard!', { id: 'copy-success' });
        setTimeout(() => setCopiedIdx(null), 2000);
      } catch {
        toast.error('Unable to copy — please copy manually.', { id: 'copy-success' });
      }
    }
  };

  const handleCopyColor = async (colorHex: string) => {
    try {
      await navigator.clipboard.writeText(colorHex);
      toast.success(`Color hex copied: ${colorHex}`, { id: 'copy-success' });
    } catch {
      toast.error('Failed to copy color');
    }
  };

  return (
    <div className="space-y-8">
      {/* Clean, Premium Header */}
      <div className="rounded-2xl border border-[#222230] bg-[#0E0E16] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#8F93F7]">
                <Palette size={20} />
              </div>
              <div>
                <span className="text-[9px] uppercase font-mono text-[#8B8B9E] tracking-widest block">Visual Creative Studio</span>
                <h1 className="text-2xl md:text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Visual Design Assets
                </h1>
              </div>
            </div>
            <p className="text-sm text-[#8B8B9E] max-w-2xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              {hasRealData
                ? 'High-fidelity image prompts engineered with Context Injection Prefixes, providing DALL-E with research pain points, strategy positioning, and copy hooks.'
                : 'Generative AI visual prompts specifically engineered for marketing platforms, featuring context injection and storytelling.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-[#6366F1] hover:bg-[#5254d8] text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-[#6366F1]/10 text-sm font-medium" style={{ fontFamily: 'Sora, sans-serif' }}>
              <Sparkles size={16} /> Generate Visual Variant
            </button>
          </div>
        </div>
      </div>

      {displayPrompts.length === 0 && (
        <div className="bg-[#0E0E16] border border-[#222230] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-14 h-14 rounded-full bg-[#1A1A24] border border-[#222230] flex items-center justify-center text-[#6366F1] mb-4">
            <Sparkles size={24} />
          </div>
          <p className="text-base font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>No image prompts yet</p>
          <p className="text-sm max-w-sm text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
            Image prompts will be generated after the AI visuals agent completes its work.
          </p>
        </div>
      )}

      {/* Figma-Style Brand Visual Spec Inspector */}
      {visualDirection.overall_style && (
        <div className="border border-[#222230] bg-[#0E0E16] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#6366F1]/5 rounded-full blur-3xl pointer-events-none" />
          
          <h3 className="text-xs font-semibold mb-6 flex items-center gap-2 uppercase tracking-wider text-[#A0A0D2]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            <MonitorUp size={14} className="text-[#8F93F7]" />
            Brand Visual Spec Sheet
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="border-b border-[#1c1c2b] pb-4">
                <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-1">Artistic Style Direction</span>
                <p className="text-sm font-medium leading-relaxed text-[#F1F1F3]">{visualDirection.overall_style}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-1">Visual Tone & Mood</span>
                  <p className="text-sm text-[#D1D1E0]">{visualDirection.mood || 'Consistent and tailored brand theme'}</p>
                </div>
                {visualDirection.key_visual_themes && (
                  <div>
                    <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-2">Key Visual Themes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {visualDirection.key_visual_themes.map((theme: string, idx: number) => (
                        <span key={idx} className="px-2.5 py-0.5 rounded-full bg-[#1A1A24] border border-[#222230] text-xs text-[#A0A0D2] font-mono">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Paint Chips Color Palette */}
            {visualDirection.color_palette && (
              <div className="border-t lg:border-t-0 lg:border-l border-[#1c1c2b] pt-6 lg:pt-0 lg:pl-6">
                <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-3">Color Swatches (Click to copy)</span>
                <div className="grid grid-cols-2 gap-2">
                  {visualDirection.color_palette.map((color: string, idx: number) => {
                    const colorHex = extractHexColor(color);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleCopyColor(colorHex)}
                        className="group flex items-center gap-2 bg-[#12121b] border border-[#1c1c2b] rounded-xl p-2.5 hover:border-[#6366F1]/40 hover:bg-[#151524] cursor-pointer transition-all duration-300 shadow-sm"
                        title={`Copy ${colorHex} to clipboard`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg border border-neutral-700/50 shadow-inner transition-transform duration-200 group-hover:scale-105"
                          style={{ backgroundColor: colorHex }}
                        />
                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="text-[10px] font-bold text-[#F1F1F3] truncate group-hover:text-[#8F93F7] transition-colors">{color.split(' ')[0]}</span>
                          <span className="text-[9px] font-mono text-[#8B8B9E]">{colorHex}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompts Inspector Split Panel Grid */}
      {displayPrompts.length > 0 && (
        <div className="space-y-6">
          {displayPrompts.map((card: any, idx: number) => {
            const isCopied = copiedIdx === idx;

            // Determine Icon accent color by Deliverable/Channel name
            const nameLower = (card.deliverable_name || card.deliverable || '').toLowerCase();
            let brandAccent = '#6366F1';
            let bgAccent = 'rgba(99,102,241,0.1)';

            if (nameLower.includes('linkedin')) {
              brandAccent = '#0077B5';
              bgAccent = 'rgba(0,119,181,0.1)';
            } else if (nameLower.includes('instagram')) {
              brandAccent = '#E1306C';
              bgAccent = 'rgba(225,48,108,0.1)';
            } else if (nameLower.includes('facebook')) {
              brandAccent = '#1877F2';
              bgAccent = 'rgba(24,119,242,0.1)';
            } else if (nameLower.includes('email')) {
              brandAccent = '#10B981';
              bgAccent = 'rgba(16,185,129,0.1)';
            } else if (nameLower.includes('youtube')) {
              brandAccent = '#FF0000';
              bgAccent = 'rgba(255,0,0,0.1)';
            } else if (nameLower.includes('tiktok')) {
              brandAccent = '#00f2fe';
              bgAccent = 'rgba(0,242,254,0.1)';
            }

            return (
              <article key={idx} className="bg-[#0E0E16] border border-[#222230] rounded-2xl p-6 shadow-xl transition-all duration-300 hover:border-[#6366F1]/20">
                {/* Side-by-Side Split Panel Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  
                  {/* Left Column: Visual Mockup / Canvas (2/5 cols) */}
                  <div className="lg:col-span-2 flex flex-col justify-between space-y-4">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-2">Visual Composition Mockup</span>
                      <CompositionMockup ratio={card.aspect_ratio || '1:1'} textOverlay={card.text_overlay} />
                    </div>
                    
                    {/* Mockup Technical Specs Info Row */}
                    <div className="grid grid-cols-2 gap-2 bg-[#12121b] border border-[#1e1e2d] rounded-xl p-3 text-xs text-[#8B8B9E]">
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] uppercase font-mono text-[#555] mb-0.5">Aspect Ratio</span>
                        <span className="font-mono text-[#F1F1F3] flex items-center">
                          <AspectRatioVisualizer ratio={card.aspect_ratio || '1:1'} />
                          {card.aspect_ratio || '1:1'}
                        </span>
                      </div>
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] uppercase font-mono text-[#555] mb-0.5">Text Placement</span>
                        <span className="font-sans text-[#F1F1F3] truncate">
                          {card.text_overlay?.placement || 'N/A (No Overlay)'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Prompt Console & Specs (3/5 cols) */}
                  <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
                    
                    {/* Card Title Header */}
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-mono border inline-block mb-1.5"
                          style={{ backgroundColor: bgAccent, color: brandAccent, borderColor: `${brandAccent}33` }}
                        >
                          {card.deliverable_name || card.deliverable || 'Visual Asset'}
                        </span>
                        <h4 className="text-base font-semibold text-[#F1F1F3] tracking-tight">{card.style || 'Custom Composition Style'}</h4>
                      </div>
                    </div>

                    {/* DALL-E Prompt Text Console */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-mono text-[#8B8B9E] tracking-wider">Context-Injected DALL-E 3 Prompt</span>
                        <button
                          onClick={() => handleCopyPrompt(card.prompt || '', idx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono border transition-all duration-200 ${
                            isCopied
                              ? 'bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30 shadow-[#10B981]/5 shadow-sm'
                              : 'bg-[#12121c] text-[#A0A0D2] border-[#222230] hover:text-[#6366F1] hover:border-[#6366F1]/40'
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <Check size={12} className="text-[#10B981]" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Copy Prompt</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-[#050508] border border-[#1c1c2b] rounded-xl p-4 font-mono text-xs leading-relaxed text-[#D1D1E0] h-36 overflow-y-auto whitespace-pre-wrap select-all">
                        {card.prompt || 'No prompt generated.'}
                      </div>
                    </div>

                    {/* Specs, Keywords, and Rationale */}
                    <div className="space-y-3">
                      
                      {/* Rationale block */}
                      {card.rationale && (
                        <div className="bg-[#12121b] border border-[#1e1e2d] rounded-xl p-3 text-left">
                          <span className="text-[9px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-1">Strategic Rationale</span>
                          <p className="text-xs text-[#A0A0D2] italic leading-relaxed">&ldquo;{card.rationale}&rdquo;</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 text-xs pt-1 border-t border-[#1c1c2b]">
                        {/* Visual elements */}
                        {card.visual_elements && card.visual_elements.length > 0 && (
                          <div>
                            <span className="text-[9px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-1.5">Visual Elements</span>
                            <div className="flex flex-wrap gap-1">
                              {card.visual_elements.slice(0, 3).map((el: string, eidx: number) => (
                                <span key={eidx} className="px-2 py-0.5 rounded bg-[#12121b] border border-[#222230] text-[10px] text-[#A0A0D2] flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-[#6366F1]/50" />
                                  {el}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Style Keywords */}
                        {card.style_keywords && card.style_keywords.length > 0 && (
                          <div>
                            <span className="text-[9px] uppercase font-mono text-[#8B8B9E] tracking-wider block mb-1.5">Style Keywords</span>
                            <div className="flex flex-wrap gap-1">
                              {card.style_keywords.slice(0, 3).map((kw: string, kidx: number) => (
                                <span key={kidx} className="px-2 py-0.5 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 text-[9px] text-[#8F93F7] font-mono">
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>

                {/* Actions footer */}
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1c1c2b]">
                  <span className="text-[9px] font-mono text-[#8B8B9E]">
                    Optimized for DALL-E 3 & Midjourney v6
                  </span>
                  <button className="text-xs font-semibold flex items-center gap-1 text-[#8F93F7] hover:text-[#a5a7fa] transition-colors">
                    Send to Studio <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            );
          })}

          {/* Add custom placeholder card */}
          <article className="border border-dashed border-[#222230] hover:border-[#6366F1]/30 bg-transparent rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group min-h-[160px]">
            <div className="w-10 h-10 rounded-full bg-[#1A1A24] flex items-center justify-center text-[#8B8B9E] group-hover:text-[#8F93F7] group-hover:bg-[#6366F1]/10 transition-colors mb-3 border border-[#222230]">
              <Plus size={20} />
            </div>
            <h3 className="text-sm font-semibold mb-1 text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>Add Custom Deliverable</h3>
            <p className="text-xs max-w-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
              Add a new deliverable and design narrative storytelling prompts with injected context.
            </p>
          </article>
        </div>
      )}
    </div>
  );
};

export default VisualsContent;
