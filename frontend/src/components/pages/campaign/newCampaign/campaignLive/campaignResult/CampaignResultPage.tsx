import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Target, PenTool, Image as ImageIcon, CheckSquare, Send, LucideIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../../../services/api';
import Sidebar, { SidebarProvider } from '../../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../../shared/topNav/TopNav';
import OverviewContent from './overview/OverviewContent';
import ResearchContent from './research/ResearchContent';
import StrategyContent from './strategy/StrategyContent';
import CopywriterContent from './copywriter/CopywriterContent';
import VisualsContent from './visuals/VisualsContent';
import ReviewContent from './review/ReviewContent';
import PublisherContent from './publisher/PublisherContent';

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
  reviewScore?: number | null;
  createdAt: string;
  updatedAt: string;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: Target },
  { id: 'research', label: 'Research', icon: FileText },
  { id: 'strategy', label: 'Strategy', icon: Target },
  { id: 'copy', label: 'Copy', icon: PenTool },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'review', label: 'Review', icon: CheckSquare },
  { id: 'published', label: 'Published', icon: Send },
];

const CampaignResultPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!campaignId) return;
      
      try {
        const projectId = new URLSearchParams(window.location.search).get('projectId');
        const url = projectId ? `/campaigns/${campaignId}?projectId=${projectId}` : `/campaigns/${campaignId}`;
        const response = await api.get(url);
        setCampaign(response.data.campaign);
      } catch (error: any) {
        console.error('Failed to fetch campaign:', error);
        toast.error('Failed to load campaign data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCampaign();
  }, [campaignId]);

  const renderTabContent = () => {
    if (!campaign) return null;
    
    const aiOutputs = campaign.aiOutputs || {};
    
    switch (activeTab) {
      case 'overview':
        return <OverviewContent data={aiOutputs.manager_output} campaign={campaign} />;
      case 'research':
        return <ResearchContent data={aiOutputs.research_output} />;
      case 'strategy': {
        const rawCalendar = aiOutputs.publisher_output?.content_calendar || {};
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
        const strategyData = {
          ...aiOutputs.strategy_output,
          content_calendar: flatCalendar
        };
        return <StrategyContent data={strategyData} />;
      }
      case 'copy':
        return <CopywriterContent data={aiOutputs.copy_output} />;
      case 'images':
        return <VisualsContent data={aiOutputs.image_output} />;
      case 'review':
        return <ReviewContent data={aiOutputs.review_output} reviewScore={campaign.reviewScore} />;
      case 'published':
        return <PublisherContent data={aiOutputs.publisher_output || aiOutputs.publishing_output} campaignName={campaign.name} />;
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
      `}</style>

      <div className="min-h-screen result-shell" style={{ color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Results" />

        <main className="result-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="w-full space-y-6">
              {/* Header */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#111118]/90 backdrop-blur p-5 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="px-2 py-0.5 rounded-full border text-xs"
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.text + '33',
                          color: statusStyle.text,
                        }}
                      >
                        {statusStyle.label}
                      </span>
                      <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>
                        Campaign ID: {campaignId}
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

              {/* Tab Navigation */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#111118]/80 backdrop-blur p-2 overflow-x-auto">
                <div className="flex gap-2 min-w-max w-full">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
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
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tab Content */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#0F0F15]/90 backdrop-blur p-4 sm:p-5 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </main>
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
