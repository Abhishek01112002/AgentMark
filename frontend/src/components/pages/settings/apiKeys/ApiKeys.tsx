import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Trash2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../services/api';
import { notificationsService } from '../../../../services/notifications.service';
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
    bg: 'bg-danger/10',
    border: 'border-danger/30',
    text: 'text-danger',
  },
  recommended: {
    label: 'RECOMMENDED',
    bg: 'bg-secondary/10',
    border: 'border-secondary/30',
    text: 'text-secondary',
  },
  optional: {
    label: 'OPTIONAL',
    bg: 'bg-tertiary/10',
    border: 'border-tertiary/30',
    text: 'text-tertiary',
  },
};

const PROVIDERS: ProviderMeta[] = [
  {
    id: 'gemini',
    name: 'Gemini',
    description: "Google's LLM. Powers all 7 campaign agents (Manager → Publisher).",
    placeholder: 'Paste your Gemini API key\u2026',
    format: 'AIza... or AQ...',
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
    name: 'OpenAI',
    description: 'GPT-4o + DALL-E 3. Powers all 7 agents AND image generation.',
    placeholder: 'Paste your OpenAI API key\u2026',
    format: 'sk-...',
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
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 modal-overlay" onClick={onCancel}>
      <div className="bg-surface border border-border-base rounded-xl p-6 shadow-2xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Delete {label}?</h3>
        <p className="font-body-sm text-body-sm text-text-secondary mb-6">This cannot be undone. The key will be permanently removed.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-danger text-on-danger rounded-lg hover:opacity-90 transition-all text-sm">Delete</button>
        </div>
      </div>
    </div>
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
      className="flex items-center gap-1.5 px-3 py-3 border border-border-base rounded-lg text-xs text-text-secondary hover:bg-surface-container-high transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
      title={status === 'passed' ? 'Connection successful' : status === 'failed' ? 'Connection failed' : 'Test connection'}
    >
      {status === 'testing' ? <><RefreshCw size={12} className="animate-spin" /> Testing</>
        : status === 'passed' ? <><CheckCircle2 size={12} className="text-secondary" /> Connected</>
        : status === 'failed' ? <><XCircle size={12} className="text-danger" /> Failed</>
        : <><RefreshCw size={12} /> Test</>}
    </button>
  );
}

function maskKey(key: string): string {
  if (key.length <= 8) return '\u2022'.repeat(key.length);
  return key.slice(0, 4) + '\u2022'.repeat(12) + key.slice(-4);
}

