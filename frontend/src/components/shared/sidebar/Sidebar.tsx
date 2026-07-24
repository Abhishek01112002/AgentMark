// Sidebar.tsx
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Plus, History,
  Settings, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';

/* ─── Context ──────────────────────────────────────────── */
interface SidebarCtx {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const Ctx = createContext<SidebarCtx>({
  collapsed: false,
  setCollapsed: () => {},
  mobileOpen: false,
  setMobileOpen: () => {},
});

export const useSidebar = () => useContext(Ctx);

export const SidebarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(collapsed)); } catch {}
  }, [collapsed]);

  return (
    <Ctx.Provider value={{ collapsed, setCollapsed, mobileOpen, setMobileOpen }}>
      {children}
    </Ctx.Provider>
  );
};

/* ─── Constants ────────────────────────────────────────── */
const EXPANDED_W = 240;
const COLLAPSED_W = 72;
const ACTIVE_CAMPAIGNS_POLL_MS = 30000;

const navItems = [
  { name: 'Dashboard',         icon: LayoutDashboard, path: '/dashboard', isLink: true  },
  { name: 'Projects',          icon: FolderOpen,      path: '/projects', isLink: true   },
  { name: 'New Campaign',      icon: Plus,            path: '/campaign/new', isLink: true },
  { name: 'Campaign History',  icon: History,         path: '/history', isLink: true    },
];

const bottomNavItems = [
  { name: 'Settings', icon: Settings,   path: '/settings', isLink: true },
  { name: 'Support',  icon: HelpCircle, path: '/support', isLink: true  },
];

