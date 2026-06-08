import { Router } from 'express';
import { updateProfile, deleteAccount } from './user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.put('/profile', authMiddleware, updateProfile);
router.delete('/account', authMiddleware, deleteAccount);

export default router;
