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
  onCreated: (newCampaignId: string, projectId: string, selectedStage?: string) => void;
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
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
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
        'button, input, textarea, [tabindex]:not([tabindex="-1"])'
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
        additionalInfo: additionalInfo.trim() || undefined,
      });
      const newCampaign = response.data.campaign;
      toast.success('Variant created! Starting execution...');
      onCreated(newCampaign.id, newCampaign.projectId || campaign.projectId, selectedStage);
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
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-overlay animate-fadeIn"
      style={{ backgroundColor: 'rgba(5, 5, 10, 0.78)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="w-full max-w-[460px] max-h-[82vh] rounded-2xl p-5 modal-content border border-[#2E2E42] shadow-[0_24px_80px_rgba(0,0,0,0.85)] relative overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(180deg, rgba(14, 14, 22, 0.96) 0%, rgba(9, 9, 14, 0.98) 100%)',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="variant-modal-title"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-[#6366F1]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-[#A855F7]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Fixed Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#232334] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-inner"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.15) 100%)',
                border: '1px solid rgba(99,102,241,0.35)',
              }}
            >
              <GitBranch size={18} style={{ color: '#818cf8' }} />
            </div>
            <div>
              <h2
                id="variant-modal-title"
                className="text-base font-bold tracking-tight"
                style={{ color: '#F8FAFC' }}
              >
                Create Variant
              </h2>
              <p className="text-[11px] text-[#94A3B8] font-normal">
                Branch off a parallel variant for A/B testing
              </p>
            </div>
          </div>
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-all text-[#94A3B8] hover:bg-[#1E1E2E] hover:text-[#F8FAFC] cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto pr-1 my-3 space-y-4 custom-scrollbar">
          {/* Variant Name Input */}
          <div className="space-y-1">
            <label
              className="block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
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
                className="w-full rounded-xl px-3.5 py-2 text-xs border transition-all outline-none"
                placeholder="e.g. Campaign – Variant B..."
                style={{
                  backgroundColor: '#0A0A10',
                  borderColor: isOverLimit ? '#F43F5E' : error ? '#F43F5E' : '#232334',
                  color: '#F8FAFC',
                }}
                maxLength={MAX_NAME_LENGTH + 20}
                aria-invalid={!!error || isOverLimit}
                aria-describedby={error ? 'variant-name-error' : undefined}
              />
              <div
                className="absolute bottom-2 right-3 text-[9px] font-mono select-none pointer-events-none"
                style={{ color: isOverLimit ? '#F43F5E' : charCount > MAX_NAME_LENGTH * 0.85 ? '#FFB020' : '#64748B' }}
              >
                {charCount}/{MAX_NAME_LENGTH}
              </div>
            </div>
            {error && (
              <p id="variant-name-error" className="text-[11px] text-[#F43F5E] ml-1 mt-0.5" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Steering Notes & Facts (Optional) Input */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label
                className="block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Steering Notes <span className="normal-case text-[9px] text-[#64748B]">(Optional)</span>
              </label>
              <span className="text-[9px] font-medium text-[#818cf8] flex items-center gap-1 bg-[#6366F1]/10 px-1.5 py-0.5 rounded-full border border-[#6366F1]/20">
                <Sparkles size={9} /> Offer Booster
              </span>
            </div>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              rows={2}
              className="w-full rounded-xl px-3.5 py-2 text-xs border transition-all outline-none resize-none leading-relaxed"
              placeholder="e.g. Include specific price ₹1,499, Free Delivery above ₹999..."
              style={{
                backgroundColor: '#0A0A10',
                borderColor: '#232334',
                color: '#F8FAFC',
              }}
            />
          </div>

          {/* Selective Stage Radio Options */}
          <div className="space-y-1.5">
            <label
              className="block text-[10px] font-semibold uppercase tracking-wider text-[#94A3B8]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              Choose Stage
            </label>

            <div className="space-y-2">
              {STAGE_CONFIGS.map((cfg) => {
                const Icon = cfg.icon;
                const isSelected = selectedStage === cfg.id;

                return (
                  <div
                    key={cfg.id}
                    onClick={() => setSelectedStage(cfg.id)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 relative ${
                      isSelected
                        ? 'bg-[#6366F1]/10 border-[#6366F1] shadow-[0_2px_12px_rgba(99,102,241,0.15)]'
                        : 'bg-[#0A0A10] border-[#232334] hover:border-[#3D3D56] hover:bg-[#12121D]'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center mt-0.5 flex-shrink-0 transition-all ${
                        isSelected ? 'border-[#6366F1] bg-[#6366F1]' : 'border-[#475569] bg-transparent'
                      }`}
                    >
                      {isSelected && <div className="w-1 h-1 rounded-full bg-white" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Icon size={13} className={isSelected ? 'text-[#818cf8]' : 'text-[#94A3B8]'} />
                          <span
                            className={`text-xs font-semibold ${isSelected ? 'text-[#F8FAFC]' : 'text-[#CBD5E1]'}`}
                          >
                            {cfg.title}
                          </span>
                        </div>
                        {cfg.badge && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-wider"
                            style={{
                              fontFamily: 'JetBrains Mono, monospace',
                              backgroundColor: 'rgba(52, 211, 153, 0.12)',
                              color: '#34d399',
                              border: '1px solid rgba(52, 211, 153, 0.3)',
                            }}
                          >
                            {cfg.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#94A3B8] mt-0.5 leading-normal">
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
            className="rounded-xl p-3 space-y-1.5 border"
            style={{ backgroundColor: '#07070C', borderColor: '#1F1F2D' }}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles size={11} className="text-[#818cf8]" />
              <span
                className="text-[9px] font-semibold uppercase tracking-wider text-[#818cf8]"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                Execution Plan
              </span>
            </div>

            <div className="space-y-1 text-[11px] text-[#CBD5E1]">
              {currentConfig.reusedSteps.map((step) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#34d399]/15 border border-[#34d399]/35 flex items-center justify-center flex-shrink-0">
                    <Check size={9} className="text-[#34d399]" />
                  </span>
                  <span className="text-[#94A3B8]">Reusing {step.toLowerCase()}</span>
                </div>
              ))}

              {currentConfig.generatedSteps.map((step) => (
                <div key={step} className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-[#6366F1]/20 border border-[#6366F1]/50 flex items-center justify-center flex-shrink-0">
                    <RefreshCw size={8} className="text-[#818cf8]" />
                  </span>
                  <span className="text-[#F8FAFC] font-medium">Generating new {step.toLowerCase()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Fixed Footer Action Buttons */}
        <div className="flex items-center gap-2.5 pt-3 border-t border-[#232334] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isCreating}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center border border-[#27273A] text-[#94A3B8] hover:bg-[#1E1E2E] hover:text-[#F8FAFC] cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating || !name.trim() || isOverLimit}
            className="flex-1 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-white shadow-lg cursor-pointer disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
            }}
          >
            {isCreating ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Launching...</span>
              </>
            ) : (
              <>
                <GitBranch size={13} />
                <span>Create Variant</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateVariantModal;
