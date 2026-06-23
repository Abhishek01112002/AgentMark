import api from './api';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notificationsService = {
  async list(params?: { unreadOnly?: boolean; limit?: number }) {
    const response = await api.get<{ notifications: Notification[] }>('/notifications', {
      params,
    });
    return response.data.notifications;
  },

  async unreadCount() {
    const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
    return response.data.unreadCount;
  },

  async markRead(id: string) {
    const response = await api.put<{ notification: Notification }>('/notifications/read', { id });
    return response.data.notification;
  },

  async markAllRead() {
    await api.put('/notifications/read-all');
  },
};
