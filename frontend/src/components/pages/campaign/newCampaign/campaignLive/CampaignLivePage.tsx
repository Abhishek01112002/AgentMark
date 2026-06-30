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
import { ChannelIcon } from '../../../../shared/ChannelIcon';

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
  research_revision_count?: number;
  strategy_revision_count?: number;
  copy_revision_count?: number;
  image_revision_count?: number;
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
  const [socketAuthError, setSocketAuthError] = useState<string>('');
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
      copyData: (() => {
        const rawCopy = getOutputField('copy_output') || getOutputField('copyOutput');
        return rawCopy && rawCopy.copies ? { ...rawCopy, ...rawCopy.copies } : rawCopy;
      })(),
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
            
            // Restore pipeline progress and mark active agent as failed
            const outputs = campaign.aiOutputs 
              ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs)
              : {};
            const completedAgents = outputs.completed_agents || [];
            const activeAgentKey = outputs.active_agent || 'manager'; // Default to manager if none specified

            setAgents((prev) =>
              prev.map((a) => {
                const pipelineKeys = ['manager', 'research', 'strategy', 'copywriter', 'image_prompt', 'reviewer', 'publisher'];
                const activeIdx = pipelineKeys.indexOf(activeAgentKey);
                const currentIdx = pipelineKeys.indexOf(a.key);

                if (a.key === activeAgentKey) {
                  return {
                    ...a,
                    status: 'failed' as AgentStatus,
                    description: campaign.aiError || 'Failed during processing',
                  };
                }

                if (completedAgents.includes(a.key) || (activeIdx !== -1 && currentIdx !== -1 && currentIdx < activeIdx)) {
                  return {
                    ...a,
                    status: 'completed' as AgentStatus,
                    description: DONE_DESCRIPTIONS[a.key] ?? 'Completed',
                  };
                }

                return {
                  ...a,
                  status: 'pending' as AgentStatus,
                  description: INITIAL_AGENTS.find((i) => i.key === a.key)?.description ?? 'Pending...',
                };
              })
            );
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
                const pipelineKeys = ['manager', 'research', 'strategy', 'copywriter', 'image_prompt', 'reviewer', 'publisher'];
                const activeIdx = pipelineKeys.indexOf(activeAgentKey || '');
                const currentIdx = pipelineKeys.indexOf(a.key);

                // If downstream of the active agent, it must be pending
                if (activeIdx !== -1 && currentIdx !== -1 && currentIdx > activeIdx) {
                  const initialAgent = INITIAL_AGENTS.find((i) => i.key === a.key);
                  return {
                    ...a,
                    status: 'pending' as AgentStatus,
                    description: initialAgent?.description ?? 'Pending...',
                    duration: undefined,
                  };
                }

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
      setSocketAuthError('');
      socket.emit('join_campaign', campaignId);
      console.log('[Socket.io] Connected | campaign=', campaignId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket.io] Disconnected');
    });

    // Server-side auth rejection (invalid token / wrong user)
    socket.on('auth_error', (err: { message: string }) => {
      console.warn('[Socket.io] Auth error:', err.message);
      setSocketAuthError(err.message || 'Unauthorized connection.');
    });

    socket.on('error', (err: any) => {
      console.warn('[Socket.io] Socket error:', err?.message || err);
    });

    // ── Agent progress tick ──────────────────────────────────────────────────
    socket.on('agent_update', (data: AgentUpdatePayload) => {
      const { agent: agentKey, status } = data;
      console.log('[Socket.io] agent_update | agent=', agentKey, '| status=', status);

      // Extract and update revision counts from socket message
      if (data && typeof data === 'object') {
        const research = data.research_revision_count;
        const strategy = data.strategy_revision_count;
        const copywriter = data.copy_revision_count;
        const image_prompt = data.image_revision_count;

        setRevisionCounts((prev) => ({
          research: typeof research === 'number' ? research : prev.research,
          strategy: typeof strategy === 'number' ? strategy : prev.strategy,
          copywriter: typeof copywriter === 'number' ? copywriter : prev.copywriter,
          image_prompt: typeof image_prompt === 'number' ? image_prompt : prev.image_prompt,
        }));
      }



      if (status === 'completed' || status === 'running' || status === 'failed') {
        setAgents((prev) => {
          const pipelineKeys = ['manager', 'research', 'strategy', 'copywriter', 'image_prompt', 'reviewer', 'publisher'];
          const runningIdx = pipelineKeys.indexOf(agentKey);

          const updated = prev.map((a) => {
            const currentIdx = pipelineKeys.indexOf(a.key);

            // If this is the agent being updated
            if (a.key === agentKey) {
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
            }

            // If another agent transitions to running, reset any agent downstream of it to pending
            if (status === 'running' && runningIdx !== -1 && currentIdx > runningIdx) {
              const initialAgent = INITIAL_AGENTS.find((i) => i.key === a.key);
              return {
                ...a,
                status: 'pending' as AgentStatus,
                description: initialAgent?.description ?? 'Pending...',
                duration: undefined,
              };
            }

            return a;
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
        setTimeout(() => {
          const validProjectId = projectIdRef.current || new URLSearchParams(window.location.search).get('projectId');
          navigate(`/campaign/${campaignId}/result${validProjectId ? `?projectId=${validProjectId}` : ''}`);
        }, 2000);
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

              {/* Socket Auth Error Banner */}
              {socketAuthError && (
                <div className="mb-6 p-4 rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10">
                  <p className="text-sm text-[#F59E0B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                    Real-time updates auth error: {socketAuthError} (Check your connection or refresh the page)
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
            style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.08) 50%, transparent 100%)' }}
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
            className={`fixed bottom-6 z-[95] flex items-center gap-3 px-5 py-3 rounded-full shadow-2xl backdrop-blur-xl select-none transition-all duration-300 ${
              isMinimized 
                ? 'right-6 cursor-pointer hover:scale-105' 
                : 'left-1/2 -translate-x-1/2 cursor-default'
            }`}
            style={{ 
              background: isMinimized ? 'rgba(17,17,24,0.92)' : 'rgba(17,17,24,0.88)',
              border: isMinimized ? '1px solid rgba(110,231,183,0.3)' : '1px solid rgba(165,182,252,0.25)',
              boxShadow: isMinimized ? '0 0 30px rgba(110,231,183,0.12), 0 8px 32px rgba(0,0,0,0.4)' : '0 0 40px rgba(165,182,252,0.08), 0 8px 32px rgba(0,0,0,0.3)',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${isMinimized ? 'bg-[#6EE7B7] animate-ping' : 'bg-[#A5B6FC] animate-pulse'}`} />
            <span className="text-xs font-medium" style={{ fontFamily: 'Inter, sans-serif', color: isMinimized ? '#6EE7B7' : '#A5B6FC' }}>
              {isMinimized 
                ? 'Review Pending — Click to Expand' 
                : 'Human Review Required — Click outside to minimize & inspect page'}
            </span>
          </div>
        )}

        {/* Right-side Inspector Drawer */}
        <div
          className={`inspector-drawer fixed top-0 right-0 h-full z-[100] flex flex-col transition-all duration-400 ease-out ${
            showHumanReview && !isMinimized ? 'open translate-x-0' : 'translate-x-full'
          }`}
          style={{ width: '100%', maxWidth: '480px', background: '#0c0c14', borderLeft: '1px solid rgba(192,193,255,0.08)', boxShadow: '-24px 0 80px rgba(0,0,0,0.7), inset 1px 0 0 rgba(255,255,255,0.02)' }}
        >
          {/* ── Drawer Header ───────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.04)]" style={{ background: 'linear-gradient(180deg, rgba(192,193,255,0.03) 0%, transparent 100%)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, rgba(192,193,255,0.12), rgba(78,222,163,0.08))', border: '1px solid rgba(192,193,255,0.15)' }}>
                <span className="material-symbols-outlined text-[18px]" style={{ color: '#c0c1ff', fontVariationSettings: "'FILL' 1" }}>fact_check</span>
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: '#6EE7B7', boxShadow: '0 0 6px rgba(110,231,183,0.5)' }} />
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-[0.12em]" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Human-in-the-Loop</p>
                <h2 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#EDEDF5' }}>Inspector Panel</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {qualityScore !== null && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', background: qualityScore >= 7 ? 'rgba(110,231,183,0.1)' : 'rgba(252,165,165,0.1)', color: qualityScore >= 7 ? '#6EE7B7' : '#FCA5A5', border: `1px solid ${qualityScore >= 7 ? 'rgba(110,231,183,0.15)' : 'rgba(252,165,165,0.15)'}` }}>
                  {qualityScore.toFixed(1)}/10
                </span>
              )}
              <button 
                onClick={() => setIsMinimized(true)} 
                className="p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.04)] text-[#6B6B80] hover:text-[#C8C8D0] transition-all duration-200"
                title="Minimize Inspector Panel"
              >
                <span className="material-symbols-outlined text-[18px] block">close</span>
              </button>
            </div>
          </div>

          {/* ── Drawer Tabs ─────────────────────────────────────────────────── */}
          <div className="flex px-4 pt-3 pb-0 gap-1" style={{ background: 'linear-gradient(180deg, rgba(192,193,255,0.02) 0%, transparent 100%)' }}>
            {([
              { key: 'scores', label: 'Review Scores', icon: 'score' },
              { key: 'inspect', label: 'Inspect Drafts', icon: 'article' },
              { key: 'revise', label: 'Request Revision', icon: 'edit' },
            ] as const).map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setDrawerTab(key)}
                className="relative flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-medium transition-all duration-200 rounded-lg"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: drawerTab === key ? '#EDEDF5' : '#5A5A6E',
                  background: drawerTab === key ? 'rgba(192,193,255,0.06)' : 'transparent',
                }}
              >
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: drawerTab === key ? "'FILL' 1" : "'FILL' 0" }}>
                  {icon}
                </span>
                {label}
                {drawerTab === key && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/5 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, rgba(192,193,255,0.6), rgba(192,193,255,0.2))' }} />
                )}
              </button>
            ))}
          </div>

          {/* ── Tab Content ─────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A38 transparent' }}>

            {/* TAB 1 — Review Scores */}
            {drawerTab === 'scores' && (
              <div className="p-5 space-y-4">

                {/* Overall Score Ring */}
                <div className="flex items-center gap-5 p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(192,193,255,0.03), rgba(110,231,183,0.02))', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="relative flex-shrink-0 w-[84px] h-[84px]">
                    <svg width="84" height="84" viewBox="0 0 84 84">
                      <circle cx="42" cy="42" r="34" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                      <circle
                        cx="42" cy="42" r="34" fill="none"
                        stroke={qualityScore !== null && qualityScore >= 8.5 ? '#6EE7B7' : qualityScore !== null && qualityScore >= 7 ? '#FCD34D' : '#FCA5A5'}
                        strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 34}`}
                        strokeDashoffset={`${2 * Math.PI * 34 * (1 - (qualityScore ?? 0) / 10)}`}
                        transform="rotate(-90 42 42)"
                        className="score-ring"
                        style={{ filter: qualityScore !== null && qualityScore >= 7 ? 'drop-shadow(0 0 8px rgba(110,231,183,0.3))' : 'drop-shadow(0 0 8px rgba(252,165,165,0.2))' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em', color: '#EDEDF5' }}>
                        {qualityScore !== null ? qualityScore.toFixed(1) : '—'}
                      </span>
                      <span className="text-[8px] font-medium" style={{ color: '#5A5A6E' }}>/10</span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Overall Quality</p>
                    <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: qualityScore !== null && qualityScore >= 8.5 ? '#6EE7B7' : qualityScore !== null && qualityScore >= 7 ? '#FCD34D' : '#8B8B9E' }}>
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
                <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Agent Quality Breakdown</p>
                  </div>
                  <div className="p-4 space-y-4">
                    {([
                      { key: 'research', label: 'Research', icon: 'search' },
                      { key: 'strategy', label: 'Strategy', icon: 'lightbulb' },
                      { key: 'copywriter', label: 'Copywriter', icon: 'edit_note' },
                      { key: 'image_prompt', label: 'Image Prompt', icon: 'image' },
                    ] as const).map(({ key, label, icon }) => {
                      const score = agentScores[key as keyof typeof agentScores];
                      const pct = score !== null ? (score / 10) * 100 : 0;
                      const color = score === null ? '#5A5A6E' : score >= 8.5 ? '#6EE7B7' : score >= 7 ? '#FCD34D' : '#FCA5A5';
                      return (
                        <div key={key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[13px]" style={{ color }}>{icon}</span>
                              <span className="text-[11px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#9B9BAF' }}>{label}</span>
                            </div>
                            <span className="text-[11px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color }}>
                              {score !== null ? `${score.toFixed(1)}/10` : '—'}
                            </span>
                          </div>
                          <div className="h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%`, background: color, boxShadow: score !== null ? `0 0 6px ${color}40` : 'none' }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reviewer Notes */}
                {reviewerNotes && (
                  <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>AI Reviewer Summary</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {reviewerNotes.feedback && (
                        <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#9B9BAF' }}>{reviewerNotes.feedback}</p>
                      )}
                      {reviewerNotes.issues.length > 0 && (
                        <ul className="space-y-2">
                          {reviewerNotes.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="w-1 h-1 rounded-full mt-2 flex-shrink-0" style={{ background: '#FCA5A5' }} />
                              <span className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {!reviewerNotes.feedback && reviewerNotes.issues.length === 0 && (
                        <p className="text-xs" style={{ color: '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>No specific notes from the reviewer.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Revision counter pills */}
                <div className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Revision Budget Used</p>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-2">
                    {Object.entries(revisionCounts).map(([key, count]) => {
                      const MAX = 3;
                      const label = key === 'copywriter' ? 'Copywriter' : key === 'image_prompt' ? 'Image Prompt' : key.charAt(0).toUpperCase() + key.slice(1);
                      const isMax = count >= MAX;
                      const dotColor = isMax ? '#FCA5A5' : count === MAX - 1 ? '#FCD34D' : '#6EE7B7';
                      return (
                        <div key={key} className="flex items-center justify-between px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="text-[11px] font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#9B9BAF' }}>{label}</span>
                          <span className="flex items-center gap-1">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-[6px] h-[6px] rounded-full" style={{ background: i < count ? dotColor : 'rgba(255,255,255,0.06)' }} />
                            ))}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => setDrawerTab('inspect')}
                  className="w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
                  style={{ fontFamily: 'Inter, sans-serif', background: 'rgba(192,193,255,0.06)', color: '#A5A6F0', border: '1px solid rgba(192,193,255,0.1)' }}
                >
                  <span className="material-symbols-outlined text-[15px]">article</span>
                  Review Full Drafts
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              </div>
            )}

            {/* TAB 2 — Inspect Drafts */}
            {drawerTab === 'inspect' && (
              <div className="p-5 space-y-4">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Generated Campaign Artifacts</p>

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
                              <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1" style={{ color: '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>Positioning</p>
                              <p className="text-xs leading-relaxed" style={{ color: '#9B9BAF', fontFamily: 'Inter, sans-serif' }}>{strategyData.positioning}</p>
                            </div>
                          )}
                          {strategyData.key_messages && strategyData.key_messages.length > 0 && (
                            <div>
                              <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1" style={{ color: '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>Key Messages</p>
                              <ul className="space-y-1">
                                {strategyData.key_messages.slice(0, 3).map((msg: string, i: number) => (
                                  <li key={i} className="text-xs flex items-start gap-2" style={{ color: '#9B9BAF', fontFamily: 'Inter, sans-serif' }}>
                                    <span className="text-[#A5B6FC] flex-shrink-0 mt-0.5">→</span>{msg}
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
                                <div key={ch} className="p-3 rounded-lg" style={{ border: '1px solid rgba(252,165,165,0.15)', background: 'rgba(252,165,165,0.04)' }}>
                                  <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5" style={{ color: '#FCA5A5', fontFamily: 'Inter, sans-serif' }}>
                                    <ChannelIcon channel={ch} size={10} />
                                    <span>{ch.replace('_', ' ')}</span>
                                  </p>
                                  <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                                    Copywriter agent did not generate content for this channel.
                                  </p>
                                </div>
                              );
                            }
                            
                            return (
                                <div key={ch} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                                  <p className="text-[9px] font-medium uppercase tracking-[0.08em] mb-1.5 flex items-center gap-1.5" style={{ color: '#6EE7B7', fontFamily: 'Inter, sans-serif' }}>
                                    <ChannelIcon channel={ch} size={10} />
                                    <span>{ch.replace('_', ' ')}</span>
                                  </p>
                                  {headline && <p className="text-xs font-semibold mb-1" style={{ color: '#EDEDF5', fontFamily: 'Inter, sans-serif' }}>{headline}</p>}
                                  {body && <p className="text-[11px] leading-relaxed line-clamp-3" style={{ color: '#9B9BAF', fontFamily: 'Inter, sans-serif' }}>{typeof body === 'string' ? body : JSON.stringify(body).slice(0, 200)}</p>}
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
                            <div key={i} className="p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[9px] font-medium uppercase tracking-[0.08em]" style={{ color: '#FCD34D', fontFamily: 'Inter, sans-serif' }}>
                                  {p.deliverable_name || `Prompt ${i + 1}`}
                                </p>
                                <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={{ background: 'rgba(252,211,77,0.08)', color: '#FCD34D', fontFamily: 'Inter, sans-serif' }}>
                                  {p.aspect_ratio || '1:1'}
                                </span>
                              </div>
                              <p className="text-[11px] leading-relaxed line-clamp-4" style={{ color: '#9B9BAF', fontFamily: 'Inter, sans-serif' }}>{p.prompt}</p>
                            </div>
                          ))}
                        </div>
                      ),
                    });
                  }

                  if (sections.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <span className="material-symbols-outlined text-[36px] mb-3" style={{ color: '#3A3A4E' }}>article</span>
                        <p className="text-sm" style={{ color: '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>Campaign drafts are not yet available.</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      {sections.map(({ label, icon, color, content }) => (
                        <div key={label} className="rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.04)', background: '#0c0c14' }}>
                          <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <span className="material-symbols-outlined text-[15px]" style={{ color }}>{icon}</span>
                            <p className="text-[10px] font-medium uppercase tracking-[0.08em]" style={{ fontFamily: 'Inter, sans-serif', color }}>{label}</p>
                          </div>
                          <div className="p-4">{content}</div>
                        </div>
                      ))}

                      <button
                        onClick={() => navigate(`/campaign/${campaignId}/result`)}
                        className="w-full py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110"
                        style={{ fontFamily: 'Inter, sans-serif', background: 'rgba(192,193,255,0.06)', color: '#A5A6F0', border: '1px solid rgba(192,193,255,0.1)' }}
                      >
                        <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                        Open Full Results Page
                      </button>
                    </>
                  );
                })() : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <span className="material-symbols-outlined text-[36px] mb-3" style={{ color: '#3A3A4E' }}>hourglass_empty</span>
                    <p className="text-sm" style={{ color: '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>Loading campaign data...</p>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3 — Request Revision */}
            {drawerTab === 'revise' && (
              <div className="p-5 space-y-5">

                {/* Agent Selector */}
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-[0.08em] mb-2.5" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Select Agent to Revise</label>
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
                          className="relative flex flex-col items-start p-3.5 rounded-xl text-left transition-all duration-200"
                          style={{
                            background: isSelected ? 'linear-gradient(135deg, rgba(192,193,255,0.08), rgba(192,193,255,0.02))' : 'rgba(255,255,255,0.02)',
                            border: isSelected ? '1px solid rgba(192,193,255,0.25)' : '1px solid rgba(255,255,255,0.04)',
                            opacity: isMax ? 0.35 : 1,
                            cursor: isMax ? 'not-allowed' : 'pointer',
                          }}
                        >
                          <span className="material-symbols-outlined text-[16px] mb-2" style={{ color: isSelected ? '#A5A6F0' : '#5A5A6E' }}>{icon}</span>
                          <span className="text-[11px] font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: isSelected ? '#EDEDF5' : '#9B9BAF' }}>{label}</span>
                          <div className="flex items-center gap-1.5 mt-2">
                            {[0,1,2].map(i => (
                              <span key={i} className="w-[5px] h-[5px] rounded-full" style={{ background: i < count ? '#FCA5A5' : 'rgba(255,255,255,0.06)' }} />
                            ))}
                            <span className="text-[9px] ml-0.5 font-medium" style={{ color: isMax ? '#FCA5A5' : '#5A5A6E', fontFamily: 'Inter, sans-serif' }}>{count}/3</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Downstream Impact */}
                {selectedAgent && (
                  <div className="p-3.5 rounded-xl" style={{ background: 'rgba(165,182,252,0.04)', border: '1px solid rgba(165,182,252,0.1)' }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.08em] mb-1" style={{ fontFamily: 'Inter, sans-serif', color: '#A5B6FC' }}>
                      <span className="material-symbols-outlined text-[12px] align-middle mr-1">bolt</span>
                      Downstream Impact
                    </p>
                    <p className="text-[11px] leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                      {selectedAgent === 'research' && 'Revising Research will cascade to Strategy → Copywriter → Image Prompt → Reviewer. All downstream agents will re-run.'}
                      {selectedAgent === 'strategy' && 'Revising Strategy will cascade to Copywriter → Image Prompt → Reviewer.'}
                      {selectedAgent === 'copywriter' && 'Revising Copywriter will cascade to Image Prompt → Reviewer.'}
                      {selectedAgent === 'image_prompt' && 'Only Image Prompt and the Reviewer will re-run.'}
                    </p>
                  </div>
                )}

                {/* Feedback Textarea */}
                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-[0.08em] mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>Revision Instructions</label>
                  <textarea
                    value={revisionFeedback}
                    onChange={(e) => setRevisionFeedback(e.target.value)}
                    placeholder="Be specific — what should be changed, improved, or rewritten?"
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-xs resize-none focus:outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: '#EDEDF5',
                      fontFamily: 'Inter, sans-serif',
                    }}
                    onFocus={(e) => { e.target.style.border = '1px solid rgba(165,182,252,0.3)'; e.target.style.boxShadow = '0 0 0 3px rgba(165,182,252,0.06)'; }}
                    onBlur={(e) => { e.target.style.border = '1px solid rgba(255,255,255,0.06)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <p className="text-[10px] mt-1.5" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>
                    Tip: Be specific — mention what's wrong and what tone/direction you prefer.
                  </p>
                </div>

                <button
                  onClick={handleRequestRevision}
                  disabled={revisionCounts[selectedAgent as keyof typeof revisionCounts] >= 3}
                  className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    background: '#DC2626',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 24px rgba(220,38,38,0.4)',
                  }}
                  onMouseEnter={(e) => {
                    if ((revisionCounts[selectedAgent as keyof typeof revisionCounts] || 0) < 3) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#EF4444';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(220,38,38,0.55)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                  onTouchStart={(e) => {
                    if ((revisionCounts[selectedAgent as keyof typeof revisionCounts] || 0) < 3) {
                      (e.currentTarget as HTMLButtonElement).style.background = '#EF4444';
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(220,38,38,0.55)';
                    }
                  }}
                  onTouchEnd={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                  onTouchCancel={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#DC2626';
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(220,38,38,0.4)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <polyline points="23 4 23 10 17 10" />
                    <polyline points="1 20 1 14 7 14" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Request Revision
                </button>
              </div>
            )}
          </div>

          {/* ── Sticky Footer — Approve & Publish ───────────────────────────── */}
          {drawerTab !== 'revise' && (
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'linear-gradient(0deg, rgba(192,193,255,0.02) 0%, transparent 100%)' }}>
              <button
                onClick={handleApprove}
                className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98]"
                style={{
                fontFamily: 'Inter, sans-serif',
                background: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
                color: '#0A0A0F',
                boxShadow: '0 4px 24px rgba(110,231,183,0.25)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(110,231,183,0.35)'; (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(110,231,183,0.25)'; (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
              onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 32px rgba(110,231,183,0.35)'; (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.05)'; }}
              onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(110,231,183,0.25)'; (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
              onTouchCancel={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 24px rgba(110,231,183,0.25)'; (e.currentTarget as HTMLButtonElement).style.filter = 'none'; }}
            >
              <span className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Approve &amp; Publish Campaign
            </button>
            <p className="text-[10px] text-center mt-2" style={{ fontFamily: 'Inter, sans-serif', color: '#5A5A6E' }}>
              This will trigger the Publisher Agent to finalize all deliverables.
            </p>
          </div>
          )}
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