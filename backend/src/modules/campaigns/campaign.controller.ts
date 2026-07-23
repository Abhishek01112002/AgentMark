import { Response, NextFunction, Request } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import type { Server as SocketIOServer } from 'socket.io';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { campaignService } from './campaign.service';
import { getClientMemory, recordHumanRejection } from './campaign-memory.service';
import { notificationService } from '../notifications/notification.service';
import { aiServiceClient } from '../../utils/ai-client';
import type { AIServiceCampaignRequest } from '../../utils/ai-client';
import prisma from '../../db';
import { redis } from '../../utils/redis';

// ── Socket.io singleton ────────────────────────────────────────────────────
// Set once from index.ts after the Socket.io Server is created.
// Allows the background AI runner to emit socket events without threading `io`
// through every route handler signature.
let _io: SocketIOServer | null = null;
export const setSocketIO = (io: SocketIOServer) => { _io = io; };
export const getIO = (): SocketIOServer | null => _io;

const createCampaignSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(1),
  brandName: z.string().min(1).optional(),
  industry: z.string().min(1),
  primaryGoal: z.string().min(1),
  targetAudience: z.string().min(1),
  brandVoice: z.string().min(1),
  additionalInfo: z.string().optional(),
});

const approveCampaignSchema = z.object({
  action: z.enum(['approve', 'reject']),
  feedback: z.string().optional(),
  revisionTarget: z.enum(['research', 'strategy', 'copywriter', 'image_prompt']).optional(),
}).refine((data) => {
  if (data.action === 'reject' && !data.revisionTarget) {
    return false;
  }
  return true;
}, {
  message: 'revisionTarget required when rejecting',
  path: ['revisionTarget'],
});

const hasExplicitApiKeys = (llmConfig: any): boolean => {
  const envKeys = [process.env.OPENAI_API_KEY, process.env.GEMINI_API_KEY, process.env.GROQ_API_KEY, process.env.TAVILY_API_KEY];
  if (envKeys.some((k) => k && k.trim().length > 0)) {
    return true;
  }
  if (!llmConfig || typeof llmConfig !== 'object') return false;
  const providerKeys = ['openai_api_key', 'gemini_api_key', 'groq_api_key', 'tavily_api_key'];
  return providerKeys.some((key) => {
    const value = llmConfig[key];
    if (typeof value === 'string') {
      return value.split(',').some((part) => part.trim().length > 0);
    }
    return Boolean(value);
  });
};

const formatFriendlyError = (message: string) => {
  if (!message) return 'Something went wrong while generating your campaign. Please try again.';
  if (message.toLowerCase().includes('validation')) {
    return 'Campaign setup looks incomplete. Please review your inputs and try again.';
  }
  if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('key')) {
    return 'One of your API keys is missing or invalid. Please check Settings > API Keys.';
  }
  if (message.toLowerCase().includes('timeout')) {
    return 'The AI service took too long to respond. Please try again in a moment.';
  }
  return 'We could not generate this campaign right now. Please try again.';
};

const RETRYABLE_ERROR_PATTERNS = [
  'timeout', 'timed out', 'econnrefused', 'econnreset', 'enotfound',
  'eai_again', 'etimedout', 'network', '5', 'ai service',
  'unavailable', 'service unavailable', 'too many requests',
  'rate limit', '429', '503', '502', '504',
];

function isRetryableError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => msg.includes(pattern));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkCancellation(campaignId: string): Promise<boolean> {
  try {
    const exists = await redis.get(`cancel:${campaignId}`);
    return exists === 'true';
  } catch {
    return false;
  }
}

async function emitCampaignFailed(
  dbCampaignId: string,
  errorMessage: string,
  io: SocketIOServer
): Promise<void> {
  io.to(`campaign:${dbCampaignId}`).emit('campaign_failed', {
    campaign_id: dbCampaignId,
    agent: 'system',
    status: 'failed',
    error: errorMessage ?? 'AI service is unavailable. Please try again.',
    timestamp: new Date().toISOString(),
  });
}

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5_000, 30_000, 120_000];

/**
 * Background AI workflow runner with exponential backoff retry.
 *
 * Called after the 201 response has already been sent. On transient failures
 * (network errors, AI service 5xx, timeouts) the workflow is retried up to
 * MAX_RETRIES times with increasing delays. The Redis cancellation flag
 * (set on campaign delete) is checked before each retry attempt.
 *
 * Non-retryable errors (validation failures, API key errors) are reported
 * immediately without retry.
 */
