import prisma from '../../db';
import { notificationService } from '../notifications/notification.service';

export const projectService = {
  async create(userId: string, data: { name: string; description?: string }) {
    const project = await prisma.project.create({
      data: { ...data, userId },
    });

    await notificationService.create(userId, {
      type: 'success',
      title: 'Project created',
      message: `Project "${project.name}" is ready for campaigns.`,
    });

    return project;
  },

  async getAll(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaigns: true,
      },
    });

    // Auto-update project status based on campaign activity
    const updatedProjects = await Promise.all(
      projects.map(async (project) => {
        const hasProcessingCampaigns = project.campaigns.some((c: any) => c.status === 'processing');
        
        let newStatus = 'idle';
        if (hasProcessingCampaigns) {
          newStatus = 'active';
        }

        // Update project status in database if it changed
        await prisma.project.update({
          where: { id: project.id },
          data: { status: newStatus },
        });

        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: newStatus,
          updatedAt: project.updatedAt,
          createdAt: project.createdAt,
          campaignCount: project.campaigns.length,
        };
      })
    );

    return updatedProjects;
  },

  async getById(id: string, userId: string) {
    return prisma.project.findFirst({
      where: { id, userId },
      include: {
        campaigns: { orderBy: { createdAt: 'desc' } },
      },
    });
  },

  async delete(id: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) return null;

    await prisma.project.delete({ where: { id } });
    await notificationService.create(userId, {
      type: 'warning',
      title: 'Project deleted',
      message: `Project "${project.name}" was removed from your workspace.`,
    });
    return project;
  },
};
