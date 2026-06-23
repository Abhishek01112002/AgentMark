import React, { useEffect, useState } from 'react';
import { notificationsService, Notification } from '../../../../services/notifications.service';
import { Check } from 'lucide-react';

const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
  success: { icon: 'task_alt', bg: 'bg-secondary-container/20', color: 'text-secondary' },
  warning: { icon: 'warning', bg: 'bg-tertiary-container/20', color: 'text-tertiary' },
  error: { icon: 'error', bg: 'bg-error-container/20', color: 'text-error' },
  info: { icon: 'notifications', bg: 'bg-primary/10', color: 'text-primary' },
};

const Notifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.list();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  const totalPages = Math.max(1, Math.ceil(notifications.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, notifications.length);
  const currentNotifications = notifications.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const markAllRead = async () => {
    await notificationsService.markAllRead();
    await loadNotifications();
  };

  const markOneRead = async (id: string) => {
    await notificationsService.markRead(id);
    await loadNotifications();
  };

  return (
    <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border-base flex items-start justify-between gap-4">
        <div>
          <h2 className="font-headline-md text-headline-md text-text-primary">Notifications</h2>
          <p className="font-body-sm text-body-sm text-text-secondary mt-1">View and manage your account notifications.</p>
        </div>
        <button
          onClick={() => void markAllRead()}
          className="px-4 py-2 rounded-lg border border-border-base text-text-secondary hover:bg-surface-container-high transition-colors text-sm"
        >
          Mark all read
        </button>
      </div>

      <div className="divide-y divide-border-base max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-text-secondary">Loading notifications...</div>
        ) : currentNotifications.length > 0 ? (
          currentNotifications.map((notification) => {
            const meta = iconMap[notification.type] || iconMap.info;
            return (
              <div key={notification.id} className="p-4 hover:bg-surface-container-low transition-colors group">
                  <div className="flex gap-4">
                    <div className={`mt-1 w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center ${meta.color}`}>
                      <span className="material-symbols-outlined">{meta.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                      <p className="font-body-md text-body-md text-text-primary font-semibold truncate">{notification.title}</p>
                      <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">{notification.message}</p>
                    </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {!notification.isRead ? (
                      <button
                        onClick={() => void markOneRead(notification.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-xs font-semibold"
                      >
                        <Check size={14} />
                        Mark as read
                      </button>
                    ) : (
                      <span className="text-xs text-text-muted">Read</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-text-secondary">No notifications yet.</div>
        )}
      </div>

      <div className="bg-surface-container-lowest px-6 py-4 border-t border-border-base">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="font-body-sm text-body-sm text-text-secondary">
            Showing {notifications.length === 0 ? 0 : startIndex + 1} to {endIndex} of {notifications.length} notifications
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
            >
              &lt;
            </button>
            <div className="px-3 py-1 bg-surface-container-low rounded border border-border-base font-label-md text-label-md text-text-primary">
              {currentPage}
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
            >
              &gt;
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
            >
              &gt;&gt;
            </button>
          </div>

          <select
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="px-3 py-1 rounded border border-border-base bg-surface-container-lowest text-text-secondary font-label-sm text-label-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none cursor-pointer"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
