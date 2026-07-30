const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.campaign.findUnique({
    where: { id: '518edf4c-ff4e-41b9-9043-b3cfabed1095' }
  });

  console.log('=== CURRENT STATUS FOR 518EDF4C ===');
  console.log('Status:', c.status);
  console.log('UpdatedAt:', c.updatedAt);
  const outputs = typeof c.aiOutputs === 'string' ? JSON.parse(c.aiOutputs || '{}') : (c.aiOutputs || {});
  console.log('Completed agents:', outputs.completed_agents);
  console.log('Active agent:', outputs.active_agent);
  console.log('AI Error:', c.aiError);
  console.log('Review Score:', c.reviewScore);
  console.log('Review Output Keys:', c.reviewOutput ? Object.keys(c.reviewOutput) : 'None');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
