/**
 * Redis Subscriber — Express.js
 *
 * Subscribes to all campaign Redis channels using the pattern "campaign:*".
 * Forwards real-time agent progress events to connected React clients via socket.io.
 * Handles terminal events (campaign_complete / awaiting_human_approval / failed)
 * by updating the PostgreSQL campaign record through Prisma before emitting to clients.
 *
 * Channel format: campaign:{campaign_id}
 * The campaign_id is the PostgreSQL UUID (not a FastAPI-generated UUID).
 */

import Redis from 'ioredis';
import type { Server } from 'socket.io';
import { campaignService } from '../modules/campaigns/campaign.service';
import prisma from '../db';
import { notificationService } from '../modules/notifications/notification.service';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgentUpdatePayload {
  campaign_id: string;
  agent: string;
  status: string;
  error?: string | null;
  timestamp: string;
  outputs?: Record<string, any>;
  workflow_finished?: boolean;
}

// ── Redis subscriber client ───────────────────────────────────────────────────

const subscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  lazyConnect: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 10000); // Max 10s between retries
    console.log(`[Redis Subscriber] Reconnecting in ${delay}ms (attempt ${times})`);
    return delay;
  },
  connectTimeout: 10000, // 10s
  maxRetriesPerRequest: 3,
});

subscriber.on('error', (err) => {
  console.error('[Redis Subscriber] Connection error:', err.message);
});

subscriber.on('reconnecting', () => {
  console.log('[Redis Subscriber] Reconnecting to Redis...');
});

subscriber.on('ready', () => {
  console.log('[Redis Subscriber] Connected to Redis successfully');
});

// ── Initialization ────────────────────────────────────────────────────────────

/**
 * Connect the Redis subscriber and set up message routing to socket.io rooms.
 * Must be called once after the socket.io Server is created.
 *
 * @param io - The socket.io Server instance used to emit events to rooms.
 */
