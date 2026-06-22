import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Eye,
  Trash2,
  FolderOpen,
  LayoutDashboard,
  Mail,
  MessageSquare,
  TrendingUp,
  Star,
  StarHalf,
} from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import DeleteCampaignModal from './DeleteCampaignModal';

type StatusTone = 'green' | 'neutral' | 'warning' | 'danger';
type ScoreTone = 'green' | 'warning' | 'neutral';

interface Campaign {
  id: string;
  name: string;
  icon: any;
  status: string;
  statusTone: StatusTone;
  score: string;
  scoreTone: ScoreTone;
  created: string;
}

// Mock project data
const mockProject = {
  id: '1',
  name: 'Nike 2025 Campaign',
  description: 'Complete marketing strategy for Nike Q1 2025 product launches',
  created: '3 months ago',
};

// Mock campaigns for this project
const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Summer Launch',
    icon: LayoutDashboard,
    status: 'Completed',
    statusTone: 'neutral',
    score: '9.2',
    scoreTone: 'green',
    created: '10 days ago',
  },
  {
    id: '2',
    name: 'Instagram Push',
    icon: Mail,
    status: 'Running',
    statusTone: 'green',
    score: 'N/A',
    scoreTone: 'neutral',
    created: '2 days ago',
  },
  {
    id: '3',
    name: 'Email Series',
    icon: MessageSquare,
    status: 'Review Needed',
    statusTone: 'warning',
    score: '8.5',
    scoreTone: 'warning',
    created: '5 days ago',
  },
  {
    id: '4',
    name: 'Social Media Ads',
    icon: TrendingUp,
    status: 'Completed',
    statusTone: 'neutral',
    score: '9.5',
    scoreTone: 'green',
    created: '15 days ago',
  },
];

const badgeMap: Record<StatusTone, { text: string; dot: string }> = {
  green: { text: '#4edea3', dot: '#4edea3' },
  neutral: { text: '#8B8B9E', dot: '#8B8B9E' },
  warning: { text: '#F59E0B', dot: '#F59E0B' },
  danger: { text: '#F43F5E', dot: '#F43F5E' },
};

const scoreMap: Record<ScoreTone, string> = {
  green: '#4edea3',
  warning: '#F59E0B',
  neutral: '#4A4A5E',
};

const ProjectDetailContent: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; campaign: Campaign | null }>({ show: false, campaign: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const project = mockProject;

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

  const handleDeleteClick = (campaign: Campaign) => {
    setDeleteModal({ show: true, campaign });
  };

  const handleDeleteConfirm = () => {
    if (deleteModal.campaign) {
      setCampaigns(campaigns.filter((c) => c.id !== deleteModal.campaign!.id));
      setDeleteModal({ show: false, campaign: null });
    }
  };

  return (
    <>
      <style>{`
        .project-detail-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .project-detail-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(1.1); }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav
          title={project.name}
          stats={[{ label: 'campaigns', value: campaigns.length, color: '#6366F1' }]}
        />

        <main className="project-detail-main pt-14" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
            
            {/* Back Button */}
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F1F1F3')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#8B8B9E')}
            >
              <ArrowLeft size={16} />
              Back to Projects
            </button>

            {/* Project Header */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <FolderOpen size={32} style={{ color: '#6366F1' }} />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ color: '#F1F1F3' }}>
                      {project.name}
                    </h1>
                    <p className="text-sm mb-3" style={{ color: '#8B8B9E' }}>
                      {project.description}
                    </p>
                    <div
                      className="text-xs"
                      style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      Created {project.created}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => navigate(`/campaign/new?projectId=${id}`)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: '#6366F1',
                    color: '#F1F1F3',
                    fontFamily: 'JetBrains Mono, monospace',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <Plus size={16} />
                  New Campaign
                </button>
              </div>
            </div>

            {/* Campaigns Section */}
            <div>
              <h2
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
              >
                <LayoutDashboard size={18} style={{ color: '#6366F1' }} />
                Campaigns ({campaigns.length})
              </h2>

              {campaigns.length === 0 ? (
                <div
                  className="rounded-xl p-12 text-center"
                  style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
                >
                  <LayoutDashboard size={48} className="mx-auto mb-4" style={{ color: '#2A2A38' }} />
                  <h3 className="text-[15px] font-medium mb-2" style={{ color: '#4A4A5E' }}>
                    No campaigns yet
                  </h3>
                  <p className="text-[13px] mb-6" style={{ color: '#4A4A5E' }}>
                    Create your first campaign in this project
                  </p>
                  <button
                    onClick={() => navigate(`/campaign/new?projectId=${id}`)}
                    className="bg-[#6366F1] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#8083ff] transition"
                  >
                    Create Campaign
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
                >
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
                              key={row.id}
                              className="group transition-colors"
                              style={{ borderBottom: '1px solid #2A2A38' }}
                              onMouseEnter={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = '#1b1b20')
                              }
                              onMouseLeave={(e) =>
                                ((e.currentTarget as HTMLElement).style.backgroundColor = 'transparent')
                              }
                            >
                              <td style={{ padding: '16px 20px' }}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: '#1A1A24',
                                      border: '1px solid #2A2A38',
                                      color: '#F1F1F3',
                                    }}
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
                                      animation: isRunning
                                        ? 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite'
                                        : 'none',
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
                                  {row.scoreTone === 'green' && <Star size={14} fill="currentColor" className="flex-shrink-0" />}
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
                                    onClick={() => handleDeleteClick(row)}
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

                  {/* Pagination */}
                  <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t"
                    style={{ backgroundColor: '#111118', borderColor: '#2A2A38' }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8B8B9E' }}>
                      Showing {paginatedCampaigns.length === 0 ? 0 : startIndex + 1} to {endIndex} of {campaigns.length} campaigns
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
              )}
            </div>
          </div>
        </main>
      </div>

      {deleteModal.show && deleteModal.campaign && (
        <DeleteCampaignModal
          campaignName={deleteModal.campaign.name}
          onClose={() => setDeleteModal({ show: false, campaign: null })}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
};

const ProjectDetailPage: React.FC = () => (
  <SidebarProvider>
    <ProjectDetailContent />
  </SidebarProvider>
);

export default ProjectDetailPage;
