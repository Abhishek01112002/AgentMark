/**
 * auth.middleware.ts — Dual-Mode Authentication Middleware
 *
 * Accepts two mutually exclusive credential types on the same
 * `Authorization: Bearer <token>` header:
 *
 *   1. JWT Session Token (web app, short-lived)
 *      Issued at login via /api/auth/login. Verified with jsonwebtoken.
 *      req.userId and req.userEmail are populated from the JWT payload.
 *
 *   2. Developer API Key (MCP server, long-lived)
 *      Issued via POST /api/developer/keys. Stored as SHA-256 hash in api_keys.
 *      On every request:
 *        a. The raw Bearer token is hashed with SHA-256.
 *        b. The hash is looked up in the api_keys table (isActive = true).
 *        c. If found, req.userId is populated from the key record.
 *        d. lastUsedAt is updated asynchronously (fire-and-forget) — never
 *           blocks the request lifecycle.
 *
 * Order of operations:
 *   Try JWT first (fast, in-memory, no DB hit for 99% of web app traffic).
 *   Fall back to API key lookup ONLY if JWT verification throws.
 *
 * This is fully backward compatible: existing JWT-authenticated routes and
 * clients are completely unaffected by this change.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyToken } from '../utils/jwt';
import prisma from '../db';
import { userLastMcpActivity } from './mcp-logger.middleware';

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  // Identifies the auth path taken — useful for downstream logging/auditing.
  authMethod?: 'jwt' | 'api_key';
}

export interface AuthenticatedUser {
  userId: string;
  userEmail?: string;
  authMethod: 'jwt' | 'api_key';
}

/**
 * Authenticates either a JWT token or Developer API key string.
 * Returns the authenticated user metadata or null if invalid.
 */
export async function authenticateToken(token: string): Promise<AuthenticatedUser | null> {
  if (!token) return null;
  const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token.trim();
  if (!cleanToken) return null;

  // ── Path 1: JWT Verification (Fast, in-memory) ─────────────────────────
  try {
    const decoded = verifyToken(cleanToken);
    if (decoded?.userId) {
      return {
        userId: decoded.userId,
        userEmail: decoded.email,
        authMethod: 'jwt',
      };
    }
  } catch {
    // JWT verification failed — try Developer API key
  }

  // ── Path 2: Developer API Key Lookup (DB query) ─────────────────────────
  try {
    const keyHash = crypto.createHash('sha256').update(cleanToken, 'utf8').digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        isActive: true,
      },
    });

    if (apiKey && apiKey.isActive) {
      userLastMcpActivity.set(apiKey.userId, Date.now());

      prisma.apiKey
        .update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        })
        .catch((err: Error) => {
          console.error('[auth] Failed to update API key lastUsedAt | err=%s', err.message);
        });

      return {
        userId: apiKey.userId,
        authMethod: 'api_key',
      };
    }
  } catch (error: any) {
    console.error('[auth] API key lookup failed | err=%s', error?.message);
  }

  return null;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const authUser = await authenticateToken(authHeader);
  if (!authUser) {
    res.status(401).json({ error: 'Invalid or revoked token / API key' });
    return;
  }

  req.userId = authUser.userId;
  req.userEmail = authUser.userEmail;
  req.authMethod = authUser.authMethod;
  next();
};
