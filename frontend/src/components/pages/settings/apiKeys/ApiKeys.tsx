import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../services/api';
import { notificationsService } from '../../../../services/notifications.service';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  llmSettingsService,
  LlmProviderId,
  LlmSettingsState,
  validateKey,
} from '../../../../services/llm-settings.service';

interface ProviderMeta {
  id: LlmProviderId;
  name: string;
  description: string;
  placeholder: string;
  format: string;
  docs: string;
  tag: 'essential' | 'recommended' | 'optional';
  usage: string;
}

const TAG_STYLES: Record<ProviderMeta['tag'], { label: string; bg: string; border: string; text: string }> = {
  essential: {
    label: 'ESSENTIAL',
    bg: 'bg-gradient-to-r from-[#EF4444]/15 to-[#DC2626]/5',
    border: 'border-[#EF4444]/30',
    text: 'text-[#F87171]',
  },
  recommended: {
    label: 'RECOMMENDED',
    bg: 'bg-gradient-to-r from-[#6366F1]/15 to-[#8B5CF6]/5',
    border: 'border-[#6366F1]/30',
    text: 'text-[#A5B4FC]',
  },
  optional: {
    label: 'OPTIONAL',
    bg: 'bg-gradient-to-r from-[#8B8B9E]/15 to-[#6B6B7E]/5',
    border: 'border-[#8B8B9E]/30',
    text: 'text-[#B0B0C4]',
  },
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    description: "Google's LLM. Powers all 7 campaign agents (Manager → Publisher).",
    placeholder: 'Paste your Gemini API key\u2026',
    format: 'AIza... or AQ....',
    docs: 'https://aistudio.google.com/app/apikey',
    tag: 'optional',
    usage: 'All 7 agents via SmartClient failover. Position #2 in default chain.',
  },
  {
    id: 'groq',
    name: 'Groq',
    description: 'Meta LLaMA via Groq. Fast, cheap inference for all agents.',
    placeholder: 'Paste your Groq API key\u2026',
    format: 'gsk_...',
    docs: 'https://console.groq.com',
    tag: 'optional',
    usage: 'All 7 agents. Aggressive rate limits — best as backup. Position #3.',
  },
  {
    id: 'openai',
    name: 'OpenAI / GitHub Models',
    description: 'GPT-4o / gpt-4o-mini via OpenAI API (sk-...) or free GitHub Models PAT (github_pat_... / ghp_...).',
    placeholder: 'Paste OpenAI API key (sk-...) or GitHub PAT (github_pat_...)...',
    format: 'sk-... / github_pat_... / ghp_...',
    docs: 'https://platform.openai.com',
    tag: 'recommended',
    usage: 'All 7 agents + DALL-E 3 image generation. Tried first in failover chain.',
  },
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'AI web search. Powers ONLY the Research agent (not an LLM).',
    placeholder: 'Paste your Tavily API key\u2026',
    format: 'tvly-...',
    docs: 'https://app.tavily.com',
    tag: 'recommended',
    usage: 'Research agent ONLY. Market trends, competitors, industry data. Does NOT generate campaign content.',
  },
];

