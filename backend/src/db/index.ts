import { PrismaClient } from '@prisma/client';

function getResilientDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  let cleanUrl = url.trim();
  // If Neon database and doesn't contain -pooler, inject -pooler for serverless pooling
  if (cleanUrl.includes('neon.tech') && !cleanUrl.includes('-pooler')) {
    cleanUrl = cleanUrl.replace(/(@ep-[a-z0-9-]+)(\.[^/]+\/)/, '$1-pooler$2');
  }
  // Ensure connection pooling timeout parameters are attached
  if (!cleanUrl.includes('connect_timeout')) {
    const separator = cleanUrl.includes('?') ? '&' : '?';
    cleanUrl = `${cleanUrl}${separator}connect_timeout=15&pool_timeout=15&connection_limit=10`;
  }
  return cleanUrl;
}

const resilientUrl = getResilientDatabaseUrl();

const prisma = new PrismaClient({
  datasources: resilientUrl ? { db: { url: resilientUrl } } : undefined,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export default prisma;

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

