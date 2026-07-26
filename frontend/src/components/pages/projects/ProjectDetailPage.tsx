import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Eye,
  Trash2,
  Edit3,
  FolderOpen,
  LayoutDashboard,
  Star,
  StarHalf,
  Brain,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import DeleteCampaignModal from './DeleteCampaignModal';
import RenameProjectModal from './RenameProjectModal';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { formatDDMonYYYY } from '../../../utils/formatDate';

type StatusTone = 'green' | 'neutral' | 'warning' | 'danger';
type ScoreTone = 'green' | 'warning' | 'neutral';

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  reviewScore?: number | null;
  aiOutputs?: any;
  createdAt: string;
}

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
  const location = useLocation();
  const initialProject = (location.state as { project?: Project })?.project || null;
  const [project, setProject] = useState<Project | null>(initialProject);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(!initialProject);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; campaign: Campaign | null }>({ show: false, campaign: null });
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalCampaigns, setTotalCampaigns] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const fetchCampaigns = async (page: number, limit: number, signal?: AbortSignal) => {
    if (!id) return;
    setCampaignsLoading(true);
    try {
      const response = await api.get(`/campaigns?projectId=${id}&page=${page}&limit=${limit}`, { signal });
      setCampaigns(response.data.campaigns || []);
      setTotalCampaigns(response.data.pagination?.total || 0);
      setTotalPages(response.data.pagination?.totalPages || 1);
    } catch (error: any) {
      if (error?.name !== 'AbortError' && error?.code !== 'ERR_CANCELED') {
        console.error('Failed to fetch campaigns:', error);
        toast.error(error.response?.data?.message || 'Failed to load campaigns');
      }
    } finally {
      if (!signal?.aborted) {
        setCampaignsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchProjectData = async () => {
      if (!id) return;
      
      try {
        if (!initialProject) setLoading(true);
        const projectResponse = await api.get(`/projects/${id}`, { signal: controller.signal });
        if (projectResponse.data?.project) {
          setProject(projectResponse.data.project);
        }
      } catch (error: any) {
        if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch project data:', error);
          toast.error(error.response?.data?.message || 'Failed to load project data');
          
          if (error.response?.status === 404) {
            setProject(null);
            setTimeout(() => navigate('/projects'), 2000);
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    
    fetchProjectData();
    
    return () => controller.abort();
  }, [id, navigate]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetchCampaigns(currentPage, itemsPerPage, controller.signal);
    return () => controller.abort();
  }, [id, currentPage, itemsPerPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + campaigns.length;

  // Sort by createdAt; index (#) is always based on original creation order (asc)
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortOrder === 'asc' ? diff : -diff;
  });

  // Global sequence number based on absolute creation order across all pages
  const getSeqNumber = (campaign: Campaign) => {
    const allSortedAsc = [...campaigns].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    return startIndex + allSortedAsc.findIndex(c => c.id === campaign.id) + 1;
  };

  const getStatusTone = (status: string): StatusTone => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'neutral';
      case 'processing':
      case 'running':
        return 'green';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  };

  const getScoreTone = (score?: number | null): ScoreTone => {
    if (!score) return 'neutral';
    if (score >= 8) return 'green';
    if (score >= 6) return 'warning';
    return 'neutral';
  };

  const formatDate = (dateString: string) => {
    return formatDDMonYYYY(new Date(dateString));
  };

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

  const handleDeleteConfirm = async () => {
    if (deleteModal.campaign && id) {
      try {
        await api.delete(`/campaigns/${deleteModal.campaign.id}?projectId=${id}`);
        const nextTotal = Math.max(0, totalCampaigns - 1);
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / itemsPerPage));
        const nextPage = Math.min(currentPage, nextTotalPages);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
        toast.success('Campaign deleted successfully');
        setDeleteModal({ show: false, campaign: null });
        setTotalCampaigns(nextTotal);
        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        } else {
          void fetchCampaigns(nextPage, itemsPerPage);
        }
      } catch (error: any) {
        console.error('Failed to delete campaign:', error);
        toast.error(error.response?.data?.message || 'Failed to delete campaign');
      }
    }
  };

  const handleRenameConfirm = async (newName: string) => {
    if (!id) return;
    const toastId = toast.loading('Renaming project...');
    try {
      const response = await api.patch(`/projects/${id}`, { name: newName });
      setProject(response.data.project);
      setShowRenameModal(false);
      window.dispatchEvent(new CustomEvent('notifications-updated'));
      toast.success('Project renamed successfully', { id: toastId });
    } catch (error: any) {
      console.error('Failed to rename project:', error);
      toast.error(error.response?.data?.error || 'Failed to rename project', { id: toastId });
    }
  };

  const handleViewCampaign = (campaignId: string, campaignStatus?: string) => {
    // Route campaigns that are still running to the live page.
    // Completed/failed campaigns go to the result page.
    const inProgress = ['processing', 'awaiting_human_approval', 'running'];
    if (campaignStatus && inProgress.includes(campaignStatus)) {
      navigate(`/campaign/${campaignId}/live`);
    } else {
      navigate(`/campaign/${campaignId}/result?projectId=${id}`);
    }
  };

  if (loading) {
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
          @keyframes skeleton-shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
          .sk { animation: skeleton-shimmer 1.5s ease-in-out infinite; background: #1A1A24; border-radius: 6px; }
        `}</style>
        <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
          <Sidebar />
          <TopNav title="Project" />
          <main className="project-detail-main pt-14 fade-in" style={{ fontFamily: 'Sora, sans-serif' }}>
            <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
              {/* Back to Projects Skeleton */}
              <div className="sk h-4 w-32 rounded mb-2" />

              {/* Banner Skeleton */}
              <div className="rounded-xl p-6" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="flex items-center gap-4">
                  <div className="sk w-16 h-16 rounded-xl flex-shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="sk h-7 w-48 rounded-lg" />
                    <div className="sk h-4 w-72 rounded" />
                  </div>
                </div>
              </div>

              {/* Campaign Table Skeleton */}
              <div className="rounded-xl p-6" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="sk h-6 w-36 rounded mb-6" />
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="sk h-12 w-full rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </>
    );
  }

  if (!project) {
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
        `}</style>
        <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
          <Sidebar />
          <TopNav title="Project Not Found" />
          <main className="project-detail-main pt-14 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 56px)' }}>
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-20 h-20 rounded-full bg-[#F43F5E]/10 border-2 border-[#F43F5E]/20 flex items-center justify-center mx-auto mb-6">
                <FolderOpen size={40} style={{ color: '#F43F5E' }} />
              </div>
              <h2 className="text-2xl font-semibold mb-3" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>Project not found</h2>
              <p className="text-sm mb-6" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                The project you're looking for doesn't exist or has been deleted.
              </p>
              <button
                onClick={() => navigate('/projects')}
                className="px-6 py-3 rounded-lg bg-[#6366F1] text-white text-sm font-medium hover:bg-[#8083ff] transition-all inline-flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                <ArrowLeft size={16} />
                Back to Projects
              </button>
            </div>
          </main>
        </div>
      </>
    );
  }

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

        <main className="project-detail-main pt-14 fade-in" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
            
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center gap-2 px-1 py-3 text-sm font-medium transition-colors text-[#8B8B9E] hover:text-[#F1F1F3]"
              style={{ fontFamily: 'JetBrains Mono, monospace' }}
            >
              <ArrowLeft size={16} />
              Back to Projects
            </button>

            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-4 group">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                  >
                    <FolderOpen size={32} style={{ color: '#6366F1' }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#F1F1F3' }}>
                        {project.name}
                      </h1>
                      <button
                        onClick={() => setShowRenameModal(true)}
                        className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-[#8B8B9E] hover:text-[#6366F1] hover:bg-[rgba(99,102,241,0.1)]"
                      >
                        <Edit3 size={16} />
                      </button>
                    </div>
                    <p className="text-sm mb-3" style={{ color: '#8B8B9E' }}>
                      {project.description || 'No description provided'}
                    </p>
                    <div
                      className="text-xs"
                      style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                    >
                      Created {formatDate(project.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => navigate(`/projects/${id}/memory`)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all w-full sm:w-auto justify-center bg-[#1A1A24] hover:bg-[#2A2A38]"
                    style={{
                      color: '#c0c1ff',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                      border: '1px solid #2A2A38',
                    }}
                  >
                    <Brain size={16} />
                    Memory Hub
                  </button>
                  <button
                    onClick={() => navigate(`/campaign/new?projectId=${id}`)}
                    className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all btn-press w-full sm:w-auto justify-center bg-[#6366F1] hover:bg-[#8083ff] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                    style={{
                      color: '#F1F1F3',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '14px',
                    }}
                  >
                    <Plus size={16} />
                    New Campaign
                  </button>
                </div>
              </div>
            </div>

            <div>
              <h2
                className="text-lg font-semibold mb-4 flex items-center gap-2"
                style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
              >
                <LayoutDashboard size={18} style={{ color: '#6366F1' }} />
                Campaigns ({campaigns.length})
              </h2>

              {campaignsLoading ? (
                <div className="rounded-xl p-8 space-y-4" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: '#1A1A24' }} />
                  ))}
                </div>
              ) : campaigns.length === 0 ? (
                <div
                  className="rounded-xl p-12 text-center"
                  style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
                >
                  <div className="w-20 h-20 rounded-full bg-[#6366F1]/10 border-2 border-[#6366F1]/20 flex items-center justify-center mx-auto mb-6">
                    <LayoutDashboard size={40} style={{ color: '#6366F1' }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>
                    No campaigns yet
                  </h3>
                  <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                    Start building your first marketing campaign for this project. Our AI agents will help you create a complete campaign strategy.
                  </p>
                  <button
                    onClick={() => navigate(`/campaign/new?projectId=${id}`)}
                    className="bg-[#6366F1] text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-[#8083ff] transition-all inline-flex items-center gap-2"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    <Plus size={18} />
                    Create Your First Campaign
                  </button>
                </div>
              ) : (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" style={{ minWidth: 480 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid #2A2A38', backgroundColor: '#1b1b20' }}>
                          <th
                            style={{
                              padding: '12px 20px',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '0.05em',
                              fontWeight: 500,
                              color: '#8B8B9E',
                              textTransform: 'uppercase',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <button
                              onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                              className="inline-flex items-center gap-1 cursor-pointer bg-transparent border-none p-0"
                              style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', letterSpacing: '0.05em', fontWeight: 500, textTransform: 'uppercase' }}
                            >
                              Campaign Name
                              {sortOrder === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                            </button>
                          </th>
                          <th
                            style={{
                              padding: '12px 20px',
                              fontFamily: 'JetBrains Mono, monospace',
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '0.05em',
                              fontWeight: 500,
                              color: '#8B8B9E',
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
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '0.05em',
                              fontWeight: 500,
                              color: '#8B8B9E',
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
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '0.05em',
                              fontWeight: 500,
                              color: '#8B8B9E',
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
                              fontSize: '12px',
                              lineHeight: '16px',
                              letterSpacing: '0.05em',
                              fontWeight: 500,
                              color: '#8B8B9E',
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
                        {sortedCampaigns.map((row) => {
                          const seqNum = getSeqNumber(row);
                          const statusTone = getStatusTone(row.status);
                          const badge = badgeMap[statusTone];
                          
                          let reviewScore = row.reviewScore;
                          
                          if (!reviewScore && row.aiOutputs) {
                            try {
                              const outputs = typeof row.aiOutputs === 'string' ? JSON.parse(row.aiOutputs) : row.aiOutputs;
                              const reviewOutput = typeof outputs.review_output === 'string' ? JSON.parse(outputs.review_output) : outputs.review_output;
                              
                              if (reviewOutput) {
                                const scores: number[] = [];
                                if (reviewOutput.research_review?.score) scores.push(reviewOutput.research_review.score);
                                if (reviewOutput.strategy_review?.score) scores.push(reviewOutput.strategy_review.score);
                                if (reviewOutput.copy_review?.score) scores.push(reviewOutput.copy_review.score);
                                if (reviewOutput.image_review?.score) scores.push(reviewOutput.image_review.score);
                                
                                if (scores.length > 0) {
                                  reviewScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                                }
                              }
                            } catch (e) {
                              console.error('Failed to extract review score:', e);
                            }
                          }
                          
                          const scoreTone = getScoreTone(reviewScore ? reviewScore / 10 : null);
                          const scorColor = scoreMap[scoreTone];
                          const isRunning = statusTone === 'green';
                          const displayScore = reviewScore ? `${reviewScore.toFixed(1)}/100` : 'N/A';

                          return (
                            <tr
                              key={row.id}
                              className="group transition-colors hover:bg-[#1b1b20]"
                              style={{ borderBottom: '1px solid #2A2A38' }}
                            >
                              <td style={{ padding: '16px 20px' }}>
                                <div className="flex items-center gap-3 min-w-0">
                                  <div
                                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                                    style={{
                                      backgroundColor: '#1A1A24',
                                      border: '1px solid #2A2A38',
                                      color: '#8B8B9E',
                                      fontFamily: 'JetBrains Mono, monospace',
                                      fontSize: '12px',
                                      fontWeight: 600,
                                    }}
                                  >
                                    {seqNum}
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
                                    {displayScore}
                                  </span>
                                  {scoreTone === 'green' && <Star size={14} fill="currentColor" className="flex-shrink-0" />}
                                  {scoreTone === 'warning' && <StarHalf size={14} className="flex-shrink-0" />}
                                </div>
                              </td>

                              <td
                                className="whitespace-nowrap"
                                style={{
                                  padding: '16px 20px',
                                  fontFamily: 'Sora, sans-serif',
                                  fontSize: '13px',
                                  color: '#8B8B9E',
                                }}
                              >
                                {formatDate(row.createdAt)}
                              </td>

                              <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleViewCampaign(row.id, row.status)}
                                    className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors text-[#8B8B9E] hover:text-[#F1F1F3] hover:bg-[#1A1A24]"
                                    title="View Details"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteClick(row)}
                                    className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-colors text-[#8B8B9E] hover:text-[#F43F5E] hover:bg-[rgba(244,63,94,0.08)]"
                                    title="Delete"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
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

                  <div
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t"
                    style={{ backgroundColor: '#111118', borderColor: '#2A2A38' }}
                  >
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8B8B9E' }}>
                      Showing {campaigns.length === 0 ? 0 : startIndex + 1} to {endIndex} of {totalCampaigns} campaigns
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1 || totalPages === 0}
                        className="px-3 py-2 text-xs min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        title="First"
                      >
                        &lt;&lt;
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1 || totalPages === 0}
                        className="px-3 py-2 text-xs min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Previous"
                      >
                        &lt;
                      </button>

                      <div
                        className="px-3 py-2 text-xs min-w-[36px] min-h-[36px] flex items-center justify-center rounded border"
                        style={{ backgroundColor: '#1A1A24', borderColor: '#2A2A38', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {totalPages === 0 ? 0 : currentPage}
                      </div>

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-3 py-2 text-xs min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Next"
                      >
                        &gt;
                      </button>
                      <button
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="px-3 py-2 text-xs min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
                        style={{ borderColor: '#2A2A38', color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        title="Last"
                      >
                        &gt;&gt;
                      </button>
                    </div>

                    <select
                      value={itemsPerPage}
                      onChange={handleItemsPerPageChange}
                      className="px-3 py-2 min-h-[36px] rounded border text-sm cursor-pointer"
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
                      <option value={20}>20 per page</option>
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

      {showRenameModal && project && (
        <RenameProjectModal
          currentName={project.name}
          onClose={() => setShowRenameModal(false)}
          onConfirm={handleRenameConfirm}
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
