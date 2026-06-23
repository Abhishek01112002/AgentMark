import React from 'react';
import { TrendingUp, Users, Target, AlertTriangle } from 'lucide-react';

interface ResearchContentProps {
  data?: any;
}

const ResearchContent: React.FC<ResearchContentProps> = ({ data }) => {
  // Use real data if available, otherwise show placeholder
  const hasRealData = data && Object.keys(data).length > 0;
  
  // Extract data from AI output
  const marketAnalysis = data?.market_analysis || {};
  const competitorAnalysis = data?.competitor_analysis || {};
  const audienceInsights = data?.audience_insights || {};
  const marketOpportunities = data?.market_opportunities || [];
  const recommendedApproach = data?.recommended_approach || '';

  const marketTrends = marketAnalysis?.market_trends || [];
  const tam = marketAnalysis?.total_addressable_market || '';
  const growthRate = marketAnalysis?.growth_rate || '';
  const competitors = competitorAnalysis?.top_competitors || [];
  const differentiationOpp = competitorAnalysis?.differentiation_opportunity || '';

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center text-[#6366F1]">
              <Target size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Research - AgentMark
            </h2>
          </div>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#A0A0D2' }}>
            {hasRealData ? 'AI-powered market intelligence and audience insights' : 'Real-time market intelligence powered by autonomous agents.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#111118] border border-[#2A2A38] text-xs md:text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
            GPT-4o-mini
          </span>
        </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 mb-6">
            <p className="text-sm flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0" />
            No research data available yet. This will be populated after AI agents complete analysis.
          </p>
        </div>
      )}

      {/* Market Overview Cards */}
      {(tam || growthRate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {tam && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-xs uppercase mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Total Addressable Market</h4>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#6366F1' }}>{tam}</p>
            </div>
          )}
          {growthRate && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <h4 className="text-xs uppercase mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Market Growth Rate</h4>
              <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>{growthRate}</p>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Trends */}
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all" style={{ animationDelay: '0.1s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <TrendingUp size={20} className="text-[#6366F1]" />
            Market Trends
          </h3>
          <ul className="space-y-4">
            {(Array.isArray(marketTrends) && marketTrends.length > 0 ? marketTrends : [
              { title: 'AI Automation Integration', desc: 'High adoption in enterprise workflows reducing operational drag.' },
              { title: 'Zero-Party Data Collection', desc: 'Shift towards direct consumer engagement for privacy compliance.' },
              { title: 'Hyper-Personalization', desc: 'Dynamic content generation based on real-time user behavior.' },
            ]).slice(0, 5).map((trend: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3">
                <TrendingUp size={18} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                    {trend.title || trend.name || trend}
                  </h4>
                  {trend.desc && (
                    <p className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
                      {trend.desc || trend.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Competitor Analysis */}
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all" style={{ animationDelay: '0.2s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Target size={20} className="text-[#6366F1]" />
            Competitor Analysis
          </h3>
          <div className="space-y-4">
            {competitors.length > 0 && (
              <div className="mb-4">
                <h4 className="text-xs uppercase mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Top Competitors</h4>
                <div className="flex flex-wrap gap-2">
                  {competitors.map((comp: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {differentiationOpp && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                  <Target size={16} className="text-[#4edea3]" />
                  Differentiation Opportunity
                </h4>
                <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  {differentiationOpp}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Audience Insights (Full Width) */}
        <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all" style={{ animationDelay: '0.3s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Users size={20} className="text-[#6366F1]" />
            Audience Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pain Points */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4">
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Pain Points
              </h4>
              <ul className="space-y-2">
                {(audienceInsights.pain_points || audienceInsights.painPoints || ['Time scarcity', 'Data silos', 'Inconsistent ROI']).slice(0, 4).map((point: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E] flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Motivations */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4">
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Motivations
              </h4>
              <ul className="space-y-2">
                {(audienceInsights.motivations || ['Workflow automation', 'Predictable growth']).slice(0, 4).map((motivation: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
                    <span className="w-3 h-3 rounded-full bg-[#4edea3] flex-shrink-0" />
                    {motivation}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preferred Channels */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4">
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Preferred Channels
              </h4>
              <div className="flex flex-wrap gap-2">
                {(audienceInsights.preferred_channels || audienceInsights.channels || ['LinkedIn', 'Email', 'Twitter']).slice(0, 5).map((channel: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            {/* Language Style */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4">
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Language Style
              </h4>
              <p className="text-xs leading-relaxed" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
                {audienceInsights.language_style || audienceInsights.languageStyle || 'Professional, data-driven, concise, focusing on outcomes and efficiency.'}
              </p>
            </div>
          </div>
        </div>

        {/* Market Opportunities */}
        {marketOpportunities.length > 0 && (
          <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all" style={{ animationDelay: '0.4s', background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <TrendingUp size={20} className="text-[#6366F1]" />
              Market Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketOpportunities.map((opp: string, idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] flex-shrink-0 text-sm font-bold">{idx + 1}</span>
                  <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{opp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Strategic Approach */}
        {recommendedApproach && (
          <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all" style={{ animationDelay: '0.5s', background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg md:text-xl mb-4 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Target size={20} className="text-[#6366F1]" />
              Recommended Strategic Approach
            </h3>
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
              <p className="text-base leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                {recommendedApproach}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResearchContent;
