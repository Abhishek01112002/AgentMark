import React from 'react';
import { Search, TrendingUp, ArrowUpRight, Compass, Users, Sparkles, Rocket, Workflow, AlertTriangle } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

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
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center text-[#6366F1]">
              <Search size={22} />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              Research - AgentMark
            </h2>
          </div>
          <p className="text-sm text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
            {hasRealData ? 'AI-powered market intelligence and audience insights' : 'Real-time market intelligence powered by autonomous agents.'}
          </p>
        </div>
      </div>

      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 mb-6 shadow-sm">
          <p className="text-sm flex items-center gap-2.5 text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0" />
            No research data available yet. This will be populated after AI agents complete analysis.
          </p>
        </div>
      )}

      {/* Market Overview Cards */}
      {(tam || growthRate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {tam && (
            <div className="card-elevate relative bg-[#111118] border border-[#2A2A38] rounded-xl overflow-hidden hover:border-[#6366F1]/30 transition-colors shadow-lg group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1]/40 via-[#6366F1] to-[#6366F1]/40" />
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-[0.12em] text-[#6366F1]/70">TAM</span>
                </div>
                <h4 className="text-xs font-medium text-[#8B8B9E] mb-1.5">Total Addressable Market</h4>
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Inter, sans-serif' }}>{tam}</p>
              </div>
            </div>
          )}
          {growthRate && (
            <div className="card-elevate relative bg-[#111118] border border-[#2A2A38] rounded-xl overflow-hidden hover:border-[#4edea3]/30 transition-colors shadow-lg group">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4edea3]/40 via-[#4edea3] to-[#4edea3]/40" />
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
                  <span className="text-[10px] uppercase font-semibold tracking-[0.12em] text-[#4edea3]/70">CAGR</span>
                </div>
                <h4 className="text-xs font-medium text-[#8B8B9E] mb-1.5">Market Growth Rate</h4>
                <p className="text-2xl md:text-3xl font-bold tracking-tight text-white" style={{ fontFamily: 'Inter, sans-serif' }}>{growthRate}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Market Trends */}
        <div className="card-elevate rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <TrendingUp size={20} className="text-[#6366F1]" />
            Market Trends
          </h3>
          <ul className="space-y-4">
            {(Array.isArray(marketTrends) && marketTrends.length > 0 ? marketTrends : [
              { title: 'AI Automation Integration', desc: 'High adoption in enterprise workflows reducing operational drag.' },
              { title: 'Zero-Party Data Collection', desc: 'Shift towards direct consumer engagement for privacy compliance.' },
              { title: 'Hyper-Personalization', desc: 'Dynamic content generation based on real-time user behavior.' },
            ]).slice(0, 5).map((trend: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3 group">
                <ArrowUpRight size={18} className="text-[#6366F1] mt-0.5 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold mb-1 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {trend.title || trend.name || trend}
                  </h4>
                  {trend.desc && (
                    <p className="text-sm leading-relaxed text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {trend.desc || trend.description}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Competitor Analysis */}
        <div className="card-elevate rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Compass size={20} className="text-[#6366F1]" />
            Competitor Analysis
          </h3>
          <div className="space-y-4">
            {competitors.length > 0 && (
              <div>
                <h4 className="text-xs uppercase mb-2 font-semibold tracking-wider text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>Top Competitors</h4>
                <div className="flex flex-wrap gap-2">
                  {competitors.map((comp: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs font-medium text-[#F1F1F3] hover:border-[#6366F1]/50 hover:bg-[#1A1A24]/75 transition-all duration-200" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {differentiationOpp && (
              <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  <Sparkles size={16} className="text-[#4edea3]" />
                  Differentiation Opportunity
                </h4>
                <p className="text-sm leading-relaxed text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {differentiationOpp}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Audience Insights (Full Width) */}
        <div className="card-elevate rounded-xl p-5 md:p-6 lg:col-span-2" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Users size={20} className="text-[#6366F1]" />
            Audience Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {/* Pain Points */}
            <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
              <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8B8B9E] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Pain Points
              </h4>
              <ul className="space-y-2">
                {(audienceInsights.pain_points || audienceInsights.painPoints || ['Time scarcity', 'Data silos', 'Inconsistent ROI']).slice(0, 4).map((point: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2.5 text-sm text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Motivations */}
            <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
              <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8B8B9E] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Motivations
              </h4>
              <ul className="space-y-2">
                {(audienceInsights.motivations || ['Workflow automation', 'Predictable growth']).slice(0, 4).map((motivation: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2.5 text-sm text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] flex-shrink-0" />
                    {motivation}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preferred Channels */}
            <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
              <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8B8B9E] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Preferred Channels
              </h4>
              <div className="flex flex-wrap gap-2">
                {(audienceInsights.preferred_channels || audienceInsights.channels || ['LinkedIn', 'Email', 'Twitter']).slice(0, 5).map((channel: string, idx: number) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs font-medium text-[#8B8B9E] hover:border-[#6366F1]/30 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <ChannelIcon channel={channel} size={12} className="text-[#6366F1]" />
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            {/* Language Style */}
            <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
              <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8B8B9E] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Language Style
              </h4>
              <p className="text-sm leading-relaxed text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {audienceInsights.language_style || audienceInsights.languageStyle || 'Professional, data-driven, concise, focusing on outcomes and efficiency.'}
              </p>
            </div>
          </div>
        </div>

        {/* Market Opportunities */}
        {marketOpportunities.length > 0 && (
          <div className="card-elevate-green rounded-xl p-5 md:p-6 lg:col-span-2" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Rocket size={20} className="text-[#6366F1]" />
              Market Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketOpportunities.map((opp: string, idx: number) => (
                <div key={idx} className="card-elevate bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4 md:p-5 flex items-start gap-3 hover:border-[#4edea3]/30 transition-all duration-200">
                  <span className="w-6 h-6 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] flex-shrink-0 text-xs font-bold shadow-inner">{idx + 1}</span>
                  <p className="text-sm leading-relaxed text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>{opp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Strategic Approach */}
        {recommendedApproach && (
          <div className="card-elevate rounded-xl p-5 md:p-6 lg:col-span-2" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Workflow size={20} className="text-[#6366F1]" />
              Recommended Strategic Approach
            </h3>
            <div className="card-elevate bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-5 md:p-6">
              <p className="text-sm md:text-base leading-relaxed text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                {recommendedApproach}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ResearchContent);
