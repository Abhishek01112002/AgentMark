/**
 * CampaignLivePage — Real-time agent progress via socket.io
 *
 * Connects to the Express WebSocket server on mount, joins the campaign-specific
 * room, and listens for three event types:
 *   - agent_update       → tick off agent progress in the pipeline UI
 *   - campaign_complete  → auto-redirect to /result after 2 s
 *   - campaign_failed    → show error state
 *   - human_approval_required → show human review modal
 *
 * Agent name mapping (FastAPI → Frontend display):
 *   manager, research, strategy, copywriter, image_prompt, reviewer, publisher
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import Sidebar, { SidebarProvider } from '../../../../shared/sidebar/Sidebar';
import TopNav from '../../../../shared/topNav/TopNav';
import api from '../../../../../services/api';
import toast from 'react-hot-toast';

// ── Module-level constants (stable across renders) ────────────────────────────

/** Typewriter strings — module level so the typewriter useEffect has a stable dep. */
const TYPEWRITER_STRINGS = [
  'Drafting introduction paragraph based on Hook 2...',
  'Optimizing sentence length for readability...',
  'Injecting brand voice variables...',
  'Cross-referencing compliance guidelines...',
  'Generating Twitter variant sequence...',
  'Building LinkedIn thought-leadership post...',
];

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentStatus = 'completed' | 'running' | 'pending' | 'failed';

interface Agent {
  id: number;
  /** Matches the FastAPI `agent` field in Redis event payloads */
  key: string;
  name: string;
  status: AgentStatus;
  description: string;
  duration?: string;
}

interface AgentUpdatePayload {
  campaign_id: string;
  agent: string;
  status: string;
  error?: string | null;
  timestamp: string;
}

// ── Initial agent pipeline definition ─────────────────────────────────────────

const INITIAL_AGENTS: Agent[] = [
  { id: 1, key: 'manager',     name: 'Manager Agent',      status: 'running',  description: 'Orchestrating campaign sequence...' },
  { id: 2, key: 'research',    name: 'Research Agent',     status: 'pending',  description: 'Awaiting Manager...' },
  { id: 3, key: 'strategy',    name: 'Strategy Agent',     status: 'pending',  description: 'Awaiting Research...' },
  { id: 4, key: 'copywriter',  name: 'Copywriter Agent',   status: 'pending',  description: 'Awaiting Strategy...' },
  { id: 5, key: 'image_prompt',name: 'Image Prompt Agent', status: 'pending',  description: 'Awaiting Copywriter...' },
  { id: 6, key: 'reviewer',    name: 'Reviewer Agent',     status: 'pending',  description: 'Awaiting Image Prompt...' },
  { id: 7, key: 'publisher',   name: 'Publisher Agent',    status: 'pending',  description: 'Awaiting Human Approval' },
];

/** Description shown when an agent transitions to "running" */
const RUNNING_DESCRIPTIONS: Record<string, string> = {
  manager:      'Orchestrating campaign sequence...',
  research:     'Analysing market and competitors...',
  strategy:     'Defining angles and hooks...',
  copywriter:   'Drafting ad copy variants...',
  image_prompt: 'Generating visual prompts...',
  reviewer:     'Evaluating content quality...',
  publisher:    'Publishing final deliverables...',
};

/** Description shown when an agent transitions to "completed" */
const DONE_DESCRIPTIONS: Record<string, string> = {
  manager:      'Orchestration complete',
  research:     'Competitor analysis done',
  strategy:     'Angles and hooks defined',
  copywriter:   'Content drafts completed',
  image_prompt: 'Visual prompts generated',
  reviewer:     'Quality evaluation done',
  publisher:    'Campaign published',
};

// ── Component ─────────────────────────────────────────────────────────────────

