-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "researchRevisionCount" INTEGER DEFAULT 0,
ADD COLUMN     "strategyRevisionCount" INTEGER DEFAULT 0,
ADD COLUMN     "copyRevisionCount" INTEGER DEFAULT 0,
ADD COLUMN     "imageRevisionCount" INTEGER DEFAULT 0,
ADD COLUMN     "humanApprovalStatus" TEXT,
ADD COLUMN     "humanFeedback" TEXT,
ADD COLUMN     "humanRevisionTarget" TEXT,
ADD COLUMN     "reviewOutput" TEXT;
