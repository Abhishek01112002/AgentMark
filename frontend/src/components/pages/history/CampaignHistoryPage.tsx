import React, { useState } from 'react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

interface Campaign {
  id: string;
  name: string;
  projectName: string;
  status: 'running' | 'completed' | 'failed';
  score: number | null;
  agents: Agent[];
  duration: string;
  created: string;
  icon: string;
}

interface Agent {
  name: string;
  status: 'complete' | 'in-progress' | 'pending' | 'error';
}

// Mock data with 42 campaigns
const mockProjects = ['Nike 2025 Campaign', 'Adidas Spring Collection', 'TechGadgets Pro Launch', 'Internal Marketing 2025'];

const campaigns: Campaign[] = Array.from({ length: 42 }, (_, i) => {
  const statuses: Array<Campaign['status']> = ['running', 'completed', 'failed'];
  const icons = ['rocket_launch', 'mail', 'campaign'];
  
  return {
    id: `${i + 1}`,
    name: `Campaign ${i + 1}`,
    projectName: mockProjects[i % mockProjects.length],
    status: statuses[i % 3],
    score: statuses[i % 3] === 'failed' ? null : 85 + Math.random() * 15,
    agents: [
      { name: 'Research', status: 'complete' },
      { name: 'Strategy', status: 'complete' },
      { name: 'Copywriting', status: i % 3 === 0 ? 'complete' : 'in-progress' },
      { name: 'Design', status: i % 3 === 0 ? 'complete' : 'pending' },
      { name: 'Review', status: i % 3 === 2 ? 'error' : 'pending' },
      { name: 'Distribution', status: 'pending' },
      { name: 'Analytics', status: 'pending' },
    ],
    duration: `${Math.floor(Math.random() * 10)}d ${Math.floor(Math.random() * 24)}h`,
    created: `${Math.floor(Math.random() * 60)} days ago`,
    icon: icons[i % 3],
  };
});