function DeleteConfirm({ label, onConfirm, onCancel }: { label: string; onConfirm: () => void; onCancel: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={onCancel}>
      <div className="bg-surface border border-border-base rounded-xl p-6 shadow-2xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Delete {label}?</h3>
        <p className="font-body-sm text-body-sm text-text-secondary mb-6">This cannot be undone. The key will be permanently removed.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-danger text-on-danger rounded-lg hover:opacity-90 transition-all text-sm">Delete</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function TestKeyButton({
  status,
  onClick,
  disabled,
}: {
  status: 'idle' | 'testing' | 'passed' | 'failed';
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2.5 py-2 border border-border-base rounded-lg text-[11px] text-text-secondary hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      title={status === 'passed' ? 'Connection successful' : status === 'failed' ? 'Connection failed' : 'Test connection'}
    >
      {status === 'testing' ? <><RefreshCw size={11} className="animate-spin" /> Testing</>
        : status === 'passed' ? <><CheckCircle2 size={11} className="text-secondary" /> Connected</>
        : status === 'failed' ? <><XCircle size={11} className="text-danger" /> Failed</>
        : <><RefreshCw size={11} /> Test</>}
    </button>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return '\u2022'.repeat(key.length);
  return key.slice(0, 4) + '\u2022'.repeat(12) + key.slice(-4);
}

const ApiKeys: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<LlmSettingsState>(() => llmSettingsService.get(user?.id));
  const [newKeyValues, setNewKeyValues] = useState<Record<LlmProviderId, string>>({ gemini: '', groq: '', openai: '', tavily: '' });
  const [formatErrors, setFormatErrors] = useState<Record<LlmProviderId, string>>({ gemini: '', groq: '', openai: '', tavily: '' });
  const [hiddenKeys, setHiddenKeys] = useState<Record<string, boolean>>({});
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'passed' | 'failed'>>({});
  const [deleteTarget, setDeleteTarget] = useState<{ provider: LlmProviderId; index: number } | null>(null);
  const [confirmSave, setConfirmSave] = useState<{ provider: LlmProviderId; value: string; testFirst: boolean } | null>(null);

  const order = [...settings.providerOrder, 'tavily' as LlmProviderId].filter((id, index, arr) => arr.indexOf(id) === index);

  useEffect(() => {
    for (const id of order) {
      const keys = settings[id].keys;
      for (let i = 0; i < keys.length; i++) {
        const sk = `${id}-${i}`;
        if (!(sk in hiddenKeys)) {
          setHiddenKeys((prev) => ({ ...prev, [sk]: true }));
        }
      }
    }
  }, []);

  const testKey = useCallback(async (provider: LlmProviderId, keyValue: string, keyId: string) => {
    if (!keyValue.trim()) return false;
    setTestStatus((prev) => ({ ...prev, [keyId]: 'testing' }));
    try {
      const res = await api.post('/campaigns/test-key', { provider, apiKey: keyValue });
      const data = res.data as { success: boolean; message: string };
      if (data.success) {
        setTestStatus((prev) => ({ ...prev, [keyId]: 'passed' }));
        toast.success(`${PROVIDERS.find((p) => p.id === provider)?.name}: ${data.message}`);
      } else {
        setTestStatus((prev) => ({ ...prev, [keyId]: 'failed' }));
        toast.error(`${PROVIDERS.find((p) => p.id === provider)?.name}: ${data.message}`);
      }
      return data.success;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Connection failed';
      setTestStatus((prev) => ({ ...prev, [keyId]: 'failed' }));
      toast.error(`${PROVIDERS.find((p) => p.id === provider)?.name}: ${msg}`);
      return false;
    }
  }, []);

  const deleteSingleKey = useCallback((provider: LlmProviderId, index: number) => {
    const name = PROVIDERS.find((p) => p.id === provider)?.name || provider;
    const keys = settings[provider].keys.filter((_, i) => i !== index);
    const updated = { ...settings, [provider]: { keys } };
    llmSettingsService.save(updated, user?.id);
    setSettings(updated);
    toast.success(`${name} key removed`);
    setDeleteTarget(null);
    notificationsService.create({
      type: 'warning',
      title: 'API key deleted',
      message: `A ${name} API key was removed from your workspace.`,
    }).catch(() => {});
  }, [settings]);

  const doSaveKey = useCallback(async (provider: LlmProviderId, keyValue: string) => {
    const name = PROVIDERS.find((p) => p.id === provider)?.name || provider;
    const existing = settings[provider].keys;
    const updated = { ...settings, [provider]: { keys: [...existing, { value: keyValue }] } };
    llmSettingsService.save(updated, user?.id);
    setSettings(updated);
    setNewKeyValues((prev) => ({ ...prev, [provider]: '' }));
    setConfirmSave(null);
    toast.success(`${name} API key saved`);
    notificationsService.create({
      type: 'success',
      title: 'API key saved',
      message: `${name} API key added successfully.`,
    }).catch((err) => {
      console.warn('Failed to create notification for key save:', err);
    });
  }, [settings]);

  const handleSaveNewKey = useCallback(async (provider: LlmProviderId) => {
    const val = newKeyValues[provider].trim();
    if (!val) { toast.error('Enter an API key first'); return; }

    if (provider === 'tavily') {
      doSaveKey(provider, val);
      return;
    }

    setConfirmSave(null);
    const passed = await testKey(provider, val, `${provider}-new`);
    if (passed) {
      doSaveKey(provider, val);
    } else {
      setConfirmSave({ provider, value: val, testFirst: false });
    }
  }, [newKeyValues, testKey, doSaveKey]);

  const addEmptyKey = useCallback((provider: LlmProviderId) => {
    const lastKey = settings[provider].keys.length;
    const sk = `${provider}-add-${lastKey}`;
    setHiddenKeys((prev) => ({ ...prev, [sk]: false }));
    setNewKeyValues((prev) => ({ ...prev, [provider]: '' }));
    document.getElementById(`new-key-input-${provider}`)?.focus();
  }, [settings]);

  return (
    <div className="space-y-6">
      {deleteTarget && (
        <DeleteConfirm
          label={`${PROVIDERS.find((p) => p.id === deleteTarget.provider)?.name} key #${deleteTarget.index + 1}`}
          onConfirm={() => deleteSingleKey(deleteTarget.provider, deleteTarget.index)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {confirmSave && createPortal(
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm modal-overlay" onClick={() => setConfirmSave(null)}>
          <div className="bg-surface border border-border-base rounded-xl p-6 shadow-2xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Test failed</h3>
            <p className="font-body-sm text-body-sm text-text-secondary mb-6">The API key test failed. Do you still want to save it?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setConfirmSave(null); }} className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm">Cancel</button>
              <button onClick={() => { setConfirmSave(null); doSaveKey(confirmSave.provider, confirmSave.value); }} className="px-4 py-2 bg-danger text-on-danger rounded-lg hover:opacity-90 transition-all text-sm">Save Anyway</button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="pb-5 mb-5 border-b border-[#262636]">
          <h2 className="text-xl font-semibold font-sora text-white">LLM & Search API Keys</h2>
          <p className="text-xs sm:text-sm text-[#94A3B8] font-sans mt-1">Configure your API provider keys with automatic multi-agent failover support.</p>
        </div>

        <div className="divide-y divide-[#262636]">
          {order.map((id) => {
            const meta = PROVIDERS.find((p) => p.id === id);
            if (!meta) return null; // Defensive: skip unknown providers to prevent crash
            const savedKeys = settings[id].keys;
            const newVal = newKeyValues[id];
            const isDuplicate = newVal.trim().length > 0 && savedKeys.some((k) => k.value === newVal.trim());

            return (
              <div key={id} className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 md:gap-6">
                  {/* Main: Key Management */}
                  <div className="flex-1 min-w-0 space-y-3 sm:space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-sm text-headline-sm text-text-primary">{meta.name}</h3>
                      {(() => {
                        const style = TAG_STYLES[meta.tag];
                        return (
                          <span className={`px-1.5 py-0.5 ${style.bg} border ${style.border} rounded ${style.text} font-label-sm text-label-sm`}>
                            {style.label}
                          </span>
                        );
                      })()}
                    </div>

                    <p className="text-sm text-text-secondary leading-relaxed">
                      {meta.description}
                    </p>

                    {/* Saved keys */}
                    {savedKeys.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-label-xs text-text-muted font-medium uppercase tracking-wider">
                          Saved keys ({savedKeys.length})
                        </div>
                        {savedKeys.map((keyEntry, idx) => {
                          const keyId = `${id}-${idx}`;
                          const isVisible = !hiddenKeys[keyId];
                          const tStatus = testStatus[keyId] || 'idle';
                          return (
                            <div key={keyId} className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg border" style={{ background: 'linear-gradient(135deg, rgba(20,20,30,0.8), rgba(15,15,22,0.6))', borderColor: '#2A2A38', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)' }}>
                              <div className="flex-1 font-mono text-sm text-text-primary truncate min-w-0 w-full">
                                {isVisible ? keyEntry.value : maskKey(keyEntry.value)}
                              </div>
                              <div className="flex items-center gap-1 justify-end shrink-0 w-full sm:w-auto">
                                <button
                                  onClick={() => setHiddenKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))}
                                  className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                                  aria-label="Toggle key visibility"
                                >
                                  {isVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                                </button>
                                {id !== 'tavily' && (
                                  <TestKeyButton
                                    status={tStatus}
                                    onClick={() => testKey(id, keyEntry.value, keyId)}
                                    disabled={tStatus === 'testing'}
                                  />
                                )}
                                <button
                                  onClick={() => setDeleteTarget({ provider: id, index: idx })}
                                  className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-danger transition-colors"
                                  title={`Delete key #${idx + 1}`}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* New key input */}
                    <div className="space-y-1.5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 sm:p-3 rounded-lg border border-dashed" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.03), transparent)', borderColor: '#6366F1/25' }}>
                        <div className="flex items-center flex-1 gap-2 min-w-0 w-full">
                          <input
                            id={`new-key-input-${id}`}
                            type={hiddenKeys[`${id}-new-input`] ? 'password' : 'text'}
                            placeholder={meta.placeholder}
                            value={newVal}
                            onChange={(e) => {
                              const val = e.target.value;
                              setNewKeyValues((prev) => ({ ...prev, [id]: val }));
                              setTestStatus((prev) => {
                                const k = `${id}-new`;
                                return prev[k] && prev[k] !== 'idle' ? { ...prev, [k]: 'idle' } : prev;
                              });
                              if (val.trim()) {
                                const isValid = validateKey(id, val);
                                setFormatErrors((prev) => ({
                                  ...prev,
                                  [id]: isValid ? '' : `Invalid format. Expected: ${meta.format}`,
                                }));
                              } else {
                                setFormatErrors((prev) => ({ ...prev, [id]: '' }));
                              }
                            }}
                            className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted outline-none font-mono min-w-0"
                          />
                          <button
                            onClick={() => setHiddenKeys((prev) => ({ ...prev, [`${id}-new-input`]: !prev[`${id}-new-input`] }))}
                            className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                            aria-label="Toggle key visibility"
                          >
                            {hiddenKeys[`${id}-new-input`] ? <EyeOff size={13} /> : <Eye size={13} />}
                          </button>
                        </div>
                        <div className="flex items-center gap-2 justify-end shrink-0 w-full sm:w-auto">
                          {id !== 'tavily' && (
                            <TestKeyButton
                              status={testStatus[`${id}-new`] || 'idle'}
                              onClick={() => testKey(id, newVal, `${id}-new`)}
                              disabled={testStatus[`${id}-new`] === 'testing' || !newVal.trim()}
                            />
                          )}
                          <button
                            onClick={() => handleSaveNewKey(id)}
                            disabled={!newVal.trim() || isDuplicate || !!formatErrors[id]}
                            className="px-4 py-3 min-h-[44px] bg-primary text-on-primary rounded-lg text-xs font-label-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                      {isDuplicate && (
                        <p className="flex items-center gap-1 text-xs text-danger mt-1.5 ml-1">
                          <AlertCircle size={12} />
                          This API key is already saved. Add a different key instead.
                        </p>
                      )}
                      {formatErrors[id] && !isDuplicate && (
                        <p className="flex items-center gap-1 text-xs text-danger mt-1.5 ml-1">
                          <AlertCircle size={12} />
                          {formatErrors[id]}
                        </p>
                      )}
                    </div>

                    {/* Add another key */}
                    <button
                      onClick={() => addEmptyKey(id)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors py-3 min-h-[44px] px-2 rounded hover:bg-surface-container-low"
                    >
                      <Plus size={13} />
                      Add another {meta.name} key
                    </button>
                  </div>

                  {/* Sidebar: Provider Details — hidden on mobile, visible on lg+ */}
                  <div className="hidden lg:block lg:w-64 xl:w-72 shrink-0">
                    <div className="p-4 rounded-xl bg-surface-container-low border border-border-base h-full flex flex-col gap-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        Provider Details
                      </div>
                      <div className="space-y-3 text-xs">
                        <div>
                          <div className="text-text-primary font-medium text-[11px] mb-1">Powers</div>
                          <div className="text-text-secondary leading-relaxed">{meta.usage}</div>
                        </div>
                        <div>
                          <div className="text-text-primary font-medium text-[11px] mb-1">Expected Format</div>
                          <code className="inline-block bg-surface-container-high px-2 py-1 rounded font-mono text-[10px] text-text-primary border border-border-base">
                            {meta.format}
                          </code>
                        </div>
                      </div>
                      <div className="mt-auto pt-2">
                        <a
                          href={meta.docs}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-4 py-3 min-h-[44px] rounded-lg border border-border-base bg-surface hover:bg-surface-container-high text-xs text-text-primary hover:text-primary transition-all font-semibold"
                        >
                          Get API Key
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17L17 7M17 7H7M17 7V17" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-gradient-to-r from-[#6366F1]/5 to-transparent px-5 sm:px-6 py-3.5 flex items-center gap-3 text-xs" style={{ color: '#6B6B7E', borderTop: '1px solid rgba(42,42,56,0.5)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#6366F1]/40" />
          <span>Keys are stored locally in your browser and sent per-request via headers.</span>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
