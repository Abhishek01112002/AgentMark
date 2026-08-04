import prisma from '../../db';
import logger from '../../utils/logger';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

export type NotificationRow = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const notificationService = {
  async create(userId: string, data: Omit<NotificationRow, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isRead'> & { isRead?: boolean }) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: data.isRead ?? false,
      },
    });

    return notification as NotificationRow;
  },

  async list(userId: string, limit?: number, unreadOnly?: boolean) {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    });

    return notifications as NotificationRow[];
  },

  async unreadCount(userId: string) {
    try {
      return await prisma.notification.count({
        where: { userId, isRead: false },
      });
    } catch (err: any) {
      logger.error('[NotificationService] unreadCount DB error:', err?.message || err);
      return 0;
    }
  },

  async markAsRead(id: string, userId: string) {
    try {
      const result = await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });

      if (result.count === 0) return null;

      const notification = await prisma.notification.findUnique({ where: { id } });
      return notification as NotificationRow | null;
    } catch (err: any) {
      logger.error('[NotificationService] markAsRead DB error:', err?.message || err);
      return null;
    }
  },

  async markAllAsRead(userId: string) {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  },

  async delete(id: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) return null;

    await prisma.notification.delete({ where: { id } });
    return notification as NotificationRow;
  },

  async deleteBatch(ids: string[], userId: string) {
    if (ids.length === 0) return 0;
    const result = await prisma.notification.deleteMany({
      where: {
        id: { in: ids },
        userId,
      },
    });
    return result.count;
  },
};

