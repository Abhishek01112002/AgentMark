import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, Star, ThumbsUp, Zap,
  AlertTriangle, Clock, BarChart3, CheckCircle2,
  XCircle, Loader2, Palette, Radio, Target,
} from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import api from '../../../services/api';
import { formatDDMonYYYY } from '../../../utils/formatDate';

interface Snapshot {
  id: string;
  campaignId: string;
  campaignName: string;
  brandVoice: string;
  completedAt: string;
  score: number | null;
  approvedOnFirstTry: boolean;
  rejectionReasons: Array<{ targetAgent: string; feedbackText: string }>;
  approvedTone: string[];
  channelsUsed: string[];
}

interface Aggregated {
  totalCampaigns: number;
  avgScore: number;
  firstTryRate: number;
  preferredTones: string[];
  preferredChannels: string[];
  mostRejectedAgent: string | null;
  rejectionCount: number;
}

const CHANNEL_DISPLAY: Record<string, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  twitter: 'Twitter', tiktok: 'TikTok', youtube: 'YouTube',
  email: 'Email', google_ads: 'Google Ads',
};

const MemoryHubPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [aggregated, setAggregated] = useState<Aggregated | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      try {
        const [projRes, memRes] = await Promise.all([
          api.get(`/projects`),
          api.get(`/campaigns/project-memory/${projectId}`),
        ]);
        const projects = projRes.data.projects || [];
        const proj = projects.find((p: any) => p.id === projectId);
        setProjectName(proj?.name || 'Brand Memory');
        setSnapshots(memRes.data.snapshots || []);
        setAggregated(memRes.data.aggregated);
      } catch (err) {
        console.error('Failed to fetch memory hub data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const timelineEvents = snapshots.map((s, i) => ({
    ...s,
    position: (i / Math.max(snapshots.length - 1, 1)) * 100,
    scoreColor: s.score !== null && s.score >= 80 ? '#4edea3'
      : s.score !== null && s.score >= 60 ? '#F59E0B'
      : '#F43F5E',
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <Loader2 size={32} className="animate-spin text-[#6366F1]" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        .memory-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .memory-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
        .timeline-line {
          position: absolute;
          left: 50%;
          top: 0;
          bottom: 0;
          width: 2px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, #6366F1 0%, #4edea3 100%);
          opacity: 0.3;
        }
        .timeline-dot {
          transition: transform 300ms, box-shadow 300ms;
        }
        .timeline-dot:hover {
          transform: scale(1.3);
          box-shadow: 0 0 20px rgba(99,102,241,0.4);
        }
        .score-ring {
          transition: stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1);
        }
        .insight-card {
          transition: transform 200ms, box-shadow 200ms;
        }
        .insight-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        }
      `}</style>

      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Brand Memory Hub" />

        <main className="memory-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6 md:space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg transition-colors"
                style={{ color: '#8B8B9E' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1F1F25'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(78,222,163,0.1))', border: '1px solid rgba(99,102,241,0.2)' }}>
                <Brain size={22} style={{ color: '#6366F1' }} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold" style={{ color: '#F1F1F3' }}>Brand Memory Hub</h1>
                <p className="text-sm" style={{ color: '#8B8B9E' }}>{projectName}</p>
              </div>
            </div>

            {(!snapshots || snapshots.length === 0) ? (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="w-20 h-20 rounded-full bg-[#6366F1]/10 border-2 border-[#6366F1]/20 flex items-center justify-center mx-auto mb-6">
                  <Brain size={40} style={{ color: '#6366F1' }} />
                </div>
                <h2 className="text-xl font-semibold mb-2" style={{ color: '#F1F1F3' }}>No Brand Memory Yet</h2>
                <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: '#8B8B9E' }}>
                  Complete your first campaign to start building brand memory. The AI will learn your brand's preferences, tone, and channel performance over time.
                </p>
                <button onClick={() => navigate('/campaign/new')} className="px-6 py-3 rounded-lg font-medium transition-all" style={{ backgroundColor: '#6366F1', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}>
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="rounded-xl p-5 insight-card" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}>
                        <BarChart3 size={18} style={{ color: '#6366F1' }} />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold mb-1" style={{ color: '#F1F1F3' }}>{aggregated?.totalCampaigns || 0}</div>
                    <div className="text-xs" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>TOTAL CAMPAIGNS</div>
                  </div>
                  <div className="rounded-xl p-5 insight-card" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(78,222,163,0.12)' }}>
                        <Star size={18} style={{ color: '#4edea3' }} />
                      </div>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold" style={{ color: '#F1F1F3' }}>{aggregated?.avgScore || 0}</span>
                      <span className="text-xs" style={{ color: '#8B8B9E' }}>/100</span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>AVG QUALITY SCORE</div>
                  </div>
                  <div className="rounded-xl p-5 insight-card" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(78,222,163,0.12)' }}>
                        <ThumbsUp size={18} style={{ color: '#4edea3' }} />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold mb-1" style={{ color: '#F1F1F3' }}>{aggregated?.firstTryRate || 0}%</div>
                    <div className="text-xs" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>APPROVED ON 1st TRY</div>
                  </div>
                  <div className="rounded-xl p-5 insight-card" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}>
                        <AlertTriangle size={18} style={{ color: '#F59E0B' }} />
                      </div>
                    </div>
                    <div className="text-2xl font-semibold mb-1" style={{ color: '#F1F1F3' }}>{aggregated?.rejectionCount || 0}</div>
                    <div className="text-xs" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>TOTAL REVISIONS</div>
                  </div>
                </div>

                <div className="rounded-xl p-6" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                  <h2 className="text-sm font-semibold mb-6 flex items-center gap-2" style={{ color: '#F1F1F3' }}>
                    <Zap size={16} style={{ color: '#6366F1' }} />
                    AI Learning Insights
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Radio size={16} style={{ color: '#6366F1' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A0D2', fontFamily: 'JetBrains Mono, monospace' }}>Preferred Channels</span>
                      </div>
                      {(aggregated?.preferredChannels?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {aggregated!.preferredChannels.map((ch) => (
                            <span key={ch} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(99,102,241,0.12)', color: '#c0c1ff', border: '1px solid rgba(99,102,241,0.2)' }}>
                              {CHANNEL_DISPLAY[ch.toLowerCase()] || ch}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#4A4A5E' }}>No channel data yet</span>
                      )}
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Palette size={16} style={{ color: '#4edea3' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A0D2', fontFamily: 'JetBrains Mono, monospace' }}>Learned Tone</span>
                      </div>
                      {(aggregated?.preferredTones?.length ?? 0) > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {aggregated!.preferredTones.map((tone) => (
                            <span key={tone} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(78,222,163,0.12)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.2)' }}>
                              {tone.charAt(0).toUpperCase() + tone.slice(1)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#4A4A5E' }}>No tone data yet</span>
                      )}
                    </div>

                    <div className="p-4 rounded-lg" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Target size={16} style={{ color: aggregated?.mostRejectedAgent ? '#F59E0B' : '#4A4A5E' }} />
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A0A0D2', fontFamily: 'JetBrains Mono, monospace' }}>Revision Focus</span>
                      </div>
                      {aggregated?.mostRejectedAgent ? (
                        <div>
                          <span className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.2)' }}>
                            {aggregated.mostRejectedAgent.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: '#4A4A5E' }}>No revision data yet</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl p-6" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                  <h2 className="text-sm font-semibold mb-8 flex items-center gap-2" style={{ color: '#F1F1F3' }}>
                    <Clock size={16} style={{ color: '#6366F1' }} />
                    Campaign Memory Timeline
                  </h2>

                  <div className="relative">
                    {timelineEvents.length > 1 && (
                      <div className="timeline-line" />
                    )}
                    <div className="space-y-6">
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="relative">
                          <div className="flex items-start gap-6">
                            <div className="relative flex flex-col items-center flex-shrink-0">
                              <div className="timeline-dot w-10 h-10 rounded-full flex items-center justify-center cursor-pointer" style={{
                                backgroundColor: event.scoreColor + '20',
                                border: `2px solid ${event.scoreColor}`,
                                boxShadow: `0 0 15px ${event.scoreColor}30`,
                              }}
                                onClick={() => setExpandedCampaign(expandedCampaign === event.id ? null : event.id)}
                              >
                                {event.approvedOnFirstTry ? (
                                  <CheckCircle2 size={16} style={{ color: event.scoreColor }} />
                                ) : (
                                  <XCircle size={16} style={{ color: event.scoreColor }} />
                                )}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0 p-4 rounded-lg transition-all cursor-pointer" style={{
                              backgroundColor: expandedCampaign === event.id ? '#1A1A24' : '#131318',
                              border: `1px solid ${expandedCampaign === event.id ? event.scoreColor + '30' : '#2A2A38'}`,
                            }}
                              onClick={() => setExpandedCampaign(expandedCampaign === event.id ? null : event.id)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold truncate" style={{ color: '#F1F1F3' }}>{event.campaignName}</h3>
                                  <p className="text-xs mt-1" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {formatDDMonYYYY(new Date(event.completedAt))}
                                    {event.brandVoice && <span className="ml-3">Voice: {event.brandVoice}</span>}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <div className="text-lg font-bold" style={{ color: event.scoreColor }}>
                                    {event.score !== null ? `${Math.round(event.score)}` : '—'}
                                  </div>
                                  <div className="text-[10px] uppercase tracking-wider" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>
                                    Score
                                  </div>
                                </div>
                              </div>

                              {expandedCampaign === event.id && (
                                <div className="mt-4 pt-4 border-t border-[#2A2A38] space-y-3">
                                  {event.approvedTone.length > 0 && (
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Approved Tone</span>
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {event.approvedTone.map((t, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: 'rgba(78,222,163,0.1)', color: '#4edea3' }}>{t}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {event.channelsUsed.length > 0 && (
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Channels Used</span>
                                      <div className="flex flex-wrap gap-1.5 mt-1">
                                        {event.channelsUsed.map((ch, i) => (
                                          <span key={i} className="px-2 py-0.5 rounded text-[11px]" style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#c0c1ff' }}>{CHANNEL_DISPLAY[ch.toLowerCase()] || ch}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {event.rejectionReasons.length > 0 && (
                                    <div>
                                      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Revisions</span>
                                      {event.rejectionReasons.map((r, i) => (
                                        <div key={i} className="mt-1 p-2 rounded text-xs" style={{ backgroundColor: 'rgba(245,158,11,0.08)', color: '#F59E0B' }}>
                                          <span className="font-medium capitalize">{r.targetAgent?.replace(/_/g, ' ')}:</span> {r.feedbackText}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
};

const MemoryHubPageWrapper: React.FC = () => (
  <SidebarProvider>
    <MemoryHubPage />
  </SidebarProvider>
);

export default MemoryHubPageWrapper;
