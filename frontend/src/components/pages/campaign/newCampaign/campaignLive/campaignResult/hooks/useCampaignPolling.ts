import { useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { Campaign } from '../types';

interface UseCampaignPollingProps {
  campaign: Campaign | null;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  focusGroupLoading: boolean;
  setFocusGroupLoading: (loading: boolean) => void;
  setFocusGroupReport: (report: any) => void;
  setFocusGroupFetched: (fetched: boolean) => void;
  setFocusGroupError: (error: string | null) => void;
  activeCopyText: string;
  copyHash: string;
}

export const useCampaignPolling = ({
  campaign,
  setCampaign,
  focusGroupLoading,
  setFocusGroupLoading,
  setFocusGroupReport,
  setFocusGroupFetched,
  setFocusGroupError,
  activeCopyText,
  copyHash,
}: UseCampaignPollingProps) => {

  const handleRunSimulation = useCallback(async () => {
    if (!campaign || focusGroupLoading || !activeCopyText) return;
    setFocusGroupLoading(true);
    setFocusGroupFetched(true);
    try {
      const res = await api.post('/focus-group/simulate', {
        campaign_id: campaign.id,
        copy_text: activeCopyText.slice(0, 4000),
        campaign_context: {
          brand_name: campaign.brandName || campaign.brand_name || '',
          brand: campaign.brandName || campaign.brand_name || '',
          industry: campaign.industry,
          goal: campaign.primaryGoal,
          target_audience: campaign.targetAudience,
          audience: campaign.targetAudience,
        },
      }, {
        timeout: 60000,
      });
      setFocusGroupReport(res.data);
      
      setCampaign(prev => {
        if (!prev) return null;
        const currentOutputs = prev.aiOutputs || {};
        const currentOutputsMap = currentOutputs.focus_group_outputs || {};
        const updatedOutputsMap = {
          ...currentOutputsMap,
          [copyHash]: res.data
        };
        const updatedOutputs = {
          ...currentOutputs,
          focus_group_output: res.data,
          focus_group_output_hash: copyHash,
          focus_group_outputs: updatedOutputsMap
        };
        return {
          ...prev,
          aiOutputs: updatedOutputs
        };
      });
    } catch (err: any) {
      console.error('Focus group simulation failed:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Simulation failed. Please try again.';
      toast.error(`Focus Group: ${msg}`);
      setFocusGroupError(msg);
      setFocusGroupFetched(false);
    } finally {
      setFocusGroupLoading(false);
    }
  }, [campaign, focusGroupLoading, activeCopyText, copyHash, setCampaign, setFocusGroupLoading, setFocusGroupFetched, setFocusGroupReport, setFocusGroupError]);

  return {
    handleRunSimulation,
  };
};
