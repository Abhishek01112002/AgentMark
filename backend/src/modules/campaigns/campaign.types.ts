export interface CreateCampaignRequest {
  projectId: string;
  name: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
}

export interface CampaignResponse {
  id: string;
  name: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  status: string;
  projectId: string;
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
