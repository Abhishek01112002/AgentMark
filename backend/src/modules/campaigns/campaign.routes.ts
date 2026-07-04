import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { campaignRateLimiter } from '../../middlewares/rate-limit.middleware';
import { createCampaign, getCampaigns, getCampaign, deleteCampaign, approveCampaign, enhancePrompt, getMemoryInsights, getProjectMemoryHub, testKey, getActiveCampaigns, getAllCampaigns, generateCopyVariant, updateCopyVariantMeta } from './campaign.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', campaignRateLimiter, createCampaign);
router.post('/test-key', testKey);
router.post('/enhance-prompt', campaignRateLimiter, enhancePrompt);
router.get('/', getCampaigns);
router.get('/project-memory/:projectId', getProjectMemoryHub);
router.get('/active/live', getActiveCampaigns);
router.get('/all', getAllCampaigns);

// Variants Management Routes
router.post('/:id/variants/copy', campaignRateLimiter, generateCopyVariant);
router.patch('/:id/variants/copy', updateCopyVariantMeta);

router.get('/:id', getCampaign);
router.get('/:id/memory-insights', getMemoryInsights);
router.delete('/:id', deleteCampaign);
router.post('/:id/approve', approveCampaign);

export default router;