async function runAIWorkflowBackground(
  dbCampaignId: string,
  payload: AIServiceCampaignRequest,
  io: SocketIOServer
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const cancelled = await checkCancellation(dbCampaignId);
      if (cancelled) {
        console.log(`Campaign ${dbCampaignId} cancelled by user — aborting retry`);
        return;
      }
      const delayMs = RETRY_DELAYS_MS[attempt - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      console.log(`Retrying campaign ${dbCampaignId} in ${delayMs}ms (attempt ${attempt}/${MAX_RETRIES})`);
      await sleep(delayMs);

      const cancelledAgain = await checkCancellation(dbCampaignId);
      if (cancelledAgain) {
        console.log(`Campaign ${dbCampaignId} cancelled by user during backoff — aborting retry`);
        return;
      }
    }

    try {
      if (attempt === 0) {
        console.log(`AI workflow started in background | campaign=${dbCampaignId}`);
      } else {
        console.log(`AI workflow retry attempt ${attempt}/${MAX_RETRIES} | campaign=${dbCampaignId}`);
      }

      await aiServiceClient.createCampaign(payload);
      console.log(`AI HTTP call returned | campaign=${dbCampaignId} | DB update handled by Redis`);
      return;
    } catch (err: any) {
      lastError = err;
      const errorMessage = err.message ?? 'Unknown error';
      console.error(`AI workflow error (attempt ${attempt}/${MAX_RETRIES}) | campaign=${dbCampaignId} | error=${errorMessage}`);

      if (!isRetryableError(err)) {
        console.log(`Non-retryable error for campaign ${dbCampaignId}: ${errorMessage}`);
        try {
          await campaignService.updateWithAIOutputs(dbCampaignId, '', {}, 'failed', errorMessage);
        } catch (dbErr: any) {
          console.error(`Failed to mark campaign as failed in DB | campaign=${dbCampaignId} | dbErr=${dbErr.message}`);
        }
        await emitCampaignFailed(dbCampaignId, errorMessage, io);
        return;
      }

      if (attempt < MAX_RETRIES) {
        try {
          await prisma.campaign.update({
            where: { id: dbCampaignId },
            data: {
              status: 'processing',
              aiError: `Retrying (${attempt + 1}/${MAX_RETRIES}): ${errorMessage}`,
            },
          });
        } catch {
          // Best-effort status update
        }
      }
    }
  }

  const finalError = lastError?.message ?? 'AI service is unavailable. Please try again.';
  console.error(`AI workflow permanent failure | campaign=${dbCampaignId} | error=${finalError}`);
  try {
    await campaignService.updateWithAIOutputs(dbCampaignId, '', {}, 'failed', finalError);
  } catch (dbErr: any) {
    console.error(`Failed to mark campaign as failed in DB | campaign=${dbCampaignId} | dbErr=${dbErr.message}`);
  }
  await emitCampaignFailed(dbCampaignId, finalError, io);
}

export const createCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    // LLM config comes from the x-llm-config request header.
    // The frontend axios interceptor (api.ts) attaches it automatically on every request.
    const llmConfigHeader = req.headers['x-llm-config'];
    let llmConfig: any = undefined;
    if (typeof llmConfigHeader === 'string') {
      try {
        llmConfig = JSON.parse(llmConfigHeader);
      } catch {
        llmConfig = undefined;
      }
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: data.projectId, userId: req.userId! },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    if (!hasExplicitApiKeys(llmConfig)) {
      return res.status(400).json({
        error: 'Please add at least one valid API key in Settings > API Keys before launching a campaign.',
      });
    }

    const { projectId, ...campaignData } = data;
    const brandName = campaignData.brandName || project.name;
    const briefParts: string[] = [];
    if (!['saas', 'ecommerce', 'finance', 'healthcare', 'other'].includes(campaignData.industry.trim().toLowerCase())) {
      briefParts.push(`Custom industry: ${campaignData.industry}`);
    }
    if (!['awareness', 'lead_gen', 'sales', 'retention'].includes(campaignData.primaryGoal.trim().toLowerCase())) {
      briefParts.push(`Custom goal: ${campaignData.primaryGoal}`);
    }
    if (campaignData.additionalInfo?.trim()) {
      briefParts.push(
        `Additional Context: ${campaignData.additionalInfo.trim()}`
      );
    }

    // ── Step 1: Create DB record (status: "processing") ──────────────────────
    const campaign = await campaignService.create(projectId, { ...campaignData, brandName });
    console.log(`Campaign created in DB: ${campaign.id} | Status: ${campaign.status}`);

    // Immediately create a lightweight user notification in the background.
    void notificationService.create(project.userId, {
      type: 'info',
      title: 'Campaign started',
      message: `Campaign "${campaign.name}" is processing now.`,
    });

    // ── Step 2: Respond 201 immediately ──────────────────────────────────────
    // Frontend receives the campaign object and navigates to /live right away.
    // No waiting — the 2-3 min AI pipeline runs entirely in the background.
    res.status(201).json({ campaign });

    // ── Step 3: Fire AI workflow in background (fire-and-forget) ────────────
    // `void` intentionally suppresses the unhandled Promise lint warning.
    // The `campaign_id` passed here equals the DB UUID so FastAPI can publish
    // to the correct Redis channel (campaign:{id}) for the Redis subscriber.
    // `getIO()` returns the singleton socket.io Server set at startup in index.ts.
    const io = getIO();
    if (io) {
      let memoryContext;
      try {
        memoryContext = await getClientMemory(projectId);
      } catch {
        memoryContext = null;
      }
      const effectiveLlmConfig = {
        openai_api_key: llmConfig?.openai_api_key || process.env.OPENAI_API_KEY,
        gemini_api_key: llmConfig?.gemini_api_key || process.env.GEMINI_API_KEY,
        groq_api_key: llmConfig?.groq_api_key || process.env.GROQ_API_KEY,
        tavily_api_key: llmConfig?.tavily_api_key || process.env.TAVILY_API_KEY,
      };

      void runAIWorkflowBackground(campaign.id, {
        campaign_name: campaign.name,
        brand_name: campaign.brandName || brandName,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        brief: briefParts.length > 0 ? briefParts.join('. ') : undefined,
        llm_config: effectiveLlmConfig,
        campaign_id: campaign.id,
        client_memory_context: memoryContext?.formattedText ?? null,
      }, io);
    } else {
      // io not yet set (shouldn't happen in production — Redis init runs before any request)
      console.warn(`[Campaign] Socket.io not initialised — background runner will not emit socket events | campaign=${campaign.id}`);
    }

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Campaign creation error:', error);
      next(error);
    }
  };

