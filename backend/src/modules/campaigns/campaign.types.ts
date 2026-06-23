export interface CreateCampaignRequest {
  projectId: string;
  name: string;
  brandName?: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
}

export interface AIAgentOutputs {
  manager_output?: any;
  research_output?: any;
  strategy_output?: any;
  copy_output?: any;
  image_output?: any;
  review_output?: any;
  review_agent?: { score?: string | number };
  publisher_output?: any;
}

export interface CampaignResponse {
  id: string;
  name: string;
  brandName?: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  status: string;
  projectId: string;
  aiCampaignId?: string | null;
  aiOutputs?: AIAgentOutputs | null;
  aiError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignListItem extends CampaignResponse {}

export interface CampaignWithProject extends CampaignResponse {
  project: {
    id: string;
    name: string;
  };
}
