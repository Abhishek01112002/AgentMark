import axios from 'axios';
import { llmSettingsService } from './llm-settings.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const llmConfigRaw = localStorage.getItem('agentmark_llm_config');
    if (llmConfigRaw) {
      try {
        const llmConfig = llmSettingsService.normalize(JSON.parse(llmConfigRaw));
        config.headers['x-llm-config'] = JSON.stringify(llmSettingsService.toHeaderPayload(llmConfig));
      } catch {
        // ignore malformed local storage and continue without provider config
      }
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
