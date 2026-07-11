import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Compass, PenTool, Image as ImageIcon, CheckSquare, Send, LayoutDashboard, LucideIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../shared/ChannelIcon';
import api from '../../../../../../services/api';
import Sidebar, { SidebarProvider } from '../../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../../shared/topNav/TopNav';
import MemoryInsightsCard from './MemoryInsightsCard';

// Lazy-load each tab's content so its JS chunk is only fetched when the tab
// is first opened — shaves ~250 KB from the initial parse budget.
const OverviewContent   = lazy(() => import('./overview/OverviewContent'));
const ResearchContent   = lazy(() => import('./research/ResearchContent'));
const StrategyContent   = lazy(() => import('./strategy/StrategyContent'));
const CopywriterContent = lazy(() => import('./copywriter/CopywriterContent'));
const VisualsContent    = lazy(() => import('./visuals/VisualsContent'));
const ReviewContent     = lazy(() => import('./review/ReviewContent'));
const PublisherContent  = lazy(() => import('./publisher/PublisherContent'));

/** Minimal fallback rendered while a tab's chunk is being fetched. */
const TabLoader = () => (
  <div className="flex items-center justify-center py-20">
    <Loader2 size={24} className="animate-spin text-[#6366F1]/60" />
  </div>
);

type TabId = 'overview' | 'research' | 'strategy' | 'copy' | 'images' | 'review' | 'published';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  brandName?: string;
  brand_name?: string;
  industry: string;
  primaryGoal: string;
  targetAudience: string;
  brandVoice: string;
  projectId: string;
  aiOutputs?: any;
  aiError?: string | null;
  reviewScore?: number | null;
  reviewOutput?: any;
  researchRevisionCount?: number;
  strategyRevisionCount?: number;
  copyRevisionCount?: number;
  imageRevisionCount?: number;
  createdAt: string;
  updatedAt: string;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'research', label: 'Research', icon: FileText },
  { id: 'strategy', label: 'Strategy', icon: Compass },
  { id: 'copy', label: 'Copy', icon: PenTool },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'review', label: 'Review', icon: CheckSquare },
  { id: 'published', label: 'Publishing', icon: Send },
];

