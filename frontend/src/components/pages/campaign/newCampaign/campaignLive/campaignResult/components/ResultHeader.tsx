import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Copy, Check, HelpCircle } from 'lucide-react';
import { useCampaignResultContext } from '../context/CampaignResultContext';
import { getStatusStyle, formatGoalLabel, formatIndustryLabel } from '../utils/campaignUtils';
import toast from 'react-hot-toast';

export const ResultHeader: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { campaign, campaignId, setShowVariantModal } = useCampaignResultContext();
  const [copiedId, setCopiedId] = useState(false);

  if (!campaign) return null;

  const statusStyle = getStatusStyle(campaign.status);
  const headerGoal = formatGoalLabel(campaign.primaryGoal);
  const headerIndustry = formatIndustryLabel(campaign.industry);

  const copyCampaignId = () => {
    if (!campaignId) return;
    navigator.clipboard.writeText(campaignId);
    setCopiedId(true);
    toast.success('Campaign ID copied to clipboard!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const whatsappMsg = `Hi AgentMark Support, I need help with my campaign "${campaign.name}" (ID: ${campaignId})`;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate(`/projects/${campaign.projectId}`)}
              className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition-all font-sora font-medium cursor-pointer bg-white/5 hover:bg-white/10 px-3 py-1 rounded-xl border border-white/10"
            >
              <span>← Back to Project</span>
            </button>
            
            <span
              className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase border cursor-help"
              title={`Campaign ID: ${campaignId}`}
              style={{
                backgroundColor: statusStyle.bg,
                borderColor: statusStyle.text + '40',
                color: statusStyle.text,
              }}
            >
              {statusStyle.label}
            </span>

            <button
              type="button"
              onClick={copyCampaignId}
              className="inline-flex items-center gap-1.5 text-xs text-[#94A3B8] hover:text-white transition-all font-mono cursor-pointer bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-xl border border-white/10"
              title="Click to copy full Campaign ID"
            >
              {copiedId ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} className="text-[#818CF8]" />}
              <span>{copiedId ? "Copied ID!" : `ID: ${campaignId?.slice(0, 8).toUpperCase()}...`}</span>
            </button>

            <a
              href={`https://wa.me/916366411798?text=${encodeURIComponent(whatsappMsg)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#25D366] hover:text-white transition-all font-sora font-medium cursor-pointer bg-[#25D366]/10 hover:bg-[#25D366]/20 px-2.5 py-1 rounded-xl border border-[#25D366]/30"
              title="Get Support on WhatsApp"
            >
              <HelpCircle size={12} />
              <span>Support</span>
            </a>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-sora text-white tracking-tight">
              {campaign.name}
            </h1>
            <p className="text-xs text-[#94A3B8] font-sans mt-0.5">
              {headerIndustry} • {headerGoal}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center flex items-center gap-2 relative">
          <button
            onClick={() => setShowVariantModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] cursor-pointer border-none"
          >
            <GitBranch size={14} />
            <span>Create Variant</span>
          </button>
        </div>
      </div>
    </div>
  );
});

