import prisma from '../../db';

export const projectService = {
  async create(userId: string, data: { name: string; description?: string }) {
    return prisma.project.create({
      data: { ...data, userId },
    });
  },

  async getAll(userId: string) {
    return prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { campaigns: true } },
      },
    });
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
    return project;
  },
};
