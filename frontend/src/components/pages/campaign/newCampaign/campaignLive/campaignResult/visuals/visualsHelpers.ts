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
    // ── LAYER 1: FROZEN MOMENT — Subject + Micro-Action (most critical) ──
    {
      label: 'Specific subject defined',
      checkKey: 'subject',
      passed: /\b(\d{2}.?year.?old|woman|man|person|girl|boy|lady|gentleman|model|figure|character|cmo|ceo|cto|founder|advisor|manager|engineer|designer|director|chef|nurse|doctor|teacher|student|athlete|artist|photographer|developer|marketer|consultant|entrepreneur|professional)\b/i.test(p),
      points: 10,
    },
    {
      label: 'Frozen moment or action',
      checkKey: 'action',
      passed: /\b(at the (exact |precise )?((micro.?)?second|moment|instant)|caught (at|in)|leans? (forward|back|across|in)|reaches?|shifts?|turns?|lifts?|pushes?|pulls?|grips?|touches?|points?|hovers?|pauses?|freezes?|gazes?|glances?|squints?|furrows?|smiles?|grins?|frowns?|stands?|sits?|walks?|runs?|holds?|carries?|wears?|faces?|poses?|works?|reads?|writes?|types?|scrolls?|sips?|drinks?|eats?|laughs?|speaks?|whispers?|nods?|shakes?|crosses?|folds?|rests?|relaxes?|stretches?|bends?|kneels?|crouches?)\b/i.test(p),
      points: 9,
    },
    {
      label: 'Emotional state visible',
      checkKey: 'emotion',
      passed: /\b(confidence|satisfaction|triumph|determination|relief|tension|joy|calm|surprise|wonder|focus|concentration|warmth|pride|doubt|resolve|curiosity|delight|amusement|contemplation|exhaustion|anticipation|serene|dramatic|empowering|aspirational|nostalgic|authentic|inspiring|mysterious|luxurious|sophisticated|playful|energetic|confident|expression|face reveals?|eyes? (widen|narrow|soften|brighten|light up)|brow|posture|body language)\b/i.test(p),
      points: 7,
    },
    // ── LAYER 2: ENVIRONMENT ──────────────────────────────────────
    {
      label: 'Environment or setting',
      checkKey: 'environment',
      passed: /\b(office|studio|room|kitchen|street|city|skyline|window|desk|table|chair|couch|bed|garden|park|beach|mountain|forest|warehouse|loft|penthouse|balcony|corridor|lobby|boardroom|conference|cafe|restaurant|bar|rooftop|sidewalk|alley|bridge|market|shop|store|library|gym|classroom|laboratory|hospital|clinic|workspace|workstation|apartment|home|porch|patio|doorway|staircase|elevator|stage|gallery|museum|courthouse|temple|church|campus|field|meadow|riverbank|lakeside|waterfront|harbor|airport|station|floor.to.ceiling|corner office|open.plan|coworking|background|backdrop|setting|interior|exterior|environment|scene)\b/i.test(p),
      points: 8,
    },
    // ── LAYER 3: ATMOSPHERIC TEXTURE ──────────────────────────────
    {
      label: 'Atmospheric or sensory detail',
      checkKey: 'atmosphere',
      passed: /\b(dust motes?|haze|fog|mist|steam|smoke|rain|snow|wind|condensation|dew|frost|humidity|warmth|chill|glow|shimmer|reflection|refraction|diffus(ed|ing)|scatter(ed|ing)|particles?|atmosphere|atmospheric|ambient|air|breeze|draft|current|rustl(e|ing)|murmur|hum|buzz|silence|stillness|fragrance|aroma|scent|texture of (light|air|space))\b/i.test(p),
      points: 6,
    },
    // ── LAYER 4: SURFACE & MATERIAL ──────────────────────────────
    {
      label: 'Material or surface texture',
      checkKey: 'material',
      passed: /\b(leather|marble|wood|walnut|oak|mahogany|teak|bamboo|glass|metal|steel|brass|copper|gold|silver|chrome|aluminum|concrete|stone|granite|slate|brick|ceramic|porcelain|fabric|cotton|linen|silk|satin|velvet|cashmere|wool|denim|suede|canvas|paper|cardboard|plastic|acrylic|rubber|foam|cork|ivory|bone|crystal|diamond|pearl|lacquer|enamel|matte|glossy|brushed|polished|weathered|worn|aged|distressed|patina|rustic|raw|smooth|rough|textured|crisp|soft|plush|supple|coarse|fine|grain(ed)?|woven|knit(ted)?)\b/i.test(p),
      points: 6,
    },
    // ── LAYER 5: LIGHTING DESIGN ─────────────────────────────────
    {
      label: 'Lighting design specified',
      checkKey: 'lighting',
      passed: /\b(key light|fill light|rim light|back ?light|edge light|hair light|practical light|bounce light|spill|falloff|shadow|shadows|rembrandt|split light|butterfly light|loop light|broad light|short light|chiaroscuro|high.key|low.key|diffused|soft ?box|beauty dish|reflector|flag|scrim|barn doors?|tungsten|daylight|fluorescent|neon|led|candlelight|firelight|moonlight|starlight|sunlight|golden hour|magic hour|blue hour|overcast|dappled|spotlight|flood|ambient|volumetric|god ?rays|light(ing|ed|s)?|illuminat(ed|ion)|glow(ing|s)?|bright|dim|dark|warm light|cool light|color temperature|2700k|3200k|4000k|5600k|6500k)\b/i.test(p),
      points: 9,
    },
    // ── LAYER 6: LENS PHYSICS & PERSPECTIVE ───────────────────────
    {
      label: 'Lens perspective or depth',
      checkKey: 'lens',
      passed: /\b(depth of field|shallow (depth|focus)|deep focus|bokeh|telephoto|wide.?angle|macro|fisheye|tilt.?shift|perspective|compression|distortion|focal (length|point|plane)|aperture|f\/?[\d.]+|\d+mm|close.?up|medium (shot|close)|long shot|extreme close|full (body|frame)|half (body|length)|portrait (orientation|format)|landscape (format|orientation)|rule of thirds|centered|symmetr(ical|y)|foreground|midground|background|three (depth )?planes|framing|crop(ped|ping)?|aspect ratio|wide (shot|establish)|eye.?level|low angle|high angle|dutch angle|bird.?s?.?eye|worm.?s?.?eye|overhead|drone|aerial|pov|point of view)\b/i.test(p),
      points: 8,
    },
    // ── LAYER 7: COLOR SCIENCE ───────────────────────────────────
    {
      label: 'Color palette or grade',
      checkKey: 'color',
      passed: /\b(color (palette|grade|grading|science|cast|shift|temperature|theory|harmony)|warm tones?|cool tones?|monochrome|desaturat(ed|ion)|saturat(ed|ion)|vivid|muted|pastel|neon|earth tones?|jewel tones?|neutral(s)?|complementary|analogous|triadic|split.complement|high contrast|low contrast|tonal (range|depth|variation)|midtones?|highlights?|shadow(s)?|blacks?|whites?|lifted blacks|crushed blacks|cross.process|teal|amber|navy|burgundy|emerald|cobalt|indigo|coral|crimson|charcoal|ivory|slate|olive|ochre|sienna|umber|cyan|magenta|#[0-9a-f]{3,6})\b/i.test(p),
      points: 7,
    },
    // ── LAYER 8: COMPOSITION & NEGATIVE SPACE ─────────────────────
    {
      label: 'Composition intent',
      checkKey: 'composition',
      passed: /\b(negative space|clean space|breathing room|text overlay|headline (space|area)|copy (space|area)|left.third|right.third|upper.third|lower.third|center(ed)?|frame|composition|visual hierarchy|eye.?path|leading lines|golden ratio|diagonal|horizontal|vertical|balance|asymmetr(y|ical)|dynamic|static|minimal(ist)?|dense|layered|stacked|grid|organic|geometric|flowing|angular|curved|circular|radial|spiral)\b/i.test(p),
      points: 6,
    },
    // ── LAYER 9: QUALITY ANCHORS ──────────────────────────────────
    {
      label: 'Quality or style anchors',
      checkKey: 'quality',
      passed: /\b(8k|4k|uhd|masterpiece|best quality|ultra.?detail(ed)?|highly detailed|intricate|hyper.?realistic|photorealistic|high resolution|sharp focus|crisp|lifelike|advertising photography|commercial (campaign|aesthetic|production|quality)|award.?winning|cannes|editorial|magazine quality|professional (production|studio|quality)|campaign.?hero|production.?value|gallery.?quality|museum.?quality|cinema(tic)?|film(ic)?|fine art)\b/i.test(p),
      points: 6,
    },
    // ── LAYER 10: SAFETY TAIL ────────────────────────────────────
    {
      label: 'Safety tail (no text/logos)',
      checkKey: 'safety',
      passed: /\bno (text|words|letters|logos?|watermarks?|labels?|typography|captions?|signatures?|stamps?)\b/i.test(p),
      points: 5,
    },
    // ── DEPTH & RICHNESS BONUSES ──────────────────────────────────
    {
      label: 'Rich detail (≥ 80 words)',
      checkKey: 'length',
      passed: wordCount >= 80,
      points: 7,
    },
    {
      label: 'Cinematic depth (≥ 120 words)',
      checkKey: 'depth',
      passed: wordCount >= 120,
      points: 6,
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
