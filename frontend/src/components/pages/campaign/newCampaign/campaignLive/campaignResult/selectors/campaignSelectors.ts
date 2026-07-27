import { NormalizedCampaign, NormalizedFocusGroupReport } from '../types/normalized';
import { computeCopyHash } from '../utils/campaignUtils';

// ─── Pure Zero-Parsing Selectors ──────────────────────────────────────────────

export const selectFocusGroupReport = (
  campaign: NormalizedCampaign | null,
  copyHash?: string
): NormalizedFocusGroupReport | null => {
  if (!campaign) return null;
  
  // 1. Look up by exact copyHash in normalized focusGroupOutputs dictionary if provided
  if (copyHash && campaign.focusGroupOutputs[copyHash]) {
    return campaign.focusGroupOutputs[copyHash];
  }
  
  // 2. Fall back to active focusGroup report
  if (campaign.focusGroup) {
    return campaign.focusGroup;
  }
  
  return null;
};

export const selectQualityScore = (campaign: NormalizedCampaign | null): number | null => {
  if (!campaign) return null;
  return campaign.reviewScore;
};

export const selectAgentScores = (campaign: NormalizedCampaign | null) => {
  if (!campaign || !campaign.review) {
    return { research: null, strategy: null, copywriter: null, image_prompt: null };
  }
  return campaign.review.agent_scores || { research: null, strategy: null, copywriter: null, image_prompt: null };
};

export const selectRevisionCounts = (campaign: NormalizedCampaign | null) => {
  if (!campaign) return { research: 0, strategy: 0, copywriter: 0, image_prompt: 0 };
  return campaign.revisionCounts;
};

export const selectReviewerNotes = (campaign: NormalizedCampaign | null) => {
  if (!campaign || !campaign.review) return null;
  const criticalGaps = campaign.review.critical_gaps || [];
  return {
    executiveSummary: campaign.review.executive_summary || '',
    criticalGaps,
    issues: criticalGaps,
    recommendations: campaign.review.recommendations || [],
    feedback: campaign.review.feedback || '',
  };
};

export const selectResolvedChannels = (campaign: NormalizedCampaign | null) => {
  if (!campaign) {
    return { channels: [], flatCopyData: null, copyVariants: {} };
  }

  const copyData = campaign.copy;
  const flatCopyData = copyData && copyData.copies ? { ...copyData, ...copyData.copies } : copyData;
  const copyVariants = campaign.copyVariants || {};

  const channelsSet = new Set<string>();

  const managerChannels = campaign.manager?.channels || [];
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
};

export const selectActiveCopyText = (campaign: NormalizedCampaign | null): string => {
  if (!campaign) return '';
  const { channels, flatCopyData, copyVariants } = selectResolvedChannels(campaign);
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
};

export const selectCopyHash = (campaign: NormalizedCampaign | null): string => {
  const activeCopyText = selectActiveCopyText(campaign);
  return computeCopyHash(activeCopyText, 4000);
};

export const selectCreativeHooks = (campaign: NormalizedCampaign | null): any[] => {
  if (!campaign?.creativeHooks?.hooks || !Array.isArray(campaign.creativeHooks.hooks)) {
    return [];
  }
  return campaign.creativeHooks.hooks;
};

export const selectHookMatrixStats = (campaign: NormalizedCampaign | null) => {
  const hooks = selectCreativeHooks(campaign);
  if (!hooks.length) {
    return { count: 0, averageQuality: 0, averageVirality: 0, approved: 0 };
  }
  const averageQuality = Math.round(hooks.reduce((sum, hook) => sum + Number(hook.quality_score || 0), 0) / hooks.length);
  const averageVirality = Math.round(hooks.reduce((sum, hook) => sum + Number(hook.virality_score || 0), 0) / hooks.length);
  const approved = hooks.filter((hook) => hook.status === 'approved').length;
  return { count: hooks.length, averageQuality, averageVirality, approved };
};
