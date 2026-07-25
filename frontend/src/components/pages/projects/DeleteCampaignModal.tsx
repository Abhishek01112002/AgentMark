import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteCampaignModalProps {
  campaignName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteCampaignModal: React.FC<DeleteCampaignModalProps> = ({ campaignName, onClose, onConfirm }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-overlay"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="w-full max-w-md rounded-xl p-6 modal-content bg-surface border border-border-base"
          style={{
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}
              >
                <AlertTriangle size={20} style={{ color: '#F43F5E' }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
              >
                Delete Campaign
              </h2>
            </div>
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm mb-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
              Are you sure you want to delete <span style={{ color: '#F1F1F3', fontWeight: 600 }}>"{campaignName}"</span>?
            </p>
            <p className="text-sm" style={{ color: '#F43F5E', fontFamily: 'Sora, sans-serif' }}>
              This action cannot be undone. All campaign data will be permanently deleted.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center bg-transparent border border-[#2A2A38] text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3]"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all flex items-center justify-center bg-[#F43F5E] text-[#F1F1F3] hover:bg-[#E11D48] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                border: 'none',
              }}
            >
              Delete Campaign
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteCampaignModal;
