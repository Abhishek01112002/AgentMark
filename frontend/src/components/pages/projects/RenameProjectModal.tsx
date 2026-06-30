import React, { useState, useRef, useEffect } from 'react';
import { Edit3, X } from 'lucide-react';

interface RenameProjectModalProps {
  currentName: string;
  onClose: () => void;
  onConfirm: (newName: string) => void;
}

const RenameProjectModal: React.FC<RenameProjectModalProps> = ({ currentName, onClose, onConfirm }) => {
  const [name, setName] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed && trimmed !== currentName) {
      onConfirm(trimmed);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl p-6"
          style={{
            backgroundColor: '#111118',
            border: '1px solid #2A2A38',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                <Edit3 size={20} style={{ color: '#6366F1' }} />
              </div>
              <h2
                className="text-xl font-bold"
                style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
              >
                Rename Project
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: '#8B8B9E' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1A24';
                (e.currentTarget as HTMLElement).style.color = '#F1F1F3';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}
              >
                Project Name
              </label>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all"
                style={{
                  backgroundColor: '#0A0A0F',
                  border: '1px solid #2A2A38',
                  color: '#F1F1F3',
                  fontFamily: 'Sora, sans-serif',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = '#6366F1')}
                onBlur={(e) => (e.currentTarget.style.borderColor = '#2A2A38')}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: 'transparent',
                  border: '1px solid #2A2A38',
                  color: '#8B8B9E',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1A24';
                  (e.currentTarget as HTMLElement).style.color = '#F1F1F3';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: '#6366F1',
                  color: '#F1F1F3',
                  fontFamily: 'JetBrains Mono, monospace',
                  border: 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RenameProjectModal;
