-- Create Enums
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'RUNNING', 'REVIEW_NEEDED', 'COMPLETED', 'FAILED');
CREATE TYPE "AgentStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- Create Users Table
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL UNIQUE,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create Campaigns Table
CREATE TABLE IF NOT EXISTS "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "campaignName" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "brandVoice" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "campaigns_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Agent Logs Table
CREATE TABLE IF NOT EXISTS "agent_logs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "campaignId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL,
    "message" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "agent_logs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Campaign Output Table
CREATE TABLE IF NOT EXISTS "campaign_outputs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "campaignId" TEXT NOT NULL,
    "outputType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "campaign_outputs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS "campaigns_userId_idx" ON "campaigns"("userId");
CREATE INDEX IF NOT EXISTS "agent_logs_campaignId_idx" ON "agent_logs"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_outputs_campaignId_idx" ON "campaign_outputs"("campaignId");
