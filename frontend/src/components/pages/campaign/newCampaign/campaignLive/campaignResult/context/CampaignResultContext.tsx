import React, { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { Campaign, TabId, RevisionCounts, AgentScores, ReviewerNotes, DrawerTab } from '../types';
import { computeCopyHash } from '../utils/campaignUtils';
import { useCampaignResult } from '../hooks/useCampaignResult';
import { useCampaignSocket } from '../hooks/useCampaignSocket';
import { useCampaignPolling } from '../hooks/useCampaignPolling';

interface CampaignResultContextType {
  campaignId: string | undefined;
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
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
  focusGroupReport: any;
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

const EMPTY_RESOLVED_CHANNELS = { channels: [] as string[], flatCopyData: null, copyVariants: {} };

const CampaignResultContext = createContext<CampaignResultContextType | undefined>(undefined);

export const CampaignResultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const {
    campaign,
    setCampaign,
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
    revisionCounts,
    qualityScore,
    setQualityScore,
    agentScores,
    drawerTab,
    setDrawerTab,
    reviewerNotes,
    showVariantModal,
    setShowVariantModal,
    focusGroupReport,
    setFocusGroupReport,
    focusGroupLoading,
    setFocusGroupLoading,
    focusGroupError,
    setFocusGroupError,
    setFocusGroupFetched,
    focusGroupUpdatedViaMcp,
    setFocusGroupUpdatedViaMcp,
    isRetryingCampaign,
    setIsRetryingCampaign,
    getOutputField,
  } = useCampaignResult(campaignId);

  useCampaignSocket({
    campaignId,
    setCampaign,
    setFocusGroupReport,
    setFocusGroupFetched,
    setFocusGroupError,
    setFocusGroupUpdatedViaMcp,
    setShowHumanReview,
    setQualityScore,
  });

  const resolvedChannels = useMemo(() => {
    if (!campaign) return EMPTY_RESOLVED_CHANNELS;
    const outputs = campaign.aiOutputs || {};
    const copyVariants = outputs.copy_variants || {};
    const copyData = getOutputField('copy_output') || getOutputField('copyOutput');
    const flatCopyData = copyData && copyData.copies ? { ...copyData, ...copyData.copies } : copyData;

    const channelsSet = new Set<string>();
    
    const managerChannels = outputs.manager_output?.channels || [];
    managerChannels.forEach((ch: string) => channelsSet.add(ch.toLowerCase()));
    
    if (flatCopyData) {
      Object.keys(flatCopyData).forEach((key) => {
        if (flatCopyData[key] && typeof flatCopyData[key] === 'object') {
          channelsSet.add(key.toLowerCase());
        }
      });
      if (flatCopyData.copies) {
        Object.keys(flatCopyData.copies).forEach((key) => {
          channelsSet.add(key.toLowerCase());
        });
      }
    }
    
    Object.keys(copyVariants).forEach((ch: string) => {
      if (copyVariants[ch]?.length > 0) {
        channelsSet.add(ch.toLowerCase());
      }
    });

    channelsSet.delete('copies');
    channelsSet.delete('messaging_framework');
    channelsSet.delete('strategic_alignment');
    channelsSet.delete('copy_readiness');
    
    return { channels: Array.from(channelsSet), flatCopyData, copyVariants };
  }, [campaign, getOutputField]);

  const activeCopyText = useMemo(() => {
    if (!campaign) return '';
    const { channels, flatCopyData, copyVariants } = resolvedChannels;

    const championTexts: string[] = [];
    
    channels.forEach((channel: string) => {
      const channelVariants = copyVariants[channel] || [];
      const champion = channelVariants.find((v: any) => v.isChampion) || channelVariants[0];
      if (champion) {
        const headline = champion.headline || champion.subject || '';
        const body = champion.body_copy || champion.body || '';
        championTexts.push(`[${channel.toUpperCase()}] Headline: ${headline}\nBody: ${body}`);
      } else {
        const legacyCopy = flatCopyData?.[channel] || flatCopyData?.copies?.[channel];
        if (legacyCopy) {
          const headline = legacyCopy.headline || legacyCopy.subject || '';
          const body = legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption || '';
          championTexts.push(`[${channel.toUpperCase()}] Headline: ${headline}\nBody: ${body}`);
        }
      }
    });
    
    return championTexts.filter(Boolean).join('\n\n');
  }, [campaign, resolvedChannels]);

  const copyHash = useMemo(() => {
    return computeCopyHash(activeCopyText, 4000);
  }, [activeCopyText]);

  useEffect(() => {
    if (campaign) {
      const outputs = campaign.aiOutputs || {};
      const outputsMap = outputs.focus_group_outputs || {};
      const savedReport =
        (copyHash ? outputsMap[copyHash] : null) ||
        (copyHash && outputs.focus_group_output_hash === copyHash ? outputs.focus_group_output : null);
      
      if (savedReport) {
        setFocusGroupReport(savedReport);
        setFocusGroupFetched(true);
      } else {
        setFocusGroupReport(null);
        setFocusGroupFetched(false);
      }
    }
  }, [campaign, copyHash, setFocusGroupReport, setFocusGroupFetched]);

  const { handleRunSimulation } = useCampaignPolling({
    campaign,
    setCampaign,
    focusGroupLoading,
    setFocusGroupLoading,
    setFocusGroupReport,
    setFocusGroupFetched,
    setFocusGroupError,
    activeCopyText,
    copyHash,
  });

  const parsedCampaignOutputs = useMemo(() => {
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

  const memoizedStrategyData = useMemo(() => {
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

  const handleCopyVariantsUpdate = useCallback((updatedCopyVariants: any) => {
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
  }, [setCampaign]);

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
        feedback: revisionFeedback,
      });
      window.dispatchEvent(new Event('campaign_status_changed'));
      
      toast.success('Revision requested successfully!');
      setRevisionFeedback('');
      navigate(`/campaign/${campaignId}/live`, { state: { initialActiveAgent: selectedAgent } });
    } catch (error: any) {
      decisionMadeRef.current = false;
      console.error('Failed to request revision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit revision request');
      setShowHumanReview(true);
    }
  }, [campaignId, revisionFeedback, selectedAgent, navigate, setShowHumanReview, setIsMinimized, setRevisionFeedback, decisionMadeRef]);

  const handleVariantCreated = useCallback((newCampaignId: string, projectId: string, selectedStage?: string) => {
    setShowVariantModal(false);
    navigate(`/campaign/${newCampaignId}/live?projectId=${projectId}`, {
      state: { initialActiveAgent: selectedStage || 'copywriter' }
    });
  }, [navigate, setShowVariantModal]);

  const handleRetryCampaign = useCallback(async () => {
    if (!campaign) return;
    setIsRetryingCampaign(true);
    try {
      await api.post(`/campaigns/${campaign.id}/retry`);
      toast.success('Retrying campaign pipeline... Agents are running!');
      navigate(`/campaign/${campaign.id}/live`, { state: { initialActiveAgent: 'manager' } });
    } catch (err: any) {
      console.error('Failed to retry campaign:', err);
      toast.error(err.response?.data?.error || 'Failed to retry campaign.');
      setIsRetryingCampaign(false);
    }
  }, [campaign, navigate, setIsRetryingCampaign]);

  const handleEditBrief = useCallback(() => {
    if (!campaign) return;
    navigate(`/campaign/new?projectId=${campaign.projectId}`, {
      state: {
        initialValues: {
          projectId: campaign.projectId,
          name: campaign.name,
          brandName: campaign.brandName || (campaign as any).brand_name,
          industry: campaign.industry,
          primaryGoal: campaign.primaryGoal,
          targetAudience: campaign.targetAudience,
          brandVoice: campaign.brandVoice,
          additionalInfo: (campaign as any).additionalInfo,
        },
      },
    });
  }, [campaign, navigate]);

  const isTabCompleted = useCallback((tabId: TabId) => {
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
      case 'focus-group':
        return !!(getOutputField('copy_output') || getOutputField('copyOutput'));
      default:
        return false;
    }
  }, [campaign, getOutputField]);

  const value = useMemo(() => ({
    campaignId,
    campaign,
    setCampaign,
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
    focusGroupUpdatedViaMcp,
    setFocusGroupUpdatedViaMcp,
    isRetryingCampaign,
    getOutputField,
    resolvedChannels,
    activeCopyText,
    copyHash,
    parsedCampaignOutputs,
    memoizedStrategyData,
    isTabCompleted,
    handleApprove,
    handleRequestRevision,
    handleRunSimulation,
    handleCopyVariantsUpdate,
    handleVariantCreated,
    handleRetryCampaign,
    handleEditBrief,
  }), [
    campaignId,
    campaign,
    setCampaign,
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
    focusGroupUpdatedViaMcp,
    setFocusGroupUpdatedViaMcp,
    isRetryingCampaign,
    getOutputField,
    resolvedChannels,
    activeCopyText,
    copyHash,
    parsedCampaignOutputs,
    memoizedStrategyData,
    isTabCompleted,
    handleApprove,
    handleRequestRevision,
    handleRunSimulation,
    handleCopyVariantsUpdate,
    handleVariantCreated,
    handleRetryCampaign,
    handleEditBrief,
  ]);

  return (
    <CampaignResultContext.Provider value={value}>
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
