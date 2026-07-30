import { useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { NormalizedCampaign } from '../types/normalized';
import { CampaignAction } from '../reducers/campaignReducer';

interface UseCampaignPollingProps {
  campaign: NormalizedCampaign | null;
  dispatch: React.Dispatch<CampaignAction>;
  focusGroupLoading: boolean;
  setFocusGroupLoading: (loading: boolean) => void;
  setFocusGroupError: (error: string | null) => void;
  activeCopyText: string;
  copyHash: string;
}

export const useCampaignPolling = ({
  campaign,
  dispatch,
  focusGroupLoading,
  setFocusGroupLoading,
  setFocusGroupError,
  activeCopyText,
  copyHash,
}: UseCampaignPollingProps) => {

  const handleRunSimulation = useCallback(async () => {
    if (!campaign || focusGroupLoading || !activeCopyText) return;
    setFocusGroupLoading(true);
    setFocusGroupError(null);
    try {
      const res = await api.post('/focus-group/simulate', {
        campaign_id: campaign.id,
        copy_text: activeCopyText.slice(0, 4000),
        campaign_context: {
          brand_name: campaign.brandName,
          brand: campaign.brandName,
          industry: campaign.industry,
          goal: campaign.primaryGoal,
          target_audience: campaign.targetAudience,
          audience: campaign.targetAudience,
          customer_voice_insights: campaign.research?.customer_voice_insights || [],
          competitor_vulnerabilities: campaign.research?.competitor_vulnerabilities || [],
          proven_ad_hooks: campaign.research?.proven_ad_hooks || [],
          brand_dna: campaign.research?.brand_dna || null,
        },
      }, {
        timeout: 60000,
      });

      dispatch({
        type: 'FOCUS_GROUP_COMPLETE',
        payload: {
          report: res.data,
          hashKey: copyHash,
          score: res.data?.overall_score,
        },
      });
    } catch (err: any) {
      console.error('Focus group simulation failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Simulation failed. Please try again.';
      toast.error(`Focus Group: ${msg}`);
      setFocusGroupError(msg);
    } finally {
      setFocusGroupLoading(false);
    }
  }, [campaign, focusGroupLoading, activeCopyText, copyHash, dispatch, setFocusGroupLoading, setFocusGroupError]);

  return {
    handleRunSimulation,
  };
};
