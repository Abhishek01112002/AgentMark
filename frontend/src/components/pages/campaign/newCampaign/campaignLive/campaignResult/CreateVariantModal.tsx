import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, X, Loader2, Check, Sparkles, RefreshCw, PenTool, Image as ImageIcon, Compass, RotateCcw } from 'lucide-react';
import api from '../../../../../../services/api';
import toast from 'react-hot-toast';

interface CreateVariantModalProps {
  campaign: {
    id: string;
    name: string;
    projectId: string;
  };
  onClose: () => void;
  onCreated: (newCampaignId: string, projectId: string) => void;
}

export type VariantStageOption = 'copywriter' | 'image_prompt' | 'strategy' | 'fresh';

interface StageConfig {
  id: VariantStageOption;
  title: string;
  description: string;
  icon: React.ElementType;
  badge?: string;
  reusedSteps: string[];
  generatedSteps: string[];
}

const STAGE_CONFIGS: StageConfig[] = [
  {
    id: 'copywriter',
    title: 'Rewrite the Copy',
    description: 'Keep research and strategy, generate fresh messaging.',
    icon: PenTool,
    badge: 'Recommended',
    reusedSteps: ['Market research & competitor analysis', 'Brand positioning & strategy'],
    generatedSteps: ['Ad copy variants & headlines', 'Visual creative prompts & imagery'],
  },
  {
    id: 'image_prompt',
    title: 'Regenerate Images',
    description: 'Keep everything, create new visuals.',
    icon: ImageIcon,
    reusedSteps: ['Market research & competitor analysis', 'Brand positioning & strategy', 'Ad copy & messaging'],
    generatedSteps: ['Visual creative prompts & imagery'],
  },
  {
    id: 'strategy',
    title: 'Explore a New Strategy',
    description: 'Keep research, generate a new strategy and everything after it.',
    icon: Compass,
    reusedSteps: ['Market research & competitor analysis'],
    generatedSteps: ['Brand positioning & strategy', 'Ad copy variants', 'Visual creatives'],
  },
  {
    id: 'fresh',
    title: 'Start Fresh',
    description: 'Generate everything again.',
    icon: RotateCcw,
    reusedSteps: [],
    generatedSteps: ['Full multi-agent pipeline (Research, Strategy, Copy, Images)'],
  },
];

function suggestVariantName(existingName: string): string {
  const variantRegex = / – Variant ([A-Z])$/;
  const match = existingName.match(variantRegex);
  if (match) {
    const nextLetter = String.fromCharCode(match[1].charCodeAt(0) + 1);
    return existingName.replace(variantRegex, ` – Variant ${nextLetter}`);
  }
  return `${existingName} – Variant A`;
}

const MAX_NAME_LENGTH = 100;

