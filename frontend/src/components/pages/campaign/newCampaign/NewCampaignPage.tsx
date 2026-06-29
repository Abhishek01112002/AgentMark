import React, { useState, useEffect, useRef } from 'react';
import { Briefcase, Target, Mic, Zap, Smile, Flame, Crown, Coffee, FolderOpen, Plus, Loader2, AlertTriangle, Sparkles, Heart, ShieldCheck, PlusCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../../services/api';
import Sidebar, { SidebarProvider } from '../../../shared/sidebar/Sidebar';
import TopNav from '../../../shared/topNav/TopNav';
import CreateProjectModal from '../../projects/CreateProjectModal';
import { llmSettingsService } from '../../../../services/llm-settings.service';

interface OptionItem {
  value: string;
  label: string;
}

interface Constants {
  industries: OptionItem[];
  primaryGoals: OptionItem[];
  brandVoices: OptionItem[];
}

const VOICE_ICONS: Record<string, any> = {
  professional: Briefcase,
  friendly: Smile,
  bold: Flame,
  luxury: Crown,
  casual: Coffee,
  inspirational: Sparkles,
  empathetic: Heart,
  trustworthy: ShieldCheck,
  other: PlusCircle,
};

const NewCampaignContent: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [constants, setConstants] = useState<Constants | null>(null);
  const [loadingConstants, setLoadingConstants] = useState(true);
  const didFetchProjectsRef = useRef(false);
  const didFetchConstantsRef = useRef(false);
  const [projectCampaigns, setProjectCampaigns] = useState<any[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [formData, setFormData] = useState({
    projectId: searchParams.get('projectId') || '',
    campaignName: '',
    brandName: '',
    industry: '',
    customIndustry: '',
    goal: '',
    customGoal: '',
    targetAudience: '',
    brandVoice: 'professional',
    customBrandVoice: '',
  });

  const customIndustryRef = useRef<HTMLInputElement>(null);
  const customGoalRef = useRef<HTMLInputElement>(null);
  const customBrandVoiceRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.industry === 'other') {
      customIndustryRef.current?.focus();
    }
  }, [formData.industry]);

  useEffect(() => {
    if (formData.goal === 'other') {
      customGoalRef.current?.focus();
    }
  }, [formData.goal]);

  useEffect(() => {
    if (formData.brandVoice === 'other') {
      customBrandVoiceRef.current?.focus();
    }
  }, [formData.brandVoice]);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get('projectId');
    if (projectIdFromUrl) {
      setFormData((prev) => ({ ...prev, projectId: projectIdFromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (didFetchProjectsRef.current) return;
    didFetchProjectsRef.current = true;

    const fetchProjects = async () => {
      try {
        const response = await api.get('/projects');
        setProjects(response.data.projects || []);
      } catch (error: any) {
        console.error('Failed to fetch projects:', error);
        toast.error('Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, []);

  useEffect(() => {
    if (didFetchConstantsRef.current) return;
    didFetchConstantsRef.current = true;

    const fetchConstants = async () => {
      try {
        const response = await api.get('/constants');
        setConstants(response.data);
      } catch (error: any) {
        console.error('Failed to fetch constants:', error);
        toast.error('Failed to load form options');
      } finally {
        setLoadingConstants(false);
      }
    };
    fetchConstants();
  }, []);

  useEffect(() => {
    if (!formData.projectId) return;
    
    const fetchCampaigns = async () => {
      try {
        const response = await api.get('/campaigns', { params: { projectId: formData.projectId } });
        setProjectCampaigns(response.data.campaigns || []);
      } catch (error) {
        console.error('Failed to fetch project campaigns:', error);
      }
    };
    fetchCampaigns();
  }, [formData.projectId]);

  const handleCreateProject = async (name: string, description: string) => {
    try {
      const response = await api.post('/projects', { name, description });
      const newProject = response.data.project;
      setProjects((prev) => [newProject, ...prev]);
      setFormData((prev) => ({ ...prev, projectId: newProject.id }));
      toast.success('Project created successfully');
      setShowCreateProjectModal(false);
    } catch (error: any) {
      console.error('Failed to create project:', error);
      toast.error(error.response?.data?.error || 'Failed to create project');
    }
  };

  const executeSubmission = async (isDuplicate: boolean = false) => {
    setIsCreating(true);

    try {
      const finalIndustry = formData.industry === 'other' ? formData.customIndustry : formData.industry;
      const finalGoal = formData.goal === 'other' ? formData.customGoal : formData.goal;

      const response = await api.post('/campaigns', {
        projectId: formData.projectId,
        name: formData.campaignName,
        brandName: formData.brandName,
        industry: finalIndustry,
        primaryGoal: finalGoal,
        targetAudience: formData.targetAudience,
        brandVoice: formData.brandVoice === 'other' ? formData.customBrandVoice : formData.brandVoice,
      });

      const { campaign } = response.data;

      if (isDuplicate) {
        toast.success('Relaunching duplicate campaign! Agents are running...');
      } else {
        toast.success('Campaign launched! Agents are running...');
      }
      navigate(`/campaign/${campaign.id}/live`);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      toast.error(error.response?.data?.error || 'Failed to create campaign');
      setIsCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId) {
      toast.error('Please select a project');
      return;
    }

    if (formData.industry === 'other' && !formData.customIndustry.trim()) {
      toast.error('Please specify your industry');
      return;
    }

    if (formData.goal === 'other' && !formData.customGoal.trim()) {
      toast.error('Please specify your goal');
      return;
    }

    const keys = llmSettingsService.get();
    const hasKeys = !!(keys.gemini.key.trim() || keys.groq.key.trim() || keys.openai.key.trim());
    if (!hasKeys) {
      const proceed = window.confirm(
        "You haven't configured any custom API keys in Settings > API Keys. The campaign will run using the server's default fallback keys. Do you want to proceed?"
      );
      if (!proceed) {
        return;
      }
    }

    const finalIndustry = formData.industry === 'other' ? formData.customIndustry : formData.industry;
    const finalGoal = formData.goal === 'other' ? formData.customGoal : formData.goal;

    const hasDuplicate = projectCampaigns.some((c: any) => 
      c.name === formData.campaignName &&
      c.brandName === formData.brandName &&
      c.industry === finalIndustry &&
      c.primaryGoal === finalGoal &&
      c.targetAudience === formData.targetAudience &&
      c.brandVoice === formData.brandVoice
    );

    if (hasDuplicate) {
      setShowDuplicateModal(true);
      return;
    }

    await executeSubmission();
  };

  if (loadingConstants) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="animate-spin text-[#6366F1]" />
      </div>
    );
  }

  if (!constants) {
    return (
      <div className="text-center py-8">
        <p style={{ color: '#8B8B9E' }}>Failed to load form options. Please refresh the page.</p>
      </div>
    );
  }

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
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.3s ease-out;
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
                disabled={loadingProjects || isCreating}
              >
                <option value="">{loadingProjects ? 'Loading projects...' : 'Select a project...'}</option>
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
                onChange={(e) => setFormData({ ...formData, industry: e.target.value, customIndustry: '' })}
                className="w-full rounded-lg px-3 py-2 text-sm border cursor-pointer transition-all"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <option value="">Select industry...</option>
                {constants.industries.map((industry) => (
                  <option key={industry.value} value={industry.value}>
                    {industry.label}
                  </option>
                ))}
              </select>
              {formData.industry === 'other' && (
                <input
                  ref={customIndustryRef}
                  type="text"
                  required
                  value={formData.customIndustry}
                  onChange={(e) => setFormData({ ...formData, customIndustry: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm border transition-all animate-fadeIn"
                  placeholder="Enter your industry..."
                  style={{ fontFamily: 'Sora, sans-serif' }}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                Primary Goal
              </label>
              <select
                required
                value={formData.goal}
                onChange={(e) => setFormData({ ...formData, goal: e.target.value, customGoal: '' })}
                className="w-full rounded-lg px-3 py-2 text-sm border cursor-pointer transition-all"
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                <option value="">Select goal...</option>
                {constants.primaryGoals.map((goal) => (
                  <option key={goal.value} value={goal.value}>
                    {goal.label}
                  </option>
                ))}
              </select>
              {formData.goal === 'other' && (
                <input
                  ref={customGoalRef}
                  type="text"
                  required
                  value={formData.customGoal}
                  onChange={(e) => setFormData({ ...formData, customGoal: e.target.value })}
                  className="w-full rounded-lg px-3 py-2 text-sm border transition-all animate-fadeIn"
                  placeholder="Enter your goal..."
                  style={{ fontFamily: 'Sora, sans-serif' }}
                />
              )}
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
            {constants.brandVoices.map((voice) => {
              const IconComponent = VOICE_ICONS[voice.value] || Briefcase;
              return (
                <label key={voice.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="brand_voice"
                    value={voice.value}
                    checked={formData.brandVoice === voice.value}
                    onChange={(e) => setFormData({ ...formData, brandVoice: e.target.value })}
                    className="sr-only peer"
                  />
                  <div className="p-3 rounded-lg border border-[#2A2A38] bg-[#131318] peer-checked:border-[#c0c1ff] peer-checked:bg-[rgba(192,193,255,0.05)] transition-all hover:border-[#464554] text-center flex flex-col items-center gap-2">
                    <IconComponent size={20} className="text-[#c0c1ff]" />
                    <span className="text-xs font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                      {voice.label}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        {formData.brandVoice === 'other' && (
          <div className="mt-4 space-y-2 animate-fadeIn">
            <label className="block text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
              Custom Brand Voice
            </label>
            <input
              ref={customBrandVoiceRef}
              type="text"
              required
              value={formData.customBrandVoice}
              onChange={(e) => setFormData({ ...formData, customBrandVoice: e.target.value })}
              className="w-full rounded-lg px-3 py-2 text-sm border transition-all"
              placeholder="Enter your custom brand voice (e.g., Witty, Sarcastic)..."
              style={{ fontFamily: 'Sora, sans-serif' }}
            />
          </div>
        )}
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
            disabled={isCreating}
            className="px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: '#6366F1', color: '#F1F1F3' }}
            onMouseEnter={(e) => !isCreating && (e.currentTarget.style.backgroundColor = '#8083ff')}
            onMouseLeave={(e) => !isCreating && (e.currentTarget.style.backgroundColor = '#6366F1')}
            onTouchStart={(e) => !isCreating && (e.currentTarget.style.backgroundColor = '#8083ff')}
            onTouchEnd={(e) => !isCreating && (e.currentTarget.style.backgroundColor = '#6366F1')}
            onTouchCancel={(e) => !isCreating && (e.currentTarget.style.backgroundColor = '#6366F1')}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Launching Agents...
              </>
            ) : (
              <>
                <Zap size={16} />
                Launch Campaign
              </>
            )}
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

      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setShowDuplicateModal(false)}
          />
          <div
            className="relative bg-[#111116] border border-[#2B2B36] p-8 rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in-95"
            style={{
              background: 'linear-gradient(180deg, #16161D 0%, #111116 100%)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.05)'
            }}
          >
            <div className="flex flex-col items-center text-center mb-6">
              <div className="h-16 w-16 bg-[#FFB020]/10 rounded-full flex items-center justify-center mb-4 ring-8 ring-[#FFB020]/5">
                <AlertTriangle className="text-[#FFB020]" size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2 font-display tracking-tight">Duplicate Detected</h3>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">
                You have already generated a campaign with these exact details. Do you want to relaunch a new campaign anyway?
              </p>
            </div>
            
            <div className="flex space-x-3 w-full mt-8">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="flex-1 px-4 py-3 bg-[#1C1C24] hover:bg-[#252530] text-[#E4E4E7] font-medium rounded-xl transition-all duration-200 border border-[#2B2B36] hover:border-[#3F3F4E]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDuplicateModal(false);
                  await executeSubmission(true);
                }}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5355D1] hover:to-[#7A4DD6] text-white font-medium rounded-xl transition-all duration-200 shadow-lg shadow-[#6366F1]/20 flex items-center justify-center"
              >
                Yes, Relaunch
              </button>
            </div>
          </div>
        </div>
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
