import { Campaign } from '../types';
import { NormalizedCampaign, NormalizedFocusGroupReport } from '../types/normalized';
import { normalizeCampaign } from '../utils/campaignNormalizer';

export type CampaignAction =
  | { type: 'CAMPAIGN_LOADED'; payload: Campaign }
  | { type: 'CAMPAIGN_UPDATED'; payload: Partial<Campaign> }
  | { type: 'FOCUS_GROUP_COMPLETE'; payload: { report: NormalizedFocusGroupReport; hashKey?: string; score?: number } }
  | { type: 'COPY_VARIANTS_UPDATED'; payload: Record<string, any[]> }
  | { type: 'AGENT_OUTPUT_MERGED'; payload: Record<string, any> }
  | { type: 'RESET_CAMPAIGN' };

export const campaignReducer = (
  state: NormalizedCampaign | null,
  action: CampaignAction
): NormalizedCampaign | null => {
  switch (action.type) {
    case 'CAMPAIGN_LOADED':
      return normalizeCampaign(action.payload, state);

    case 'CAMPAIGN_UPDATED': {
      if (!state) return null;
      const mergedRaw: Campaign = {
        ...state._raw,
        ...action.payload,
      };
      return normalizeCampaign(mergedRaw, state);
    }

    case 'FOCUS_GROUP_COMPLETE': {
      if (!state) return null;
      const { report, hashKey, score } = action.payload;
      const key = hashKey || 'latest';
      const updatedOutputsMap = {
        ...state.focusGroupOutputs,
        [key]: report,
      };
      const updatedRaw: Campaign = {
        ...state._raw,
        reviewScore: score != null ? score : state.reviewScore,
        aiOutputs: {
          ...(typeof state._raw.aiOutputs === 'object' ? state._raw.aiOutputs : {}),
          focus_group_output: report,
          focus_group_output_hash: key,
          focus_group_outputs: updatedOutputsMap,
        },
      };
      return normalizeCampaign(updatedRaw, state);
    }

    case 'COPY_VARIANTS_UPDATED': {
      if (!state) return null;
      const updatedRaw: Campaign = {
        ...state._raw,
        aiOutputs: {
          ...(typeof state._raw.aiOutputs === 'object' ? state._raw.aiOutputs : {}),
          copy_variants: action.payload,
        },
      };
      return normalizeCampaign(updatedRaw, state);
    }

    case 'AGENT_OUTPUT_MERGED': {
      if (!state) return null;
      const currentOutputs = typeof state._raw.aiOutputs === 'object' ? state._raw.aiOutputs : {};
      const updatedRaw: Campaign = {
        ...state._raw,
        aiOutputs: {
          ...currentOutputs,
          ...action.payload,
        },
      };
      return normalizeCampaign(updatedRaw, state);
    }

    case 'RESET_CAMPAIGN':
      return null;

    default:
      return state;
  }
};
