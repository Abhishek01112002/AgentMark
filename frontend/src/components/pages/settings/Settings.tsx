import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import Profile from './profile/Profile';
import Notifications from './notifications/Notifications';
import ApiKeys from './apiKeys/ApiKeys';

const SettingsContent: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'api'>('profile');

  // Handle navigation from other pages (e.g., "View all activity" from TopNav)
  useEffect(() => {
    const state = location.state as { tab?: string } | null;
    if (state?.tab === 'notifications') {
      setActiveTab('notifications');
    }
  }, [location.state]);

  const tabs = [
    { id: 'profile' as const, icon: 'person', label: 'Profile' },
    { id: 'notifications' as const, icon: 'notifications', label: 'Notifications' },
    { id: 'api' as const, icon: 'vpn_key', label: 'API Keys' },
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

        <main className="settings-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="space-y-8">
              {/* Header */}
              <header>
                <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Account & Preferences
                </h1>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  Manage your account preferences and integrations.
                </p>
              </header>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-[#2A2A38] overflow-x-auto">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all relative whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'text-[#c0c1ff]'
                        : 'text-[#8B8B9E] hover:text-[#F1F1F3]'
                    }`}
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#c0c1ff]" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="space-y-8">
                {activeTab === 'profile' && <Profile />}
                {activeTab === 'notifications' && <Notifications />}
                {activeTab === 'api' && <ApiKeys />}
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
