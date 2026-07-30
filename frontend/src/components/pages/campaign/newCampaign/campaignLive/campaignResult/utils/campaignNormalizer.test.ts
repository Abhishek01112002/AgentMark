import { describe, it, expect } from 'vitest';
import { normalizeCampaign } from './campaignNormalizer';
import { Campaign } from '../types';

describe('Campaign Normalizer Utility (normalizeCampaign)', () => {
  it('should return null if input campaign is null', () => {
    expect(normalizeCampaign(null)).toBeNull();
  });

  it('should normalize raw campaign AI outputs including creative_hook_matrix and agent review scores', () => {
    const mockRawCampaign: Campaign = {
      id: 'camp-normal-100',
      projectId: 'proj-123',
      name: 'Omnichannel Campaign 2026',
      brandName: 'AgentMark AI',
      industry: 'technology',
      primaryGoal: 'lead_generation',
      targetAudience: 'Marketing Executives',
      brandVoice: 'Sophisticated & Authoritative',
      status: 'awaiting_human_approval',
      reviewScore: 88.5,
      aiOutputs: JSON.stringify({
        manager_output: { campaign_title: 'AgentMark 2.0 Launch' },
        research_output: { key_findings: ['High demand for agentic marketing'] },
        strategy_output: { positioning: 'Premium AI automation' },
        copy_output: { headline: 'Automate Marketing with Precision' },
        creative_hook_matrix_output: {
          hooks: [
            { angle: 'Curiosity', text: 'What if your ad copy wrote itself?' },
            { angle: 'FOMO', text: 'Top 1% marketers are using AI agents' },
          ],
        },
        image_output: { prompt: 'Futuristic AI neural dashboard' },
        review_output: {
          overall_score: 88.5,
          research_review: { score: 90 },
          strategy_review: { score: 85 },
          copy_review: { score: 88 },
          creative_hook_matrix_review: { score: 92 },
          image_review: { score: 87 },
          executive_summary: 'Exceptional creative matrix and strategic alignment.',
          critical_gaps: ['Add specific pricing CTA to copy variant 2'],
          recommendations: ['Deploy curiosity hook to LinkedIn ads'],
        },
      }),
      createdAt: '2026-07-29T10:00:00Z',
      updatedAt: '2026-07-29T10:05:00Z',
    };

    const normalized = normalizeCampaign(mockRawCampaign);

    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe('camp-normal-100');
    expect(normalized?.brandName).toBe('AgentMark AI');
    expect(normalized?.creativeHooks?.hooks).toHaveLength(2);
    expect(normalized?.review?.agent_scores?.creative_hook_matrix).toBe(92);
    expect(normalized?.review?.agent_scores?.research).toBe(90);
    expect(normalized?.review?.executive_summary).toBe('Exceptional creative matrix and strategic alignment.');
    expect(normalized?.review?.critical_gaps).toContain('Add specific pricing CTA to copy variant 2');
    expect(normalized?.reviewScore).toBe(88.5);
  });

  it('should safely handle malformed JSON strings in aiOutputs', () => {
    const mockCorruptedCampaign: Campaign = {
      id: 'camp-corrupt-200',
      projectId: 'proj-123',
      name: 'Corrupted Campaign',
      brandName: 'Corrupted Brand',
      industry: 'technology',
      primaryGoal: 'lead_generation',
      targetAudience: 'All',
      brandVoice: 'Default',
      status: 'failed',
      aiOutputs: '{ invalid json payload ',
      createdAt: '2026-07-29T10:00:00Z',
      updatedAt: '2026-07-29T10:05:00Z',
    };

    const normalized = normalizeCampaign(mockCorruptedCampaign);

    expect(normalized).not.toBeNull();
    expect(normalized?.id).toBe('camp-corrupt-200');
    expect(normalized?.review).toBeNull();
    expect(normalized?.creativeHooks).toBeNull();
  });
});
