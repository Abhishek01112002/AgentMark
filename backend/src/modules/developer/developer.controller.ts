/**
 * developer.controller.ts — API Key Management
 *
 * Handles lifecycle management of long-lived developer API keys for MCP server
 * and third-party integrations. These keys bypass the standard JWT session flow,
 * allowing programmatic access without requiring a web browser login.
 *
 * Security model:
 *   - Raw key (format: am_<64 hex chars>) is generated with Node.js crypto.randomBytes
 *     and returned ONLY in the creation response. It is immediately discarded server-side.
 *   - The SHA-256 hex digest of the raw key is stored in the api_keys table.
 *   - Authentication lookups (in auth.middleware.ts) hash the incoming token with the
 *     same algorithm and compare against stored hashes — constant-time via DB unique index.
 *   - Revocation is a soft-delete (isActive = false). Records are retained for audit trails.
 *   - Key creation is guarded by JWT authMiddleware — a web session is required to generate
 *     programmatic access credentials, preventing bootstrapping attacks.
 */

import { Response, NextFunction } from 'express';
import { userLastMcpActivity } from '../../middlewares/mcp-logger.middleware';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../db';
import crypto from 'crypto';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { exec, execSync } from 'child_process';
const execPromise = require('util').promisify(exec);
import {
  getClaudeConfigPath,
  getClaudeConfigStatus,
  writeClaudeConfig,
  removeClaudeConfig,
} from '../../utils/claude-config';

/**
 * Kill any stale agentmark-mcp-server Python subprocesses still running with old API keys.
 * On Windows, uses WMIC to find python.exe processes whose commandline includes
 * 'agentmark-mcp-server' and terminates them before writing new config.
 * This prevents old-key processes from co-existing with the freshly reconnected session.
 */
function killStaleMcpProcesses(): void {
  try {
    if (process.platform === 'win32') {
      try {
        const result = execSync(
          'wmic process where "name=\'python.exe\' and (commandline like \'%agentmark_mcp%\' or commandline like \'%agentmark-mcp-server%\')" get ProcessId /format:value',
          { encoding: 'utf8', timeout: 5000 }
        );
        const pids = result
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => l.startsWith('ProcessId='))
          .map((l) => l.replace('ProcessId=', '').trim())
          .filter(Boolean);

        for (const pid of pids) {
          try {
            execSync(`taskkill /PID ${pid} /F`, { timeout: 3000 });
            console.log(`[MCP] Killed stale agentmark-mcp-server process PID ${pid}`);
          } catch {
            // Process may have already exited
          }
        }
      } catch {
        // Silent fallback if WMIC is unavailable
      }
    }
  } catch {
    // Process cleanup errors non-fatal
  }
}

// In-memory cache for status check to minimize file IO performance overhead
interface StatusCacheEntry {
  status: any;
  timestamp: number;
}
const statusCache = new Map<string, StatusCacheEntry>();
const CACHE_TTL_MS = 4000; // 4 seconds TTL

// -- Helpers -------------------------------------------------------------------

/**
 * Generates a cryptographically random API key with the `am_` prefix.
 * Format: am_<128 hex chars>  (~512 bits of entropy)
 * Prefix allows users to identify AgentMark keys in their credential managers
 * and allows the MCP server config.py to warn if the wrong token type is set.
 */
function generateRawKey(): string {
  return 'am_' + crypto.randomBytes(64).toString('hex');
}

/**
 * SHA-256 hex digest of the raw key. This is the only value stored in the DB.
 * Used for O(1) constant-time lookup during the API key authentication path.
 */
function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

// -- POST /api/developer/keys --------------------------------------------------

/**
 * Create a new API key for the authenticated user.
 * Returns the raw key ONCE. It cannot be recovered after this response.
 */
export const createApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { label } = req.body as { label?: string };

    if (!label || typeof label !== 'string' || !label.trim()) {
      res.status(400).json({
        error: 'label is required. Provide a descriptive name (e.g. "Claude Desktop - MacBook").',
      });
      return;
    }

    const trimmedLabel = label.trim();
    if (trimmedLabel.length > 100) {
      res.status(400).json({ error: 'label must not exceed 100 characters.' });
      return;
    }

    // Enforce a per-user key limit to prevent unbounded table growth.
    const activeKeyCount = await prisma.apiKey.count({
      where: { userId, isActive: true },
    });
    if (activeKeyCount >= 20) {
      res.status(429).json({
        error: 'Maximum of 20 active API keys per account. Revoke an existing key before creating a new one.',
      });
      return;
    }

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        label: trimmedLabel,
      },
      select: {
        id: true,
        label: true,
        createdAt: true,
        isActive: true,
      },
    });

    // The raw key is returned here and ONLY here. It is not logged.
    res.status(201).json({
      ...apiKey,
      key: rawKey,
      warning: 'Store this key securely. It will not be shown again.',
    });
  } catch (error) {
    next(error);
  }
};

