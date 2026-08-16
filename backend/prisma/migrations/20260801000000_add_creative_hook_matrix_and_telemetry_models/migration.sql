-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN IF NOT EXISTS "creativeHookMatrixRevisionCount" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "preflight_simulations" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "readinessScore" DOUBLE PRECISION,
    "passedGates" BOOLEAN NOT NULL DEFAULT true,
    "trustScore" DOUBLE PRECISION,
    "evidenceScore" DOUBLE PRECISION,
    "personaTrustScore" DOUBLE PRECISION,
    "decisionExplanation" JSONB,
    "devilsAdvocateIssues" JSONB,
    "telemetry" JSONB,
    "requestHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preflight_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "simulation_versions" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "scoringVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulation_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "performance_snapshots" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "spendUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "observedCtr" DOUBLE PRECISION,
    "observedCvr" DOUBLE PRECISION,
    "observedRoas" DOUBLE PRECISION,
    "snapshotDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "telemetry_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "normalizedMetrics" JSONB NOT NULL,
    "eventTimestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "provider_credentials" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "encryptedMetadata" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "signatureHeader" TEXT,
    "status" TEXT NOT NULL,
    "processingLatencyMs" DOUBLE PRECISION,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "brand_vault_events" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "attributeKey" TEXT NOT NULL,
    "previousVal" TEXT,
    "newVal" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_vault_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "brand_vault_snapshots" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "brandVersion" INTEGER NOT NULL,
    "snapshotData" JSONB NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_vault_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "preflight_simulations_campaignId_idx" ON "preflight_simulations"("campaignId");
CREATE INDEX IF NOT EXISTS "preflight_simulations_requestHash_idx" ON "preflight_simulations"("requestHash");
CREATE UNIQUE INDEX IF NOT EXISTS "simulation_versions_simulationId_key" ON "simulation_versions"("simulationId");
CREATE INDEX IF NOT EXISTS "performance_snapshots_campaignId_platform_idx" ON "performance_snapshots"("campaignId", "platform");
CREATE INDEX IF NOT EXISTS "performance_snapshots_snapshotDate_idx" ON "performance_snapshots"("snapshotDate");
CREATE UNIQUE INDEX IF NOT EXISTS "telemetry_events_eventId_key" ON "telemetry_events"("eventId");
CREATE INDEX IF NOT EXISTS "telemetry_events_organizationId_createdAt_idx" ON "telemetry_events"("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "telemetry_events_campaignId_idx" ON "telemetry_events"("campaignId");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_credentials_organizationId_platform_key" ON "provider_credentials"("organizationId", "platform");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_platform_deliveredAt_idx" ON "webhook_deliveries"("platform", "deliveredAt" DESC);
CREATE INDEX IF NOT EXISTS "brand_vault_events_projectId_version_idx" ON "brand_vault_events"("projectId", "version");
CREATE INDEX IF NOT EXISTS "brand_vault_events_projectId_timestamp_idx" ON "brand_vault_events"("projectId", "timestamp" DESC);
CREATE INDEX IF NOT EXISTS "brand_vault_snapshots_projectId_brandVersion_idx" ON "brand_vault_snapshots"("projectId", "brandVersion");
CREATE INDEX IF NOT EXISTS "campaigns_projectId_updatedAt_idx" ON "campaigns"("projectId", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS "campaigns_status_updatedAt_idx" ON "campaigns"("status", "updatedAt" DESC);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'preflight_simulations_campaignId_fkey') THEN
        ALTER TABLE "preflight_simulations" ADD CONSTRAINT "preflight_simulations_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'simulation_versions_simulationId_fkey') THEN
        ALTER TABLE "simulation_versions" ADD CONSTRAINT "simulation_versions_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "preflight_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'performance_snapshots_campaignId_fkey') THEN
        ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
