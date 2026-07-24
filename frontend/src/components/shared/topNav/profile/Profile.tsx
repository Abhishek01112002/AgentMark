import React from 'react';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../../../contexts/AuthContext';

interface ProfileProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Profile: React.FC<ProfileProps> = ({ isOpen, onToggle }) => {
  const { user, logout } = useAuth();
  const avatarUrl = user?.avatarUrl || null;
  const initials = (user?.name || 'User')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="relative flex-shrink-0">
      {/* Avatar Button */}
      <div
        className="w-8 h-8 rounded-full overflow-hidden cursor-pointer flex items-center justify-center transition-colors hover:border-[#6366F1]"
        style={{
          border: '1px solid #2A2A38',
          borderColor: isOpen ? '#6366F1' : '#2A2A38',
        }}
        onClick={onToggle}
      >
        {avatarUrl ? (
          <img className="w-full h-full object-cover" src={avatarUrl} alt="Profile" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#c0c1ff] bg-[#111118]">
            <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, letterSpacing: '0.04em' }}>
              {initials || <UserIcon size={18} />}
            </span>
          </div>
        )}
      </div>

      {/* Dropdown - positioned below */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-52 rounded-xl shadow-xl dropdown-enter"
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
            className="w-full text-left px-3 py-2.5 rounded-b-xl transition-colors hover:bg-[#2a292f]"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '13px',
              fontWeight: 500,
              color: '#F43F5E',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}

          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
