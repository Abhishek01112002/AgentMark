import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  icon: string;
  iconColor: string;
  bgColor: string;
}

const NotificationPanel: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Campaign Completed',
      message: '"Q4 Strategy" agents have finished processing 1,240 leads.',
      timestamp: '2m ago',
      isRead: false,
      icon: 'task_alt',
      iconColor: 'text-secondary',
      bgColor: 'bg-secondary-container/20',
    },
    {
      id: '2',
      type: 'warning',
      title: 'Human Review',
      message: 'Copywriter Agent requires approval for "Instagram Batch A".',
      timestamp: '45m ago',
      isRead: false,
      icon: 'person_search',
      iconColor: 'text-tertiary',
      bgColor: 'bg-tertiary-container/20',
    },
    {
      id: '3',
      type: 'error',
      title: 'Agent Failed',
      message: 'Visuals Agent encountered a rate limit on DALL-E API.',
      timestamp: '2h ago',
      isRead: true,
      icon: 'error',
      iconColor: 'text-error',
      bgColor: 'bg-error-container/20',
    },
  ]);

  // Filter only unread notifications
  const unreadNotifications = notifications.filter(notif => !notif.isRead);

  const handleNotificationClick = (id: string) => {
    setNotifications(
      notifications.map(notif =>
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const handleViewAllActivity = () => {
    navigate('/settings', { state: { tab: 'notifications' } });
  };

  return (
    <div className="w-full" style={{ width: '520px' }}>
      <style>{`
        .pulse-dot {
          animation: pulse 2s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.2); }
        }
        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }
        .notification-list::-webkit-scrollbar {
          width: 6px;
        }
        .notification-list::-webkit-scrollbar-track {
          background: transparent;
        }
        .notification-list::-webkit-scrollbar-thumb {
          background: #464554;
          border-radius: 3px;
        }
        .notification-list::-webkit-scrollbar-thumb:hover {
          background: #5a5968;
        }
      `}</style>

      <div className="bg-surface border border-border-base rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-border-base">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-text-primary">Notifications</h2>
            <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary text-on-primary">
              {unreadNotifications.length}
            </span>
          </div>
        </div>

        {/* Notification List - Only Unread */}
        {unreadNotifications.length > 0 ? (
          <div className="notification-list flex flex-col">
            {unreadNotifications.map((notification, index) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification.id)}
                className={`p-4 hover:bg-surface-container-low transition-colors cursor-pointer group ${
                  index !== unreadNotifications.length - 1 ? 'border-b border-border-base' : ''
                }`}
              >
                <div className="flex gap-4">
                  {/* Icon */}
                  <div
                    className={`mt-1 w-10 h-10 rounded-lg ${notification.bgColor} flex items-center justify-center ${notification.iconColor}`}
                  >
                    <span className="material-symbols-outlined">{notification.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-body-md text-body-md text-text-primary font-semibold truncate">
                        {notification.title}
                      </p>
                      <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap">
                        {notification.timestamp}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                  </div>

                  {/* Unread Indicator */}
                  <div className="w-2 h-2 bg-primary rounded-full self-center flex-shrink-0"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-4xl text-text-muted block mb-2">
              notifications_none
            </span>
            <p className="font-body-sm text-body-sm text-text-secondary">
              All caught up! No new notifications.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-surface-container-lowest p-3 text-center border-t border-border-base">
          <button
            onClick={handleViewAllActivity}
            className="font-label-md text-label-md text-text-secondary hover:text-text-primary transition-colors"
          >
            View all activity
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
