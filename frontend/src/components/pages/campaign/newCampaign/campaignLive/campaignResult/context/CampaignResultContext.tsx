import React, { createContext, useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { TabId, RevisionCounts, AgentScores, ReviewerNotes, DrawerTab } from '../types';
import { NormalizedCampaign, NormalizedFocusGroupReport } from '../types/normalized';
import { useCampaignResult } from '../hooks/useCampaignResult';
import { useCampaignSocket } from '../hooks/useCampaignSocket';
import { useCampaignPolling } from '../hooks/useCampaignPolling';
import {
  selectFocusGroupReport,
  selectQualityScore,
  selectAgentScores,
  selectRevisionCounts,
  selectReviewerNotes,
  selectResolvedChannels,
  selectActiveCopyText,
  selectCopyHash,
} from '../selectors/campaignSelectors';

interface CampaignResultContextType {
  campaignId: string | undefined;
  campaign: NormalizedCampaign | null;
  loading: boolean;
  notFound: boolean;
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  memoryInsights: any[];
  memoryCount: number;
  showHumanReview: boolean;
  setShowHumanReview: (show: boolean) => void;
  isMinimized: boolean;
  setIsMinimized: (minimized: boolean) => void;
  selectedAgent: string;
  setSelectedAgent: (agent: string) => void;
  revisionFeedback: string;
  setRevisionFeedback: (feedback: string) => void;
  revisionCounts: RevisionCounts;
  qualityScore: number | null;
  agentScores: AgentScores;
  drawerTab: DrawerTab;
  setDrawerTab: (tab: DrawerTab) => void;
  reviewerNotes: ReviewerNotes | null;
  showVariantModal: boolean;
  setShowVariantModal: (show: boolean) => void;
  focusGroupReport: NormalizedFocusGroupReport | null;
  focusGroupLoading: boolean;
  focusGroupError: string | null;
  focusGroupUpdatedViaMcp: boolean;
  setFocusGroupUpdatedViaMcp: (updated: boolean) => void;
  isRetryingCampaign: boolean;
  getOutputField: (field: string) => any;
  resolvedChannels: { channels: string[]; flatCopyData: any; copyVariants: any };
  activeCopyText: string;
  copyHash: string;
  parsedCampaignOutputs: any;
  memoizedStrategyData: any;
  isTabCompleted: (tabId: TabId) => boolean;
  handleApprove: () => Promise<void>;
  handleRequestRevision: () => Promise<void>;
  handleRunSimulation: () => Promise<void>;
  handleCopyVariantsUpdate: (updatedCopyVariants: any) => void;
  handleVariantCreated: (newCampaignId: string, projectId: string, selectedStage?: string) => void;
  handleRetryCampaign: () => Promise<void>;
  handleEditBrief: () => void;
}

const CampaignResultContext = createContext<CampaignResultContextType | undefined>(undefined);

export const CampaignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const {
    campaign,
    dispatch,
    loading,
    notFound,
    memoryInsights,
    memoryCount,
    decisionMadeRef,
    showHumanReview,
    setShowHumanReview,
    isMinimized,
    setIsMinimized,
    selectedAgent,
    setSelectedAgent,
    revisionFeedback,
    setRevisionFeedback,
    drawerTab,
    setDrawerTab,
    showVariantModal,
    setShowVariantModal,
    focusGroupLoading,
    setFocusGroupLoading,
    focusGroupError,
    setFocusGroupError,
    isRetryingCampaign,
    setIsRetryingCampaign,
  } = useCampaignResult(campaignId);

  useCampaignSocket({
    campaignId,
    dispatch,
    setShowHumanReview,
  });

  // Pure Zero-Parsing Derived Selectors
  const resolvedChannels = useMemo(() => selectResolvedChannels(campaign), [campaign]);
  const activeCopyText = useMemo(() => selectActiveCopyText(campaign), [campaign]);
  const copyHash = useMemo(() => selectCopyHash(campaign), [campaign]);
  const focusGroupReport = useMemo(() => selectFocusGroupReport(campaign, copyHash), [campaign, copyHash]);
  const qualityScore = useMemo(() => selectQualityScore(campaign), [campaign]);
  const agentScores = useMemo(() => selectAgentScores(campaign), [campaign]);
  const revisionCounts = useMemo(() => selectRevisionCounts(campaign), [campaign]);
  const reviewerNotes = useMemo(() => selectReviewerNotes(campaign), [campaign]);

  const { handleRunSimulation } = useCampaignPolling({
    campaign,
    dispatch,
    focusGroupLoading,
    setFocusGroupLoading,
    setFocusGroupError,
    activeCopyText,
    copyHash,
  });

  // ⚡ FAANG-Grade Auto-Reactive Focus Group Re-Evaluation on Copy Revision
  const autoSimulatedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      campaign &&
      activeCopyText &&
      copyHash &&
      !campaign.focusGroupOutputs?.[copyHash] &&
      !focusGroupLoading &&
      autoSimulatedRef.current !== copyHash
    ) {
      autoSimulatedRef.current = copyHash;
      handleRunSimulation();
    }
  }, [campaign, activeCopyText, copyHash, focusGroupLoading, handleRunSimulation]);

  const getOutputField = useCallback(
    (field: string) => {
      if (!campaign) return null;
      switch (field) {
        case 'manager_output':
        case 'managerOutput':
          return campaign.manager;
        case 'research_output':
        case 'researchOutput':
          return campaign.research;
        case 'strategy_output':
        case 'strategyOutput':
          return campaign.strategy;
        case 'copy_output':
        case 'copyOutput':
          return campaign.copy;
        case 'image_output':
        case 'imageOutput':
          return campaign.visuals;
        case 'review_output':
        case 'reviewOutput':
          return campaign.review;
        case 'publisher_output':
        case 'publisherOutput':
          return campaign.publisher;
        default:
          return (campaign as any)[field] || null;
      }
    },
    [campaign]
  );

  const memoizedStrategyData = useMemo(() => {
    if (!campaign || !campaign.strategy) return null;
    const publisherData = campaign.publisher;
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
          status: 'planned',
        });
      });
    });
    return {
      ...campaign.strategy,
      content_calendar: flatCalendar,
    };
  }, [campaign]);

  const handleCopyVariantsUpdate = useCallback(
    (updatedCopyVariants: any) => {
      dispatch({
        type: 'COPY_VARIANTS_UPDATED',
        payload: updatedCopyVariants,
      });
    },
    [dispatch]
  );

  const handleApprove = useCallback(async () => {
    try {
      decisionMadeRef.current = true;
      setShowHumanReview(false);
      setIsMinimized(true);
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'approve',
      });
      window.dispatchEvent(new Event('campaign_status_changed'));
      toast.success('Campaign approved! Resuming publisher...');
      navigate(`/campaign/${campaignId}/live`, { state: { initialActiveAgent: 'publisher' } });
    } catch (error) {
      decisionMadeRef.current = false;
      console.error('Failed to submit approval:', error);
      toast.error('Failed to submit approval decision');
    }
  }, [campaignId, navigate, setShowHumanReview, setIsMinimized, decisionMadeRef]);

  const handleRequestRevision = useCallback(async () => {
    if (!revisionFeedback.trim()) {
      toast.error('Please provide feedback for the revision');
      return;
    }

    try {
      decisionMadeRef.current = true;
      setShowHumanReview(false);
      setIsMinimized(true);
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'reject',
        revisionTarget: selectedAgent,
        targetAgent: selectedAgent,
        feedback: revisionFeedback,
      });
      window.dispatchEvent(new Event('campaign_status_changed'));
      toast.success(`Revision requested for ${selectedAgent}. Regenerating...`);
      navigate(`/campaign/${campaignId}/live`, { state: { initialActiveAgent: selectedAgent } });
    } catch (error: any) {
      decisionMadeRef.current = false;
      console.error('Failed to submit revision request:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to submit revision request');
    }
  }, [campaignId, selectedAgent, revisionFeedback, navigate, setShowHumanReview, setIsMinimized, decisionMadeRef]);

  const handleVariantCreated = useCallback(
    (newCampaignId: string, projectId: string, selectedStage?: string) => {
      setShowVariantModal(false);
      toast.success('Variant created! Starting generation pipeline...');
      if (selectedStage) {
        navigate(`/campaign/${newCampaignId}/live?projectId=${projectId}`, {
          state: { initialActiveAgent: selectedStage },
        });
      } else {
        navigate(`/campaign/${newCampaignId}/live?projectId=${projectId}`);
      }
    },
    [navigate, setShowVariantModal]
  );

  const handleRetryCampaign = useCallback(async () => {
    if (!campaignId || isRetryingCampaign) return;
    setIsRetryingCampaign(true);
    try {
      await api.post(`/campaigns/${campaignId}/retry`);
      toast.success('Retrying campaign generation...');
      const rawProjectId = new URLSearchParams(window.location.search).get('projectId');
      const projectId = rawProjectId && rawProjectId !== 'undefined' && rawProjectId !== 'null' ? rawProjectId : null;
      const liveUrl = projectId ? `/campaign/${campaignId}/live?projectId=${projectId}` : `/campaign/${campaignId}/live`;
      navigate(liveUrl);
    } catch (err: any) {
      console.error('Failed to retry campaign:', err);
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to retry campaign';
      toast.error(msg);
    } finally {
      setIsRetryingCampaign(false);
    }
  }, [campaignId, isRetryingCampaign, navigate, setIsRetryingCampaign]);

  const handleEditBrief = useCallback(() => {
    if (!campaign) return;
    navigate(`/campaign/new?editCampaignId=${campaign.id}&projectId=${campaign.projectId}`);
  }, [campaign, navigate]);

  const isTabCompleted = useCallback(
    (tabId: TabId) => {
      if (!campaign) return false;
      const status = campaign.status.toLowerCase();
      if (status === 'completed') return true;
      if (status === 'awaiting_human_approval' && tabId !== 'published') return true;

      switch (tabId) {
        case 'overview':
          return Boolean(campaign.manager);
        case 'research':
          return Boolean(campaign.research);
        case 'strategy':
          return Boolean(campaign.strategy);
        case 'copy':
          return Boolean(campaign.copy);
        case 'images':
          return Boolean(campaign.visuals);
        case 'review':
          return Boolean(campaign.review);
        case 'published':
          return Boolean(campaign.publisher);
        case 'focus-group':
          return Boolean(campaign.focusGroup);
        default:
          return false;
      }
    },
    [campaign]
  );

  return (
    <CampaignResultContext.Provider
      value={{
        campaignId,
        campaign,
        loading,
        notFound,
        activeTab,
        setActiveTab,
        memoryInsights,
        memoryCount,
        showHumanReview,
        setShowHumanReview,
        isMinimized,
        setIsMinimized,
        selectedAgent,
        setSelectedAgent,
        revisionFeedback,
        setRevisionFeedback,
        revisionCounts,
        qualityScore,
        agentScores,
        drawerTab,
        setDrawerTab,
        reviewerNotes,
        showVariantModal,
        setShowVariantModal,
        focusGroupReport,
        focusGroupLoading,
        focusGroupError,
        focusGroupUpdatedViaMcp: false,
        setFocusGroupUpdatedViaMcp: () => {},
        isRetryingCampaign,
        getOutputField,
        resolvedChannels,
        activeCopyText,
        copyHash,
        parsedCampaignOutputs: {
          copyData: campaign?.copy,
          strategyData: campaign?.strategy,
          imageData: campaign?.visuals,
          managerData: campaign?.manager,
        },
        memoizedStrategyData,
        isTabCompleted,
        handleApprove,
        handleRequestRevision,
        handleRunSimulation,
        handleCopyVariantsUpdate,
        handleVariantCreated,
        handleRetryCampaign,
        handleEditBrief,
      }}
    >
      {children}
    </CampaignResultContext.Provider>
  );
};

export const useCampaignResultContext = () => {
  const context = useContext(CampaignResultContext);
  if (!context) {
    throw new Error('useCampaignResultContext must be used within a CampaignResultProvider');
  }
  return context;
};
