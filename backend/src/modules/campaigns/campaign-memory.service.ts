import prisma from '../../db';
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
    console.error("Campaign memory lookup failed:", error);
    return null;
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
    }

    const data: any = {
      projectId,
      campaignId,
      finalReviewScore: campaign.reviewScore ?? null,
      humanApprovedOnFirstTry: !campaign.humanRevisionTarget && !(campaign.humanFeedback && campaign.humanFeedback.trim().length > 0),
      finalApprovedTone: campaign.brandVoice ? [campaign.brandVoice] : [],
      finalChannelsUsed: channels,
    };

    if (campaign.humanFeedback) {
      data.rejectionReasons = [{ targetAgent: campaign.humanRevisionTarget, feedbackText: campaign.humanFeedback }];
    }

    await prisma.campaignMemorySnapshot.create({ data });
  } catch (error) {
    console.error("Memory snapshot save failed:", error);
  }
}