export const getCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const campaigns = await campaignService.getAll(projectId);
    res.json({ campaigns });
  } catch (error) {
    next(error);
  }
};

export const getActiveCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        project: { userId: req.userId! },
        status: { in: ['processing', 'awaiting_human_approval'] }
      },
      select: {
        id: true,
        name: true,
        status: true,
        projectId: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ campaigns });
  } catch (error) {
    next(error);
  }
};

export const getAllCampaigns = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: {
        project: { userId: req.userId! }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ campaigns });
  } catch (error) {
    next(error);
  }
};

export const getCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;

    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { userId: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.project.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (projectId && typeof projectId === 'string' && campaign.projectId !== projectId) {
      return res.status(400).json({ error: 'Campaign does not belong to the specified project' });
    }

    const { project, ...campaignData } = campaign;
    res.json({ campaign: campaignData });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        projectId,
        project: { userId: req.userId! },
      },
      select: { projectId: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    await campaignService.delete(req.params.id, campaign.projectId);
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const approveCampaign = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action, feedback, revisionTarget } = approveCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { project: { select: { userId: true, name: true } } },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.project.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate rejection requirements and revision counts
    if (action === 'reject') {
      // Check if target agent has reached max revisions
      const MAX_REVISIONS = 3;
      const revisionCounts = {
        research: campaign.researchRevisionCount || 0,
        strategy: campaign.strategyRevisionCount || 0,
        copywriter: campaign.copyRevisionCount || 0,
        image_prompt: campaign.imageRevisionCount || 0,
      };

      const currentCount = revisionCounts[revisionTarget as keyof typeof revisionCounts];
      if (currentCount >= MAX_REVISIONS) {
        return res.status(400).json({
          error: `${revisionTarget} has reached maximum revisions (${MAX_REVISIONS}). Please approve or select a different agent.`,
          revisionCounts
        });
      }
    }

    // Extract LLM config from request headers
    const llmConfigHeader = req.headers['x-llm-config'];
    let llmConfig: any = undefined;
    if (typeof llmConfigHeader === 'string') {
      try {
        llmConfig = JSON.parse(llmConfigHeader);
      } catch {
        llmConfig = undefined;
      }
    }

    const currentOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) as Record<string, any>
      : {};

    if (action === 'reject' && revisionTarget) {
      const agentsPriority = ['manager', 'research', 'strategy', 'copywriter', 'image_prompt', 'reviewer', 'publisher'];
      const targetIdx = agentsPriority.indexOf(revisionTarget);
      if (targetIdx !== -1) {
        const completedAgents = currentOutputs.completed_agents || [];
        currentOutputs.completed_agents = completedAgents.filter((a: string) => {
          const idx = agentsPriority.indexOf(a);
          return idx !== -1 && idx < targetIdx;
        });
      }
      currentOutputs.active_agent = revisionTarget;
    } else if (action === 'approve') {
      currentOutputs.active_agent = 'publisher';
    }

    if (action === 'reject' && revisionTarget && feedback) {
      await recordHumanRejection(id, campaign.projectId, revisionTarget, feedback);
    }

    // Update campaign status and HITL fields in database
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'processing',
        humanApprovalStatus: action === 'approve' ? 'approved' : 'rejected',
        ...(action === 'reject' ? {
          humanFeedback: feedback || null,
          humanRevisionTarget: revisionTarget || null,
        } : {}),
        aiOutputs: currentOutputs as any,
      },
    });

    // Send 200 response immediately — do NOT do DB or AI work after this point
    res.json({ message: 'Campaign approval submitted', campaign: updatedCampaign });

    // Fire background workflow asynchronously — errors are handled inside, never touch res
    void runApprovalBackground(campaign.id, {
      projectId: campaign.projectId,
      campaignName: campaign.name,
      brandName: campaign.brandName || campaign.project.name,
      industry: campaign.industry,
      primaryGoal: campaign.primaryGoal,
      targetAudience: campaign.targetAudience,
      brandVoice: campaign.brandVoice,
      action,
      feedback: feedback ?? null,
      revisionTarget: revisionTarget ?? null,
      researchRevisionCount: campaign.researchRevisionCount ?? 0,
      strategyRevisionCount: campaign.strategyRevisionCount ?? 0,
      copyRevisionCount: campaign.copyRevisionCount ?? 0,
      imageRevisionCount: campaign.imageRevisionCount ?? 0,
      currentOutputs,
      llmConfig,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

async function runApprovalBackground(
  campaignId: string,
  context: {
    projectId: string;
    campaignName: string;
    brandName: string;
    industry: string;
    primaryGoal: string;
    targetAudience: string;
    brandVoice: string;
    action: string;
    feedback: string | null;
    revisionTarget: string | null;
    researchRevisionCount: number;
    strategyRevisionCount: number;
    copyRevisionCount: number;
    imageRevisionCount: number;
    currentOutputs: Record<string, any>;
    llmConfig: any;
  }
): Promise<void> {
  try {
    const io = getIO();
    if (!io) {
      console.warn(`[Campaign] Socket.io not initialised — cannot emit events for campaign approval background | campaign=${campaignId}`);
      return;
    }

    let memoryContext;
    try {
      memoryContext = await getClientMemory(context.projectId);
    } catch {
      memoryContext = null;
    }

    const effectiveLlmConfig = {
      openai_api_key: context.llmConfig?.openai_api_key || process.env.OPENAI_API_KEY,
      gemini_api_key: context.llmConfig?.gemini_api_key || process.env.GEMINI_API_KEY,
      groq_api_key: context.llmConfig?.groq_api_key || process.env.GROQ_API_KEY,
      tavily_api_key: context.llmConfig?.tavily_api_key || process.env.TAVILY_API_KEY,
    };

    await runAIWorkflowBackground(campaignId, {
      campaign_name: context.campaignName,
      brand_name: context.brandName,
      industry: context.industry,
      primary_goal: context.primaryGoal,
      target_audience: context.targetAudience,
      brand_voice: context.brandVoice,
      campaign_id: campaignId,
      llm_config: effectiveLlmConfig,
      client_memory_context: memoryContext?.formattedText ?? null,
      manager_output: context.currentOutputs.manager_output ? JSON.stringify(context.currentOutputs.manager_output) : null,
      research_output: context.currentOutputs.research_output ? JSON.stringify(context.currentOutputs.research_output) : null,
      strategy_output: context.currentOutputs.strategy_output ? JSON.stringify(context.currentOutputs.strategy_output) : null,
      copy_output: context.currentOutputs.copy_output ? JSON.stringify(context.currentOutputs.copy_output) : null,
      image_output: context.currentOutputs.image_output ? JSON.stringify(context.currentOutputs.image_output) : null,
      review_output: context.currentOutputs.review_output ? JSON.stringify(context.currentOutputs.review_output) : null,
      human_approval_status: context.action === 'approve' ? 'approved' : 'rejected',
      human_feedback: context.feedback,
      human_revision_target: context.revisionTarget,
      research_revision_count: context.researchRevisionCount,
      strategy_revision_count: context.strategyRevisionCount,
      copy_revision_count: context.copyRevisionCount,
      image_revision_count: context.imageRevisionCount,
    }, io);
  } catch (err: any) {
    console.error(`Campaign approval background error | campaign=${campaignId} | error=${err.message}`);
  }
}

const enhancePromptSchema = z.object({
  prompt: z.string().min(1),
  userInput: z.string().optional(),
});

export const enhancePrompt = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { prompt, userInput } = enhancePromptSchema.parse(req.body);
    const llmConfigHeader = req.headers['x-llm-config'];
    let llmConfig: any = undefined;
    if (typeof llmConfigHeader === 'string') {
      try {
        llmConfig = JSON.parse(llmConfigHeader);
      } catch {
        // ignore
      }
    }

    const enhancedPrompt = await aiServiceClient.enhancePrompt(prompt, userInput, llmConfig);
    return res.status(200).json({ enhancedPrompt });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

export const getMemoryInsights = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const campaign = await prisma.campaign.findUnique({
      where: { id: req.params.id },
      include: { project: { select: { userId: true } } },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    if (campaign.project.userId !== req.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const snapshots = await prisma.campaignMemorySnapshot.findMany({
      where: { 
        projectId: campaign.projectId, 
        campaignId: { not: campaign.id },
        completedAt: { lt: campaign.createdAt }
      },
      orderBy: { completedAt: 'desc' },
      take: 3,
    });

    const insights = snapshots.map(s => {
      const rejectionReasons = s.rejectionReasons as Array<{ targetAgent: string; feedbackText: string }> | null;
      return {
        completedAt: s.completedAt,
        score: s.finalReviewScore,
        approvedOnFirstTry: s.humanApprovedOnFirstTry,
        rejectionReasons: rejectionReasons ?? [],
        approvedTone: s.finalApprovedTone,
        channelsUsed: s.finalChannelsUsed,
      };
    });

    res.json({ insights, count: snapshots.length });
  } catch (error) {
    next(error);
  }
};

export const getProjectMemoryHub = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: req.userId! },
    });
    if (!project) return res.status(403).json({ error: 'Access denied' });

    const snapshots = await prisma.campaignMemorySnapshot.findMany({
      where: { projectId },
      orderBy: { completedAt: 'desc' },
      take: 10,
      include: { campaign: { select: { name: true, brandVoice: true, industry: true } } },
    });

    if (snapshots.length === 0) {
      return res.json({ snapshots: [], count: 0, aggregated: null });
    }

    const formatted = snapshots.map((s) => ({
      id: s.id,
      campaignId: s.campaignId,
      campaignName: s.campaign.name,
      brandVoice: s.campaign.brandVoice,
      completedAt: s.completedAt,
      score: s.finalReviewScore,
      approvedOnFirstTry: s.humanApprovedOnFirstTry,
      rejectionReasons: (s.rejectionReasons ?? []) as Array<{ targetAgent: string; feedbackText: string }>,
      approvedTone: s.finalApprovedTone,
      channelsUsed: s.finalChannelsUsed,
    }));

    const allTones = snapshots.flatMap((s) => s.finalApprovedTone);
    const toneCounts: Record<string, number> = {};
    allTones.forEach((t) => { toneCounts[t] = (toneCounts[t] || 0) + 1; });
    const preferredTones = Object.entries(toneCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tone]) => tone);

    const allChannels = snapshots.flatMap((s) => s.finalChannelsUsed);
    const channelCounts: Record<string, number> = {};
    allChannels.forEach((c) => { channelCounts[c] = (channelCounts[c] || 0) + 1; });
    const preferredChannels = Object.entries(channelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ch]) => ch);

    const totalScore = snapshots.reduce((sum, s) => sum + (s.finalReviewScore ?? 0), 0);
    const avgScore = snapshots.length > 0 ? Math.round((totalScore / snapshots.length) * 10) / 10 : 0;

    const approvedFirstTry = snapshots.filter((s) => s.humanApprovedOnFirstTry).length;
    const firstTryRate = snapshots.length > 0 ? Math.round((approvedFirstTry / snapshots.length) * 100) : 0;

    const allRejections = snapshots.flatMap(
      (s) => (s.rejectionReasons ?? []) as Array<{ targetAgent: string; feedbackText: string }>
    );
    const rejectionAgentCounts: Record<string, number> = {};
    allRejections.forEach((r) => {
      const agent = r.targetAgent || 'unknown';
      rejectionAgentCounts[agent] = (rejectionAgentCounts[agent] || 0) + 1;
    });
    const mostRejectedAgent = Object.entries(rejectionAgentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 1)
      .map(([agent]) => agent)[0] || null;

    const aggregated = {
      totalCampaigns: snapshots.length,
      avgScore,
      firstTryRate,
      preferredTones,
      preferredChannels,
      mostRejectedAgent,
      rejectionCount: allRejections.length,
    };

    res.json({ snapshots: formatted, count: snapshots.length, aggregated });
  } catch (error) {
    next(error);
  }
};

