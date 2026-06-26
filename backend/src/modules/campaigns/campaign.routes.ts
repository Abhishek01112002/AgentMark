import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createCampaign, getCampaigns, getCampaign, deleteCampaign, approveCampaign, enhancePrompt } from './campaign.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', createCampaign);
router.post('/enhance-prompt', enhancePrompt);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.delete('/:id', deleteCampaign);
router.post('/:id/approve', approveCampaign);

export default router;
