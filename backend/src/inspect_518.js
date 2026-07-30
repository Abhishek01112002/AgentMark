const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    where: { id: { startsWith: '518edf' } },
  });

  console.log(`=== FOUND ${campaigns.length} CAMPAIGNS FOR 518EDF ===`);
  for (const c of campaigns) {
    console.log('\n----------------------------------------');
    console.log('ID:', c.id);
    console.log('Name:', c.name);
    console.log('Status:', c.status);
    console.log('AI Error:', c.aiError);
    console.log('reviewScore:', c.reviewScore);
    console.log('UpdatedAt:', c.updatedAt);
    
    const outputs = typeof c.aiOutputs === 'string' ? JSON.parse(c.aiOutputs || '{}') : (c.aiOutputs || {});
    console.log('Completed agents:', outputs.completed_agents);
    console.log('Active agent:', outputs.active_agent);
    if (c.reviewOutput) {
      console.log('Review output keys:', Object.keys(c.reviewOutput));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
