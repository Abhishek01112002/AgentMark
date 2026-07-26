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

      {/* Apple Pro Header Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <Plus size={20} className="text-[#818CF8]" />
          </div>
          <div>
            <h2 className="text-xl font-semibold font-sora text-white">LLM & Search API Credentials</h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans mt-0.5">
              Manage API keys for Gemini, Groq, OpenAI, and Tavily with intelligent multi-agent failover
            </p>
          </div>
        </div>
      </div>

      {/* Provider Cards Stack */}
      <div className="space-y-5">
        {order.map((id) => {
          const meta = PROVIDERS.find((p) => p.id === id);
          if (!meta) return null;
          const savedKeys = settings[id].keys;
          const newVal = newKeyValues[id];
          const isDuplicate = newVal.trim().length > 0 && savedKeys.some((k) => k.value === newVal.trim());
          const style = TAG_STYLES[meta.tag];

          return (
            <div key={id} className="rounded-2xl border border-white/[0.08] bg-[#12121A]/90 p-5 sm:p-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all hover:border-white/[0.14] space-y-4">
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#262636]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xs font-sora text-white shrink-0">
                    {meta.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-sora text-base font-semibold text-white">{meta.name}</h3>
                      <span className={`px-2 py-0.5 ${style.bg} border ${style.border} rounded-full ${style.text} text-[10px] font-mono tracking-wider font-semibold`}>
                        {style.label}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-sans mt-0.5 leading-relaxed">
                      {meta.description}
                    </p>
                  </div>
                </div>

                <a
                  href={meta.docs}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#818CF8] hover:text-white transition-colors font-sans shrink-0 self-start sm:self-center"
                >
                  <span>Get API Key</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 17L17 7M17 7H7M17 7V17" />
                  </svg>
                </a>
              </div>

              {/* Usage & Format Meta */}
              <div className="bg-[#0B0B12]/80 border border-[#262636] rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans">
                <span className="text-[#94A3B8]"><strong className="text-white font-medium">Powers:</strong> {meta.usage}</span>
                <span className="text-[#94A3B8] shrink-0"><strong className="text-white font-medium">Expected Format:</strong> <code className="bg-[#1A1A26] px-2 py-0.5 rounded text-[11px] font-mono text-slate-200 border border-white/5">{meta.format}</code></span>
              </div>

              {/* Saved Keys List */}
              {savedKeys.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[11px] text-[#94A3B8] font-mono uppercase tracking-wider font-semibold">
                    Saved Keys ({savedKeys.length})
                  </div>
                  <div className="bg-[#0B0B12] border border-[#262636] rounded-xl overflow-hidden divide-y divide-[#1F1F2E]">
                    {savedKeys.map((keyEntry, idx) => {
                      const keyId = `${id}-${idx}`;
                      const isVisible = !hiddenKeys[keyId];
                      const tStatus = testStatus[keyId] || 'idle';
                      return (
                        <div key={keyId} className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-white/[0.02]">
                          <div className="font-mono text-xs text-slate-200 truncate bg-[#161622] px-3 py-1.5 rounded-lg border border-white/5 flex-1 min-w-0">
                            {isVisible ? keyEntry.value : maskKey(keyEntry.value)}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => setHiddenKeys((prev) => ({ ...prev, [keyId]: !prev[keyId] }))}
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
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
                              className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors border-none bg-transparent cursor-pointer"
                              title={`Delete key #${idx + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Input New Key Bar */}
              <div className="space-y-1.5">
                <div className="bg-[#0B0B12] border border-[#262636] focus-within:border-[#6366F1] rounded-2xl p-1.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 transition-all shadow-inner">
                  <div className="flex items-center flex-1 min-w-0 px-2">
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
                      className="w-full bg-transparent text-xs font-mono text-white placeholder-[#64748B] outline-none py-1.5"
                    />
                    <button
                      onClick={() => setHiddenKeys((prev) => ({ ...prev, [`${id}-new-input`]: !prev[`${id}-new-input`] }))}
                      className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white transition-colors border-none bg-transparent cursor-pointer shrink-0"
                      aria-label="Toggle key visibility"
                    >
                      {hiddenKeys[`${id}-new-input`] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 justify-end shrink-0">
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
                      className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed font-sora cursor-pointer border-none"
                    >
                      Save Key
                    </button>
                  </div>
                </div>
                {isDuplicate && (
                  <p className="flex items-center gap-1.5 text-xs text-[#F43F5E] mt-1 ml-1 font-sans">
                    <AlertCircle size={12} />
                    This API key is already saved. Add a different key instead.
                  </p>
                )}
                {formatErrors[id] && !isDuplicate && (
                  <p className="flex items-center gap-1.5 text-xs text-[#F43F5E] mt-1 ml-1 font-sans">
                    <AlertCircle size={12} />
                    {formatErrors[id]}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-[#12121A]/60 px-5 py-3.5 flex items-center gap-3 text-xs text-[#94A3B8] font-sans">
        <div className="w-2 h-2 rounded-full bg-[#6366F1] shrink-0" />
        <span>Keys are stored locally in your browser workspace and transmitted over encrypted HTTPS headers per request.</span>
      </div>
    </div>
  );
};

export default ApiKeys;
