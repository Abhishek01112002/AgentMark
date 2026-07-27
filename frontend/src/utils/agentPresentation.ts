export interface AgentPresentationMeta {
  label: string;
  description?: string;
}

export const AGENT_PRESENTATION_MAP: Record<string, AgentPresentationMeta> = {
  copywriter: {
    label: 'Ad Copy',
    description: 'Generates promotional copy variants across multiple angles',
  },
  creative_hook_matrix: {
    label: 'Creative Hooks',
    description: 'Creates psychological hooks tailored to target audience segments',
  },
  image_prompt: {
    label: 'Image Prompts',
    description: 'Crafts visual generation prompts for creative assets',
  },
  research: {
    label: 'Audience Research',
    description: 'Analyzes target audience pain points and positioning',
  },
  strategy: {
    label: 'Campaign Strategy',
    description: 'Establishes core messaging framework and angle distribution',
  },
  reviewer: {
    label: 'AI Quality Review',
    description: 'Evaluates content alignment with brand guidelines and constraints',
  },
};

function humanizeKey(key: string): string {
  if (!key) return '';
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getAgentPresentation(key: string): AgentPresentationMeta {
  if (AGENT_PRESENTATION_MAP[key]) {
    return AGENT_PRESENTATION_MAP[key];
  }
  return {
    label: humanizeKey(key),
  };
}

export function getAgentLabel(key: string): string {
  return getAgentPresentation(key).label;
}
