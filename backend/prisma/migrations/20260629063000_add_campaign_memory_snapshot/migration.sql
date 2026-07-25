-- CreateTable
CREATE TABLE "campaign_memory_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "finalReviewScore" DOUBLE PRECISION,
    "humanApprovedOnFirstTry" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReasons" JSONB,
    "finalApprovedTone" TEXT[],
    "finalChannelsUsed" TEXT[],
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_memory_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_memory_snapshots_campaignId_key" ON "campaign_memory_snapshots"("campaignId");

-- CreateIndex
CREATE INDEX "campaign_memory_snapshots_projectId_completedAt_idx" ON "campaign_memory_snapshots"("projectId", "completedAt");

-- AddForeignKey
ALTER TABLE "campaign_memory_snapshots" ADD CONSTRAINT "campaign_memory_snapshots_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_memory_snapshots" ADD CONSTRAINT "campaign_memory_snapshots_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
