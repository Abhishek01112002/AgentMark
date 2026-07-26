import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { User, Bell, Key, Link2 } from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import Profile from './profile/Profile';
import Notifications from './notifications/Notifications';
import ApiKeys from './apiKeys/ApiKeys';
import Integrations from './integrations/Integrations';

const SettingsContent: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api' | 'integrations'>('profile');

  // Handle navigation from other pages (e.g., "View all activity" from TopNav)
  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab === 'notifications') {
      setActiveTab('notifications');
    } else if (state?.tab === 'integrations') {
      setActiveTab('integrations');
    }
  }, [location.state]);

  const tabs = [
    { id: 'profile' as const, icon: User, label: 'Profile' },
    { id: 'notifications' as const, icon: Bell, label: 'Notifications' },
    { id: 'api' as const, icon: Key, label: 'API Keys' },
    { id: 'integrations' as const, icon: Link2, label: 'Integrations' },
  ];

  return (
    <>
      <style>{`
        .settings-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .settings-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Settings" />

        <main className="settings-main pt-14 min-h-screen fade-in" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="space-y-8">
              {/* Apple Pro Header Card */}
              <header className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight font-sora text-white mb-1.5">
                  Account & System Settings
                </h1>
                <p className="text-xs sm:text-sm text-[#94A3B8] font-sans">
                  Manage user profiles, notifications, LLM API key failovers, and Claude Desktop MCP integrations
                </p>
              </header>

              {/* Apple Segmented Control Navigation Bar */}
              <div className="flex items-center gap-1 p-1.5 bg-[#0D0D14] rounded-2xl border border-[#262636] overflow-x-auto w-fit">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-sora transition-all duration-200 cursor-pointer border-none whitespace-nowrap ${
                        isActive
                          ? 'bg-[#6366F1] text-white shadow-sm font-semibold'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-white' : 'text-[#94A3B8]'} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content */}
              <div className="space-y-8">
                {activeTab === 'profile' && <Profile />}
                {activeTab === 'notifications' && <Notifications />}
                {activeTab === 'api' && <ApiKeys />}
                {activeTab === 'integrations' && <Integrations />}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

function Settings() {
  return (
    <SidebarProvider>
      <SettingsContent />
    </SidebarProvider>
  );
}

export default Settings;
