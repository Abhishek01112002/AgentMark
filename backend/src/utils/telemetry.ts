/**
 * EMOS Phase 5 Operations: Telemetry & Tracing Instrumentation
 * Propagates trace_id, span_id, campaign_id, tenant_id, and evidence_id across requests.
 */

import { randomUUID } from 'crypto';

export interface TelemetryContext {
  traceId: string;
  spanId: string;
  campaignId?: string;
  tenantId?: string;
  projectId?: string;
  evidenceId?: string;
}

export class TelemetryService {
  static createTraceContext(
    campaignId?: string,
    tenantId?: string,
    projectId?: string
  ): TelemetryContext {
    return {
      traceId: `tr_${randomUUID().replace(/-/g, '').slice(0, 16)}`,
      spanId: `sp_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
      campaignId,
      tenantId,
      projectId,
      evidenceId: `ev_${randomUUID().replace(/-/g, '').slice(0, 12)}`,
    };
  }

  static logComponentAudit(
    component: 'BrandVault' | 'Retrieval' | 'Generator' | 'Evaluator' | 'Policy' | 'Learning',
    action: string,
    context: TelemetryContext,
    metadata?: Record<string, any>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      component,
      action,
      trace_id: context.traceId,
      span_id: context.spanId,
      campaign_id: context.campaignId ?? null,
      tenant_id: context.tenantId ?? null,
      evidence_id: context.evidenceId ?? null,
      metadata: metadata ?? {},
    };

    console.log(`[EMOS TelemetryAudit] ${JSON.stringify(logEntry)}`);
  }
}