const CreateVariantModal: React.FC<CreateVariantModalProps> = ({ campaign, onClose, onCreated }) => {
  const [name, setName] = useState(() => suggestVariantName(campaign.name));
  const [selectedStage, setSelectedStage] = useState<VariantStageOption>('copywriter');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button, input, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleFocusTrap);
    return () => document.removeEventListener('keydown', handleFocusTrap);
  }, []);

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Variant name is required');
      return;
    }
    if (trimmed.length > MAX_NAME_LENGTH) {
      setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer`);
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      const response = await api.post(`/campaigns/${campaign.id}/fork`, {
        newName: trimmed,
        startStage: selectedStage,
      });
      const newCampaign = response.data.campaign;
      toast.success('Variant created! Starting execution...', { icon: '⚡' });
      onCreated(newCampaign.id, newCampaign.projectId || campaign.projectId);
    } catch (err: any) {
      console.error('Failed to create variant:', err);
      const msg = err.response?.data?.error || 'Failed to create variant. Please try again.';
      setError(msg);
      toast.error(msg);
      setIsCreating(false);
    }
  };

  const currentConfig = STAGE_CONFIGS.find((c) => c.id === selectedStage) || STAGE_CONFIGS[0];
  const charCount = name.length;
  const isOverLimit = charCount > MAX_NAME_LENGTH;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-overlay"
      style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-lg rounded-2xl p-6 modal-content bg-[#111118] border border-[#2A2A38] shadow-2xl"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.7)', fontFamily: 'Sora, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5 border-b border-[#2A2A38]/60 pb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}
            >
              <GitBranch size={20} style={{ color: '#6366F1' }} />
            </div>
            <div>
              <h2
                id="variant-modal-title"
                className="text-xl font-bold"
                style={{ color: '#F1F1F3' }}
              >
                Create Variant
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#8B8B9E' }}>
                Choose where to continue from to experiment efficiently
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-2 rounded-lg transition-colors text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Variant Name Input */}
        <div className="space-y-1.5 mb-5">
          <label
            className="block text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}
          >
            Variant Name
          </label>
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              className="w-full rounded-xl px-3.5 py-2.5 text-sm border transition-all"
              placeholder="Enter variant name..."
              style={{
                fontFamily: 'Sora, sans-serif',
                backgroundColor: '#131318',
                borderColor: isOverLimit ? '#F43F5E' : error ? '#F43F5E' : '#2A2A38',
                color: '#F1F1F3',
              }}
              maxLength={MAX_NAME_LENGTH + 20}
              aria-invalid={!!error || isOverLimit}
              aria-describedby={error ? 'variant-name-error' : undefined}
            />
            <div
              className="absolute bottom-2.5 right-3 text-[10px] font-mono select-none pointer-events-none"
              style={{ color: isOverLimit ? '#F43F5E' : charCount > MAX_NAME_LENGTH * 0.85 ? '#FFB020' : '#4A4A5E' }}
            >
              {charCount}/{MAX_NAME_LENGTH}
            </div>
          </div>
          {error && (
            <p id="variant-name-error" className="text-xs text-[#F43F5E] ml-1" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* Selective Stage Radio Options */}
        <div className="space-y-2 mb-5">
          <label
            className="block text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}
          >
            Choose Continuation Stage
          </label>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {STAGE_CONFIGS.map((cfg) => {
              const Icon = cfg.icon;
              const isSelected = selectedStage === cfg.id;

              return (
                <div
                  key={cfg.id}
                  onClick={() => setSelectedStage(cfg.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                    isSelected
                      ? 'bg-[rgba(99,102,241,0.08)] border-[#6366F1] shadow-[0_0_16px_rgba(99,102,241,0.15)]'
                      : 'bg-[#131318] border-[#2A2A38] hover:border-[#4A4A5E] hover:bg-[#161620]'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                      isSelected ? 'border-[#6366F1] bg-[#6366F1]' : 'border-[#4A4A5E] bg-transparent'
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon size={15} className={isSelected ? 'text-[#c0c1ff]' : 'text-[#8B8B9E]'} />
                        <span
                          className={`text-xs font-semibold ${isSelected ? 'text-[#F1F1F3]' : 'text-[#C7C4D7]'}`}
                        >
                          {cfg.title}
                        </span>
                      </div>
                      {cfg.badge && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider"
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            backgroundColor: 'rgba(78,222,163,0.12)',
                            color: '#4edea3',
                            border: '1px solid rgba(78,222,163,0.25)',
                          }}
                        >
                          {cfg.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8B8B9E] mt-1 leading-normal">
                      {cfg.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Impact Summary Box */}
        <div
          className="rounded-xl p-3.5 mb-5 space-y-2 border"
          style={{ backgroundColor: '#0C0C12', borderColor: '#2A2A38' }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={13} className="text-[#6366F1]" />
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ fontFamily: 'JetBrains Mono, monospace', color: '#a5a6ff' }}
            >
              Execution Impact
            </span>
          </div>

          <div className="space-y-1.5 text-xs text-[#C7C4D7]">
            {currentConfig.reusedSteps.map((step) => (
              <div key={step} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/30 flex items-center justify-center flex-shrink-0">
                  <Check size={10} className="text-[#4edea3]" />
                </span>
                <span>Reusing {step.toLowerCase()}</span>
              </div>
            ))}

            {currentConfig.generatedSteps.map((step) => (
              <div key={step} className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-[#6366F1]/15 border border-[#6366F1]/40 flex items-center justify-center flex-shrink-0">
                  <RefreshCw size={9} className="text-[#a5a6ff]" />
                </span>
                <span className="text-[#F1F1F3] font-medium">Generating new {step.toLowerCase()}</span>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1 border-t border-[#2A2A38]/50 text-[11px] text-[#8B8B9E]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4A4A5E]" />
              <span>Original campaign remains unchanged</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center border cursor-pointer"
            style={{
              backgroundColor: 'transparent',
              borderColor: '#2A2A38',
              color: '#8B8B9E',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1A24';
              (e.currentTarget as HTMLElement).style.color = '#F1F1F3';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || isOverLimit}
            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 text-white shadow-lg cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: '#6366F1',
              boxShadow: '0 4px 16px rgba(99,102,241,0.25)',
            }}
            onMouseEnter={(e) => {
              if (!isCreating) (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
            }}
            onMouseLeave={(e) => {
              if (!isCreating) (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Creating Variant...
              </>
            ) : (
              <>
                <GitBranch size={15} />
                Create Variant
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateVariantModal;
