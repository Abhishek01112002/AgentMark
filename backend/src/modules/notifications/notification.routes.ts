import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  deleteNotification,
  deleteNotificationsBatch,
} from './notification.controller';

const router = Router();

router.use(authMiddleware);
router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.put('/read', markNotificationRead);
router.put('/read-all', markAllNotificationsRead);
router.delete('/:id', deleteNotification);
router.post('/delete-batch', deleteNotificationsBatch);


export default router;