export const testKey = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, message: 'Provider and apiKey are required' });
    }
    const result = await aiServiceClient.testKey(provider, apiKey);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Key validation failed' });
  }
};

const generateCopyVariantSchema = z.object({
  channel: z.string().min(1).max(50),
  steeringNote: z.string().max(500).optional(),
});

const updateCopyVariantMetaSchema = z.object({
  channel: z.string().min(1).max(50),
  variantId: z.string().min(1),
  action: z.enum(['pin', 'hide', 'unhide']),
});

export const generateCopyVariant = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { channel, steeringNote } = generateCopyVariantSchema.parse(req.body);

    const campaign = await prisma.campaign.findFirst({
      where: { id, project: { userId: req.userId! } },
      select: {
        id: true,
        status: true,
        additionalInfo: true,
        brandVoice: true,
        targetAudience: true,
        aiOutputs: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const aiOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string'
          ? JSON.parse(campaign.aiOutputs)
          : campaign.aiOutputs) as Record<string, any>
      : {};

    const copyVariantsMap = (aiOutputs.copy_variants || {}) as Record<string, any[]>;
    const channelVariants = copyVariantsMap[channel] || [];
    const activeVariantsCount = channelVariants.filter((v: any) => !v.isHidden).length;

    if (activeVariantsCount >= 4) {
      return res.status(400).json({ error: 'Maximum 4 variants reached' });
    }

    const lockKey = `lock:variant:${id}:${channel}`;
    // TTL is set to 95s — slightly longer than the frontend's 90s per-attempt timeout.
    // This guarantees the lock is always released before a legitimate retry fires,
    // while still preventing true duplicate concurrent requests.
    const lockSet = await redis.set(lockKey, 'true', 'EX', 95, 'NX');
    if (!lockSet) {
      return res.status(409).json({ error: 'A generation is already in progress for this channel. Please wait a moment and try again.' });
    }

    try {
      const llmConfigHeader = req.headers['x-llm-config'];
      let llmConfig: any = undefined;
      if (typeof llmConfigHeader === 'string') {
        try { llmConfig = JSON.parse(llmConfigHeader); } catch { /* ignore */ }
      }

      const effectiveLlmConfig = {
        openai_api_key: llmConfig?.openai_api_key || process.env.OPENAI_API_KEY,
        gemini_api_key: llmConfig?.gemini_api_key || process.env.GEMINI_API_KEY,
        groq_api_key: llmConfig?.groq_api_key || process.env.GROQ_API_KEY,
        tavily_api_key: llmConfig?.tavily_api_key || process.env.TAVILY_API_KEY,
      };

      const response = await aiServiceClient.generateCopyVariant({
        campaign_id: campaign.id,
        channel,
        steering_note: steeringNote || '',
        existing_copy: aiOutputs.copy_output ? JSON.stringify(aiOutputs.copy_output) : null,
        strategy_data: aiOutputs.strategy_output ? JSON.stringify(aiOutputs.strategy_output) : null,
        brief: campaign.additionalInfo || '',
        brand_voice: campaign.brandVoice,
        target_audience: campaign.targetAudience,
        llm_config: effectiveLlmConfig,
      });

      const uuid = crypto.randomUUID();
      const tags: string[] = [];
      const copyData = response?.copy_data || response || {};
      const headline = copyData.headline || copyData.headline_copy || copyData.subject || copyData.title || '';
      const body = copyData.body || copyData.body_copy || copyData.content || copyData.text || (typeof copyData === 'string' ? copyData : '');
      const ctas = copyData.ctas || copyData.cta || copyData.call_to_action || {};

      const bodyLower = String(body).toLowerCase();
      const headlineLower = String(headline).toLowerCase();

      if (bodyLower.includes('story') || bodyLower.includes('narrative')) tags.push('🎭 Storytelling');
      if (body.length < 100 && body.length > 0) tags.push('⚡ Punchy');
      if (bodyLower.includes('dear') || bodyLower.includes('professional') || bodyLower.includes('expert')) tags.push('💼 Executive');
      if (headlineLower.includes('?') || bodyLower.includes('?')) tags.push('🤔 Curiosity');
      if (tags.length === 0) tags.push('✨ Fresh Take');

      const newVariant = {
        id: uuid,
        headline: headline || 'New Angle Copy Variant',
        body_copy: body || 'Fresh creative copy generated based on user steering instructions.',
        ctas: typeof ctas === 'object' ? ctas : { primary: String(ctas) },
        tags,
        isChampion: false,
        isHidden: false,
        createdAt: new Date().toISOString(),
        generationNote: steeringNote || '',
      };

      copyVariantsMap[channel] = [...channelVariants, newVariant];
      aiOutputs.copy_variants = copyVariantsMap;

      const updatedCampaign = await campaignService.updateWithAIOutputs(
        id, id, { copy_variants: copyVariantsMap } as any, campaign.status as any
      );
      await redis.del(lockKey);

      const parsedUpdatedOutputs = updatedCampaign.aiOutputs
        ? (typeof updatedCampaign.aiOutputs === 'string'
            ? JSON.parse(updatedCampaign.aiOutputs)
            : updatedCampaign.aiOutputs) as Record<string, any>
        : {};

      return res.json({
        success: true,
        channel,
        variant: newVariant,
        variants: parsedUpdatedOutputs.copy_variants?.[channel] || [],
      });
    } catch (err: any) {
      await redis.del(lockKey);
      console.error(`Error in generateCopyVariant for campaign ${id} / channel ${channel}:`, err);
      return res.status(500).json({ error: `Failed to generate copy variant: ${err.message || 'AI service error'}` });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

export const updateCopyVariantMeta = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  try {
    const { channel, variantId, action } = updateCopyVariantMetaSchema.parse(req.body);

    const campaign = await prisma.campaign.findFirst({
      where: { id, project: { userId: req.userId! } },
      select: { aiOutputs: true, status: true },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const aiOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string'
          ? JSON.parse(campaign.aiOutputs)
          : campaign.aiOutputs) as Record<string, any>
      : {};

    const copyVariantsMap = (aiOutputs.copy_variants || {}) as Record<string, any[]>;
    const channelVariants = copyVariantsMap[channel] || [];

    // legacy-* IDs exist only in frontend state; accept without DB lookup
    let variantFound = variantId.startsWith('legacy-');

    const updatedVariants = channelVariants.map((v: any) => {
      if (v.id === variantId) {
        variantFound = true;
        if (action === 'pin') {
          return { ...v, isChampion: !v.isChampion }; // toggle on/off
        } else if (action === 'hide') {
          return { ...v, isHidden: true };
        } else if (action === 'unhide') {
          return { ...v, isHidden: false };
        }
      } else {
        if (action === 'pin') {
          return { ...v, isChampion: false }; // unpin all others when pinning
        }
      }
      return v;
    });

    if (!variantFound) {
      return res.status(404).json({ error: 'Variant not found in this channel' });
    }

    copyVariantsMap[channel] = updatedVariants;
    aiOutputs.copy_variants = copyVariantsMap;

    const updatedCampaign = await campaignService.updateWithAIOutputs(
      id, id, { copy_variants: copyVariantsMap } as any, campaign.status as any
    );

    const parsedUpdatedOutputs = updatedCampaign.aiOutputs
      ? (typeof updatedCampaign.aiOutputs === 'string'
          ? JSON.parse(updatedCampaign.aiOutputs)
          : updatedCampaign.aiOutputs) as Record<string, any>
      : {};

    return res.json({
      channel,
      variants: parsedUpdatedOutputs.copy_variants?.[channel] || [],
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

const saveCopyVersionSchema = z.object({
  feedbackUsed: z.string().max(500).optional(),
});

// ── Copy Version History ─────────────────────────────────────────────────────
// Saves the current copy_output as a versioned snapshot (max 5 versions).
// Called by the MCP revise_copy_with_feedback tool before triggering a revision.

export const saveCopyVersion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { feedbackUsed } = saveCopyVersionSchema.parse(req.body);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { aiOutputs: true, project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const currentOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string'
          ? JSON.parse(campaign.aiOutputs as string)
          : campaign.aiOutputs) as Record<string, any>
      : {};

    const copyOutput = currentOutputs.copy_output;
    if (!copyOutput) {
      res.status(400).json({ error: 'No copy output available to snapshot' });
      return;
    }

    // Extract scores from existing outputs
    const focusGroupOutput = currentOutputs.focus_group_output as Record<string, any> | undefined;
    const focusGroupScore: number | null = (focusGroupOutput?.overall_score as number) ?? null;

    const reviewOutput = currentOutputs.review_output as Record<string, any> | undefined;
    const agentScores = reviewOutput?.agent_scores as Record<string, number> | undefined;
    const copyScore: number | null = agentScores?.copywriter ?? null;

    const existingVersions: any[] = (currentOutputs.copy_versions as any[]) || [];
    const versionNumber = existingVersions.length + 1;

    const newVersion = {
      version: versionNumber,
      timestamp: new Date().toISOString(),
      copy: copyOutput,
      focus_group_score: focusGroupScore,
      copy_score: copyScore,
      feedback_used: feedbackUsed || null,
    };

    // Keep last 5 versions only
    const updatedVersions = [...existingVersions, newVersion].slice(-5);

    const updatedOutputs = {
      ...currentOutputs,
      copy_versions: updatedVersions,
    };

    await prisma.campaign.update({
      where: { id },
      data: { aiOutputs: updatedOutputs as any },
    });

    res.json({
      success: true,
      version: versionNumber,
      totalVersions: updatedVersions.length,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    next(err);
  }
};

export const getCopyVersions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: { aiOutputs: true, project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const aiOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string'
          ? JSON.parse(campaign.aiOutputs as string)
          : campaign.aiOutputs) as Record<string, any>
      : {};

    const copyVersions: any[] = (aiOutputs.copy_versions as any[]) || [];

    res.json({ success: true, versions: copyVersions, totalVersions: copyVersions.length });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns/:id/fork
 * FAANG Pattern: Git-style Campaign Branching.
 * Clones existing campaign research/strategy and creates a new version with fresh revision budget.
 */
export const forkCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { updatedBrief, newName, startStage, startFrom } = req.body;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const selectedStage = startStage || startFrom || null;

    // Parse parent outputs safely
    const parentOutputs: Record<string, any> = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs)
      : {};

    const forkedOutputs: Record<string, any> = {};

    if (selectedStage === 'copywriter') {
      if (parentOutputs.manager_output) forkedOutputs.manager_output = parentOutputs.manager_output;
      if (parentOutputs.research_output) forkedOutputs.research_output = parentOutputs.research_output;
      if (parentOutputs.strategy_output) forkedOutputs.strategy_output = parentOutputs.strategy_output;
    } else if (selectedStage === 'image_prompt') {
      if (parentOutputs.manager_output) forkedOutputs.manager_output = parentOutputs.manager_output;
      if (parentOutputs.research_output) forkedOutputs.research_output = parentOutputs.research_output;
      if (parentOutputs.strategy_output) forkedOutputs.strategy_output = parentOutputs.strategy_output;
      if (parentOutputs.copy_output) forkedOutputs.copy_output = parentOutputs.copy_output;
    } else if (selectedStage === 'strategy') {
      if (parentOutputs.manager_output) forkedOutputs.manager_output = parentOutputs.manager_output;
      if (parentOutputs.research_output) forkedOutputs.research_output = parentOutputs.research_output;
    } else if (selectedStage === 'fresh' || selectedStage === 'research') {
      // Re-run everything from scratch
    } else {
      // Legacy backward-compatibility fallback
      Object.assign(forkedOutputs, parentOutputs);
    }

    const isRerunningAI = selectedStage && ['copywriter', 'image_prompt', 'strategy', 'fresh', 'research'].includes(selectedStage);
    const initialStatus = isRerunningAI ? 'processing' : 'awaiting_human_approval';

    // Create cloned version
    const clonedCampaign = await prisma.campaign.create({
      data: {
        name: newName || `${campaign.name} (v2)`,
        brandName: campaign.brandName,
        industry: campaign.industry,
        primaryGoal: campaign.primaryGoal,
        targetAudience: updatedBrief?.targetAudience || campaign.targetAudience,
        brandVoice: updatedBrief?.brandVoice || campaign.brandVoice,
        additionalInfo: updatedBrief?.additionalInfo || campaign.additionalInfo,
        status: initialStatus,
        projectId: campaign.projectId,
        aiOutputs: forkedOutputs,
        researchRevisionCount: 0,
        strategyRevisionCount: 0,
        copyRevisionCount: 0,
        imageRevisionCount: 0,
      },
    });

    res.json({
      success: true,
      message: 'Campaign variant created successfully!',
      campaign: clonedCampaign,
      isRerunningAI: !!isRerunningAI,
    });

    // Dispatch background AI execution if stage re-generation requested
    if (isRerunningAI) {
      const io = getIO();
      if (io) {
        let memoryContext;
        try {
          memoryContext = await getClientMemory(campaign.projectId);
        } catch {
          memoryContext = null;
        }

        const llmConfigHeader = req.headers['x-llm-config'];
        let llmConfig: any = undefined;
        if (typeof llmConfigHeader === 'string') {
          try { llmConfig = JSON.parse(llmConfigHeader); } catch {}
        }

        const effectiveLlmConfig = {
          openai_api_key: llmConfig?.openai_api_key || process.env.OPENAI_API_KEY,
          gemini_api_key: llmConfig?.gemini_api_key || process.env.GEMINI_API_KEY,
          groq_api_key: llmConfig?.groq_api_key || process.env.GROQ_API_KEY,
          tavily_api_key: llmConfig?.tavily_api_key || process.env.TAVILY_API_KEY,
        };

        const brandName = clonedCampaign.brandName || '';
        const briefParts: string[] = [];
        if (!['saas', 'ecommerce', 'finance', 'healthcare', 'other'].includes(clonedCampaign.industry.trim().toLowerCase())) {
          briefParts.push(`Custom industry: ${clonedCampaign.industry}`);
        }
        if (!['awareness', 'lead_gen', 'sales', 'retention'].includes(clonedCampaign.primaryGoal.trim().toLowerCase())) {
          briefParts.push(`Custom goal: ${clonedCampaign.primaryGoal}`);
        }
        if (clonedCampaign.additionalInfo?.trim()) {
          briefParts.push(`Additional Context: ${clonedCampaign.additionalInfo.trim()}`);
        }

        void runAIWorkflowBackground(clonedCampaign.id, {
          campaign_name: clonedCampaign.name,
          brand_name: brandName,
          industry: clonedCampaign.industry,
          primary_goal: clonedCampaign.primaryGoal,
          target_audience: clonedCampaign.targetAudience,
          brand_voice: clonedCampaign.brandVoice,
          brief: briefParts.length > 0 ? briefParts.join('. ') : undefined,
          llm_config: effectiveLlmConfig,
          campaign_id: clonedCampaign.id,
          client_memory_context: memoryContext?.formattedText ?? null,
          manager_output: forkedOutputs.manager_output ? JSON.stringify(forkedOutputs.manager_output) : null,
          research_output: forkedOutputs.research_output ? JSON.stringify(forkedOutputs.research_output) : null,
          strategy_output: forkedOutputs.strategy_output ? JSON.stringify(forkedOutputs.strategy_output) : null,
          copy_output: forkedOutputs.copy_output ? JSON.stringify(forkedOutputs.copy_output) : null,
          image_output: forkedOutputs.image_output ? JSON.stringify(forkedOutputs.image_output) : null,
          human_revision_target: selectedStage === 'fresh' || selectedStage === 'research' ? null : selectedStage,
        }, io);
      }
    }
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns/:id/reset-revisions
 * FAANG Pattern: Dynamic Revision Cap Extension.
 * Resets revision counters back to 0 without losing generated outputs.
 */
export const resetCampaignRevisions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        researchRevisionCount: 0,
        strategyRevisionCount: 0,
        copyRevisionCount: 0,
        imageRevisionCount: 0,
      },
    });

    res.json({
      success: true,
      message: 'Revision budget reset successfully! You now have 3 fresh revisions available.',
      campaign: updatedCampaign,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/campaigns/:id/retry
 * Retries execution of a failed campaign without recreating the database record.
 * Resets status to 'processing', clears aiError, and re-triggers background AI workflow.
 */
export const retryCampaign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { project: { select: { userId: true, name: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const llmConfigHeader = req.headers['x-llm-config'];
    let llmConfig: any = undefined;
    if (typeof llmConfigHeader === 'string') {
      try {
        llmConfig = JSON.parse(llmConfigHeader);
      } catch {
        llmConfig = undefined;
      }
    }

    // Reset campaign in DB: status='processing', aiError=null
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'processing',
        aiError: null,
        updatedAt: new Date(),
      },
    });

    console.log(`[CampaignRetry] Campaign ${id} status reset to processing for retry.`);

    // Respond 200 immediately
    res.json({
      success: true,
      message: 'Campaign retry initiated',
      campaign: updatedCampaign,
    });

    // Fire AI workflow in background
    const io = getIO();
    if (io) {
      let memoryContext;
      try {
        memoryContext = await getClientMemory(campaign.projectId);
      } catch {
        memoryContext = null;
      }

      const effectiveLlmConfig = {
        openai_api_key: llmConfig?.openai_api_key || process.env.OPENAI_API_KEY,
        gemini_api_key: llmConfig?.gemini_api_key || process.env.GEMINI_API_KEY,
        groq_api_key: llmConfig?.groq_api_key || process.env.GROQ_API_KEY,
        tavily_api_key: llmConfig?.tavily_api_key || process.env.TAVILY_API_KEY,
      };

      const brandName = campaign.brandName || campaign.project.name;
      const briefParts: string[] = [];
      if (!['saas', 'ecommerce', 'finance', 'healthcare', 'other'].includes(campaign.industry.trim().toLowerCase())) {
        briefParts.push(`Custom industry: ${campaign.industry}`);
      }
      if (!['awareness', 'lead_gen', 'sales', 'retention'].includes(campaign.primaryGoal.trim().toLowerCase())) {
        briefParts.push(`Custom goal: ${campaign.primaryGoal}`);
      }
      if (campaign.additionalInfo?.trim()) {
        briefParts.push(`Additional Context: ${campaign.additionalInfo.trim()}`);
      }

      void runAIWorkflowBackground(campaign.id, {
        campaign_name: campaign.name,
        brand_name: brandName,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        brief: briefParts.length > 0 ? briefParts.join('. ') : undefined,
        llm_config: effectiveLlmConfig,
        campaign_id: campaign.id,
        client_memory_context: memoryContext?.formattedText ?? null,
      }, io);
    } else {
      console.warn(`[CampaignRetry] Socket.io not initialised — retry background runner will not emit socket events | campaign=${campaign.id}`);
    }
  } catch (err) {
    next(err);
  }
};

