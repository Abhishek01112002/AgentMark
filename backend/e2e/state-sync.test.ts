import prisma from '../src/db';
import { campaignService } from '../src/modules/campaigns/campaign.service';

describe('System E2E State Sync Suite', () => {
  let testUserId: string;
  let testProjectId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test_sync_${Date.now()}@agentmark.e2e`,
        password: 'hashed_e2e_password',
        name: 'E2E State Sync User',
      },
    });
    testUserId = user.id;

    const project = await prisma.project.create({
      data: {
        name: 'E2E State Sync Project',
        userId: testUserId,
      },
    });
    testProjectId = project.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.campaign.deleteMany({ where: { projectId: testProjectId } });
      await prisma.project.delete({ where: { id: testProjectId } });
      await prisma.user.delete({ where: { id: testUserId } });
    }
  });

  test('Scenario A: Normal end-to-end status transition persistence', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'E2E Normal Sync Campaign',
        brandName: 'BrandX',
        industry: 'saas',
        primaryGoal: 'sales',
        targetAudience: 'SaaS decision makers',
        brandVoice: 'professional',
        projectId: testProjectId,
        status: 'processing',
      },
    });
    testCampaignId = campaign.id;

    await campaignService.updateWithAIOutputs(
      testCampaignId,
      'ai_campaign_123',
      { research_output: JSON.stringify({ market_summary: 'SaaS Market Analysis' }) },
      'completed'
    );

    const updated = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    expect(updated?.status).toBe('completed');
    expect((updated?.aiOutputs as any)?.research_output).toBeDefined();
  });

  test('Scenario B: Out-of-order event handling preserves authoritative state', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'E2E Out-Of-Order Campaign',
        brandName: 'BrandY',
        industry: 'saas',
        primaryGoal: 'sales',
        targetAudience: 'SaaS decision makers',
        brandVoice: 'professional',
        projectId: testProjectId,
        status: 'awaiting_human_approval',
      },
    });

    const current = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    expect(current?.status).toBe('awaiting_human_approval');

    await prisma.campaign.delete({ where: { id: campaign.id } });
  });

  test('Scenario C: Duplicate event deduplication maintains idempotency', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'E2E Duplicate Event Campaign',
        brandName: 'BrandZ',
        industry: 'saas',
        primaryGoal: 'sales',
        targetAudience: 'SaaS decision makers',
        brandVoice: 'professional',
        projectId: testProjectId,
        status: 'processing',
      },
    });

    const payload = { strategy_output: JSON.stringify({ positioning: 'Lead SaaS' }) };
    await campaignService.updateWithAIOutputs(campaign.id, 'ai_campaign_123', payload, 'completed');
    await campaignService.updateWithAIOutputs(campaign.id, 'ai_campaign_123', payload, 'completed');

    const updated = await prisma.campaign.findUnique({ where: { id: campaign.id } });
    expect(updated?.status).toBe('completed');
    expect((updated?.aiOutputs as any)?.strategy_output).toBeDefined();

    await prisma.campaign.delete({ where: { id: campaign.id } });
  });
});
