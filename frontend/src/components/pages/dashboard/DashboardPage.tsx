import React from 'react';
import {
  FolderOpen,
  CheckCircle,
  RefreshCw,
  Star,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  campaignCount: number;
  status: 'Active' | 'Reviewing' | 'Idle';
  updated: string;
};

const projects: ProjectRow[] = [
  {
    id: '1',
    name: 'Nike 2025 Campaign',
    description: 'Complete marketing strategy for Nike Q1 2025 product launches',
    campaignCount: 12,
    status: 'Active',
    updated: '2 days ago',
  },
  {
    id: '2',
    name: 'Adidas Spring Collection',
    description: 'Spring seasonal campaigns and social media strategy',
    campaignCount: 5,
    status: 'Active',
    updated: '1 week ago',
  },
  {
    id: '3',
    name: 'TechGadgets Pro Launch',
    description: 'Product launch campaigns for new tech gadget line',
    campaignCount: 8,
    status: 'Reviewing',
    updated: '3 days ago',
  },
  {
    id: '4',
    name: 'Internal Marketing 2025',
    description: 'Internal company marketing and brand awareness initiatives',
    campaignCount: 15,
    status: 'Active',
    updated: '5 hours ago',
  },
];

const metrics = {
  totalProjects: projects.length,
  completedCampaigns: 98,
  runningCampaigns: 11,
  avgReviewScore: 9.2,
  completionRate: 79,
};

const recentProjects = projects.slice(0, 3);

const statusPill: Record<ProjectRow['status'], { text: string; dot: string }> = {
  Active: { text: '#4edea3', dot: '#4edea3' },
  Reviewing: { text: '#F59E0B', dot: '#F59E0B' },
  Idle: { text: '#8B8B9E', dot: '#8B8B9E' },
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
  const navigate = useNavigate();

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

      <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav
          title="Dashboard"
          stats={[{ label: 'active campaigns', value: metrics.runningCampaigns, color: '#4edea3' }]}
        />

        <main className="dashboard-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6 md:space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              <StatCard
                icon={FolderOpen}
                label="Total Projects"
                value={metrics.totalProjects}
                trendLabel="workspace overview"
                iconBg="rgba(99,102,241,0.12)"
                iconColor="#6366F1"
              />
              <StatCard
                icon={CheckCircle}
                label="Completed Campaigns"
                value={metrics.completedCampaigns}
                trendLabel={`${metrics.completionRate}% campaign completion rate`}
                iconBg="rgba(0,165,114,0.12)"
                iconColor="#4edea3"
              />
              <StatCard
                icon={RefreshCw}
                label="Running Campaigns"
                value={metrics.runningCampaigns}
                trendLabel="Campaigns currently in progress"
                iconBg="rgba(215,119,33,0.12)"
                iconColor="#ffb783"
                pulse
              />
              <StatCard
                icon={Star}
                label="Avg Review Score"
                value={metrics.avgReviewScore}
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
                  Ready to start a new project?
                </h2>
                <p
                  style={{
                    fontSize: 'clamp(13px, 2vw, 16px)',
                    lineHeight: '24px',
                    color: '#8B8B9E',
                    maxWidth: '560px',
                  }}
                >
                  Create a project first, then group campaigns underneath it for clearer ownership and reporting.
                </p>
              </div>
              <button
                onClick={() => navigate('/projects')}
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
                <FolderOpen size={18} />
                View Projects
              </button>
            </div>

            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
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
                  Recent Projects
                </h3>
                <button
                  onClick={() => navigate('/projects')}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all"
                  style={{
                    borderColor: '#2A2A38',
                    color: '#F1F1F3',
                    backgroundColor: '#131318',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                >
                  View All
                  <ArrowRight size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" style={{ minWidth: 700 }}>
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
                        Project Name
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
                        Campaigns
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
                        Updated
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
                        Open
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentProjects.map((row) => {
                      const badge = statusPill[row.status];
                      return (
                        <tr
                          key={row.id}
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
                                <FolderOpen size={16} />
                              </div>
                              <div className="min-w-0">
                                <span
                                  className="truncate block"
                                  style={{
                                    fontFamily: 'Sora, sans-serif',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    color: '#F1F1F3',
                                  }}
                                >
                                  {row.name}
                                </span>
                                <span
                                  className="truncate block"
                                  style={{
                                    fontFamily: 'Sora, sans-serif',
                                    fontSize: '12px',
                                    color: '#4A4A5E',
                                    marginTop: '2px',
                                  }}
                                >
                                  {row.description}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '16px 20px', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                            {row.campaignCount}
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
                              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: badge.dot }} />
                              {row.status}
                            </span>
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
                            {row.updated}
                          </td>

                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <button
                              onClick={() => navigate(`/projects/${row.id}`)}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg transition-colors"
                              style={{
                                backgroundColor: '#1A1A24',
                                color: '#F1F1F3',
                                border: '1px solid #2A2A38',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: '12px',
                              }}
                            >
                              Open
                              <ArrowRight size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4" style={{ backgroundColor: '#111118', borderTop: '1px solid #2A2A38' }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8B8B9E' }}>
                  Showing {recentProjects.length} of {projects.length} projects
                </div>
                <button
                  onClick={() => navigate('/projects')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
                  style={{
                    borderColor: '#2A2A38',
                    backgroundColor: '#131318',
                    color: '#F1F1F3',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '12px',
                  }}
                >
                  <Plus size={14} />
                  Manage Projects
                </button>
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
