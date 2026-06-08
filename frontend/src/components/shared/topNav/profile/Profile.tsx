import React from 'react';
import { User } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface ProfileProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Profile: React.FC<ProfileProps> = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Avatar Button */}
      <div
        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer flex items-center justify-center transition-colors"
        style={{
          border: '1px solid #2A2A38',
          borderColor: isOpen ? '#6366F1' : '#2A2A38',
        }}
        onMouseEnter={(e) => {
          if (!isOpen) ((e.currentTarget as HTMLElement).style.borderColor = '#6366F1');
        }}
        onMouseLeave={(e) => {
          if (!isOpen) ((e.currentTarget as HTMLElement).style.borderColor = '#2A2A38');
        }}
        onClick={onToggle}
      >
        <img
          className="w-full h-full object-cover"
          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop"
          alt="Profile"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.style.backgroundColor = '#111118';
              const icon = parent.querySelector('.fallback-icon');
              if (icon) (icon as HTMLElement).style.display = 'block';
            }
          }}
        />
        <User size={18} style={{ color: '#8B8B9E', display: 'none' }} className="fallback-icon" />
      </div>

      {/* Dropdown - positioned below */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl"
          style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38', zIndex: 60 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3" style={{ borderBottom: '1px solid #2A2A38' }}>
            <p
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: '#F1F1F3',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'User'}
            </p>
            <p
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '11px',
                color: '#8B8B9E',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email || ''}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-b-xl transition-colors"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              fontWeight: 500,
              color: '#F43F5E',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#2a292f')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
