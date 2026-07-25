import prisma from '../../db';
import { notificationService } from '../notifications/notification.service';

export const projectService = {
  async create(userId: string, data: { name: string; description?: string }) {
    const project = await prisma.project.create({
      data: { ...data, userId },
    });

    // Notification is fire-and-forget: a failure must NOT roll back project creation
    try {
      await notificationService.create(userId, {
        type: 'success',
        title: 'Project created',
        message: `Project "${project.name}" is ready for campaigns.`,
      });
    } catch (err) {
      console.error('[ProjectService] Failed to create project-created notification:', err);
    }

    return project;
  },

  async getAll(userId: string) {
    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaigns: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Auto-update project status — best-effort write, never fail the read on update error
    const projectsToUpdate = projects.filter(project => {
      const hasProcessingCampaigns = project.campaigns.some((c: any) => c.status === 'processing');
      const newStatus = hasProcessingCampaigns ? 'active' : 'idle';
      return project.status !== newStatus;
    });

    if (projectsToUpdate.length > 0) {
      try {
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
      } catch (err) {
        // Status sync is non-critical — never fail the read because of a write error
        console.error('[ProjectService] Non-fatal: failed to sync project statuses:', err);
      }
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

    // Notification is fire-and-forget: a failure must NOT roll back the rename
    if (data.name && data.name !== project.name) {
      try {
        await notificationService.create(userId, {
          type: 'info',
          title: 'Project renamed',
          message: `Project "${project.name}" was renamed to "${data.name}".`,
        });
      } catch (err) {
        console.error('[ProjectService] Failed to create project-renamed notification:', err);
      }
    }

    return updated;
  },

  async delete(id: string, userId: string) {
    const project = await prisma.project.findFirst({
      where: { id, userId },
    });

    if (!project) return null;

    // Run deletions in a transaction to prevent partial-deletion orphan data
    await prisma.$transaction([
      prisma.campaignMemorySnapshot.deleteMany({ where: { projectId: id } }),
      prisma.campaign.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);

    // Notification is fire-and-forget: a failure must NOT surface a 500 after successful deletion
    try {
      await notificationService.create(userId, {
        type: 'warning',
        title: 'Project deleted',
        message: `Project "${project.name}" was removed from your workspace.`,
      });
    } catch (err) {
      console.error('[ProjectService] Failed to create project-deleted notification:', err);
    }

    return project;
  },
};
