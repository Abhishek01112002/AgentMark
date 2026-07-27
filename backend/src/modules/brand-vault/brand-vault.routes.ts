/**
 * Brand Vault Feature Routes (EMOS Phase 1 Foundation)
 */

import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  appendBrandEvent,
  createBrandSnapshot,
  getContextContract,
} from './brand-vault.controller';

const router = Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/events', appendBrandEvent);
router.post('/snapshots', createBrandSnapshot);
router.get('/context-contract', getContextContract);

export default router;
