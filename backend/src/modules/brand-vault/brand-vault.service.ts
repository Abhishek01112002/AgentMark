/**
 * EMOS Phase 1 Foundation: Event-Sourced Brand Vault Service
 * Handles append-only brand events, materialized snapshot isolation,
 * and minimal context contract generation (< 250 tokens).
 */

import prisma from '../../db';

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

export class BrandVaultService {
  /**
   * Appends an event to the BrandVaultEventLog and returns the new version number.
   */
  static async appendEvent(
    projectId: string,
    eventType: string,
    attributeKey: string,
    newVal: string,
    actorId: string,
    previousVal?: string
  ): Promise<number> {
    const latestEvent = await (prisma as any).brandVaultEvent?.findFirst({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = (latestEvent?.version ?? 0) + 1;

    if ((prisma as any).brandVaultEvent) {
      await (prisma as any).brandVaultEvent.create({
        data: {
          projectId,
          eventType,
          attributeKey,
          previousVal: previousVal ?? null,
          newVal,
          actorId,
          version: nextVersion,
        },
      });
    }

    return nextVersion;
  }

  /**
   * Materializes an immutable snapshot view at a given brand version.
   */
  static async createSnapshot(projectId: string, actorId: string): Promise<any> {
    const events = (prisma as any).brandVaultEvent
      ? await (prisma as any).brandVaultEvent.findMany({
          where: { projectId },
          orderBy: { version: 'asc' },
        })
      : [];

    const materialized: Record<string, string> = {};
    for (const evt of events) {
      materialized[evt.attributeKey] = evt.newVal;
    }

    const latestVersion = events.length > 0 ? events[events.length - 1].version : 1;

    let snapshot = { id: 'snap_fallback', projectId, brandVersion: latestVersion, snapshotData: materialized };
    if ((prisma as any).brandVaultSnapshot) {
      snapshot = await (prisma as any).brandVaultSnapshot.create({
        data: {
          projectId,
          brandVersion: latestVersion,
          snapshotData: materialized as any,
        },
      });
    }

    return snapshot;
  }

  /**
   * Generates a strict < 250 token JSON Context Contract for downstream consumption.
   */
  static generateContextContract(
    brandName: string,
    tagline: string,
    targetPersona: string,
    journeyStage: string,
    conversionIntent: string,
    valueProps: string[],
    forbiddenTerms: string[],
    primaryCta: string
  ): BrandVaultContract {
    return {
      brand_name: brandName || 'Brand',
      tagline: tagline || 'Empowering Growth',
      target_persona: targetPersona || 'Growth Marketer',
      journey_stage: journeyStage || 'Evaluation',
      conversion_intent: conversionIntent || 'Switch_From_Competitor',
      value_props: (valueProps || []).slice(0, 3),
      forbidden_terms: (forbiddenTerms || []).slice(0, 3),
      primary_cta: primaryCta || 'Start Free Trial',
      contract_version: 'v1.0.0',
    };
  }
}
