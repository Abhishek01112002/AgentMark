import { Router } from 'express';
import { signup, login, me, updateProfile } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { authRateLimiter } from '../../middlewares/rate-limit.middleware';

const router = Router();

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, updateProfile);

export default router;
