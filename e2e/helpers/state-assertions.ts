import { CampaignDbRecord } from './db-observer';
import { CapturedRedisEvent } from './redis-observer';
import { CapturedSocketEvent } from './socket-observer';

export interface FourWayOracleParams {
  dbRecord: CampaignDbRecord | null;
  redisEvents: CapturedRedisEvent[];
  socketEvents: CapturedSocketEvent[];
  uiState?: {
    status: string;
    reviewScore?: number | null;
    revisionCounts?: Record<string, number>;
  };
}

export interface OracleVerificationResult {
  valid: boolean;
  errors: string[];
  dbAuthoritativeStatus: string;
}

export class FourWayStateOracle {
  static assertConsistency(params: FourWayOracleParams): OracleVerificationResult {
    const errors: string[] = [];
    const { dbRecord, redisEvents, socketEvents, uiState } = params;

    if (!dbRecord) {
      return {
        valid: false,
        errors: ['Authoritative PostgreSQL DB record missing'],
        dbAuthoritativeStatus: 'UNKNOWN',
      };
    }

    const dbStatus = dbRecord.status;

    // 1. Redis Event Integrity Check
    if (redisEvents.length > 0) {
      const hasMatchingRedisStatus = redisEvents.some(
        (e) => e.payload.status === dbStatus || e.payload.agent_status === dbStatus
      );
      if (!hasMatchingRedisStatus && dbStatus !== 'processing') {
        errors.push(`Redis event stream missing target status event: ${dbStatus}`);
      }
    }

    // 2. Socket Delivery Check
    if (socketEvents.length > 0) {
      const hasSocketEvent = socketEvents.some(
        (e) => e.data.status === dbStatus || e.event === 'human_approval_required' || e.event === 'campaign_complete'
      );
      if (!hasSocketEvent && dbStatus !== 'processing') {
        errors.push(`Socket.IO event stream missing target delivery event for status: ${dbStatus}`);
      }
    }

    // 3. UI Convergence Invariant Check: Authoritative DB State === Rendered UI State
    if (uiState) {
      if (uiState.status !== dbStatus) {
        errors.push(
          `UI State Divergence: UI rendered status '${uiState.status}' !== Authoritative DB status '${dbStatus}'`
        );
      }

      if (typeof uiState.reviewScore === 'number' && typeof dbRecord.reviewScore === 'number') {
        if (uiState.reviewScore !== dbRecord.reviewScore) {
          errors.push(
            `Review Score Mismatch: UI '${uiState.reviewScore}' !== Authoritative DB '${dbRecord.reviewScore}'`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      dbAuthoritativeStatus: dbStatus,
    };
  }
}
