import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Download } from 'lucide-react';
import { useCampaignResultContext } from '../context/CampaignResultContext';
import { getStatusStyle, formatGoalLabel, formatIndustryLabel } from '../utils/campaignUtils';
import { downloadCampaignDeliverables } from '../../../../../../../utils/exportCampaignDeliverables';

export const ResultHeader: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const { campaign, campaignId, setShowVariantModal, creativeHooks, resolvedChannels, parsedCampaignOutputs } = useCampaignResultContext();
  const [showExportMenu, setShowExportMenu] = useState(false);

  if (!campaign) return null;

  const statusStyle = getStatusStyle(campaign.status);
  const headerGoal = formatGoalLabel(campaign.primaryGoal);
  const headerIndustry = formatIndustryLabel(campaign.industry);

  const handleExport = (format: 'json' | 'csv') => {
    const rawCamp = campaign as any;
    downloadCampaignDeliverables(
      {
        campaignName: campaign.name,
        brandName: rawCamp.brandName,
        industry: campaign.industry,
        primaryGoal: campaign.primaryGoal,
        copyVariants: resolvedChannels?.copyVariants,
        creativeHooks,
        imagePrompts: parsedCampaignOutputs?.imagePrompts || rawCamp.aiOutputs?.imagePrompts,
        aiOutputs: rawCamp.aiOutputs,
      },
      format
    );
    setShowExportMenu(false);
  };

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
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold font-sora transition-all border border-white/10 cursor-pointer"
            >
              <Download size={14} />
              <span>Export</span>
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-[#1A1A24] border border-[#2A2A38] rounded-xl shadow-xl z-50 py-1 font-sora text-xs">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-[#F1F1F3] hover:bg-[#2A2A38] transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-[#F1F1F3] hover:bg-[#2A2A38] transition-colors"
                >
                  Export JSON
                </button>
              </div>
            )}
          </div>
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

