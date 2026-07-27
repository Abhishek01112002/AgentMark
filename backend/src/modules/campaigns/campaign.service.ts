import prisma from '../../db';
import { AIAgentOutputs } from './campaign.types';
import { notificationService } from '../notifications/notification.service';
import { saveMemorySnapshot } from './campaign-memory.service';
import { redis } from '../../utils/redis';

export const campaignService = {
  async create(projectId: string, data: {
    name: string;
    brandName?: string;
    industry: string;
    primaryGoal: string;
    targetAudience: string;
    brandVoice: string;
    additionalInfo?: string;
  }) {
    const { name, brandName, industry, primaryGoal, targetAudience, brandVoice, additionalInfo } = data;

    const campaign = await prisma.campaign.create({
      data: { 
        name,
        brandName,
        industry,
        primaryGoal,
        targetAudience,
        brandVoice,
        additionalInfo: additionalInfo ?? null,
        projectId,
        status: 'processing' // Set to processing initially
      },
    });

    return campaign;
  },

  async updateWithAIOutputs(
    campaignId: string,
    aiCampaignId: string,
    aiOutputs: AIAgentOutputs,
    status: 'completed' | 'failed',
    aiError?: string
  ) {
    let reviewScore: number | null = null;
    
    if (aiOutputs.review_output) {
      try {
        const reviewOutput = typeof aiOutputs.review_output === 'string'
          ? JSON.parse(aiOutputs.review_output)
          : aiOutputs.review_output;
        
        const scores: number[] = [];
        
        if (reviewOutput.research_review?.score !== undefined && reviewOutput.research_review?.score !== null) {
          scores.push(reviewOutput.research_review.score);
        }
        if (reviewOutput.strategy_review?.score !== undefined && reviewOutput.strategy_review?.score !== null) {
          scores.push(reviewOutput.strategy_review.score);
        }
        if (reviewOutput.copy_review?.score !== undefined && reviewOutput.copy_review?.score !== null) {
          scores.push(reviewOutput.copy_review.score);
        }
        if (reviewOutput.image_review?.score !== undefined && reviewOutput.image_review?.score !== null) {
          scores.push(reviewOutput.image_review.score);
        }
        
        const overallScore = reviewOutput.overall_quality_score ?? reviewOutput.quality_score;
        if (typeof overallScore === 'number') {
          reviewScore = parseFloat(overallScore.toFixed(1));
        } else if (scores.length > 0) {
          const avgScore100 = scores.reduce((a, b) => a + b, 0) / scores.length;
          reviewScore = parseFloat(avgScore100.toFixed(1));
        }
      } catch (err) {
        console.error(`[CampaignService] Failed to parse review_output for score extraction (campaign: ${campaignId}):`, err);
        // reviewScore stays null — campaign still saves without a score
      }
    }

    const existing = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { aiOutputs: true, status: true },
    });

    if (existing?.status === 'deleted') {
      // Clean up database records (hard-delete)
      await prisma.campaignMemorySnapshot.deleteMany({
        where: { campaignId }
      });
      await prisma.campaign.delete({ where: { id: campaignId } });
      
      // Clean up Redis cancellation flag
      try {
        await redis.del(`cancel:${campaignId}`);
      } catch (err) {
        console.error(`Failed to delete Redis cancel flag for ${campaignId}:`, err);
      }
      console.log(`[Campaign Service] Campaign ${campaignId} hard-deleted after pipeline confirmed stop`);
      return existing as any;
    }

    let currentOutputs: Record<string, any> = {};
    if (existing?.aiOutputs) {
      try {
        currentOutputs = (typeof existing.aiOutputs === 'string'
          ? JSON.parse(existing.aiOutputs)
          : existing.aiOutputs) as Record<string, any>;
      } catch (err) {
        console.error(`[CampaignService] Failed to parse existing aiOutputs for campaign ${campaignId}:`, err);
        // Fall back to empty object — new outputs will overwrite
      }
    }

    const mergedOutputs: Record<string, any> = {
      ...currentOutputs,
      ...aiOutputs,
    };

    // Auto-record new copy version if copy_output changed and copy_versions history exists
    if (aiOutputs.copy_output && currentOutputs.copy_versions && Array.isArray(currentOutputs.copy_versions)) {
      const existingVersions: any[] = currentOutputs.copy_versions;
      const lastVer = existingVersions[existingVersions.length - 1];
      const newCopyStr = typeof aiOutputs.copy_output === 'string' ? aiOutputs.copy_output : JSON.stringify(aiOutputs.copy_output);
      const lastCopyStr = lastVer?.copy ? (typeof lastVer.copy === 'string' ? lastVer.copy : JSON.stringify(lastVer.copy)) : '';

      if (newCopyStr !== lastCopyStr) {
        const nextVerNum = (lastVer?.version || existingVersions.length) + 1;
        const newVerEntry = {
          version: nextVerNum,
          timestamp: new Date().toISOString(),
          copy: aiOutputs.copy_output,
          feedback_used: 'AI Rewrite (Focus Group Injected)',
        };
        mergedOutputs.copy_versions = [...existingVersions, newVerEntry].slice(-5);
      }
    }

    // Ensure manager_output channels and deliverables are intelligently populated
    const strategyChannels = mergedOutputs.strategy_output?.channels || mergedOutputs.strategy_output?.recommended_channels || [];
    const existingChannels = mergedOutputs.manager_output?.channels || mergedOutputs.channels || [];
    const effectiveChannels = (Array.isArray(existingChannels) && existingChannels.length > 0)
      ? existingChannels
      : (Array.isArray(strategyChannels) && strategyChannels.length > 0)
      ? strategyChannels
      : [];

    if (!mergedOutputs.manager_output || typeof mergedOutputs.manager_output !== 'object') {
      mergedOutputs.manager_output = {};
    }
    mergedOutputs.manager_output.channels = effectiveChannels;
    mergedOutputs.channels = effectiveChannels;

    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status,
        aiCampaignId,
        aiOutputs: mergedOutputs as any,
        aiError,
        reviewScore,
      },
    });

    const statusChanged = existing?.status !== status;
    if (statusChanged) {
      try {
        const project = await prisma.project.findUnique({ where: { id: campaign.projectId } });
        if (project) {
          await notificationService.create(project.userId, {
            type: status === 'completed' ? 'success' : 'error',
            title: status === 'completed' ? 'Campaign completed' : 'Campaign failed',
            message:
              status === 'completed'
                ? `Campaign "${campaign.name}" completed successfully.`
                : `Campaign "${campaign.name}" failed during processing.`,
          });
        }
      } catch (err) {
        console.error(`[CampaignService] Failed to create status-change notification for campaign ${campaignId}:`, err);
      }
    }

    if (status === 'completed') {
      void saveMemorySnapshot(campaignId, campaign.projectId);
    }

    return campaign;
  },

  async getAll(projectId: string) {
    return prisma.campaign.findMany({
      where: { 
        projectId,
        status: { not: 'deleted' }
      },
      select: {
        id: true,
        name: true,
        brandName: true,
        industry: true,
        primaryGoal: true,
        targetAudience: true,
        brandVoice: true,
        additionalInfo: true,
        status: true,
        aiCampaignId: true,
        reviewScore: true,
        aiError: true,
        createdAt: true,
        updatedAt: true,
        projectId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getById(id: string, projectId: string) {
    return prisma.campaign.findFirst({
      where: { id, projectId },
    });
  },

  async delete(id: string, projectId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id, projectId },
    });

    if (!campaign) return null;

    // Set Redis cancellation flag
    try {
      if (redis.status === 'ready' || redis.status === 'connecting') {
        await redis.set(`cancel:${id}`, "true", "EX", 3600);
        console.log(`[Campaign Service] Set cancellation flag in Redis for campaign ${id}`);
      }
    } catch (error: any) {
      console.error("Failed to set cancellation flag in Redis:", error?.message || error);
    }

    if (campaign.status === 'completed' || campaign.status === 'failed') {
      // Hard delete immediately since it is not running
      await prisma.campaignMemorySnapshot.deleteMany({
        where: { campaignId: id }
      });
      await prisma.campaign.delete({ where: { id } });
      console.log(`[Campaign Service] Campaign ${id} hard-deleted immediately (not running)`);
    } else {
      // Soft-delete to hide from dashboard, python pipeline will hard-delete on exit
      await prisma.campaign.update({
        where: { id },
        data: { status: 'deleted' }
      });
      console.log(`[Campaign Service] Campaign ${id} marked 'deleted' for pipeline cancellation`);
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project) {
      // Notification is fire-and-forget: a failure must NOT surface a 500 after successful deletion
      try {
        await notificationService.create(project.userId, {
          type: 'warning',
          title: 'Campaign deleted',
          message: `Campaign "${campaign.name}" was removed.`,
        });
      } catch (err) {
        console.error(`[CampaignService] Failed to create campaign-deleted notification for campaign ${id}:`, err);
      }
    }
    return campaign;
  },
};
