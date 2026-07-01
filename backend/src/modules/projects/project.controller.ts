import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../../middlewares/auth.middleware';
import { projectService } from './project.service';
import prisma from '../../db';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export const createProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.parse(req.body);
    const project = await projectService.create(req.userId!, data);
    res.status(201).json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

export const getProjects = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId! },
      include: {
        campaigns: {
          orderBy: { updatedAt: 'desc' },
          select: {
            status: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const projectsWithMostRecentCampaignStatus = projects.map(project => {
      const mostRecentCampaign = project.campaigns[0];
      const campaignCount = project.campaigns.length;
      
      return {
        id: project.id,
        name: project.name,
        description: project.description,
        campaignCount,
        mostRecentCampaignStatus: mostRecentCampaign?.status || null,
        updatedAt: mostRecentCampaign?.updatedAt || project.updatedAt,
        createdAt: project.createdAt,
      };
    });

    res.json({ projects: projectsWithMostRecentCampaignStatus });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.getById(req.params.id, req.userId!);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = createProjectSchema.partial().parse(req.body);
    const project = await projectService.update(req.params.id, req.userId!, data);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ project });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    next(error);
  }
};

export const deleteProject = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const project = await projectService.delete(req.params.id, req.userId!);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
  
    // Get all projects with campaigns
    const projects = await prisma.project.findMany({
    where: { userId },
    include: {
      campaigns: {
        select: {
          status: true,
          reviewScore: true,
          aiOutputs: true,
        },
      },
    },
  });

  // Calculate metrics
  const totalProjects = projects.length;
  
  let completedCampaigns = 0;
  let runningCampaigns = 0;
  let failedCampaigns = 0;
  let awaitingApprovalCampaigns = 0;
  let totalReviewScore = 0;
  let reviewedCampaigns = 0;
  let totalCampaignsCount = 0;

  projects.forEach(project => {
    project.campaigns.forEach(campaign => {
      totalCampaignsCount++;
      if (campaign.status === 'completed') {
        completedCampaigns++;
      } else if (campaign.status === 'processing') {
        runningCampaigns++;
      } else if (campaign.status === 'failed') {
        failedCampaigns++;
      } else if (campaign.status === 'awaiting_human_approval') {
        awaitingApprovalCampaigns++;
      }
      
      let reviewScore = campaign.reviewScore;
      
      if (!reviewScore && campaign.aiOutputs) {
        try {
          const outputs = typeof campaign.aiOutputs === 'string' 
            ? JSON.parse(campaign.aiOutputs) 
            : campaign.aiOutputs;
          
          const reviewOutput = outputs.review_output 
            ? (typeof outputs.review_output === 'string' 
                ? JSON.parse(outputs.review_output) 
                : outputs.review_output)
            : null;
          
          if (reviewOutput) {
            const scores: number[] = [];
            if (reviewOutput.research_review?.score) scores.push(reviewOutput.research_review.score);
            if (reviewOutput.strategy_review?.score) scores.push(reviewOutput.strategy_review.score);
            if (reviewOutput.copy_review?.score) scores.push(reviewOutput.copy_review.score);
            if (reviewOutput.image_review?.score) scores.push(reviewOutput.image_review.score);
            
            if (scores.length > 0) {
              const avgScore100 = scores.reduce((a, b) => a + b, 0) / scores.length;
              reviewScore = parseFloat(avgScore100.toFixed(1));
            }
          }
        } catch (e) {
          console.error('Failed to extract review score:', e);
        }
      }
      
      if (reviewScore !== null && reviewScore !== undefined) {
        totalReviewScore += reviewScore;
        reviewedCampaigns++;
      }
    });
  });

  const avgReviewScore = reviewedCampaigns > 0 
    ? parseFloat((totalReviewScore / reviewedCampaigns).toFixed(1))
    : 0;

  const totalAttemptedCampaigns = completedCampaigns + runningCampaigns + failedCampaigns + awaitingApprovalCampaigns;
  const completionRate = totalAttemptedCampaigns > 0
    ? Math.round((completedCampaigns / totalAttemptedCampaigns) * 100)
    : 0;

    res.json({
      totalProjects,
      completedCampaigns,
      runningCampaigns,
      avgReviewScore,
      completionRate,
      totalReviewedCampaigns: totalCampaignsCount,
    });
  } catch (error) {
    next(error);
  }
};

export const getMemoryStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findFirst({
      where: { id, userId: req.userId! },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const count = await prisma.campaignMemorySnapshot.count({
      where: { projectId: id },
    });

    res.json({ hasMemory: count > 0, campaignCount: count });
  } catch (error) {
    console.error('Memory status check failed:', error);
    res.status(500).json({ error: 'Failed to check memory status' });
  }
};
