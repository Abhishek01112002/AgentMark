import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Brain, Star, ThumbsUp, Zap,
  AlertTriangle, Clock, BarChart3, CheckCircle2,
  XCircle, Loader2, Palette, Radio, Target,
  RotateCcw, X, Save, Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
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
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSnapshots = useMemo(() => {
    if (!snapshots) return [];
    if (!searchQuery.trim()) return snapshots;
    const q = searchQuery.toLowerCase();
    return snapshots.filter((s) => {
      const matchCampaign = (s.campaignName || '').toLowerCase().includes(q);
      const matchVoice = (s.brandVoice || '').toLowerCase().includes(q);
      const matchTone = (s.approvedTone || []).some((t) => t.toLowerCase().includes(q));
      return matchCampaign || matchVoice || matchTone;
    });
  }, [snapshots, searchQuery]);

  // Extended Memory Controls State
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form inputs
  const [brandVoice, setBrandVoice] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyInsights, setKeyInsights] = useState('');
  const [preferredTonesInput, setPreferredTonesInput] = useState('');

  const refetchMemoryData = async () => {
    if (!projectId) return;
    try {
      const memRes = await api.get(`/campaigns/project-memory/${projectId}`);
      setSnapshots(memRes.data.snapshots || []);
      setAggregated(memRes.data.aggregated);
    } catch (err) {
      console.error('Failed to refresh memory hub data:', err);
    }
  };

  const handleSaveMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      const tones = preferredTonesInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      await api.post(`/projects/${projectId}/memory`, {
        brandVoice,
        targetAudience,
        keyInsights,
        preferredTones: tones.length > 0 ? tones : undefined,
      });

      toast.success('Brand memory directives saved!');
      setIsUpdateOpen(false);
      setBrandVoice('');
      setTargetAudience('');
      setKeyInsights('');
      setPreferredTonesInput('');
      refetchMemoryData();
    } catch (err: any) {
      console.error('Failed to update memory:', err);
      toast.error(err.response?.data?.error || 'Failed to update brand memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearMemory = async () => {
    if (!projectId) return;
    setIsSubmitting(true);
    try {
      await api.post(`/projects/${projectId}/memory/clear`);
      toast.success('Brand memory hub cleared successfully!');
      setIsResetOpen(false);
      refetchMemoryData();
    } catch (err: any) {
      console.error('Failed to clear memory:', err);
      toast.error(err.response?.data?.error || 'Failed to clear brand memory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    const fetchData = async () => {
      if (!projectId) return;
      try {
        const [projRes, memRes] = await Promise.all([
          api.get(`/projects`, { signal: controller.signal }),
          api.get(`/campaigns/project-memory/${projectId}`, { signal: controller.signal }),
        ]);
        const projects = projRes.data.projects || [];
        const proj = projects.find((p: any) => p.id === projectId);
        setProjectName(proj?.name || 'Brand Memory');
        setSnapshots(memRes.data.snapshots || []);
        setAggregated(memRes.data.aggregated);
      } catch (err: any) {
        if (err.name !== 'AbortError' && err.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch memory hub data:', err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchData();
    return () => controller.abort();
  }, [projectId]);

  const timelineEvents = useMemo(() => filteredSnapshots.map((s, i) => ({
    ...s,
    position: (i / Math.max(filteredSnapshots.length - 1, 1)) * 100,
    scoreColor: s.score !== null && s.score >= 80 ? '#4edea3'
      : s.score !== null && s.score >= 60 ? '#F59E0B'
      : '#F43F5E',
  })), [filteredSnapshots]);

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
          left: 22px;
          top: 44px;
          bottom: 44px;
          width: 2px;
          background: linear-gradient(180deg, #6366F1 0%, #4edea3 100%);
          opacity: 0.4;
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
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 xl:px-10 2xl:px-12 space-y-6 md:space-y-8 w-full">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  onClick={() => navigate(-1)}
                  className="p-3 rounded-lg transition-colors min-h-[44px] hover:bg-[#1F1F25]"
                  style={{ color: '#8B8B9E' }}
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(244,114,182,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(244,114,182,0.3)' }}>
                  <Brain size={22} className="text-pink-400 filter drop-shadow-[0_0_8px_rgba(244,114,182,0.7)]" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold leading-tight" style={{ color: '#F1F1F3' }}>Brand Memory Hub</h1>
                  <p className="text-sm truncate" style={{ color: '#8B8B9E' }}>{projectName}</p>
                </div>
              </div>

              {/* FAANG Header Action Buttons */}
              <div className="flex items-center gap-2 sm:gap-3 ml-auto">
                <button
                  onClick={() => setIsUpdateOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all shadow-md hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(99,102,241,0.15)',
                    color: '#818cf8',
                    border: '1px solid rgba(99,102,241,0.3)',
                  }}
                >
                  <Brain size={16} />
                  <span>Update Memory</span>
                </button>
                <button
                  onClick={() => setIsResetOpen(true)}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    backgroundColor: 'rgba(244,63,94,0.1)',
                    color: '#f43f5e',
                    border: '1px solid rgba(244,63,94,0.25)',
                  }}
                >
                  <RotateCcw size={16} />
                  <span>Reset Memory</span>
                </button>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
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

                    <div className="p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
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

                    <div className="p-3 sm:p-4 rounded-lg sm:col-span-2 lg:col-span-1" style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38' }}>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#F1F1F3' }}>
                      <Clock size={16} style={{ color: '#6366F1' }} />
                      Campaign Memory Timeline
                    </h2>
                    <div className="relative w-full sm:w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B8B9E]" />
                      <input
                        type="text"
                        placeholder="Search memory insights..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1A1A24] border border-[#2A2A38] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#F1F1F3] placeholder-[#64748B] focus:outline-none focus:border-[#6366F1] font-sans"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    {timelineEvents.length > 1 && (
                      <div className="timeline-line" />
                    )}
                    <div className="space-y-6">
                      {timelineEvents.map((event) => (
                        <div key={event.id} className="relative">
                          <div className="flex items-start gap-3 sm:gap-4">
                            <div className="relative flex flex-col items-center flex-shrink-0">
                              <div className="timeline-dot w-11 h-11 rounded-full flex items-center justify-center cursor-pointer" style={{
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

                            <div className="flex-1 min-w-0 p-3 sm:p-4 rounded-lg transition-all cursor-pointer" style={{
                              backgroundColor: expandedCampaign === event.id ? '#1A1A24' : '#131318',
                              border: `1px solid ${expandedCampaign === event.id ? event.scoreColor + '30' : '#2A2A38'}`,
                            }}
                              onClick={() => setExpandedCampaign(expandedCampaign === event.id ? null : event.id)}
                            >
                              <div className="flex items-start justify-between gap-2 sm:gap-4">
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-sm font-semibold truncate" style={{ color: '#F1F1F3' }}>{event.campaignName}</h3>
                                  <p className="text-xs mt-1 flex flex-wrap items-center gap-x-3 gap-y-1" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>
                                    <span>{formatDDMonYYYY(new Date(event.completedAt))}</span>
                                    {event.brandVoice && <span>Voice: {event.brandVoice}</span>}
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

        {/* ================= EDIT BRAND MEMORY DIRECTIVES MODAL ================= */}
        {isUpdateOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-5 border border-[#2A2A38]"
              style={{ backgroundColor: '#111118', color: '#F1F1F3' }}
            >
              <div className="flex items-center justify-between border-b border-[#2A2A38] pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20">
                    <Brain size={20} className="text-[#6366F1]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Update Brand Memory Directives</h3>
                    <p className="text-xs text-[#8B8B9E]">Teach the AI your brand voice, tone, and strategic guidelines.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUpdateOpen(false)}
                  className="p-2 rounded-lg text-[#8B8B9E] hover:text-white hover:bg-[#1F1F25] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveMemory} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-[#A0A0D2] mb-1.5">
                    Brand Voice & Tone Guidelines
                  </label>
                  <textarea
                    rows={3}
                    value={brandVoice}
                    onChange={(e) => setBrandVoice(e.target.value)}
                    placeholder="e.g. Confident, fun, empowering, bold and vibrant tone..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#1A1A24] border border-[#2A2A38] focus:border-[#6366F1] focus:outline-none text-[#F1F1F3] placeholder-[#4A4A5E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A0A0D2] mb-1.5">
                    Target Audience Persona Insights
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Gen-Z women aged 18-28 interested in sustainable fashion"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#1A1A24] border border-[#2A2A38] focus:border-[#6366F1] focus:outline-none text-[#F1F1F3] placeholder-[#4A4A5E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A0A0D2] mb-1.5">
                    Preferred Content Tones (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={preferredTonesInput}
                    onChange={(e) => setPreferredTonesInput(e.target.value)}
                    placeholder="e.g. Bold, Empowering, Playful, Professional"
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#1A1A24] border border-[#2A2A38] focus:border-[#6366F1] focus:outline-none text-[#F1F1F3] placeholder-[#4A4A5E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#A0A0D2] mb-1.5">
                    Strategic Directives & Restrictions
                  </label>
                  <textarea
                    rows={2}
                    value={keyInsights}
                    onChange={(e) => setKeyInsights(e.target.value)}
                    placeholder="e.g. Never use discount jargon, prioritize high aesthetic imagery..."
                    className="w-full rounded-xl px-3.5 py-2.5 text-sm bg-[#1A1A24] border border-[#2A2A38] focus:border-[#6366F1] focus:outline-none text-[#F1F1F3] placeholder-[#4A4A5E]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2A38]">
                  <button
                    type="button"
                    onClick={() => setIsUpdateOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#8B8B9E] hover:bg-[#1F1F25] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-[#6366F1] text-white hover:bg-[#5356E0] transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    <span>Save Directives</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ================= RESET BRAND MEMORY CONFIRMATION MODAL ================= */}
        {isResetOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div
              className="w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 border border-[#2A2A38]"
              style={{ backgroundColor: '#111118', color: '#F1F1F3' }}
            >
              <div className="flex items-center gap-3 text-[#F43F5E]">
                <div className="p-3 rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/20">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Reset Brand Memory Hub?</h3>
                  <p className="text-xs text-[#8B8B9E]">This action will clear all stored memory snapshots for this project.</p>
                </div>
              </div>

              <p className="text-xs text-[#8B8B9E] leading-relaxed">
                Clearing brand memory will remove past approval/rejection history and reset preferred tone models. The AI will start learning fresh from future campaign runs.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2A2A38]">
                <button
                  type="button"
                  onClick={() => setIsResetOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#8B8B9E] hover:bg-[#1F1F25] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearMemory}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-medium bg-[#F43F5E] text-white hover:bg-[#E12D4C] transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  <span>Reset Memory Hub</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
