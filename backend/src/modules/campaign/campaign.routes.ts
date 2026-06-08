import { Router } from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignById,
  deleteCampaign,
  getAgentLogs,
  getCampaignOutputs,
} from './campaign.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

router.post('/', createCampaign);
router.get('/', getCampaigns);
router.get('/:id', getCampaignById);
router.delete('/:id', deleteCampaign);
router.get('/:id/logs', getAgentLogs);
router.get('/:id/outputs', getCampaignOutputs);

export default router;
