import React, { useState } from 'react';
import {
  LayoutDashboard,
  Mail,
  MessageSquare,
  TrendingUp,
  Star,
  StarHalf,
  RocketIcon,
  FolderOpen,
  CheckCircle,
  RefreshCw,
  Eye,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

type StatusTone = 'green' | 'neutral' | 'warning' | 'danger';
type ScoreTone  = 'green' | 'warning' | 'neutral';

type CampaignRow = {
  name:       string;
  icon:       LucideIcon;
  status:     string;
  statusTone: StatusTone;
  score:      string;
  scoreTone:  ScoreTone;
  created:    string;
};

// Mock data with 42 campaigns
const campaigns: CampaignRow[] = Array.from({ length: 42 }, (_, i) => {
  const statuses = ['Running', 'Completed', 'Review Needed', 'Failed'];
  const icons = [LayoutDashboard, Mail, TrendingUp, MessageSquare];
  const statusTones: StatusTone[] = ['green', 'neutral', 'warning', 'danger'];
  
  const statusIdx = i % 4;
  const scoreTone: ScoreTone = statusIdx === 3 ? 'neutral' : (i % 2 === 0 ? 'green' : 'warning');
  
  return {
    name: `Campaign ${i + 1}`,
    icon: icons[i % 4],
    status: statuses[statusIdx],
    statusTone: statusTones[statusIdx],
    score: statusIdx === 3 ? 'N/A' : (8 + Math.random() * 2).toFixed(1),
    scoreTone: scoreTone,
    created: `${Math.floor(Math.random() * 30)} days ago`,
  };
});

const badgeMap: Record<StatusTone, { text: string; dot: string }> = {
  green:   { text: '#4edea3', dot: '#4edea3' },
  neutral: { text: '#8B8B9E', dot: '#8B8B9E' },
  warning: { text: '#F59E0B', dot: '#F59E0B' },
  danger:  { text: '#F43F5E', dot: '#F43F5E' },
};

const scoreMap: Record<ScoreTone, string> = {
  green:   '#4edea3',
  warning: '#F59E0B',
  neutral: '#4A4A5E',
};

function StatCard(props: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  trend?: string;
  trendLabel?: string;
  iconBg: string;
  iconColor: string;
  pulse?: boolean;
}) {
  const { icon: Icon, label, value, trend, trendLabel, iconBg, iconColor, pulse } = props;
  
  return (
    <div
      className="relative overflow-hidden rounded-xl p-4 sm:p-5 group transition-colors"
      style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
    >
      {pulse && (
        <div
          className="absolute top-0 right-0 w-24 h-24 rounded-full"
          style={{ backgroundColor: 'rgba(99,102,241,0.05)', filter: 'blur(40px)' }}
        />
      )}
      <div className="flex justify-between items-start mb-3 sm:mb-4 relative z-10">
        <div className="min-w-0">
          <p
            className="truncate"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '11px',
              lineHeight: '16px',
              letterSpacing: '0.05em',
              fontWeight: 500,
              color: '#4A4A5E',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            {label}
          </p>
          <div
            style={{
              fontFamily: 'Sora, sans-serif',
              fontSize: 'clamp(24px, 4vw, 32px)',
              lineHeight: '1.2',
              letterSpacing: '-0.01em',
              fontWeight: 600,
              color: '#F1F1F3',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            {value}
            {pulse && (
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: '#4edea3',
                  animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite',
                }}
              />
            )}
          </div>
        </div>
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
          style={{ backgroundColor: iconBg }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
      </div>
      {(trend || trendLabel) && (
        <div
          className="flex flex-wrap items-center gap-2 relative z-10"
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '11px',
            lineHeight: '16px',
            letterSpacing: '0.05em',
            fontWeight: 500,
          }}
        >
          {trend && (
            <span className="flex items-center" style={{ color: '#4edea3' }}>
              <TrendingUp size={13} style={{ marginRight: '4px' }} />
              {trend}
            </span>
          )}
          {trendLabel && <span style={{ color: '#4A4A5E' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function DashboardContent() {
  const activeCampaigns = campaigns.filter((c) => c.status === 'Running').length;
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  const totalPages = Math.ceil(campaigns.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, campaigns.length);
  const paginatedCampaigns = campaigns.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  return (
    <>
      <style>{`
        .dashboard-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .dashboard-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(1.1); }
        }
      `}</style>

      <div
        className="min-h-screen overflow-x-hidden"
        style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}
      >
        <Sidebar />
        <TopNav
          title="Dashboard"
          stats={[
            { label: 'active campaigns', value: activeCampaigns, color: '#4edea3' },
          ]}
        />

        <main
          className="dashboard-main pt-14 min-h-screen"
          style={{ fontFamily: 'Sora, sans-serif' }}
        >
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6 md:space-y-8">

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                icon={FolderOpen}
                label="Total Campaigns"
                value="124"
                trend="12%"
                trendLabel="vs last month"
                iconBg="rgba(99,102,241,0.12)"
                iconColor="#6366F1"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed"
                value="98"
                trendLabel="79% completion rate"
                iconBg="rgba(0,165,114,0.12)"
                iconColor="#4edea3"
              />
              <StatCard
                icon={RefreshCw}
                label="Running Now"
                value={<>{activeCampaigns}</>}
                trendLabel="All systems nominal"
                iconBg="rgba(215,119,33,0.12)"
                iconColor="#ffb783"
                pulse
              />
              <StatCard
                icon={Star}
                label="Avg Review Score"
                value="9.2"
                trend="0.4"
                trendLabel="vs last month"
                iconBg="rgba(245,158,11,0.12)"
                iconColor="#F59E0B"
              />
            </div>

            <div
              className="relative rounded-xl overflow-hidden flex flex-col items-center justify-between gap-4 p-6 sm:p-8 lg:flex-row lg:gap-6 lg:p-10"
              style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
            >
              <div
                className="absolute inset-0 z-0"
                style={{
                  background: 'linear-gradient(to right, #1A1A24, #111118)',
                  opacity: 0.8,
                }}
              />
              <div
                className="absolute inset-0 z-0 opacity-50"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.1) 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />
              <div className="relative z-10 text-center lg:text-left flex-1 min-w-0">
                <h2
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    lineHeight: '1.3',
                    fontWeight: 600,
                    color: '#F1F1F3',
                    marginBottom: '8px',
                  }}
                >
                  Ready for your next move?
                </h2>
                <p
                  style={{
                    fontSize: 'clamp(13px, 2vw, 16px)',
                    lineHeight: '24px',
                    color: '#8B8B9E',
                    maxWidth: '560px',
                  }}
                >
                  Launch a new AI-driven marketing campaign. Our agents are primed and ready to execute research, strategy, and copy.
                </p>
              </div>
              <button
                onClick={() => navigate('/campaign/new')}
                className="relative z-10 flex-shrink-0 flex items-center gap-2 transition-all hover:opacity-90"
                style={{
                  backgroundColor: '#6366F1',
                  color: '#F1F1F3',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '14px',
                  letterSpacing: '0.02em',
                  fontWeight: 500,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.3)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                }}
              >
                Start Campaign
                <RocketIcon size={18} />
              </button>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
            >
              <div
                className="p-4 sm:p-5 flex justify-between items-center gap-4"
                style={{ backgroundColor: '#111118', borderBottom: '1px solid #2A2A38' }}
              >
                <h3
                  className="truncate"
                  style={{
                    fontFamily: 'Sora, sans-serif',
                    fontSize: 'clamp(18px, 3vw, 24px)',
                    lineHeight: '32px',
                    fontWeight: 600,
                    color: '#F1F1F3',
                  }}
                >
                  Recent Campaigns
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: 600 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #2A2A38', backgroundColor: '#1b1b20' }}>
                      <th
                        style={{
                          padding: '12px 20px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#4A4A5E',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Campaign Name
                      </th>
                      <th
                        style={{
                          padding: '12px 20px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#4A4A5E',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Status
                      </th>
                      <th
                        style={{
                          padding: '12px 20px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#4A4A5E',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Score
                      </th>
                      <th
                        style={{
                          padding: '12px 20px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#4A4A5E',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        Created
                      </th>
                      <th
                        style={{
                          padding: '12px 20px',
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          lineHeight: '16px',
                          letterSpacing: '0.05em',
                          fontWeight: 500,
                          color: '#4A4A5E',
                          textTransform: 'uppercase',
                          whiteSpace: 'nowrap',
                          textAlign: 'right',
                        }}
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCampaigns.map((row) => {
                      const Icon = row.icon;
                      const badge = badgeMap[row.statusTone];
                      const scorColor = scoreMap[row.scoreTone];
                      const isRunning = row.statusTone === 'green';

                      return (
                        <tr
                          key={row.name}
                          className="group transition-colors"
                          style={{ borderBottom: '1px solid #2A2A38' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#1b1b20')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: '#1A1A24', border: '1px solid #2A2A38', color: '#F1F1F3' }}
                              >
                                <Icon size={16} />
                              </div>
                              <span
                                className="truncate"
                                style={{
                                  fontFamily: 'Sora, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 500,
                                  color: '#F1F1F3',
                                }}
                              >
                                {row.name}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                              style={{
                                backgroundColor: '#1A1A24',
                                border: '1px solid #2A2A38',
                                color: badge.text,
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '12px',
                                letterSpacing: '0.05em',
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor: badge.dot,
                                  animation: isRunning ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite' : 'none',
                                }}
                              />
                              {row.status}
                            </span>
                          </td>

                          <td style={{ padding: '16px 20px' }}>
                            <div className="flex items-center gap-2 whitespace-nowrap" style={{ color: scorColor }}>
                              <span
                                style={{
                                  fontFamily: 'Sora, sans-serif',
                                  fontSize: '14px',
                                  fontWeight: 500,
                                }}
                              >
                                {row.score}
                              </span>
                              {row.scoreTone === 'green'   && <Star     size={14} fill="currentColor" className="flex-shrink-0" />}
                              {row.scoreTone === 'warning' && <StarHalf size={14} className="flex-shrink-0" />}
                            </div>
                          </td>

                          <td
                            className="whitespace-nowrap"
                            style={{
                              padding: '16px 20px',
                              fontFamily: 'Sora, sans-serif',
                              fontSize: '13px',
                              color: '#4A4A5E',
                            }}
                          >
                            {row.created}
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                className="p-1.5 rounded transition-colors"
                                title="View Details"
                                style={{ color: '#8B8B9E', background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = '#F1F1F3';
                                  (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1A24';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                className="p-1.5 rounded transition-colors"
                                title="Delete"
                                style={{ color: '#8B8B9E', background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = '#F43F5E';
                                  (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(244,63,94,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                  (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4"
                style={{ backgroundColor: '#111118', borderTop: '1px solid #2A2A38' }}
              >
                <div
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                    color: '#8B8B9E',
                  }}
                >
                  Showing {startIndex + 1} to {endIndex} of {campaigns.length} campaigns
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                    style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                    title="First"
                  >
                    &lt;&lt;
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
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
                    {currentPage}
                  </div>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                    style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontSize: '12px', fontFamily: 'JetBrains Mono, monospace' }}
                    title="Next"
                  >
                    &gt;
                  </button>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
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
        </main>
      </div>
    </>
  );
}

function DashboardPage() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
}

export default DashboardPage;
