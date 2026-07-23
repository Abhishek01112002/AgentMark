import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateProjectModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim(), description.trim());
    }
  };

  return (
    <>
      <style>{`
        input[type="text"], textarea {
          background-color: #131318;
          border-color: #2A2A38;
          color: #F1F1F3;
        }
        input:focus, textarea:focus {
          border-color: #6366F1 !important;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important;
          outline: none;
        }
        ::placeholder {
          color: #4A4A5E;
        }
      `}</style>

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
          <div className="flex items-center justify-between mb-6">
            <h2
              className="text-xl font-bold"
              style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
            >
              Create New Project
            </h2>
            {/* Close button — hover via Tailwind, no JS handlers */}
            <button
              aria-label="Close"
              onClick={onClose}
              className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3]"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
              >
                Project Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg px-3 py-3 min-h-[44px] text-sm border transition-all"
                placeholder="e.g., Nike 2025 Campaign"
                style={{ fontFamily: 'Sora, sans-serif' }}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
              >
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm border resize-y transition-all"
                placeholder="Brief description of this project..."
                rows={3}
                style={{ fontFamily: 'Sora, sans-serif' }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              {/* Cancel button — hover via Tailwind */}
               <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-[#F1F1F3] flex items-center justify-center"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #2A2A38',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                Cancel
              </button>
              {/* Create button — hover via Tailwind + CSS shadow transition */}
              <button
                type="submit"
                className="flex-1 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all text-[#F1F1F3] bg-[#6366F1] hover:bg-[#8083ff] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] flex items-center justify-center"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  border: 'none',
                }}
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateProjectModal;
