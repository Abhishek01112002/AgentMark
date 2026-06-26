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
  const [isMinimized, setIsMinimized] = useState(false);

  // Automatically expand the drawer when human review is requested or toggled
  useEffect(() => {
    if (showHumanReview) {
      setIsMinimized(false);
    }
  }, [showHumanReview]);

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

  const [drawerTab, setDrawerTab] = useState<'scores' | 'inspect' | 'revise'>('scores');
  const [campaignPreviewData, setCampaignPreviewData] = useState<any>(null);
  const [reviewerNotes, setReviewerNotes] = useState<{ feedback: string; issues: string[] } | null>(null);

  // Memoize parsed campaign outputs to avoid redundant JSON.parse calls in render path
  const parsedPreviewOutputs = React.useMemo(() => {
    if (!campaignPreviewData) return null;
    const getOutputField = (field: string) => {
      const outputs = campaignPreviewData.aiOutputs || {};
      const val = outputs[field];
      if (val) {
        if (typeof val === 'string') {
          try { return JSON.parse(val); } catch { return val; }
        }
        return val;
      }
      const directVal = (campaignPreviewData as any)[field];
      if (directVal) {
        if (typeof directVal === 'string') {
          try { return JSON.parse(directVal); } catch { return directVal; }
        }
        return directVal;
      }
      return null;
    };

    return {
      copyData: getOutputField('copy_output') || getOutputField('copyOutput'),
      strategyData: getOutputField('strategy_output') || getOutputField('strategyOutput'),
      imageData: getOutputField('image_output') || getOutputField('imageOutput'),
      managerData: getOutputField('manager_output') || getOutputField('managerOutput'),
    };
  }, [campaignPreviewData]);

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
            setShowHumanReview(false);
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
                // Extract reviewer notes for the drawer
                const overallReview = reviewData.overall || {};
                setReviewerNotes({
                  feedback: overallReview.summary || reviewData.copy_review?.feedback || '',
                  issues: [
                    ...(reviewData.copy_review?.action_items || []),
                    ...(reviewData.image_review?.action_items || []),
                  ].slice(0, 4),
                });
              } catch (e) {
                console.error('Failed to parse reviewOutput for agent scores:', e);
              }
            }
            // Store full campaign data for draft preview
            setCampaignPreviewData(campaign);
            setAgents((prev) =>
              prev.map((a) => {
                if (a.key === 'reviewer') return { ...a, status: 'completed', description: 'Quality evaluation done' };
                if (a.key === 'publisher') return { ...a, status: 'pending', description: 'Awaiting human approval' };
                return { ...a, status: 'completed' };
              })
            );
          } else if (campaign.status === 'processing') {
            // Restore pipeline progress status from campaign.aiOutputs completed_agents/active_agent
            const outputs = campaign.aiOutputs || {};
            const completedAgents = outputs.completed_agents || [];
            const activeAgentKey = outputs.active_agent || null;

            setAgents((prev) =>
              prev.map((a) => {
                if (completedAgents.includes(a.key)) {
                  return {
                    ...a,
                    status: 'completed',
                    description: DONE_DESCRIPTIONS[a.key] ?? 'Completed',
                  };
                }
                if (a.key === activeAgentKey) {
                  return {
                    ...a,
                    status: 'running',
                    description: RUNNING_DESCRIPTIONS[a.key] ?? 'Processing...',
                  };
                }
                
                // If the agent is pending but is upstream of the active agent, mark as completed
                const pipelineKeys = ['manager', 'research', 'strategy', 'copywriter', 'image_prompt', 'reviewer', 'publisher'];
                const activeIdx = pipelineKeys.indexOf(activeAgentKey || '');
                const currentIdx = pipelineKeys.indexOf(a.key);
                if (activeIdx !== -1 && currentIdx !== -1 && currentIdx < activeIdx) {
                  return {
                    ...a,
                    status: 'completed',
                    description: DONE_DESCRIPTIONS[a.key] ?? 'Completed',
                  };
                }

                return a;
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

    // Port must match backend PORT in .env (5001).
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

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
      
      // Mark reviewer as completed and publisher as pending (awaiting approval) immediately
      // to update the pipeline view and stop the typewriter animation instantly.
      setAgents((prev) =>
        prev.map((a) => {
          if (a.key === 'reviewer') return { ...a, status: 'completed', description: 'Quality evaluation done' };
          if (a.key === 'publisher') return { ...a, status: 'pending', description: 'Awaiting human approval' };
          return { ...a, status: 'completed' };
        })
      );

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
              const overallReview = reviewData.overall || {};
              setReviewerNotes({
                feedback: overallReview.summary || reviewData.copy_review?.feedback || '',
                issues: [
                  ...(reviewData.copy_review?.action_items || []),
                  ...(reviewData.image_review?.action_items || []),
                ].slice(0, 4),
              });
            } catch (e) {
              console.error('Failed to parse reviewOutput for agent scores:', e);
            }
          }
          setCampaignPreviewData(campaign);
        }
      } catch (error) {
        console.error('Failed to fetch revision counts:', error);
      }
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
      setShowHumanReview(false);
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
    if (!activeAgent) {
      if (typewriterText !== '') {
        setTypewriterText('');
      }
      return;
    }
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
  }, [typewriterText, isDeleting, currentStringIndex, activeAgent]);

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
        .inspector-drawer {
          transform: translate3d(100%, 0, 0);
          will-change: transform;
          transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .inspector-drawer.open {
          transform: translate3d(0, 0, 0);
        }
        .drawer-tab-btn {
          position: relative;
          padding: 10px 0;
          font-size: 11px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #4A4A5E;
          cursor: pointer;
          border: none;
          background: none;
          flex: 1;
          transition: color 200ms;
        }
        .drawer-tab-btn.active {
          color: #c0c1ff;
        }
        .drawer-tab-btn.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #c0c1ff;
          border-radius: 2px 2px 0 0;
        }
        .score-ring {
          transition: stroke-dashoffset 800ms cubic-bezier(0.4,0,0.2,1);
        }
        .draft-card {
          transition: border-color 200ms, background-color 200ms;
        }
        .draft-card:hover {
          border-color: rgba(192, 193, 255, 0.3);
          background-color: #13131a;
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

        {/* ── Human Review Inspector Drawer ─────────────────────────────────── */}
        {/* Partial left-side dim overlay — does NOT block interaction with main content */}
        {showHumanReview && !isMinimized && (
          <div
            onClick={() => setIsMinimized(true)}
            className="fixed inset-0 z-[90] cursor-pointer"
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.1) 60%, transparent 100%)' }}
          />
        )}

        {/* "Human Review Required" floating badge — click to toggle minimized/expanded state */}
        {showHumanReview && (
          <div
            onClick={() => {
              if (isMinimized) {
                setIsMinimized(false);
              }
            }}
            className={`fixed bottom-6 z-[95] flex items-center gap-3 px-5 py-3 rounded-full border shadow-2xl backdrop-blur-md select-none transition-all duration-300 ${
              isMinimized 
                ? 'right-6 border-[#4edea3]/40 bg-[#111118]/95 cursor-pointer hover:border-[#4edea3]/70 hover:scale-105' 
                : 'left-1/2 -translate-x-1/2 border-[#c0c1ff]/40 bg-[#111118]/95 cursor-default'
            }`}
            style={{ 
              boxShadow: isMinimized ? '0 0 30px rgba(78,222,163,0.15)' : '0 0 40px rgba(192,193,255,0.15)',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${isMinimized ? 'bg-[#4edea3] animate-ping' : 'bg-[#c0c1ff] animate-pulse'}`} />
            <span className="text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: isMinimized ? '#4edea3' : '#c0c1ff' }}>
              {isMinimized 
                ? 'Review Pending (Click to Expand Panel) ↗' 
                : 'Human Review Required — Click outside to minimize & inspect page'}
            </span>
          </div>
        )}

        {/* Right-side Inspector Drawer */}
        <div
          className={`inspector-drawer fixed top-0 right-0 h-full z-[100] flex flex-col ${
            showHumanReview && !isMinimized ? 'open' : ''
          }`}
          style={{ width: '100%', maxWidth: '480px', background: '#0d0d14', borderLeft: '1px solid rgba(192,193,255,0.15)', boxShadow: '-20px 0 60px rgba(0,0,0,0.6)' }}
        >
          {/* ── Drawer Header ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e2b]" style={{ background: '#0d0d14' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(192,193,255,0.1)', border: '1px solid rgba(192,193,255,0.2)' }}>
                <span className="material-symbols-outlined text-[18px] text-[#4edea3]" style={{ fontVariationSettings: "'FILL' 1" }}>fact_check</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Human-in-the-Loop</p>
                <h2 className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Inspector Panel</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {qualityScore !== null && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold mr-1" style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(78,222,163,0.12)', color: '#4edea3', border: '1px solid rgba(78,222,163,0.25)' }}>
                  {qualityScore.toFixed(1)}/10
                </span>
              )}
              {/* Minimize/Collapse Button */}
              <button 
                onClick={() => setIsMinimized(true)} 
                className="p-1 rounded hover:bg-[#1e1e2b] text-[#8B8B9E] hover:text-[#F1F1F3] transition-colors"
                title="Minimize Inspector Panel"
              >
                <span className="material-symbols-outlined text-[20px] block">keyboard_double_arrow_right</span>
              </button>
            </div>
          </div>

          {/* ── Drawer Tabs ─────────────────────────────────────────────────── */}
          <div className="flex border-b border-[#1e1e2b] px-2">
            <button className={`drawer-tab-btn ${drawerTab === 'scores' ? 'active' : ''}`} onClick={() => setDrawerTab('scores')}>Review Scores</button>
            <button className={`drawer-tab-btn ${drawerTab === 'inspect' ? 'active' : ''}`} onClick={() => setDrawerTab('inspect')}>Inspect Drafts</button>
            <button className={`drawer-tab-btn ${drawerTab === 'revise' ? 'active' : ''}`} onClick={() => setDrawerTab('revise')}>Request Revision</button>
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A38 transparent' }}>

            {/* TAB 1 — Review Scores */}
            {drawerTab === 'scores' && (
              <div className="p-6 space-y-5">

                {/* Overall Score Ring */}
                <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                  <div className="relative flex-shrink-0 w-[88px] h-[88px]">
                    <svg width="88" height="88" viewBox="0 0 88 88">
                      <circle cx="44" cy="44" r="36" fill="none" stroke="#1e1e2b" strokeWidth="8" />
                      <circle
                        cx="44" cy="44" r="36" fill="none"
                        stroke={qualityScore !== null && qualityScore >= 8.5 ? '#4edea3' : qualityScore !== null && qualityScore >= 7 ? '#FFA500' : '#F43F5E'}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 36}`}
                        strokeDashoffset={`${2 * Math.PI * 36 * (1 - (qualityScore ?? 0) / 10)}`}
                        transform="rotate(-90 44 44)"
                        className="score-ring"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                        {qualityScore !== null ? qualityScore.toFixed(1) : '—'}
                      </span>
                      <span className="text-[9px]" style={{ color: '#4A4A5E' }}>/10</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Overall Quality</p>
                    <p className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      {qualityScore !== null && qualityScore >= 8.5
                        ? 'Excellent — content meets all quality benchmarks.'
                        : qualityScore !== null && qualityScore >= 7
                        ? 'Good — minor improvements suggested below.'
                        : qualityScore !== null
                        ? 'Needs revision — review issues before publishing.'
                        : 'Score calculating...'}
                    </p>
                  </div>
                </div>

                {/* Per-Agent Score Bars */}
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1e1e2b' }}>
                  <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Agent Quality Breakdown</p>
                  </div>
                  <div className="p-4 space-y-4" style={{ background: '#0d0d14' }}>
                    {([
                      { key: 'research', label: 'Research', icon: 'search' },
                      { key: 'strategy', label: 'Strategy', icon: 'lightbulb' },
                      { key: 'copywriter', label: 'Copywriter', icon: 'edit_note' },
                      { key: 'image_prompt', label: 'Image Prompt', icon: 'image' },
                    ] as const).map(({ key, label, icon }) => {
                      const score = agentScores[key as keyof typeof agentScores];
                      const pct = score !== null ? (score / 10) * 100 : 0;
                      const color = score === null ? '#4A4A5E' : score >= 8.5 ? '#4edea3' : score >= 7 ? '#FFA500' : '#F43F5E';
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[14px]" style={{ color }}>{icon}</span>
                              <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                            </div>
                            <span className="text-xs font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
                              {score !== null ? `${score.toFixed(1)}/10` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full" style={{ background: '#1e1e2b' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${pct}%`, background: color }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reviewer Notes */}
                {reviewerNotes && (
                  <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                    <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>AI Reviewer Summary</p>
                    </div>
                    <div className="p-4 space-y-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                      {reviewerNotes.feedback && (
                        <p className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{reviewerNotes.feedback}</p>
                      )}
                      {reviewerNotes.issues.length > 0 && (
                        <ul className="space-y-2 mt-2">
                          {reviewerNotes.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0" style={{ color: '#c0c1ff' }}>info</span>
                              <span className="text-xs leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!reviewerNotes.feedback && reviewerNotes.issues.length === 0 && (
                        <p className="text-xs" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>No specific notes from the reviewer.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Revision counter pills */}
                <div className="rounded-xl" style={{ border: '1px solid #1e1e2b' }}>
                  <div className="px-4 py-3" style={{ background: '#111118', borderBottom: '1px solid #1e1e2b', borderRadius: '12px 12px 0 0' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Budget Used</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3" style={{ background: '#0d0d14', borderRadius: '0 0 12px 12px' }}>
                    {Object.entries(revisionCounts).map(([key, count]) => {
                      const MAX = 3;
                      const label = key === 'copywriter' ? 'Copywriter' : key === 'image_prompt' ? 'Image Prompt' : key.charAt(0).toUpperCase() + key.slice(1);
                      const isMax = count >= MAX;
                      const isWarn = count === MAX - 1;
                      const dotColor = isMax ? '#F43F5E' : isWarn ? '#FFA500' : '#4edea3';
                      return (
                        <div key={key} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                          <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{label}</span>
                          <span className="flex items-center gap-1.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-2 h-2 rounded-full" style={{ background: i < count ? dotColor : '#1e1e2b' }} />
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setDrawerTab('inspect')}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(192,193,255,0.08)', color: '#c0c1ff', border: '1px solid rgba(192,193,255,0.15)' }}
                >
                  <span className="material-symbols-outlined text-[16px]">article</span>
                  Review Full Drafts →
                </button>
              </div>
            )}

            {/* TAB 2 — Inspect Drafts */}
            {drawerTab === 'inspect' && (
              <div className="p-6 space-y-4">
                <p className="text-[10px] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Generated Campaign Artifacts</p>

                {parsedPreviewOutputs ? (() => {
                  const { copyData, strategyData, imageData, managerData } = parsedPreviewOutputs;
                  const sections: Array<{ label: string; icon: string; color: string; content: React.ReactNode }> = [];

                  // Strategy preview
                  if (strategyData) {
                    sections.push({
                      label: 'Strategy', icon: 'lightbulb', color: '#c0c1ff',
                      content: (
                        <div className="space-y-2">
                          {strategyData.positioning && (
                            <div>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Positioning</p>
                              <p className="text-xs leading-relaxed" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{strategyData.positioning}</p>
                            </div>
                          )}
                          {strategyData.key_messages && strategyData.key_messages.length > 0 && (
                            <div>
                              <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>Key Messages</p>
                              <ul className="space-y-1">
                                {strategyData.key_messages.slice(0, 3).map((msg: string, i: number) => (
                                  <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>
                                    <span className="text-[#c0c1ff] flex-shrink-0 mt-0.5">→</span>{msg}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ),
                    });
                  }

                  // Resolve channels to display in preview (ensures warning alert empty states are visible)
                  const normalizeChannelName = (ch: string): string => {
                    const normalized = ch.toLowerCase().trim();
                    if (normalized === 'google ads' || normalized === 'google_ads' || normalized === 'googleads') return 'google_ads';
                    return normalized;
                  };
                  const selectedChannels = (managerData?.channels || []).map(normalizeChannelName);
                  const copyChannels = copyData
                    ? Object.keys(copyData).filter(k => !['inferred_goal', 'messaging_framework', 'strategic_alignment', 'copy_readiness'].includes(k))
                    : [];
                  const activeChannels = selectedChannels.length > 0 ? selectedChannels : copyChannels;

                  // Copy preview (shows all active channels with explicit missing alerts)
                  if (copyData && activeChannels.length > 0) {
                    sections.push({
                      label: 'Ad Copy', icon: 'edit_note', color: '#4edea3',
                      content: (
                        <div className="space-y-3">
                          {activeChannels.map((ch: string) => {
                            const ch_data = copyData[ch];
                            const hasCopy = !!ch_data;
                            const headline = ch_data?.headline || ch_data?.subject || '';
                            const body = ch_data?.body || ch_data?.caption || ch_data?.post || '';
                            
                            if (!hasCopy) {
                              return (
                                <div key={ch} className="p-3 rounded-lg border border-[#F43F5E]/20 bg-[#F43F5E]/5">
                                  <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: '#F43F5E', fontFamily: 'JetBrains Mono, monospace' }}>
                                    {ch.replace('_', ' ')}
                                  </p>
                                  <p className="text-xs text-[#8B8B9E]" style={{ fontFamily: 'Sora, sans-serif' }}>
                                    ⚠️ Copywriter agent did not generate content for this channel.
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                              <div key={ch} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                                <p className="text-[9px] uppercase tracking-wider mb-1.5 font-semibold" style={{ color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {ch.replace('_', ' ')}
                                </p>
                                {headline && <p className="text-xs font-semibold mb-1" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>{headline}</p>}
                                {body && <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{typeof body === 'string' ? body : JSON.stringify(body).slice(0, 200)}</p>}
                              </div>
                            );
                          })}
                        </div>
                      ),
                    });
                  }

                  // Visuals preview (shows all generated visual prompts)
                  if (imageData?.image_prompts) {
                    sections.push({
                      label: 'Image Prompts', icon: 'image', color: '#FFA500',
                      content: (
                        <div className="space-y-3">
                          {imageData.image_prompts.map((p: any, i: number) => (
                            <div key={i} className="p-3 rounded-lg" style={{ background: '#111118', border: '1px solid #1e1e2b' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[9px] uppercase tracking-wider font-semibold" style={{ color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {p.deliverable_name || `Prompt ${i + 1}`}
                                </p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,165,0,0.1)', color: '#FFA500', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {p.aspect_ratio || '1:1'}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#8B8B9E', fontFamily: 'Sora, sans-serif' }}>{p.prompt}</p>
                            </div>
                          ))}
                        </div>
                      ),
                    });
                  }

                  if (sections.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>article</span>
                        <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Campaign drafts are not yet available.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {sections.map(({ label, icon, color, content }) => (
                        <div key={label} className="draft-card rounded-xl" style={{ border: '1px solid #1e1e2b', background: '#0d0d14' }}>
                          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid #1e1e2b', background: '#111118', borderRadius: '12px 12px 0 0' }}>
                            <span className="material-symbols-outlined text-[16px]" style={{ color }}>{icon}</span>
                            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>{label}</p>
                          </div>
                          <div className="p-4">{content}</div>
                        </div>
                      ))}

                      <button
                        onClick={() => navigate(`/campaign/${campaignId}/result`)}
                        className="w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                        style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(192,193,255,0.08)', color: '#c0c1ff', border: '1px solid rgba(192,193,255,0.15)' }}
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                        Open Full Results Page
                      </button>
                    </>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-[40px] mb-3" style={{ color: '#2A2A38' }}>hourglass_empty</span>
                    <p className="text-sm" style={{ color: '#4A4A5E', fontFamily: 'Sora, sans-serif' }}>Loading campaign data...</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3 — Request Revision */}
            {drawerTab === 'revise' && (
              <div className="p-6 space-y-5">

                {/* Agent Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Select Agent to Revise</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'research', label: 'Research', icon: 'search', downstream: 'Re-runs Strategy → Copy → Image → Reviewer' },
                      { key: 'strategy', label: 'Strategy', icon: 'lightbulb', downstream: 'Re-runs Copy → Image → Reviewer' },
                      { key: 'copywriter', label: 'Copywriter', icon: 'edit_note', downstream: 'Re-runs Image → Reviewer' },
                      { key: 'image_prompt', label: 'Image Prompt', icon: 'image', downstream: 'Re-runs Reviewer only' },
                    ] as const).map(({ key, label, icon, downstream }) => {
                      const count = revisionCounts[key as keyof typeof revisionCounts];
                      const isMax = count >= 3;
                      const isSelected = selectedAgent === key;
                      return (
                        <button
                          key={key}
                          onClick={() => !isMax && setSelectedAgent(key)}
                          disabled={isMax}
                          title={downstream}
                          className="relative flex flex-col items-start p-3 rounded-xl text-left transition-all"
                          style={{
                            background: isSelected ? 'rgba(192,193,255,0.1)' : '#111118',
                            border: isSelected ? '1px solid rgba(192,193,255,0.4)' : '1px solid #1e1e2b',
                            opacity: isMax ? 0.4 : 1,
                            cursor: isMax ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined text-[18px] mb-2" style={{ color: isSelected ? '#c0c1ff' : '#4A4A5E' }}>{icon}</span>
                          <span className="text-xs font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: isSelected ? '#F1F1F3' : '#8B8B9E' }}>{label}</span>
                          <div className="flex items-center gap-1 mt-1.5">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < count ? '#F43F5E' : '#1e1e2b' }} />
                            ))}
                            <span className="text-[9px] ml-1" style={{ color: isMax ? '#F43F5E' : '#4A4A5E', fontFamily: 'JetBrains Mono, monospace' }}>{count}/3{isMax ? ' MAX' : ''}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Downstream Impact */}
                {selectedAgent && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(192,193,255,0.05)', border: '1px solid rgba(192,193,255,0.15)' }}>
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#c0c1ff' }}>⚡ Downstream Impact</p>
                    <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                      {selectedAgent === 'research' && 'Revising Research will cascade to Strategy → Copywriter → Image Prompt → Reviewer. All downstream agents will re-run.'}
                      {selectedAgent === 'strategy' && 'Revising Strategy will cascade to Copywriter → Image Prompt → Reviewer.'}
                      {selectedAgent === 'copywriter' && 'Revising Copywriter will cascade to Image Prompt → Reviewer.'}
                      {selectedAgent === 'image_prompt' && 'Only Image Prompt and the Reviewer will re-run.'}
                    </p>
                  </div>
                )}

                {/* Feedback Textarea */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Revision Instructions</label>
                  <textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="Be specific — what should be changed, improved, or rewritten?"
                    rows={5}
                    className="w-full rounded-xl px-4 py-3 text-xs resize-none focus:outline-none focus:ring-2"
                    style={{
                      background: '#111118',
                      border: '1px solid #2A2A38',
                      color: '#F1F1F3',
                      fontFamily: 'Sora, sans-serif',
                      boxShadow: 'none',
                    }}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(192,193,255,0.4)'; e.target.style.boxShadow = '0 0 0 3px rgba(192,193,255,0.1)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid #2A2A38'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p className="text-[10px] mt-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
                    Tip: Be specific — mention what's wrong and what tone/direction you prefer.
                  </p>
                </div>

                <button
                  onClick={handleRequestRevision}
                  disabled={revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3}
                  className="w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: 'rgba(244,63,94,0.12)',
                    border: '1px solid rgba(244,63,94,0.35)',
                    color: '#F43F5E',
                    opacity: revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3 ? 0.4 : 1,
                    cursor: revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3 ? 'not-allowed' : 'pointer',
                  }}
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Request Revision
                </button>
              </div>
            )}
          </div>

          {/* ── Sticky Footer — Approve & Publish ───────────────────────────── */}
          <div className="px-6 py-4" style={{ borderTop: '1px solid #1e1e2b', background: '#0d0d14' }}>
            <button
              onClick={handleApprove}
              className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                background: 'linear-gradient(135deg, #c0c1ff 0%, #a8a9ff 100%)',
                color: '#0e0e13',
                boxShadow: '0 4px 20px rgba(192,193,255,0.25)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(192,193,255,0.4)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(192,193,255,0.25)'; }}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Approve &amp; Publish Campaign
            </button>
            <p className="text-[10px] text-center mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
              This will trigger the Publisher Agent to finalize all deliverables.
            </p>
          </div>
        </div>

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