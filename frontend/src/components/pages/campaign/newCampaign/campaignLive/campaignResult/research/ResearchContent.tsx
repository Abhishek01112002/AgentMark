import React from 'react';
import { Search, TrendingUp, ArrowUpRight, Compass, Users, Sparkles, Rocket, Workflow, AlertTriangle } from 'lucide-react';

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 fade-in">
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
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 hover:border-[#6366F1]/30 transition-colors shadow-lg">
              <h4 className="text-xs uppercase mb-2 font-semibold tracking-wider text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>Total Addressable Market</h4>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-[#6366F1]" style={{ fontFamily: 'Inter, sans-serif' }}>{tam}</p>
            </div>
          )}
          {growthRate && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 hover:border-[#4edea3]/30 transition-colors shadow-lg">
              <h4 className="text-xs uppercase mb-2 font-semibold tracking-wider text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>Market Growth Rate</h4>
              <p className="text-2xl md:text-3xl font-bold tracking-tight text-[#4edea3]" style={{ fontFamily: 'Inter, sans-serif' }}>{growthRate}</p>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Market Trends */}
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all shadow-lg" style={{ animationDelay: '0.1s', background: '#111118', border: '1px solid #2A2A38' }}>
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
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all shadow-lg" style={{ animationDelay: '0.2s', background: '#111118', border: '1px solid #2A2A38' }}>
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
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
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
        <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all shadow-lg" style={{ animationDelay: '0.3s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg font-semibold mb-5 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Users size={20} className="text-[#6366F1]" />
            Audience Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {/* Pain Points */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
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
            <div className="bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
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
            <div className="bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
              <h4 className="text-xs uppercase font-semibold tracking-wider text-[#8B8B9E] mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
                Preferred Channels
              </h4>
              <div className="flex flex-wrap gap-2">
                {(audienceInsights.preferred_channels || audienceInsights.channels || ['LinkedIn', 'Email', 'Twitter']).slice(0, 5).map((channel: string, idx: number) => (
                  <span key={idx} className="px-2.5 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs font-medium text-[#8B8B9E] hover:border-[#6366F1]/30 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            {/* Language Style */}
            <div className="bg-[#0A0A0F] border border-[#2A2A38]/50 rounded-xl p-4 md:p-5">
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
          <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all shadow-lg" style={{ animationDelay: '0.4s', background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Rocket size={20} className="text-[#6366F1]" />
              Market Opportunities
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {marketOpportunities.map((opp: string, idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-4 md:p-5 flex items-start gap-3 hover:border-[#4edea3]/30 transition-all duration-200">
                  <span className="w-6 h-6 rounded-full bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3] flex-shrink-0 text-xs font-bold shadow-inner">{idx + 1}</span>
                  <p className="text-sm leading-relaxed text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>{opp}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Strategic Approach */}
        {recommendedApproach && (
          <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all shadow-lg" style={{ animationDelay: '0.5s', background: '#111118', border: '1px solid #2A2A38' }}>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <Workflow size={20} className="text-[#6366F1]" />
              Recommended Strategic Approach
            </h3>
            <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-5 md:p-6">
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

export default ResearchContent;