const CampaignLivePage: React.FC = () => {
  const navigate = useNavigate();
  const { campaignId } = useParams<{ campaignId: string }>();

  const [agents, setAgents] = useState<Agent[]>(INITIAL_AGENTS);
  const [showHumanReview, setShowHumanReview] = useState(false);
  const [campaignFailed, setCampaignFailed] = useState(false);
  const [failedError, setFailedError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  
  // HITL Modal State
  const [selectedAgent, setSelectedAgent] = useState<string>('copywriter');
  const [revisionFeedback, setRevisionFeedback] = useState<string>('');
  const [revisionCounts, setRevisionCounts] = useState({
    research: 0,
    strategy: 0,
    copywriter: 0,
    image_prompt: 0,
  });
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [agentScores, setAgentScores] = useState<{
    research: number | null;
    strategy: number | null;
    copywriter: number | null;
    image_prompt: number | null;
  }>({ research: null, strategy: null, copywriter: null, image_prompt: null });
  const [reviewerCompleted, setReviewerCompleted] = useState(false);

  const [typewriterText, setTypewriterText] = useState('');
  const [currentStringIndex, setCurrentStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  // Track when the page was mounted so we can compute elapsed durations.
  const pageStartTimeRef = useRef(Date.now());

  const socketRef = useRef<Socket | null>(null);
  const projectIdRef = useRef<string>('');

  useEffect(() => {
    if (!campaignId) return;

    const checkCampaignStatus = async () => {
      try {
        const response = await api.get(`/campaigns/${campaignId}`);
        const { campaign } = response.data;
        if (campaign) {
          projectIdRef.current = campaign.projectId;
          
          if (campaign.status === 'completed') {
            navigate(`/campaign/${campaignId}/result?projectId=${campaign.projectId}`);
          } else if (campaign.status === 'failed') {
            setCampaignFailed(true);
            setFailedError(campaign.aiError || 'Campaign failed during processing.');
          } else if (campaign.status === 'awaiting_human_approval') {
            setShowHumanReview(true);
            setRevisionCounts({
              research: campaign.researchRevisionCount || 0,
              strategy: campaign.strategyRevisionCount || 0,
              copywriter: campaign.copyRevisionCount || 0,
              image_prompt: campaign.imageRevisionCount || 0,
            });
            if (campaign.reviewScore) setQualityScore(campaign.reviewScore);
            
            // Extract individual agent scores from reviewOutput
            if (campaign.reviewOutput) {
              try {
                const reviewData = JSON.parse(campaign.reviewOutput);
                setAgentScores({
                  research: reviewData.research_review?.score ? reviewData.research_review.score / 10 : null,
                  strategy: reviewData.strategy_review?.score ? reviewData.strategy_review.score / 10 : null,
                  copywriter: reviewData.copy_review?.score ? reviewData.copy_review.score / 10 : null,
                  image_prompt: reviewData.image_review?.score ? reviewData.image_review.score / 10 : null,
                });
              } catch (e) {
                console.error('Failed to parse reviewOutput for agent scores:', e);
              }
            }
            setAgents((prev) =>
              prev.map((a) => {
                if (a.key === 'reviewer') return { ...a, status: 'completed', description: 'Quality evaluation done' };
                if (a.key === 'publisher') return { ...a, status: 'pending', description: 'Awaiting human approval' };
                return { ...a, status: 'completed' };
              })
            );
          }
        }
      } catch (error) {
        console.error('Failed to fetch campaign status on mount:', error);
      }
    };

    checkCampaignStatus();
  }, [campaignId, navigate]);

  const progress = (agents.filter((a) => a.status === 'completed').length / agents.length) * 100;
  const activeAgent = agents.find((a) => a.status === 'running');

  // ── Socket.io connection ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!campaignId) return;

    // Port must match backend PORT in .env (5003).
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5003';

    // Pass JWT so the server can verify ownership before joining the room.
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      auth: { token },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_campaign', campaignId);
      console.log('[Socket.io] Connected | campaign=', campaignId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket.io] Disconnected');
    });

    // Server-side auth rejection (invalid token / wrong user)
    socket.on('error', (err: { message: string }) => {
      console.warn('[Socket.io] Server error:', err.message);
      setCampaignFailed(true);
      setFailedError(err.message || 'Connection refused by server.');
    });

    // ── Agent progress tick ──────────────────────────────────────────────────
    socket.on('agent_update', (data: AgentUpdatePayload) => {
      const { agent: agentKey, status } = data;
      console.log('[Socket.io] agent_update | agent=', agentKey, '| status=', status);

      // Track when reviewer completes to show quality score
      if (agentKey === 'reviewer' && status === 'completed') {
        setReviewerCompleted(true);
      }

      if (status === 'completed' || status === 'running' || status === 'failed') {
        setAgents((prev) => {
          const updated = prev.map((a) => {
            if (a.key !== agentKey) return a;
            if (status === 'completed') {
              return {
                ...a,
                status: 'completed' as AgentStatus,
                description: DONE_DESCRIPTIONS[agentKey] ?? 'Completed',
                duration: formatDuration(pageStartTimeRef.current),
              };
            }
            if (status === 'failed') {
              return {
                ...a,
                status: 'failed' as AgentStatus,
                description: data.error ?? 'Agent failed',
              };
            }
            return {
              ...a,
              status: 'running' as AgentStatus,
              description: RUNNING_DESCRIPTIONS[agentKey] ?? 'Processing...',
            };
          });

          // When an agent completes, mark the next pending agent as running.
          if (status === 'completed') {
            const completedIdx = updated.findIndex((a) => a.key === agentKey);
            const nextPendingIdx = updated.findIndex(
              (a, i) => i > completedIdx && a.status === 'pending'
            );
            if (nextPendingIdx !== -1 && updated[completedIdx].key !== 'reviewer') {
              updated[nextPendingIdx] = {
                ...updated[nextPendingIdx],
                status: 'running',
                description: RUNNING_DESCRIPTIONS[updated[nextPendingIdx].key] ?? 'Processing...',
              };
            }
          }

          return updated;
        });
      }
    });

    // ── Human approval required ──────────────────────────────────────────────
    socket.on('human_approval_required', async () => {
      setShowHumanReview(true);
      // Fetch latest campaign data to get revision counts
      try {
        const response = await api.get(`/campaigns/${campaignId}`);
        const { campaign } = response.data;
        if (campaign) {
          setRevisionCounts({
            research: campaign.researchRevisionCount || 0,
            strategy: campaign.strategyRevisionCount || 0,
            copywriter: campaign.copyRevisionCount || 0,
            image_prompt: campaign.imageRevisionCount || 0,
          });
          if (campaign.reviewScore) setQualityScore(campaign.reviewScore);
          
          // Extract individual agent scores from reviewOutput
          if (campaign.reviewOutput) {
            try {
              const reviewData = JSON.parse(campaign.reviewOutput);
              setAgentScores({
                research: reviewData.research_review?.score ? reviewData.research_review.score / 10 : null,
                strategy: reviewData.strategy_review?.score ? reviewData.strategy_review.score / 10 : null,
                copywriter: reviewData.copy_review?.score ? reviewData.copy_review.score / 10 : null,
                image_prompt: reviewData.image_review?.score ? reviewData.image_review.score / 10 : null,
              });
            } catch (e) {
              console.error('Failed to parse reviewOutput for agent scores:', e);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch revision counts:', error);
      }
      // Mark reviewer as completed and publisher as pending (awaiting approval).
      setAgents((prev) =>
        prev.map((a) => {
          if (a.key === 'reviewer') return { ...a, status: 'completed', description: 'Quality evaluation done' };
          if (a.key === 'publisher') return { ...a, status: 'pending', description: 'Awaiting human approval' };
          return a;
        })
      );
    });

    // ── Campaign complete ────────────────────────────────────────────────────
    socket.on('campaign_complete', () => {
      console.log('[Socket.io] Campaign complete — navigating to result');
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          status: 'completed' as AgentStatus,
          description: DONE_DESCRIPTIONS[a.key] ?? 'Completed',
        }))
      );
      setTimeout(() => navigate(`/campaign/${campaignId}/result?projectId=${projectIdRef.current}`), 2000);
    });

    // ── Campaign failed ──────────────────────────────────────────────────────
    socket.on('campaign_failed', (data: AgentUpdatePayload) => {
      console.error('[Socket.io] Campaign failed | error=', data.error);
      setCampaignFailed(true);
      setFailedError(data.error ?? 'An unexpected error occurred.');
    });

    return () => {
      socket.emit('leave_campaign', campaignId);
      socket.disconnect();
    };
  }, [campaignId, navigate]);

  // ── Human review handlers ────────────────────────────────────────────────────

  const handleApprove = async () => {
    try {
      setShowHumanReview(false);
      setAgents((prev) =>
        prev.map((a) =>
          a.key === 'publisher'
            ? { ...a, status: 'running', description: 'Publishing final deliverables...' }
            : a
        )
      );
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'approve',
      });
      toast.success('Campaign approved! Resuming publisher...');
    } catch (error) {
      console.error('Failed to submit approval:', error);
      toast.error('Failed to submit approval decision');
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionFeedback.trim()) {
      toast.error('Please provide feedback for the revision');
      return;
    }
    
    try {
      setShowHumanReview(false);
      
      // Determine which agents will re-run based on the selected agent
      const agentsToReRun: string[] = [selectedAgent];
      
      // Add downstream agents that depend on the selected agent
      if (selectedAgent === 'research') {
        agentsToReRun.push('strategy', 'copywriter', 'image_prompt', 'reviewer');
      } else if (selectedAgent === 'strategy') {
        agentsToReRun.push('copywriter', 'image_prompt', 'reviewer');
      } else if (selectedAgent === 'copywriter') {
        agentsToReRun.push('image_prompt', 'reviewer');
      } else if (selectedAgent === 'image_prompt') {
        agentsToReRun.push('reviewer');
      }
      
      // Reset all affected agents to show they're re-running
      setAgents((prev) =>
        prev.map((a) => {
          if (a.key === selectedAgent) {
            return { ...a, status: 'running', description: 'Revising based on feedback...', duration: undefined };
          } else if (agentsToReRun.includes(a.key)) {
            return { ...a, status: 'pending', description: 'Will re-run with new data...', duration: undefined };
          }
          return a;
        })
      );
      
      await api.post(`/campaigns/${campaignId}/approve`, {
        action: 'reject',
        revisionTarget: selectedAgent,
        feedback: revisionFeedback,
      });
      
      toast.success(`Revision requested! ${agentsToReRun.length} agent${agentsToReRun.length > 1 ? 's' : ''} will re-run.`);
      setRevisionFeedback('');
    } catch (error: any) {
      console.error('Failed to request revision:', error);
      toast.error(error.response?.data?.error || 'Failed to submit revision request');
      setShowHumanReview(true);
    }
  };

  // ── Typewriter effect ────────────────────────────────────────────────────────

  useEffect(() => {
    const currentString = TYPEWRITER_STRINGS[currentStringIndex];
    let timeout: number;

    if (isDeleting) {
      if (typewriterText.length > 0) {
        timeout = window.setTimeout(() => {
          setTypewriterText(currentString.substring(0, typewriterText.length - 1));
        }, 30);
      } else {
        setIsDeleting(false);
        setCurrentStringIndex((prev) => (prev + 1) % TYPEWRITER_STRINGS.length);
      }
    } else {
      if (typewriterText.length < currentString.length) {
        timeout = window.setTimeout(() => {
          setTypewriterText(currentString.substring(0, typewriterText.length + 1));
        }, 60);
      } else {
        timeout = window.setTimeout(() => setIsDeleting(true), 2000);
      }
    }

    return () => clearTimeout(timeout);
  }, [typewriterText, isDeleting, currentStringIndex]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        .pulse-dot {
          box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.7);
          animation: pulse-green 2s infinite;
        }
        @keyframes pulse-green {
          0%   { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(78, 222, 163, 0.7); }
          70%  { transform: scale(1);    box-shadow: 0 0 0 6px rgba(78, 222, 163, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(78, 222, 163, 0); }
        }
        .pulse-indigo {
          animation: pulse-indigo-anim 2s infinite;
        }
        @keyframes pulse-indigo-anim {
          0%   { box-shadow: 0 0 0 0 rgba(192, 193, 255, 0.4); }
          70%  { box-shadow: 0 0 0 10px rgba(192, 193, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(192, 193, 255, 0); }
        }
        .campaign-live-main {
          margin-left: 0;
          transition: margin-left 200ms cubic-bezier(0.4,0,0.2,1);
        }
        @media (min-width: 768px) {
          .campaign-live-main {
            margin-left: var(--sidebar-w, 240px);
          }
        }
      `}</style>

      <div className="min-h-screen h-screen flex overflow-hidden" style={{ backgroundColor: '#0e0e13', color: '#F1F1F3' }}>
        <Sidebar />
        <TopNav title="Campaign Live" />

        <main className="campaign-live-main pt-14 flex-1 overflow-hidden" style={{ fontFamily: 'Sora, sans-serif' }}>
          <div className="h-full overflow-y-auto px-3 py-5 sm:px-4 sm:py-6 md:px-6 lg:px-8">
            <div>
              {/* Page Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {campaignFailed ? (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#F43F5E]" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] pulse-dot" />
                    )}
                    <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: campaignFailed ? '#F43F5E' : '#4edea3' }}>
                      {campaignFailed ? 'Campaign Failed' : 'Campaign Running'}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#1f1f25] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                      ID: {campaignId?.slice(0, 8).toUpperCase()}
                    </span>
                    {/* Socket connection indicator */}
                    <span
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        fontFamily: 'JetBrains Mono, monospace',
                        backgroundColor: isConnected ? 'rgba(78,222,163,0.1)' : 'rgba(74,74,94,0.2)',
                        color: isConnected ? '#4edea3' : '#4A4A5E',
                      }}
                    >
                      {isConnected ? 'Live' : 'Connecting...'}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                    AI Agents Running
                  </h1>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => navigate(`/campaign/${campaignId}/result`)}
                    className="px-4 py-2 rounded border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1f1f25] flex items-center gap-2"
                    style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}
                  >
                    <XCircle size={16} />
                    View Result
                  </button>
                </div>
              </div>

              {/* Error banner */}
              {campaignFailed && (
                <div className="mb-6 p-4 rounded-lg border border-[#F43F5E]/30 bg-[#F43F5E]/10">
                  <p className="text-sm text-[#F43F5E]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Campaign failed: {failedError}
                  </p>
                </div>
              )}

              {/* Grid Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Agent Pipeline */}
                <div className="lg:col-span-4 flex flex-col gap-4">
                  <div className="bg-[#111118] border border-[#2A2A38] rounded-lg p-6 relative">
                    <h2 className="text-xs uppercase tracking-wider mb-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                      Agent Pipeline
                    </h2>

                    {/* Progress bar */}
                    <div className="mb-8">
                      <div className="flex justify-between text-xs mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                        <span style={{ color: '#F1F1F3' }}>Progress</span>
                        <span style={{ color: '#4edea3' }}>{Math.round(progress)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-[#2a292f] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#4edea3] rounded-full transition-all duration-700"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
                        {agents.filter((a) => a.status === 'completed').length} / {agents.length} agents complete
                      </div>
                    </div>

                    {/* Pipeline list */}
                    <div className="relative">
                      <div className="absolute left-[15px] top-4 bottom-4 w-[1px] border-l border-dashed border-[#2A2A38] z-0" />

                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          className={`relative z-10 flex items-start mb-6 last:mb-0 ${
                            agent.status === 'running'
                              ? 'bg-[#1b1b20] -mx-4 px-4 py-3 rounded-lg border-l-2 border-l-[#c0c1ff] pulse-indigo'
                              : ''
                          } ${agent.status === 'pending' ? 'opacity-60 grayscale' : ''}`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                              agent.status === 'completed'
                                ? 'bg-[#4edea3]/10 border border-[#4edea3] text-[#4edea3] shadow-[0_0_10px_rgba(78,222,163,0.1)]'
                                : agent.status === 'running'
                                ? 'bg-[#c0c1ff]/20 border border-[#c0c1ff] text-[#c0c1ff]'
                                : agent.status === 'failed'
                                ? 'bg-[#F43F5E]/10 border border-[#F43F5E] text-[#F43F5E]'
                                : 'bg-[#1f1f25] border border-[#2A2A38] text-[#4A4A5E]'
                            }`}
                          >
                            {agent.status === 'completed' && <CheckCircle size={16} />}
                            {agent.status === 'running'   && <Loader2 size={16} className="animate-spin" />}
                            {agent.status === 'failed'    && <XCircle size={16} />}
                            {agent.status === 'pending'   && <span className="text-xs">•</span>}
                          </div>

                          <div className="ml-4 flex-1 min-w-0">
                            <div className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: agent.status === 'running' ? '#c0c1ff' : '#F1F1F3' }}>
                              {agent.name}
                            </div>
                            <div className="text-xs mt-0.5" style={{ fontFamily: 'Sora, sans-serif', color: agent.status === 'running' ? '#8B8B9E' : '#4A4A5E' }}>
                              {agent.description}
                            </div>
                          </div>

                          {agent.duration && (
                            <div className="ml-auto text-xs mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                              {agent.duration}
                            </div>
                          )}
                          {agent.status === 'running' && (
                            <div className="ml-auto flex items-center text-xs mt-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#c0c1ff] animate-pulse mr-2" />
                              Running
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Live Reasoning */}
                <div className="lg:col-span-8 flex flex-col h-[700px]">
                  <div className="bg-[#111118] border border-[#2A2A38] rounded-lg flex flex-col h-full overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-[#2A2A38] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#1b1b20]">
                      <div className="flex items-center gap-3">
                        <span className="text-[#c0c1ff]">▶</span>
                        <h3 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                          Live Reasoning Panel
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 bg-[#111118] px-3 py-1.5 rounded-full border border-[#2A2A38]">
                        <span className="w-2 h-2 rounded-full bg-[#c0c1ff] animate-pulse" />
                        <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                          {activeAgent ? `${activeAgent.name} Active` : 'Waiting...'}
                        </span>
                      </div>
                    </div>

                    {/* Terminal content */}
                    <div className="flex-1 p-6 text-xs font-mono overflow-y-auto space-y-4 bg-[#0A0A0F]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                      <div style={{ color: '#4A4A5E' }}>System: Initialising multi-agent pipeline...</div>
                      <div style={{ color: '#4A4A5E' }}>System: Redis Pub/Sub channel active — {campaignId}</div>
                      <div style={{ color: '#4edea3' }}>&gt; Socket.io connected. Receiving real-time updates.</div>

                      {agents.filter((a) => a.status === 'completed').map((a) => (
                        <div key={a.key} style={{ color: '#4edea3' }}>
                          &#x2713; {a.name}: {a.description}
                        </div>
                      ))}

                      {activeAgent && (
                        <>
                          <div style={{ color: '#c0c1ff' }}>&gt; {activeAgent.name} is running...</div>
                          <div className="mt-4 flex">
                            <span className="mr-2" style={{ color: '#c0c1ff' }}>&gt;</span>
                            <span style={{ color: '#F1F1F3' }}>{typewriterText}</span>
                            <span className="w-2 h-4 bg-[#c0c1ff] ml-1 animate-pulse inline-block align-middle mt-[2px]" />
                          </div>
                        </>
                      )}

                      {campaignFailed && (
                        <div style={{ color: '#F43F5E' }}>
                          &#x2717; Campaign failed: {failedError}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-[#2A2A38] bg-[#1b1b20] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Loader2 size={16} className="text-[#4A4A5E] animate-spin" />
                        <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                          {activeAgent ? `${activeAgent.name} processing...` : campaignFailed ? 'Campaign stopped' : 'All agents complete'}
                        </span>
                      </div>
                      <div className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                        Agents: <span style={{ color: '#F1F1F3' }}>{agents.filter((a) => a.status === 'completed').length}</span> / {agents.length} done
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Human Review Modal */}
        {showHumanReview && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#111118] border border-[#c0c1ff]/30 rounded-2xl p-8 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-[#c0c1ff]/10 ring-4 ring-[#c0c1ff]/20 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-[32px] text-[#c0c1ff]" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                </div>
                <h2 className="text-[20px] font-bold text-[#F1F1F3] mb-2" style={{ fontFamily: 'Sora, sans-serif' }}>Human Review Required</h2>
                <p className="text-sm text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  The generated content has passed automated checks but requires final human approval before publishing.
                </p>
              </div>

              <div className="bg-[#1b1b20] rounded-xl p-4 mb-6 border border-[#2A2A38] flex items-center justify-between">
                <div className="text-sm font-medium text-[#F1F1F3]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Overall Quality</div>
                <div className="text-[40px] leading-none text-[#4edea3]" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700 }}>
                  {qualityScore !== null ? (
                    <>{qualityScore.toFixed(1)}<span className="text-lg text-[#4A4A5E]">/10</span></>
                  ) : reviewerCompleted ? (
                    <span className="text-2xl text-[#8B8B9E]">Calculating...</span>
                  ) : (
                    <span className="text-2xl text-[#8B8B9E]">Reviewing...</span>
                  )}
                </div>
              </div>

              {/* Individual Agent Quality Scores */}
              <div className="bg-[#1b1b20] rounded-xl p-4 mb-6 border border-[#2A2A38]">
                <h3 className="text-sm font-medium text-[#F1F1F3] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Agent Quality Scores:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'research', label: 'Research' },
                    { key: 'strategy', label: 'Strategy' },
                    { key: 'copywriter', label: 'Copywriter' },
                    { key: 'image_prompt', label: 'Image Prompt' },
                  ].map(({ key, label }) => {
                    const score = agentScores[key as keyof typeof agentScores];
                    const getScoreColor = (s: number | null) => {
                      if (s === null) return '#4A4A5E';
                      if (s >= 8.5) return '#4edea3';
                      if (s >= 7.5) return '#FFA500';
                      return '#F43F5E';
                    };
                    const scoreColor = getScoreColor(score);
                    return (
                      <div key={key} className="flex items-center justify-between bg-[#111118] px-3 py-2 rounded border border-[#2A2A38]">
                        <span className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>{label}</span>
                        <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: scoreColor }}>
                          {score !== null ? `${score.toFixed(1)}/10` : '—'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[#4A4A5E] mt-3" style={{ fontFamily: 'Sora, sans-serif' }}>
                  💡 Tip: Revise agents with lower scores for maximum improvement
                </p>
              </div>

              {/* Agent Revision Counters */}
              <div className="bg-[#1b1b20] rounded-xl p-4 mb-6 border border-[#2A2A38]">
                <h3 className="text-sm font-medium text-[#F1F1F3] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Agent Revisions:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(revisionCounts).map(([key, count]) => {
                    const MAX = 3;
                    const isMax = count >= MAX;
                    const isWarning = count === MAX - 1;
                    const label = key === 'copywriter' ? 'Copywriter' : key === 'image_prompt' ? 'Image Prompt' : key.charAt(0).toUpperCase() + key.slice(1);
                    return (
                      <div key={key} className="flex items-center justify-between bg-[#111118] px-3 py-2 rounded border border-[#2A2A38]">
                        <span className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>{label}</span>
                        <span className={`text-xs font-bold ${
                          isMax ? 'text-[#F43F5E]' : isWarning ? 'text-[#FFA500]' : 'text-[#4edea3]'
                        }`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {count}/{MAX} {isMax ? '🚫' : isWarning ? '⚠️' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Agent Selection Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#F1F1F3] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Select Agent to Revise:
                </label>
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="w-full bg-[#1b1b20] border border-[#2A2A38] rounded-lg px-4 py-3 text-[#F1F1F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#c0c1ff]"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                >
                  <option value="research" disabled={revisionCounts.research >= 3}>Research Agent ({revisionCounts.research}/3){revisionCounts.research >= 3 ? ' - MAX' : ''}</option>
                  <option value="strategy" disabled={revisionCounts.strategy >= 3}>Strategy Agent ({revisionCounts.strategy}/3){revisionCounts.strategy >= 3 ? ' - MAX' : ''}</option>
                  <option value="copywriter" disabled={revisionCounts.copywriter >= 3}>Copywriter Agent ({revisionCounts.copywriter}/3){revisionCounts.copywriter >= 3 ? ' - MAX' : ''}</option>
                  <option value="image_prompt" disabled={revisionCounts.image_prompt >= 3}>Image Prompt Agent ({revisionCounts.image_prompt}/3){revisionCounts.image_prompt >= 3 ? ' - MAX' : ''}</option>
                </select>
                
                {/* Downstream Impact Warning */}
                {selectedAgent && (
                  <div className="mt-3 p-3 bg-[#111118] border border-[#c0c1ff]/20 rounded-lg">
                    <p className="text-xs font-medium text-[#c0c1ff] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      ⚠️ Downstream Impact:
                    </p>
                    <p className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {selectedAgent === 'research' && 'Research → Strategy, Copywriter, Image Prompt, and Reviewer will all re-run with new data.'}
                      {selectedAgent === 'strategy' && 'Strategy → Copywriter, Image Prompt, and Reviewer will re-run with updated strategy.'}
                      {selectedAgent === 'copywriter' && 'Copywriter → Image Prompt and Reviewer will re-run with new copy.'}
                      {selectedAgent === 'image_prompt' && 'Image Prompt → Only Reviewer will re-evaluate the new visuals.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Feedback Textarea */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[#F1F1F3] mb-2" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Feedback for Revision:
                </label>
                <textarea
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="Explain what needs to change..."
                  rows={4}
                  className="w-full bg-[#1b1b20] border border-[#2A2A38] rounded-lg px-4 py-3 text-[#F1F1F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#c0c1ff] resize-none"
                  style={{ fontFamily: 'Sora, sans-serif' }}
                />
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-medium text-[#F1F1F3] mb-3" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Reviewer Notes:</h3>
                <ul className="space-y-3">
                  <li className="flex items-start text-[#8B8B9E] text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#c0c1ff] mr-2 shrink-0 mt-0.5">info</span>
                    <span>Content matches target audience intent and brand voice guidelines.</span>
                  </li>
                  <li className="flex items-start text-[#8B8B9E] text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span className="material-symbols-outlined text-[18px] text-[#c0c1ff] mr-2 shrink-0 mt-0.5">info</span>
                    <span>Character count optimized for all selected platforms.</span>
                  </li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={handleRequestRevision}
                  disabled={revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3}
                  className="flex-1 py-3 px-4 rounded-lg border border-[#F43F5E] text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  Request Revision
                </button>
                <button
                  onClick={handleApprove}
                  className="flex-1 py-3 px-4 rounded-lg bg-[#c0c1ff] text-[#0e0e13] hover:bg-[#a8a9ff] transition-colors text-sm font-bold flex items-center justify-center space-x-2"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>Approve &amp; Publish</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a human-readable elapsed time string (e.g. "1m 23s") representing
 * the time elapsed since the page was mounted (i.e. since the campaign was launched).
 *
 * @param pageStartMs - `Date.now()` captured at component mount (from pageStartTimeRef).
 */
function formatDuration(pageStartMs: number): string {
  const elapsedSeconds = Math.round((Date.now() - pageStartMs) / 1000);
  if (elapsedSeconds < 60) return `${elapsedSeconds}s`;
  const m = Math.floor(elapsedSeconds / 60);
  const s = elapsedSeconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

// ── Provider wrapper ──────────────────────────────────────────────────────────

const CampaignLivePageWithProvider: React.FC = () => (
  <SidebarProvider>
    <CampaignLivePage />
  </SidebarProvider>
);

export default CampaignLivePageWithProvider;