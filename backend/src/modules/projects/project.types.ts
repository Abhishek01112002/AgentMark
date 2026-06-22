export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectWithCampaigns extends ProjectResponse {
  campaigns: CampaignSummary[];
}

export interface ProjectListItem extends ProjectResponse {
  _count: {
    campaigns: number;
  };
}

interface CampaignSummary {
  id: string;
  name: string;
  status: string;
  createdAt: Date;
}
