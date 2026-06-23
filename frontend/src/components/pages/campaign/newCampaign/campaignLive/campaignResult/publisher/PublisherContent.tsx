import React from 'react';
import { Download, Calendar, Copy, Code, Package, Megaphone, Mail, MessageCircle, ShieldCheck } from 'lucide-react';

interface PublisherContentProps {
  data?: any;
  campaignName?: string;
}

const PublisherContent: React.FC<PublisherContentProps> = ({ data, campaignName }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  const publishingDecision = data?.publishing_decision || '';
  const decisionRationale = data?.decision_rationale || '';
  const publishingPlan = data?.publishing_plan || [];
  const contentCalendar = data?.content_calendar || {};
  const assetChecklist = data?.asset_checklist || {};
  const projectedMetrics = data?.projected_metrics || {};
  const executiveSummary = data?.executive_summary || '';
  
  const assets = data?.assets || data?.placements || [];
  const qualityScore = data?.quality_score || data?.score || 0;
  const generatedDate = data?.generated_date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const defaultAssets = [
    { platform: 'LinkedIn', type: 'Post', icon: Megaphone, color: '#0A66C2', preview: 'The rules of high-performance marketing just changed. Say hello to Velocity, the tool that cuts campaign generation time by 80 percent. If you are still doing manual audience research, you are falling behind.', hashtags: ['#MarketingTech', '#AI'], action: 'Copy to Clipboard' },
    { platform: 'Email', type: 'Newsletter', icon: Mail, color: '#d97721', preview: 'Hi [Name], we know how long it takes to build a cohesive campaign. That is why we built Velocity. Join our exclusive webinar to see it live.', subject: 'Unlock 5x Marketing Speed', action: 'View HTML' },
    { platform: 'Twitter', type: 'Thread', icon: MessageCircle, color: '#1DA1F2', preview: '1/5 Marketing teams are broken.\n\nToo much time on manual tasks, not enough on strategy. We are fixing that today with Velocity. Here is how it works.', replies: '4 replies included', action: 'Copy All' },
  ];

  const displayAssets = Array.isArray(assets) && assets.length > 0 ? assets : defaultAssets;

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-2xl border border-[#2A2A38] bg-[#111118] p-5 md:p-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#4edea3]/10 border border-[#4edea3]/20 rounded-full px-3 py-1">
            <ShieldCheck size={14} className="text-[#4edea3]" />
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>Campaign Completed</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{campaignName || 'Campaign Assets'}</h1>
          <p className="text-sm md:text-base flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            <Calendar size={14} />Generated on {generatedDate}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {qualityScore > 0 && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 flex flex-col items-end shadow-lg">
              <span className="text-xs uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Quality Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>{qualityScore.toFixed(1)}</span>
                <span className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#A0A0D2' }}>/10</span>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            No publisher data available yet. This will be populated after AI publisher agent completes work.
          </p>
        </div>
      )}

      {/* Publishing Decision */}
      {publishingDecision && (
        <div className={`rounded-xl p-6 border ${publishingDecision === 'APPROVED_FOR_PUBLISHING' ? 'bg-[#4edea3]/10 border-[#4edea3]/20' : publishingDecision === 'HOLD' ? 'bg-[#F43F5E]/10 border-[#F43F5E]/20' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20'}`}>
          <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: publishingDecision === 'APPROVED_FOR_PUBLISHING' ? '#4edea3' : publishingDecision === 'HOLD' ? '#F43F5E' : '#F59E0B' }}>
            {publishingDecision === 'APPROVED_FOR_PUBLISHING' ? 'Approved for Publishing' : publishingDecision === 'HOLD' ? 'Hold' : 'Revisions Needed'}
          </h3>
          {decisionRationale && (
            <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{decisionRationale}</p>
          )}
        </div>
      )}

      {/* Executive Summary */}
      {executiveSummary && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Executive Summary</h3>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{executiveSummary}</p>
        </div>
      )}

      {/* Projected Metrics */}
      {projectedMetrics.total_reach && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Projected Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {projectedMetrics.total_reach && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Total Reach</span>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#6366F1' }}>{projectedMetrics.total_reach}</p>
              </div>
            )}
            {projectedMetrics.lead_target && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Lead Target</span>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>{projectedMetrics.lead_target}</p>
              </div>
            )}
            {projectedMetrics.estimated_ctr && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. CTR</span>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#F59E0B' }}>{projectedMetrics.estimated_ctr}</p>
              </div>
            )}
            {projectedMetrics.estimated_cost && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. Cost</span>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{projectedMetrics.estimated_cost}</p>
              </div>
            )}
            {projectedMetrics.roi_projection && (
              <div>
                <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>ROI Projection</span>
                <p className="text-2xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>{projectedMetrics.roi_projection}</p>
              </div>
            )}
          </div>
          {projectedMetrics.timeline_to_results && (
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
              <Calendar size={14} />
              Timeline: {projectedMetrics.timeline_to_results}
            </div>
          )}
        </div>
      )}

      {/* Publishing Plan */}
      {publishingPlan.length > 0 && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Publishing Plan</h3>
          <div className="space-y-4">
            {publishingPlan.map((plan: any, idx: number) => (
              <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h4 className="text-base font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{plan.channel}</h4>
                    <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{plan.content_type} • {plan.publish_frequency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{plan.priority} Priority</span>
                    <span className={`text-xs px-2 py-1 rounded ${plan.status === 'ready' ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-[#8B8B9E]/10 text-[#8B8B9E]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{plan.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Optimal Timing</span>
                    <p style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{plan.optimal_timing}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Launch Date</span>
                    <p style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{plan.launch_date}</p>
                  </div>
                  {plan.copy_asset_used && (
                    <div>
                      <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Copy Asset</span>
                      <p style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{plan.copy_asset_used}</p>
                    </div>
                  )}
                  {plan.visual_asset_used && (
                    <div>
                      <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Visual Asset</span>
                      <p style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{plan.visual_asset_used}</p>
                    </div>
                  )}
                </div>
                {plan.kpi_targets && Object.keys(plan.kpi_targets).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-[#2A2A38]">
                    <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>KPI Targets</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(plan.kpi_targets).map(([key, value]: [string, any], kidx: number) => (
                        <span key={kidx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content Calendar */}
      {contentCalendar.weeks && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Content Calendar</h3>
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
              {contentCalendar.total_weeks} Weeks | {contentCalendar.start_date} - {contentCalendar.end_date || 'Ongoing'}
            </span>
          </div>
          <div className="space-y-4">
            {contentCalendar.weeks.slice(0, 8).map((week: any, idx: number) => (
              <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{week.week_label}</h4>
                  <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{week.week_start_date}</span>
                </div>
                <p className="text-sm mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Theme: {week.theme}</p>
                {week.activities?.length > 0 && (
                  <div className="space-y-2">
                    {week.activities.map((activity: any, aidx: number) => (
                      <div key={aidx} className="flex items-start gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-[#1A1A24] border border-[#2A2A38] min-w-[60px] text-center" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{activity.day}</span>
                        <span style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{activity.channel}: {activity.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Asset Checklist */}
      {(assetChecklist.copy_assets || assetChecklist.visual_assets) && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Asset Checklist</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {assetChecklist.copy_assets && (
              <div>
                <h4 className="text-sm font-medium mb-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Copy Assets</h4>
                <div className="space-y-2">
                  {assetChecklist.copy_assets.map((asset: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-[#0A0A0F] border border-[#2A2A38]">
                      <span style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{asset.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${asset.status === 'complete' ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {assetChecklist.visual_assets && (
              <div>
                <h4 className="text-sm font-medium mb-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Visual Assets</h4>
                <div className="space-y-2">
                  {assetChecklist.visual_assets.map((asset: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between text-sm p-2 rounded bg-[#0A0A0F] border border-[#2A2A38]">
                      <span style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{asset.asset}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${asset.status === 'complete' ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-[#F59E0B]/10 text-[#F59E0B]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        {asset.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {assetChecklist.missing_assets?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#2A2A38]">
              <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F43F5E' }}>Missing Assets</span>
              <div className="flex flex-wrap gap-2">
                {assetChecklist.missing_assets.map((asset: string, idx: number) => (
                  <span key={idx} className="px-2 py-1 rounded bg-[#F43F5E]/10 border border-[#F43F5E]/20 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F43F5E' }}>
                    {asset}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
            <Package size={26} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>All Campaign Assets Ready</h3>
            <p className="text-xs md:text-sm mt-1" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Includes copy docs, image variants, and strategic framework.</p>
          </div>
        </div>
        <button className="w-full sm:w-auto bg-[#6366F1] px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-opacity hover:opacity-90 z-10 text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
          <Download size={18} />Download All (.zip)
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Generated Placements</h2>
          <span className="bg-[#111118] border border-[#2A2A38] px-3 py-1 rounded-full text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{displayAssets.length} Assets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayAssets.slice(0, 9).map((asset: any, idx: number) => (
            <div key={idx} className="bg-[#111118] border border-[#2A2A38] rounded-xl overflow-hidden group hover:border-[#464554] transition-colors flex flex-col">
              <div className="p-4 border-b border-[#2A2A38] bg-[#1f1f25] flex items-center gap-3">
                {typeof asset.icon === 'function' ? (
                  <asset.icon size={22} className="text-[#6366F1]" />
                ) : (
                  <Code size={18} className="text-[#6366F1]" />
                )}
                <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{asset.platform || asset.channel} {asset.type || 'Asset'}</span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                {asset.subject && (
                  <div>
                    <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Subject</span>
                    <p className="text-sm mt-1 font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{asset.subject}</p>
                  </div>
                )}
                {asset.subject && <div className="w-full h-px bg-[#2A2A38]" />}
                <p className="text-sm line-clamp-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{asset.preview || asset.content || 'Content preview'}</p>
                {asset.hashtags && (
                  <div className="flex flex-wrap gap-2">
                    {asset.hashtags.map((tag: string, tidx: number) => (
                      <span key={tidx} className="bg-[#35343a] px-2 py-1 rounded text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {asset.replies && <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#A0A0D2' }}>{asset.replies}</span>}
              </div>
              <div className="p-4 border-t border-[#2A2A38] mt-auto">
                <button className="w-full bg-transparent border border-[#2A2A38] px-4 py-2 rounded-lg transition-colors hover:bg-[#1A1A24] flex justify-center items-center gap-2 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                  {asset.action === 'View HTML' ? <Code size={16} /> : <Copy size={16} />}
                  {asset.action || 'Copy'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublisherContent;
