import React from 'react';
import { Copy, Plus, ArrowRight, Filter, Palette, Sparkles, MonitorUp } from 'lucide-react';

interface VisualsContentProps {
  data?: any;
}

const VisualsContent: React.FC<VisualsContentProps> = ({ data }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  const visualDirection = data?.visual_direction || {};
  const prompts = data?.image_prompts || [];

  const defaultPrompts = [
    { platform: 'LinkedIn', type: 'Banner', platformColor: '#0e76a8', platformBg: 'rgba(14, 118, 168, 0.1)', dimensions: '1584×396', title: 'Corporate Tech Abstract', description: 'Professional, networking-focused background with subtle tech elements.', prompt: 'A wide architectural abstraction of a modern corporate tech headquarters, vast empty space on the left for profile picture overlay, subtle glowing neon blue lines intersecting dark obsidian glass panels, deep depth of field, professional corporate atmosphere, minimalist, high contrast lighting, 8k resolution, photorealistic --ar 4:1 --style raw --v 6.0', models: ['MJ', 'DE'] },
    { platform: 'Email', type: 'Header', platformColor: '#8083ff', platformBg: 'rgba(128, 131, 255, 0.1)', dimensions: '600×200', title: 'Product Launch Teaser', description: 'Dark mood, high-contrast spotlighting for new feature announcements.', prompt: 'Macro photography of an unidentifiable sleek black technological device partially hidden in dark shadows, illuminated by a single intense laser-thin stripe of warm orange light cutting across the surface, dust particles in the light beam, mysterious product reveal, premium industrial design, highly detailed, 8k, dramatic cinematic lighting --ar 3:1 --v 6.0', models: ['MJ'] },
    { platform: 'Instagram', type: 'Square Post', platformColor: '#E1306C', platformBg: 'rgba(225, 48, 108, 0.1)', dimensions: '1080×1080', title: 'Data Visualization Art', description: 'Engaging, colorful abstract data representation for social engagement.', prompt: 'A beautiful abstract 3D rendering representing big data analytics, thousands of tiny glowing glass spheres connected by luminous fiber optic threads in colors of electric purple and cyan, floating in a dark void, shallow depth of field, macro lens, octane render, trendy corporate art, highly engaging visual texture --ar 1:1 --stylize 250 --v 6.0', models: ['MJ', 'DE'] },
  ];

  const displayPrompts = Array.isArray(prompts) && prompts.length > 0 ? prompts : defaultPrompts;
  const paletteToClass = (color: string) => {
    const normalized = color.toLowerCase();
    if (normalized.includes('#0a192f') || normalized.includes('deep navy')) return { accent: '#0A192F' };
    if (normalized.includes('#0066ff') || normalized.includes('electric blue')) return { accent: '#0066FF' };
    if (normalized.includes('#e0e0e0') || normalized.includes('cool silver')) return { accent: '#E0E0E0' };
    if (normalized.includes('#ffffff') || normalized.includes('pure white')) return { accent: '#FFFFFF' };
    return { accent: '#8B8B9E' };
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-2xl border border-[#2A2A38] bg-[#111118] p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
              <Palette size={20} />
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Image Prompts</h1>
          </div>
          <p className="text-sm md:text-base max-w-2xl" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{hasRealData ? 'AI-generated image prompts for marketing platforms' : 'High-fidelity generative AI prompts specifically engineered for marketing platforms. Optimized for Midjourney v6 and DALL-E 3.'}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="bg-transparent border border-[#2A2A38] px-4 py-2 rounded flex items-center gap-2 transition-colors hover:bg-[#1A1A24] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <Filter size={16} />Filter
          </button>
          <button className="bg-[#6366F1] px-4 py-2 rounded flex items-center gap-2 transition-opacity hover:opacity-90 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <Sparkles size={16} />Generate New
          </button>
        </div>
      </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            No image prompt data available yet. This will be populated after AI image agent completes work.
          </p>
        </div>
      )}

      {/* Visual Direction */}
      {visualDirection.overall_style && (
        <div className="bg-gradient-to-r from-[#6366F1]/10 to-transparent border-l-4 border-[#6366F1] rounded-xl p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
            <MonitorUp size={18} className="text-[#6366F1]" />
            Visual Direction
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 min-h-[110px]">
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Overall Style</span>
              <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{visualDirection.overall_style}</p>
            </div>
            {visualDirection.mood && (
              <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 min-h-[110px]">
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Mood</span>
                <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{visualDirection.mood}</p>
              </div>
            )}
            {visualDirection.color_palette && (
              <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 min-h-[110px]">
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Color Palette</span>
                <div className="flex flex-wrap gap-2">
                  {visualDirection.color_palette.map((color: string, idx: number) => {
                    const style = paletteToClass(color);
                    return (
                      <span key={idx} className="px-2 py-1 rounded text-xs border flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#1A1A24', color: '#F1F1F3', borderColor: '#2A2A38' }}>
                        <span className="w-3 h-3 rounded" style={{ backgroundColor: style.accent, border: '1px solid rgba(255,255,255,0.2)' }} />
                        {color}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {visualDirection.key_visual_themes && (
              <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 min-h-[110px]">
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Visual Themes</span>
                <div className="flex flex-wrap gap-2">
                  {visualDirection.key_visual_themes.slice(0, 3).map((theme: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayPrompts.slice(0, 4).map((card: any, idx: number) => (
          <article key={idx} className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col group relative overflow-hidden min-h-[340px]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-xs flex items-center border" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: card.platformBg || 'rgba(99,102,241,0.1)', color: card.platformColor || '#6366F1', borderColor: `${card.platformColor || '#6366F1'}33` }}>
                  <span className="w-1.5 h-1.5 rounded-full mr-1.5" style={{ backgroundColor: card.platformColor || '#6366F1' }} />
                  {card.platform || card.deliverable_name || card.channel || 'Platform'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{card.type || 'Image'}</span>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-[#1b1b20]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>Prompt {idx + 1}</span>
            </div>
            <h3 className="text-base md:text-lg font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{card.deliverable_name || card.title || card.name || 'Image Prompt'}</h3>
            {card.description && (
              <p className="text-sm mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{card.description}</p>
            )}
            {card.rationale && (
              <p className="text-sm mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{card.rationale}</p>
            )}
            
            {/* Visual Elements */}
            {card.visual_elements?.length > 0 && (
              <div className="mb-3">
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Visual Elements</span>
                <div className="flex flex-wrap gap-2">
                  {card.visual_elements.slice(0, 4).map((el: string, eidx: number) => (
                    <span key={eidx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                      {el}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Style Keywords */}
            {card.style_keywords?.length > 0 && (
              <div className="mb-3">
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Style Keywords</span>
                <div className="flex flex-wrap gap-2">
                  {card.style_keywords.slice(0, 3).map((kw: string, kidx: number) => (
                    <span key={kidx} className="px-2 py-1 rounded bg-[#6366F1]/10 border border-[#6366F1]/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-3 mb-4 flex-grow relative min-h-[180px]">
              <div className="absolute top-2 right-2 flex gap-1">
                <button aria-label="Copy prompt" className="text-[#A0A0D2] hover:text-[#6366F1] transition-colors p-1 bg-[#111118] rounded"><Copy size={14} /></button>
              </div>
              <p className="text-xs leading-relaxed h-24 overflow-y-auto pr-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{card.prompt || card.text || 'No prompt available'}</p>
            </div>
            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="flex -space-x-2">
                {(card.models || ['AI']).map((model: string, midx: number) => (
                  <div key={midx} className="w-6 h-6 rounded-full bg-[#35343a] border border-[#2A2A38] flex items-center justify-center text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{model}</div>
                ))}
              </div>
              <button className="text-xs flex items-center gap-1 transition-colors hover:text-[#c0c1ff]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
                Send to Studio<ArrowRight size={12} />
              </button>
            </div>
          </article>
        ))}
        <article className="border border-dashed border-[#2A2A38] hover:border-[#464554] bg-transparent rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group min-h-[320px]">
          <div className="w-12 h-12 rounded-full bg-[#1f1f25] flex items-center justify-center text-[#8B8B9E] group-hover:text-[#6366F1] group-hover:bg-[rgba(99,102,241,0.1)] transition-colors mb-4">
            <Plus size={24} />
          </div>
          <h3 className="text-base md:text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Create Custom Prompt</h3>
          <p className="text-sm max-w-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Use the AI Prompt Engineer to generate specialized image prompts for specific campaigns or platforms.</p>
        </article>
      </div>
    </div>
  );
};

export default VisualsContent;
