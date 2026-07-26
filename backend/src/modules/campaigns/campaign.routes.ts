import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { campaignRateLimiter } from '../../middlewares/rate-limit.middleware';
import { createCampaign, getCampaigns, getCampaign, getCampaignStatus, deleteCampaign, approveCampaign, enhancePrompt, getMemoryInsights, getProjectMemoryHub, testKey, getActiveCampaigns, getAllCampaigns, generateCopyVariant, updateCopyVariantMeta, saveCopyVersion, getCopyVersions, forkCampaign, resetCampaignRevisions, retryCampaign, compareCampaigns, verifyChannelCredentials } from './campaign.controller';

import { verifyApiKeyScope } from '../developer/developer.controller';

const router = Router();

router.use(authMiddleware);
router.use(verifyApiKeyScope);

router.post('/', campaignRateLimiter, createCampaign);
router.post('/compare', compareCampaigns);
router.post('/:id/verify-channels', verifyChannelCredentials);
router.post('/verify-channels', verifyChannelCredentials);
router.post('/test-key', testKey);
router.post('/enhance-prompt', campaignRateLimiter, enhancePrompt);
router.get('/', getCampaigns);
router.get('/project-memory/:projectId', getProjectMemoryHub);
router.get('/active/live', getActiveCampaigns);
router.get('/all', getAllCampaigns);

// Variants Management Routes
router.post('/:id/variants/copy', campaignRateLimiter, generateCopyVariant);
router.patch('/:id/variants/copy', updateCopyVariantMeta);

router.get('/:id/status', getCampaignStatus);
router.get('/:id', getCampaign);
router.get('/:id/memory-insights', getMemoryInsights);
router.delete('/:id', deleteCampaign);
router.post('/:id/approve', approveCampaign);
router.post('/:id/retry', campaignRateLimiter, retryCampaign);

// FAANG Pattern Routes: Campaign Branching & Revision Budget Reset
router.post('/:id/fork', campaignRateLimiter, forkCampaign);
router.post('/:id/reset-revisions', campaignRateLimiter, resetCampaignRevisions);

// Copy Version History Routes (used by MCP revise_copy_with_feedback tool)
router.post('/:id/copy-versions', campaignRateLimiter, saveCopyVersion);
router.get('/:id/copy-versions', getCopyVersions);

export default router;
