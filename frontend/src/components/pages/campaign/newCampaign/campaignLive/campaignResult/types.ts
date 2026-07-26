import { LucideIcon } from 'lucide-react';

export type TabId = 'overview' | 'research' | 'strategy' | 'copy' | 'images' | 'review' | 'published' | 'focus-group';

export interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
  brandName?: string;
  brand_name?: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  projectId: string;
  aiOutputs?: any;
  aiError?: string | null;
  reviewScore?: number | null;
  reviewOutput?: any;
  researchRevisionCount?: number;
  strategyRevisionCount?: number;
  copyRevisionCount?: number;
  imageRevisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RevisionCounts {
  research: number;
  strategy: number;
  copywriter: number;
  image_prompt: number;
}

export interface AgentScores {
  research: number | null;
  strategy: number | null;
  copywriter: number | null;
  image_prompt: number | null;
}

export interface ReviewerNotes {
  feedback: string;
  issues: string[];
}

export type DrawerTab = 'scores' | 'inspect' | 'revise';

export interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}
