export type LlmProviderId = 'gemini' | 'groq' | 'openai';

export interface LlmProviderState {
  key: string;
}

export interface LlmSettingsState {
  gemini: LlmProviderState;
  groq: LlmProviderState;
  openai: LlmProviderState;
}

const STORAGE_KEY = 'agentmark_llm_config';

const defaultProvider = (): LlmProviderState => ({
  key: '',
});

export const llmSettingsService = {
  get(): LlmSettingsState {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as LlmSettingsState;
      } catch {
        // fall through to defaults
      }
    }

    return this.normalize({
      gemini: defaultProvider(),
      groq: defaultProvider(),
      openai: defaultProvider(),
    });
  },

  save(state: LlmSettingsState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.normalize(state)));
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },

  toHeaderPayload(state: LlmSettingsState) {
    return {
      gemini_api_key: state.gemini.key || null,
      groq_api_key: state.groq.key || null,
      openai_api_key: state.openai.key || null,
    };
  },

  normalize(state: LlmSettingsState): LlmSettingsState {
    return {
      gemini: {
        ...defaultProvider(),
        ...state.gemini,
      },
      groq: {
        ...defaultProvider(),
        ...state.groq,
      },
      openai: {
        ...defaultProvider(),
        ...state.openai,
      },
    };
  },

  getPreferredProvider(state: LlmSettingsState): LlmProviderId | null {
    const order: LlmProviderId[] = ['gemini', 'groq', 'openai'];
    return order.find((id) => state[id].key.trim()) || null;
  },
};
