const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      name: true,
      status: true,
      humanApprovalStatus: true,
      humanFeedback: true,
      humanRevisionTarget: true
    }
  });
  console.log(campaigns);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
