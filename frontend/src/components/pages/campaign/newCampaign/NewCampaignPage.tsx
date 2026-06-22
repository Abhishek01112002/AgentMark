import React, { useState, useEffect } from 'react';
import { Briefcase, Target, Mic, Zap, Smile, Flame, Crown, Coffee, Scale, FolderOpen, Plus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar, { SidebarProvider } from '../../../shared/sidebar/Sidebar';
import TopNav from '../../../shared/topNav/TopNav';
import CreateProjectModal from '../../projects/CreateProjectModal';

const NewCampaignContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projects] = useState([
    { id: '1', name: 'Nike 2025 Campaign' },
    { id: '2', name: 'Adidas Spring Collection' },
    { id: '3', name: 'TechGadgets Pro Launch' },
  ]);
  const [formData, setFormData] = useState({
    projectId: searchParams.get('projectId') || '',
    campaignName: '',
    brandName: '',
    industry: '',
    goal: '',
    targetAudience: '',
    brandVoice: 'professional',
  });

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl) {
      setFormData((prev) => ({ ...prev, projectId: projectIdFromUrl }));
    }
  }, [searchParams]);

  const handleCreateProject = (name: string, description: string) => {
    console.log('Project created:', name, description);
    setShowCreateProjectModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert('Please select a project');
      return;
    }
    const campaignId = 'temp-' + Date.now();
    navigate(`/campaign/${campaignId}/live`);
  };

  const voiceOptions = [
    { value: 'professional', label: 'Professional', icon: Briefcase },
    { value: 'friendly', label: 'Friendly', icon: Smile },
    { value: 'bold', label: 'Bold', icon: Flame },
    { value: 'luxury', label: 'Luxury', icon: Crown },
    { value: 'casual', label: 'Casual', icon: Coffee },
    { value: 'authoritative', label: 'Authoritative', icon: Scale },
  ];

  return (
    <>
      <div className="space-y-8" style={{ fontFamily: 'Sora, sans-serif' }}>
        <style>{`
          input[type="text"], select, textarea {
            background-color: #131318;
            border-color: #2A2A38;
            color: #F1F1F3;
          }
          input:focus, select:focus, textarea:focus {
            border-color: #c0c1ff !important;
            box-shadow: 0 0 0 2px rgba(192, 193, 255, 0.2) !important;
            outline: none;
          }
          ::placeholder {
            color: #4A4A5E;
          }
        `}</style>

        <header>
          <h1 className="text-3xl md:text-4xl font-bold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
            Launch New Campaign
          </h1>
          <p className="text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            Define your campaign parameters and initialize the agent cluster
          </p>
        </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <section className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <FolderOpen size={16} className="text-[#c0c1ff]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Select Project
            </h3>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
              Project *
            </label>
            <div className="flex gap-2">
              <select
                required
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="flex-1 rounded-lg px-3 py-2 text-sm border cursor-pointer transition-all"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <option value="">Select a project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowCreateProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
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
              >
                <Plus size={14} />
                New
              </button>
            </div>
            <p className="text-xs" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>
              Select which project this campaign belongs to, or create a new one
            </p>
          </div>
        </section>

        <section className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Briefcase size={16} className="text-[#c0c1ff]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Campaign Identity
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                Campaign Name
              </label>
              <input
                type="text"
                required
                value={formData.campaignName}
                onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border transition-all"
                placeholder="e.g., Q3 Product Launch"
                style={{ fontFamily: 'Sora, sans-serif' }}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                Brand Name
              </label>
              <input
                type="text"
                required
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border transition-all"
                placeholder="Your brand"
                style={{ fontFamily: 'Sora, sans-serif' }}
              />
            </div>
          </div>
        </section>

        <section className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={16} className="text-[#c0c1ff]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Target & Industry
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                Industry
              </label>
              <select
                required
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border cursor-pointer transition-all"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <option value="">Select industry...</option>
                <option value="saas">SaaS & Technology</option>
                <option value="ecommerce">E-Commerce</option>
                <option value="finance">Finance & Fintech</option>
                <option value="healthcare">Healthcare</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                Primary Goal
              </label>
              <select
                required
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                className="w-full rounded-lg px-3 py-2 text-sm border cursor-pointer transition-all"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <option value="">Select goal...</option>
                <option value="awareness">Brand Awareness</option>
                <option value="lead_gen">Lead Generation</option>
                <option value="sales">Direct Sales</option>
                <option value="retention">Customer Retention</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
              Target Audience
            </label>
            <textarea
              required
              value={formData.targetAudience}
              onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm border resize-y transition-all"
              placeholder="Describe your ideal customer..."
              rows={3}
              style={{ fontFamily: 'Sora, sans-serif' }}
            />
          </div>
        </section>

        <section className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Mic size={16} className="text-[#c0c1ff]" />
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Brand Voice
            </h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {voiceOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <label key={option.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="brand_voice"
                    value={option.value}
                    checked={formData.brandVoice === option.value}
                    onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
                    className="sr-only peer"
                  />
                  <div className="p-3 rounded-lg border border-[#2A2A38] bg-[#131318] peer-checked:border-[#c0c1ff] peer-checked:bg-[rgba(192,193,255,0.05)] transition-all hover:border-[#464554] text-center flex flex-col items-center gap-2">
                    <IconComponent size={20} className="text-[#c0c1ff]" />
                    <span className="text-xs font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                      {option.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <div className="flex items-center justify-between pt-4 border-t border-[#2A2A38]">
          <div className="flex items-center gap-2 bg-[#111118] border border-[#2A2A38] px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
              7 Agents Ready
            </span>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all"
            style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#6366F1', color: '#F1F1F3' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#8083ff')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#6366F1')}
          >
            <Zap size={16} />
            Launch Campaign
          </button>
        </div>
      </form>
      </div>

      {showCreateProjectModal && (
        <CreateProjectModal
          onClose={() => setShowCreateProjectModal(false)}
          onCreate={handleCreateProject}
        />
      )}
    </>
  );
};

const NewCampaignPage: React.FC = () => {
  return (
    <SidebarProvider>
      <style>{`
        .campaign-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .campaign-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen" style={{ backgroundColor: '#0A0A0F', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="New Campaign" />

        <main className="campaign-main pt-14" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <NewCampaignContent />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default NewCampaignPage;
