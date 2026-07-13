import { Response, NextFunction } from 'express';
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
const getIO = (): SocketIOServer | null => _io;

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

/**
 * Background AI workflow runner.
 *
 * Called after the 201 response has already been sent. Any HTTP-level failure
 * (FastAPI down, network error) updates the DB directly to "failed" AND emits
 * a campaign_failed socket event so the live page shows an error immediately
 * instead of hanging forever.
 */
async function runAIWorkflowBackground(
  dbCampaignId: string,
  payload: AIServiceCampaignRequest,
  io: SocketIOServer
): Promise<void> {
  try {
    console.log(`AI workflow started in background | campaign=${dbCampaignId}`);
    await aiServiceClient.createCampaign(payload);
    console.log(`AI HTTP call returned | campaign=${dbCampaignId} | DB update handled by Redis`);
  } catch (err: any) {
    console.error(`AI workflow HTTP error | campaign=${dbCampaignId} | error=${err.message}`);
    try {
      await campaignService.updateWithAIOutputs(dbCampaignId, '', {}, 'failed', err.message);
    } catch (dbErr: any) {
      console.error(`Failed to mark campaign as failed in DB | campaign=${dbCampaignId} | dbErr=${dbErr.message}`);
    }
    io.to(`campaign:${dbCampaignId}`).emit('campaign_failed', {
      campaign_id: dbCampaignId,
      agent: 'system',
      status: 'failed',
      error: err.message ?? 'AI service is unavailable. Please try again.',
      timestamp: new Date().toISOString(),
    });
  }
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
      void runAIWorkflowBackground(campaign.id, {
        campaign_name: campaign.name,
        brand_name: campaign.brandName || brandName,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        brief: briefParts.length > 0 ? briefParts.join('. ') : undefined,
        llm_config: llmConfig,
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

export const getActiveCampaigns = async (req: AuthRequest, res: Response) => {
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
    console.error('Failed to fetch active campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch active campaigns' });
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

export const approveCampaign = async (req: AuthRequest, res: Response) => {
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

    // Send 200 response immediately
    res.json({ message: 'Campaign approval submitted', campaign: updatedCampaign });

    // Call FastAPI in background to execute publisher agent
    const io = getIO();
    if (io) {
      const memoryContext = await getClientMemory(campaign.projectId);
      
      void runAIWorkflowBackground(campaign.id, {
        campaign_name: campaign.name,
        brand_name: campaign.brandName || campaign.project.name,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        campaign_id: campaign.id,
        llm_config: llmConfig,
        client_memory_context: memoryContext?.formattedText ?? null,
        // Pass existing outputs as strings (use modified currentOutputs)
        manager_output: currentOutputs.manager_output ? JSON.stringify(currentOutputs.manager_output) : null,
        research_output: currentOutputs.research_output ? JSON.stringify(currentOutputs.research_output) : null,
        strategy_output: currentOutputs.strategy_output ? JSON.stringify(currentOutputs.strategy_output) : null,
        copy_output: currentOutputs.copy_output ? JSON.stringify(currentOutputs.copy_output) : null,
        image_output: currentOutputs.image_output ? JSON.stringify(currentOutputs.image_output) : null,
        review_output: currentOutputs.review_output ? JSON.stringify(currentOutputs.review_output) : null,
        // HITL fields - Pass from database
        human_approval_status: action === 'approve' ? 'approved' : 'rejected',
        human_feedback: feedback || null,
        human_revision_target: revisionTarget || null,
        research_revision_count: campaign.researchRevisionCount || 0,
        strategy_revision_count: campaign.strategyRevisionCount || 0,
        copy_revision_count: campaign.copyRevisionCount || 0,
        image_revision_count: campaign.imageRevisionCount || 0,
      }, io);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Campaign approval error:', error);
    res.status(500).json({ error: 'Failed to submit campaign approval' });
  }
};

const enhancePromptSchema = z.object({
  prompt: z.string().min(1),
  userInput: z.string().optional(),
});

export const enhancePrompt = async (req: AuthRequest, res: Response) => {
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
    console.error('Prompt enhancement error:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance prompt' });
  }
};

export const getMemoryInsights = async (req: AuthRequest, res: Response) => {
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
    console.error('Memory insights fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch memory insights' });
  }
};

export const getProjectMemoryHub = async (req: AuthRequest, res: Response) => {
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
    console.error('Project memory hub fetch failed:', error);
    res.status(500).json({ error: 'Failed to fetch memory hub data' });
  }
};

export const testKey = async (req: AuthRequest, res: Response) => {
  try {
    const { provider, apiKey } = req.body;
    if (!provider || !apiKey) {
      return res.status(400).json({ success: false, message: 'Provider and apiKey are required' });
    }
    const result = await aiServiceClient.testKey(provider, apiKey);
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Test key error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to test API key' });
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

export const generateCopyVariant = async (req: AuthRequest, res: Response) => {
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

      const response = await aiServiceClient.generateCopyVariant({
        campaign_id: campaign.id,
        channel,
        steering_note: steeringNote || '',
        existing_copy: aiOutputs.copy_output ? JSON.stringify(aiOutputs.copy_output) : null,
        strategy_data: aiOutputs.strategy_output ? JSON.stringify(aiOutputs.strategy_output) : null,
        brief: campaign.additionalInfo || '',
        brand_voice: campaign.brandVoice,
        target_audience: campaign.targetAudience,
        llm_config: llmConfig,
      });

      const uuid = crypto.randomUUID();
      const tags: string[] = [];
      const headline = response.copy_data.headline || '';
      const body = response.copy_data.body || response.copy_data.body_copy || '';
      const bodyLower = body.toLowerCase();
      const headlineLower = headline.toLowerCase();

      if (bodyLower.includes('story') || bodyLower.includes('narrative')) tags.push('🎭 Storytelling');
      if (body.length < 100 && body.length > 0) tags.push('⚡ Punchy');
      if (bodyLower.includes('dear') || bodyLower.includes('professional') || bodyLower.includes('expert')) tags.push('💼 Executive');
      if (headlineLower.includes('?') || bodyLower.includes('?')) tags.push('🤔 Curiosity');
      if (tags.length === 0) tags.push('✨ Fresh Take');

      const newVariant = {
        id: uuid,
        headline: response.copy_data.headline || '',
        body_copy: response.copy_data.body || response.copy_data.body_copy || '',
        ctas: response.copy_data.ctas || {},
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
        channel,
        variants: parsedUpdatedOutputs.copy_variants?.[channel] || [],
      });
    } catch (err: any) {
      await redis.del(lockKey);
      throw err;
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Error generating copy variant:', error);
    res.status(500).json({ error: 'Failed to generate copy variant' });
  }
};

export const updateCopyVariantMeta = async (req: AuthRequest, res: Response) => {
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
    console.error('Error updating copy variant metadata:', error);
    res.status(500).json({ error: 'Failed to update copy variant' });
  }
};
