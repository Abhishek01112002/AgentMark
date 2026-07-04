-- Campaign query performance indexes
CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status");
CREATE INDEX IF NOT EXISTS "campaigns_createdAt_idx" ON "campaigns"("createdAt");

-- Notification table moved from application-managed raw SQL into Prisma schema.
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications"("userId");
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'notifications_userId_fkey'
    ) THEN
        ALTER TABLE "notifications"
        ADD CONSTRAINT "notifications_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Align campaign memory snapshot foreign keys with Prisma cascade semantics.
ALTER TABLE "campaign_memory_snapshots"
DROP CONSTRAINT IF EXISTS "campaign_memory_snapshots_projectId_fkey";

ALTER TABLE "campaign_memory_snapshots"
ADD CONSTRAINT "campaign_memory_snapshots_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "projects"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_memory_snapshots"
DROP CONSTRAINT IF EXISTS "campaign_memory_snapshots_campaignId_fkey";

ALTER TABLE "campaign_memory_snapshots"
ADD CONSTRAINT "campaign_memory_snapshots_campaignId_fkey"
FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
