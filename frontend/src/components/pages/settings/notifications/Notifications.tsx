import React, { useEffect, useState } from 'react';
import { notificationsService, Notification } from '../../../../services/notifications.service';
import { Check, Trash2 } from 'lucide-react';
import { formatDDMonYYYY } from '../../../../utils/formatDate';

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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.list();
      setNotifications(data);
      // Auto-cap current page to new totalPages on delete to avoid out-of-bounds pages
      const newTotalPages = Math.max(1, Math.ceil(data.length / itemsPerPage));
      setCurrentPage(prev => Math.min(prev, newTotalPages));
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

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(notifications.map(n => n.id));
    } else {
      setSelectedIds([]);
    }
  };

  const deleteOne = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Notification',
      message: 'Are you sure you want to delete this notification? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await notificationsService.delete(id);
          setSelectedIds(prev => prev.filter(item => item !== id));
          await loadNotifications();
        } catch (error) {
          console.error('Failed to delete notification:', error);
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: 'Delete Selected Notifications',
      message: `Are you sure you want to delete the ${selectedIds.length} selected notifications? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await notificationsService.deleteBatch(selectedIds);
          setSelectedIds([]);
          await loadNotifications();
        } catch (error) {
          console.error('Failed to delete selected notifications:', error);
        } finally {
          setConfirmModal(null);
        }
      }
    });
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
          onClick={() => { markAllRead().catch(console.error); }}
          className="px-4 py-2 rounded-lg border border-border-base text-text-secondary hover:bg-surface-container-high transition-colors text-sm"
        >
          Mark all read
        </button>
      </div>

      {notifications.length > 0 && (
        <div className="px-6 py-3 bg-surface-container-low border-b border-border-base flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.length > 0 && notifications.every(n => selectedIds.includes(n.id))}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-border-base bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer accent-[#8083ff]"
            />
            <span className="font-body-sm text-body-sm text-text-secondary">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All'}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => { deleteSelected(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error/10 hover:bg-error/20 text-error border border-error/20 transition-colors text-xs font-semibold"
            >
              <Trash2 size={14} />
              Delete Selected
            </button>
          )}
        </div>
      )}

      <div className="divide-y divide-border-base max-h-[600px] overflow-y-auto">
        {loading ? (
          <div className="p-6 text-text-secondary">Loading notifications...</div>
        ) : currentNotifications.length > 0 ? (
          currentNotifications.map((notification) => {
            const meta = iconMap[notification.type] || iconMap.info;
            const isSelected = selectedIds.includes(notification.id);
            return (
              <div key={notification.id} className="p-4 hover:bg-surface-container-low transition-colors group flex items-start gap-4">
                <div className="pt-2 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(notification.id)}
                    className="w-4 h-4 rounded border-border-base bg-surface-container-lowest text-primary focus:ring-primary cursor-pointer accent-[#8083ff]"
                  />
                </div>
                <div className="flex-1 flex gap-4 min-w-0">
                  <div className={`mt-1 w-10 h-10 rounded-lg ${meta.bg} flex items-center justify-center ${meta.color} flex-shrink-0`}>
                    <span className="material-symbols-outlined">{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="font-body-md text-body-md text-text-primary font-semibold truncate">{notification.title}</p>
                      <span className="font-label-sm text-label-sm text-text-muted whitespace-nowrap">
                        {(() => {
                            const d = new Date(notification.createdAt);
                            return formatDDMonYYYY(d) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                          })()}
                      </span>
                    </div>
                    <p className="font-body-sm text-body-sm text-text-secondary mt-1 line-clamp-2">{notification.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!notification.isRead ? (
                    <button
                      onClick={() => { markOneRead(notification.id).catch(console.error); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-xs font-semibold"
                    >
                      <Check size={14} />
                      <span className="hidden sm:inline">Mark as read</span>
                    </button>
                  ) : (
                    <span className="text-xs text-text-muted px-2">Read</span>
                  )}
                  <button
                    onClick={() => { deleteOne(notification.id); }}
                    className="inline-flex items-center justify-center p-2 rounded-lg border border-error/20 text-error hover:bg-error/10 transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
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
          </select>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div 
            className="w-full max-w-md bg-surface border border-border-base rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: '#16161F',
              borderColor: '#2A2A38',
              fontFamily: 'Sora, sans-serif'
            }}
          >
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {confirmModal.title}
            </h3>
            <p className="text-sm text-text-secondary mb-6 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm font-semibold rounded-lg border border-border-base text-text-secondary hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                }}
                className="px-4 py-2 text-sm font-semibold rounded-lg text-white hover:opacity-90 transition-all"
                style={{ backgroundColor: '#EF4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
