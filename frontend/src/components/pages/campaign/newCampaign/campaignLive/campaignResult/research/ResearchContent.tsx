import React, { useState } from 'react';
import { Search, TrendingUp, ArrowUpRight, Compass, Users, Sparkles, Rocket, Workflow, AlertTriangle } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

interface ResearchContentProps {
  data?: any;
}

interface SourceMeta {
  url: string;
  title: string;
  domain: string;
  snippet: string;
  query_type: "market" | "competitor";
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

  const literasSources: SourceMeta[] = data?.literas_sources ?? data?.tavily_sources ?? [];
  const searchStatus = data?.search_status;
  const marketSources = literasSources.filter(s => s.query_type === 'market');
  const competitorSources = literasSources.filter(s => s.query_type === 'competitor');

  const [activeFilter, setActiveFilter] = useState<"all"|"market"|"competitor">("all");

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
                <p className="text-xl md:text-2xl font-bold tracking-tight group-hover:text-white transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif', color: '#DDDDE5' }}>{tam}</p>
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
                <p className="text-xl md:text-2xl font-bold tracking-tight group-hover:text-white transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif', color: '#DDDDE5' }}>{growthRate}</p>
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
          <div className="lg:col-span-2" style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4" style={{ background: '#111118', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '12px 16px', fontSize: '13px', color: '#8B8B9E', marginBottom: '1rem' }}>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg><strong style={{ color: '#F1F1F3', fontWeight: 500 }}>{literasSources.length}</strong> sources retrieved</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg><strong style={{ color: '#F1F1F3', fontWeight: 500 }}>{marketSources.length}</strong> market</span>
              <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 1v3"/><path d="M15 1v3"/><path d="M9 9h6"/><path d="M9 13h6"/></svg><strong style={{ color: '#F1F1F3', fontWeight: 500 }}>{competitorSources.length}</strong> competitor</span>
              <span className="sm:ml-auto" style={{ color: '#5A5A6E', fontSize: '12px' }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Live</span>
            </div>

            <div className="flex flex-wrap gap-1.5" style={{ marginBottom: '1rem' }}>
              {(["all", "market", "competitor"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  style={{
                    fontSize: '12px', padding: '5px 14px', borderRadius: '20px',
                    border: activeFilter === f ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(255,255,255,0.06)',
                    background: activeFilter === f ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                    color: activeFilter === f ? '#EDEDF5' : '#8B8B9E',
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f === "all" ? "All sources" : f === "market" ? "Market trends" : "Competitors"}
                </button>
              ))}
            </div>

            <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#5A5A6E', marginBottom: '0.75rem', fontFamily: 'Inter, sans-serif' }}>
              Real-time sources used
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {literasSources
                .filter(s => activeFilter === "all" || s.query_type === activeFilter)
                .map((src, i) => {
                  return (
                    <div
                      key={i}
                      style={{
                        background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px', padding: '14px 16px', fontFamily: 'Inter, sans-serif',
                        transition: 'border-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${src.domain}&sz=32`}
                          alt={src.domain}
                          style={{ width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, objectFit: 'contain' }}
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling;
                            if (fallback) (fallback as HTMLElement).style.display = 'flex';
                          }}
                        />
                        <span
                          style={{ display: 'none', width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0, background: '#1A1A24', border: '0.5px solid rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#8B8B9E' }}
                        >
                          {src.domain[0]?.toUpperCase()}
                        </span>
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 500, color: '#EDEDF5' }}>{src.domain}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#EDEDF5', lineHeight: 1.45, marginBottom: '8px' }}>{src.title}</div>
                      <div style={{
                        fontSize: '12px', color: '#8B8B9E', lineHeight: 1.55,
                        display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>{src.snippet}</div>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: '10px', paddingTop: '10px', borderTop: '0.5px solid rgba(255,255,255,0.06)',
                      }}>
                        <span style={{
                          fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 500,
                          border: '0.5px solid',
                          background: src.query_type === 'market' ? 'rgba(99,102,241,0.08)' : 'rgba(217,160,240,0.08)',
                          color: src.query_type === 'market' ? '#818CF8' : '#D9A0F0',
                          borderColor: src.query_type === 'market' ? 'rgba(129,140,248,0.15)' : 'rgba(217,160,240,0.15)',
                        }}>
                          {src.query_type === "market" ? "Market trend" : "Competitor"}
                        </span>
                        <a
                          href={src.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '12px', color: '#5A5A6E', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '3px' }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = '#818CF8'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = '#5A5A6E'; }}
                        >
                          Open
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle' }}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        </a>
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
