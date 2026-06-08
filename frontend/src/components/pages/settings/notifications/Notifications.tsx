import React, { useState } from 'react';

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

const Notifications: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Mock data - 42 notifications
  const allNotifications: Notification[] = Array.from({ length: 42 }, (_, i) => ({
    id: `${i + 1}`,
    type: (['success', 'warning', 'error'] as const)[i % 3],
    title: `Notification ${i + 1}`,
    message: `This is notification message number ${i + 1}. Details about what happened in your account.`,
    timestamp: `${Math.floor(Math.random() * 24)}h ago`,
    isRead: i > 5,
    icon: ['task_alt', 'person_search', 'error'][i % 3],
    iconColor: ['text-secondary', 'text-tertiary', 'text-error'][i % 3],
    bgColor: ['bg-secondary-container/20', 'bg-tertiary-container/20', 'bg-error-container/20'][i % 3],
  }));

  const totalPages = Math.ceil(allNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, allNotifications.length);
  const currentNotifications = allNotifications.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="bg-surface border border-border-base rounded-xl overflow-hidden">
      <div className="p-6 border-b border-border-base">
        <h2 className="font-headline-md text-headline-md text-text-primary">Notifications</h2>
        <p className="font-body-sm text-body-sm text-text-secondary mt-1">
          View and manage your account notifications.
        </p>
      </div>

      {/* Notification List */}
      <div className="divide-y divide-border-base max-h-[600px] overflow-y-auto">
        {currentNotifications.map((notification) => (
          <div key={notification.id} className="p-4 hover:bg-surface-container-low transition-colors cursor-pointer group">
            <div className="flex gap-4">
              {/* Icon */}
              <div className={`mt-1 w-10 h-10 rounded-lg ${notification.bgColor} flex items-center justify-center ${notification.iconColor}`}>
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
              {!notification.isRead && (
                <div className="w-2 h-2 bg-primary rounded-full self-center flex-shrink-0"></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Footer */}
      <div className="bg-surface-container-lowest px-6 py-4 border-t border-border-base">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left: Showing info */}
          <div className="font-body-sm text-body-sm text-text-secondary">
            Showing {startIndex + 1} to {endIndex} of {allNotifications.length} notifications
          </div>

          {/* Middle: Pagination controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
              title="First"
            >
              &lt;&lt;
            </button>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
              title="Previous"
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
              title="Next"
            >
              &gt;
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded border border-border-base text-text-secondary hover:bg-surface-container-high disabled:opacity-50 disabled:cursor-not-allowed font-label-sm text-label-sm transition-all"
              title="Last"
            >
              &gt;&gt;
            </button>
          </div>

          {/* Right: Items per page selector */}
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
