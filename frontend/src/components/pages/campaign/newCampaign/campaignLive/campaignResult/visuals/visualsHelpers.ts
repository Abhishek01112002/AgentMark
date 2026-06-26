import api from '../../../../../../../services/api';

export interface PlatformConfig {
  accent: string;
  label: string;
  bgAccent: string;
  borderColor: string;
}

export const PLATFORM_CONFIG: Record<string, PlatformConfig> = {
  instagram: { accent: '#E1306C', label: 'Instagram', bgAccent: 'rgba(225, 48, 108, 0.1)', borderColor: 'rgba(225, 48, 108, 0.2)' },
  linkedin:  { accent: '#0077B5', label: 'LinkedIn', bgAccent: 'rgba(0, 119, 181, 0.1)', borderColor: 'rgba(0, 119, 181, 0.2)' },
  youtube:   { accent: '#FF0000', label: 'YouTube', bgAccent: 'rgba(255, 0, 0, 0.1)', borderColor: 'rgba(255, 0, 0, 0.2)' },
  email:     { accent: '#10B981', label: 'Email', bgAccent: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  general:   { accent: '#6366F1', label: 'General', bgAccent: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)' },
};

export const detectPlatform = (deliverableName: string): string => {
  const name = (deliverableName || '').toLowerCase();
  if (name.includes('instagram')) return 'instagram';
  if (name.includes('linkedin')) return 'linkedin';
  if (name.includes('youtube')) return 'youtube';
  if (name.includes('email')) return 'email';
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

// Prompt Quality Scorer
export interface CheckItem {
  label: string;
  passed: boolean;
  points: number;
  checkKey: string;
}

export const scorePrompt = (prompt: string): { score: number; checks: CheckItem[] } => {
  const p = (prompt || '').toLowerCase();
  const checks: CheckItem[] = [
    {
      label: 'Strong lighting',
      checkKey: 'lighting',
      passed: /\b(light|lighting|rim|shadow|glow)\b/i.test(p),
      points: 15
    },
    {
      label: 'Subject defined',
      checkKey: 'subject',
      passed: /\b(person|model|product|subject)\b/i.test(p),
      points: 20
    },
    {
      label: 'Background detail',
      checkKey: 'background',
      passed: /\b(background|backdrop|setting|scene)\b/i.test(p),
      points: 15
    },
    {
      label: 'Camera specification',
      checkKey: 'camera',
      passed: /\b(mm|lens|shot on|35mm|85mm)\b/i.test(p),
      points: 15
    },
    {
      label: 'Style direction',
      checkKey: 'mood',
      passed: /\b(editorial|cinematic|luxury|bold)\b/i.test(p),
      points: 15
    },
    {
      label: 'Negative prompt phrases',
      checkKey: 'negative',
      passed: /no text|no words|no logo/i.test(p),
      points: 10
    },
    {
      label: 'Prompt length > 50 words',
      checkKey: 'length',
      passed: p.trim().split(/\s+/).filter(Boolean).length > 50,
      points: 10
    }
  ];

  let score = 0;
  checks.forEach(c => {
    if (c.passed) score += c.points;
  });

  return { score, checks };
};

// Enhancement Snippets Library
export interface EnhancementSnippet {
  id: string;
  addition: string;
  label: string;
  description: string;
  fixes_check: string | null;
}

export const ENHANCEMENT_SNIPPETS: EnhancementSnippet[] = [
  {
    id: 'lens',
    addition: "Shot on 85mm f/1.4 lens",
    label: "Camera Specification",
    description: "Adds professional lens detail",
    fixes_check: 'camera'
  },
  {
    id: 'negative',
    addition: "no text, no watermark, no logo, no words",
    label: "Negative Prompt",
    description: "Removes unwanted elements",
    fixes_check: 'negative'
  },
  {
    id: 'quality',
    addition: "8K resolution, ultra detailed, sharp focus",
    label: "Quality Booster",
    description: "Adds resolution and detail keywords",
    fixes_check: null
  },
  {
    id: 'lighting',
    addition: "dramatic rim lighting, high contrast shadows",
    label: "Lighting Direction",
    description: "Adds professional lighting spec",
    fixes_check: 'lighting'
  },
  {
    id: 'mood',
    addition: "cinematic, editorial, high-fashion aesthetic",
    label: "Style Direction",
    description: "Adds mood and style keywords",
    fixes_check: 'mood'
  }
];

export const getRelevantSnippets = (checks: CheckItem[]): EnhancementSnippet[] => {
  const failedCheckKeys = checks.filter(c => !c.passed).map(c => c.checkKey);
  return ENHANCEMENT_SNIPPETS.filter(snippet => 
    snippet.fixes_check === null || failedCheckKeys.includes(snippet.fixes_check)
  ).slice(0, 3);
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

// Helper to extract hex color from strings like "Deep Navy (#0A192F)" or "electric blue #0066FF" or simply "#6366F1"
export const extractHexColor = (color: string): string => {
  if (!color) return '#6366F1';
  const match = color.match(/#[0-9a-fA-F]{6}\b/);
  if (match) return match[0];
  const matchShort = color.match(/#[0-9a-fA-F]{3}\b/);
  if (matchShort) return matchShort[0];

  const normalized = color.toLowerCase();
  if (normalized.includes('navy')) return '#0A192F';
  if (normalized.includes('blue')) return '#0077B5'; // LinkedIn Blue
  if (normalized.includes('pink') || normalized.includes('instagram')) return '#E1306C';
  if (normalized.includes('silver') || normalized.includes('gray') || normalized.includes('grey')) return '#E0E0E0';
  if (normalized.includes('white')) return '#FFFFFF';
  if (normalized.includes('black') || normalized.includes('dark')) return '#000000';
  if (normalized.includes('gold')) return '#FFD700';
  if (normalized.includes('green')) return '#10B981';
  if (normalized.includes('red') || normalized.includes('youtube')) return '#FF0000';
  if (normalized.includes('orange')) return '#F59E0B';
  if (normalized.includes('purple')) return '#8B5CF6';
  return '#6366F1';
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
