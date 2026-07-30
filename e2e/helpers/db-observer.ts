import prisma from '../../backend/src/db/index';

export interface CampaignDbRecord {
  id: string;
  name: string;
  brandName: string;
  industry: string;
  primaryGoal: string;
  status: string;
  aiOutputs: Record<string, any> | null;
  aiError: string | null;
  reviewOutput: Record<string, any> | null;
  reviewScore: number | null;
  researchRevisionCount: number;
  strategyRevisionCount: number;
  copyRevisionCount: number;
  imageRevisionCount: number;
  projectId: string;
}

export class DbObserver {
  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {
    await prisma.$disconnect();
  }

  async getCampaign(campaignId: string): Promise<CampaignDbRecord | null> {
    const row = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      brandName: row.brandName,
      industry: row.industry,
      primaryGoal: row.primaryGoal,
      status: row.status,
      aiOutputs: typeof row.aiOutputs === 'string' ? JSON.parse(row.aiOutputs) : (row.aiOutputs as any),
      aiError: row.aiError,
      reviewOutput: typeof row.reviewOutput === 'string' ? JSON.parse(row.reviewOutput) : (row.reviewOutput as any),
      reviewScore: row.reviewScore,
      researchRevisionCount: row.researchRevisionCount || 0,
      strategyRevisionCount: row.strategyRevisionCount || 0,
      copyRevisionCount: row.copyRevisionCount || 0,
      imageRevisionCount: row.imageRevisionCount || 0,
      projectId: row.projectId,
    };
  }

  async ping(): Promise<boolean> {
    try {
      const res = await prisma.$queryRaw`SELECT 1`;
      return Array.isArray(res) && res.length > 0;
    } catch {
      return false;
    }
  }
}
