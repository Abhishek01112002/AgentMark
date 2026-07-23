-- CreateTable
CREATE TABLE "mcp_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "campaignId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcp_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcp_activities_userId_createdAt_idx" ON "mcp_activities"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "mcp_activities_campaignId_idx" ON "mcp_activities"("campaignId");

-- AddForeignKey
ALTER TABLE "mcp_activities" ADD CONSTRAINT "mcp_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
