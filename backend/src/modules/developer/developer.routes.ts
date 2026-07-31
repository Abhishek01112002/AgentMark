/**
 * developer.routes.ts — Developer API Key Management Routes
 *
 * All three routes are intentionally guarded by JWT authMiddleware.
 * Key generation MUST require a valid web session — this prevents
 * an attacker from using a leaked API key to generate new API keys,
 * creating a self-perpetuating attack vector.
 *
 * Routes:
 *   POST   /api/developer/keys        Create a new API key (returns raw key once)
 *   GET    /api/developer/keys        List all keys for the authenticated user
 *   DELETE /api/developer/keys/:id    Revoke a specific key (soft-delete)
 */

import { Router, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  listMcpActivities,
  getClaudeStatus,
  connectClaude,
  regenerateClaudeKey,
  disconnectClaude,
  verifyApiKeyScope,
  connectClaudeFlow,
  pingClaude,
  verifyClaudeConnection,
  setClaudeSelection,
} from './developer.controller';
import { developerConnectionRateLimiter } from '../../middlewares/rate-limit.middleware';

const router = Router();

// All developer routes require an active JWT session.
router.use(authMiddleware);

// Exposed before the jwtOnly block to allow both session JWT and program key access
router.get('/mcp-activity', verifyApiKeyScope, listMcpActivities);
router.get('/keys', listApiKeys);

// Middleware to enforce that only JWT session authentication is allowed (no API key access to key management)
const jwtOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.authMethod !== 'jwt') {
    res.status(403).json({ error: 'Key management actions require a valid web session (JWT).' });
    return;
  }
  next();
};

router.use(jwtOnly);

router.post('/keys', createApiKey);
router.delete('/keys/:id', revokeApiKey);

// Claude Desktop Connection Endpoints
router.get('/claude-status', developerConnectionRateLimiter, getClaudeStatus);
router.post('/claude-ping', developerConnectionRateLimiter, pingClaude);
router.get('/claude-verify', developerConnectionRateLimiter, verifyClaudeConnection);
router.post('/claude-connect', developerConnectionRateLimiter, connectClaude);
router.get('/claude-connect-flow', developerConnectionRateLimiter, connectClaudeFlow);
router.post('/claude-regenerate', developerConnectionRateLimiter, regenerateClaudeKey);
router.post('/claude-disconnect', developerConnectionRateLimiter, disconnectClaude);
router.post('/claude-selection', developerConnectionRateLimiter, setClaudeSelection);

export default router;
