import React from 'react';
import { Lightbulb, Calendar, PlayCircle, FileDown, Briefcase, Mail, Target, AlertTriangle } from 'lucide-react';

interface StrategyContentProps {
  data?: any;
}

const StrategyContent: React.FC<StrategyContentProps> = ({ data }) => {
  const hasRealData = data && Object.keys(data).length > 0;

  // Extract data from AI output
  const positioning = data?.positioning || '';
  const keyMessages = data?.key_messages || [];
  const contentPillars = data?.content_pillars || [];
  const channelStrategy = data?.channel_strategy || {};
  const audienceSegments = data?.audience_segments || [];
  const timeline = data?.timeline || {};
  const successMetrics = data?.success_metrics || {};
  const competitiveDiff = data?.competitive_differentiation || {};
  const budgetAllocation = data?.execution?.budget_allocation || {};
  const inferredGoal = data?.inferred_goal || '';

  const coreMessage = data?.core_message || data?.messaging_framework || data?.message || '';
  const valueProposition = data?.value_proposition || data?.value_prop || '';
  const targetAudience = data?.target_audience || data?.audience || '';
  const channels = data?.channels || data?.marketing_channels || [];
  const contentCalendar = data?.content_calendar || data?.content_plan || [];

  const defaultChannels = [
    { name: 'LinkedIn', icon: Briefcase, bg: 'rgba(10, 102, 194, 0.1)', color: '#0A66C2', badge: 'Primary', badgeColor: '#4edea3', desc: 'Thought leadership and B2B case studies targeting decision makers.' },
    { name: 'Email', icon: Mail, bg: '#1A1A24', color: '#F1F1F3', badge: 'Nurture', badgeColor: '#A0A0D2', desc: 'Segmented weekly sequences focusing on ROI and feature deep-dives.' },
    { name: 'Google Ads', icon: Target, bg: 'rgba(234, 67, 53, 0.1)', color: '#EA4335', badge: 'Conversion', badgeColor: '#A0A0D2', desc: 'High-intent keyword targeting for bottom-of-funnel capture.' },
  ];

  const defaultCalendar = [
    { week: 'Week 1', channel: 'LinkedIn', type: 'Infographic', topic: 'The Cost of Manual Marketing', status: 'ready', statusLabel: 'Ready' },
    { week: 'Week 1', channel: 'Email', type: 'Newsletter', topic: 'Launch Announcement & Offer', status: 'ready', statusLabel: 'Ready' },
    { week: 'Week 2', channel: 'LinkedIn', type: 'Video Snippet', topic: 'Feature Spotlight: Automation', status: 'review', statusLabel: 'In Review' },
    { week: 'Week 3', channel: 'Google Ads', type: 'Search Ad', topic: 'Competitor Conquesting', status: 'drafting', statusLabel: 'Drafting' },
    { week: 'Week 4', channel: 'Email', type: 'Case Study', topic: 'Enterprise Success Story', status: 'planned', statusLabel: 'Planned' },
  ];

  const displayCalendar = Array.isArray(contentCalendar) && contentCalendar.length > 0 ? contentCalendar : defaultCalendar;
  const displayChannels = Array.isArray(channels) && channels.length > 0 ? channels : defaultChannels;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ready': return { bg: 'rgba(78, 222, 163, 0.1)', text: '#4edea3', dotBg: '#4edea3' };
      case 'review': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', dotBg: '#F59E0B' };
      case 'drafting': return { bg: '#1A1A24', text: '#A0A0D2', dotBg: '#A0A0D2' };
      case 'planned': return { bg: '#1A1A24', text: '#A0A0D2', dotBg: '#A0A0D2' };
      default: return { bg: '#1A1A24', text: '#8B8B9E', dotBg: '#8B8B9E' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <style>{`.pulse-dot { animation: pulse 2s infinite ease-in-out; } @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
      
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] pulse-dot" />
              AI Strategy Active
            </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Campaign Strategy</h1>
            <p className="text-sm md:text-base max-w-2xl" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{hasRealData ? 'AI-generated strategic framework' : 'Q3 Product Launch Blueprint'}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button className="px-4 py-2 rounded-lg border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1A1A24] flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
              <FileDown size={16} />Export PDF
            </button>
            <button className="px-4 py-2 rounded-lg bg-[#6366F1] text-sm font-medium transition-opacity hover:opacity-90 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
              <PlayCircle size={16} />Execute
            </button>
          </div>
        </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0" />
            No strategy data available yet. This will be populated after AI agents complete analysis.
          </p>
        </div>
      )}

      {/* Positioning Statement */}
      {positioning && (
        <div className="bg-gradient-to-r from-[#6366F1]/10 to-transparent border-l-4 border-[#6366F1] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
            <Target size={16} />Positioning Statement
          </h3>
          <p className="text-lg leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
            {positioning}
          </p>
        </div>
      )}

      {/* Inferred Goal */}
      {inferredGoal && (
        <div className="mb-6">
          <span className="px-3 py-1.5 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
            Campaign Goal: {inferredGoal.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <div className="rounded-xl p-5 md:p-6 relative overflow-hidden group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-transparent opacity-50" />
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Lightbulb size={20} className="text-[#6366F1]" />Core Messaging Framework
            </h2>
            <div className="pl-6 border-l-2 border-[#6366F1] py-2 mb-6 relative">
              <span className="absolute -left-3 top-0 w-6 h-6 bg-[#111118] rounded-full flex items-center justify-center text-[#6366F1]">"</span>
              <p className="text-base md:text-lg italic leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                {coreMessage || '"Empowering elite marketing teams with surgical precision and autonomous intelligence to scale campaigns faster than ever."'}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
                <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Value Proposition</h3>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{valueProposition || 'Reduce campaign setup time by 80% while increasing creative output quality.'}</p>
              </div>
              <div className="bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
                <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Target Audience</h3>
                <p className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{targetAudience || 'Enterprise CMOs and Growth Leads managing $1M+ quarterly budgets.'}</p>
              </div>
            </div>
          </div>

          {contentPillars.length > 0 && (
            <div className="rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-5 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Target size={20} className="text-[#6366F1]" />Content Pillars
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contentPillars.map((pillar: string, idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg px-4 py-3">
                    <p className="text-sm font-medium leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{pillar}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {keyMessages.length > 0 && (
            <div className="rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Lightbulb size={20} className="text-[#6366F1]" />Key Messages
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {keyMessages.map((msg: string, idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4 min-h-[96px]">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] flex-shrink-0 text-sm font-bold">{idx + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{msg}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="xl:col-span-5 space-y-6">
          {audienceSegments.length > 0 && (
            <div className="rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-5 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Target size={20} className="text-[#6366F1]" />Audience Segments
              </h2>
              <div className="space-y-4">
              {audienceSegments.map((segment: any, idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{segment.segment_name}</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Demographics</span>
                      <p className="text-sm mt-1" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{segment.demographics}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Psychographics</span>
                      <p className="text-sm mt-1" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{segment.psychographics}</p>
                    </div>
                    <div>
                      <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Key Message</span>
                      <p className="text-sm mt-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{segment.key_message}</p>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>

        {Object.keys(timeline).length > 0 && (
          <div className="xl:col-span-12 rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Calendar size={20} className="text-[#6366F1]" />Campaign Timeline
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(timeline).map(([, phase]: [string, any], idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5 min-h-[180px]">
                  <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                    <h3 className="text-base font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{phase.phase_name}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{phase.duration}</span>
                      {phase.start_date && phase.end_date && (
                        <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{phase.start_date} - {phase.end_date}</span>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-2">
                    {phase.activities?.map((activity: string, aidx: number) => (
                      <li key={aidx} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                        <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] mt-1.5 flex-shrink-0" />
                        {activity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {successMetrics.kpis && (
          <div className="xl:col-span-12 rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Target size={20} className="text-[#6366F1]" />Success Metrics & KPIs
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {successMetrics.kpis.map((kpi: string, idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                  <p className="text-sm font-medium mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{kpi}</p>
                  {successMetrics.targets?.[kpi] && (
                    <p className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>{successMetrics.targets[kpi]}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {competitiveDiff.unique_value_proposition && (
          <div className="xl:col-span-12 rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Target size={20} className="text-[#6366F1]" />Competitive Differentiation
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Unique Value Proposition</h3>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.unique_value_proposition}</p>
              </div>
              <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Competitive Advantage</h3>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.competitive_advantage}</p>
              </div>
              {competitiveDiff.primary_differentiation && (
                <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Primary Differentiation</h3>
                  <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.primary_differentiation}</p>
                </div>
              )}
              {competitiveDiff.competitors && (
                <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Main Competitors</h3>
                  <div className="flex flex-wrap gap-2">
                    {competitiveDiff.competitors.map((comp: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{comp}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {Object.keys(budgetAllocation).length > 0 && (
          <div className="xl:col-span-12 rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Briefcase size={20} className="text-[#6366F1]" />Budget Allocation
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(budgetAllocation).map(([key, value]: [string, any], idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                  <h3 className="text-xs uppercase mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{key.replace(/_/g, ' ')}</h3>
                  <p className="text-lg font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#6366F1' }}>{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {Object.keys(channelStrategy).length > 0 && (
          <div className="xl:col-span-12 rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
            <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Target size={20} className="text-[#6366F1]" />Channel Strategy
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {Object.entries(channelStrategy).map(([channel, plan]: [string, any], idx: number) => (
                <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{channel}</h3>
                    <span className="text-xs px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{plan.priority} Priority</span>
                  </div>
                  <p className="text-sm mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{plan.rationale}</p>
                  {plan.tactics && (
                    <div>
                      <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Tactics</span>
                      <ul className="space-y-1">
                        {plan.tactics.map((tactic: string, tidx: number) => (
                          <li key={tidx} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] mt-1.5 flex-shrink-0" />
                            {tactic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayChannels.slice(0, 3).map((channel: any, idx: number) => {
            const channelIcon = channel.icon || Briefcase;
            const ChannelIcon = typeof channelIcon === 'function' ? channelIcon : Briefcase;
            return (
              <div key={idx} className="rounded-xl p-5 cursor-pointer group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: channel.bg || '#1A1A24', color: channel.color || '#F1F1F3' }}>
                      <ChannelIcon size={18} />
                    </div>
                    <h3 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{channel.name || channel.channel}</h3>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: `${channel.badgeColor || '#A0A0D2'}1A`, color: channel.badgeColor || '#A0A0D2' }}>{channel.badge || 'Active'}</span>
                </div>
                <p className="text-xs mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{channel.desc || channel.description || 'Channel strategy details'}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
        <div className="p-5 md:p-6 border-b border-[#2A2A38] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg md:text-xl flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Calendar size={20} className="text-[#8B8B9E]" />Content Rollout
          </h2>
          <button className="text-sm hover:underline" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>View Full Timeline</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr className="bg-[#1A1A24] border-b border-[#2A2A38]">
                {['Week', 'Channel', 'Content Type', 'Topic / Asset', 'Status'].map((header, idx) => (
                  <th key={idx} className={`py-3 px-4 md:px-6 text-xs uppercase tracking-wider ${idx === 4 ? 'text-right' : ''}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: '#A0A0D2' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#2A2A38]/50">
              {displayCalendar.slice(0, 10).map((row: any, idx: number) => {
                const statusStyle = getStatusStyle(row.status || 'planned');
                return (
                  <tr key={idx} className="hover:bg-[#111118] transition-colors">
                    <td className="py-4 px-4 md:px-6 font-medium" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{row.week || row.timeframe || `Week ${idx + 1}`}</td>
                    <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{row.channel || row.platform || 'N/A'}</td>
                    <td className="py-4 px-4 md:px-6">
                      <span className="px-2 py-1 bg-[#1A1A24] rounded text-xs border border-[#2A2A38]" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{row.type || row.content_type || 'Content'}</span>
                    </td>
                    <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{row.topic || row.title || row.asset || 'Untitled'}</td>
                    <td className="py-4 px-4 md:px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: statusStyle.bg, color: statusStyle.text, fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'review' ? 'pulse-dot' : ''}`} style={{ backgroundColor: statusStyle.dotBg }} />
                        {row.statusLabel || row.status || 'Planned'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StrategyContent;
