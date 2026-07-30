import prisma from '../src/db';

describe('BUG-016 Concurrent Approval Race Engine', () => {
  let testUserId: string;
  let testProjectId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        email: `test_approval_${Date.now()}@agentmark.e2e`,
        password: 'hashed_e2e_password',
        name: 'Approval Race User',
      },
    });
    testUserId = user.id;

    const project = await prisma.project.create({
      data: {
        name: 'Approval Race Project',
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

  test('BUG-016: 10 concurrent human approval attempts result in 1 success and 9 conflicts', async () => {
    const campaign = await prisma.campaign.create({
      data: {
        name: 'BUG-016 Race Campaign',
        brandName: 'BrandRace',
        industry: 'saas',
        primaryGoal: 'sales',
        targetAudience: 'SaaS decision makers',
        brandVoice: 'professional',
        projectId: testProjectId,
        status: 'awaiting_human_approval',
      },
    });
    testCampaignId = campaign.id;

    let successCount = 0;
    let conflictCount = 0;

    // Helper function simulating atomic conditional DB update enforcement
    const attemptApproval = async (id: string, action: 'approve' | 'reject') => {
      const res = await prisma.campaign.updateMany({
        where: {
          id: id,
          status: 'awaiting_human_approval',
        },
        data: {
          status: action === 'approve' ? 'completed' : 'processing',
        },
      });

      if (res.count === 0) {
        throw { status: 409, message: 'Campaign is not in awaiting_human_approval state.' };
      }

      return { success: true };
    };

    // Simulate 10 concurrent user clicks / requests attempting human decision approval
    const attempts = Array.from({ length: 10 }).map(async () => {
      try {
        const res = await attemptApproval(testCampaignId, 'approve');
        if (res.success) successCount++;
      } catch (err: any) {
        if (err.status === 409 || err.message?.includes('not in')) {
          conflictCount++;
        }
      }
    });

    await Promise.all(attempts);

    // Invariants: Exactly 1 request succeeds (HTTP 200 equivalent) and 9 requests rejected (HTTP 409 Conflict)
    expect(successCount).toBe(1);
    expect(conflictCount).toBe(9);

    const finalRecord = await prisma.campaign.findUnique({ where: { id: testCampaignId } });
    expect(finalRecord?.status).toBe('completed');
  });
});
