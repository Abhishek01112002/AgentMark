import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Loader2, FolderOpen, RotateCcw } from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../../shared/topNav/TopNav';
import { GlobalSpinner } from '../../../../../shared/GlobalSpinner';
import { CampaignResultProvider, useCampaignResultContext } from './context/CampaignResultContext';
import { ResultHeader } from './components/ResultHeader';
import { ResultTabs } from './components/ResultTabs';
import { formatErrorText } from './utils/campaignUtils';

// Lazy-load heavier auxiliary components to keep initial parse bundle budget < 35 KB
const MemoryInsightsCard = lazy(() => import('./MemoryInsightsCard'));
const CreateVariantModal = lazy(() => import('./CreateVariantModal'));
const ResultSidebar      = lazy(() => import('./components/ResultSidebar').then(m => ({ default: m.ResultSidebar })));

// Lazy-load each tab's content so its JS chunk is only fetched when the tab is first opened
const OverviewContent    = lazy(() => import('./overview/OverviewContent'));
const ResearchContent    = lazy(() => import('./research/ResearchContent'));
const StrategyContent    = lazy(() => import('./strategy/StrategyContent'));
const CopywriterContent  = lazy(() => import('./copywriter/CopywriterContent'));
const VisualsContent     = lazy(() => import('./visuals/VisualsContent'));
const ReviewContent      = lazy(() => import('./review/ReviewContent'));
const PublisherContent   = lazy(() => import('./publisher/PublisherContent'));
const FocusGroupContent  = lazy(() => import('./focusGroup/FocusGroupPanel'));

/** Minimal fallback rendered while a tab's chunk is being fetched. */
const TabLoader = () => (
  <div className="py-12 flex items-center justify-center">
    <GlobalSpinner size="md" label="Loading module chunk..." />
  </div>
);

