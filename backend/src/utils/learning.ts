/**
 * EMOS Phase 4: Memory & Learning Engine (TypeScript Backend Utils)
 * 90-day decay half-life weighting, source reliability filtering, and memory ingestion.
 * NEVER mutates Brand Vault.
 */

export const DECAY_HALF_LIFE_DAYS = 90.0;
export const LAMBDA_DECAY = Math.log(2) / DECAY_HALF_LIFE_DAYS;

export function calculateDecayWeight(ageInDays: number): number {
  const days = Math.max(0, ageInDays);
  return Number(Math.exp(-LAMBDA_DECAY * days).toFixed(4));
}

export function calculateLearningWeight(
  sourceReliability: number,
  noiseFactor: number,
  evalScore: number
): number {
  const sRel = Math.max(0, Math.min(1, sourceReliability));
  const noise = Math.max(0, Math.min(1, noiseFactor));
  const scoreNorm = Math.max(0, Math.min(1, evalScore / 100));

  const wLearning = sRel * (1 - noise) * scoreNorm;
  return Number(wLearning.toFixed(4));
}

export function processCampaignMemoryIngestion(
  campaignId: string,
  evalScore: number,
  sourceReliability: number = 0.85,
  noiseFactor: number = 0.1
): { accepted: boolean; wLearning: number; reason?: string } {
  const wLearning = calculateLearningWeight(sourceReliability, noiseFactor, evalScore);

  if (wLearning < 0.65) {
    return {
      accepted: false,
      wLearning,
      reason: `W_learning (${wLearning}) < 0.65 threshold (DISCARDED)`,
    };
  }

  return {
    accepted: true,
    wLearning,
  };
}
