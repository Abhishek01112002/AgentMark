import api from '../../../../../../../services/api';

export interface PlatformConfig {
  accent: string;
  label: string;
  bgAccent: string;
  borderColor: string;
  icon: string;
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  instagram: { accent: '#E1306C', label: 'Instagram', bgAccent: 'rgba(225, 48, 108, 0.1)', borderColor: 'rgba(225, 48, 108, 0.2)', icon: 'Camera' },
  linkedin:  { accent: '#0077B5', label: 'LinkedIn',  bgAccent: 'rgba(0, 119, 181, 0.1)',   borderColor: 'rgba(0, 119, 181, 0.2)', icon: 'Briefcase' },
  youtube:   { accent: '#FF0000', label: 'YouTube',   bgAccent: 'rgba(255, 0, 0, 0.1)',      borderColor: 'rgba(255, 0, 0, 0.2)',   icon: 'Video' },
  email:     { accent: '#10B981', label: 'Email',     bgAccent: 'rgba(16, 185, 129, 0.1)',   borderColor: 'rgba(16, 185, 129, 0.2)', icon: 'Mail' },
  twitter:   { accent: '#1DA1F2', label: 'Twitter/X', bgAccent: 'rgba(29, 161, 242, 0.1)',   borderColor: 'rgba(29, 161, 242, 0.2)', icon: 'MessageCircle' },
  facebook:  { accent: '#1877F2', label: 'Facebook',  bgAccent: 'rgba(24, 119, 242, 0.1)',   borderColor: 'rgba(24, 119, 242, 0.2)', icon: 'Users' },
  pinterest: { accent: '#E60023', label: 'Pinterest', bgAccent: 'rgba(230, 0, 35, 0.1)',     borderColor: 'rgba(230, 0, 35, 0.2)',   icon: 'Image' },
  tiktok:    { accent: '#69C9D0', label: 'TikTok',    bgAccent: 'rgba(105, 201, 208, 0.1)',  borderColor: 'rgba(105, 201, 208, 0.2)', icon: 'Music' },
  banner:    { accent: '#F59E0B', label: 'Banner Ad', bgAccent: 'rgba(245, 158, 11, 0.1)',   borderColor: 'rgba(245, 158, 11, 0.2)', icon: 'PanelTop' },
  general:   { accent: '#6366F1', label: 'General',   bgAccent: 'rgba(99, 102, 241, 0.1)',   borderColor: 'rgba(99, 102, 241, 0.2)', icon: 'Globe' },
};


export const detectPlatform = (deliverableName: string): string => {
  const name = (deliverableName || '').toLowerCase();
  if (name.includes('instagram') || name.includes('reel') || name.includes('story') || name.includes('ig')) return 'instagram';
  if (name.includes('linkedin'))  return 'linkedin';
  if (name.includes('youtube') || name.includes('yt thumbnail') || name.includes('yt ad')) return 'youtube';
  if (name.includes('email') || name.includes('newsletter') || name.includes('edm')) return 'email';
  if (name.includes('twitter') || name.includes('tweet') || name.includes(' x ') || name.endsWith(' x')) return 'twitter';
  if (name.includes('facebook') || name.includes(' fb ')) return 'facebook';
  if (name.includes('pinterest') || name.includes('pin')) return 'pinterest';
  if (name.includes('tiktok') || name.includes('tik tok')) return 'tiktok';
  if (name.includes('banner') || name.includes('display ad') || name.includes('leaderboard')) return 'banner';
  return 'general';
};

