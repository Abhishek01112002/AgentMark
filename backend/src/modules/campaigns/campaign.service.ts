import prisma from '../../db';

export const campaignService = {
  async create(projectId: string, data: {
    name: string;
    industry: string;
    primaryGoal: string;
    targetAudience: string;
    brandVoice: string;
  }) {
    return prisma.campaign.create({
      data: { ...data, projectId },
    });
  },

  async getAll(projectId: string) {
    return prisma.campaign.findMany({
      where: { projectId },
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

    await prisma.campaign.delete({ where: { id } });
    return campaign;
  },
};
