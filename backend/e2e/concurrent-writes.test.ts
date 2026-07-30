import prisma from '../src/db';
import { campaignService } from '../src/modules/campaigns/campaign.service';

describe('BUG-004 Concurrent aiOutputs Multi-Writer Engine', () => {
  let testUserId: string;
  let testProjectId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test_writer_${Date.now()}@agentmark.e2e`,
        password: 'hashed_e2e_password',
        name: 'Concurrent Writer User',
      },
    });
    testUserId = user.id;

    const project = await prisma.project.create({
      data: {
        name: 'Concurrent Writer Project',
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

  test('BUG-004: Sequential multi-writer updates merge all agent outputs without data loss', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'BUG-004 Multi-Writer Campaign',
        brandName: 'BrandMulti',
        industry: 'saas',
        primaryGoal: 'sales',
        targetAudience: 'SaaS decision makers',
        brandVoice: 'professional',
        projectId: testProjectId,
        status: 'processing',
        aiOutputs: { initial: 'data' },
      },
    });
    testCampaignId = campaign.id;

    // Execute writers in pipeline order
    await campaignService.updateWithAIOutputs(testCampaignId, 'ai_c_1', { research_output: JSON.stringify({ research: 'done' }) }, 'completed');
    await campaignService.updateWithAIOutputs(testCampaignId, 'ai_c_1', { strategy_output: JSON.stringify({ strategy: 'done' }) }, 'completed');
    await campaignService.updateWithAIOutputs(testCampaignId, 'ai_c_1', { copy_output: JSON.stringify({ copy: 'done' }) }, 'completed');
    await campaignService.updateWithAIOutputs(testCampaignId, 'ai_c_1', { image_output: JSON.stringify({ image: 'done' }) }, 'completed');
    await campaignService.updateWithAIOutputs(testCampaignId, 'ai_c_1', { review_output: JSON.stringify({ review: 'done' }) }, 'completed');

    const finalRecord = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    const outputs = (finalRecord?.aiOutputs as Record<string, any>) || {};

    // Invariant: Final aiOutputs must contain merged results of all valid agent updates
    expect(outputs.initial).toBe('data');
    expect(outputs.research_output).toBeDefined();
    expect(outputs.strategy_output).toBeDefined();
    expect(outputs.copy_output).toBeDefined();
    expect(outputs.image_output).toBeDefined();
    expect(outputs.review_output).toBeDefined();
  });
});
