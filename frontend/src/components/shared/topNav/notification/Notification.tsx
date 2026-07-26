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

    // Fast 4-second polling while notification panel is open
    const interval = setInterval(() => {
      loadNotifications().catch(() => {});
    }, 4000);

    const handleUpdate = () => {
      loadNotifications().catch(console.error);
    };

    window.addEventListener('notifications-updated', handleUpdate);
    return () => {
      clearInterval(interval);
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
    <div className="rounded-2xl border border-white/[0.12] bg-[#12121A]/95 backdrop-blur-2xl shadow-[0_30px_70px_rgba(0,0,0,0.8)] overflow-hidden w-80 sm:w-96 font-sans">
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
      {loading ? (
        <div className="p-6 text-xs text-[#94A3B8] font-sans text-center">Loading notifications...</div>
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
