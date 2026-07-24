import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const didFetchRef = useRef(false);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;

    const controller = new AbortController();

    const fetchCampaigns = async () => {
      try {
        const [projectsResponse, campaignsResponse] = await Promise.all([
          api.get('/projects', { signal: controller.signal }),
          api.get('/campaigns/all', { signal: controller.signal })
        ]);
        
        const projectsData = projectsResponse.data.projects || [];
        setProjects(projectsData);

        const allCampaigns = campaignsResponse.data.campaigns || [];
        setCampaigns(allCampaigns);
      } catch (error: any) {
        if (error.name !== 'AbortError' && error.code !== 'ERR_CANCELED') {
          console.error('Failed to fetch campaigns:', error);
          toast.error('Failed to load campaign history');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
    
    return () => {
      controller.abort();
      didFetchRef.current = false;
    };
  }, []);

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

  const getStatusBadge = (status: string) => {
    const styles: Record<string, any> = {
      processing: {
        bg: 'rgba(245,158,11,0.1)',
        border: 'rgba(245,158,11,0.2)',
        text: '#F59E0B',
        dot: '#F59E0B',
      },
      completed: {
        bg: 'rgba(78,222,163,0.1)',
        border: 'rgba(78,222,163,0.2)',
        text: '#4edea3',
        dot: '#4edea3',
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
              <header>
                <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Past Campaigns & Activity
                </h2>
                <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  Review and analyze past and currently active marketing initiatives.
                </p>
              </header>

              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="relative w-full">
                    <input
                      className="w-full rounded-lg px-4 py-2 text-sm border transition-all focus:outline-none focus:border-[#6366F1]"
                      style={{ backgroundColor: '#111118', borderColor: '#2A2A38', color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
                      placeholder="Search campaigns..."
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className="px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs whitespace-nowrap transition-colors min-h-[40px] md:min-h-[44px] flex-1 sm:flex-none"
                      style={{
                        backgroundColor: statusFilter === 'all' ? 'rgba(99,102,241,0.1)' : '#111118',
                        color: statusFilter === 'all' ? '#6366F1' : '#8B8B9E',
                        border: `1px solid ${statusFilter === 'all' ? 'rgba(99,102,241,0.2)' : '#2A2A38'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      All Campaigns
                    </button>
                    <button
                      onClick={() => setStatusFilter('processing')}
                      className="px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 md:gap-2 transition-colors min-h-[40px] md:min-h-[44px] flex-1 sm:flex-none"
                      style={{
                        backgroundColor: statusFilter === 'processing' ? 'rgba(99,102,241,0.1)' : '#111118',
                        color: statusFilter === 'processing' ? '#6366F1' : '#8B8B9E',
                        border: `1px solid ${statusFilter === 'processing' ? 'rgba(99,102,241,0.2)' : '#2A2A38'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] flex-shrink-0" /> Processing
                    </button>
                    <button
                      onClick={() => setStatusFilter('completed')}
                      className="px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 md:gap-2 transition-colors min-h-[40px] md:min-h-[44px] flex-1 sm:flex-none"
                      style={{
                        backgroundColor: statusFilter === 'completed' ? 'rgba(99,102,241,0.1)' : '#111118',
                        color: statusFilter === 'completed' ? '#6366F1' : '#8B8B9E',
                        border: `1px solid ${statusFilter === 'completed' ? 'rgba(99,102,241,0.2)' : '#2A2A38'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] flex-shrink-0" /> Completed
                    </button>
                    <button
                      onClick={() => setStatusFilter('failed')}
                      className="px-3 md:px-4 py-2 md:py-3 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 md:gap-2 transition-colors min-h-[40px] md:min-h-[44px] flex-1 sm:flex-none"
                      style={{
                        backgroundColor: statusFilter === 'failed' ? 'rgba(99,102,241,0.1)' : '#111118',
                        color: statusFilter === 'failed' ? '#6366F1' : '#8B8B9E',
                        border: `1px solid ${statusFilter === 'failed' ? 'rgba(99,102,241,0.2)' : '#2A2A38'}`,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F43F5E] flex-shrink-0" /> Failed
                    </button>
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
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse" style={{ minWidth: 500 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #2A2A38', backgroundColor: '#1b1b20' }}>
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
                                className="transition-colors stagger-enter hover:bg-[rgba(27,27,32,0.3)]"
                                style={{ borderBottom: '1px solid rgba(42,42,56,0.5)' }}
                              >
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
