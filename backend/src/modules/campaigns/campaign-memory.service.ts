import prisma from '../../db';
import logger from '../../utils/logger';
import type { CampaignMemorySnapshot } from '@prisma/client';

interface MemoryContext {
  formattedText: string;
}

export async function getClientMemory(projectId: string): Promise<MemoryContext | null> {
  try {
    const pastSnapshots: CampaignMemorySnapshot[] = await prisma.campaignMemorySnapshot.findMany({
      where: { projectId },
      orderBy: { completedAt: "desc" },
      take: 3,
    });

    if (pastSnapshots.length === 0) {
      return null;
    }

    const formatted = pastSnapshots.map((snap, i) => {
      let block = `Campaign ${i + 1} (${snap.completedAt.toDateString()}): Score ${snap.finalReviewScore ?? "N/A"}/100.`;

      if (!snap.humanApprovedOnFirstTry && snap.rejectionReasons) {
        const reasons = snap.rejectionReasons as Array<{targetAgent: string, feedbackText: string}>;
        reasons.forEach(r => {
          block += ` Client rejected ${r.targetAgent} output: "${r.feedbackText}"`;
        });
      } else if (snap.humanApprovedOnFirstTry) {
        block += ` Approved on first try with tone: ${snap.finalApprovedTone.join(", ")}`;
      }
      return block;
    }).join("\n");

    return { formattedText: `PAST CAMPAIGN HISTORY (most recent ${pastSnapshots.length}):\n${formatted}` };

  } catch (error) {
    logger.error("Campaign memory lookup failed:", error);
    return null;
  }
}

export async function recordHumanRejection(campaignId: string, projectId: string, targetAgent: string, feedbackText: string) {
  try {
    const existing = await prisma.campaignMemorySnapshot.findUnique({
      where: { campaignId },
    });

    const newReason = { targetAgent, feedbackText };

    if (existing) {
      const reasons = Array.isArray(existing.rejectionReasons)
        ? [...(existing.rejectionReasons as any[])]
        : [];

      // Avoid duplicates in case of double click or retry
      const isDuplicate = reasons.some(
        (r) => r.targetAgent === targetAgent && r.feedbackText === feedbackText
      );

      if (!isDuplicate) {
        reasons.push(newReason);
      }

      await prisma.campaignMemorySnapshot.update({
        where: { campaignId },
        data: {
          rejectionReasons: reasons,
          humanApprovedOnFirstTry: false,
        },
      });
    } else {
      await prisma.campaignMemorySnapshot.create({
        data: {
          campaignId,
          projectId,
          humanApprovedOnFirstTry: false,
          rejectionReasons: [newReason],
          finalApprovedTone: [],
          finalChannelsUsed: [],
        },
      });
    }
  } catch (error) {
    logger.error("Failed to record human rejection:", error);
  }
}

export async function saveMemorySnapshot(campaignId: string, projectId: string) {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return;

    const aiOutputs = campaign.aiOutputs
      ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) as Record<string, any>
      : {};

    const strategyOutput = aiOutputs.strategy_output
      ? (typeof aiOutputs.strategy_output === 'string' ? JSON.parse(aiOutputs.strategy_output) : aiOutputs.strategy_output)
      : null;

    const channels: string[] = [];
    if (strategyOutput?.channels && Array.isArray(strategyOutput.channels)) {
      channels.push(...strategyOutput.channels);
    } else if (strategyOutput?.execution?.channels && Array.isArray(strategyOutput.execution.channels)) {
      channels.push(...strategyOutput.execution.channels);
    }

    const existing = await prisma.campaignMemorySnapshot.findUnique({
      where: { campaignId },
    });

    let reasons: any[] = [];
    if (existing && Array.isArray(existing.rejectionReasons)) {
      reasons = [...(existing.rejectionReasons as any[])];
    } else if (campaign.humanFeedback && campaign.humanRevisionTarget) {
      reasons = [{ targetAgent: campaign.humanRevisionTarget, feedbackText: campaign.humanFeedback }];
    }

    const wasRejected = (existing?.humanApprovedOnFirstTry === false) || reasons.length > 0;
    const data: any = {
      projectId,
      campaignId,
      finalReviewScore: campaign.reviewScore ?? null,
      humanApprovedOnFirstTry: !wasRejected,
      finalApprovedTone: campaign.brandVoice ? [campaign.brandVoice] : [],
      finalChannelsUsed: channels,
      rejectionReasons: reasons,
    };

    await prisma.campaignMemorySnapshot.upsert({
      where: { campaignId },
      create: data,
      update: data,
    });
  } catch (error) {
    logger.error("Memory snapshot save failed:", error);
  }
}