const CampaignResultPageContent: React.FC = () => {
  const navigate = useNavigate();
  const {
    campaignId,
    campaign,
    loading,
    notFound,
    activeTab,
    memoryInsights,
    memoryCount,
    showVariantModal,
    setShowVariantModal,
    focusGroupReport,
    focusGroupLoading,
    focusGroupError,
    getOutputField,
    resolvedChannels,
    activeCopyText,
    memoizedStrategyData,
    handleCopyVariantsUpdate,
    handleRunSimulation,
    handleVariantCreated,
    handleRetryCampaign,
    handleEditBrief,
    isRetryingCampaign,
  } = useCampaignResultContext();

  const renderTabContent = () => {
    if (!campaign) return null;
    
    switch (activeTab) {
      case 'overview':
        return <OverviewContent data={getOutputField('manager_output') || getOutputField('managerOutput')} campaign={campaign} />;
      case 'research':
        return <ResearchContent data={getOutputField('research_output') || getOutputField('researchOutput')} />;
      case 'strategy':
        return <StrategyContent data={memoizedStrategyData} campaign={campaign} />;
      case 'copy':
        return <CopywriterContent data={getOutputField('copy_output') || getOutputField('copyOutput')} campaign={campaign} campaignId={campaign.id} onCopyVariantsUpdate={handleCopyVariantsUpdate} />;
      case 'images':
        return <VisualsContent data={getOutputField('image_output') || getOutputField('imageOutput')} campaignId={campaignId} />;
      case 'review':
        return <ReviewContent data={getOutputField('review_output') || getOutputField('reviewOutput')} reviewScore={campaign.reviewScore} />;
      case 'published':
        return <PublisherContent data={getOutputField('publisher_output') || getOutputField('publisherOutput')} campaignName={campaign.name} campaign={campaign} />;
      case 'focus-group': {
        const { channels, flatCopyData, copyVariants } = resolvedChannels;
        const championCopies: Record<string, { headline?: string; body?: string }> = {};
        
        channels.forEach((channel: string) => {
          const channelVariants = copyVariants[channel] || [];
          const champion = channelVariants.find((v: any) => v.isChampion) || channelVariants[0];
          if (champion) {
            championCopies[channel] = {
              headline: champion.headline || champion.subject,
              body: champion.body_copy || champion.body
            };
          } else {
            const legacyCopy = flatCopyData?.[channel] || flatCopyData?.copies?.[channel];
            if (legacyCopy) {
              championCopies[channel] = {
                headline: legacyCopy.headline || legacyCopy.subject,
                body: legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption
              };
            }
          }
        });

        const resolvedCopies = championCopies;

        return (
          <FocusGroupContent
            report={focusGroupReport}
            copyText={activeCopyText.slice(0, 4000)}
            copies={resolvedCopies}
            targetAudience={campaign.targetAudience}
            isLoading={focusGroupLoading}
            onRunSimulation={handleRunSimulation}
            error={focusGroupError}
          />
        );
      }
    }
  };

  if (loading) {
    return <GlobalSpinner fullPage label="Loading Campaign Results..." sublabel="Fetching artifacts & AI simulation context..." />;
  }

  if (notFound || !campaign) {
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
                      {formatErrorText(campaign.aiError)}
                    </p>
                  </div>
                )}
                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleRetryCampaign}
                    disabled={isRetryingCampaign}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#8083ff] text-white text-sm font-medium transition-all shadow-lg shadow-[#6366F1]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    {isRetryingCampaign ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Retrying...
                      </>
                    ) : (
                      <>
                        <RotateCcw size={16} />
                        Retry Campaign
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleEditBrief}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#1A1A24] border border-[#2A2A38] text-sm font-medium hover:bg-surface hover:border-[#6366F1]/50 text-gray-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    <PenTool size={15} />
                    Edit Brief & Retry
                  </button>

                  <button
                    onClick={() => navigate(`/projects/${campaign.projectId}`)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#13131A] border border-[#2A2A3A] text-sm font-medium text-gray-300 hover:text-white hover:bg-[#1A1A24] hover:border-[#3A3A4E] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    <FolderOpen size={15} className="text-[#8B8B9E]" />
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

  return (
    <>
      <div className="min-h-screen result-shell animate-fade-in" style={{ color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Results" />

        <main className={`result-main pt-14 min-h-screen fade-in ${campaign.status === 'awaiting_human_approval' ? 'pb-28' : 'pb-8'}`} style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-4 sm:px-4 sm:py-5 md:px-6 lg:px-8">
            <div className="w-full space-y-4">
              {/* Apple Pro Compact Glassmorphic Header */}
              <ResultHeader />

              {/* Memory Insights Card */}
              {memoryCount > 0 && (
                <Suspense fallback={null}>
                  <MemoryInsightsCard
                    insights={memoryInsights}
                    count={memoryCount}
                    projectId={campaign.projectId}
                  />
                </Suspense>
              )}

              {/* Apple Segmented Pill Tab Bar */}
              <ResultTabs />

              {/* Tab Content */}
              <div className="rounded-2xl border border-[#2A2A38] bg-[#0F0F15]/90 backdrop-blur p-4 sm:p-5 md:p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
                <Suspense fallback={<TabLoader />}>
                  {renderTabContent()}
                </Suspense>
              </div>
            </div>
          </div>

          <Suspense fallback={null}>
            <ResultSidebar />
          </Suspense>
        </main>
      </div>

      {showVariantModal && campaign && (
        <Suspense fallback={null}>
          <CreateVariantModal
            campaign={{ id: campaign.id, name: campaign.name, projectId: campaign.projectId }}
            onClose={() => setShowVariantModal(false)}
            onCreated={handleVariantCreated}
          />
        </Suspense>
      )}
    </>
  );
};

const CampaignResultPageWithProvider: React.FC = () => (
  <SidebarProvider>
    <CampaignResultProvider>
      <CampaignResultPageContent />
    </CampaignResultProvider>
  </SidebarProvider>
);

export default CampaignResultPageWithProvider;
