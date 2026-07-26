import React, { useState, useEffect } from 'react';
import { FolderOpen, Plus, Calendar, LayoutDashboard, Trash2, Eye, Edit3, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import Sidebar, { SidebarProvider } from '../../shared/sidebar/Sidebar';
import TopNav from '../../shared/topNav/TopNav';
import CreateProjectModal from './CreateProjectModal';
import DeleteProjectModal from './DeleteProjectModal';
import RenameProjectModal from './RenameProjectModal';
import { formatDDMonYYYY } from '../../../utils/formatDate';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status?: string;
  campaignCount?: number;
  mostRecentCampaignStatus?: string | null;
  createdAt: string;
  updatedAt: string;
}

const ProjectsContent: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });
  const [renameModal, setRenameModal] = useState<{ show: boolean; project: Project | null }>({ show: false, project: null });
  const [visibleCount, setVisibleCount] = useState(15);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects', { signal: controller.signal });
        if (controller.signal.aborted) return;
        setProjects(response.data.projects || []);
      } catch (error: any) {
        if (error.name === 'AbortError' || error.code === 'ERR_CANCELED' || controller.signal.aborted) {
          return;
        }
        console.error('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchProjects();

    return () => {
      controller.abort();
    };
  }, []);

  const visibleProjects = projects.slice(0, visibleCount);
  const showingAll = visibleCount >= projects.length;

  const handleLoadMore = () => {
    setVisibleCount((count) => Math.min(count + 15, projects.length));
  };

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const response = await api.post('/projects', { name, description });
      setProjects([response.data.project, ...projects]);
      setVisibleCount((count) => count + 1);
      setShowCreateModal(false);
      toast.success('Project created successfully');
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.error || 'Failed to create project');
    }
  };

  const handleDeleteClick = (project: Project) => {
    setDeleteModal({ show: true, project });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.project) {
      try {
        await api.delete(`/projects/${deleteModal.project.id}`);
        window.dispatchEvent(new CustomEvent('notifications-updated'));
        setProjects(projects.filter((p) => p.id !== deleteModal.project!.id));
        setDeleteModal({ show: false, project: null });
        toast.success('Project deleted successfully');
      } catch (error: any) {
        console.error('Failed to delete project:', error);
        toast.error(error.response?.data?.error || 'Failed to delete project');
      }
    }
  };

  const handleRenameClick = (project: Project) => {
    setRenameModal({ show: true, project });
  };

  const handleRenameConfirm = async (newName: string) => {
    if (renameModal.project) {
      const toastId = toast.loading('Renaming project...');
      try {
        const response = await api.patch(`/projects/${renameModal.project.id}`, { name: newName });
        setProjects(projects.map((p) =>
          p.id === renameModal.project!.id ? { ...p, name: response.data.project.name } : p
        ));
        setRenameModal({ show: false, project: null });
        window.dispatchEvent(new CustomEvent('notifications-updated'));
        toast.success('Project renamed successfully', { id: toastId });
      } catch (error: any) {
        console.error('Failed to rename project:', error);
        toast.error(error.response?.data?.error || 'Failed to rename project', { id: toastId });
      }
    }
  };

  const getTimeAgo = (date: string) => {
    return formatDDMonYYYY(new Date(date));
  };

  if (loading) {
    return (
      <>
        <style>{`
          .projects-main {
            margin-left: 0;
            transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
          }
          @media (min-width: 768px) {
            .projects-main {
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
          <TopNav title="Projects" stats={[]} />
        <main className="projects-main pt-14 fade-in" style={{ fontFamily: 'Sora, sans-serif' }}>
            <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
              {/* Header skeleton */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-2">
                  <div className="sk h-9 w-44 rounded-lg" />
                  <div className="sk h-4 w-72 rounded" />
                </div>
                <div className="sk h-10 w-32 rounded-lg" />
              </div>
              {/* Grid skeleton — 6 cards matching 1/2/3 col grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-xl p-6" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="sk h-5 w-36 rounded" />
                      <div className="sk h-5 w-14 rounded-full" />
                    </div>
                    <div className="sk h-3.5 w-full rounded mb-2" />
                    <div className="sk h-3.5 w-3/4 rounded mb-6" />
                    <div className="flex justify-between items-center pt-4" style={{ borderTop: '1px solid #2A2A38' }}>
                      <div className="sk h-3 w-24 rounded" />
                      <div className="sk h-3 w-20 rounded" />
                    </div>
                  </div>
                ))}
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
        .projects-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .projects-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav
          title="Projects"
          stats={[
            { label: 'total projects', value: projects.length, color: '#6366F1' },
            { label: 'total campaigns', value: projects.reduce((sum, p) => sum + (p.campaignCount ?? 0), 0), color: '#4edea3' },
          ]}
        />

        <main className="projects-main pt-14" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8 space-y-6">
            
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: '#F1F1F3' }}>
                  My Projects
                </h1>
                <p className="text-base" style={{ color: '#8B8B9E' }}>
                  Organize campaigns by client, product, or initiative
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all btn-press w-full sm:w-auto justify-center bg-[#6366F1] hover:bg-[#8083ff] hover:shadow-[0_0_20px_rgba(99,102,241,0.3)]"
                style={{ color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}
                >
                  <Plus size={16} />
                  New Project
              </button>
            </div>

            {/* Stats Overview */}
            {projects.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div
                  className="relative overflow-hidden rounded-xl p-5 group transition-all duration-300 border border-[#2A2A38] hover:border-[rgba(99,102,241,0.4)] hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#111118',
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full"
                    style={{ backgroundColor: 'rgba(99,102,241,0.03)', filter: 'blur(30px)' }}
                  />
                  <div className="flex justify-between items-center">
                    <div>
                      <p
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#A0A0D2',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        Total Projects
                      </p>
                      <h3
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '32px',
                          fontWeight: 700,
                          color: '#F1F1F3',
                          lineHeight: '1.2',
                        }}
                      >
                        {projects.length}
                      </h3>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
                    >
                      <FolderOpen size={20} className="text-violet-400 filter drop-shadow-[0_0_8px_rgba(167,139,250,0.7)]" />
                    </div>
                  </div>
                </div>

                <div
                  className="relative overflow-hidden rounded-xl p-5 group transition-all duration-300 border border-[#2A2A38] hover:border-[rgba(78,222,163,0.4)] hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#111118',
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full"
                    style={{ backgroundColor: 'rgba(78,222,163,0.03)', filter: 'blur(30px)' }}
                  />
                  <div className="flex justify-between items-center">
                    <div>
                      <p
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#A0A0D2',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        Total Campaigns
                      </p>
                      <h3
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '32px',
                          fontWeight: 700,
                          color: '#F1F1F3',
                          lineHeight: '1.2',
                        }}
                      >
                        {projects.reduce((sum, p) => sum + (p.campaignCount ?? 0), 0)}
                      </h3>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(78,222,163,0.12)' }}
                    >
                      <LayoutDashboard size={20} style={{ color: '#4edea3' }} />
                    </div>
                  </div>
                </div>

                <div
                  className="relative overflow-hidden rounded-xl p-5 group transition-all duration-300 border border-[#2A2A38] hover:border-[rgba(245,158,11,0.4)] hover:-translate-y-0.5"
                  style={{
                    backgroundColor: '#111118',
                  }}
                >
                  <div
                    className="absolute top-0 right-0 w-24 h-24 rounded-full"
                    style={{ backgroundColor: 'rgba(245,158,11,0.03)', filter: 'blur(30px)' }}
                  />
                  <div className="flex justify-between items-center">
                    <div>
                      <p
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#A0A0D2',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '6px',
                        }}
                      >
                        Avg. Campaigns / Project
                      </p>
                      <h3
                        style={{
                          fontFamily: 'Sora, sans-serif',
                          fontSize: '32px',
                          fontWeight: 700,
                          color: '#F1F1F3',
                          lineHeight: '1.2',
                        }}
                      >
                        {projects.length > 0
                          ? (projects.reduce((sum, p) => sum + (p.campaignCount ?? 0), 0) / projects.length).toFixed(1)
                          : '0.0'}
                      </h3>
                    </div>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors"
                      style={{ backgroundColor: 'rgba(245,158,11,0.12)' }}
                    >
                      <TrendingUp size={20} style={{ color: '#F59E0B' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Projects Grid */}
            {!loading && projects.length === 0 ? (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}>
                  <FolderOpen size={32} style={{ color: '#6366F1' }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  No projects yet
                </h3>
                <p className="text-sm mb-6" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  Create your first project to organize your campaigns
                </p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 min-h-[44px] rounded-lg font-medium transition-all bg-[#6366F1] hover:bg-[#8083ff]"
                  style={{ color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}
                >
                  <Plus size={16} />
                  Create First Project
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {visibleProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => navigate(`/projects/${project.id}`, { state: { project } })}
                    className="group relative rounded-xl p-6 transition-all cursor-pointer stagger-enter bg-[#111118] border border-[#2A2A38] hover:bg-[#1A1A24] hover:border-[rgba(99,102,241,0.4)]"
                  >
                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
                    >
                      <FolderOpen size={24} style={{ color: '#6366F1' }} />
                    </div>

                    {/* Content */}
                    <h3
                      className="text-lg font-semibold mb-2"
                      style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}
                    >
                      {project.name}
                    </h3>
                    <p
                      className="text-sm mb-4 line-clamp-2"
                      style={{ color: '#8B8B9E', minHeight: '40px' }}
                    >
                      {project.description || 'No description provided'}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <LayoutDashboard size={14} style={{ color: '#4A4A5E' }} />
                        <span
                          className="text-xs"
                          style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {project.campaignCount || 0} campaigns
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} style={{ color: '#4A4A5E' }} />
                        <span
                          className="text-xs"
                          style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}
                        >
                          {getTimeAgo(project.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-4 border-t" style={{ borderColor: '#2A2A38' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/projects/${project.id}`, { state: { project } });
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-all bg-[rgba(99,102,241,0.1)] hover:bg-[rgba(99,102,241,0.2)]"
                        style={{
                          color: '#6366F1',
                          border: '1px solid rgba(99,102,241,0.2)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        aria-label="Rename project"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameClick(project);
                        }}
                        className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all text-[#8B8B9E] border border-[#2A2A38] hover:text-[#6366F1] hover:bg-[rgba(99,102,241,0.1)] hover:border-[rgba(99,102,241,0.3)]"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        aria-label="Delete project"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(project);
                        }}
                        className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg transition-all text-[#8B8B9E] border border-[#2A2A38] hover:text-[#F43F5E] hover:bg-[rgba(244,63,94,0.1)] hover:border-[rgba(244,63,94,0.3)]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div
                className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl"
                style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
              >
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#8B8B9E' }}>
                  Showing {visibleProjects.length} of {projects.length} projects
                </div>

                <button
                  onClick={handleLoadMore}
                  disabled={showingAll}
                  className="px-4 py-3 min-h-[44px] rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24] flex items-center justify-center"
                  style={{
                    borderColor: '#2A2A38',
                    color: '#F1F1F3',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono, monospace',
                    backgroundColor: '#131318',
                  }}
                >
                  {showingAll ? 'All projects loaded' : 'Load More'}
                </button>
              </div>
            </>
            )}
          </div>
        </main>
      </div>

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {deleteModal.show && deleteModal.project && (
        <DeleteProjectModal
          projectName={deleteModal.project.name}
          onClose={() => setDeleteModal({ show: false, project: null })}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {renameModal.show && renameModal.project && (
        <RenameProjectModal
          currentName={renameModal.project.name}
          onClose={() => setRenameModal({ show: false, project: null })}
          onConfirm={handleRenameConfirm}
        />
      )}
    </>
  );
};

const ProjectsPage: React.FC = () => (
  <SidebarProvider>
    <ProjectsContent />
  </SidebarProvider>
);

export default ProjectsPage;
