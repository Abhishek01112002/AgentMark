import { extractReviewScore } from './score-extractor';

describe('Review Score Extractor Utility (extractReviewScore)', () => {
  it('should extract reviewScore directly from overall_quality_score if present', () => {
    const rawOutputs = {
      review_output: {
        overall_quality_score: 87.5,
        research_review: { score: 70 },
        strategy_review: { score: 75 },
      },
    };

    expect(extractReviewScore(rawOutputs)).toBe(87.5);
  });

  it('should extract quality_score fallback from review_output.overall if present', () => {
    const rawOutputs = {
      review_output: {
        overall: { quality_score: 92.4 },
      },
    };

    expect(extractReviewScore(rawOutputs)).toBe(92.4);
  });

  it('should average agent sub-scores across research, strategy, copy, creative_hook_matrix, and image when overall score is absent', () => {
    const rawOutputs = {
      review_output: {
        research_review: { score: 80 },
        strategy_review: { score: 85 },
        copy_review: { score: 90 },
        creative_hook_matrix_review: { score: 85 },
        image_review: { score: 95 },
      },
    };

    // (80 + 85 + 90 + 85 + 95) / 5 = 435 / 5 = 87.0
    expect(extractReviewScore(rawOutputs)).toBe(87.0);
  });

  it('should round average score to 1 decimal place', () => {
    const rawOutputs = {
      review_output: {
        research_review: { score: 82 },
        strategy_review: { score: 84 },
        copy_review: { score: 89 },
      },
    };

    // (82 + 84 + 89) / 3 = 255 / 3 = 85.0
    expect(extractReviewScore(rawOutputs)).toBe(85.0);
  });

  it('should return null if no valid scores exist in review_output', () => {
    const rawOutputs = {
      review_output: {
        research_review: { feedback: 'Missing score' },
      },
    };

    expect(extractReviewScore(rawOutputs)).toBeNull();
  });

  it('should return null for null/empty rawOutputs input', () => {
    expect(extractReviewScore(null)).toBeNull();
    expect(extractReviewScore(undefined)).toBeNull();
    expect(extractReviewScore({})).toBeNull();
  });
});
