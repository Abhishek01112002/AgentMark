import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { Campaign, RevisionCounts, AgentScores, ReviewerNotes, DrawerTab } from '../types';

export const useCampaignResult = (campaignId: string | undefined) => {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [memoryInsights, setMemoryInsights] = useState<any[]>([]);
  const [memoryCount, setMemoryCount] = useState<number>(0);

  // HITL Modal State
  const decisionMadeRef = useRef(false);
  const [showHumanReview, setShowHumanReview] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('copywriter');
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');
  const [revisionCounts, setRevisionCounts] = useState<RevisionCounts>({
    research: 0,
    strategy: 0,
    copywriter: 0,
    image_prompt: 0,
  });
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [agentScores, setAgentScores] = useState<AgentScores>({
    research: null,
    strategy: null,
    copywriter: null,
    image_prompt: null,
  });
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('scores');
  const [reviewerNotes, setReviewerNotes] = useState<ReviewerNotes | null>(null);
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Focus Group Simulation State
  const [focusGroupReport, setFocusGroupReport] = useState<any>(null);
  const [focusGroupLoading, setFocusGroupLoading] = useState(false);
  const [focusGroupError, setFocusGroupError] = useState<string | null>(null);
  const [focusGroupFetched, setFocusGroupFetched] = useState(false);
  const [focusGroupUpdatedViaMcp, setFocusGroupUpdatedViaMcp] = useState(false);
  const [isRetryingCampaign, setIsRetryingCampaign] = useState(false);

  // Helper to extract and automatically parse JSON string fields from aiOutputs
  const getOutputField = useCallback((field: string) => {
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

  useEffect(() => {
    if (!campaignId) return;
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchCampaign = async () => {
      try {
        setNotFound(false);
        const rawProjectId = new URLSearchParams(window.location.search).get('projectId');
        const projectId = (rawProjectId && rawProjectId !== 'undefined' && rawProjectId !== 'null') ? rawProjectId : null;
        const url = projectId ? `/campaigns/${campaignId}?projectId=${projectId}` : `/campaigns/${campaignId}`;
        const response = await api.get(url, { signal });
        const campaignData = response.data.campaign;
        if (!campaignData) {
          setNotFound(true);
        } else {
          setCampaign(campaignData);
        }

        if (campaignData && campaignData.status === 'awaiting_human_approval' && !decisionMadeRef.current) {
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
        if (signal.aborted || error?.name === 'AbortError' || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch campaign:', error);
        if (error?.response?.status === 404) {
          setNotFound(true);
        } else {
          toast.error('Failed to load campaign data');
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    const fetchMemoryInsights = async () => {
      try {
        const res = await api.get(`/campaigns/${campaignId}/memory-insights`, { signal });
        setMemoryInsights(res.data.insights || []);
        setMemoryCount(res.data.count || 0);
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        console.error('Failed to fetch memory insights:', err);
      }
    };
    
    fetchCampaign();
    fetchMemoryInsights();

    return () => controller.abort();
  }, [campaignId]);

  return {
    campaign,
    setCampaign,
    loading,
    setLoading,
    notFound,
    setNotFound,
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
    setRevisionCounts,
    qualityScore,
    setQualityScore,
    agentScores,
    setAgentScores,
    drawerTab,
    setDrawerTab,
    reviewerNotes,
    setReviewerNotes,
    showVariantModal,
    setShowVariantModal,
    focusGroupReport,
    setFocusGroupReport,
    focusGroupLoading,
    setFocusGroupLoading,
    focusGroupError,
    setFocusGroupError,
    focusGroupFetched,
    setFocusGroupFetched,
    focusGroupUpdatedViaMcp,
    setFocusGroupUpdatedViaMcp,
    isRetryingCampaign,
    setIsRetryingCampaign,
    getOutputField,
  };
};
