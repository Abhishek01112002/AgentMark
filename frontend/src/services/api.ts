import axios from 'axios';
import { llmSettingsService } from './llm-settings.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 10000,
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
    if (hasKeys) {
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
