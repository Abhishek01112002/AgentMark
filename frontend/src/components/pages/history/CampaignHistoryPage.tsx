import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Copy, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import { formatDDMonYYYY } from '../../../utils/formatDate';

interface Campaign {
  id: string;
  name: string;
  projectId: string;
  industry: string;
  primaryGoal: string;
  status: string;
  reviewScore?: number | null;
  createdAt: string;
  updatedAt: string;
  aiOutputs?: any;
}

interface Project {
  id: string;
  name: string;
  campaigns?: Campaign[];
}

const formatIndustryLabel = (industry: string) => {
  const normalized = (industry || '').trim().toLowerCase();
  if (!normalized) return 'Not specified';
  const industryMap: Record<string, string> = {
    'saas': 'SaaS',
    'fintech': 'FinTech',
    'ai': 'AI',
    'ml': 'ML',
    'ios': 'iOS',
    'android': 'Android',
    'api': 'API',
    'b2b': 'B2B',
    'b2c': 'B2C',
  };
  if (industryMap[normalized]) return industryMap[normalized];
  return normalized
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const formatGoalLabel = (goal: string) => {
  const normalized = (goal || '').replace(/_/g, ' ').trim();
  if (!normalized) return 'Not specified';
  const lower = normalized.toLowerCase();
  if (lower === 'lead gen' || lower === 'lead_generation' || lower === 'lead generation' || lower === 'lead_gen') {
    return 'Lead Generation';
  }
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const CampaignHistoryContent: React.FC = () => {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'action_required' | 'processing' | 'completed' | 'failed'>('all');
  const userHasChangedFilter = React.useRef(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredCampaigns.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} campaigns?`)) return;

    setIsDeletingBulk(true);
    const toastId = toast.loading(`Deleting ${selectedIds.length} campaigns...`);

    const results = await Promise.allSettled(
      selectedIds.map((id) => api.delete(`/campaigns/${id}`))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    const deletedIdsSet = new Set(
      selectedIds.filter((_, idx) => results[idx].status === 'fulfilled')
    );

    setCampaigns((prev) => prev.filter((c) => !deletedIdsSet.has(c.id)));
    setSelectedIds((prev) => prev.filter((id) => !deletedIdsSet.has(id)));
    setIsDeletingBulk(false);
    toast.dismiss(toastId);

    if (failed === 0) {
      toast.success(`Successfully deleted ${succeeded} campaigns`);
    } else {
      toast.success(`Deleted ${succeeded} campaigns (${failed} failed)`);
    }
  };

  useEffect(() => {
    const controller = new AbortController();

    const fetchCampaigns = async () => {
      try {
        const [projectsResponse, campaignsResponse] = await Promise.all([
          api.get('/projects', { signal: controller.signal }),
          api.get('/campaigns/all', { signal: controller.signal })
        ]);
        
        if (controller.signal.aborted) return;

        const projectsData = projectsResponse.data.projects || [];
        setProjects(projectsData);

        const allCampaigns = campaignsResponse.data.campaigns || [];
        setCampaigns(allCampaigns);

        const hasAwaitingApproval = allCampaigns.some((c: Campaign) => c.status === 'awaiting_human_approval');
        if (hasAwaitingApproval && !userHasChangedFilter.current) {
          setStatusFilter('action_required');
        }
      } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || controller.signal.aborted) {
          return;
        }
        console.error('Failed to fetch campaigns:', error);
        toast.error('Failed to load campaign history');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchCampaigns();
    
    return () => {
      controller.abort();
    };
  }, []);

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'action_required'
        ? c.status === 'awaiting_human_approval'
        : c.status === statusFilter;
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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      awaiting_human_approval: {
        bg: 'rgba(99,102,241,0.15)',
        border: 'rgba(99,102,241,0.4)',
        text: '#818CF8',
        dot: '#6366F1',
        label: 'Action Required',
      },
      processing: {
        bg: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.2)',
        text: '#F59E0B',
        dot: '#F59E0B',
        label: 'Processing',
      },
      completed: {
        bg: 'rgba(78,222,163,0.1)',
        border: 'rgba(78,222,163,0.2)',
        text: '#4edea3',
        dot: '#4edea3',
        label: 'Completed',
      },
      failed: {
        bg: 'rgba(244,63,94,0.1)',
        border: 'rgba(244,63,94,0.2)',
        text: '#F43F5E',
        dot: '#F43F5E',
      },
    };

    const style = styles[status] || styles.completed;

    return (
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
        style={{
          backgroundColor: style.bg,
          border: `1px solid ${style.border}`,
          color: style.text,
          fontFamily: 'JetBrains Mono, monospace',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </div>
    );
  };

  const getTimeAgo = (date: string) => {
    return formatDDMonYYYY(new Date(date));
  };

  if (loading) {
    return (
      <>
        <style>{`
          .history-main {
            margin-left: 0;
            transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
          }
          @media (min-width: 768px) {
            .history-main {
              margin-left: var(--sidebar-w, 240px);
            }
          }
          @keyframes skeleton-shimmer {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.45; }
          }
          .sk { animation: skeleton-shimmer 1.5s ease-in-out infinite; background: #1A1A24; border-radius: 6px; }
        `}</style>
        <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F' }}>
          <Sidebar />
          <TopNav title="Campaign History" />
        <main className="history-main pt-14 fade-in">
            <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
              <div className="space-y-8">
                {/* Page header skeleton */}
                <header>
                  <div className="sk h-9 w-72 rounded-lg mb-3" />
                  <div className="sk h-4 w-96 rounded" />
                </header>
                <div className="space-y-6">
                  {/* Search + filter bar skeleton */}
                  <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                    <div className="sk h-10 flex-1 rounded-lg" />
                    <div className="flex gap-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="sk h-9 w-24 rounded-lg" />
                      ))}
                    </div>
                  </div>
                  {/* Table skeleton */}
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ backgroundColor: '#1b1b20', borderBottom: '1px solid #2A2A38' }}>
                            {['w-32', 'w-24', 'w-20', 'w-24', 'w-20', 'w-14', 'w-24', 'w-16'].map((w, i) => (
                              <th key={i} className="px-4 py-3 text-left">
                                <div className={`sk h-3 ${w} rounded`} />
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 5 }).map((_, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #1b1b20' }}>
                              <td className="px-4 py-4"><div className="sk h-4 w-36 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-4 w-24 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-4 w-16 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-4 w-28 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-5 w-20 rounded-full" /></td>
                              <td className="px-4 py-4"><div className="sk h-4 w-12 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-4 w-20 rounded" /></td>
                              <td className="px-4 py-4"><div className="sk h-7 w-14 rounded-lg ml-auto" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
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
      <style>{`
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
              {/* Apple Pro Header Card */}
              <header className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight font-sora text-white mb-1.5">
                      Past Campaigns & Activity
                    </h2>
                    <p className="text-xs sm:text-sm text-[#94A3B8] font-sans">
                      Review, audit, and analyze historical and active multi-agent marketing initiatives
                    </p>
                  </div>
                </div>
              </header>

              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                  {/* Apple Search Bar */}
                  <div className="relative flex-1">
                    <input
                      className="w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm bg-[#0D0D14] border border-[#262636] text-white placeholder-[#64748B] transition-all focus:outline-none focus:border-[#6366F1] font-sans shadow-inner"
                      placeholder="Search by campaign name, industry, or goal..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Apple Segmented Control Pill Filters */}
                  <div className="flex items-center gap-1 p-1.5 bg-[#0D0D14] rounded-2xl border border-[#262636] overflow-x-auto scroll-touch shrink-0">
                    {(['all', 'action_required', 'processing', 'completed', 'failed'] as const).map((st) => {
                      const count = st === 'action_required'
                        ? campaigns.filter((c) => c.status === 'awaiting_human_approval').length
                        : 0;
                      return (
                        <button
                          key={st}
                          onClick={() => {
                            userHasChangedFilter.current = true;
                            setStatusFilter(st);
                            setCurrentPage(1);
                          }}
                          className={`px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold font-sora transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-1.5 ${
                            statusFilter === st
                              ? 'bg-[#6366F1] text-white shadow-sm'
                              : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                          }`}
                        >
                          <span>{st === 'action_required' ? 'Action Required' : st.charAt(0).toUpperCase() + st.slice(1)}</span>
                          {st === 'action_required' && count > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-black font-mono font-bold">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {campaigns.length === 0 ? (
                  <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2">
                        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                      No campaigns yet
                    </h3>
                    <p className="text-sm mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      Create your first campaign to see it here
                    </p>
                  </div>
                                ) : filteredCampaigns.length === 0 ? (
                  <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      No campaigns match your filters
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    {selectedIds.length > 0 && (
                      <div className="p-3 bg-[#1A1A24] border-b border-[#2A2A38] flex items-center justify-between px-6">
                        <span className="text-xs font-mono text-[#F1F1F3]">
                          {selectedIds.length} campaign{selectedIds.length > 1 ? 's' : ''} selected
                        </span>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isDeletingBulk}
                          className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Trash2 size={13} />
                          <span>Delete Selected</span>
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse" style={{ minWidth: 500 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2A2A38', backgroundColor: '#1b1b20' }}>
                            <th style={{ padding: '12px 16px', width: '40px' }}>
                              <input
                                type="checkbox"
                                checked={filteredCampaigns.length > 0 && selectedIds.length === filteredCampaigns.length}
                                onChange={handleSelectAll}
                                className="rounded border-[#2A2A38] bg-[#111118] text-[#6366F1] focus:ring-0 cursor-pointer"
                              />
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              CAMPAIGN
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              STATUS
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              SCORE
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              INDUSTRY
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              GOAL
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase' }}>
                              CREATED
                            </th>
                            <th style={{ padding: '12px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', letterSpacing: '0.05em', fontWeight: 500, color: '#A0A0D2', textTransform: 'uppercase', textAlign: 'right' }}>
                              ACTIONS
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCampaigns.map((campaign) => {
                            const project = projects.find(p => p.id === campaign.projectId);
                            const isSelected = selectedIds.includes(campaign.id);
                            
                            let reviewScore = campaign.reviewScore;
                            
                            if (!reviewScore && campaign.aiOutputs) {
                              try {
                                const outputs = typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs;
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
                            
                            return (
                              <tr
                                key={campaign.id}
                                className={`transition-colors stagger-enter ${isSelected ? 'bg-[#6366F1]/10' : 'hover:bg-[rgba(27,27,32,0.3)]'}`}
                                style={{ borderBottom: '1px solid rgba(42,42,56,0.5)' }}
                              >
                                <td style={{ padding: '16px' }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(campaign.id)}
                                    className="rounded border-[#2A2A38] bg-[#111118] text-[#6366F1] focus:ring-0 cursor-pointer"
                                  />
                                </td>
                                <td style={{ padding: '16px 20px' }}>
                                  <div>
                                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '14px', fontWeight: 500, color: '#F1F1F3' }}>
                                      {campaign.name}
                                    </div>
                                    <div style={{ fontFamily: 'Sora, sans-serif', fontSize: '12px', color: '#A0A0D2', marginTop: '2px' }}>
                                      {project?.name || 'Unknown Project'}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ padding: '16px 20px' }}>{getStatusBadge(campaign.status)}</td>
                                <td style={{ padding: '16px 20px', fontFamily: 'Sora, sans-serif', fontSize: '13px', color: '#8B8B9E' }}>
                                  {reviewScore !== null && reviewScore !== undefined ? (
                                    <span
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded"
                                      style={{
                                        backgroundColor: reviewScore >= 80 ? 'rgba(78,222,163,0.1)' : reviewScore >= 60 ? 'rgba(245,158,11,0.1)' : 'rgba(244,63,94,0.1)',
                                        color: reviewScore >= 80 ? '#4edea3' : reviewScore >= 60 ? '#F59E0B' : '#F43F5E',
                                        fontFamily: 'JetBrains Mono, monospace',
                                        fontSize: '12px',
                                        fontWeight: 600,
                                      }}
                                    >
                                      {reviewScore.toFixed(1)}/100
                                    </span>
                                  ) : (
                                    '--'
                                  )}
                                </td>
                                <td style={{ padding: '16px 20px', fontFamily: 'Sora, sans-serif', fontSize: '13px', color: '#8B8B9E' }}>
                                  {formatIndustryLabel(campaign.industry) || '--'}
                                </td>
                                <td style={{ padding: '16px 20px', fontFamily: 'Sora, sans-serif', fontSize: '13px', color: '#8B8B9E' }}>
                                  {formatGoalLabel(campaign.primaryGoal) || '--'}
                                </td>
                                <td style={{ padding: '16px 20px', fontFamily: 'Sora, sans-serif', fontSize: '13px', color: '#8B8B9E' }}>
                                  {getTimeAgo(campaign.createdAt)}
                                </td>
                                <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => navigate(`/campaign/new?duplicateFromId=${campaign.id}`)}
                                      className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors text-[#8B8B9E] hover:text-[#6366F1] hover:bg-[#1A1A24]"
                                      title="Clone Campaign"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                      <Copy size={16} />
                                    </button>
                                    <button
                                      onClick={() => {
                                        const inProgress = ['processing', 'awaiting_human_approval', 'running'];
                                        if (inProgress.includes(campaign.status.toLowerCase())) {
                                          navigate(`/campaign/${campaign.id}/live`);
                                        } else {
                                          navigate(`/campaign/${campaign.id}/result?projectId=${campaign.projectId}`);
                                        }
                                      }}
                                      className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition-colors text-[#8B8B9E] hover:text-[#F1F1F3] hover:bg-[#1A1A24]"
                                      title="View Details"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                    >
                                      <Eye size={16} />
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
                        Showing {paginatedCampaigns.length === 0 ? 0 : startIndex + 1} to {endIndex} of {filteredCampaigns.length} campaigns
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
                        <option value={25}>25 per page</option>
                        <option value={50}>50 per page</option>
                      </select>
                    </div>
                  </div>
                )}
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
