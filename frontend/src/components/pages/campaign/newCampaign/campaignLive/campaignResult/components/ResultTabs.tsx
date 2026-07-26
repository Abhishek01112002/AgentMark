import React from 'react';
import { FileText, Compass, PenTool, Image as ImageIcon, CheckSquare, Send, LayoutDashboard, Users } from 'lucide-react';
import { useCampaignResultContext } from '../context/CampaignResultContext';
import { Tab } from '../types';

export const tabs: Tab[] = [
  { id: 'overview',     label: 'Overview',     icon: LayoutDashboard },
  { id: 'research',    label: 'Research',     icon: FileText },
  { id: 'strategy',    label: 'Strategy',     icon: Compass },
  { id: 'copy',        label: 'Copy',         icon: PenTool },
  { id: 'images',      label: 'Images',       icon: ImageIcon },
  { id: 'review',      label: 'Review',       icon: CheckSquare },
  { id: 'published',   label: 'Publishing',   icon: Send },
  { id: 'focus-group', label: 'Focus Group',  icon: Users },
];

export const ResultTabs: React.FC = React.memo(() => {
  const {
    activeTab,
    setActiveTab,
    focusGroupUpdatedViaMcp,
    setFocusGroupUpdatedViaMcp,
    isTabCompleted,
  } = useCampaignResultContext();

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] overflow-x-auto">
      <div className="flex items-center gap-1 w-full min-w-max sm:min-w-0">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isCompleted = isTabCompleted(tab.id);
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'focus-group') setFocusGroupUpdatedViaMcp(false);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-sora font-semibold transition-all border cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#6366F1] text-white shadow-sm border-[#818CF8]/30'
                  : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.05] border-transparent'
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{tab.label}</span>
              {tab.id === 'focus-group' && focusGroupUpdatedViaMcp && activeTab !== 'focus-group' ? (
                <span className="w-2 h-2 rounded-full bg-[#6366F1] animate-pulse shadow-[0_0_8px_rgba(99,102,241,0.6)] flex-shrink-0" />
              ) : (
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                  isCompleted ? (isActive ? 'bg-emerald-300' : 'bg-emerald-400') : 'bg-white/10'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

