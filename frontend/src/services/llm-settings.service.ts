export type LlmProviderId = 'gemini' | 'groq' | 'openai' | 'tavily';

export interface LlmKeyEntry {
  value: string;
  label?: string;
}

export interface LlmProviderState {
  keys: LlmKeyEntry[];
}

export interface LlmSettingsState {
  gemini: LlmProviderState;
  groq: LlmProviderState;
  openai: LlmProviderState;
  tavily: LlmProviderState;
  providerOrder: LlmProviderId[];
}

// ── Storage key helpers ──────────────────────────────────────────────────────
// Keys are scoped per-user so that switching accounts never leaks API keys
// from one user's session into another's.
const LEGACY_STORAGE_KEY = 'agentmark_llm_config';

function getStorageKey(userId?: string | null): string {
  return userId ? `agentmark_llm_config_${userId}` : LEGACY_STORAGE_KEY;
}

const defaultProvider = (): LlmProviderState => ({
  keys: [],
});

export const KEY_PATTERNS: Record<LlmProviderId, RegExp> = {
  gemini: /^(AIza|AQ\.)[0-9A-Za-z_-]{30,}$/,
  groq: /^gsk_[0-9A-Za-z_-]{40,}$/,
  openai: /^sk-[0-9A-Za-z]{32,}$/,
  tavily: /^tvly-[A-Za-z0-9_-]+$/,
};

export const PROVIDER_RPM: Record<LlmProviderId, number> = {
  gemini: 15,
  groq: 30,
  openai: 200,
  tavily: 100,
};

const DEFAULT_ORDER: LlmProviderId[] = ['openai', 'gemini', 'groq', 'tavily'];

export function validateKey(id: LlmProviderId, value: string): boolean {
  if (!value || !value.trim()) return false;
  const pattern = KEY_PATTERNS[id];
  if (!pattern) return false;
  return pattern.test(value.trim());
}

export function formatKeyPreview(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 12) return trimmed;
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`;
}

export function estimateTotalRpm(state: LlmSettingsState): number {
  let total = 0;
  for (const id of state.providerOrder) {
    const count = state[id].keys.filter((k) => validateKey(id, k.value)).length;
    total += count * (PROVIDER_RPM[id] || 15);
  }
  return total;
}

function fromLegacyFormat(raw: Record<string, unknown>): LlmSettingsState {
  const state: LlmSettingsState = {
    gemini: defaultProvider(),
    groq: defaultProvider(),
    openai: defaultProvider(),
    tavily: defaultProvider(),
    providerOrder: [...DEFAULT_ORDER],
  };

  for (const id of DEFAULT_ORDER) {
    const entry = raw[id];
    if (entry && typeof entry === 'object' && 'keys' in (entry as Record<string, unknown>)) {
      state[id] = entry as LlmProviderState;
    } else if (entry && typeof entry === 'object' && 'key' in (entry as Record<string, unknown>)) {
      const oldKey = (entry as Record<string, unknown>).key as string | undefined;
      if (oldKey && oldKey.trim()) {
        const parts = oldKey.split(',').map((k) => k.trim()).filter(Boolean);
        state[id].keys = parts.map((value) => ({ value }));
      }
    }
  }

  const migrateOrder = (raw as Record<string, unknown>).providerOrder as LlmProviderId[] | undefined;
  if (migrateOrder && migrateOrder.length === DEFAULT_ORDER.length) {
    state.providerOrder = migrateOrder;
  }

  return state;
}

export const llmSettingsService = {
  get(userId?: string | null): LlmSettingsState {
    const key = getStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        return fromLegacyFormat(parsed);
      } catch {
        // fall through
      }
    }
    return this.normalize({
      gemini: defaultProvider(),
      groq: defaultProvider(),
      openai: defaultProvider(),
      tavily: defaultProvider(),
      providerOrder: [...DEFAULT_ORDER],
    });
  },

  save(state: LlmSettingsState, userId?: string | null) {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(this.normalize(state)));
  },

  clear(userId?: string | null) {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
  },

  /** Remove keys for ALL users — called on logout so the browser is pristine. */
  clearAll() {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k === LEGACY_STORAGE_KEY || k.startsWith('agentmark_llm_config_'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  },

  toHeaderPayload(state: LlmSettingsState) {
    return {
      gemini_api_key: state.gemini.keys.map((k) => k.value).join(',') || null,
      groq_api_key: state.groq.keys.map((k) => k.value).join(',') || null,
      openai_api_key: state.openai.keys.map((k) => k.value).join(',') || null,
      tavily_api_key: state.tavily.keys.map((k) => k.value).join(',') || null,
      provider_order: state.providerOrder,
    };
  },

  getPreferredProvider(state: LlmSettingsState): LlmProviderId | null {
    return state.providerOrder.find((id) => state[id].keys.some((k) => k.value.trim())) || null;
  },

  countValidKeys(state: LlmSettingsState, id: LlmProviderId): number {
    return state[id].keys.filter((k) => validateKey(id, k.value)).length;
  },

  hasValidApiKeys(state: LlmSettingsState): boolean {
    return (['gemini', 'groq', 'openai', 'tavily'] as LlmProviderId[])
      .some((provider) => this.countValidKeys(state, provider) > 0);
  },

  normalize(state: LlmSettingsState | Record<string, unknown>): LlmSettingsState {
    const raw = state as Record<string, unknown>;
    const hasLegacy = DEFAULT_ORDER.some(
      (id) => raw[id] && typeof raw[id] === 'object' && 'key' in (raw[id] as Record<string, unknown>),
    );
    if (hasLegacy) {
      return fromLegacyFormat(raw);
    }
    const s = state as LlmSettingsState;
    return {
      gemini: {
        keys: s.gemini?.keys?.filter((k) => k.value.trim()) || [],
      },
      groq: {
        keys: s.groq?.keys?.filter((k) => k.value.trim()) || [],
      },
      openai: {
        keys: s.openai?.keys?.filter((k) => k.value.trim()) || [],
      },
      tavily: {
        keys: s.tavily?.keys?.filter((k) => k.value.trim()) || [],
      },
      providerOrder: (() => {
        const order = s.providerOrder?.length ? [...s.providerOrder] : [...DEFAULT_ORDER];
        // Ensure all default providers are present; append missing ones at the end
        const missing = DEFAULT_ORDER.filter((id) => !order.includes(id));
        return [...order, ...missing];
      })(),
    };
  },
};
