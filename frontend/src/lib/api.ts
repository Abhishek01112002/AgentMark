const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface FetchOptions extends RequestInit {
  token?: string;
}

export const api = async <T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> => {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...rest,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong');
  }

  return data;
};

export const getAuthUrl = () => `${API_URL}/api/auth`;
export const getCampaignsUrl = () => `${API_URL}/api/campaigns`;
export const getResearchUrl = () => `${API_URL}/api/research`;
