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
      <div className={`flex-shrink-0 p-4 ${isCollapsed ? 'mb-2' : 'mb-3'}`}>
        {/* Brand */}
        <button
          onClick={() => navigate('/')}
          className={`px-2 py-1.5 flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''} w-full bg-transparent border-none cursor-pointer group transition-all`}
        >
          <div className="flex items-center justify-center flex-shrink-0 w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 group-hover:border-[#6366F1]/50 transition-all">
            <img
              src="/novateches.png"
              alt="AgentMark"
              className="w-6 h-6 object-contain"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement;
                el.style.display = 'none';
                const parent = el.parentElement;
                if (parent) {
                  parent.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818CF8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
                }
              }}
            />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden text-left">
              <div className="text-sm font-semibold font-sora text-white tracking-tight leading-tight">
                AgentMark
              </div>
              <div className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider mt-0.5">
                Marketing OS
              </div>
            </div>
          )}
        </button>

        {/* Toggle Button - Desktop only */}
        <button
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center p-2 rounded-xl transition-all mt-3 bg-white/5 hover:bg-white/10 text-[#94A3B8] hover:text-white border border-white/10 cursor-pointer"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── Section Label ── */}
      {!isCollapsed && (
        <div className="px-5 mb-2">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#64748B]">
            MAIN MENU
          </span>
        </div>
      )}

      {/* ── Main Nav - Scrollable ── */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-sora font-semibold transition-all cursor-pointer border ${
            isCollapsed ? 'justify-center' : ''
          } ${
            active
              ? 'bg-[#6366F1] text-white shadow-sm border-[#818CF8]/30'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05] border-transparent'
          }`;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={className}
              title={isCollapsed ? item.name : ''}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap truncate">{item.name}</span>}
            </Link>
          );
        })}

        {/* Active Campaigns list */}
        {activeCampaigns.length > 0 && (
          <div className="mt-5 pt-3 border-t border-white/[0.06] space-y-1">
            {!isCollapsed && (
              <div className="flex items-center justify-between px-2 mb-2">
                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8] flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active Runs
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold font-mono">
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
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-sora transition-all border ${
                      isCollapsed ? 'justify-center' : ''
                    } ${
                      active
                        ? 'bg-white/[0.08] text-white border-white/20'
                        : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04] border-transparent'
                    }`}
                    title={c.name}
                  >
                    {isCollapsed ? (
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <span className={`absolute w-3 h-3 rounded-full ${isAwaitingReview ? 'bg-amber-400/20' : 'bg-[#6366F1]/20'} animate-ping`} />
                        <span className={`relative w-2 h-2 rounded-full ${isAwaitingReview ? 'bg-amber-400' : 'bg-[#6366F1]'}`} />
                      </div>
                    ) : (
                      <>
                        <div className="relative flex items-center justify-center w-3 h-3 flex-shrink-0">
                          <span className={`absolute w-3.5 h-3.5 rounded-full ${isAwaitingReview ? 'bg-amber-400/20' : 'bg-[#6366F1]/20'} animate-ping`} />
                          <span className={`relative w-1.5 h-1.5 rounded-full ${isAwaitingReview ? 'bg-amber-400' : 'bg-[#6366F1]'}`} />
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="truncate text-xs font-semibold text-white">{c.name}</p>
                          <p className="text-[9px] font-mono text-[#94A3B8] truncate uppercase mt-0.5">
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
      <div className="flex-shrink-0 p-3 space-y-1 border-t border-white/[0.08]">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          const className = `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-sora font-semibold transition-all cursor-pointer border ${
            isCollapsed ? 'justify-center' : ''
          } ${
            active
              ? 'bg-[#6366F1] text-white shadow-sm border-[#818CF8]/30'
              : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05] border-transparent'
          }`;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={className}
              title={isCollapsed ? item.name : ''}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!isCollapsed && <span className="whitespace-nowrap truncate">{item.name}</span>}
            </Link>
          );
        })}

        <button
          onClick={() => { logout(); navigate('/'); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-sora font-semibold transition-all text-[#FDA4AF] hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 cursor-pointer ${
            isCollapsed ? 'justify-center' : ''
          }`}
          title={isCollapsed ? 'Logout' : ''}
        >
          <LogOut size={18} className="flex-shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap truncate">Logout</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <nav
        className={`fixed left-0 top-0 h-full flex-col z-50 hidden md:flex transition-all duration-300 bg-[#0D0D14]/95 border-r border-white/[0.08] backdrop-blur-2xl shadow-[5px_0_30px_rgba(0,0,0,0.4)] ${
          collapsed ? 'w-[72px]' : 'w-[240px]'
        }`}
      >
        {renderContent(collapsed)}
      </nav>

      {/* ── Mobile Backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div
        className="md:hidden fixed top-0 left-0 h-full z-[70] flex flex-col bg-[#0D0D14]/98 border-r border-white/[0.08] backdrop-blur-2xl transition-transform duration-300 ease-out"
        style={{
          width: 'min(240px, 85vw)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
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
