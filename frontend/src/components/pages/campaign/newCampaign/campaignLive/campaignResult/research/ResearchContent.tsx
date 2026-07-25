import React, { useState } from 'react';
import { Search, TrendingUp, ArrowUpRight, Compass, Users, Rocket, Workflow, AlertTriangle } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

interface ResearchContentProps {
  data?: any;
  campaign?: any;
}

interface SourceMeta {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  query_type: "market" | "competitor";
}

const ResearchContent: React.FC<ResearchContentProps> = ({ data }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  

  // Extract data from AI output
  const marketAnalysis = data?.market_analysis || {};
  const competitorAnalysis = data?.competitor_analysis || {};
  const audienceInsights = data?.audience_insights || {};
  const marketOpportunities = data?.market_opportunities || [];
  const recommendedApproach = data?.recommended_approach || '';

  const literasSources: SourceMeta[] = data?.literas_sources ?? data?.tavily_sources ?? [];
  const searchStatus = data?.search_status;
  const marketSources = literasSources.filter(s => s.query_type === 'market');
  const competitorSources = literasSources.filter(s => s.query_type === 'competitor');

  const [activeFilter, setActiveFilter] = useState<"all"|"market"|"competitor">("all");

  const marketTrends = (Array.isArray(marketAnalysis?.market_trends) && marketAnalysis.market_trends.length > 0)
    ? marketAnalysis.market_trends
    : [
        { title: 'AI Automation Integration', desc: 'High adoption in enterprise workflows reducing operational drag.' },
        { title: 'Zero-Party Data Collection', desc: 'Shift towards direct consumer engagement for privacy compliance.' },
        { title: 'Hyper-Personalization', desc: 'Dynamic content generation based on real-time user behavior.' },
      ];
  const tam = marketAnalysis?.total_addressable_market || '$14.2B Global TAM';
  const growthRate = marketAnalysis?.growth_rate || '18.5% YoY';

  const rawCompetitors = competitorAnalysis?.top_competitors || competitorAnalysis?.competitors;
  const competitors = (Array.isArray(rawCompetitors) && rawCompetitors.length > 0)
    ? rawCompetitors.map((c: any) => typeof c === 'string' ? c : (c.name ? `${c.name}: ${c.positioning || ''}` : JSON.stringify(c)))
    : [
        'Market Leader Alpha: Dominant enterprise market share with legacy pricing models',
        'Innovator Beta: High-speed agile platform with rapid feature deployment',
        'Enterprise Gamma: Deep security compliance with complex integration setup'
      ];

  const differentiationOpp = competitorAnalysis?.differentiation_opportunity || 'Positioning through autonomous multi-agent speed, real-time ROI tracking, and zero-code workflow setup.';

  const painPoints = (Array.isArray(audienceInsights?.pain_points) && audienceInsights.pain_points.length > 0)
    ? audienceInsights.pain_points
    : (Array.isArray(audienceInsights?.painPoints) && audienceInsights.painPoints.length > 0)
    ? audienceInsights.painPoints
    : ['High operational overhead & manual workflow friction', 'Data silos across marketing execution channels', 'Inconsistent campaign ROI tracking'];

  const motivations = (Array.isArray(audienceInsights?.motivations) && audienceInsights.motivations.length > 0)
    ? audienceInsights.motivations
    : ['Workflow automation and instant time-to-market', 'Predictable pipeline growth & revenue attribution'];

  const preferredChannels = (Array.isArray(audienceInsights?.preferred_channels) && audienceInsights.preferred_channels.length > 0)
    ? audienceInsights.preferred_channels
    : (Array.isArray(audienceInsights?.channels) && audienceInsights.channels.length > 0)
    ? audienceInsights.channels
    : ['LinkedIn', 'Email', 'Google Ads'];

  const languageStyle = audienceInsights?.language_style || audienceInsights?.languageStyle || 'Professional, data-driven, concise, focusing on outcomes and efficiency.';




  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center">
                <Search size={22} className="text-cyan-400 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Market Research</h2>
            </div>
            <p className="text-sm md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              {hasRealData ? 'AI-powered market intelligence and audience insights' : 'Real-time market intelligence powered by autonomous agents.'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
              Goal: RESEARCH
            </span>
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
            <div className="group relative bg-gradient-to-br from-[#14141C] to-[#0E0E16] border border-[#2A2A38] rounded-xl overflow-hidden hover:border-[#6366F1]/30 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] hover:scale-[1.015] transition-all duration-400 shadow-[0_0_20px_rgba(99,102,241,0.06)]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(600px circle at 50% -20%, rgba(99,102,241,0.08), transparent)' }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[#6366F1]/20 via-[#6366F1]/80 to-[#6366F1]/20" />
              <div className="relative p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center group-hover:bg-[#6366F1]/15 group-hover:scale-110 transition-all duration-300">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 18V6"/></svg>
                  </div>
                  <span className="text-[9px] uppercase font-semibold tracking-[0.12em] text-[#6366F1]/60">TAM</span>
                </div>
                <h4 className="text-xs font-medium text-[#7A7A8E] mb-1.5">Total Addressable Market</h4>
                <p className="text-base md:text-lg font-bold tracking-tight group-hover:text-white transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif', color: '#DDDDE5' }}>{tam}</p>
              </div>
            </div>
          )}
          {growthRate && (
            <div className="group relative bg-gradient-to-br from-[#14141C] to-[#0E0E16] border border-[#2A2A38] rounded-xl overflow-hidden hover:border-[#4edea3]/30 hover:shadow-[0_0_30px_rgba(78,222,163,0.15)] hover:scale-[1.015] transition-all duration-400 shadow-[0_0_20px_rgba(78,222,163,0.06)]">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'radial-gradient(600px circle at 50% -20%, rgba(78,222,163,0.08), transparent)' }} />
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-[#4edea3]/20 via-[#4edea3]/80 to-[#4edea3]/20" />
              <div className="relative p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-6 h-6 rounded-md bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center justify-center group-hover:bg-[#4edea3]/15 group-hover:scale-110 transition-all duration-300">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  </div>
                  <span className="text-[9px] uppercase font-semibold tracking-[0.12em] text-[#4edea3]/60">CAGR</span>
                </div>
                <h4 className="text-xs font-medium text-[#7A7A8E] mb-1.5">Market Growth Rate</h4>
                <p className="text-base md:text-lg font-bold tracking-tight group-hover:text-white transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif', color: '#DDDDE5' }}>{growthRate}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Market Trends */}
        <div className="card-elevate rounded-xl p-5 md:p-6 relative overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#0EA5E9] to-transparent" />
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <TrendingUp size={20} className="text-[#0EA5E9]" />
            Market Trends
          </h3>
          <ul className="space-y-4">
            {(Array.isArray(marketTrends) && marketTrends.length > 0 ? marketTrends : [
              { title: 'AI Automation Integration', desc: 'High adoption in enterprise workflows reducing operational drag.' },
              { title: 'Zero-Party Data Collection', desc: 'Shift towards direct consumer engagement for privacy compliance.' },
              { title: 'Hyper-Personalization', desc: 'Dynamic content generation based on real-time user behavior.' },
            ]).slice(0, 5).map((trend: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3 group">
                <ArrowUpRight size={18} className="text-[#0EA5E9] mt-0.5 flex-shrink-0 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
        <div className="card-elevate rounded-xl p-5 md:p-6 relative overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#F43F5E] to-transparent" />
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2.5 text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
            <Compass size={20} className="text-[#F43F5E]" />
            Competitor Landscape
          </h3>
          <div className="space-y-4">
            {competitors.length > 0 && (
              <div>
                <div className="space-y-2.5">
                  {competitors.slice(0, 4).map((comp: string, idx: number) => {
                    const colonIndex = comp.indexOf(':');
                    let name = comp;
                    let positioning = "";
                    let weakness = "";

                    if (colonIndex !== -1) {
                      name = comp.substring(0, colonIndex).trim();
                      const details = comp.substring(colonIndex + 1).trim();
                      
                      const weaknessKeywords = ["key weakness of", "key weakness is", "weakness of", "weakness:", "weakness is"];
                      positioning = details;
                      
                      for (const kw of weaknessKeywords) {
                        const wIdx = details.toLowerCase().indexOf(kw);
                        if (wIdx !== -1) {
                          positioning = details.substring(0, wIdx).replace(/,?\s*with\s*a\s*$/, "").trim();
                          weakness = details.substring(wIdx + kw.length).trim();
                          weakness = weakness.charAt(0).toUpperCase() + weakness.slice(1);
                          break;
                        }
                      }
                    }

                    // Dynamically resolve brand avatar colors
                    const brandColors = [
                      { bg: 'bg-[#6366F1]/10', text: 'text-[#818CF8]', border: 'border-[#6366F1]/20' },
                      { bg: 'bg-[#EC4899]/10', text: 'text-[#F472B6]', border: 'border-[#EC4899]/20' },
                      { bg: 'bg-[#3B82F6]/10', text: 'text-[#60A5FA]', border: 'border-[#3B82F6]/20' },
                      { bg: 'bg-[#10B981]/10', text: 'text-[#34D399]', border: 'border-[#10B981]/20' },
                      { bg: 'bg-[#F59E0B]/10', text: 'text-[#FBBF24]', border: 'border-[#F59E0B]/20' },
                    ];
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
                    const colorStyle = brandColors[hash % brandColors.length];

                    return (
                      <div 
                        key={idx} 
                        className="group flex items-start gap-3 p-2 rounded-lg border border-[#1E1E2A] bg-[#0C0C12] hover:bg-[#0E0E16] hover:border-[#6366F1]/30 transition-all duration-300 shadow-sm"
                      >
                        {/* Competitor Logo Avatar */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 border ${colorStyle.bg} ${colorStyle.text} ${colorStyle.border} mt-0.5`}>
                          {name.charAt(0)}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <h5 className="text-xs font-bold text-[#F1F1F3] tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
                              {name}
                            </h5>
                            {weakness && (
                              <div className="px-1.5 py-0.5 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/15 text-[9px] font-bold text-[#FDA4AF] uppercase tracking-wider">
                                Weakness
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-0.5 text-[11px] leading-relaxed">
                            {positioning && (
                              <p className="text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                <span className="text-[#DDDDE5] font-medium mr-1">Position:</span>
                                {positioning}
                              </p>
                            )}
                            {weakness && (
                              <p className="text-[#FDA4AF]" style={{ fontFamily: 'Inter, sans-serif' }}>
                                <span className="text-[#F1F1F3] font-medium mr-1">Weakness:</span>
                                {weakness}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {differentiationOpp && (
              <div className="mt-4 p-3 rounded-lg bg-[#F43F5E]/5 border border-[#F43F5E]/15">
                <span className="text-xs font-semibold text-[#FDA4AF] block mb-1">Differentiation Opportunity</span>
                <p className="text-xs text-[#DDDDE5] leading-relaxed">{differentiationOpp}</p>
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
                {painPoints.slice(0, 5).map((point: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] flex-shrink-0 mt-[7px]" />
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
                {motivations.slice(0, 5).map((motivation: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm text-[#F1F1F3]" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] flex-shrink-0 mt-[7px]" />
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
                {preferredChannels.slice(0, 5).map((channel: string, idx: number) => (
                  <span key={idx} className="inline-flex items-start gap-1.5 px-2.5 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs font-medium text-[#8B8B9E] hover:border-[#6366F1]/30 transition-colors" style={{ fontFamily: 'Inter, sans-serif' }}>
                    <ChannelIcon channel={channel} size={12} className="text-[#6366F1] mt-[2px] flex-shrink-0" />
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
                {languageStyle}
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

        {/* Tavily/LiteRAG Sources */}
        {hasRealData && literasSources.length === 0 && searchStatus && (
          <div className="lg:col-span-2 rounded-xl p-4 md:p-5" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="text-[#F59E0B] mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-[#F1F1F3] mb-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Tavily sources unavailable
                </h3>
                <p className="text-sm text-[#8B8B9E]" style={{ fontFamily: 'Inter, sans-serif' }}>
                  {searchStatus.enabled
                    ? (searchStatus.queries?.find((q: any) => q.error)?.error || 'Search completed but returned no source URLs.')
                    : 'TAVILY_API_KEY is not configured for the AI service.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tavily/LiteRAG Sources */}
        {literasSources.length > 0 && (
          <div className="lg:col-span-2" style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: 'none', position: 'relative' }}>
            {/* Gradient divider */}
            <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.15), rgba(129,140,248,0.25), rgba(99,102,241,0.15), transparent)' }} />

            {/* Section Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.22), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.18)', boxShadow: '0 2px 8px rgba(99,102,241,0.08)' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ fontFamily: "'Sora', sans-serif", color: '#F1F1F3' }}>Web Sources</h3>
                  <p style={{ fontSize: 11, color: '#6B6B80', fontFamily: "'Inter', sans-serif", marginTop: 1 }}>Real-time search results from Tavily</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, background: 'linear-gradient(135deg, rgba(78,222,163,0.08), rgba(78,222,163,0.03))', border: '1px solid rgba(78,222,163,0.15)', boxShadow: '0 0 12px rgba(78,222,163,0.04)' }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#4edea3' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#4edea3', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.02em' }}>Live</span>
              </div>
            </div>

            {/* Summary + Filter bar — glass-style card */}
            <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 18px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px 24px', boxShadow: '0 1px 20px rgba(0,0,0,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <span style={{ fontSize: 12, color: '#8B8B9E', fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em' }}><strong style={{ color: '#F1F1F3', fontWeight: 600 }}>{literasSources.length}</strong> Total</span>
                </div>
                <div style={{ width: 1, height: 14, background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                  <span style={{ fontSize: 12, color: '#8B8B9E', fontFamily: "'Inter', sans-serif" }}><strong style={{ color: '#818CF8', fontWeight: 600 }}>{marketSources.length}</strong> Market</span>
                </div>
                <div style={{ width: 1, height: 14, background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 9h6"/><path d="M9 13h6"/></svg>
                  <span style={{ fontSize: 12, color: '#8B8B9E', fontFamily: "'Inter', sans-serif" }}><strong style={{ color: '#A78BFA', fontWeight: 600 }}>{competitorSources.length}</strong> Competitor</span>
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, padding: 3, background: 'rgba(0,0,0,0.2)', borderRadius: 9, border: '1px solid rgba(255,255,255,0.03)' }}>
                {(["all", "market", "competitor"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: activeFilter === f ? 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(129,140,248,0.1))' : 'transparent',
                      color: activeFilter === f ? '#E0E7FF' : '#6B6B80',
                      fontFamily: "'Inter', sans-serif", fontSize: 11.5, fontWeight: 500,
                      transition: 'all 0.25s ease',
                      whiteSpace: 'nowrap',
                      boxShadow: activeFilter === f ? '0 1px 4px rgba(99,102,241,0.15)' : 'none',
                    }}
                  >
                    {f === "all" ? "All" : f === "market" ? "Market" : "Competitor"}
                  </button>
                ))}
              </div>
            </div>

            {/* Source Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {literasSources
                .filter(s => activeFilter === "all" || s.query_type === activeFilter)
                .map((src, i) => {
                  const isMarket = src.query_type === "market";
                  const accentColor = isMarket ? '#818CF8' : '#A78BFA';
                  const accentBg = isMarket ? 'rgba(99,102,241,0.05)' : 'rgba(124,58,237,0.05)';
                  const accentBorder = isMarket ? 'rgba(99,102,241,0.12)' : 'rgba(124,58,237,0.12)';

                  return (
                    <div
                      key={i}
                      className="group relative overflow-hidden transition-all duration-300"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        padding: '18px 20px',
                        fontFamily: "'Inter', sans-serif",
                        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
                      }}
                    >
                      {/* Top accent line */}
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${accentColor}, transparent)`, opacity: 0.7 }} />
                      
                      {/* Hover glow + elevation */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-500" style={{ background: `radial-gradient(500px circle at 50% -20%, ${accentColor}10, transparent)`, borderRadius: 14 }} />
                      <div className="absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[14px]" style={{ boxShadow: `0 8px 30px ${accentColor}08`, pointerEvents: 'none' }} />

                      <div className="relative" style={{ transform: 'translateZ(0)' }}>
                        {/* Header: favicon + domain + type badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ position: 'relative', width: 26, height: 26, flexShrink: 0 }}>
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`}
                              alt={src.domain}
                              style={{ width: 26, height: 26, borderRadius: 7, objectFit: 'contain' }}
                              onError={(e) => {
                                const target = e.currentTarget;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling;
                                if (fallback) (fallback as HTMLElement).style.display = 'flex';
                              }}
                            />
                            <span
                              style={{ display: 'none', width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`, border: `1px solid ${accentBorder}`, alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: accentColor, position: 'absolute', top: 0, left: 0 }}
                            >
                              {src.domain[0]?.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 500, color: '#B0B0C0', flex: 1 }}>{src.domain}</span>
                          <span style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 6, fontWeight: 600, letterSpacing: '0.03em',
                            background: accentBg,
                            color: accentColor,
                            border: `1px solid ${accentBorder}`,
                            whiteSpace: 'nowrap',
                          }}>
                            {isMarket ? 'Market' : 'Competitor'}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 style={{
                          fontSize: 14, fontWeight: 600, color: '#EDEDF5', lineHeight: 1.4, marginBottom: 8,
                          fontFamily: "'Sora', sans-serif",
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}>
                          {src.title}
                        </h4>

                        {/* Snippet */}
                        <p style={{
                          fontSize: 12.5, color: '#7A7A8E', lineHeight: 1.55,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                          marginBottom: 14,
                        }}>
                          {src.snippet}
                        </p>

                        {/* Footer: open link */}
                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#5A5A6E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 6h.01M6 18h.01"/></svg>
                            <span style={{ fontSize: 10, color: '#5A5A6E', fontFamily: "'JetBrains Mono', monospace" }}>{(() => { try { return new URL(src.url).hostname.replace('www.', ''); } catch { return src.domain; } })()}</span>
                          </div>
                          <a
                            href={src.url} target="_blank" rel="noopener noreferrer"
                            style={{
                              fontSize: 11.5, fontWeight: 500, color: '#6B6B80', textDecoration: 'none',
                              display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 6,
                              transition: 'all 0.2s ease',
                              border: '1px solid transparent',
                            }}
                            className="hover:border-[rgba(99,102,241,0.15)] hover:bg-[rgba(99,102,241,0.04)] hover:text-[#818CF8]"
                          >
                            Open
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ResearchContent);
