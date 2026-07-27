import { useState, useEffect, useRef, useReducer } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { DrawerTab } from '../types';
import { campaignReducer } from '../reducers/campaignReducer';

export const useCampaignResult = (campaignId: string | undefined) => {
  const [campaign, dispatch] = useReducer(campaignReducer, null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [memoryInsights, setMemoryInsights] = useState<any[]>([]);
  const [memoryCount, setMemoryCount] = useState<number>(0);
  const [creativeHookMatrixEnabled, setCreativeHookMatrixEnabled] = useState(false);

  // Transient UI-only State
  const decisionMadeRef = useRef(false);
  const [showHumanReview, setShowHumanReview] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<string>('copywriter');
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');
  const [drawerTab, setDrawerTab] = useState<DrawerTab>('scores');
  const [showVariantModal, setShowVariantModal] = useState(false);

  // Focus Group UI Loading/Error State
  const [focusGroupLoading, setFocusGroupLoading] = useState(false);
  const [focusGroupError, setFocusGroupError] = useState<string | null>(null);
  const [isRetryingCampaign, setIsRetryingCampaign] = useState(false);

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
        const campaignData = response.data?.campaign;
        if (!campaignData) {
          setNotFound(true);
        } else {
          dispatch({
            type: 'CAMPAIGN_LOADED',
            payload: campaignData,
          });

          if (campaignData.status === 'awaiting_human_approval' && !decisionMadeRef.current) {
            setShowHumanReview(true);
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

    const fetchFeatureFlags = async () => {
      try {
        const res = await api.get('/constants', { signal });
        setCreativeHookMatrixEnabled(Boolean(res.data?.featureFlags?.creativeHookMatrix));
      } catch (err: any) {
        if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
        setCreativeHookMatrixEnabled(false);
      }
    };

    fetchCampaign();
    fetchMemoryInsights();
    fetchFeatureFlags();

    return () => controller.abort();
  }, [campaignId]);

  return {
    campaign,
    dispatch,
    loading,
    setLoading,
    notFound,
    setNotFound,
    memoryInsights,
    memoryCount,
    creativeHookMatrixEnabled,
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
  };
};
