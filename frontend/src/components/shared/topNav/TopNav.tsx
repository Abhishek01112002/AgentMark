// TopNav.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '../sidebar/Sidebar';
import Profile from './profile/Profile';
import NotificationPanel from './notification/Notification';
import { Bell } from 'lucide-react';

interface TopNavProps {
  title?: string;
  stats?: { label: string; value: string | number; color?: string }[];
}

const routeTitles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/research':   'Research',
  '/strategy':   'Strategy',
  '/copywriter': 'Copywriter',
  '/visuals':    'Visuals',
  '/review':     'Review',
  '/publisher':  'Publisher',
  '/settings':   'Settings',
  '/support':    'Support',
};

const TopNav: React.FC<TopNavProps> = ({ title, stats }) => {
  const location = useLocation();
  const { setMobileOpen } = useSidebar();
  const [openDropdown, setOpenDropdown] = useState<'profile' | 'notification' | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const displayTitle = title || routeTitles[location.pathname] || 'AgentMark';

  const handleDropdownToggle = (dropdown: 'profile' | 'notification') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <>
      <style>{`
        .topnav-bar {
          left: 0;
          transition: left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .topnav-bar {
            left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <header
        ref={headerRef}
        className="topnav-bar fixed top-0 right-0 z-40 flex items-center justify-between px-4 md:px-6 h-14"
        style={{
          backgroundColor: 'rgba(27,27,32,0.9)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid #2A2A38',
        }}
      >
        {/* Left — Title (desktop) / Hamburger + Logo (mobile) */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 -ml-2 flex-shrink-0"
            style={{ color: '#F1F1F3' }}
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6"  x2="20" y2="6"  />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </button>

          {/* Mobile brand */}
          <span
            className="md:hidden truncate"
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '18px',
              lineHeight: '24px',
              fontWeight: 600,
              color: '#c0c1ff',
            }}
          >
            AgentMark
          </span>

          {/* Desktop title */}
          <h1
            className="hidden md:block truncate"
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: '24px',
              lineHeight: '32px',
              fontWeight: 600,
              color: '#c0c1ff',
            }}
          >
            {displayTitle}
          </h1>
        </div>

        {/* Right — actions */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          {/* Optional stats badges */}
          {stats && stats.map((stat, idx) => (
            <span
              key={idx}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '12px',
                letterSpacing: '0.05em',
                backgroundColor: '#1A1A24',
                border: '1px solid #2A2A38',
                color: '#8B8B9E',
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: stat.color || '#6366F1' }}
              />
              {stat.label} {stat.value}
            </span>
          ))}

          {/* Notifications */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              className="relative transition-colors"
              style={{ color: openDropdown === 'notification' ? '#c0c1ff' : '#c7c4d7' }}
              onMouseEnter={(e) => {
                if (openDropdown !== 'notification') (e.currentTarget as HTMLElement).style.color = '#c0c1ff';
              }}
              onMouseLeave={(e) => {
                if (openDropdown !== 'notification') (e.currentTarget as HTMLElement).style.color = '#c7c4d7';
              }}
              onClick={() => handleDropdownToggle('notification')}
              aria-label="Notifications"
            >
              <Bell size={20} />
              <span
                className="absolute top-0 right-0 w-2 h-2 rounded-full border-2"
                style={{ backgroundColor: '#6366F1', borderColor: '#1b1b20' }}
              />
            </button>

            {/* Notification Dropdown */}
            {openDropdown === 'notification' && (
              <div
                className="absolute top-full right-0 mt-2 rounded-xl shadow-xl"
                style={{ zIndex: 60 }}
                onClick={(e) => e.stopPropagation()}
              >
                <NotificationPanel />
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Profile isOpen={openDropdown === 'profile'} onToggle={() => handleDropdownToggle('profile')} />
          </div>
        </div>
      </header>
    </>
  );
};

export default TopNav;
