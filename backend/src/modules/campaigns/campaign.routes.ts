import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { campaignRateLimiter } from '../../middlewares/rate-limit.middleware';
import { createCampaign, getCampaigns, getCampaign, deleteCampaign, approveCampaign, enhancePrompt } from './campaign.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', campaignRateLimiter, createCampaign);
router.post('/enhance-prompt', campaignRateLimiter, enhancePrompt);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.delete('/:id', deleteCampaign);
router.post('/:id/approve', approveCampaign);

export default router;
