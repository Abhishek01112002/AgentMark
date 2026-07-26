// TopNav.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSidebar } from '../sidebar/Sidebar';
import Profile from './profile/Profile';
import NotificationPanel from './notification/Notification';
import { Bell } from 'lucide-react';
import { notificationsService } from '../../../services/notifications.service';

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
  const [unreadCount, setUnreadCount] = useState(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const displayTitle = title || routeTitles[location.pathname] || 'AgentMark';

  const handleDropdownToggle = (dropdown: 'profile' | 'notification') => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown);
  };

  useEffect(() => {
    const loadUnreadCount = async () => {
      try {
        const count = await notificationsService.unreadCount();
        setUnreadCount(count);
      } catch {
        setUnreadCount(0);
      }
    };

    void loadUnreadCount();

    // Fast 5-second polling so notification count updates in real-time
    const interval = setInterval(() => {
      void loadUnreadCount();
    }, 5000);

    const handleUpdate = () => {
      void loadUnreadCount();
    };

    window.addEventListener('notifications-updated', handleUpdate);

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (headerRef.current && headerRef.current.contains(target)) {
        return;
      }
      if (target instanceof HTMLElement && target.closest('.notification-panel-container')) {
        return;
      }
      setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      clearInterval(interval);
      window.removeEventListener('notifications-updated', handleUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (openDropdown === 'notification') {
      void notificationsService.unreadCount().then(setUnreadCount).catch(() => setUnreadCount(0));
    }
  }, [openDropdown]);

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
            className="hidden md:block"
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(16px, 2vw, 24px)',
              lineHeight: '32px',
              fontWeight: 600,
              color: '#c0c1ff',
              whiteSpace: 'nowrap',
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
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-medium transition-all"
              style={{
                fontFamily: 'Sora, sans-serif',
                fontSize: '11px',
                backgroundColor: 'rgba(26, 26, 36, 0.6)',
                border: '1px solid rgba(42, 42, 56, 0.8)',
                color: '#A0A0D2',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: stat.color || '#6366F1' }}
              />
              <span style={{ textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.06em', color: '#8B8B9E', fontWeight: 600 }}>{stat.label}:</span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, color: '#F1F1F3', fontSize: '12px' }}>{stat.value}</span>
            </span>
          ))}

          {/* Notifications */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              ref={bellRef}
              className={`p-2 rounded-xl transition-all border cursor-pointer ${
                openDropdown === 'notification'
                  ? 'bg-[#6366F1]/20 text-[#818CF8] border-[#6366F1]/40 shadow-sm'
                  : 'bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border-white/10'
              }`}
              onClick={() => handleDropdownToggle('notification')}
              aria-label="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4 px-1 rounded-full bg-[#6366F1] text-white text-[10px] font-mono font-bold flex items-center justify-center border border-[#0D0D14] shadow-md animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          {/* Profile */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Profile isOpen={openDropdown === 'profile'} onToggle={() => handleDropdownToggle('profile')} />
          </div>
        </div>
      </header>

      {/* Notification panel — Right screen touch alignment */}
      {openDropdown === 'notification' && (
        <div
          className="fixed top-16 right-4 sm:right-6 z-50 notification-panel-container animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          <NotificationPanel onChangeUnreadCount={setUnreadCount} />
        </div>
      )}
    </>
  );
};

export default TopNav;
