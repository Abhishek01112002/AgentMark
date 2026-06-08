import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Target, PenTool, Image as ImageIcon, CheckSquare, Send, LucideIcon } from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../../shared/topNav/TopNav';
import ResearchContent from './research/ResearchContent';
import StrategyContent from './strategy/StrategyContent';
import CopywriterContent from './copywriter/CopywriterContent';
import VisualsContent from './visuals/VisualsContent';
import ReviewContent from './review/ReviewContent';
import PublisherContent from './publisher/PublisherContent';

type TabId = 'research' | 'strategy' | 'copy' | 'images' | 'review' | 'published';

interface Tab {
  id: TabId;
  label: string;
  icon: LucideIcon;
}

const tabs: Tab[] = [
  { id: 'research', label: 'Research', icon: FileText },
  { id: 'strategy', label: 'Strategy', icon: Target },
  { id: 'copy', label: 'Copy', icon: PenTool },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'review', label: 'Review', icon: CheckSquare },
  { id: 'published', label: 'Published', icon: Send },
];

const CampaignResultPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('research');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'research':
        return <ResearchContent />;
      case 'strategy':
        return <StrategyContent />;
      case 'copy':
        return <CopywriterContent />;
      case 'images':
        return <VisualsContent />;
      case 'review':
        return <ReviewContent />;
      case 'published':
        return <PublisherContent />;
    }
  };

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
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Results" />

        <main className="result-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded bg-[#1f1f25] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                  ✓ Completed
                </span>
                <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                  Campaign ID: {campaignId}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                Q4 Product Launch Multi-Channel
              </h1>
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-[#2A2A38] overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="flex items-center gap-2 px-4 py-3 transition-all relative whitespace-nowrap"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '14px',
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? '#c0c1ff' : '#8B8B9E',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        borderBottom: isActive ? '2px solid #c0c1ff' : '2px solid transparent',
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
            <div>
              {renderTabContent()}
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