const ApiKeys: React.FC = () => {
  const [settings, setSettings] = useState<LlmSettingsState>(() => llmSettingsService.get());
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
    llmSettingsService.save(updated);
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
    llmSettingsService.save(updated);
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

  const handleSaveNewKey = useCallback((provider: LlmProviderId, skipTest = false) => {
    const val = newKeyValues[provider].trim();
    if (!val) { toast.error('Enter an API key first'); return; }

    // Tavily: no test confirmation, save directly
    if (provider === 'tavily') {
      doSaveKey(provider, val);
      return;
    }

    if (!skipTest && confirmSave?.provider !== provider) {
      setConfirmSave({ provider, value: val, testFirst: true });
      return;
    }

    if (!skipTest) {
      testKey(provider, val, `${provider}-new`).then((passed) => {
        if (passed) {
          doSaveKey(provider, val);
        } else {
          setConfirmSave({ provider, value: val, testFirst: false });
        }
      });
    } else {
      doSaveKey(provider, val);
    }
  }, [newKeyValues, confirmSave, testKey, doSaveKey]);

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

      {confirmSave && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 modal-overlay" onClick={() => setConfirmSave(null)}>
          <div className="bg-surface border border-border-base rounded-xl p-6 shadow-2xl max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            {confirmSave.testFirst ? (
              <>
                <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">
                  {testStatus[`${confirmSave.provider}-new`] === 'testing' ? 'Testing connection...' : 'Test this key first?'}
                </h3>
                <p className="font-body-sm text-body-sm text-text-secondary mb-6">
                  {testStatus[`${confirmSave.provider}-new`] === 'testing'
                    ? 'Making a test API call to verify the key works before saving. This may take a few seconds...'
                    : "We'll make a test API call to verify the key is working before saving."}
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    disabled={testStatus[`${confirmSave.provider}-new`] === 'testing'}
                    onClick={() => { setConfirmSave(null); }}
                    className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={testStatus[`${confirmSave.provider}-new`] === 'testing'}
                    onClick={() => handleSaveNewKey(confirmSave.provider, false)}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {testStatus[`${confirmSave.provider}-new`] === 'testing' ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test & Save'
                    )}
                  </button>
                  <button
                    disabled={testStatus[`${confirmSave.provider}-new`] === 'testing'}
                    onClick={() => handleSaveNewKey(confirmSave.provider, true)}
                    className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm disabled:opacity-50"
                  >
                    Save Anyway
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-headline-sm text-headline-sm text-text-primary mb-2">Test failed</h3>
                <p className="font-body-sm text-body-sm text-text-secondary mb-6">The API key test failed. Do you still want to save it?</p>
                <div className="flex gap-3 justify-end">
                  <button onClick={() => { setConfirmSave(null); }} className="px-4 py-2 border border-border-base rounded-lg text-text-secondary hover:bg-surface-container-high transition-all text-sm">Cancel</button>
                  <button onClick={() => handleSaveNewKey(confirmSave.provider, true)} className="px-4 py-2 bg-danger text-on-danger rounded-lg hover:opacity-90 transition-all text-sm">Save Anyway</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-base">
          <h2 className="font-headline-md text-headline-md text-text-primary">API Keys</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">Add your provider API keys.</p>
        </div>

        <div className="divide-y divide-border-base">
          {order.map((id) => {
            const meta = PROVIDERS.find((p) => p.id === id);
            if (!meta) return null; // Defensive: skip unknown providers to prevent crash
            const savedKeys = settings[id].keys;
            const newVal = newKeyValues[id];
            const isDuplicate = newVal.trim().length > 0 && savedKeys.some((k) => k.value === newVal.trim());

            return (
              <div key={id} className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: API Key Management */}
                  <div className="lg:col-span-2 space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-sm text-headline-sm text-text-primary">{meta.name}</h3>
                      {(() => {
                        const style = TAG_STYLES[meta.tag];
                        return (
                          <span className={`px-1.5 py-0.5 ${style.bg} border ${style.border} rounded ${style.text} font-label-xs text-label-xs`}>
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
                      <div className="space-y-2">
                        <div className="text-label-xs text-text-muted font-medium uppercase tracking-wider">
                          Saved keys ({savedKeys.length})
                        </div>
                        {savedKeys.map((keyEntry, idx) => {
                          const keyId = `${id}-${idx}`;
                          const isVisible = !hiddenKeys[keyId];
                          const tStatus = testStatus[keyId] || 'idle';
                          return (
                            <div key={keyId} className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-3 bg-surface-container-low rounded-lg border border-border-base group">
                              <div className="flex-1 font-mono text-sm text-text-primary truncate min-w-0 w-full">
                                {isVisible ? keyEntry.value : maskKey(keyEntry.value)}
                              </div>
                              <div className="flex items-center gap-2 justify-end shrink-0 w-full sm:w-auto">
                                <button
                                  onClick={() => setHiddenKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))}
                                  className="p-3 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center min-h-[44px]"
                                  aria-label="Toggle key visibility"
                                >
                                  {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
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
                                  className="p-3 text-text-muted hover:text-danger transition-colors flex items-center justify-center min-h-[44px]"
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
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3 px-3 bg-surface-container-lowest rounded-lg border border-dashed border-border-base w-full">
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
                              // Real-time format validation for all providers
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
                            className="p-3 text-text-muted hover:text-text-primary transition-colors flex items-center justify-center min-h-[44px]"
                            aria-label="Toggle key visibility"
                          >
                            {hiddenKeys[`${id}-new-input`] ? <EyeOff size={14} /> : <Eye size={14} />}
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
                            className="px-4 py-3 bg-primary text-on-primary rounded-lg text-xs font-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap min-h-[44px]"
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
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors py-2 px-1 rounded hover:bg-surface-container-low min-h-[32px]"
                    >
                      <Plus size={13} />
                      Add another {meta.name} key
                    </button>
                  </div>

                  {/* Right Column: Provider Information Details Card */}
                  <div className="flex flex-col justify-between p-5 rounded-xl bg-surface-container-low border border-border-base gap-4 h-full">
                    <div className="space-y-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        Provider Details
                      </div>
                      <div className="space-y-3 text-xs">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-text-primary font-medium">Powers</span>
                          <span className="text-text-secondary leading-relaxed">{meta.usage}</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <span className="text-text-primary font-medium">Expected Format</span>
                          <code className="bg-surface-container-high px-2 py-1 rounded font-mono text-[10px] text-text-primary border border-border-base self-start">
                            {meta.format}
                          </code>
                        </div>
                      </div>
                    </div>
                    <a
                      href={meta.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border border-border-base bg-surface hover:bg-surface-container-high text-xs text-text-primary hover:text-primary transition-all font-semibold min-h-[44px]"
                    >
                      Get API Key
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-surface-container-low px-6 py-4 flex items-center gap-3 text-xs text-text-muted">
          <span>Keys stored locally in your browser. Sent per-request via headers.</span>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
