const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.campaign.findUnique({
    where: { id: '518edf4c-ff4e-41b9-9043-b3cfabed1095' }
  });

  console.log('=== REVIEW OUTPUT DIAGNOSTIC ===');
  console.log('type of reviewOutput:', typeof c.reviewOutput);
  console.log('is Array:', Array.isArray(c.reviewOutput));
  if (typeof c.reviewOutput === 'object' && c.reviewOutput !== null) {
    if ('0' in c.reviewOutput) {
      console.log('DETECTED STRING-INDEXED OBJECT BUG!');
      const str = Object.values(c.reviewOutput).join('');
      console.log('Reconstructed String:', str.substring(0, 300));
      try {
        const parsed = JSON.parse(str);
        console.log('Parsed Object Keys:', Object.keys(parsed));
      } catch (err) {
        console.error('Failed to parse reconstructed string:', err.message);
      }
    } else {
      console.log('Object Keys:', Object.keys(c.reviewOutput));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
