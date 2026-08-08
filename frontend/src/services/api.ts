import axios from 'axios';
import { llmSettingsService } from './llm-settings.service';

const getBackendApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.hostname}:5003`;
  }
  return 'http://localhost:5003';
};

const API_URL = getBackendApiUrl();

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000, // 120s timeout to support long-running LLM generation tasks
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and user-scoped LLM config
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Scope LLM config to the currently logged-in user so keys from
    // a previous account's session never bleed into a new account.
    const storedUser = localStorage.getItem('user');
    const userId = storedUser ? (() => { try { return JSON.parse(storedUser)?.id as string | undefined; } catch { return undefined; } })() : undefined;

    const llmConfig = llmSettingsService.get(userId);
    const payload = llmSettingsService.toHeaderPayload(llmConfig);
    const hasKeys = Object.values(payload).some((v) => v && v !== null);
    // Only attach LLM config to requests that actually invoke AI models.
    // Sending API keys on GETs, notification polls, project fetches, etc.
    // unnecessarily exposes them in access logs, proxies, and error-tracking breadcrumbs.
    const requestUrl = config.url ?? '';
    const needsLlmConfig =
      hasKeys &&
      (requestUrl.includes('/campaigns') || requestUrl.includes('/focus-group')) &&
      (config.method === 'post' || config.method === 'put');
    if (needsLlmConfig) {
      config.headers['x-llm-config'] = JSON.stringify(payload);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      error.message = 'The AI request timed out. The operation may still be completing in the background.';
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      const pathname = window.location.pathname;
      if (pathname !== '/login' && pathname !== '/signup') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const isEmosBrandVaultEnabled = (): boolean => {
  return import.meta.env.VITE_EMOS_BRAND_VAULT_ENABLED === 'true';
};

export const brandVaultApi = {
  appendEvent: async (projectId: string, eventType: string, attributeKey: string, newVal: string, previousVal?: string) => {
    if (!isEmosBrandVaultEnabled()) return null;
    const response = await api.post(`/brand-vault/events`, {
      projectId,
      eventType,
      attributeKey,
      newVal,
      previousVal,
    });
    return response.data;
  },

  createSnapshot: async (projectId: string) => {
    if (!isEmosBrandVaultEnabled()) return null;
    const response = await api.post(`/brand-vault/snapshots`, { projectId });
    return response.data;
  },

  getContextContract: async (params: Record<string, string>) => {
    if (!isEmosBrandVaultEnabled()) return null;
    const response = await api.get(`/brand-vault/context-contract`, { params });
    return response.data;
  },
};

