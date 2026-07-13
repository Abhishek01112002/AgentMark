import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsService, Notification } from '../../../../services/notifications.service';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDDMonYYYY } from '../../../../utils/formatDate';

const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
  success: { icon: 'task_alt', bg: 'bg-secondary-container/20', color: 'text-secondary' },
  warning: { icon: 'warning', bg: 'bg-tertiary-container/20', color: 'text-tertiary' },
  error: { icon: 'error', bg: 'bg-error-container/20', color: 'text-error' },
  info: { icon: 'notifications', bg: 'bg-primary/10', color: 'text-primary' },
};

interface NotificationPanelProps {
  onChangeUnreadCount?: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onChangeUnreadCount }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const [unread, count] = await Promise.all([
        notificationsService.list({ unreadOnly: true, limit: 3 }),
        notificationsService.unreadCount()
      ]);
      setNotifications(unread);
      onChangeUnreadCount?.(count);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications().catch(console.error);

    const handleUpdate = () => {
      loadNotifications().catch(console.error);
    };

    window.addEventListener('notifications-updated', handleUpdate);
    return () => {
      window.removeEventListener('notifications-updated', handleUpdate);
    };
  }, []);

  const handleNotificationClick = async (id: string) => {
    await notificationsService.markRead(id);
    await loadNotifications();
  };

  const handleViewAllActivity = () => {
    navigate('/settings', { state: { tab: 'notifications' } });
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead();
      await loadNotifications();
      toast.success('All notifications marked as read!', { id: 'mark-all-read' });
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  return (
    <div className="bg-surface border border-border-base rounded-xl overflow-hidden shadow-2xl w-full">
        <div className="p-4 border-b border-border-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-headline-md text-headline-md text-text-primary">Notifications</h2>
            {notifications.length > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                {notifications.length}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline font-semibold"
            >
              Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-sm text-text-secondary">Loading notifications...</div>
        ) : notifications.length > 0 ? (
          <div className="flex flex-col">
            {notifications.map((notification, index) => {
              const meta = iconMap[notification.type] || iconMap.info;
              return (
                <div
                  key={notification.id}
                  onClick={() => void handleNotificationClick(notification.id)}
                  className={`p-4 hover:bg-surface-container-low transition-colors cursor-pointer group ${
                    index !== notifications.length - 1 ? 'border-b border-border-base' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`mt-1 w-9 h-9 shrink-0 rounded-lg ${meta.bg} flex items-center justify-center ${meta.color}`}>
                      <span className="material-symbols-outlined text-[20px]">{meta.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap justify-between items-start gap-x-2 gap-y-0.5">
                        <p className="font-body-md text-body-md text-text-primary font-semibold truncate max-w-[60%]">
                          {notification.title}
                        </p>
                        <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap text-[10px]">
                          {(() => {
                            const d = new Date(notification.createdAt);
                            return formatDDMonYYYY(d) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          })()}
                        </span>
                      </div>
                      <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleNotificationClick(notification.id);
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-[11px] font-semibold"
                      >
                        <Check size={12} />
                        Read
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-text-muted block mb-2">
              notifications_none
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">All caught up! No new notifications.</p>
          </div>
        )}

        <div className="bg-surface-container-lowest p-3 text-center border-t border-border-base">
          <button
            onClick={handleViewAllActivity}
            className="font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors py-3 w-full flex items-center justify-center min-h-[44px]"
          >
            View all activity
          </button>
        </div>
    </div>
  );
};

export default NotificationPanel;
