import { Campaign } from '../types';
import { NormalizedCampaign, NormalizedReviewOutput, NormalizedFocusGroupReport } from '../types/normalized';

const safeParseJson = (val: any): any => {
  if (!val) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return null;
};

export const normalizeCampaign = (
  raw: Campaign | null,
  previousNormalized?: NormalizedCampaign | null
): NormalizedCampaign | null => {
  if (!raw) return null;

  const outputs = safeParseJson(raw.aiOutputs) || {};
  
  // 1. Manager Output
  const manager = safeParseJson(outputs.manager_output || outputs.managerOutput);
  
  // 2. Research Output
  const research = safeParseJson(outputs.research_output || outputs.researchOutput);
  
  // 3. Strategy Output
  const strategy = safeParseJson(outputs.strategy_output || outputs.strategyOutput);
  
  // 4. Copy Output & Variants
  const copy = safeParseJson(outputs.copy_output || outputs.copyOutput);
  const copyVariants = safeParseJson(outputs.copy_variants) || {};

  // 4b. Creative Hook Matrix
  const creativeHooks = safeParseJson(outputs.creative_hook_matrix_output || outputs.creativeHookMatrixOutput);
  
  // 5. Visuals Output
  const visuals = safeParseJson(outputs.image_output || outputs.imageOutput);
  
  // 6. Review Output
  const rawReview = outputs.review_output || outputs.reviewOutput || raw.reviewOutput;
  const parsedReview = safeParseJson(rawReview);

  const getScore = (rev: any, fallbackKey: string) => {
    if (!parsedReview) return null;
    const s = rev?.score ?? parsedReview.agent_scores?.[fallbackKey] ?? null;
    if (typeof s === 'number') return s;
    if (typeof s === 'string' && !isNaN(Number(s))) return Number(s);
    return null;
  };

  const review: NormalizedReviewOutput | null = parsedReview
    ? {
        overall_score: parsedReview.overall?.quality_score ?? parsedReview.overall_score ?? raw.reviewScore ?? null,
        agent_scores: {
          research: getScore(parsedReview.research_review, 'research'),
          strategy: getScore(parsedReview.strategy_review, 'strategy'),
          copywriter: getScore(parsedReview.copy_review, 'copywriter') ?? getScore(parsedReview.copy_review, 'copy'),
          creative_hook_matrix: getScore(parsedReview.creative_hook_matrix_review, 'creative_hook_matrix') ?? getScore(parsedReview.hook_review, 'creative_hook_matrix'),
          image_prompt: getScore(parsedReview.image_review, 'image_prompt') ?? getScore(parsedReview.image_review, 'image'),
        },
        executive_summary: parsedReview.overall?.summary || parsedReview.executive_summary || parsedReview.feedback || parsedReview.copy_review?.feedback || '',
        critical_gaps: parsedReview.critical_gaps || parsedReview.overall?.critical_improvements || [
          ...(parsedReview.copy_review?.action_items || []),
          ...(parsedReview.image_review?.action_items || []),
        ],
        recommendations: parsedReview.recommendations || parsedReview.overall?.strengths || [],
        feedback: parsedReview.feedback || parsedReview.overall?.summary || parsedReview.copy_review?.feedback || '',
      }
    : null;
    
  // 7. Publisher Output
  const publisher = safeParseJson(outputs.publisher_output || outputs.publisherOutput);
  
  // 8. Focus Group Outputs & Active Report
  const rawFocusGroupOutputs = safeParseJson(outputs.focus_group_outputs) || {};
  const normalizedFocusGroupOutputs: Record<string, NormalizedFocusGroupReport> = {};
  
  Object.keys(rawFocusGroupOutputs).forEach((key) => {
    const parsed = safeParseJson(rawFocusGroupOutputs[key]);
    if (parsed) {
      normalizedFocusGroupOutputs[key] = parsed;
    }
  });
  
  const rawActiveFg = outputs.focus_group_output;
  const activeFocusGroup: NormalizedFocusGroupReport | null = safeParseJson(rawActiveFg);
  const focusGroupOutputHash = outputs.focus_group_output_hash || null;
  
  const currentVersion = (previousNormalized?.version || 0) + 1;

  return {
    id: raw.id,
    name: raw.name || 'Unnamed Campaign',
    status: raw.status || 'draft',
    brandName: raw.brandName || raw.brand_name || 'Unnamed Brand',
    industry: raw.industry || 'General',
    primaryGoal: raw.primaryGoal || 'Brand Awareness',
    targetAudience: raw.targetAudience || 'General Audience',
    brandVoice: raw.brandVoice || 'Professional',
    projectId: raw.projectId,
    aiError: raw.aiError || null,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    
    manager,
    research,
    strategy,
    copy,
    copyVariants,
    creativeHooks,
    visuals,
    review,
    publisher,
    focusGroup: activeFocusGroup,
    focusGroupOutputs: normalizedFocusGroupOutputs,
    focusGroupOutputHash,
    
    reviewScore: raw.reviewScore ?? review?.overall_score ?? null,
    revisionCounts: {
      research: raw.researchRevisionCount || 0,
      strategy: raw.strategyRevisionCount || 0,
      copywriter: raw.copyRevisionCount || 0,
      image_prompt: raw.imageRevisionCount || 0,
    },
    
    version: currentVersion,
    _raw: raw,
  };
};
