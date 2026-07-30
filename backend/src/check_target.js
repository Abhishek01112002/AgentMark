const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.campaign.findUnique({
    where: { id: '518edf4c-223d-4c31-8f55-12cf2c129e06' },
  });

  if (!c) {
    console.log('Campaign 518edf4c not found');
    return;
  }

  console.log('=== CAMPAIGN 518EDF4C SNAPSHOT ===');
  console.log('ID:', c.id);
  console.log('Name:', c.name);
  console.log('Status:', c.status);
  console.log('AI Error:', c.aiError);
  console.log('Review Score:', c.reviewScore);
  console.log('Review Output:', c.reviewOutput ? (typeof c.reviewOutput === 'string' ? c.reviewOutput.substring(0, 300) : JSON.stringify(c.reviewOutput).substring(0, 300)) : null);
  
  const outputs = typeof c.aiOutputs === 'string' ? JSON.parse(c.aiOutputs) : (c.aiOutputs || {});
  console.log('Completed Agents:', outputs.completed_agents);
  console.log('Active Agent:', outputs.active_agent);
  console.log('Has Creative Hook Matrix:', !!outputs.creative_hook_matrix_output);
  console.log('Has Image Output:', !!outputs.image_output);
  console.log('Has Strategy Output:', !!outputs.strategy_output);
  console.log('Has Copywriter Output:', !!outputs.copywriter_output);
  console.log('Has Research Output:', !!outputs.research_output);
  console.log('Updated At:', c.updatedAt);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
