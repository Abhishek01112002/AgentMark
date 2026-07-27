/**
 * Brand Vault Feature Controller (EMOS Phase 1 Foundation)
 * Wraps Brand Vault operations behind the `emos_brand_vault_enabled` feature flag.
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { BrandVaultService } from './brand-vault.service';

export const isEmosFeatureEnabled = (): boolean => {
  return process.env.EMOS_BRAND_VAULT_ENABLED === 'true';
};

/**
 * POST /api/projects/:projectId/brand-vault/events
 * Appends an event to the append-only Brand Vault event log.
 */
export const appendBrandEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { eventType, attributeKey, newVal, previousVal } = req.body;

    if (!eventType || !attributeKey || newVal == null) {
      res.status(400).json({ error: 'eventType, attributeKey, and newVal are required' });
      return;
    }

    const version = await BrandVaultService.appendEvent(
      projectId,
      eventType,
      attributeKey,
      String(newVal),
      req.userId || 'system',
      previousVal ? String(previousVal) : undefined
    );

    res.json({
      success: true,
      feature: 'EMOS_BRAND_VAULT',
      version,
      message: 'Brand Vault event appended successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/projects/:projectId/brand-vault/snapshots
 * Materializes an immutable snapshot view of the Brand Vault at the current version.
 */
export const createBrandSnapshot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { projectId } = req.params;

    const snapshot = await BrandVaultService.createSnapshot(projectId, req.userId || 'system');

    res.json({
      success: true,
      feature: 'EMOS_BRAND_VAULT',
      snapshot,
      message: 'Brand Vault snapshot materialized successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/projects/:projectId/brand-vault/context-contract
 * Resolves the minimal context contract (< 250 tokens) for campaign execution.
 */
export const getContextContract = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { brandName, tagline, targetPersona, journeyStage, conversionIntent, primaryCta } = req.query;

    const contract = BrandVaultService.generateContextContract(
      String(brandName || ''),
      String(tagline || ''),
      String(targetPersona || ''),
      String(journeyStage || 'Evaluation'),
      String(conversionIntent || 'Switch_From_Competitor'),
      [],
      [],
      String(primaryCta || '')
    );

    res.json({
      success: true,
      feature: 'EMOS_BRAND_VAULT',
      contract,
    });
  } catch (err) {
    next(err);
  }
};
