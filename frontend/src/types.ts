export type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  createdAt?: string;
};

export type AuthResponse = {
  message: string;
  data: {
    user: User;
    token: string;
  };
};

export type Campaign = {
  id: string;
  name: string;
  brandName?: string | null;
  industry?: string | null;
  goal?: string | null;
  targetAudience?: string | null;
  brandVoice: string;
  status: string;
  score?: number | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  agents: Agent[];
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

