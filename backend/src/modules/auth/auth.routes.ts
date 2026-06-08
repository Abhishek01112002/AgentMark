import { Router } from 'express';
import { signup, login, me } from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const router = Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authMiddleware, me);

export default router;