const CampaignResultPage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [memoryInsights, setMemoryInsights] = useState<any[]>([]);
  const [memoryCount, setMemoryCount] = useState<number>(0);

  // HITL Modal State
  const [showHumanReview, setShowHumanReview] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Default to true so results view is visible
  const [selectedAgent, setSelectedAgent] = useState<string>('copywriter');
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');
  const [revisionCounts, setRevisionCounts] = useState({
    research: 0,
    strategy: 0,
    copywriter: 0,
    image_prompt: 0,
  });
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [agentScores, setAgentScores] = useState<{
    research: number | null;
    strategy: number | null;
    copywriter: number | null;
    image_prompt: number | null;
  }>({ research: null, strategy: null, copywriter: null, image_prompt: null });
  const [drawerTab, setDrawerTab] = useState<'scores' | 'inspect' | 'revise'>('scores');
  const [reviewerNotes, setReviewerNotes] = useState<{ feedback: string; issues: string[] } | null>(null);

  // Helper to extract and automatically parse JSON string fields from aiOutputs
  const getOutputField = React.useCallback((field: string) => {
    if (!campaign) return null;
    const outputs = campaign.aiOutputs || {};
    const val = outputs[field];
    if (val) {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return val; }
      }
      return val;
    }
    const directVal = (campaign as any)[field];
    if (directVal) {
      if (typeof directVal === 'string') {
        try { return JSON.parse(directVal); } catch { return directVal; }
      }
      return directVal;
    }
    return null;
  }, [campaign]);

  // Memoize parsed campaign outputs to avoid redundant JSON.parse calls in render path
  const parsedCampaignOutputs = React.useMemo(() => {
    if (!campaign) return null;
    return {
      copyData: (() => {
        const rawCopy = getOutputField('copy_output') || getOutputField('copyOutput');
        return rawCopy && rawCopy.copies ? { ...rawCopy, ...rawCopy.copies } : rawCopy;
      })(),
      strategyData: getOutputField('strategy_output') || getOutputField('strategyOutput'),
      imageData: getOutputField('image_output') || getOutputField('imageOutput'),
      managerData: getOutputField('manager_output') || getOutputField('managerOutput'),
    };
  }, [campaign, getOutputField]);

  // Memoize strategyData including flat content calendar to preserve referential identity for React.memo
  const memoizedStrategyData = React.useMemo(() => {
    const strategyData = getOutputField('strategy_output') || getOutputField('strategyOutput');
    if (!strategyData) return null;
    
    const publisherData = getOutputField('publisher_output') || getOutputField('publisherOutput');
    const rawCalendar = publisherData?.content_calendar || {};
    const weeks = rawCalendar.weeks || [];
    const flatCalendar: any[] = [];
    weeks.forEach((w: any) => {
      const weekLabel = w.week_label || `Week ${w.week_number}`;
      (w.activities || []).forEach((act: any) => {
        flatCalendar.push({
          week: weekLabel,
          channel: act.channel,
          content_type: act.content_type,
          topic: act.description,
          status: 'planned'
        });
      });
    });
    return {
      ...strategyData,
      content_calendar: flatCalendar
    };
  }, [getOutputField]);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        const rawProjectId = new URLSearchParams(window.location.search).get('projectId');
        const projectId = (rawProjectId && rawProjectId !== 'undefined' && rawProjectId !== 'null') ? rawProjectId : null;
        const url = projectId ? `/campaigns/${campaignId}?projectId=${projectId}` : `/campaigns/${campaignId}`;
        const response = await api.get(url);
        const campaignData = response.data.campaign;
        setCampaign(campaignData);

        if (campaignData && campaignData.status === 'awaiting_human_approval') {
          setShowHumanReview(true);
          setRevisionCounts({
            research: campaignData.researchRevisionCount || 0,
            strategy: campaignData.strategyRevisionCount || 0,
            copywriter: campaignData.copyRevisionCount || 0,
            image_prompt: campaignData.imageRevisionCount || 0,
          });
          if (campaignData.reviewScore) setQualityScore(campaignData.reviewScore);

          if (campaignData.reviewOutput) {
            try {
              const reviewData = typeof campaignData.reviewOutput === 'string'
                ? JSON.parse(campaignData.reviewOutput)
                : campaignData.reviewOutput;
              
              const scores = {
                research: reviewData.research_review?.score ?? null,
                strategy: reviewData.strategy_review?.score ?? null,
                copywriter: reviewData.copy_review?.score ?? null,
                image_prompt: reviewData.image_review?.score ?? null,
              };

              setAgentScores({
                research: scores.research ? scores.research / 10 : null,
                strategy: scores.strategy ? scores.strategy / 10 : null,
                copywriter: scores.copywriter ? scores.copywriter / 10 : null,
                image_prompt: scores.image_prompt ? scores.image_prompt / 10 : null,
              });

              // Find lowest scoring agent to pre-select by default
              let lowestAgent = 'copywriter';
              let lowestScore = 999;
              Object.entries(scores).forEach(([agent, val]) => {
                if (val !== null && val < lowestScore) {
                  lowestScore = val;
                  lowestAgent = agent;
                }
              });
              setSelectedAgent(lowestAgent);

              const overallReview = reviewData.overall || {};
              setReviewerNotes({
                feedback: overallReview.summary || reviewData.copy_review?.feedback || '',
                issues: [
                  ...(reviewData.copy_review?.action_items || []),
                  ...(reviewData.image_review?.action_items || []),
                ].slice(0, 4),
              });
            } catch (e) {
              console.error('Failed to parse reviewOutput for agent scores:', e);
            }
          }
        }
      } catch (error: any) {
        console.error('Failed to fetch campaign:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };

    const fetchMemoryInsights = async () => {
      if (!campaignId) return;
      try {
        const res = await api.get(`/campaigns/${campaignId}/memory-insights`);
        setMemoryInsights(res.data.insights || []);
        setMemoryCount(res.data.count || 0);
      } catch (err) {
        console.error('Failed to fetch memory insights:', err);
      }
    };
    
    fetchCampaign();
    fetchMemoryInsights();
  }, [campaignId]);

  const handleCopyVariantsUpdate = (updatedCopyVariants: any) => {
    setCampaign(prev => {
      if (!prev) return null;
      const currentOutputs = prev.aiOutputs
        ? (typeof prev.aiOutputs === 'string' ? JSON.parse(prev.aiOutputs) : prev.aiOutputs)
        : {};
      return {
        ...prev,
        aiOutputs: {
          ...currentOutputs,
          copy_variants: updatedCopyVariants
        }
      };
    });
  };

  const handleApprove = async () => {
    try {
      setShowHumanReview(false);
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'approve',
      });
      window.dispatchEvent(new Event('campaign_status_changed'));
      toast.success('Campaign approved! Resuming publisher...');
      navigate(`/campaign/${campaignId}/live`, { state: { initialActiveAgent: 'publisher' } });
    } catch (error) {
      console.error('Failed to submit approval:', error);
      toast.error('Failed to submit approval decision');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) {
      toast.error('Please provide feedback for the revision');
      return;
    }
    
    try {
      setShowHumanReview(false);
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'reject',
        revisionTarget: selectedAgent,
        feedback: revisionFeedback,
      });
      window.dispatchEvent(new Event('campaign_status_changed'));
      
      toast.success('Revision requested successfully!');
      setRevisionFeedback('');
      navigate(`/campaign/${campaignId}/live`, { state: { initialActiveAgent: selectedAgent } });
    } catch (error: any) {
      console.error('Failed to request revision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit revision request');
      setShowHumanReview(true);
    }
  };

  const isTabCompleted = React.useCallback((tabId: TabId) => {
    if (!campaign) return false;
    switch (tabId) {
      case 'overview':
        return true;
      case 'research':
        return !!(getOutputField('research_output') || getOutputField('researchOutput'));
      case 'strategy':
        return !!(getOutputField('strategy_output') || getOutputField('strategyOutput'));
      case 'copy':
        return !!(getOutputField('copy_output') || getOutputField('copyOutput'));
      case 'images':
        return !!(getOutputField('image_output') || getOutputField('imageOutput'));
      case 'review':
        return !!(getOutputField('review_output') || getOutputField('reviewOutput'));
      case 'published':
        return !!(getOutputField('publisher_output') || getOutputField('publisherOutput') || campaign.status === 'completed');
      default:
        return false;
    }
  }, [campaign, getOutputField]);

  const renderTabContent = () => {
    if (!campaign) return null;
    
    switch (activeTab) {
      case 'overview':
        return <OverviewContent data={getOutputField('manager_output') || getOutputField('managerOutput')} campaign={campaign} />;
      case 'research':
        return <ResearchContent data={getOutputField('research_output') || getOutputField('researchOutput')} />;
      case 'strategy': {
        return <StrategyContent data={memoizedStrategyData} campaign={campaign} />;
      }
      case 'copy':
        return <CopywriterContent data={getOutputField('copy_output') || getOutputField('copyOutput')} campaign={campaign} campaignId={campaign.id} onCopyVariantsUpdate={handleCopyVariantsUpdate} />;
      case 'images':
        return <VisualsContent data={getOutputField('image_output') || getOutputField('imageOutput')} campaignId={campaignId} />;
      case 'review':
        return <ReviewContent data={getOutputField('review_output') || getOutputField('reviewOutput')} reviewScore={campaign.reviewScore} />;
      case 'published':
        return <PublisherContent data={getOutputField('publisher_output') || getOutputField('publisherOutput')} campaignName={campaign.name} campaign={campaign} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <Loader2 size={32} className="animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Campaign not found</h2>
          <p className="text-sm" style={{ color: '#8B8B9E' }}>The campaign you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  if (campaign.status === 'failed') {
    return (
      <SidebarProvider>
        <div className="min-h-screen bg-[#0A0A0F] text-[#F1F1F3] flex">
          <Sidebar />
          <div className="flex-1 flex flex-col min-h-screen">
            <TopNav title="Campaign Results" />
            <main className="flex-1 pt-24 px-6 flex items-center justify-center">
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center space-y-6 shadow-2xl max-w-xl w-full">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                  <span className="material-symbols-outlined text-3xl">error</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold text-red-400" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Campaign Generation Failed
                  </h1>
                  <p className="text-sm text-gray-400 max-w-md mx-auto">
                    An error occurred while running the AI agents pipeline for "{campaign.name}".
                  </p>
                </div>
                {campaign.aiError && (
                  <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 text-left max-w-lg mx-auto">
                    <span className="text-[10px] uppercase font-semibold text-gray-500 block mb-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      Error Details
                    </span>
                    <p className="text-sm text-red-300 font-mono break-words whitespace-pre-wrap">
                      {campaign.aiError}
                    </p>
                  </div>
                )}
                <div className="pt-4">
                  <button
                    onClick={() => navigate(`/projects/${campaign.projectId}`)}
                    className="px-5 py-2.5 rounded-xl bg-[#1A1A24] border border-[#2A2A38] text-sm font-medium hover:bg-surface hover:border-[#6366F1]/50 transition-all cursor-pointer"
                  >
                    Return to Project
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return { bg: 'rgba(78,222,163,0.1)', text: '#4edea3', label: 'Completed' };
      case 'processing':
        return { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', label: 'Processing' };
      case 'failed':
        return { bg: 'rgba(244,63,94,0.1)', text: '#F43F5E', label: 'Failed' };
      default:
        return { bg: '#1f1f25', text: '#8B8B9E', label: status };
    }
  };

  const statusStyle = getStatusStyle(campaign.status);
  const formatGoalLabel = (goal: string) => {
    const normalized = (goal || '').replace(/_/g, ' ').trim();
    if (!normalized) return 'Not specified';
    const lower = normalized.toLowerCase();
    if (lower === 'lead gen' || lower === 'lead generation') return 'Lead Generation';
    if (lower === 'lead_gen') return 'Lead Generation';
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
  const headerGoal = formatGoalLabel(campaign.primaryGoal);
  const headerIndustry = formatIndustryLabel(campaign.industry);

  return (
    <>
      <style>{`
        .result-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .result-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
        .result-shell {
          background:
            radial-gradient(circle at top left, rgba(99, 102, 241, 0.12), transparent 28%),
            radial-gradient(circle at top right, rgba(78, 222, 163, 0.08), transparent 24%),
            linear-gradient(180deg, rgba(255, 255, 255, 0.015), transparent 20%),
            #0A0A0F;
        }
        .inspector-drawer {
          transform: translate3d(100%, 0, 0);
          will-change: transform;
          transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .inspector-drawer.open {
          transform: translate3d(0, 0, 0);
        }
        .drawer-tab-btn {
          position: relative;
          padding: 12px 0;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #4A4A5E;
          cursor: pointer;
          border: none;
          background: none;
          flex: 1;
          transition: color 200ms;
        }
        .drawer-tab-btn.active {
          color: #c0c1ff;
        }
        .drawer-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #c0c1ff;
          border-radius: 2px 2px 0 0;
        }
        .score-ring {
          transition: stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1);
        }
        .draft-card {
          transition: border-color 200ms, background-color 200ms;
        }
        .draft-card:hover {
          border-color: rgba(192, 193, 255, 0.3);
          background-color: #13131a;
        }
      `}</style>

      <div className="min-h-screen result-shell animate-fade-in" style={{ color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Results" />

        <main className={`result-main pt-14 min-h-screen fade-in ${campaign.status === 'awaiting_human_approval' ? 'pb-28' : 'pb-8'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="w-full space-y-6">
              {/* Header */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#111118]/90 backdrop-blur p-5 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-3">
                    <button
                      onClick={() => navigate(`/projects/${campaign.projectId}`)}
                      className="inline-flex items-center gap-1.5 text-xs text-[#8B8B9E] hover:text-[#6366F1] transition-colors mb-1 font-medium cursor-pointer"
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      ← Back to Project
                    </button>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full border text-xs cursor-help"
                        title={`Campaign ID: ${campaignId}`}
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.text + '33',
                          color: statusStyle.text,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                        {campaign.name}
                      </h1>
                      <p className="text-sm mt-1" style={{ color: '#8B8B9E' }}>
                        {headerIndustry} • {headerGoal}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Insights Card */}
              {memoryCount > 0 && (
                <MemoryInsightsCard
                  insights={memoryInsights}
                  count={memoryCount}
                  projectId={campaign.projectId}
                />
              )}

              {/* Tab Navigation */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#111118]/80 backdrop-blur p-2 overflow-x-auto">
                <div className="flex gap-2 min-w-max w-full stagger-enter">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isCompleted = isTabCompleted(tab.id);
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all relative whitespace-nowrap border"
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '14px',
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#c0c1ff' : '#8B8B9E',
                          background: isActive ? 'rgba(99, 102, 241, 0.12)' : 'transparent',
                          borderColor: isActive ? 'rgba(99, 102, 241, 0.28)' : 'transparent',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 8px 24px rgba(99, 102, 241, 0.12)' : 'none',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.color = '#F1F1F3';
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                        }}
                      >
                        <Icon size={16} />
                        {tab.label}
                        <span 
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                            isCompleted ? 'bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.4)]' : 'bg-[#4A4A5E]'
                          }`} 
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#0F0F15]/90 backdrop-blur p-4 sm:p-5 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <Suspense fallback={<TabLoader />}>
                  {renderTabContent()}
                </Suspense>
              </div>
            </div>
          </div>

          {/* Persistent Floating Approval Actions Bar */}
          {campaign.status === 'awaiting_human_approval' && (
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0F0F15]/90 backdrop-blur-md border-t border-[#2A2A38] p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:pl-[272px] pr-8">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#F1F1F3]">Human Review Required</p>
                  <p className="text-xs text-[#8B8B9E]">AI agents have generated campaign drafts. Inspect metrics or request changes.</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => {
                    setIsMinimized(false);
                    setDrawerTab('scores');
                  }}
                  className="px-4 py-3 min-h-[44px] rounded-xl bg-[#1A1A24] border border-[#2A2A38] text-xs font-semibold hover:bg-surface hover:border-[#6366F1]/50 text-[#F1F1F3] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Inspect Scores
                </button>
                <button
                  onClick={() => {
                    setIsMinimized(false);
                    setDrawerTab('revise');
                  }}
                  className="px-4 py-3 min-h-[44px] rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs font-semibold hover:bg-[#DC2626]/20 text-[#EF4444] transition-all cursor-pointer whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Request Revision
                </button>
                <button
                  onClick={handleApprove}
                  className="px-4 py-3 min-h-[44px] rounded-xl text-xs font-semibold bg-[#4edea3] hover:bg-[#3ce595] text-[#0e0e13] transition-all cursor-pointer shadow-[0_0_15px_rgba(78,222,163,0.3)] whitespace-nowrap active:scale-[0.98] flex items-center justify-center"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  Approve &amp; Publish
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── Human Review Inspector Drawer ─────────────────────────────────── */}
        {/* Partial left-side dim overlay — does NOT block interaction with main content */}
        {showHumanReview && !isMinimized && (
          <div
            onClick={() => setIsMinimized(true)}
            className="fixed inset-0 z-[90] cursor-pointer"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
          />
        )}

        {/* "Human Review Required" floating badge — click to toggle minimized/expanded state */}
        {showHumanReview && (!isMinimized || campaign.status !== 'awaiting_human_approval') && (
          <div
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              }
            }}
            className={`fixed bottom-6 z-[95] flex items-center gap-3 px-5 py-3 rounded-full border shadow-2xl backdrop-blur-md select-none transition-all duration-300 ${
              isMinimized 
                ? 'right-6 border-[#4edea3]/40 bg-[#111118]/95 cursor-pointer hover:border-[#4edea3]/70 hover:scale-105' 
                : 'left-1/2 -translate-x-1/2 border-[#c0c1ff]/40 bg-[#111118]/95 cursor-default'
            }`}
            style={{ 
              boxShadow: isMinimized ? '0 0 30px rgba(78,222,163,0.15)' : '0 0 40px rgba(192,193,255,0.15)',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${isMinimized ? 'bg-[#4edea3] animate-ping' : 'bg-[#c0c1ff] animate-pulse'}`} />
            <span className="text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: isMinimized ? '#4edea3' : '#c0c1ff' }}>
              {isMinimized 
                ? 'Review Pending (Click to Expand Panel) ↗' 
                : 'Human Review Required — Click outside to minimize & inspect page'}
            </span>
          </div>
        )}

        {/* Right-side Inspector Drawer */}
        <div
          className={`inspector-drawer fixed top-0 right-0 h-full z-[100] flex flex-col ${
            showHumanReview && !isMinimized ? 'open' : ''
          }`}
          style={{ width: '100%', maxWidth: '480px', background: '#0d0d14', borderLeft: '1px solid rgba(192,193,255,0.15)', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2b]" style={{ background: '#0d0d14' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(192,193,255,0.1)', border: '1px solid rgba(192,193,255,0.2)' }}>
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Human-in-the-Loop</p>
                <h2 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Inspector Panel</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {qualityScore !== null && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold mr-1" style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(78,222,163,0.12)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.25)' }}>
                  {qualityScore.toFixed(1)}/10
                </span>
              )}
              {/* Minimize/Collapse Button */}
              <button 
                onClick={() => setIsMinimized(true)} 
                className="p-1 rounded hover:bg-[#1e1e2b] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
                title="Minimize Inspector Panel"
              >
                <span className="material-symbols-outlined text-[20px] block">keyboard_double_arrow_right</span>
              </button>
            </div>
          </div>

          {/* Drawer Tabs */}
          <div className="flex border-b border-[#1e1e2b] px-2 overflow-x-auto scrollbar-none min-w-max w-full">
            <button className={`drawer-tab-btn ${drawerTab === 'scores' ? 'active' : ''}`} onClick={() => setDrawerTab('scores')}>Review Scores</button>
            <button className={`drawer-tab-btn ${drawerTab === 'inspect' ? 'active' : ''}`} onClick={() => setDrawerTab('inspect')}>Inspect Drafts</button>
            <button className={`drawer-tab-btn ${drawerTab === 'revise' ? 'active' : ''}`} onClick={() => setDrawerTab('revise')}>Request Revision</button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A38 transparent' }}>

            {/* TAB 1 — Review Scores */}
            {drawerTab === 'scores' && (
              <div className="p-6 space-y-5">
                {/* Overall Score Ring */}
                <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                  <div className="relative flex-shrink-0 w-[88px] h-[88px]">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="36" fill="none" stroke="#1e1e2b" strokeWidth="8" />
                      <circle
                        cx="44" cy="44" r="36" fill="none"
                        stroke={qualityScore !== null && qualityScore >= 8.5 ? '#4edea3' : qualityScore !== null && qualityScore >= 7 ? '#FFA500' : '#F43F5E'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - (qualityScore ?? 0) / 10)}`}
                        transform="rotate(-90 44 44)"
                        className="score-ring"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                        {qualityScore !== null ? qualityScore.toFixed(1) : '—'}
                      </span>
                      <span className="text-[9px]" style={{ color: '#4A4A5E' }}>/10</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Overall Quality</p>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      {qualityScore !== null && qualityScore >= 8.5
                        ? 'Excellent — content meets all quality benchmarks.'
                        : qualityScore !== null && qualityScore >= 7
                        ? 'Good — minor improvements suggested below.'
                        : qualityScore !== null
                        ? 'Needs revision — review issues before publishing.'
                        : 'Score calculating...'}
                    </p>
                  </div>
                </div>

                {/* Per-Agent Score Bars */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e2b' }}>
                  <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Agent Quality Breakdown</p>
                  </div>
                  <div className="p-4 space-y-4" style={{ background: '#0d0d14' }}>
                    {([
                      { key: 'research', label: 'Research', icon: 'search' },
                      { key: 'strategy', label: 'Strategy', icon: 'lightbulb' },
                      { key: 'copywriter', label: 'Copywriter', icon: 'edit_note' },
                      { key: 'image_prompt', label: 'Image Prompt', icon: 'image' },
                    ] as const).map(({ key, label, icon }) => {
                      const score = agentScores[key as keyof typeof agentScores];
                      const pct = score !== null ? (score / 10) * 100 : 0;
                      const color = score === null ? '#4A4A5E' : score >= 8.5 ? '#4edea3' : score >= 7 ? '#FFA500' : '#F43F5E';
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
                              <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
                              {score !== null ? `${score.toFixed(1)}/10` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#1e1e2b' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reviewer Notes */}
                {reviewerNotes && (
                  <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                    <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>AI Reviewer Summary</p>
                    </div>
                    <div className="p-4 space-y-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                      {reviewerNotes.feedback && (
                        <p className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{reviewerNotes.feedback}</p>
                      )}
                      {reviewerNotes.issues.length > 0 && (
                        <ul className="space-y-2 mt-2">
                          {reviewerNotes.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style={{ color: '#c0c1ff' }}>info</span>
                              <span className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!reviewerNotes.feedback && reviewerNotes.issues.length === 0 && (
                        <p className="text-xs" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>No specific notes from the reviewer.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Revision budget used */}
                <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                  <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Budget Used</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                    {Object.entries(revisionCounts).map(([key, count]) => {
                      const MAX = 3;
                      const label = key === 'copywriter' ? 'Copywriter' : key === 'image_prompt' ? 'Image Prompt' : key.charAt(0).toUpperCase() + key.slice(1);
                      const isMax = count >= MAX;
                      const isWarn = count === MAX - 1;
                      const dotColor = isMax ? '#F43F5E' : isWarn ? '#FFA500' : '#4edea3';
                      return (
                        <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                          <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                          <span className="flex items-center gap-1.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-2 h-2 rounded-full" style={{ background: i < count ? dotColor : '#1e1e2b' }} />
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setDrawerTab('inspect')}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(192,193,255,0.08)', color: '#c0c1ff', border: '1px solid rgba(192,193,255,0.15)' }}
                >
                  <span className="material-symbols-outlined text-[16px]">article</span>
                  Review Full Drafts →
                </button>
              </div>
            )}

            {/* TAB 2 — Inspect Drafts */}
            {drawerTab === 'inspect' && (
              <div className="p-6 space-y-4">
                <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Generated Campaign Artifacts</p>

                {parsedCampaignOutputs ? (() => {
                  const { copyData, strategyData, imageData, managerData } = parsedCampaignOutputs;
                  const sections: Array<{ label: string; icon: string; color: string; content: React.ReactNode }> = [];

                  // Strategy preview
                  if (strategyData) {
                    sections.push({
                      label: 'Strategy', icon: 'lightbulb', color: '#c0c1ff',
                      content: (
                        <div className="space-y-2">
                          {strategyData.positioning && (
                            <div>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Positioning</p>
                              <p className="text-xs leading-relaxed" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{strategyData.positioning}</p>
                            </div>
                          )}
                          {strategyData.key_messages && strategyData.key_messages.length > 0 && (
                            <div>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Key Messages</p>
                              <ul className="space-y-1">
                                {strategyData.key_messages.slice(0, 3).map((msg: string, i: number) => (
                                  <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                                    <span className="text-[#c0c1ff] flex-shrink-0 mt-0.5">→</span>{msg}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ),
                    });
                  }

                  // Resolve channels to display in preview (ensures warning alert empty states are visible)
                  const normalizeChannelName = (ch: string): string => {
                    const normalized = ch.toLowerCase().trim();
                    if (normalized === 'google ads' || normalized === 'google_ads' || normalized === 'googleads') return 'google_ads';
                    return normalized;
                  };
                  const selectedChannels = (managerData?.channels || []).map(normalizeChannelName);
                  const flatCopyData = copyData?.copies ? { ...copyData, ...copyData.copies } : copyData;
                  const copyChannels = flatCopyData
                    ? Object.keys(flatCopyData).filter(k => !['inferred_goal', 'copies', 'messaging_framework', 'strategic_alignment', 'copy_readiness'].includes(k))
                    : [];
                  const activeChannels = selectedChannels.length > 0 ? selectedChannels : copyChannels;

                  // Copy preview (shows all active channels with explicit missing alerts)
                  if (flatCopyData && activeChannels.length > 0) {
                    sections.push({
                      label: 'Ad Copy', icon: 'edit_note', color: '#4edea3',
                      content: (
                        <div className="space-y-3">
                          {activeChannels.map((ch: string) => {
                            const ch_data = flatCopyData[ch];
                            const hasCopy = !!ch_data;
                            const headline = ch_data?.headline || ch_data?.subject || '';
                            const body = ch_data?.body || ch_data?.caption || ch_data?.post || '';
                            
                            if (!hasCopy) {
                              return (
                                <div key={ch} className="p-3 rounded-lg border border-[#F43F5E]/20 bg-[#F43F5E]/5">
                                  <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: '#F43F5E', fontFamily: 'JetBrains Mono, monospace' }}>
                                    <ChannelIcon channel={ch} size={10} />
                                    <span>{ch.replace('_', ' ')}</span>
                                  </p>
                                  <p className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                                    ⚠️ Copywriter agent did not generate content for this channel.
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                                <div key={ch} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                                  <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1.5" style={{ color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                                    <ChannelIcon channel={ch} size={10} />
                                    <span>{ch.replace('_', ' ')}</span>
                                  </p>
                                  {headline && <p className="text-xs font-semibold mb-1" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>{headline}</p>}
                                  {body && <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{typeof body === 'string' ? body : JSON.stringify(body).slice(0, 200)}</p>}
                                </div>
                            );
                          })}
                        </div>
                      ),
                    });
                  }

                  // Visuals preview (shows all generated visual prompts)
                  if (imageData?.image_prompts) {
                    sections.push({
                      label: 'Image Prompts', icon: 'image', color: '#FFA500',
                      content: (
                        <div className="space-y-3">
                          {imageData.image_prompts.map((p: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {p.deliverable_name || `Prompt ${i + 1}`}
                                </p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,165,0,0.1)', color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {p.aspect_ratio || '1:1'}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{p.prompt}</p>
                            </div>
                          ))}
                        </div>
                      ),
                    });
                  }

                  if (sections.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>article</span>
                        <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Campaign drafts are not yet available.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {sections.map(({ label, icon, color, content }) => (
                        <div key={label} className="draft-card rounded-xl" style={{ border: '1px solid #1e1e2b', background: '#0d0d14' }}>
                          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #1e1e2b', background: '#111118', borderRadius: '12px 12px 0 0' }}>
                            <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
                            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>{label}</p>
                          </div>
                          <div className="p-4">{content}</div>
                        </div>
                      ))}
                    </>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>hourglass_empty</span>
                    <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Loading campaign data...</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3 — Request Revision */}
            {drawerTab === 'revise' && (
              <div className="p-6 space-y-5">
                {/* Agent Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Select Agent to Revise</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      { key: 'research', label: 'Research', icon: 'search', downstream: 'Re-runs Strategy → Copy → Image → Reviewer' },
                      { key: 'strategy', label: 'Strategy', icon: 'lightbulb', downstream: 'Re-runs Copy → Image → Reviewer' },
                      { key: 'copywriter', label: 'Copywriter', icon: 'edit_note', downstream: 'Re-runs Image → Reviewer' },
                      { key: 'image_prompt', label: 'Image Prompt', icon: 'image', downstream: 'Re-runs Reviewer only' },
                    ] as const).map(({ key, label, icon, downstream }) => {
                      const count = revisionCounts[key as keyof typeof revisionCounts];
                      const isMax = count >= 3;
                      const isSelected = selectedAgent === key;
                      return (
                        <button
                          key={key}
                          onClick={() => !isMax && setSelectedAgent(key)}
                          disabled={isMax}
                          title={downstream}
                          className="relative flex flex-col items-start p-3 rounded-xl text-left transition-all"
                          style={{
                            background: isSelected ? 'rgba(192,193,255,0.1)' : '#111118',
                            border: isSelected ? '1px solid rgba(192,193,255,0.4)' : '1px solid #1e1e2b',
                            opacity: isMax ? 0.4 : 1,
                            cursor: isMax ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px] mb-2" style={{ color: isSelected ? '#c0c1ff' : '#4A4A5E' }}>{icon}</span>
                          <span className="text-xs font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: isSelected ? '#F1F1F3' : '#8B8B9E' }}>{label}</span>
                          <div className="flex items-center gap-1 mt-1.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < count ? '#F43F5E' : '#1e1e2b' }} />
                            ))}
                            <span className="text-[9px] ml-1" style={{ color: isMax ? '#F43F5E' : '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>{count}/3{isMax ? ' MAX' : ''}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Downstream Impact */}
                {selectedAgent && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(192,193,255,0.05)', border: '1px solid rgba(192,193,255,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>⚡ Downstream Impact</p>
                    <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      {selectedAgent === 'research' && 'Revising Research will cascade to Strategy → Copywriter → Image Prompt → Reviewer. All downstream agents will re-run.'}
                      {selectedAgent === 'strategy' && 'Revising Strategy will cascade to Copywriter → Image Prompt → Reviewer.'}
                      {selectedAgent === 'copywriter' && 'Revising Copywriter will cascade to Image Prompt → Reviewer.'}
                      {selectedAgent === 'image_prompt' && 'Only Image Prompt and the Reviewer will re-run.'}
                    </p>
                  </div>
                )}

                {/* Feedback Textarea */}
                <div>
                  <p className="text-xs mb-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                    <strong>Tip:</strong> For channel changes, use Copywriter or Strategy. For a full campaign rework, use Strategy — it regenerates everything downstream automatically.
                  </p>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Instructions</label>
                  <textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="e.g., The copywriting tone is too formal. Please make it more casual and conversational for Gen Z."
                    rows={5}
                    className="w-full rounded-xl px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2"
                    style={{
                      background: '#111118',
                      border: '1px solid #2A2A38',
                      color: '#F1F1F3',
                      fontFamily: 'Sora, sans-serif',
                      boxShadow: 'none',
                    }}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(192,193,255,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(192,193,255,0.1)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid #2A2A38'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p className="text-[10px] mt-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
                    Tip: Be specific — mention what's wrong and what tone/direction you prefer.
                  </p>
                </div>

                <button
                  onClick={handleRequestRevision}
                  disabled={revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 active:scale-[0.98]"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 24px rgba(220,38,38,0.4)',
                    opacity: revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3 ? 0.3 : 1,
                    cursor: revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3 ? 'not-allowed' : 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    if (revisionCounts[selectedAgent as keyof typeof revisionCounts] < 3) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#EF4444';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(220,38,38,0.55)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                  onTouchStart={(e) => {
                    if (revisionCounts[selectedAgent as keyof typeof revisionCounts] < 3) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#EF4444';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(220,38,38,0.55)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                  onTouchCancel={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Request Revision
                </button>
              </div>
            )}
          </div>

          {/* Sticky Footer — Approve & Publish */}
          {drawerTab !== 'revise' && (
          <div className="px-6 py-4" style={{ borderTop: '1px solid #1e1e2b', background: '#0d0d14' }}>
            <button
              onClick={handleApprove}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                background: 'linear-gradient(135deg, #c0c1ff 0%, #a8a9ff 100%)',
                color: '#0e0e13',
                boxShadow: '0 4px 20px rgba(192,193,255,0.25)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(192,193,255,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(192,193,255,0.25)'; }}
              onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(192,193,255,0.4)'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(192,193,255,0.25)'; }}
              onTouchCancel={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(192,193,255,0.25)'; }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Approve &amp; Publish Campaign
            </button>
            <p className="text-[10px] text-center mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
              This will trigger the Publisher Agent to finalize all deliverables.
            </p>
          </div>
          )}
        </div>
      </div>
    </>
  );
};

const CampaignResultPageWithProvider: React.FC = () => (
  <SidebarProvider>
    <CampaignResultPage />
  </SidebarProvider>
);

export default CampaignResultPageWithProvider;
