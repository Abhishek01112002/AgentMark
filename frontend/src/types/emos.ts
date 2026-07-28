/**
 * EMOS v9 Frontend Contract Interfaces
 * Synchronized with backend Brand Vault, Policy Engine, and Evaluator models.
 */

export interface BrandVaultContract {
  brand_name: string;
  tagline: string;
  target_persona: string;
  journey_stage: string;
  conversion_intent: string;
  value_props: string[];
  forbidden_terms: string[];
  primary_cta: string;
  contract_version: string;
}

export interface PolicyResult {
  passed: boolean;
  violation_count: number;
  violations: string[];
  policy_hierarchy?: string[];
}

export interface EvaluatorResult {
  approved: boolean;
  overall_score: number;
  issues: string[];
  policy_result: PolicyResult;
  evaluator_version?: string;
}

export interface BrandVaultEvent {
  id: string;
  projectId: string;
  eventType: string;
  attributeKey: string;
  previousVal?: string;
  newVal: string;
  actorId: string;
  version: number;
  timestamp: string;
}

export interface BrandVaultSnapshot {
  id: string;
  projectId: string;
  brandVersion: number;
  snapshotData: Record<string, string>;
  verifiedAt: string;
}
