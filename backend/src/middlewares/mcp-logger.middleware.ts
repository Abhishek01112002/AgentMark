import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthRequest } from './auth.middleware';
import { verifyToken } from '../utils/jwt';
import prisma from '../db';
import { getIO } from '../modules/campaigns/campaign.controller';

/**
 * In-memory deduplication cache for MCP invocation IDs.
 * Each MCP tool call generates a unique invocation ID that is sent on every
 * sub-request within that tool call. We only log the FIRST request per
 * invocation ID and silently skip the rest.
 *
 * Entries auto-expire after 5 minutes to prevent unbounded growth.
 */
const recentInvocations = new Map<string, number>();
const INVOCATION_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup every 2 minutes to remove expired entries
setInterval(() => {
  const now = Date.now();
  for (const [id, timestamp] of recentInvocations) {
    if (now - timestamp > INVOCATION_TTL_MS) {
      recentInvocations.delete(id);
    }
  }
}, 2 * 60 * 1000);

/**
 * mcpLoggerMiddleware — Automatically intercepts incoming API requests
 * carrying the 'X-MCP-Tool-Name' header and records them in the McpActivity table.
 * Also emits the activity via Socket.io to the user's private channel.
 *
 * Deduplication: If 'X-MCP-Invocation-ID' header is present, only the first
 * request per invocation ID is logged. Subsequent sub-requests within the same
 * tool invocation are silently skipped.
 */
export const mcpLoggerMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const rawToolName = req.headers['x-mcp-tool-name'];

  if (rawToolName && typeof rawToolName === 'string') {
    // ── Invocation ID deduplication ──────────────────────────────────────
    const invocationId = req.headers['x-mcp-invocation-id'];
    if (invocationId && typeof invocationId === 'string') {
      if (recentInvocations.has(invocationId)) {
        // Already logged this tool invocation — skip duplicate
        return next();
      }
      recentInvocations.set(invocationId, Date.now());
    }

    // Resolve userId directly inside middleware if not set by authMiddleware yet
    let userId = req.userId;
    if (!userId) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = verifyToken(token);
          userId = decoded.userId;
        } catch {
          try {
            const keyHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');
            const apiKey = await prisma.apiKey.findUnique({
              where: { keyHash },
              select: { userId: true, isActive: true },
            });
            if (apiKey && apiKey.isActive) {
              userId = apiKey.userId;
            }
          } catch {
            // Ignore lookup failures
          }
        }
      }
    }

    if (userId) {
      const sanitizedUserId = userId;
      // Sanitize and limit toolName length to prevent header spamming
      const toolName = rawToolName.trim().slice(0, 100);

      if (toolName) {
        // Safely extract campaign_id if present in body or params
        const campaignId =
          req.params.id && typeof req.params.id === 'string' && req.params.id.match(/^[0-9a-fA-F-]{36}$/)
            ? req.params.id
            : req.body?.campaign_id && typeof req.body.campaign_id === 'string' && req.body.campaign_id.match(/^[0-9a-fA-F-]{36}$/)
            ? req.body.campaign_id
            : req.body?.campaignId && typeof req.body.campaignId === 'string' && req.body.campaignId.match(/^[0-9a-fA-F-]{36}$/)
            ? req.body.campaignId
            : null;

        // Extract metadata safely, omitting huge fields like copy_text
        const rawMetadata = req.body || {};
        const metadata: Record<string, any> = {};

        // Keep lightweight metadata only to save DB space and prevent leakage
        if (rawMetadata.name) metadata.name = String(rawMetadata.name).slice(0, 200);
        if (rawMetadata.brandName) metadata.brandName = String(rawMetadata.brandName).slice(0, 200);
        if (rawMetadata.primaryGoal) metadata.primaryGoal = String(rawMetadata.primaryGoal).slice(0, 100);
        if (rawMetadata.feedback) metadata.feedback = String(rawMetadata.feedback).slice(0, 300);

        // Async logging to avoid blocking the Express request execution pipeline
        setImmediate(async () => {
          try {
            const activity = await prisma.mcpActivity.create({
              data: {
                userId: sanitizedUserId,
                toolName,
                campaignId,
                metadata,
              },
              select: {
                id: true,
                toolName: true,
                campaignId: true,
                createdAt: true,
              },
            });

            // Emit to Socket.io user-specific room
            const io = getIO();
            if (io) {
              io.to(`user:${sanitizedUserId}`).emit('mcp_activity', activity);
            }
          } catch (err) {
            console.error('[McpLogger] Failed to save or broadcast MCP activity:', err);
          }
        });
      }
    }
  }

  next();
};
