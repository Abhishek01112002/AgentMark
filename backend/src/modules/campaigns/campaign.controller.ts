import { Response } from 'express';
import { z } from 'zod';
import type { Server as SocketIOServer } from 'socket.io';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { campaignService } from './campaign.service';
import { aiServiceClient } from '../../utils/ai-client';
import type { AIServiceCampaignRequest } from '../../utils/ai-client';
import prisma from '../../db';

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

export const createCampaign = async (req: AuthRequest, res: Response) => {
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

    const { projectId, ...campaignData } = data;
    const brandName = campaignData.brandName || project.name;
    const briefParts: string[] = [];
    if (!['saas', 'ecommerce', 'finance', 'healthcare', 'other'].includes(campaignData.industry.trim().toLowerCase())) {
      briefParts.push(`Custom industry: ${campaignData.industry}`);
    }
    if (!['awareness', 'lead_gen', 'sales', 'retention'].includes(campaignData.primaryGoal.trim().toLowerCase())) {
      briefParts.push(`Custom goal: ${campaignData.primaryGoal}`);
    }

    // ── Step 1: Create DB record (status: "processing") ──────────────────────
    const campaign = await campaignService.create(projectId, { ...campaignData, brandName });
    console.log(`Campaign created in DB: ${campaign.id} | Status: ${campaign.status}`);

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
    throw error;
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
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
};

export const getCampaign = async (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;

  const campaign = await prisma.campaign.findUnique({
    where: { id: req.params.id },
  });

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  if (projectId && typeof projectId === 'string' && campaign.projectId !== projectId) {
    return res.status(400).json({ error: 'Campaign does not belong to the specified project' });
  }

  // Verify project ownership
  const project = await prisma.project.findFirst({
    where: { id: campaign.projectId, userId: req.userId! },
  });

  if (!project) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ campaign });
};

export const deleteCampaign = async (req: AuthRequest, res: Response) => {
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

  const campaign = await campaignService.delete(req.params.id, projectId);

  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  res.json({ message: 'Campaign deleted successfully' });
};

export const approveCampaign = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, feedback, revisionTarget } = approveCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Verify project ownership
    const project = await prisma.project.findFirst({
      where: { id: campaign.projectId, userId: req.userId! },
    });

    if (!project) {
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
    }

    // Update campaign status and HITL fields in database
    const updatedCampaign = await prisma.campaign.update({
      where: { id },
      data: {
        status: 'processing',
        humanApprovalStatus: action === 'approve' ? 'approved' : 'rejected',
        humanFeedback: feedback || null,
        humanRevisionTarget: action === 'reject' ? revisionTarget : null,
        aiOutputs: currentOutputs as any,
      },
    });

    // Send 200 response immediately
    res.json({ message: 'Campaign approval submitted', campaign: updatedCampaign });

    // Call FastAPI in background to execute publisher agent
    const io = getIO();
    if (io) {
      const aiOutputs = campaign.aiOutputs ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) : {};
      
      void runAIWorkflowBackground(campaign.id, {
        campaign_name: campaign.name,
        brand_name: campaign.brandName || project.name,
        industry: campaign.industry,
        primary_goal: campaign.primaryGoal,
        target_audience: campaign.targetAudience,
        brand_voice: campaign.brandVoice,
        campaign_id: campaign.id,
        llm_config: llmConfig,
        // Pass existing outputs as strings
        manager_output: aiOutputs.manager_output ? JSON.stringify(aiOutputs.manager_output) : null,
        research_output: aiOutputs.research_output ? JSON.stringify(aiOutputs.research_output) : null,
        strategy_output: aiOutputs.strategy_output ? JSON.stringify(aiOutputs.strategy_output) : null,
        copy_output: aiOutputs.copy_output ? JSON.stringify(aiOutputs.copy_output) : null,
        image_output: aiOutputs.image_output ? JSON.stringify(aiOutputs.image_output) : null,
        review_output: aiOutputs.review_output ? JSON.stringify(aiOutputs.review_output) : null,
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