/* ─── Sidebar Component ────────────────────────────────── */
const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  const [activeCampaigns, setActiveCampaigns] = useState<Array<{
    id: string;
    name: string;
    status: string;
    projectId: string;
  }>>([]);

  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;
    const intervalRef = { current: undefined as number | undefined };

    const fetchActive = async () => {
      if (document.visibilityState === 'hidden') {
        return;
      }

      try {
        const res = await api.get('/campaigns/active/live', {
          timeout: 8000,
          signal: abortController.signal,
        });
        if (!cancelled) {
          setActiveCampaigns(res.data.campaigns || []);
        }
      } catch (err) {
        if (!cancelled) {
          const error = err as { name?: string };
          if (error.name !== 'AbortError' && error.name !== 'CanceledError') {
            console.error('Failed to fetch active campaigns in sidebar:', err);
          }
        }
      }
    };

    const startPolling = () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      void fetchActive();
      intervalRef.current = window.setInterval(fetchActive, ACTIVE_CAMPAIGNS_POLL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
    };

    startPolling();

    window.addEventListener('campaign_status_changed', fetchActive);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      abortController.abort();
      cancelled = true;
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      window.removeEventListener('campaign_status_changed', fetchActive);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const isActive = (path: string) => {
    if (path === '/campaign/new') {
      return location.pathname === '/campaign/new';
    }
    if (path === '/projects') {
      return location.pathname.startsWith('/projects') || 
             (location.pathname.startsWith('/campaign/') && location.pathname !== '/campaign/new');
    }
    if (path === '/support') {
      return location.pathname === '/support';
    }
    return location.pathname === path;
  };

  // Sync CSS variable for other components
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--sidebar-w',
      `${collapsed ? COLLAPSED_W : EXPANDED_W}px`
    );
  }, [collapsed]);

  // Close mobile sidebar on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname, setMobileOpen]);

  // Lock body scroll when mobile open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  /* ── Render nav content ── */
  const renderContent = (isCollapsed: boolean) => (
    <>
      {/* ── Header ── */}
      <div className={`flex-shrink-0 p-4 ${isCollapsed ? 'mb-2' : 'mb-4'}`}>
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className={`px-2 flex items-center gap-3 mb-2 ${isCollapsed && 'justify-center'} w-full bg-transparent border-none cursor-pointer transition-opacity hover:opacity-80`}
        >
          <div className="flex items-center justify-center flex-shrink-0">
            <img
              src="/novateches.png"
              alt="AgentMark"
              className="w-10 h-10 object-contain"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const parent = el.parentElement;
                if (parent) {
                  parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#8083ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
                }
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden">
              <div
                className="text-base font-bold whitespace-nowrap"
                style={{
                  fontFamily: 'Sora, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px',
                  fontWeight: 600,
                  letterSpacing: '-0.01em',
                  color: '#c0c1ff',
                }}
              >
                AgentMark
              </div>
              <div
                className="whitespace-nowrap"
                style={{
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12px',
                  lineHeight: '16px',
                  letterSpacing: '0.05em',
                  fontWeight: 500,
                  color: '#4A4A5E',
                  textTransform: 'uppercase',
                  marginTop: '4px',
                }}
              >
                Marketing OS
              </div>
            </div>
          )}
        </button>

        {/* Toggle Button - Desktop only */}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center p-2 rounded-lg transition-colors mt-2 bg-transparent text-[#4A4A5E] hover:bg-[#2a292f] hover:text-[#c0c1ff]"
          style={{
            border: '1px solid #2A2A38',
          }}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* ── Section Label ── */}
      {!isCollapsed && (
        <div className="px-6 mb-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: '#4A4A5E',
              fontWeight: 500,
            }}
          >
            MAIN
          </span>
        </div>
      )}

      {/* ── Main Nav - Scrollable ── */}
      <div
        className="flex-1 overflow-y-auto px-4 space-y-1"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#2A2A38 transparent',
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const content = (
            <>
              <Icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </>
          );
          
          const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all btn-press ${
            isCollapsed && 'justify-center'
          }`;
          
          const style = {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.02em',
            fontWeight: active ? 700 : 500,
            backgroundColor: active ? '#8083ff' : 'transparent',
            color: active ? '#0d0096' : '#c7c4d7',
            transform: active ? 'translateX(4px)' : 'none',
            transitionDuration: '200ms',
            cursor: 'pointer',
            border: 'none',
            width: '100%',
            textAlign: 'left' as const,
          };
          
          const handleMouseEnter = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
            if (!active) {
              e.currentTarget.classList.add('nav-hover');
            }
          };
          
          const handleMouseLeave = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
            if (!active) {
              e.currentTarget.classList.remove('nav-hover');
            }
          };
          
          if (item.isLink) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleMouseEnter}
                onTouchEnd={handleMouseLeave}
                onTouchCancel={handleMouseLeave}
                title={isCollapsed ? item.name : ''}
              >
                {content}
              </Link>
            );
          }
          return null;
        })}

        {/* Active Campaigns list */}
        {activeCampaigns.length > 0 && (
          <div className="mt-6 pt-4 animate-fadeIn" style={{ borderTop: '1px solid #1c1b22' }}>
            {!isCollapsed && (
              <div className="flex items-center justify-between px-3 mb-2.5">
                <span
                  className="text-[10px] uppercase tracking-wider flex items-center gap-2"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    color: '#4A4A5E',
                    fontWeight: 600,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                  Active Runs
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/5 text-secondary border border-secondary/10 font-bold font-mono">
                  {activeCampaigns.length}
                </span>
              </div>
            )}
            <div className="space-y-1">
              {activeCampaigns.map((c) => {
                const active = location.pathname === `/campaign/${c.id}/live`;
                const isAwaitingReview = c.status === 'awaiting_human_approval';
                
                return (
                  <Link
                    key={c.id}
                    to={`/campaign/${c.id}/live?projectId=${c.projectId}`}
                    className={`flex items-center gap-3 px-3 py-2 transition-all ${
                      isCollapsed ? 'justify-center' : ''
                    }`}
                    style={{
                      fontFamily: 'Sora, sans-serif',
                      backgroundColor: active ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                      borderLeft: active 
                        ? `2.5px solid ${isAwaitingReview ? '#F59E0B' : '#8083ff'}` 
                        : '2.5px solid transparent',
                      paddingLeft: isCollapsed ? '12px' : active ? '10px' : '10px',
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        e.currentTarget.classList.add(isAwaitingReview ? 'campaign-hover-awaiting' : 'campaign-hover');
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        e.currentTarget.classList.remove('campaign-hover', 'campaign-hover-awaiting');
                      }
                    }}
                    title={c.name}
                  >
                    {isCollapsed ? (
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <span className={`absolute w-3 h-3 rounded-full ${isAwaitingReview ? 'bg-[#F59E0B]/20' : 'bg-[#8083ff]/20'} animate-ping`} />
                        <span className={`relative w-2 h-2 rounded-full ${isAwaitingReview ? 'bg-[#F59E0B]' : 'bg-[#8083ff]'}`} />
                      </div>
                    ) : (
                      <>
                        <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
                          <span className={`absolute w-3.5 h-3.5 rounded-full ${isAwaitingReview ? 'bg-[#F59E0B]/10' : 'bg-[#8083ff]/10'} ${!isAwaitingReview && 'animate-ping'}`} />
                          <span className={`relative w-1.5 h-1.5 rounded-full ${isAwaitingReview ? 'bg-[#F59E0B]' : 'bg-[#8083ff]'}`} />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="truncate text-xs font-semibold text-[#F1F1F3]">{c.name}</p>
                          <p className="text-[9px] mt-0.5 truncate flex items-center gap-1 font-label-sm uppercase text-text-secondary">
                            {isAwaitingReview ? 'Awaiting Approval' : 'Processing'}
                          </p>
                        </div>
                      </>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── Footer Nav ── */}
      <div
        className="flex-shrink-0 p-4 space-y-1"
        style={{ borderTop: '1px solid #2A2A38' }}
      >
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const content = (
            <>
              <Icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </>
          );
          
          const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all btn-press ${
            isCollapsed && 'justify-center'
          }`;
          
          const style = {
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.02em',
            fontWeight: active ? 700 : 500,
            backgroundColor: active ? '#8083ff' : 'transparent',
            color: active ? '#0d0096' : '#c7c4d7',
            transform: active ? 'translateX(4px)' : 'none',
            transitionDuration: '200ms',
            cursor: 'pointer',
            border: 'none',
            width: '100%',
            textAlign: 'left' as const,
          };
          
          const handleMouseEnter = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
            if (!active) {
              e.currentTarget.classList.add('nav-hover');
            }
          };
          
          const handleMouseLeave = (e: React.MouseEvent<HTMLElement> | React.TouchEvent<HTMLElement>) => {
            if (!active) {
              e.currentTarget.classList.remove('nav-hover');
            }
          };
          
          if (item.isLink) {
            return (
              <Link
                key={item.path}
                to={item.path}
                className={className}
                style={style}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onTouchStart={handleMouseEnter}
                onTouchEnd={handleMouseLeave}
                onTouchCancel={handleMouseLeave}
                title={isCollapsed ? item.name : ''}
              >
                {content}
              </Link>
            );
          }
          return null;
        })}

        <button
          onClick={() => { logout(); navigate('/'); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all bg-transparent hover:bg-[#2a292f] ${
            isCollapsed && 'justify-center'
          }`}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.02em',
            fontWeight: 500,
            color: '#F43F5E',
            border: 'none',
            cursor: 'pointer',
          }}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} className="flex-shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Custom Scrollbar Styles */}
      <style>{`
        .flex-1.overflow-y-auto::-webkit-scrollbar {
          width: 6px;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb {
          background: #2A2A38;
          border-radius: 3px;
        }
        .flex-1.overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: #3A3A48;
        }
        .nav-hover { background-color: #2a292f !important; color: #e4e1e9 !important; }
        .campaign-hover { background-color: rgba(255,255,255,0.02) !important; border-left-color: #8083ff !important; }
        .campaign-hover-awaiting { background-color: rgba(255,255,255,0.02) !important; border-left-color: #F59E0B !important; }
      `}</style>

      {/* ── Desktop Sidebar ── */}
      <nav
        className={`fixed left-0 top-0 h-full flex-col z-50 hidden md:flex transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
        style={{
          backgroundColor: '#0e0e13',
          borderRight: '1px solid #2A2A38',
        }}
      >
        {renderContent(collapsed)}
      </nav>

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div
        className="md:hidden fixed top-0 left-0 h-full z-[70] flex flex-col"
        style={{
          width: 'min(240px, 85vw)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
          backgroundColor: '#0e0e13',
          borderRight: '1px solid #2A2A38',
        }}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center z-10"
          style={{
            color: '#8B8B9E',
            background: 'rgba(14,14,19,0.9)',
            border: '1px solid #2A2A38',
            cursor: 'pointer',
          }}
          aria-label="Close menu"
        >
          <X size={14} />
        </button>
        {renderContent(false)}
      </div>
    </>
  );
};

export default Sidebar;
