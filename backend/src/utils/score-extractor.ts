/**
 * Score Extractor Utility — AgentMark Backend
 *
 * Single Source of Truth for extracting and normalizing campaign review scores
 * across Redis subscriber streams, Campaign controller, and Campaign service.
 */

export function extractReviewScore(rawReviewOutput: any): number | null {
  if (!rawReviewOutput) return null;

  try {
    let reviewOutput = typeof rawReviewOutput === 'string'
      ? JSON.parse(rawReviewOutput)
      : rawReviewOutput;

    if (reviewOutput && typeof reviewOutput === 'object' && reviewOutput.review_output) {
      reviewOutput = typeof reviewOutput.review_output === 'string'
        ? JSON.parse(reviewOutput.review_output)
        : reviewOutput.review_output;
    }

    if (!reviewOutput || typeof reviewOutput !== 'object') return null;

    // 1. Authoritative overall quality score directly from Reviewer Agent
    const directOverallScore = reviewOutput.overall_quality_score ?? reviewOutput.quality_score ?? reviewOutput.overallScore ?? reviewOutput.overall?.quality_score;
    if (typeof directOverallScore === 'number' && !isNaN(directOverallScore) && directOverallScore > 0) {
      const normalized = directOverallScore <= 10 ? directOverallScore * 10 : directOverallScore;
      return parseFloat(normalized.toFixed(1));
    }

    // 2. Calculate weighted average from individual sub-reviews if overall score is missing
    const subReviews = [
      { review: reviewOutput.research_review, weight: 0.25 },
      { review: reviewOutput.strategy_review, weight: 0.30 },
      { review: reviewOutput.copy_review, weight: 0.25 },
      { review: reviewOutput.creative_hook_matrix_review ?? reviewOutput.hook_matrix_review, weight: 0.0 },
      { review: reviewOutput.image_review, weight: 0.20 },
    ];

    let weightedSum = 0;
    let totalWeight = 0;
    const scores: number[] = [];

    for (const item of subReviews) {
      const sub = item.review;
      if (sub && typeof sub.score === 'number' && !isNaN(sub.score) && sub.score > 0) {
        const subScore = sub.score <= 10 ? sub.score * 10 : sub.score;
        scores.push(subScore);
        if (item.weight > 0) {
          weightedSum += subScore * item.weight;
          totalWeight += item.weight;
        }
      }
    }

    if (totalWeight > 0) {
      return parseFloat((weightedSum / totalWeight).toFixed(1));
    }

    if (scores.length > 0) {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return parseFloat(avg.toFixed(1));
    }

    return null;
  } catch {
    return null;
  }
}
