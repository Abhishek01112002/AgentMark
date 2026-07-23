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
  
    const projectIds = await prisma.project.findMany({
      where: { userId },
      select: { id: true },
    });
    const totalProjects = projectIds.length;
    const ids = projectIds.map(p => p.id);

    if (ids.length === 0) {
      return res.json({
        totalProjects: 0, completedCampaigns: 0, runningCampaigns: 0,
        avgReviewScore: 0, completionRate: 0, totalReviewedCampaigns: 0,
      });
    }

    const [statusCounts, scoreAgg] = await Promise.all([
      prisma.campaign.groupBy({
        by: ['status'],
        where: { projectId: { in: ids } },
        _count: { status: true },
      }),
      prisma.campaign.aggregate({
        where: { projectId: { in: ids }, reviewScore: { not: null } },
        _avg: { reviewScore: true },
        _count: { reviewScore: true },
      }),
    ]);

    const statusMap: Record<string, number> = {};
    for (const s of statusCounts) {
      statusMap[s.status] = s._count.status;
    }

    const completedCampaigns = statusMap['completed'] || 0;
    const runningCampaigns = statusMap['processing'] || 0;
    const failedCampaigns = statusMap['failed'] || 0;
    const awaitingApprovalCampaigns = statusMap['awaiting_human_approval'] || 0;
    const totalCampaignsCount = completedCampaigns + runningCampaigns + failedCampaigns + awaitingApprovalCampaigns;

    const avgReviewScore = scoreAgg._avg.reviewScore
      ? parseFloat(Number(scoreAgg._avg.reviewScore).toFixed(1))
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

export const getMemoryStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
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
    next(error);
  }
};