export async function initRedisSubscriber(io: Server): Promise<void> {
  await subscriber.connect();

  // Subscribe to all campaign channels (pattern match)
  await subscriber.psubscribe('campaign:*');
  console.log('[Redis Subscriber] Subscribed to pattern: campaign:*');

  subscriber.on('pmessage', async (_pattern: string, _channel: string, message: string) => {
    let data: AgentUpdatePayload;

    try {
      data = JSON.parse(message) as AgentUpdatePayload;
    } catch {
      console.error('[Redis Subscriber] Failed to parse message:', message);
      return;
    }

    const { campaign_id, status, outputs } = data;

    // Only forward genuine agent progress events to the UI (not system terminal events).
    // Terminal events (campaign_complete, awaiting_human_approval, failed) have
    // agent="system" and are emitted separately below with their own event name,
    // preventing a noisy agent_update with agent="system" from reaching the live panel.
    if (data.agent !== 'system') {
      io.to(`campaign:${campaign_id}`).emit('agent_update', data);

      // Persist intermediate progress state in the database campaign record
      try {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaign_id },
          select: { aiOutputs: true },
        });
        if (campaign) {
          const currentOutputs = campaign.aiOutputs 
            ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) as Record<string, any>
            : {};
          
          if (!currentOutputs.completed_agents) {
            currentOutputs.completed_agents = [];
          }
          
          if (status === 'completed' && !currentOutputs.completed_agents.includes(data.agent)) {
            currentOutputs.completed_agents.push(data.agent);
          }
          currentOutputs.active_agent = status === 'running' ? data.agent : null;

          const updateData: any = {
            aiOutputs: currentOutputs as any,
          };

          if (typeof (data as any).research_revision_count === 'number') {
            updateData.researchRevisionCount = (data as any).research_revision_count;
          }
          if (typeof (data as any).strategy_revision_count === 'number') {
            updateData.strategyRevisionCount = (data as any).strategy_revision_count;
          }
          if (typeof (data as any).copy_revision_count === 'number') {
            updateData.copyRevisionCount = (data as any).copy_revision_count;
          }
          if (typeof (data as any).image_revision_count === 'number') {
            updateData.imageRevisionCount = (data as any).image_revision_count;
          }

          await prisma.campaign.update({
            where: { id: campaign_id },
            data: updateData,
          });
        }
      } catch (dbErr: any) {
        console.error(`[Redis Subscriber] Failed to persist intermediate progress | campaign=${campaign_id} | error=${dbErr.message}`);
      }
    }

    // Handle terminal events — update the PostgreSQL record via Prisma.
    try {
      if (status === 'campaign_complete') {
        // Use campaignService so the notification ("Campaign completed") is sent.
        await campaignService.updateWithAIOutputs(
          campaign_id,
          campaign_id,        // aiCampaignId == DB campaign_id in the Redis flow
          (outputs ?? {}) as any,
          'completed'
        );
        io.to(`campaign:${campaign_id}`).emit('campaign_complete', data);
        console.log(`[Redis Subscriber] Campaign completed and saved to DB | id=${campaign_id}`);

      } else if (status === 'awaiting_human_approval') {
        const campaign = await prisma.campaign.findUnique({
          where: { id: campaign_id },
          select: { aiOutputs: true, name: true, projectId: true },
        });
        const currentOutputs = campaign?.aiOutputs 
          ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) as Record<string, any>
          : {};

        const mergedOutputs = {
          ...currentOutputs,
          ...(outputs ?? {}),
        };

        // Update campaign with HITL state including revision counts
        const updateData: any = {
          status: 'awaiting_human_approval',
          aiOutputs: mergedOutputs as any,
        };
        
        // Extract and save revision counts if present in outputs
        if (outputs) {
          if (typeof outputs.research_revision_count === 'number') {
            updateData.researchRevisionCount = outputs.research_revision_count;
          }
          if (typeof outputs.strategy_revision_count === 'number') {
            updateData.strategyRevisionCount = outputs.strategy_revision_count;
          }
          if (typeof outputs.copy_revision_count === 'number') {
            updateData.copyRevisionCount = outputs.copy_revision_count;
          }
          if (typeof outputs.image_revision_count === 'number') {
            updateData.imageRevisionCount = outputs.image_revision_count;
          }
          
          // Extract review score from review_output
          if (outputs.review_output) {
            const reviewOutput = typeof outputs.review_output === 'string' 
              ? JSON.parse(outputs.review_output) 
              : outputs.review_output;
            
            // Save full review output for agent scores
            updateData.reviewOutput = JSON.stringify(reviewOutput);
            
            // Try both possible field names (overall_quality_score or quality_score)
            const qualityScore = reviewOutput.overall_quality_score ?? reviewOutput.quality_score;
            
            if (typeof qualityScore === 'number') {
              // Convert from 0-100 scale to 0-10 scale for frontend display
              updateData.reviewScore = qualityScore / 10;
              console.log(`[Redis Subscriber] Extracted review score: ${qualityScore}/100 (stored as ${qualityScore/10}/10)`);
            } else {
              console.log(`[Redis Subscriber] No quality score found in review_output`);
            }
          }
        }
        
        await prisma.campaign.update({
          where: { id: campaign_id },
          data: updateData,
        });

        if (campaign) {
          const project = await prisma.project.findUnique({ where: { id: campaign.projectId } });
          if (project) {
            await notificationService.create(project.userId, {
              type: 'info',
              title: 'Review Required',
              message: `Campaign "${campaign.name}" requires your review.`,
            });
          }
        }

        io.to(`campaign:${campaign_id}`).emit('human_approval_required', data);
        console.log(`[Redis Subscriber] Campaign awaiting human approval | id=${campaign_id}`);

      } else if (status === 'failed') {
        let finalOutputs = outputs;
        if (!finalOutputs) {
          try {
            const existing = await prisma.campaign.findUnique({
              where: { id: campaign_id },
              select: { aiOutputs: true }
            });
            finalOutputs = existing?.aiOutputs ? (typeof existing.aiOutputs === 'string' ? JSON.parse(existing.aiOutputs) : existing.aiOutputs) : {};
          } catch {
            finalOutputs = {};
          }
        }

        // Use campaignService so the "Campaign failed" notification is sent.
        await campaignService.updateWithAIOutputs(
          campaign_id,
          '',
          (finalOutputs ?? {}) as any,
          'failed',
          data.error ?? 'Unknown error'
        );
        io.to(`campaign:${campaign_id}`).emit('campaign_failed', data);
        console.log(`[Redis Subscriber] Campaign failed | id=${campaign_id} | error=${data.error}`);
      }
    } catch (dbErr: any) {
      console.error(
        `[Redis Subscriber] DB update failed | id=${campaign_id} | status=${status} | err=${dbErr.message}`
      );
    }
  });
}

/**
 * Gracefully shut down the Redis subscriber.
 * Unsubscribes from the pattern and closes the connection.
 */
export async function shutdownRedisSubscriber(): Promise<void> {
  try {
    console.log('[Redis Subscriber] Shutting down...');
    if (subscriber.status === 'ready') {
      await subscriber.punsubscribe('campaign:*');
      console.log('[Redis Subscriber] Unsubscribed from pattern: campaign:*');
    }
    await subscriber.quit();
    console.log('[Redis Subscriber] Disconnected from Redis successfully');
  } catch (err: any) {
    console.error('[Redis Subscriber] Error during shutdown:', err.message);
  }
}
