import api from './api';

type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

const triggerUpdate = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notifications-updated'));
  }
};

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
    triggerUpdate();
    return response.data.notification;
  },

  async markAllRead() {
    await api.put('/notifications/read-all');
    triggerUpdate();
  },

  async delete(id: string) {
    await api.delete(`/notifications/${id}`);
    triggerUpdate();
  },

  async create(data: { type: NotificationType; title: string; message: string }) {
    const response = await api.post<{ notification: Notification }>('/notifications', data);
    triggerUpdate();
    return response.data.notification;
  },

  async deleteBatch(ids: string[]) {
    await api.post('/notifications/delete-batch', { ids });
    triggerUpdate();
  },
};

