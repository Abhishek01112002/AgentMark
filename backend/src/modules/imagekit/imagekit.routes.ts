import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';

const router = Router();

router.get('/auth', authMiddleware, (req: AuthRequest, res: Response) => {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    return res.status(500).json({ error: 'ImageKit is not configured' });
  }

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 60 * 5;
  const signature = crypto.createHmac('sha1', privateKey).update(`${token}${expire}`).digest('hex');

  res.json({
    token,
    expire,
    signature,
    publicKey,
  });
});

export default router;
