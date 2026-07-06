import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying campaign with status "completed" or any campaign with aiOutputs...');
  let campaign = await prisma.campaign.findFirst({
    where: { status: 'completed' },
    select: { id: true, name: true, status: true, aiOutputs: true }
  });

  if (!campaign) {
    console.log('No completed campaign found. Querying any campaign...');
    campaign = await prisma.campaign.findFirst({
      select: { id: true, name: true, status: true, aiOutputs: true }
    });
  }

  if (!campaign) {
    console.log('No campaigns found in the database.');
    return;
  }

  console.log(`Campaign ID: ${campaign.id}`);
  console.log(`Campaign Name: ${campaign.name}`);
  console.log(`Campaign Status: ${campaign.status}`);
  console.log('aiOutputs type:', typeof campaign.aiOutputs);
  if (campaign.aiOutputs) {
    const outputs = typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs;
    console.log('Top-level keys in aiOutputs:', Object.keys(outputs));
    console.log('Sample structure of copy_output keys:', outputs.copy_output ? Object.keys(typeof outputs.copy_output === 'string' ? JSON.parse(outputs.copy_output) : outputs.copy_output) : 'None');
    console.log('Sample structure of image_output keys:', outputs.image_output ? Object.keys(typeof outputs.image_output === 'string' ? JSON.parse(outputs.image_output) : outputs.image_output) : 'None');
    console.log('Full parsed aiOutputs JSON structure keys and types:');
    for (const key of Object.keys(outputs)) {
      const val = outputs[key];
      console.log(`- ${key}: ${typeof val}`);
    }
  } else {
    console.log('aiOutputs is null/undefined');
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