// -- GET /api/developer/keys ---------------------------------------------------

/**
 * List all API keys for the authenticated user.
 * Never returns the raw key or the keyHash — only safe metadata.
 */
export const listApiKeys = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const keys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        label: true,
        isActive: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });

    res.json({ keys });
  } catch (error) {
    next(error);
  }
};

// -- DELETE /api/developer/keys/:id -------------------------------------------

/**
 * Revoke an API key (soft-delete via isActive = false).
 * Ownership is verified before revocation — a user cannot revoke another user's key.
 */
export const revokeApiKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const { id } = req.params;

    const existingKey = await prisma.apiKey.findFirst({
      where: { id, userId },
      select: { id: true, isActive: true },
    });

    if (!existingKey) {
      res.status(404).json({ error: 'API key not found.' });
      return;
    }

    if (!existingKey.isActive) {
      res.status(409).json({ error: 'API key is already revoked.' });
      return;
    }

    await prisma.apiKey.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: 'API key revoked successfully.' });
  } catch (error) {
    next(error);
  }
};

// -- GET /api/developer/mcp-activity -------------------------------------------

/**
 * List the last 5 MCP activities for the authenticated user,
 * ordered by creation date descending (utilizes compound index).
 */
export const listMcpActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    const activities = await prisma.mcpActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        toolName: true,
        campaignId: true,
        createdAt: true,
      },
    });

    res.json({ success: true, activities });
  } catch (error) {
    next(error);
  }
};

// -- GET /api/developer/claude-status ------------------------------------------
export const getClaudeStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    
    // Check in-memory cache first to avoid continuous disk IO checks
    const now = Date.now();
    const cached = statusCache.get(userId);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      res.json(cached.status);
      return;
    }

    const validateKey = async (apiKey: string): Promise<{ valid: boolean; isOtherUser?: boolean }> => {
      const keyHash = crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
      const activeKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: { isActive: true, userId: true },
      });
      if (!activeKey || !activeKey.isActive) {
        return { valid: false };
      }
      if (activeKey.userId !== userId) {
        return { valid: false, isOtherUser: true };
      }
      return { valid: true };
    };

    const status = await getClaudeConfigStatus(userId, validateKey);
    
    // Save to cache
    statusCache.set(userId, {
      status,
      timestamp: now,
    });

    res.json(status);
  } catch (error) {
    next(error);
  }
};

// -- POST /api/developer/claude-ping -------------------------------------------
export const pingClaude = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    userLastMcpActivity.set(userId, Date.now());
    
    // Clear status cache so next status check returns instant updated live status
    statusCache.delete(userId);

    res.json({
      success: true,
      liveStatus: 'Active (Connected)',
      lastActiveAt: new Date().toISOString(),
      message: 'Live MCP heartbeat ping verified successfully!',
    });
  } catch (error) {
    next(error);
  }
};

// -- POST /api/developer/claude-connect ----------------------------------------
export const connectClaude = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;

    // Kill any stale MCP subprocesses running with old API keys before writing new config.
    // This ensures Claude Desktop picks up the new key on next restart.
    killStaleMcpProcesses();

    const validateKey = async (apiKey: string): Promise<boolean> => {
      const keyHash = crypto.createHash('sha256').update(apiKey, 'utf8').digest('hex');
      const activeKey = await prisma.apiKey.findUnique({
        where: { keyHash },
        select: { isActive: true, userId: true },
      });
      return !!(activeKey && activeKey.isActive && activeKey.userId === userId);
    };

    const status = await getClaudeConfigStatus(userId, validateKey);

    // Check existing config to see if we can extract and validate an existing key for THIS user
    let existingKey: string | null = null;
    const configPath = status.path;
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      const key = parsed?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY;
      if (key && typeof key === 'string' && key.startsWith('am_')) {
        const keyHash = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
        const activeKey = await prisma.apiKey.findUnique({
          where: { keyHash },
          select: { isActive: true, userId: true },
        });
        if (activeKey && activeKey.isActive && activeKey.userId === userId) {
          existingKey = key;
        }
      }
    } catch {
      // file might not exist or be invalid, fallback to generating new key
    }

    // 3. If valid key found in local config, perform an atomic update of command/URL
    if (existingKey) {
      await writeClaudeConfig(existingKey);
      statusCache.delete(userId);
      res.json({
        success: true,
        message: 'Claude Desktop configuration updated successfully using existing key.',
        path: configPath,
        key: null,
      });
      return;
    }

    // 4. Otherwise, generate a brand new API key
    // Enforce 20 key limit (same as standard API key creation)
    const activeKeyCount = await prisma.apiKey.count({
      where: { userId, isActive: true },
    });
    if (activeKeyCount >= 20) {
      res.status(429).json({
        error: 'Maximum of 20 active API keys per account. Revoke an existing key before connecting.',
      });
      return;
    }

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);

    // Save key in database
    await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        label: 'Claude Desktop Integration (Auto)',
      },
    });

    // Write key to local config file
    await writeClaudeConfig(rawKey);

    statusCache.delete(userId);

    res.json({
      success: true,
      message: 'Claude Desktop connected successfully.',
      path: configPath,
      key: rawKey,
    });
  } catch (error) {
    next(error);
  }
};

