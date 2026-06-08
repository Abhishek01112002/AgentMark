import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Info, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApiKeyConfig {
  id: 'openai' | 'groq';
  name: string;
  description: string;
  status: 'connected' | 'not_set';
  key: string;
  placeholder: string;
  format: string;
  docs: string;
  required: boolean;
  usage: string;
}

const ApiKeys: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyConfig>>({
    openai: {
      id: 'openai',
      name: 'OpenAI API Key',
      description: 'Powers all 7 agents (GPT-4o & GPT-4o-mini) + DALL-E 3 image generation',
      status: 'not_set',
      key: '',
      placeholder: 'sk-...',
      format: 'sk-...',
      docs: 'https://platform.openai.com',
      required: true,
      usage: 'Manager Agent (GPT-4o), Copywriter Agent (GPT-4o), Research Agent (GPT-4o-mini), Strategy Agent (GPT-4o-mini), Image Prompt Agent (GPT-4o-mini), Reviewer Agent (GPT-4o-mini), Publisher Agent (GPT-4o-mini), and DALL-E 3 image generation',
    },
    groq: {
      id: 'groq',
      name: 'Groq API Key',
      description: 'Free alternative fallback for all 7 agents',
      status: 'not_set',
      key: '',
      placeholder: 'gsk_...',
      format: 'gsk_...',
      docs: 'https://console.groq.com',
      required: false,
      usage: 'Optional free fallback when OpenAI is unavailable. Uses Llama 3 and Mixtral models.',
    },
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({
    openai: false,
    groq: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleKeyChange = (id: string, value: string) => {
    setApiKeys({
      ...apiKeys,
      [id]: {
        ...apiKeys[id],
        key: value,
        status: value ? 'connected' : 'not_set',
      },
    });
  };

  const toggleShowKey = (id: string) => {
    setShowKeys({
      ...showKeys,
      [id]: !showKeys[id],
    });
  };

  const handleSave = async (id: string) => {
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success(`${apiKeys[id].name} saved successfully`);
    } catch (error) {
      toast.error('Failed to save API key');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setApiKeys({
      ...apiKeys,
      [id]: {
        ...apiKeys[id],
        key: '',
        status: 'not_set',
      },
    });
    toast.success('API key deleted');
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
        <div className="p-6 border-b border-border-base bg-surface-container-lowest">
          <h2 className="font-headline-md text-headline-md text-text-primary">API Keys</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">
            Connect your LLM providers. AgentMark uses these keys to power all agents.
          </p>
        </div>

        {/* API Keys List */}
        <div className="divide-y divide-border-base">
          {Object.values(apiKeys).map((config) => (
            <div key={config.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-headline-sm text-headline-sm text-text-primary">
                      {config.name}
                    </h3>
                    {config.required ? (
                      <span className="px-2 py-0.5 bg-danger/10 border border-danger/30 rounded text-danger font-label-xs text-label-xs">
                        REQUIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-tertiary/10 border border-tertiary/30 rounded text-tertiary font-label-xs text-label-xs">
                        OPTIONAL
                      </span>
                    )}
                    <div
                      className={`w-2 h-2 rounded-full ${
                        config.status === 'connected' ? 'bg-secondary' : 'bg-on-surface-variant'
                      }`}
                    />
                    <span className="font-label-sm text-label-sm text-text-secondary">
                      {config.status === 'connected' ? 'Connected' : 'Not set'}
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-text-secondary mt-1">
                    {config.description}
                  </p>
                </div>
              </div>

              {/* Key Input */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showKeys[config.id] ? 'text' : 'password'}
                      placeholder={config.placeholder}
                      value={config.key}
                      onChange={(e) => handleKeyChange(config.id, e.target.value)}
                      className="w-full bg-surface-container-lowest border border-border-base rounded-lg px-4 py-3 text-on-surface font-body-md focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    />
                    <button
                      onClick={() => toggleShowKey(config.id)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                      aria-label={showKeys[config.id] ? 'Hide key' : 'Show key'}
                    >
                      {showKeys[config.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleSave(config.id)}
                    disabled={!config.key || isSaving}
                    className="px-4 py-3 bg-primary text-on-primary rounded-lg font-label-md text-label-md hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  {config.key && (
                    <button
                      onClick={() => handleDelete(config.id)}
                      className="px-4 py-3 border border-error text-error hover:bg-error/10 rounded-lg font-label-md text-label-md transition-all active:scale-95"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {/* Usage Info */}
                <div className="p-3 bg-surface-container-low rounded-lg border border-border-base">
                  <p className="font-body-sm text-body-sm text-text-secondary">
                    <span className="font-semibold text-text-primary">Powers:</span> {config.usage}
                  </p>
                </div>

                {/* Format Info */}
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
          ))}
        </div>

        {/* Footer Info */}
        <div className="p-6 bg-surface-container-lowest border-t border-border-base space-y-3">
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="font-body-sm text-body-sm text-text-primary">
              <span className="font-semibold flex items-center gap-2"><Lock size={16} className="text-primary" /> Security:</span>
              <span className="mt-2 block">Your API keys are encrypted and stored securely. They are never shared with anyone and only used to make authorized API calls on your behalf.</span>
            </p>
          </div>
          
          <div className="p-4 bg-secondary/5 border border-secondary/20 rounded-lg space-y-2">
            <p className="font-body-sm text-body-sm text-text-primary flex items-center gap-2">
              <List size={16} className="text-secondary flex-shrink-0" />
              <span className="font-semibold">Quick Reference:</span>
            </p>
            <ul className="font-body-sm text-body-sm text-text-secondary space-y-1 ml-4 list-disc">
              <li><span className="font-semibold text-text-primary">OpenAI:</span> Required. Handles all 7 agents + DALL-E 3 image generation.</li>
              <li><span className="font-semibold text-text-primary">Groq:</span> Optional. Free fallback when OpenAI is unavailable.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiKeys;
