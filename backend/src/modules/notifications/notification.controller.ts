import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { notificationService } from './notification.service';

const markReadSchema = z.object({
  id: z.string().uuid(),
});

export const getNotifications = async (req: AuthRequest, res: Response) => {
  const unreadOnly = req.query.unreadOnly === 'true';
  const limit = req.query.limit ? Number(req.query.limit) : undefined;
  const notifications = await notificationService.list(req.userId!, limit);
  const filtered = unreadOnly ? notifications.filter((n) => !n.isRead) : notifications;
  res.json({ notifications: filtered });
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  const unreadCount = await notificationService.unreadCount(req.userId!);
  res.json({ unreadCount });
};

export const markNotificationRead = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = markReadSchema.parse(req.body);
    const notification = await notificationService.markAsRead(id, req.userId!);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ notification });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(400).json({ error: (error as Error).message });
  }
};

export const markAllNotificationsRead = async (req: AuthRequest, res: Response) => {
  await notificationService.markAllAsRead(req.userId!);
  res.json({ message: 'Notifications marked as read' });
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.delete(id, req.userId!);
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    res.json({ message: 'Notification deleted successfully', notification });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
};

const deleteBatchSchema = z.object({
  ids: z.array(z.string().uuid()),
});

export const deleteNotificationsBatch = async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = deleteBatchSchema.parse(req.body);
    const count = await notificationService.deleteBatch(ids, req.userId!);
    res.json({ message: 'Notifications deleted successfully', count });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(400).json({ error: (error as Error).message });
  }
};

