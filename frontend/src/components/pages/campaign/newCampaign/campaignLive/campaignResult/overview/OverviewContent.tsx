import React from 'react';
import { Compass, Milestone, Users, Fingerprint, Network, Package, AlertTriangle, AlignLeft } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

interface OverviewContentProps {
  data?: any;
  campaign?: any;
}

const formatGoalLabel = (goal: string) => {
  const normalized = (goal || '').replace(/_/g, ' ').trim();
  if (!normalized) return 'Not specified';
  const lower = normalized.toLowerCase();
  if (lower === 'lead gen' || lower === 'lead_generation' || lower === 'lead generation' || lower === 'lead_gen') {
    return 'Lead Generation';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatIndustryLabel = (industry: string) => {
  const normalized = (industry || '').trim().toLowerCase();
  if (!normalized) return 'Not specified';
  const industryMap: Record<string, string> = {
    'saas': 'SaaS',
    'fintech': 'FinTech',
    'ai': 'AI',
    'ml': 'ML',
    'ios': 'iOS',
    'android': 'Android',
    'api': 'API',
    'b2b': 'B2B',
    'b2c': 'B2C',
  };
  if (industryMap[normalized]) return industryMap[normalized];
  return normalized
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatBrandVoice = (voice: string) => {
  const normalized = (voice || '').trim().toLowerCase();
  if (!normalized) return 'Not specified';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const OverviewContent: React.FC<OverviewContentProps> = ({ data, campaign }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  
  const campaignName = data?.campaign_name || campaign?.name || '';
  const brandName = campaign?.brandName || campaign?.brand_name || '';
  const industry = data?.industry || campaign?.industry || '';
  const primaryGoal = data?.primary_goal || campaign?.primaryGoal || '';
  const targetAudience = data?.target_audience || campaign?.targetAudience || '';
  const brandVoice = data?.brand_voice || campaign?.brandVoice || '';
  const channels = data?.channels || [];
  const deliverables = data?.deliverables || [];
  const displayGoal = formatGoalLabel(primaryGoal);
  const channelCards = channels.length > 0 ? channels : ['Not specified'];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center text-[#6366F1]">
                <Compass size={24} />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                Campaign Overview
              </h2>
            </div>
            <p className="text-sm md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#B8B8D1' }}>
              Strategic campaign foundation and execution plan
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full bg-[#111118] border border-[#2A2A38] text-xs md:text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
              Manager Agent
            </span>
          </div>
        </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 mb-6">
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
            <AlertTriangle size={16} className="inline-block mr-2 text-[#F59E0B]" />
            No manager data available yet. This will be populated after AI manager agent completes analysis.
          </p>
        </div>
      )}

      {/* Campaign Identity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-elevate bg-gradient-to-br from-[#6366F1]/10 to-transparent border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Fingerprint size={20} className="text-[#6366F1]" />
            Campaign Identity
          </h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Campaign Name</span>
              <p className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>{campaignName || 'Untitled Campaign'}</p>
            </div>
            <div>
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Brand Name</span>
              <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{brandName || 'Not specified'}</p>
            </div>
            <div>
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Industry</span>
              <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{formatIndustryLabel(industry)}</p>
            </div>
          </div>
        </div>

        <div className="card-elevate-green bg-gradient-to-br from-[#4edea3]/10 to-transparent border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Milestone size={20} className="text-[#4edea3]" />
            Campaign Objectives
          </h3>
          <div className="space-y-4">
            <div>
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Primary Goal</span>
              <p className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{displayGoal}</p>
            </div>
            {brandVoice && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Brand Voice</span>
              <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{formatBrandVoice(brandVoice)}</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Target Audience */}
      {targetAudience && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Users size={20} className="text-[#6366F1]" />
            Target Audience
          </h3>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
            {targetAudience}
          </p>
        </div>
      )}

      {/* Additional Context */}
      {campaign.additionalInfo && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <AlignLeft size={20} className="text-[#6366F1]" />
            Additional Context
          </h3>
          <p className="text-base leading-relaxed whitespace-pre-wrap" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
            {campaign.additionalInfo}
          </p>
        </div>
      )}

      {/* Recommended Channels */}
      {channelCards.length > 0 && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Network size={20} className="text-[#6366F1]" />
            Recommended Distribution Channels
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {channelCards.map((channel: string, idx: number) => (
              <div key={idx} className="px-4 py-3 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center gap-2 min-h-[56px]">
                <ChannelIcon channel={channel} size={16} className="text-[#6366F1] flex-shrink-0" />
                <span className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
                  {channel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables */}
      {deliverables.length > 0 && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Package size={20} className="text-[#6366F1]" />
            Campaign Deliverables
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deliverables.map((deliverable: string, idx: number) => (
              <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] flex-shrink-0 text-sm font-bold">
                  {idx + 1}
                </span>
                <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                  {deliverable}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Campaign Summary Card */}
      <div className="card-elevate bg-gradient-to-r from-[#6366F1]/5 via-[#4edea3]/5 to-transparent border border-[#2A2A38] rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
          Campaign Summary
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Channels</span>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>
              {channels.length || 0}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Deliverables</span>
            <p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>
              {deliverables.length || 0}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Industry</span>
            <p className="text-base font-medium mt-1" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              {formatIndustryLabel(industry)}
            </p>
          </div>
          <div>
            <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Goal Type</span>
            <p className="text-base font-medium mt-1" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              {displayGoal}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OverviewContent);
