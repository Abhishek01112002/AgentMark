import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createCampaign, getCampaigns, getCampaign, deleteCampaign } from './campaign.controller';

const router = Router();

router.use(authMiddleware);

router.post('/', createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaign);
router.delete('/:id', deleteCampaign);

export default router;
