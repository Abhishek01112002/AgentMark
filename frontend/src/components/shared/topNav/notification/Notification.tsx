import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsService, Notification } from '../../../../services/notifications.service';
import { Check } from 'lucide-react';
import toast from 'react-hot-toast';

const iconMap: Record<string, { icon: string; bg: string; color: string }> = {
  success: { icon: '✓', bg: 'bg-emerald-500/15 border border-emerald-500/30', color: 'text-emerald-400' },
  warning: { icon: '!', bg: 'bg-amber-500/15 border border-amber-500/30', color: 'text-amber-400' },
  error: { icon: '✕', bg: 'bg-rose-500/15 border border-rose-500/30', color: 'text-rose-400' },
  info: { icon: 'i', bg: 'bg-[#6366F1]/15 border border-[#6366F1]/30', color: 'text-[#818CF8]' },
};

interface NotificationPanelProps {
  onChangeUnreadCount?: (count: number) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onChangeUnreadCount }) => {
  const navigate = useNavigate();
  // Instant render from cache (0ms latency!)
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    notificationsService.getCachedPanelNotifications()
  );
  const [loading, setLoading] = useState(() => !notificationsService.hasCache());

  const loadNotifications = async (silent = false) => {
    if (!silent && !notificationsService.hasCache()) {
      setLoading(true);
    }
    try {
      const { notifications: unread, unreadCount } = await notificationsService.prefetchPanel();
      setNotifications(unread);
      onChangeUnreadCount?.(unreadCount);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial silent revalidation or immediate fetch
    void loadNotifications(notifications.length > 0);

    // Fast 5-second polling while notification panel is open
    const interval = setInterval(() => {
      void loadNotifications(true);
    }, 5000);

    const handleUpdate = () => {
      setNotifications(notificationsService.getCachedPanelNotifications());
      onChangeUnreadCount?.(notificationsService.getCachedUnreadCount());
      void loadNotifications(true);
    };

    window.addEventListener('notifications-updated', handleUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleUpdate);
    };
  }, []);

  const handleNotificationClick = async (id: string) => {
    // Instant optimistic removal from UI
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await notificationsService.markRead(id);
  };

  const handleViewAllActivity = () => {
    navigate('/settings', { state: { tab: 'notifications' } });
  };

  const handleMarkAllRead = async () => {
    // Instant optimistic UI clear
    setNotifications([]);
    onChangeUnreadCount?.(0);
    try {
      await notificationsService.markAllRead();
      toast.success('All notifications marked as read!', { id: 'mark-all-read' });
    } catch {
      toast.error('Failed to mark all as read');
      void loadNotifications(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/[0.12] bg-[#12121A]/95 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden w-[calc(100vw-32px)] max-w-sm sm:w-96 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-[#262636] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse" />
          <h2 className="text-xs font-bold font-sora uppercase tracking-wider text-white">Notification Center</h2>
          {notifications.length > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/30">
              {notifications.length}
            </span>
          )}
        </div>
        {notifications.length > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] font-sora font-semibold text-[#818CF8] hover:text-white transition-colors cursor-pointer border-none bg-transparent"
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      {loading && notifications.length === 0 ? (
        <div className="p-3 space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-[#0B0B12] border border-[#262636] rounded-xl p-3.5 space-y-2 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-white/5" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                  <div className="h-2.5 bg-white/5 rounded w-3/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="p-3 space-y-2.5 max-h-[380px] overflow-y-auto">
          {notifications.map((notification) => {
            const meta = iconMap[notification.type] || iconMap.info;
            return (
              <div
                key={notification.id}
                onClick={() => void handleNotificationClick(notification.id)}
                className="bg-[#0B0B12] hover:bg-[#161622] border border-[#262636] hover:border-[#6366F1]/30 rounded-xl p-3.5 space-y-2 transition-all cursor-pointer shadow-sm group"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-6 h-6 shrink-0 rounded-lg ${meta.bg} flex items-center justify-center font-mono font-bold text-xs ${meta.color} mt-0.5`}>
                    {meta.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-semibold font-sora text-white truncate group-hover:text-[#818CF8] transition-colors">
                        {notification.title}
                      </p>
                      <span className="text-[9px] font-mono text-[#64748B] shrink-0">
                        {(() => {
                          const d = new Date(notification.createdAt);
                          return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        })()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#94A3B8] leading-relaxed line-clamp-2 font-sans">
                      {notification.message}
                    </p>
                    <div className="mt-2.5 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleNotificationClick(notification.id);
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all text-[10px] font-sora font-semibold cursor-pointer"
                      >
                        <Check size={11} className="text-emerald-400" />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-8 text-center space-y-2">
          <span className="text-2xl block opacity-60">🔔</span>
          <p className="text-xs text-[#94A3B8] font-sans">All caught up! No unread notifications.</p>
        </div>
      )}

      {/* Footer */}
      <div className="p-3 text-center border-t border-[#262636] bg-black/20">
        <button
          onClick={handleViewAllActivity}
          className="text-xs font-sora font-semibold text-[#818CF8] hover:text-white transition-colors py-1 w-full flex items-center justify-center border-none bg-transparent cursor-pointer"
        >
          View Notification Settings &rarr;
        </button>
      </div>
    </div>
  );
};

export default NotificationPanel;