// Safe localStorage Wrapper
export const getUsedPrompts = (): string[] => {
  try {
    const stored = localStorage.getItem("agentmark_used_prompts");
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const toggleUsedPrompt = (id: string): string[] => {
  try {
    const current = getUsedPrompts();
    const index = current.indexOf(id);
    let updated: string[];
    if (index > -1) {
      updated = current.filter(item => item !== id);
    } else {
      updated = [...current, id];
    }
    localStorage.setItem("agentmark_used_prompts", JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const getEnhancedPrompts = (campaignId?: string): Record<string, string> => {
  if (!campaignId) return {};
  try {
    const stored = localStorage.getItem(`agentmark_enhanced_${campaignId}`);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

export const saveEnhancedPrompt = (campaignId: string, cardId: string, prompt: string): void => {
  try {
    const key = `agentmark_enhanced_${campaignId}`;
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    current[cardId] = prompt;
    localStorage.setItem(key, JSON.stringify(current));
  } catch {}
};

// Prompt Quality Scorer
export interface CheckItem {
  label: string;
  passed: boolean;
  points: number;
  checkKey: string;
}

export const scorePrompt = (prompt: string): { score: number; checks: CheckItem[] } => {
  const p = (prompt || '').toLowerCase();
  const wordCount = p.trim().split(/\s+/).filter(Boolean).length;

  const checks: CheckItem[] = [
    // ── SUBJECT & CLARITY (critical) ────────────────────────────
    {
      label: 'Subject clearly defined',
      checkKey: 'subject',
      passed: /\b(person|model|woman|man|girl|boy|guy|lady|gentleman|animal|dog|cat|vehicle|car|building|landscape|product|object|character|figure|brand|logo|item|subject|shot of|photo of|image of|portraying|showcasing|displaying|featuring)\b/i.test(p),
      points: 12,
    },
    {
      label: 'Action or pose described',
      checkKey: 'action',
      passed: /\b(holding|wearing|standing|sitting|looking|running|smiling|walking|posing|facing|carrying|surrounded by|jumping|dancing|interacting|pointing|talking|speaking|reaching|laying|lying down|leaning|relaxing|working|playing|eating|drinking)\b/i.test(p),
      points: 7,
    },
    // ── TECHNICAL QUALITY ────────────────────────────────────────
    {
      label: 'Camera / lens specified',
      checkKey: 'camera',
      passed: /\b(\d+mm|shot on|dslr|mirrorless|f\/\d|bokeh|depth of field|telephoto|wide angle|macro lens|drone|gopro|polaroid|film camera|35mm|medium format|fisheye|zoom|close-up|aperture|iso|shutter speed)\b/i.test(p),
      points: 8,
    },
    {
      label: 'Resolution / detail quality',
      checkKey: 'resolution',
      passed: /\b(8k|4k|hd|uhd|1080p|masterpiece|best quality|ultra-detailed|ultra detailed|highly detailed|intricate details|hyper-realistic|photorealistic|high resolution|sharp focus|super detailed|crisp|clear|realistic|lifelike)\b/i.test(p),
      points: 6,
    },
    {
      label: 'Render engine / style tag',
      checkKey: 'render',
      passed: /\b(octane|unreal engine|redshift|v-ray|blender|ray tracing|rendered|cgi|3d render|digital art|illustration|painting|drawing|sketch|watercolor|oil painting|anime|cartoon|vector|flat design|3d|maya|zbrush|cinema 4d|concept art|matte painting|advertising photography|commercial campaign|professional studio|professional production)\b/i.test(p),
      points: 5,
    },
    // ── LIGHTING ─────────────────────────────────────────────────
    {
      label: 'Lighting direction / type',
      checkKey: 'lighting',
      passed: /\b(light|lighting|lightning|sunlight|sunburst|flare|lens flare|bouncing light|volumetric|god rays|darkness|dim|moody lighting|studio lighting|natural lighting|backlit|golden hour|soft box|neon|ambient|shadow|diffused|candlelight|overcast|illuminated|bright|glow)\b/i.test(p),
      points: 10,
    },
    // ── COMPOSITION & FRAMING ─────────────────────────────────────
    {
      label: 'Composition or framing',
      checkKey: 'composition',
      passed: /\b(close.?up|medium shot|long shot|extreme close-up|point of view|pov|symmetrical|asymmetrical|foreground|background focus|depth|panoramic|landscape format|portrait format|wide shot|overhead|top.?down|bird.?s.?eye|macro|portrait|full body|half body|low angle|high angle|dutch angle|rule of thirds|centered|side profile)\b/i.test(p),
      points: 8,
    },
    {
      label: 'Background / setting defined',
      checkKey: 'background',
      passed: /\b(background|backdrop|setting|environment|scene|interior|exterior|studio|outdoor|urban|forest|minimal|seamless|street|city|nature|beach|mountains|room|office|cafe|sky|space|water|isolated|white background|black background|transparent|solid color|pattern|texture)\b/i.test(p),
      points: 7,
    },
    // ── STYLE & MOOD ─────────────────────────────────────────────
    {
      label: 'Visual style direction',
      checkKey: 'style',
      passed: /\b(editorial|cinematic|luxury|bold|minimalist|vintage|retro|futuristic|dark|moody|vibrant|clean|elegant|gritty|high.?fashion|commercial|lifestyle|documentary|cyberpunk|steampunk|gothic|bohemian|rustic|modern|abstract|surreal|pop art|classic|traditional|minimalistic|aesthetic|dreamy|ethereal|grunge)\b/i.test(p),
      points: 9,
    },
    {
      label: 'Color palette / tone',
      checkKey: 'color',
      passed: /\b(color palette|warm tones|cool tones|monochrome|pastel|neon|earth tones|desaturated|vivid|muted|navy|gold|black and white|duotone|gradient|colorful|b&w|grayscale|sepia|vibrant colors|primary colors|complementary colors|analogous|high contrast|low contrast|bright colors|dark colors|silver|bronze|copper|metallic)\b/i.test(p),
      points: 7,
    },
    {
      label: 'Emotional tone or mood',
      checkKey: 'emotion',
      passed: /\b(luxurious|aspirational|energetic|serene|dramatic|empowering|playful|sophisticated|nostalgic|authentic|confident|inspiring|joyful|mysterious|calm|tense|happy|sad|angry|excited|peaceful|romantic|scary|creepy|funny|humorous|serious|professional|casual|inviting|welcoming|intimidating)\b/i.test(p),
      points: 6,
    },
    // ── BRAND & SAFETY ───────────────────────────────────────────
    {
      label: 'Negative / exclusion prompt',
      checkKey: 'negative',
      passed: /(?:no text|no words|no logo|no watermark|avoid|without text|without logo|do not include|exclude|minus|free from|bare|empty|--no)/i.test(p),
      points: 7,
    },
    {
      label: 'Brand or product mentioned',
      checkKey: 'brand',
      passed: /\b(brand|logo|product|packaging|label|bottle|box|container|tag|branded|merchandise|swag|apparel|shirt|mug|device|phone|laptop|screen|display|billboard|poster|flyer|brochure)\b/i.test(p),
      points: 5,
    },
    // ── DEPTH & LENGTH ───────────────────────────────────────────
    {
      label: 'Prompt length ≥ 40 words',
      checkKey: 'length',
      passed: wordCount >= 40,
      points: 5,
    },
    {
      label: 'Highly detailed (≥ 70 words)',
      checkKey: 'depth',
      passed: wordCount >= 70,
      points: 8,
    },
  ];

  const totalPossible = checks.reduce((sum, c) => sum + c.points, 0);
  let rawScore = 0;
  checks.forEach(c => { if (c.passed) rawScore += c.points; });
  const score = Math.round((rawScore / totalPossible) * 100);

  return { score, checks };
};


// Platform Readiness Checker
export interface ReadinessState {
  ready: boolean;
  issue: string | null;
}

export interface PlatformReadiness {
  dalle: ReadinessState;
  midjourney: ReadinessState;
  stable_diffusion: ReadinessState;
}

export const checkPlatformReadiness = (prompt: string): PlatformReadiness => {
  const p = (prompt || '').toLowerCase();
  const hasStyle = /\b(editorial|cinematic|luxury|bold)\b/i.test(p);
  const hasNegative = /no text|no words|no logo/i.test(p);

  return {
    dalle: {
      ready: prompt.length < 4000,
      issue: prompt.length >= 4000 ? "Prompt too long (DALL-E limit: 4000 chars)" : null
    },
    midjourney: {
      ready: hasStyle,
      issue: !hasStyle ? "Missing style keywords for Midjourney" : null
    },
    stable_diffusion: {
      ready: hasNegative,
      issue: !hasNegative ? "Negative prompt missing — crucial for SD" : null
    }
  };
};


export const enhancePromptWithAI = async (
  originalPrompt: string,
  userInstructions: string
): Promise<string> => {
  const response = await api.post('/campaigns/enhance-prompt', {
    prompt: originalPrompt,
    userInput: userInstructions || undefined,
  });
  return response.data.enhancedPrompt;
};
