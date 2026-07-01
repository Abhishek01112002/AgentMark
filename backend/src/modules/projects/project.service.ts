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

    // Auto-update project status in the database ONLY if it has actually changed, avoiding N+1 write operations on every call
    const projectsToUpdate = projects.filter(project => {
      const hasProcessingCampaigns = project.campaigns.some((c: any) => c.status === 'processing');
      const newStatus = hasProcessingCampaigns ? 'active' : 'idle';
      return project.status !== newStatus;
    });

    if (projectsToUpdate.length > 0) {
      await Promise.all(
        projectsToUpdate.map(project => {
          const hasProcessingCampaigns = project.campaigns.some((c: any) => c.status === 'processing');
          const newStatus = hasProcessingCampaigns ? 'active' : 'idle';
          return prisma.project.update({
            where: { id: project.id },
            data: { status: newStatus },
          });
        })
      );
    }

    const updatedProjects = projects.map(project => {
      const hasProcessingCampaigns = project.campaigns.some((c: any) => c.status === 'processing');
      const newStatus = hasProcessingCampaigns ? 'active' : 'idle';

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: newStatus,
        updatedAt: project.updatedAt,
        createdAt: project.createdAt,
        campaignCount: project.campaigns.length,
      };
    });

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

  async update(id: string, userId: string, data: { name?: string; description?: string }) {
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });
    if (!project) return null;

    const updated = await prisma.project.update({
      where: { id },
      data,
    });

    if (data.name && data.name !== project.name) {
      await notificationService.create(userId, {
        type: 'info',
        title: 'Project renamed',
        message: `Project "${project.name}" was renamed to "${data.name}".`,
      });
    }

    return updated;
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
