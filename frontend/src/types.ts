export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  data: {
    user: User;
    token: string;
  };
};

export type AIAgentOutputs = {
  manager_output?: any;
  research_output?: any;
  strategy_output?: any;
  copy_output?: any;
  image_output?: any;
  review_output?: any;
  publisher_output?: any;
};

export type Campaign = {
  id: string;
  name: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  status: string;
  projectId: string;
  aiCampaignId?: string | null;
  aiOutputs?: AIAgentOutputs | null;
  aiError?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  name: string;
  type: string;
  status: string;
  output?: string | null;
  duration?: number | null;
  order: number;
};