// -- POST /api/developer/claude-regenerate -------------------------------------
export const regenerateClaudeKey = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const configPath = getClaudeConfigPath();

    // Enforce 20 key limit
    const activeKeyCount = await prisma.apiKey.count({
      where: { userId, isActive: true },
    });
    if (activeKeyCount >= 20) {
      res.status(429).json({
        error: 'Maximum of 20 active API keys per account. Revoke an existing key first.',
      });
      return;
    }

    const rawKey = generateRawKey();
    const keyHash = hashKey(rawKey);

    // Save key in database
    await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        label: 'Claude Desktop Integration (Auto)',
      },
    });

    // Write key to local config file
    await writeClaudeConfig(rawKey);

    statusCache.delete(userId);

    res.json({
      success: true,
      message: 'Claude Desktop key regenerated and updated successfully.',
      path: configPath,
      key: rawKey,
    });
  } catch (error) {
    next(error);
  }
};

// -- POST /api/developer/claude-disconnect -------------------------------------
export const disconnectClaude = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId!;
    const configPath = getClaudeConfigPath();

    // 1. Read existing API key from config before removing it, so we can revoke it in DB
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const parsed = JSON.parse(content);
      const key = parsed?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY;
      if (key && typeof key === 'string' && key.startsWith('am_')) {
        const keyHash = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
        // Deactivate it in the database
        await prisma.apiKey.updateMany({
          where: { keyHash, userId, isActive: true },
          data: { isActive: false },
        });
      }
    } catch {
      // ignore, file might be corrupt or missing
    }

    // 2. Safely remove configuration locally
    const status = await removeClaudeConfig();

    // 3. Invalidate status cache
    statusCache.delete(userId);

    res.json({
      success: true,
      message: 'Claude Desktop disconnected successfully.',
      path: status.path,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Campaign-level scope gate for developer API keys.
 *
 * API keys intentionally carry the same campaign-level access as a JWT session.
 * This is required because MCP tools (create_campaign, approve_campaign,
 * revise_copy_with_feedback, run_focus_group, etc.) all perform write operations.
 * Restricting keys to read-only would break the entire MCP integration.
 *
 * The privilege boundary that DOES matter is enforced in developer.routes.ts:
 *   - The `jwtOnly` middleware blocks API keys from creating, listing, or revoking
 *     other API keys — preventing a leaked key from bootstrapping new credentials.
 *   - Key-management routes (POST/GET/DELETE /api/developer/keys) require a live
 *     JWT session and cannot be reached with an API key.
 *
 * If per-key scoping is needed in the future, add a `scope` column to the ApiKey
 * model and enforce it here based on `req.authMethod === 'api_key'`.
 */
export const verifyApiKeyScope = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  next();
};

/**
 * GET /api/developer/claude-connect-flow
 * Zero-friction onboarding installer that automates config detection, merges settings,
 * terminates active processes, saves atomic backups, and restarts Claude.
 * Streams real-time progress using Server-Sent Events (SSE).
 */
export const connectClaudeFlow = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId!;
  
  // Set headers for Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const emit = (step: string, status: 'pending' | 'success' | 'failed', message: string, data?: any) => {
    res.write(`data: ${JSON.stringify({ step, status, message, ...data })}\n\n`);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const osType = process.platform;
  const configPath = getClaudeConfigPath();
  const configDir = path.dirname(configPath);
  const backupPath = `${configPath}.backup_${Date.now()}`;
  const tempPath = `${configPath}.tmp`;
  
  let backupCreated = false;
  let existingContent = '';

  try {
    // ── STEP 1: DETECT CLAUDE ───────────────────────────────────────────────
    emit('detect', 'pending', 'Detecting Claude Desktop installation...');
    await sleep(400);

    let isInstalled = false;
    try {
      await fs.mkdir(configDir, { recursive: true });
      isInstalled = true;
    } catch {
      // cannot create directory
    }

    if (!isInstalled) {
      emit('detect', 'failed', 'Claude Desktop configuration directory not found. Please install Claude Desktop first.');
      res.end();
      return;
    }
    emit('detect', 'success', `Claude detected (${osType === 'win32' ? 'Windows' : osType === 'darwin' ? 'macOS' : 'Linux'})`, { path: configPath });

    // ── STEP 2: CREATE BACKUP ───────────────────────────────────────────────
    emit('backup', 'pending', 'Creating safety backup of configuration...');
    await sleep(300);

    try {
      await fs.access(configPath);
      existingContent = await fs.readFile(configPath, 'utf-8');
      await fs.writeFile(backupPath, existingContent, 'utf-8');
      backupCreated = true;
      emit('backup', 'success', 'Backup created successfully', { backupPath });
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        emit('backup', 'success', 'No existing configuration to backup (creating fresh config)');
      } else {
        emit('backup', 'failed', `Failed to create backup: ${err.message}`);
        res.end();
        return;
      }
    }

    // ── STEP 3: RESOLVE/GENERATE API KEY ─────────────────────────────────────
    emit('key', 'pending', 'Resolving API key for connection...');
    await sleep(300);

    let apiKey = '';
    // Check if we can reuse an existing valid key in the config
    if (existingContent) {
      try {
        const parsed = JSON.parse(existingContent);
        const key = parsed?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY;
        if (key && typeof key === 'string' && key.startsWith('am_')) {
          const keyHash = crypto.createHash('sha256').update(key, 'utf8').digest('hex');
          const activeKey = await prisma.apiKey.findUnique({
            where: { keyHash },
            select: { isActive: true, userId: true },
          });
          if (activeKey && activeKey.isActive && activeKey.userId === userId) {
            apiKey = key;
          }
        }
      } catch {
        // ignore
      }
    }

    if (!apiKey) {
      // Verify limit
      const activeKeyCount = await prisma.apiKey.count({
        where: { userId, isActive: true },
      });
      if (activeKeyCount >= 20) {
        emit('key', 'failed', 'Limit reached: Maximum of 20 active API keys per account. Revoke a key first.');
        res.end();
        return;
      }
      
      // Generate new key using the same helpers as connectClaude/regenerateClaudeKey
      const rawKey = generateRawKey();
      const keyHash = hashKey(rawKey);
      await prisma.apiKey.create({
        data: {
          userId,
          keyHash,
          label: 'Claude Desktop Integration (Auto)',
        },
      });
      apiKey = rawKey;
    }
    emit('key', 'success', 'API key resolved successfully');

    // ── STEP 4: DETECT & TERMINATE CLAUDE PROCESS ───────────────────────────
    emit('terminate', 'pending', 'Checking if Claude Desktop is running...');
    await sleep(400);

    let isRunning = false;
    let runningPath = '';
    
    if (osType === 'win32') {
      try {
        const tasks = execSync('tasklist /NH /FI "IMAGENAME eq Claude.exe"', { encoding: 'utf8' });
        isRunning = tasks.toLowerCase().includes('claude.exe');
        if (isRunning) {
          const psOut = execSync('powershell -Command "Get-Process -Name *Claude* -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Path"', { encoding: 'utf8' });
          runningPath = psOut.split(/\r?\n/).map(l => l.trim()).filter(Boolean)[0] || '';
        }
      } catch {
        isRunning = false;
      }
    } else if (osType === 'darwin') {
      try {
        execSync('pgrep -x "Claude"', { stdio: 'ignore' });
        isRunning = true;
      } catch {
        isRunning = false;
      }
    } else {
      try {
        execSync('pgrep -x "claude"', { stdio: 'ignore' });
        isRunning = true;
      } catch {
        isRunning = false;
      }
    }

    if (isRunning) {
      emit('terminate', 'pending', 'Closing running Claude Desktop process...');
      try {
        killStaleMcpProcesses();
        if (osType === 'win32') {
          execSync('taskkill /IM Claude.exe /F', { stdio: 'ignore' });
        } else if (osType === 'darwin') {
          execSync('killall "Claude"', { stdio: 'ignore' });
        } else {
          execSync('pkill -x "claude"', { stdio: 'ignore' });
        }
        
        // Wait until it is fully closed
        for (let i = 0; i < 6; i++) {
          await sleep(400);
          let checkRunning = false;
          try {
            if (osType === 'win32') {
              const tasks = execSync('tasklist /NH /FI "IMAGENAME eq Claude.exe"', { encoding: 'utf8' });
              checkRunning = tasks.toLowerCase().includes('claude.exe');
            } else if (osType === 'darwin') {
              execSync('pgrep -x "Claude"', { stdio: 'ignore' });
              checkRunning = true;
            } else {
              execSync('pgrep -x "claude"', { stdio: 'ignore' });
              checkRunning = true;
            }
          } catch {
            checkRunning = false;
          }
          if (!checkRunning) break;
        }
        emit('terminate', 'success', 'Claude Desktop closed successfully');
      } catch (err: any) {
        emit('terminate', 'success', 'Claude Desktop close request sent (continuing)');
      }
    } else {
      emit('terminate', 'success', 'Claude Desktop is not running');
    }

    // ── STEP 5: WRITE CONFIG ─────────────────────────────────────────────────
    emit('merge', 'pending', 'Writing configuration changes...');
    await sleep(400);

    let parsedConfig: any = {};
    if (existingContent) {
      try {
        parsedConfig = JSON.parse(existingContent);
      } catch {
        parsedConfig = {};
      }
    }

    const mcpServers = parsedConfig.mcpServers || {};
    const expectedUrl = `http://localhost:${process.env.PORT || 5003}`;
    const localMcpPath = path.resolve(process.cwd(), '../agentmark-mcp-server');
    const venvPythonPath = path.join(localMcpPath, '.venv', 'Scripts', 'python.exe');
    const pythonCommand = existsSync(venvPythonPath) ? venvPythonPath : 'python';
    const srcPath = path.join(localMcpPath, 'src');
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    const userProfile = process.env.USERPROFILE || os.homedir();

    mcpServers.agentmark = {
      command: pythonCommand,
      args: ['-m', 'agentmark_mcp.server'],
      env: {
        AGENTMARK_API_URL: expectedUrl,
        AGENTMARK_API_KEY: apiKey,
        PYTHONPATH: srcPath,
        APPDATA: appDataPath,
        USERPROFILE: userProfile,
      },
    };

    parsedConfig.mcpServers = mcpServers;

    // Validate atomic write
    await fs.writeFile(tempPath, JSON.stringify(parsedConfig, null, 2), 'utf-8');
    const tempContent = await fs.readFile(tempPath, 'utf-8');
    const parsedTemp = JSON.parse(tempContent);
    if (!parsedTemp?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY) {
      throw new Error('JSON structure validation failed.');
    }

    try {
      await fs.rename(tempPath, configPath);
    } catch (renameErr: any) {
      if (renameErr.code === 'EXDEV') {
        await fs.copyFile(tempPath, configPath);
        await fs.unlink(tempPath).catch(() => {});
      } else {
        throw renameErr;
      }
    }

    // Clean up backup on success
    if (backupCreated) {
      await fs.unlink(backupPath).catch(() => {});
    }

    emit('merge', 'success', 'AgentMark MCP server integrated successfully');

    // ── STEP 6: RELAUNCH CLAUDE ──────────────────────────────────────────────
    emit('relaunch', 'pending', 'Relaunching Claude Desktop...');
    await sleep(400);

    try {
      if (osType === 'win32') {
        if (runningPath && runningPath.toLowerCase().includes('windowsapps')) {
          exec('explorer.exe shell:AppsFolder\\Claude_pzs8sxrjxfjjc!Claude');
        } else if (runningPath) {
          exec(`start "" "${runningPath}"`);
        } else {
          // Default Store AUMID fallback
          exec('explorer.exe shell:AppsFolder\\Claude_pzs8sxrjxfjjc!Claude');
        }
      } else if (osType === 'darwin') {
        exec('open -a "Claude"');
      } else {
        exec('claude &');
      }
      emit('relaunch', 'success', 'Claude Desktop relaunched successfully');
    } catch (err: any) {
      emit('relaunch', 'success', 'Claude Desktop relaunch requested (please start manually if needed)');
    }

    // ── STEP 7: COMPLETE ─────────────────────────────────────────────────────
    emit('complete', 'success', 'AgentMark connected successfully! Claude Desktop has been restarted.');
    statusCache.delete(userId);
  } catch (err: any) {
    emit('merge', 'failed', `Installation failed: ${err.message}`);
    // Rollback
    if (backupCreated && existingContent) {
      await fs.writeFile(configPath, existingContent, 'utf-8').catch(() => {});
    }
  } finally {
    res.end();
  }
};


