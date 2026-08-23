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

const CACHE_KEY_NOTIFS = 'agentmark_cached_notifs';
const CACHE_KEY_COUNT = 'agentmark_cached_unread_count';

// In-memory cache for instant 0ms access
let inMemoryPanelNotifs: Notification[] | null = null;
let inMemoryUnreadCount: number | null = null;
let isPrefetching = false;

// Attempt to seed from sessionStorage if available
try {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    const savedNotifs = sessionStorage.getItem(CACHE_KEY_NOTIFS);
    if (savedNotifs) {
      inMemoryPanelNotifs = JSON.parse(savedNotifs);
    }
    const savedCount = sessionStorage.getItem(CACHE_KEY_COUNT);
    if (savedCount !== null) {
      inMemoryUnreadCount = Number(savedCount);
    }
  }
} catch {
  // Ignore storage errors
}

export const notificationsService = {
  getCachedPanelNotifications(): Notification[] {
    return inMemoryPanelNotifs || [];
  },

  getCachedUnreadCount(): number {
    return inMemoryUnreadCount ?? 0;
  },

  hasCache(): boolean {
    return inMemoryPanelNotifs !== null;
  },

  setCache(notifications: Notification[], unreadCount?: number) {
    inMemoryPanelNotifs = notifications;
    if (unreadCount !== undefined) {
      inMemoryUnreadCount = unreadCount;
    }
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(CACHE_KEY_NOTIFS, JSON.stringify(notifications));
        if (unreadCount !== undefined) {
          sessionStorage.setItem(CACHE_KEY_COUNT, String(unreadCount));
        }
      }
    } catch {
      // Ignore
    }
  },

  async prefetchPanel(): Promise<{ notifications: Notification[]; unreadCount: number }> {
    if (isPrefetching) {
      return {
        notifications: inMemoryPanelNotifs || [],
        unreadCount: inMemoryUnreadCount ?? 0,
      };
    }
    isPrefetching = true;
    try {
      const [notifications, unreadCount] = await Promise.all([
        this.list({ unreadOnly: true, limit: 5 }),
        this.unreadCount(),
      ]);
      this.setCache(notifications, unreadCount);
      return { notifications, unreadCount };
    } finally {
      isPrefetching = false;
    }
  },

  async list(params?: { unreadOnly?: boolean; limit?: number }) {
    const response = await api.get<{ notifications: Notification[] }>('/notifications', {
      params,
    });
    return response.data.notifications;
  },

  async unreadCount() {
    const response = await api.get<{ unreadCount: number }>('/notifications/unread-count');
    const count = response.data.unreadCount;
    inMemoryUnreadCount = count;
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        sessionStorage.setItem(CACHE_KEY_COUNT, String(count));
      }
    } catch {}
    return count;
  },

  async markRead(id: string) {
    // Optimistic cache update
    if (inMemoryPanelNotifs) {
      inMemoryPanelNotifs = inMemoryPanelNotifs.filter((n) => n.id !== id);
      if (inMemoryUnreadCount !== null && inMemoryUnreadCount > 0) {
        inMemoryUnreadCount -= 1;
      }
      this.setCache(inMemoryPanelNotifs, inMemoryUnreadCount ?? 0);
    }
    const response = await api.put<{ notification: Notification }>('/notifications/read', { id });
    triggerUpdate();
    return response.data.notification;
  },

  async markAllRead() {
    // Optimistic cache update
    inMemoryPanelNotifs = [];
    inMemoryUnreadCount = 0;
    this.setCache([], 0);
    await api.put('/notifications/read-all');
    triggerUpdate();
  },

  async delete(id: string) {
    if (inMemoryPanelNotifs) {
      inMemoryPanelNotifs = inMemoryPanelNotifs.filter((n) => n.id !== id);
      this.setCache(inMemoryPanelNotifs);
    }
    await api.delete(`/notifications/${id}`);
    triggerUpdate();
  },

  async create(data: { type: NotificationType; title: string; message: string }) {
    const response = await api.post<{ notification: Notification }>('/notifications', data);
    triggerUpdate();
    return response.data.notification;
  },

  async deleteBatch(ids: string[]) {
    if (inMemoryPanelNotifs) {
      const idSet = new Set(ids);
      inMemoryPanelNotifs = inMemoryPanelNotifs.filter((n) => !idSet.has(n.id));
      this.setCache(inMemoryPanelNotifs);
    }
    await api.post('/notifications/delete-batch', { ids });
    triggerUpdate();
  },
};

