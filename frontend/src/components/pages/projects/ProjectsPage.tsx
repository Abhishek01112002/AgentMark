import React, { useState, useEffect, useRef } from 'react';
import { FolderOpen, Plus, Calendar, LayoutDashboard, Trash2, Eye, Edit3, Loader2 } from 'lucide-react';
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
  const didFetchRef = useRef(false);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects || []);
    } catch (error: any) {
      console.error('Failed to fetch projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

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
      try {
        const response = await api.patch(`/projects/${renameModal.project.id}`, { name: newName });
        setProjects(projects.map((p) =>
          p.id === renameModal.project!.id ? { ...p, name: response.data.project.name } : p
        ));
        setRenameModal({ show: false, project: null });
        window.dispatchEvent(new CustomEvent('notifications-updated'));
        toast.success('Project renamed successfully');
      } catch (error: any) {
        console.error('Failed to rename project:', error);
        toast.error(error.response?.data?.error || 'Failed to rename project');
      }
    }
  };

  const getTimeAgo = (date: string) => {
    return formatDDMonYYYY(new Date(date));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A0A0F' }}>
        <Loader2 size={32} className="animate-spin text-[#6366F1]" />
      </div>
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
            <div className="flex justify-between items-start gap-4">
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
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all"
                style={{ backgroundColor: '#6366F1', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#8083ff';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(99,102,241,0.3)';
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                  onTouchCancel={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '#6366F1';
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <Plus size={16} />
                  New Project
              </button>
            </div>

            {/* Projects Grid */}
            {projects.length === 0 ? (
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
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all"
                  style={{ backgroundColor: '#6366F1', color: '#F1F1F3', fontFamily: 'JetBrains Mono, monospace', fontSize: '14px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8083ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366F1')}
                  onTouchStart={(e) => (e.currentTarget.style.backgroundColor = '#8083ff')}
                  onTouchEnd={(e) => (e.currentTarget.style.backgroundColor = '#6366F1')}
                  onTouchCancel={(e) => (e.currentTarget.style.backgroundColor = '#6366F1')}
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
                    className="group relative rounded-xl p-6 transition-all cursor-pointer"
                    style={{ backgroundColor: '#111118', border: '1px solid #2A2A38' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)';
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#1A1A24';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#111118';
                    }}
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
                        onClick={() => navigate(`/projects/${project.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                        style={{
                          backgroundColor: 'rgba(99,102,241,0.1)',
                          color: '#6366F1',
                          border: '1px solid rgba(99,102,241,0.2)',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.2)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.1)';
                        }}
                        onTouchStart={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.2)';
                        }}
                        onTouchEnd={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.1)';
                        }}
                        onTouchCancel={(e) => {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.1)';
                        }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRenameClick(project);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#8B8B9E', border: '1px solid #2A2A38' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#6366F1';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.1)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
                        onTouchStart={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#6366F1';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(99,102,241,0.1)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)';
                        }}
                        onTouchEnd={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
                        onTouchCancel={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(project);
                        }}
                        className="p-2 rounded-lg transition-all"
                        style={{ color: '#8B8B9E', border: '1px solid #2A2A38' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#F43F5E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(244,63,94,0.1)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.3)';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
                        onTouchStart={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#F43F5E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(244,63,94,0.1)';
                          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(244,63,94,0.3)';
                        }}
                        onTouchEnd={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
                        onTouchCancel={(e) => {
                          (e.currentTarget as HTMLElement).style.color = '#8B8B9E';
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                          (e.currentTarget as HTMLElement).style.borderColor = '#2A2A38';
                        }}
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
                  className="px-4 py-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1A1A24]"
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
