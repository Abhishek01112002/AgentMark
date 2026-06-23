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
});

subscriber.on('error', (err) => {
  console.error('[Redis Subscriber] Connection error:', err.message);
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
        // campaignService has no specific method for this partial update — use prisma directly.
        await prisma.campaign.update({
          where: { id: campaign_id },
          data: {
            status: 'awaiting_human_approval',
            aiOutputs: (outputs ?? {}) as any,
          },
        });
        io.to(`campaign:${campaign_id}`).emit('human_approval_required', data);
        console.log(`[Redis Subscriber] Campaign awaiting human approval | id=${campaign_id}`);

      } else if (status === 'failed') {
        // Use campaignService so the "Campaign failed" notification is sent.
        await campaignService.updateWithAIOutputs(
          campaign_id,
          '',
          {} as any,
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
