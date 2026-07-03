import React, { useState, useEffect } from 'react';
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
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import { formatDDMonYYYY } from '../../../utils/formatDate';

type ProjectRow = {
  id: string;
  name: string;
  description: string;
  campaignCount: number;
  mostRecentCampaignStatus: string | null;
  updatedAt: string;
  createdAt: string;
};

type DashboardMetrics = {
  totalProjects: number;
  completedCampaigns: number;
  runningCampaigns: number;
  avgReviewScore: number;
  completionRate: number;
  totalReviewedCampaigns?: number;
};

const statusPill: Record<string, { text: string; dot: string }> = {
  'active': { text: '#4edea3', dot: '#4edea3' },
  'reviewing': { text: '#F59E0B', dot: '#F59E0B' },
  'idle': { text: '#8B8B9E', dot: '#8B8B9E' },
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
              color: '#A0A0D2',
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
          {trendLabel && <span style={{ color: '#A0A0D2' }}>{trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

const dashboardStyles = (
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
);

function DashboardContent() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProjects: 0,
    completedCampaigns: 0,
    runningCampaigns: 0,
    avgReviewScore: 0,
    completionRate: 0,
    totalReviewedCampaigns: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchDashboardData = async (silent = false) => {
      try {
        const statsResponse = await api.get('/projects/stats/dashboard');
        if (active) setMetrics(statsResponse.data);
        
        const projectsResponse = await api.get('/projects');
        if (active) setProjects(projectsResponse.data.projects || []);
      } catch (error: any) {
        console.error('Failed to fetch dashboard data:', error);
        if (!silent) {
          toast.error('Failed to load dashboard data');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchDashboardData();

    // Re-fetch stats silently when the window receives focus
    const handleFocus = () => {
      fetchDashboardData(true);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const recentProjects = projects.slice(0, 3);

  if (loading) {
    return (
      <>
        {dashboardStyles}
        <style>{`
          @keyframes skeleton-shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
          .sk { animation: skeleton-shimmer 1.5s ease-in-out infinite; background: #1A1A24; border-radius: 6px; }
        `}</style>
        <div className="min-h-screen overflow-x-hidden" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
          <Sidebar />
          <TopNav title="Dashboard" stats={[]} />
          <main className="dashboard-main pt-14 min-h-screen" style={{ fontFamily: 'Sora, sans-serif' }}>
            <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6 md:space-y-8">
              {/* 4 stat card skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-5" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-2">
                        <div className="sk h-3 w-24 rounded" />
                        <div className="sk h-8 w-16 rounded" />
                      </div>
                      <div className="sk w-10 h-10 rounded-lg" />
                    </div>
                    <div className="sk h-3 w-32 rounded" />
                  </div>
                ))}
              </div>
              {/* CTA banner skeleton */}
              <div className="rounded-xl p-8" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="sk h-6 w-64 rounded mb-3" />
                <div className="sk h-4 w-80 rounded mb-6" />
                <div className="flex gap-3">
                  <div className="sk h-10 w-36 rounded-lg" />
                  <div className="sk h-10 w-32 rounded-lg" />
                </div>
              </div>
              {/* Recent Projects table skeleton */}
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="px-5 py-4 flex justify-between items-center" style={{ borderBottom: '1px solid #2A2A38' }}>
                  <div className="sk h-5 w-36 rounded" />
                  <div className="sk h-4 w-20 rounded" />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <tbody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #1b1b20' }}>
                          <td className="px-5 py-4"><div className="sk h-4 w-36 rounded" /></td>
                          <td className="px-5 py-4"><div className="sk h-4 w-20 rounded-full" /></td>
                          <td className="px-5 py-4"><div className="sk h-4 w-24 rounded" /></td>
                          <td className="px-5 py-4"><div className="sk h-4 w-20 rounded" /></td>
                          <td className="px-5 py-4 text-right"><div className="sk h-7 w-16 rounded-lg ml-auto" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      {dashboardStyles}

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
                trendLabel={metrics.runningCampaigns > 0 ? 'Campaigns currently in progress' : 'No Campaign running'}
                iconBg="rgba(215,119,33,0.12)"
                iconColor="#ffb783"
                pulse={metrics.runningCampaigns > 0}
              />
              <StatCard
                icon={Star}
                label="Avg Review Score"
                value={metrics.avgReviewScore && metrics.avgReviewScore > 0 ? `${metrics.avgReviewScore}/100` : '—'}
                trendLabel={metrics.totalReviewedCampaigns ? `out of ${metrics.totalReviewedCampaigns} campaigns` : 'No reviews yet'}
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
              <div className="relative z-10 flex-shrink-0 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => navigate('/projects')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 transition-all"
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    color: '#F1F1F3',
                    border: '1px solid #2A2A38',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                    letterSpacing: '0.02em',
                    fontWeight: 500,
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(192, 193, 255, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                  }}
                >
                  <FolderOpen size={18} />
                  View Projects
                </button>
                
                <button
                  onClick={() => navigate('/campaign/new')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 transition-all text-white font-medium"
                  style={{
                    backgroundColor: '#6366F1',
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
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.4)';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                  }}
                >
                  <Plus size={18} />
                  Launch Campaign
                </button>
              </div>
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
                <table className="w-full text-left border-collapse" style={{ minWidth: 500 }}>
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
                          color: '#A0A0D2',
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
                          color: '#A0A0D2',
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
                          color: '#A0A0D2',
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
                          color: '#A0A0D2',
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
                          color: '#A0A0D2',
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
                    {recentProjects.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '40px 20px' }}>
                          <div className="flex flex-col items-center justify-center text-center">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                              style={{ backgroundColor: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.1)' }}
                            >
                              <FolderOpen size={20} className="text-[#6366F1]" />
                            </div>
                            <h4 className="text-sm font-semibold mb-1" style={{ color: '#F1F1F3' }}>
                              No recent projects
                            </h4>
                            <p className="text-xs max-w-[280px]" style={{ color: '#8B8B9E', lineHeight: '18px' }}>
                              Create a project to start launching agent-led campaigns.
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recentProjects.map((row) => {
                        const timeAgo = formatDDMonYYYY(new Date(row.updatedAt));
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
                                      color: '#A0A0D2',
                                      marginTop: '2px',
                                    }}
                                  >
                                    {row.description || 'No description'}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td style={{ padding: '16px 20px', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {row.campaignCount || 0}
                            </td>

                            <td style={{ padding: '16px 20px' }}>
                              {row.mostRecentCampaignStatus ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                                  style={{
                                    backgroundColor: '#1A1A24',
                                    border: '1px solid #2A2A38',
                                    color: statusPill[row.mostRecentCampaignStatus]?.text || '#A0A0D2',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '12px',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusPill[row.mostRecentCampaignStatus]?.dot || '#8B8B9E' }} />
                                  {row.mostRecentCampaignStatus.charAt(0).toUpperCase() + row.mostRecentCampaignStatus.slice(1)}
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                                  style={{
                                    backgroundColor: '#1A1A24',
                                    border: '1px solid #2A2A38',
                                    color: '#A0A0D2',
                                    fontFamily: 'JetBrains Mono, monospace',
                                    fontSize: '12px',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#8B8B9E' }} />
                                  No Campaigns
                                </span>
                              )}
                            </td>

                            <td
                              className="whitespace-nowrap"
                              style={{
                                padding: '16px 20px',
                                fontFamily: 'Sora, sans-serif',
                                fontSize: '13px',
                                color: '#A0A0D2',
                              }}
                            >
                              {timeAgo}
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
                      })
                    )}
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