const CampaignHistoryContent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCampaigns.length);
  const paginatedCampaigns = filteredCampaigns.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const getStatusBadge = (status: Campaign['status']) => {
    const styles = {
      running: {
        bg: 'bg-secondary/10',
        border: 'border-secondary/20',
        text: 'text-secondary',
        dot: 'bg-secondary pulse-dot',
      },
      completed: {
        bg: 'bg-surface-container-high',
        border: 'border-border-base',
        text: 'text-text-secondary',
        dot: 'bg-text-secondary',
      },
      failed: {
        bg: 'bg-danger/10',
        border: 'border-danger/20',
        text: 'text-danger',
        dot: 'bg-danger',
      },
    };

    const style = styles[status];

    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm ${style.bg} border ${style.border} ${style.text}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const getAgentBar = (agents: Agent[]) => {
    return (
      <div className="flex gap-1">
        {agents.map((agent, idx) => {
          const colors = {
            complete: 'bg-secondary',
            'in-progress': 'bg-primary pulse-dot',
            error: 'bg-danger',
            pending: 'bg-border-base',
          };
          return (
            <div
              key={idx}
              className={`w-1.5 h-4 rounded-full ${colors[agent.status]}`}
              title={`${agent.name}: ${agent.status}`}
            />
          );
        })}
      </div>
    );
  };

  const getCampaignIcon = (campaign: Campaign) => {
    const iconColors = {
      running: { bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-primary' },
      completed: { bg: 'bg-surface-container-high', border: 'border-border-base', text: 'text-text-secondary' },
      failed: { bg: 'bg-danger/10', border: 'border-danger/20', text: 'text-danger' },
    };
    const colors = iconColors[campaign.status];

    return (
      <div className={`w-8 h-8 rounded ${colors.bg} flex items-center justify-center border ${colors.border}`}>
        <span className={`material-symbols-outlined ${colors.text} text-sm`}>{campaign.icon}</span>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500&family=Sora:wght@400;600;700&display=swap');
        
        .pulse-dot {
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 4px rgba(99, 102, 241, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .history-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .history-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
        <Sidebar />
        <TopNav title="Campaign History" />

        <main className="history-main pt-14">
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div className="space-y-8">
              <header>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Past Campaigns & Activity
                </h2>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  Review and analyze past and currently active marketing initiatives.
                </p>
              </header>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">
                        search
                      </span>
                      <input
                        className="w-full bg-surface border border-border-base rounded text-text-primary font-body-sm text-sm py-2 pl-10 pr-3 focus:outline-none focus:border-[#6366F1] transition-colors placeholder:text-text-muted"
                        placeholder="Search campaigns..."
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                      />
                    </div>
                    <button className="bg-surface border border-border-base rounded px-3 py-2 flex items-center justify-center hover:bg-elevated transition-colors">
                      <span className="material-symbols-outlined text-text-secondary">filter_list</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap transition-colors ${
                      statusFilter === 'all'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-surface border border-border-base text-text-secondary hover:bg-elevated'
                    }`}
                  >
                    All Campaigns
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('running');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
                      statusFilter === 'running'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-surface border border-border-base text-text-secondary hover:bg-elevated'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" /> Running
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('completed');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
                      statusFilter === 'completed'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-surface border border-border-base text-text-secondary hover:bg-elevated'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-text-secondary" /> Completed
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter('failed');
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-1.5 rounded-full font-label-sm text-xs whitespace-nowrap flex items-center gap-2 transition-colors ${
                      statusFilter === 'failed'
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'bg-surface border border-border-base text-text-secondary hover:bg-elevated'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-danger" /> Failed
                  </button>
                </div>

                <div className="rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border-base bg-elevated/50 font-label-sm text-xs text-text-muted">
                          <th className="py-4 px-6 font-medium tracking-wider">CAMPAIGN</th>
                          <th className="py-4 px-6 font-medium tracking-wider">STATUS</th>
                          <th className="py-4 px-6 font-medium tracking-wider">SCORE</th>
                          <th className="py-4 px-6 font-medium tracking-wider">AGENTS</th>
                          <th className="py-4 px-6 font-medium tracking-wider">DURATION</th>
                          <th className="py-4 px-6 font-medium tracking-wider">CREATED</th>
                          <th className="py-4 px-6 font-medium tracking-wider text-right">ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody className="font-body-sm text-sm">
                        {paginatedCampaigns.map((campaign) => (
                          <tr
                            key={campaign.id}
                            className="border-b border-border-base/50 hover:bg-elevated/30 transition-colors group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {getCampaignIcon(campaign)}
                                <div>
                                  <div className="text-text-primary font-medium">{campaign.name}</div>
                                  <div className="text-text-muted text-xs mt-0.5">{campaign.projectName}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-6">{getStatusBadge(campaign.status)}</td>
                            <td className="py-4 px-6">
                              <div
                                className={`font-label-md text-sm ${
                                  campaign.status === 'failed' ? 'text-danger' : campaign.status === 'running' ? 'text-secondary' : 'text-text-primary'
                                }`}
                              >
                                {campaign.score ? campaign.score.toFixed(1) : '--'}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className={campaign.status === 'completed' ? 'opacity-60' : ''}>
                                {getAgentBar(campaign.agents)}
                              </div>
                            </td>
                            <td className="py-4 px-6 text-text-secondary">{campaign.duration}</td>
                            <td className="py-4 px-6 text-text-secondary">{campaign.created}</td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2 transition-opacity">
                                <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                </button>
                                <button className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                                  <span className="material-symbols-outlined text-sm">download</span>
                                </button>
                                <button className="p-1.5 text-text-muted hover:text-danger transition-colors">
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t"
                    style={{ backgroundColor: '#111118', borderColor: '#2A2A38' }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8B8B9E' }}>
                      Showing {paginatedCampaigns.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredCampaigns.length} campaigns
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || totalPages === 0}
                        className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                        title="First"
                      >
                        &lt;&lt;
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || totalPages === 0}
                        className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Previous"
                      >
                        &lt;
                      </button>

                      <div
                        className="px-3 py-1 rounded border"
                        style={{ backgroundColor: '#1A1A24', borderColor: '#2A2A38', color: '#F1F1F3', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {totalPages === 0 ? 0 : currentPage}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Next"
                      >
                        &gt;
                      </button>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Last"
                      >
                        &gt;&gt;
                      </button>
                    </div>

                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="px-3 py-1 rounded border text-sm cursor-pointer"
                      style={{
                        backgroundColor: '#111118',
                        borderColor: '#2A2A38',
                        color: '#8B8B9E',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontSize: '12px',
                      }}
                    >
                      <option value={5}>5 per page</option>
                      <option value={10}>10 per page</option>
                      <option value={25}>25 per page</option>
                      <option value={50}>50 per page</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

const CampaignHistory: React.FC = () => (
  <SidebarProvider>
    <CampaignHistoryContent />
  </SidebarProvider>
);

export default CampaignHistory;
