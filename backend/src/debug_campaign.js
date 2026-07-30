const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  console.log('=== RECENT CAMPAIGNS ===');
  for (const c of campaigns) {
    console.log(`ID: ${c.id} | Name: ${c.name} | Status: ${c.status} | CreatedAt: ${c.createdAt}`);
    const outputs = typeof c.aiOutputs === 'string' ? JSON.parse(c.aiOutputs || '{}') : (c.aiOutputs || {});
    console.log(`   Completed: ${JSON.stringify(outputs.completed_agents)} | Active: ${outputs.active_agent}`);
    if (c.id.toLowerCase().includes('518')) {
      console.log('   *** MATCH FOUND ***');
      console.log('   Full Campaign Object:', JSON.stringify(c, null, 2));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
