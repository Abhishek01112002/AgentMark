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
import crypto from 'crypto';
import type { Server } from 'socket.io';
import { campaignService } from '../modules/campaigns/campaign.service';
import prisma from '../db';
import { notificationService } from '../modules/notifications/notification.service';
import { redis } from './redis';
import { extractReviewScore } from './score-extractor';

// Defensive Prisma update wrapper for self-healing schema drift
async function safePrismaUpdate(campaignId: string, updateData: any) {
  try {
    return await prisma.campaign.update({
      where: { id: campaignId },
      data: updateData,
    });
  } catch (err: any) {
    if (err && err.message && (err.message.includes('Unknown argument') || err.message.includes('creativeHookMatrixRevisionCount'))) {
      const match = err.message.match(/Unknown argument `([^`]+)`/);
      const unknownField = match ? match[1] : 'creativeHookMatrixRevisionCount';
      console.warn(`[Redis Subscriber] Intercepted un-generated Prisma column '${unknownField}'. Stripping field and executing self-healing DB update...`);
      delete updateData[unknownField];
      return await prisma.campaign.update({
        where: { id: campaignId },
        data: updateData,
      });
    }
    throw err;
  }
}

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

// ── Promise Queue for Sequential DB Updates ───────────────────────────────────

class PromiseQueue {
  private queue: Promise<any> = Promise.resolve();

  add<T>(fn: () => Promise<T>): Promise<T> {
    let taskResolve: (val: T | PromiseLike<T>) => void;
    let taskReject: (reason?: any) => void;
    const taskPromise = new Promise<T>((res, rej) => {
      taskResolve = res;
      taskReject = rej;
    });

    this.queue = this.queue
      .then(async () => {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: any = null;

        while (attempts < maxAttempts) {
          try {
            attempts++;
            const res = await fn();
            taskResolve(res);
            return;
          } catch (err: any) {
            lastError = err;
            console.error(`[PromiseQueue] Task error (attempt ${attempts}/${maxAttempts}):`, err.message || err);
            if (attempts < maxAttempts) {
              const backoffMs = Math.pow(2, attempts) * 300 + Math.floor(Math.random() * 200);
              await new Promise((r) => setTimeout(r, backoffMs));
            }
          }
        }
        // All retries failed — reject the task promise so caller/DLQ receives failure
        taskReject(lastError);
      })
      .catch((err) => {
        taskReject(err);
      });

    return taskPromise;
  }
}

const dbWriteQueue = new PromiseQueue();

export const enqueueDbWrite = <T>(fn: () => Promise<T>): Promise<T> => {
  return dbWriteQueue.add(fn);
};

// ── Sliding Window Event Deduplication Cache ──────────────────────────────────

const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 1000;

function isDuplicateEvent(campaignId: string, agent: string, status: string, timestamp: string): boolean {
  if (!timestamp) return false; // Fail-safe: if no timestamp, process it anyway
  const key = `${campaignId}:${agent}:${status}:${timestamp}`;
  if (processedEvents.has(key)) {
    return true;
  }
  processedEvents.add(key);
  if (processedEvents.size > MAX_PROCESSED_EVENTS) {
    const firstKey = processedEvents.values().next().value;
    if (firstKey) {
      processedEvents.delete(firstKey);
    }
  }
  return false;
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
    try {
      let data: AgentUpdatePayload;

      try {
        data = JSON.parse(message) as AgentUpdatePayload;
      } catch {
        console.error('[Redis Subscriber] Failed to parse message:', message);
        return;
      }

      if (!data || typeof data !== 'object') {
        console.error('[Redis Subscriber] Message is not a valid object:', message);
        return;
      }

      const { campaign_id, status, outputs, timestamp, agent } = data;
      if (!campaign_id) {
        console.error('[Redis Subscriber] Missing campaign_id in message:', message);
        return;
      }

      let campaign = null;
      try {
        campaign = await prisma.campaign.findUnique({
          where: { id: campaign_id },
          select: {
            status: true,
            aiOutputs: true,
            projectId: true,
            name: true,
          },
        });
      } catch (err) {
        console.error(`[Redis Subscriber] Failed to load campaign record for event:`, err);
        return;
      }

      if (!campaign || campaign.status === 'deleted') {
        return;
      }

      if (isDuplicateEvent(campaign_id, agent, status, timestamp)) {
        console.log(`[Redis Subscriber] Discarding duplicate event: ${campaign_id}:${agent}:${status}:${timestamp}`);
        return;
      }

      // Multi-instance deduplication: set an NX lock in Redis per event payload for 10 seconds.
      // Only the primary backend replica that acquires the lock runs the DB write task.
      // Secondary replicas skip duplicate DB updates while maintaining local socket broadcasts.
      const eventHash = crypto.createHash('md5').update(`${_channel}:${message}`).digest('hex');
      const dbLockKey = `evt_db_lock:${eventHash}`;
      let isPrimaryReplica = true;
      try {
        const lockRes = await redis.set(dbLockKey, '1', 'EX', 10, 'NX');
        isPrimaryReplica = lockRes === 'OK';
      } catch (redisErr) {
        isPrimaryReplica = true;
      }

      // Only forward genuine agent progress events to the UI (not system terminal events).
      if (data.agent !== 'system') {
        if (isPrimaryReplica) {
          dbWriteQueue.add(async () => {
            // Re-fetch latest campaign record inside queue task to guarantee we merge against the freshest DB state
            const latestCampaign = await prisma.campaign.findUnique({
              where: { id: campaign_id },
              select: { aiOutputs: true }
            });

            const currentOutputs = latestCampaign?.aiOutputs 
              ? (typeof latestCampaign.aiOutputs === 'string' ? JSON.parse(latestCampaign.aiOutputs) : latestCampaign.aiOutputs) as Record<string, any>
              : {};
            
            if (!currentOutputs.completed_agents) {
              currentOutputs.completed_agents = [];
            }

            const pipelineKeys = ['manager', 'research', 'strategy', 'copywriter', 'creative_hook_matrix', 'image_prompt', 'reviewer', 'publisher'];
            const downstreamMap: Record<string, string[]> = {
              manager: ['research_output', 'strategy_output', 'copy_output', 'creative_hook_matrix_output', 'image_output', 'review_output', 'publisher_output'],
              research: ['strategy_output', 'copy_output', 'creative_hook_matrix_output', 'image_output', 'review_output', 'publisher_output'],
              strategy: ['copy_output', 'creative_hook_matrix_output', 'image_output', 'review_output', 'publisher_output'],
              copywriter: ['creative_hook_matrix_output', 'image_output', 'review_output', 'publisher_output'],
              creative_hook_matrix: ['image_output', 'review_output', 'publisher_output'],
              image_prompt: ['review_output', 'publisher_output'],
              reviewer: ['publisher_output'],
            };

            if (status === 'running') {
              const runningIdx = pipelineKeys.indexOf(data.agent);
              if (runningIdx !== -1) {
                // Filter out any agents at or after runningIdx from completed_agents
                currentOutputs.completed_agents = currentOutputs.completed_agents.filter((agent: string) => {
                  const idx = pipelineKeys.indexOf(agent);
                  return idx !== -1 && idx < runningIdx;
                });

                // Purge downstream outputs from database JSON state
                const toClear = downstreamMap[data.agent] || [];
                toClear.forEach((key) => {
                  delete currentOutputs[key];
                });
              }
            }
            
            if (status === 'completed' && !currentOutputs.completed_agents.includes(data.agent)) {
              currentOutputs.completed_agents.push(data.agent);
            }
            currentOutputs.active_agent = status === 'running' ? data.agent : null;

            // Merge intermediate outputs as they complete
            if (status === 'completed' && outputs && typeof outputs === 'object') {
              Object.assign(currentOutputs, outputs);
            }

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
            if (typeof (data as any).creative_hook_matrix_revision_count === 'number') {
              updateData.creativeHookMatrixRevisionCount = (data as any).creative_hook_matrix_revision_count;
            }
            if (typeof (data as any).image_revision_count === 'number') {
              updateData.imageRevisionCount = (data as any).image_revision_count;
            }

            await safePrismaUpdate(campaign_id, updateData);

            // Emit agent_update to socket room with full payload after DB persistence completes
            io.to(`campaign:${campaign_id}`).emit('agent_update', {
              ...data,
              outputs: currentOutputs,
            });
          }).catch(async (err: any) => {
            console.error(`[Redis Subscriber DB Queue] CRITICAL: Intermediate DB write failed after retries | campaign=${campaign_id} | error=${err.message}`);
            try {
              const dlqKey = `dlq:campaign_db_write:${campaign_id}:${Date.now()}`;
              await redis.set(dlqKey, JSON.stringify({ campaign_id, agent: data.agent, status: data.status, timestamp: data.timestamp, error: err.message, payload: data }), 'EX', 86400 * 7);
              console.log(`[Redis Subscriber] Saved failed DB write to Redis DLQ: ${dlqKey}`);
            } catch (dlqErr) {
              console.error(`[Redis Subscriber] Failed to save DB write to Redis DLQ:`, dlqErr);
            }
            io.to(`campaign:${campaign_id}`).emit('agent_update', { ...data, db_persisted: false });
          });
        } else {
        // Secondary replicas emit socket update without duplicating DB writes
        io.to(`campaign:${campaign_id}`).emit('agent_update', data);
      }
    }

      // Handle terminal events — update the PostgreSQL record via Prisma.
      // We queue terminal DB updates AND their subsequent socket emissions so that
      // the frontend navigates only after the DB updates are fully complete.
      if (['campaign_complete', 'awaiting_human_approval', 'failed'].includes(status)) {
        if (isPrimaryReplica) {
          dbWriteQueue.add(async () => {
            if (status === 'campaign_complete') {
              await campaignService.updateWithAIOutputs(
                campaign_id,
                campaign_id,
                (outputs ?? {}) as any,
                'completed'
              );
              io.to(`campaign:${campaign_id}`).emit('campaign_complete', data);
              console.log(`[Redis Subscriber] Campaign completed and saved to DB | id=${campaign_id}`);

            } else if (status === 'awaiting_human_approval') {
              const campaign = await prisma.campaign.findUnique({
                where: { id: campaign_id },
                select: { aiOutputs: true, name: true, projectId: true, status: true, humanFeedback: true, humanRevisionTarget: true },
              });
              const currentOutputs = campaign?.aiOutputs 
                ? (typeof campaign.aiOutputs === 'string' ? JSON.parse(campaign.aiOutputs) : campaign.aiOutputs) as Record<string, any>
                : {};

              const mergedOutputs = {
                ...currentOutputs,
                ...(outputs ?? {}),
              };

              const updateData: any = {
                status: 'awaiting_human_approval',
                aiOutputs: mergedOutputs as any,
              };
              
              if (outputs) {
                const isHumanRevision = !!(campaign as any)?.humanFeedback || !!(campaign as any)?.humanRevisionTarget || !!(outputs as any)?.human_feedback;
                if (isHumanRevision) {
                  if (typeof outputs.research_revision_count === 'number') {
                    updateData.researchRevisionCount = outputs.research_revision_count;
                  }
                  if (typeof outputs.strategy_revision_count === 'number') {
                    updateData.strategyRevisionCount = outputs.strategy_revision_count;
                  }
                  if (typeof outputs.copy_revision_count === 'number') {
                    updateData.copyRevisionCount = outputs.copy_revision_count;
                  }
                  if (typeof outputs.creative_hook_matrix_revision_count === 'number') {
                    updateData.creativeHookMatrixRevisionCount = outputs.creative_hook_matrix_revision_count;
                  }
                  if (typeof outputs.image_revision_count === 'number') {
                    updateData.imageRevisionCount = outputs.image_revision_count;
                  }
                } else {
                  updateData.researchRevisionCount = 0;
                  updateData.strategyRevisionCount = 0;
                  updateData.copyRevisionCount = 0;
                  updateData.creativeHookMatrixRevisionCount = 0;
                  updateData.imageRevisionCount = 0;
                }
                
                if (outputs.review_output) {
                  const reviewOutput = typeof outputs.review_output === 'string' 
                    ? JSON.parse(outputs.review_output) 
                    : outputs.review_output;
                  
                  updateData.reviewOutput = JSON.stringify(reviewOutput);
                  const qualityScore = extractReviewScore(reviewOutput);
                  if (typeof qualityScore === 'number') {
                    updateData.reviewScore = qualityScore;
                  }
                }
              }
              
              await safePrismaUpdate(campaign_id, updateData);

              const statusChanged = campaign?.status !== 'awaiting_human_approval';
              if (statusChanged && campaign) {
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
              io.to(`campaign:${campaign_id}`).emit('awaiting_human_approval', data);
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
          }).catch(async (err: any) => {
            console.error(`[Redis Subscriber DB Queue] CRITICAL: Terminal DB update failed after retries | campaign=${campaign_id} | status=${status} | error=${err.message}`);
            try {
              const dlqKey = `dlq:campaign_db_write:${campaign_id}:${Date.now()}`;
              await redis.set(dlqKey, JSON.stringify({ campaign_id, status, error: err.message, payload: data }), 'EX', 86400 * 7);
              console.log(`[Redis Subscriber] Saved terminal failed DB write to Redis DLQ: ${dlqKey}`);
            } catch (dlqErr) {
              console.error(`[Redis Subscriber] Failed to save DB write to Redis DLQ:`, dlqErr);
            }
            // Emit terminal socket fallback so UI doesn't hang indefinitely
            if (status === 'campaign_complete') io.to(`campaign:${campaign_id}`).emit('campaign_complete', { ...data, db_persisted: false });
            else if (status === 'awaiting_human_approval') io.to(`campaign:${campaign_id}`).emit('awaiting_human_approval', { ...data, db_persisted: false });
            else if (status === 'failed') io.to(`campaign:${campaign_id}`).emit('campaign_failed', { ...data, db_persisted: false });
          });
        } else {
          // Secondary replicas broadcast socket event without duplicate DB write
          if (status === 'campaign_complete') io.to(`campaign:${campaign_id}`).emit('campaign_complete', data);
          else if (status === 'awaiting_human_approval') {
            io.to(`campaign:${campaign_id}`).emit('human_approval_required', data);
            io.to(`campaign:${campaign_id}`).emit('awaiting_human_approval', data);
          } else if (status === 'failed') io.to(`campaign:${campaign_id}`).emit('campaign_failed', data);
        }
      }
    } catch (err: any) {
      console.error('[Redis Subscriber] Unexpected error in pmessage handler:', err.message || err);
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
