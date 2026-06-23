import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, Info, List } from 'lucide-react';
import toast from 'react-hot-toast';
import { llmSettingsService, LlmProviderId, LlmSettingsState } from '../../../../services/llm-settings.service';

interface ApiKeyConfig {
  id: LlmProviderId;
  name: string;
  description: string;
  placeholder: string;
  format: string;
  docs: string;
  required: boolean;
  usage: string;
}

const ApiKeys: React.FC = () => {
  const [settings, setSettings] = useState<LlmSettingsState>(() => llmSettingsService.get());
  const [showKeys, setShowKeys] = useState<Record<LlmProviderId, boolean>>({
    gemini: false,
    groq: false,
    openai: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  const configs: ApiKeyConfig[] = [
    {
      id: 'gemini',
      name: 'Gemini API Key',
      description: 'Primary provider for all agents.',
      placeholder: 'AIza...',
      format: 'AIza...',
      docs: 'https://aistudio.google.com/app/apikey',
      required: true,
      usage: 'Used first for all AI calls. If unavailable, Groq is used next, then OpenAI.',
    },
    {
      id: 'groq',
      name: 'Groq API Key',
      description: 'Fast fallback provider for the full agent stack.',
      placeholder: 'gsk_...',
      format: 'gsk_...',
      docs: 'https://console.groq.com',
      required: false,
      usage: 'Used when Gemini is missing.',
    },
    {
      id: 'openai',
      name: 'OpenAI API Key',
      description: 'Final fallback provider for the full agent stack.',
      placeholder: 'sk-...',
      format: 'sk-...',
      docs: 'https://platform.openai.com',
      required: false,
      usage: 'Used when Gemini and Groq are unavailable.',
    },
  ];

  const providerOrder: LlmProviderId[] = ['gemini', 'groq', 'openai'];

  const hasAtLeastOneKey = useMemo(
    () => providerOrder.some((id) => settings[id].key.trim().length > 0),
    [settings]
  );

  const updateProvider = (id: LlmProviderId, patch: Partial<LlmSettingsState[LlmProviderId]>) => {
    setSettings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    if (!hasAtLeastOneKey) {
      toast.error('Add at least one API key before saving');
      return;
    }

    setIsSaving(true);
    try {
      llmSettingsService.save(settings);
      toast.success('API keys saved locally');
    } catch {
      toast.error('Failed to save API keys');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: LlmProviderId) => {
    updateProvider(id, { key: '' });
    toast.success(`${id.charAt(0).toUpperCase() + id.slice(1)} key removed`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-container-lowest">
          <h2 className="font-headline-md text-headline-md text-text-primary">API Keys</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Add your provider keys in priority order: Gemini, Groq, then OpenAI.
          </p>
        </div>

        <div className="divide-y divide-border-base">
          {configs.map((config) => {
            const provider = settings[config.id];
            const hasKey = provider.key.trim().length > 0;

            return (
              <div key={config.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-headline-sm text-headline-sm text-text-primary">{config.name}</h3>
                      {config.required ? (
                        <span className="px-2 py-0.5 bg-danger/10 border border-danger/30 rounded text-danger font-label-xs text-label-xs">
                          REQUIRED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-tertiary/10 border border-tertiary/30 rounded text-tertiary font-label-xs text-label-xs">
                          OPTIONAL
                        </span>
                      )}
                      <div className={`w-2 h-2 rounded-full ${hasKey ? 'bg-secondary' : 'bg-on-surface-variant'}`} />
                      <span className="font-label-sm text-label-sm text-text-secondary">
                        {hasKey ? 'Connected' : 'Not set'}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1">{config.description}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type={showKeys[config.id] ? 'text' : 'password'}
                        placeholder={config.placeholder}
                        value={provider.key}
                        onChange={(e) => updateProvider(config.id, { key: e.target.value })}
                        className="w-full bg-surface-container-lowest border border-border-base rounded-lg px-4 py-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                      />
                      <button
                        onClick={() => setShowKeys((prev) => ({ ...prev, [config.id]: !prev[config.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                        aria-label={showKeys[config.id] ? 'Hide key' : 'Show key'}
                      >
                        {showKeys[config.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <button
                      onClick={() => void handleSave()}
                      disabled={!provider.key || isSaving}
                      className="px-4 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    {provider.key && (
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="px-4 py-3 border border-error text-error hover:bg-error/10 rounded-lg font-label-md text-label-md transition-all active:scale-95"
                      >
                        Delete
                      </button>
                    )}
                  </div>

                  <div className="p-3 bg-surface-container-low rounded-lg border border-border-base">
                    <p className="font-body-sm text-body-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">Powers:</span> {config.usage}
                    </p>
                  </div>

                  <div className="flex items-start gap-2 text-sm">
                    <Info size={16} className="text-text-muted mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-body-sm text-body-sm text-text-secondary">
                        Format: <code className="bg-surface-container-low px-1.5 py-0.5 rounded font-mono text-label-sm">{config.format}</code>
                      </p>
                      <a
                        href={config.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-label-sm text-label-sm text-primary hover:underline transition-all mt-1 inline-block"
                      >
                        Get your key →
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6 bg-surface-container-lowest border-t border-border-base space-y-3">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="font-body-sm text-body-sm text-text-primary">
              <span className="font-semibold flex items-center gap-2"><Lock size={16} className="text-primary" /> Security:</span>
              <span className="mt-2 block">API keys are stored locally in your browser so you can keep all provider setup in the frontend.</span>
            </p>
          </div>

          <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg space-y-2">
            <p className="font-body-sm text-body-sm text-text-primary flex items-center gap-2">
              <List size={16} className="text-secondary flex-shrink-0" />
              <span className="font-semibold">Quick Reference:</span>
            </p>
            <ul className="font-body-sm text-body-sm text-text-secondary space-y-1 ml-4 list-disc">
              <li><span className="font-semibold text-text-primary">Gemini:</span> Primary provider.</li>
              <li><span className="font-semibold text-text-primary">Groq:</span> Fallback provider.</li>
              <li><span className="font-semibold text-text-primary">OpenAI:</span> Final fallback provider.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
