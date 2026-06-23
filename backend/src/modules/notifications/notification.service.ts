import crypto from 'crypto';
import prisma from '../../db';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

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
  async ensureTable() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW()
      )
    `);
  },

  async create(userId: string, data: Omit<NotificationRow, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'isRead'> & { isRead?: boolean }) {
    const rows = await prisma.$queryRaw<NotificationRow[]>`
      INSERT INTO notifications (id, "userId", type, title, message, "isRead")
      VALUES (${crypto.randomUUID()}, ${userId}, ${data.type}, ${data.title}, ${data.message}, ${data.isRead ?? false})
      RETURNING id, "userId", type, title, message, "isRead", "createdAt", "updatedAt"
    `;

    return rows[0];
  },

  async list(userId: string, limit?: number) {
    const query = limit
      ? prisma.$queryRaw<NotificationRow[]>`
          SELECT id, "userId", type, title, message, "isRead", "createdAt", "updatedAt"
          FROM notifications
          WHERE "userId" = ${userId}
          ORDER BY "createdAt" DESC
          LIMIT ${limit}
        `
      : prisma.$queryRaw<NotificationRow[]>`
          SELECT id, "userId", type, title, message, "isRead", "createdAt", "updatedAt"
          FROM notifications
          WHERE "userId" = ${userId}
          ORDER BY "createdAt" DESC
        `;

    return query;
  },

  async unreadCount(userId: string) {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM notifications
      WHERE "userId" = ${userId} AND "isRead" = FALSE
    `;
    return Number(rows[0]?.count || 0);
  },

  async markAsRead(id: string, userId: string) {
    const rows = await prisma.$queryRaw<NotificationRow[]>`
      UPDATE notifications
      SET "isRead" = TRUE, "updatedAt" = NOW()
      WHERE id = ${id} AND "userId" = ${userId}
      RETURNING id, "userId", type, title, message, "isRead", "createdAt", "updatedAt"
    `;
    return rows[0] || null;
  },

  async markAllAsRead(userId: string) {
    await prisma.$executeRaw`
      UPDATE notifications
      SET "isRead" = TRUE, "updatedAt" = NOW()
      WHERE "userId" = ${userId} AND "isRead" = FALSE
    `;
  },
};
