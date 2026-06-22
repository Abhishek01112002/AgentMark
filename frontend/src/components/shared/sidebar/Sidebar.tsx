// Sidebar.tsx
import React, { useState, createContext, useContext, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Plus, History,
  Settings, HelpCircle, LogOut,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

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

  const isActive = (path: string) => {
    if (path === '/campaign/new') {
      return location.pathname.startsWith('/campaign');
    }
    if (path === '/projects') {
      return location.pathname.startsWith('/projects');
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
              src="/Novateches.png"
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
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex w-full items-center justify-center p-2 rounded-lg transition-colors mt-2"
          style={{
            backgroundColor: 'transparent',
            color: '#4A4A5E',
            border: '1px solid #2A2A38',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#2a292f';
            (e.currentTarget as HTMLElement).style.color = '#c0c1ff';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            (e.currentTarget as HTMLElement).style.color = '#4A4A5E';
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
          
          const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
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
          
          const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#2a292f';
              (e.currentTarget as HTMLElement).style.color = '#e4e1e9';
            }
          };
          
          const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#c7c4d7';
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
                title={isCollapsed ? item.name : ''}
              >
                {content}
              </Link>
            );
          }
          return null;
        })}
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
          
          const className = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
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
          
          const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = '#2a292f';
              (e.currentTarget as HTMLElement).style.color = '#e4e1e9';
            }
          };
          
          const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
            if (!active) {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#c7c4d7';
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
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
            isCollapsed && 'justify-center'
          }`}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            lineHeight: '20px',
            letterSpacing: '0.02em',
            fontWeight: 500,
            color: '#F43F5E',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#2a292f';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
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
          width: '240px',
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
