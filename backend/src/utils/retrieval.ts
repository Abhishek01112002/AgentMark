/**
 * EMOS Phase 2: Hybrid Retrieval Engine (BM25 + PgVector + RRF)
 * Implements Reciprocal Rank Fusion, Source Precedence Weighting,
 * and Bounded Retrieval Limits (K <= 5).
 */

export interface ScoredChunk {
  chunk_id: string;
  content: string;
  source_type: string;
  source_weight: number;
  bm25_rank?: number;
  vector_rank?: number;
  rrf_score: number;
}

export const SOURCE_PRECEDENCE_WEIGHTS: Record<string, number> = {
  MANUAL_USER: 1.0,
  BRAND_GUIDELINES: 0.9,
  PRICING_DOCS: 0.85,
  WEBSITE: 0.7,
  BLOG: 0.5,
  COMPETITOR: 0.3,
};

/**
 * Calculates Reciprocal Rank Fusion (RRF) score for a document chunk.
 * Formula: RRF = (1 / (60 + Rank_BM25) + 1 / (60 + Rank_Vector)) * Source_Weight
 */
export function calculateRRFScore(
  bm25Rank: number,
  vectorRank: number,
  sourceType: string
): number {
  const sourceWeight = SOURCE_PRECEDENCE_WEIGHTS[sourceType.toUpperCase()] ?? 0.7;
  const bm25Term = 1.0 / (60.0 + bm25Rank);
  const vectorTerm = 1.0 / (60.0 + vectorRank);
  return (bm25Term + vectorTerm) * sourceWeight;
}

/**
 * Ranks and fuses BM25 and Vector search results using RRF and source precedence weighting.
 * Returns top K (max 5) chunks.
 */
export function rankHybridResults(
  bm25Chunks: Array<{ id: string; content: string; sourceType: string }>,
  vectorChunks: Array<{ id: string; content: string; sourceType: string }>,
  topK: number = 5
): ScoredChunk[] {
  const kLimit = Math.min(topK, 5);
  const chunkMap = new Map<string, { content: string; sourceType: string; bm25Rank: number; vectorRank: number }>();

  bm25Chunks.forEach((chunk, index) => {
    chunkMap.set(chunk.id, {
      content: chunk.content,
      sourceType: chunk.sourceType,
      bm25Rank: index + 1,
      vectorRank: 999, // default if not found in vector
    });
  });

  vectorChunks.forEach((chunk, index) => {
    const existing = chunkMap.get(chunk.id);
    if (existing) {
      existing.vectorRank = index + 1;
    } else {
      chunkMap.set(chunk.id, {
        content: chunk.content,
        sourceType: chunk.sourceType,
        bm25Rank: 999,
        vectorRank: index + 1,
      });
    }
  });

  const scored: ScoredChunk[] = [];
  chunkMap.forEach((val, id) => {
    const rrfScore = calculateRRFScore(val.bm25Rank, val.vectorRank, val.sourceType);
    const sourceWeight = SOURCE_PRECEDENCE_WEIGHTS[val.sourceType.toUpperCase()] ?? 0.7;

    scored.push({
      chunk_id: id,
      content: val.content,
      source_type: val.sourceType,
      source_weight: sourceWeight,
      bm25_rank: val.bm25Rank === 999 ? undefined : val.bm25Rank,
      vector_rank: val.vectorRank === 999 ? undefined : val.vectorRank,
      rrf_score: rrfScore,
    });
  });

  return scored.sort((a, b) => b.rrf_score - a.rrf_score).slice(0, kLimit);
}
