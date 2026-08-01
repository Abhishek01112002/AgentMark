import { Campaign } from '../types';

export interface NormalizedFocusGroupReport {
  overall_score: number;
  persona_critiques: any[];
  actionable_recommendations: any[];
  personas?: any[];
  gated_readiness?: any;
  devils_advocate_issues?: any[];
  decision_explanation?: any;
  trust_signal_analysis?: any;
  telemetry?: any;
  memory_summary?: any;
}

export interface NormalizedReviewOutput {
  overall_score?: number;
  agent_scores?: {
    research: number | null;
    strategy: number | null;
    copywriter: number | null;
    creative_hook_matrix?: number | null;
    image_prompt: number | null;
  };
  executive_summary?: string;
  critical_gaps?: string[];
  recommendations?: string[];
  feedback?: string;
}

export interface NormalizedCreativeHookMatrix {
  hooks: any[];
  archetypes_generated?: string[];
  evaluation_config?: Record<string, any>;
  revision?: number;
  generated_at?: string;
  status?: string;
  metadata?: Record<string, any>;
  revisions?: any[];
}

export interface NormalizedCampaign {
  id: string;
  name: string;
  status: string;
  brandName: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  projectId: string;
  aiError?: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Normalized Business Entities
  manager: any | null;
  research: any | null;
  strategy: any | null;
  copy: any | null;
  copyVariants: Record<string, any[]>;
  creativeHooks: NormalizedCreativeHookMatrix | null;
  visuals: any | null;
  review: NormalizedReviewOutput | null;
  publisher: any | null;
  focusGroup: NormalizedFocusGroupReport | null;
  focusGroupOutputs: Record<string, NormalizedFocusGroupReport>;
  focusGroupOutputHash: string | null;
  
  // Normalized Revision & Metric Metadata
  reviewScore: number | null;
  revisionCounts: {
    research: number;
    strategy: number;
    copywriter: number;
    creative_hook_matrix: number;
    image_prompt: number;
  };
  
  // Monotonic Version Counter for Reconciliation
  version: number;
  
  // Retain reference to raw DB object if legacy properties needed
  _raw: Campaign;
}
