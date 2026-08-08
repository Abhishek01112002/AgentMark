import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from './api';
import { llmSettingsService } from './llm-settings.service';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

vi.mock('./llm-settings.service', () => ({
  llmSettingsService: {
    get: vi.fn(),
    toHeaderPayload: vi.fn()
  }
}));

describe('api.ts interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('request interceptor', () => {
    it('should add Authorization header if token exists', async () => {
      localStorageMock.setItem('token', 'test-token');
      // @ts-ignore
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({});

      const config = { headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers.Authorization).toBe('Bearer test-token');
    });

    it('should NOT add x-llm-config header for GET requests', async () => {
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({ openai: 'key' } as any);

      const config = { method: 'get', url: '/campaigns/123', headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers['x-llm-config']).toBeUndefined();
    });

    it('should add x-llm-config header for POST /campaigns requests', async () => {
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({ openai: 'key' } as any);

      const config = { method: 'post', url: '/campaigns/123/approve', headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers['x-llm-config']).toBe('{"openai":"key"}');
    });

    it('should add x-llm-config header for PUT /campaigns requests', async () => {
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({ openai: 'key' } as any);

      const config = { method: 'put', url: '/campaigns/123', headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers['x-llm-config']).toBe('{"openai":"key"}');
    });
    
    it('should NOT add x-llm-config header if no keys are present', async () => {
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({ openai: null } as any);

      const config = { method: 'post', url: '/campaigns/123/approve', headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers['x-llm-config']).toBeUndefined();
    });

    it('should NOT add x-llm-config header for POST to other endpoints', async () => {
      vi.mocked(llmSettingsService.toHeaderPayload).mockReturnValue({ openai: 'key' } as any);

      const config = { method: 'post', url: '/projects/123', headers: {} } as any;
      // @ts-ignore
      const result = await api.interceptors.request.handlers[0].fulfilled(config);

      expect(result.headers['x-llm-config']).toBeUndefined();
    });
  });
});
