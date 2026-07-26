import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
    <div className="space-y-5">
      {/* Apple Pro Header Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold font-sora text-white">System Notifications</h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans mt-0.5">Audit system events, multi-agent run alerts, and security activity logs</p>
          </div>
          {notifications.length > 0 && (
            <button
              onClick={() => { markAllRead().catch(console.error); }}
              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold transition-all shadow-sm active:scale-[0.98] font-sora cursor-pointer border-none self-start sm:self-center"
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-3 bg-[#0D0D14] border border-[#262636] rounded-2xl flex items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={notifications.length > 0 && notifications.every(n => selectedIds.includes(n.id))}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="w-4 h-4 rounded border-[#262636] bg-[#111118] text-[#6366F1] focus:ring-0 cursor-pointer accent-[#6366F1]"
            />
            <span className="text-[#94A3B8]">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : 'Select All Notifications'}
            </span>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => { deleteSelected(); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-[#F43F5E] border border-[#F43F5E]/20 transition-all text-xs font-semibold cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-8 text-center text-xs text-[#94A3B8] font-sans rounded-2xl border border-white/[0.08] bg-[#12121A]/90">Loading notifications...</div>
        ) : currentNotifications.length > 0 ? (
          currentNotifications.map((notification) => {
            const meta = iconMap[notification.type] || iconMap.info;
            const isSelected = selectedIds.includes(notification.id);
            return (
              <div key={notification.id} className="p-4 sm:p-5 rounded-2xl border border-white/[0.08] bg-[#12121A]/90 backdrop-blur-xl transition-all hover:border-white/[0.14] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectOne(notification.id)}
                    className="w-4 h-4 rounded border-[#262636] bg-[#111118] text-[#6366F1] focus:ring-0 cursor-pointer accent-[#6366F1] mt-1 shrink-0"
                  />
                  <div className={`w-9 h-9 rounded-xl ${meta.bg} border border-white/5 flex items-center justify-center ${meta.color} shrink-0 mt-0.5`}>
                    <span className="material-symbols-outlined text-lg">{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="text-sm font-semibold font-sora text-white truncate">{notification.title}</p>
                      <span className="text-[11px] font-mono text-[#94A3B8]">
                        {(() => {
                          const d = new Date(notification.createdAt);
                          return formatDDMonYYYY(d) + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                        })()}
                      </span>
                    </div>
                    <p className="text-xs text-[#94A3B8] font-sans mt-1 leading-relaxed line-clamp-2">{notification.message}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!notification.isRead ? (
                    <button
                      onClick={() => { markOneRead(notification.id).catch(console.error); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6366F1]/10 text-[#818CF8] hover:bg-[#6366F1]/20 border border-[#6366F1]/20 transition-all text-xs font-semibold font-sora cursor-pointer"
                    >
                      <Check size={13} />
                      <span>Mark Read</span>
                    </button>
                  ) : (
                    <span className="text-xs text-[#64748B] font-mono px-2">Read</span>
                  )}
                  <button
                    onClick={() => { deleteOne(notification.id); }}
                    className="p-1.5 rounded-xl text-[#94A3B8] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors border-none bg-transparent cursor-pointer"
                    title="Delete notification"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-xs text-[#94A3B8] font-sans rounded-2xl border border-white/[0.08] bg-[#12121A]/90">No notifications found</div>
        )}
      </div>

      <div className="bg-surface-container-lowest px-4 md:px-6 py-3 md:py-4 border-t border-border-base">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="font-body-sm text-body-sm text-text-secondary text-center md:text-left">
            Showing {notifications.length === 0 ? 0 : startIndex + 1} to {endIndex} of {notifications.length} notifications
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1 justify-center md:justify-start">
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
              className="px-3 py-1 rounded border border-border-base bg-surface-container-lowest text-text-secondary font-label-sm text-label-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none cursor-pointer w-full md:w-auto"
            >
              <option value={5}>5 per page</option>
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
            </select>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal && confirmModal.isOpen && createPortal(
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm modal-overlay"
          onClick={() => setConfirmModal(null)}
        >
          <div
            className="w-full max-w-md bg-surface border border-border-base rounded-2xl p-6 shadow-2xl modal-content"
            style={{
              backgroundColor: '#16161F',
              borderColor: '#2A2A38',
              fontFamily: 'Sora, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
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
        </div>,
        document.body
      )}
    </div>
  );
};

export default Notifications;
