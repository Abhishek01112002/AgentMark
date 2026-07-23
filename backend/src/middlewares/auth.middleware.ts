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

export interface AuthRequest extends Request {
  userId?: string;
  userEmail?: string;
  // Identifies the auth path taken — useful for downstream logging/auditing.
  authMethod?: 'jwt' | 'api_key';
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

  const token = authHeader.substring(7); // Strip "Bearer " prefix

  // ── Path 1: JWT Verification ─────────────────────────────────────────────
  // Fast path. No DB hit. Handles all web app traffic.
  try {
    const decoded = verifyToken(token);
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.authMethod = 'jwt';
    next();
    return;
  } catch {
    // JWT verification failed. Token is not a valid JWT — check if it is
    // a developer API key before rejecting the request.
  }

  // ── Path 2: Developer API Key Lookup ─────────────────────────────────────
  // Slower path (one DB query). Handles MCP server and programmatic access.
  try {
    const keyHash = crypto.createHash('sha256').update(token, 'utf8').digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        isActive: true,
      },
    });

    if (!apiKey || !apiKey.isActive) {
      res.status(401).json({ error: 'Invalid or revoked API key' });
      return;
    }

    req.userId = apiKey.userId;
    req.authMethod = 'api_key';

    // Fire-and-forget: update lastUsedAt without blocking the request.
    // If this write fails (e.g., transient DB error), it is non-fatal —
    // the request still succeeds. Audit accuracy is best-effort.
    prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      })
      .catch((err: Error) => {
        console.error('[auth] Failed to update API key lastUsedAt | err=%s', err.message);
      });

    next();
  } catch (error: any) {
    console.error('[auth] API key lookup failed | err=%s', error?.message);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
