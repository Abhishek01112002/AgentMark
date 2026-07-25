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
              <div className="flex gap-1.5 p-1.5 bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl w-fit overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm transition-all relative whitespace-nowrap rounded-lg ${
                        activeTab === tab.id
                          ? 'bg-gradient-to-r from-[#6366F1]/20 to-[#8B5CF6]/10 text-[#C7D2FE] shadow-[0_0_20px_rgba(99,102,241,0.1)] border border-[#6366F1]/25'
                          : 'text-[#8B8B9E] hover:text-[#F1F1F3] hover:bg-[#1A1A24]'
                      }`}
                      style={{ fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      <Icon size={16} className={activeTab === tab.id ? 'text-[#818CF8]' : ''} />
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
