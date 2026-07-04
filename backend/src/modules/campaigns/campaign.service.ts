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
      
      if (scores.length > 0) {
        const avgScore100 = scores.reduce((a, b) => a + b, 0) / scores.length;
        reviewScore = parseFloat(avgScore100.toFixed(1));
      } else if (reviewOutput.overall_quality_score !== undefined && reviewOutput.overall_quality_score !== null) {
        reviewScore = parseFloat(reviewOutput.overall_quality_score.toFixed(1));
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

    const currentOutputs = existing?.aiOutputs
      ? (typeof existing.aiOutputs === 'string' ? JSON.parse(existing.aiOutputs) : existing.aiOutputs) as Record<string, any>
      : {};

    const mergedOutputs = {
      ...currentOutputs,
      ...aiOutputs,
    };

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
      await redis.set(`cancel:${id}`, "true", "EX", 3600);
      console.log(`[Campaign Service] Set cancellation flag in Redis for campaign ${id}`);
    } catch (error) {
      console.error("Failed to set cancellation flag in Redis:", error);
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
      await notificationService.create(project.userId, {
        type: 'warning',
        title: 'Campaign deleted',
        message: `Campaign "${campaign.name}" was removed.`,
      });
    }
    return campaign;
  },
};
