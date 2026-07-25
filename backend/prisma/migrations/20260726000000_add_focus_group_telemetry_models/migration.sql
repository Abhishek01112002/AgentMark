-- CreateTable
CREATE TABLE "persona_memories" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "memoryType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "embeddingReady" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calibration_model_snapshots" (
    "id" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "driftDetected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calibration_model_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "persona_memories_projectId_personaId_idx" ON "persona_memories"("projectId", "personaId");

-- CreateIndex
CREATE INDEX "persona_memories_projectId_createdAt_idx" ON "persona_memories"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "persona_memories_projectId_personaId_createdAt_idx" ON "persona_memories"("projectId", "personaId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "calibration_model_snapshots_industry_createdAt_idx" ON "calibration_model_snapshots"("industry", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "persona_memories" ADD CONSTRAINT "persona_memories_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
