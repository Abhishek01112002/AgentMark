import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteProjectModalProps {
  projectName: string;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({ projectName, onClose, onConfirm }) => {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="w-full max-w-md rounded-2xl p-6 modal-content"
          style={{
            backgroundColor: '#111118',
            border: '1px solid #2A2A38',
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
                Delete Project
              </h2>
            </div>
            {/* Close button — hover via Tailwind, no JS handlers */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm mb-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
              Are you sure you want to delete <span style={{ color: '#F1F1F3', fontWeight: 600 }}>"{projectName}"</span>?
            </p>
            <p className="text-sm" style={{ color: '#F43F5E', fontFamily: 'Sora, sans-serif' }}>
              This action cannot be undone. All campaigns inside this project will be permanently deleted.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Cancel button — hover via Tailwind */}
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3]"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #2A2A38',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Cancel
            </button>
            {/* Delete button — hover via Tailwind + CSS shadow transition */}
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all text-[#F1F1F3] bg-[#F43F5E] hover:bg-[#E11D48] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                border: 'none',
              }}
            >
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default DeleteProjectModal;
