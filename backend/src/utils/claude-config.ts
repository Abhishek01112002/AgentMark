import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

import { userLastMcpActivity } from '../middlewares/mcp-logger.middleware';

// ---------------------------------------------------------------------------
// Truthful 9-state connection machine
// ---------------------------------------------------------------------------

/**
 * NOT_CONFIGURED     — Config entry absent or invalid JSON.
 * CONFIGURED         — Config entry exists and passes validation.
 *                      Claude connection NOT yet proven.
 * SERVER_START_FAILED— Claude attempted to launch MCP command but process failed.
 * WAITING_FOR_CLAUDE — Config valid; no MCP initialize request observed yet.
 * HANDSHAKE_VERIFIED — MCP server received valid initialize from Claude.
 * TOOLS_DISCOVERED   — Claude successfully requested tools/list.
 * CONNECTED          — initialize + tools/list + live PID + fresh heartbeat.
 * DISCONNECTED       — Previously connected; process died / transport closed.
 * ERROR              — Config, protocol, permission, or dependency failure.
 */
export type ConnectionState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'SERVER_START_FAILED'
  | 'WAITING_FOR_CLAUDE'
  | 'HANDSHAKE_VERIFIED'
  | 'TOOLS_DISCOVERED'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface TruthfulClaudeStatus {
  /** Primary connection state. */
  state: ConnectionState;
  /** Legacy compatibility field. Mapped from state. */
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';

  // Config layer
  configPath: string;
  configValid: boolean;
  maskedKey: string | null;
  configError?: string;

  // API-key health — separate from MCP transport state (correction #4)
  apiKeyValid: boolean;
  apiKeyError?: string;

  // MCP session evidence
  sessionId: string | null;
  serverPid: number | null;
  processStartedAt: string | null;
  transportOpen: boolean;
  initializeReceived: boolean;
  initializeReceivedAt: string | null;
  clientInfo: { name: string | null; version: string | null };
  toolsListRequested: boolean;
  toolsListRequestedAt: string | null;
  registeredToolCount: number;
  registeredToolNames: string[];
  lastActivityAt: string | null;
  heartbeatAt: string | null;
  heartbeatFresh: boolean;
  disconnectReason: string | null;
  lastError: string | null;

  // Error detail (structured errorCode for TOOLS_UNAVAILABLE, etc.)
  errorCode: string | null;
  errorStage: string | null;
  errorMessage: string | null;

  // Legacy live-connection fields (kept for existing frontend compatibility)
  isLiveConnected: boolean;
  liveStatus: string;
  lastActiveAt: string | null;
  mcpStatus: 'Running' | 'Stopped';
  path: string;

  // New resolution information
  resolution?: ClaudeInstallationInfo;
}

// ---------------------------------------------------------------------------
// MCP Session status file schema
// ---------------------------------------------------------------------------

interface McpSessionStatus {
  sessionId: string;
  serverPid: number;
  processStartedAt: string | null;
  serverStartedAt: string;
  transportOpen: boolean;
  initializeReceived: boolean;
  initializeReceivedAt: string | null;
  clientInfo: { name: string | null; version: string | null };
  toolsListRequested: boolean;
  toolsListRequestedAt: string | null;
  registeredToolCount: number;
  registeredToolNames: string[];
  lastActivityAt: string | null;
  heartbeatAt: string;
  disconnectReason: string | null;
  lastError: string | null;
}

// ---------------------------------------------------------------------------
// Stale-detection constants
// ---------------------------------------------------------------------------

/** Heartbeat older than this → treat as DISCONNECTED (matches Python 90s). */
const STALE_HEARTBEAT_MS = 90_000;

// ---------------------------------------------------------------------------
// Status file location
// ---------------------------------------------------------------------------

function getMcpStatusFilePath(): string {
  const customPath = process.env.AGENTMARK_MCP_STATUS_PATH;
  if (customPath) return customPath;

  const platform = os.platform();
  if (platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(roaming, 'AgentMark', 'mcp_session_status.json');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'AgentMark', 'mcp_session_status.json');
  } else {
    const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    return path.join(xdg, 'AgentMark', 'mcp_session_status.json');
  }
}

// ---------------------------------------------------------------------------
// PID + processStartedAt liveness check
// ---------------------------------------------------------------------------

function isPidAlive(pid: number, processStartedAt: string | null): boolean {
  if (pid <= 0) return false;
  try {
    process.kill(pid, 0); // throws if process doesn't exist
  } catch {
    return false;
  }

  // ── PID-reuse guard via processStartedAt ───────────────────────────────────
  // Node.js doesn't expose process start time natively.
  // On Windows we query via PowerShell; on POSIX we skip (PID + heartbeat
  // freshness provides sufficient protection on those platforms).
  // If the OS-reported start time diverges by > 5 s from the recorded value,
  // the PID has been reused by a different process and we treat it as dead.
  if (processStartedAt && os.platform() === 'win32') {
    try {
      // PowerShell gives us the start time in ISO-8601 UTC via '.O' format.
      // -ErrorAction SilentlyContinue prevents PowerShell from returning
      // a non-zero exit code when the process has already exited.
      const raw = execSync(
        `powershell -NoProfile -NonInteractive -Command ` +
          `"try { (Get-Process -Id ${pid} -ErrorAction Stop).StartTime` +
          `.ToUniversalTime().ToString('O') } catch { '' }"`,
        { encoding: 'utf8', timeout: 3000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();

      if (raw.length > 10) {
        const procStart = new Date(raw);
        const recordedStart = new Date(processStartedAt);
        if (
          !isNaN(procStart.getTime()) &&
          Math.abs(procStart.getTime() - recordedStart.getTime()) > 5_000
        ) {
          // Start times differ by > 5 s → PID was recycled by another process
          return false;
        }
      }
      // If PowerShell returns an empty string the process may have just exited;
      // treat as dead to be safe.
      if (raw === '') return false;
    } catch {
      // PowerShell unavailable or timed out — fall back to PID-exists-only.
      // The heartbeat freshness check (< 90 s) provides a second layer.
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Read + validate MCP session status file
// ---------------------------------------------------------------------------

import crypto from 'crypto';

async function readMcpSessionStatus(): Promise<{
  session: McpSessionStatus | null;
  readError: string | null;
}> {
  const statusPath = getMcpStatusFilePath();
  try {
    const content = await fs.readFile(statusPath, 'utf-8');
    const session = JSON.parse(content) as McpSessionStatus & { signature?: string };
    
    // Minimal structural validation
    if (typeof session.serverPid !== 'number' || !session.heartbeatAt) {
      return { session: null, readError: 'Status file malformed (missing pid/heartbeat).' };
    }

    // Verify HMAC signature to prevent local forgery
    const apiKey = process.env.AGENTMARK_API_KEY;
    if (apiKey && session.signature) {
      const providedSignature = session.signature;
      const sessionWithoutSig = { ...session };
      delete sessionWithoutSig.signature;
      
      const deepSort = (obj: any): any => {
        if (obj === null || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(deepSort);
        const sorted: any = {};
        Object.keys(obj).sort().forEach(key => {
          sorted[key] = deepSort(obj[key]);
        });
        return sorted;
      };
      
      const sortedSession = deepSort(sessionWithoutSig);
      
      const rawPayload = Buffer.from(JSON.stringify(sortedSession));
      const expectedSignature = crypto
        .createHmac('sha256', apiKey)
        .update(rawPayload)
        .digest('hex');
        
      if (providedSignature !== expectedSignature) {
        return { session: null, readError: 'Status file signature validation failed (forgery detected).' };
      }
    } else if (apiKey && !session.signature) {
      // If backend requires signature but file has none, reject it
      return { session: null, readError: 'Status file missing cryptographic signature.' };
    }

    return { session, readError: null };
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return { session: null, readError: null }; // file not yet written — normal
    }
    return { session: null, readError: `Failed to read status file: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Resolve uvx path (Windows)
// ---------------------------------------------------------------------------

function resolveUvxPath(): string {
  try {
    const output = execSync('where.exe uvx', { encoding: 'utf8' }).trim();
    const lines = output.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (fsSync.existsSync(line)) {
        return line;
      }
    }
  } catch {
    // fallback
  }
  return 'uvx';
}

// ---------------------------------------------------------------------------
// Claude config paths
// ---------------------------------------------------------------------------

import { 
  resolveActiveClaudeConfig, 
  ClaudeInstallationInfo,
  setUserSelection,
  clearUserSelection
} from './claude-config-resolver';

export { 
  resolveActiveClaudeConfig, 
  ClaudeInstallationInfo,
  setUserSelection,
  clearUserSelection
};

export function maskApiKey(key: string): string {
  if (!key.startsWith('am_') || key.length < 12) return 'am_****************';
  return `am_live_************************${key.slice(-5)}`;
}

// ---------------------------------------------------------------------------
// Legacy interface (kept for backwards compatibility with existing routes)
// ---------------------------------------------------------------------------

export interface ClaudeConfigStatus {
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';
  liveStatus: 'Active (Connected)' | 'Configured (Idle)' | 'Disconnected' | 'Configuration Error';
  isLiveConnected: boolean;
  lastActiveAt: string | null;
  mcpStatus: 'Running' | 'Stopped';
  path: string;
  maskedKey: string | null;
  error?: string;
}

// ---------------------------------------------------------------------------
// State → legacy status mapping
// ---------------------------------------------------------------------------

function stateToLegacyStatus(state: ConnectionState): ClaudeConfigStatus['status'] {
  switch (state) {
    case 'CONNECTED': return 'Connected';
    case 'CONFIGURED':
    case 'WAITING_FOR_CLAUDE':
    case 'HANDSHAKE_VERIFIED':
    case 'TOOLS_DISCOVERED': return 'Not Connected'; // not yet verified
    case 'DISCONNECTED': return 'Not Connected';
    case 'NOT_CONFIGURED': return 'Not Connected';
    case 'ERROR': return 'Configuration Error';
    case 'SERVER_START_FAILED': return 'Configuration Error';
    default: return 'Not Connected';
  }
}

// ---------------------------------------------------------------------------
// Core: getTruthfulClaudeStatus
// ---------------------------------------------------------------------------

/**
 * Returns the truthful 9-state connection status.
 *
 * API-key validity is evaluated separately from MCP transport state (correction #4).
 * A broken API key does NOT force the MCP transport state to ERROR — it sets
 * apiKeyValid=false and apiKeyError, while the MCP state is evaluated independently.
 */
export async function getTruthfulClaudeStatus(
  userId: string,
  validateApiKey: (rawKey: string) => Promise<boolean | { valid: boolean; isOtherUser?: boolean }>
): Promise<TruthfulClaudeStatus> {
  const resolution = await resolveActiveClaudeConfig();
  const configPath = resolution.configPath || 'Unknown';

  // Shared defaults
  const emptySession = {
    sessionId: null,
    serverPid: null,
    processStartedAt: null,
    transportOpen: false,
    initializeReceived: false,
    initializeReceivedAt: null,
    clientInfo: { name: null, version: null },
    toolsListRequested: false,
    toolsListRequestedAt: null,
    registeredToolCount: 0,
    registeredToolNames: [],
    lastActivityAt: null,
    heartbeatAt: null,
    heartbeatFresh: false,
    disconnectReason: null,
    lastError: null,
  };

  const buildResult = (
    state: ConnectionState,
    overrides: Partial<TruthfulClaudeStatus>
  ): TruthfulClaudeStatus => ({
    state,
    status: stateToLegacyStatus(state),
    configPath,
    configValid: false,
    maskedKey: null,
    apiKeyValid: false,
    ...emptySession,
    errorCode: null,
    errorStage: null,
    errorMessage: null,
    isLiveConnected: state === 'CONNECTED',
    liveStatus: state === 'CONNECTED' ? 'Active (Connected)' : 'Disconnected',
    lastActiveAt: null,
    mcpStatus: 'Stopped',
    path: configPath,
    resolution,
    ...overrides,
  });

  if (resolution.status === 'AMBIGUOUS_MULTIPLE_INSTALLATIONS' || resolution.status === 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES') {
    return buildResult('NOT_CONFIGURED', {
      errorStage: 'config_ambiguous',
      errorMessage: resolution.recommendedAction || 'Multiple Claude Desktop installations found. Please select which one to connect.',
      errorCode: resolution.status,
    });
  }

  if (resolution.status === 'NOT_INSTALLED') {
    return buildResult('NOT_CONFIGURED', {
      errorStage: 'config_missing',
      errorMessage: 'Claude Desktop could not be found. Please install it.',
    });
  }

  // ── STAGE 1: Config file existence ─────────────────────────────────────────
  let configContent: string;
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return buildResult('NOT_CONFIGURED', {
        errorStage: 'config_missing',
        errorMessage: 'Claude Desktop configuration file not found.',
      });
    }
    return buildResult('ERROR', {
      errorStage: 'config_read',
      errorMessage: `Cannot read config file: ${err.message}`,
      errorCode: 'CONFIG_READ_ERROR',
    });
  }

  // ── STAGE 2: Config JSON validity ──────────────────────────────────────────
  let config: any;
  try {
    config = JSON.parse(configContent);
  } catch {
    return buildResult('ERROR', {
      errorStage: 'config_parse',
      errorMessage: 'Claude Desktop configuration file contains invalid JSON.',
      errorCode: 'INVALID_JSON',
      configError: 'Configuration file contains invalid JSON syntax.',
    });
  }

  // ── STAGE 3: AgentMark server entry ────────────────────────────────────────
  const server = config?.mcpServers?.agentmark;
  if (!server) {
    return buildResult('NOT_CONFIGURED', {
      configValid: true, // file is valid JSON, just no agentmark entry
      errorStage: 'config_missing_entry',
      errorMessage: 'No AgentMark entry in mcpServers.',
    });
  }

  // ── STAGE 4: API key presence (structural check) ───────────────────────────
  const apiKey = server.env?.AGENTMARK_API_KEY;
  if (!apiKey || typeof apiKey !== 'string') {
    return buildResult('ERROR', {
      configValid: true,
      errorStage: 'config_api_key',
      errorMessage: 'AgentMark API key is missing from configuration.',
      errorCode: 'MISSING_API_KEY',
    });
  }

  const maskedKey = maskApiKey(apiKey);

  // ── STAGE 5: API key DB validation (separate from MCP transport) ───────────
  let apiKeyValid = false;
  let apiKeyError: string | undefined;
  let isOtherUser = false;
  try {
    const keyResult = await validateApiKey(apiKey);
    if (typeof keyResult === 'boolean') {
      apiKeyValid = keyResult;
    } else {
      apiKeyValid = keyResult.valid;
      isOtherUser = keyResult.isOtherUser ?? false;
    }
    if (!apiKeyValid) {
      apiKeyError = isOtherUser
        ? 'Claude is configured for a different AgentMark user.'
        : 'API key is invalid or has been revoked.';
    }
  } catch {
    apiKeyError = 'Could not validate API key against database.';
  }

  // Config is structurally valid regardless of key validity
  const configValid = true;

  // ── STAGE 6: Read MCP session status file ──────────────────────────────────
  const { session, readError } = await readMcpSessionStatus();

  const sessionBase = {
    configValid,
    maskedKey,
    apiKeyValid,
    apiKeyError,
    mcpStatus: 'Stopped' as const,
    path: configPath,
  };

  if (!session) {
    // No status file yet — server not started or never ran
    return buildResult('WAITING_FOR_CLAUDE', {
      ...sessionBase,
      errorStage: readError ? 'session_file_read' : null,
      errorMessage: readError || 'MCP server has not yet started.',
    });
  }

  // Populate session evidence fields
  const sessionFields = {
    sessionId: session.sessionId,
    serverPid: session.serverPid,
    processStartedAt: session.processStartedAt,
    transportOpen: session.transportOpen,
    initializeReceived: session.initializeReceived,
    initializeReceivedAt: session.initializeReceivedAt,
    clientInfo: session.clientInfo,
    toolsListRequested: session.toolsListRequested,
    toolsListRequestedAt: session.toolsListRequestedAt,
    registeredToolCount: session.registeredToolCount,
    registeredToolNames: session.registeredToolNames,
    lastActivityAt: session.lastActivityAt,
    heartbeatAt: session.heartbeatAt,
    disconnectReason: session.disconnectReason,
    lastError: session.lastError,
  };

  // ── STAGE 7: Transport/session liveness ────────────────────────────────────
  // Key insight (correction #3): heartbeat alone does NOT imply Claude connected.
  // We check transportOpen + heartbeat freshness + PID liveness together.

  const heartbeatAge = session.heartbeatAt
    ? Date.now() - new Date(session.heartbeatAt).getTime()
    : Infinity;
  const heartbeatFresh = heartbeatAge < STALE_HEARTBEAT_MS;

  const pidAlive = isPidAlive(session.serverPid, session.processStartedAt);

  // If server explicitly closed the transport OR PID is dead OR heartbeat stale
  // AND we had previously connected — it's DISCONNECTED.
  const previouslyConnected = session.initializeReceived && session.toolsListRequested;

  if (!heartbeatFresh || !pidAlive || !session.transportOpen) {
    if (previouslyConnected) {
      return buildResult('DISCONNECTED', {
        ...sessionBase,
        ...sessionFields,
        heartbeatFresh,
        mcpStatus: 'Stopped',
        isLiveConnected: false,
        liveStatus: 'Disconnected',
        lastActiveAt: session.lastActivityAt,
        errorStage: !pidAlive ? 'pid_dead' : !heartbeatFresh ? 'heartbeat_stale' : 'transport_closed',
        errorMessage: session.disconnectReason || (!pidAlive ? 'MCP server process has exited.' : 'MCP transport closed.'),
      });
    }
    // Server not running yet (or crashed before handshake)
    if (!pidAlive && session.serverPid > 0) {
      return buildResult('SERVER_START_FAILED', {
        ...sessionBase,
        ...sessionFields,
        heartbeatFresh,
        errorStage: 'pid_dead',
        errorMessage: 'MCP server process exited before completing handshake.',
        errorCode: 'SERVER_START_FAILED',
      });
    }
    return buildResult('WAITING_FOR_CLAUDE', {
      ...sessionBase,
      ...sessionFields,
      heartbeatFresh,
      errorStage: !heartbeatFresh ? 'heartbeat_stale' : 'transport_closed',
      errorMessage: !heartbeatFresh
        ? `MCP heartbeat stale (${Math.round(heartbeatAge / 1000)}s ago). Server may have restarted.`
        : 'MCP transport not open.',
    });
  }

  // Server is alive with fresh heartbeat and open transport.
  const commonAliveFields = {
    ...sessionBase,
    ...sessionFields,
    heartbeatFresh,
    mcpStatus: 'Running' as const,
  };

  // ── STAGE 8: MCP initialize handshake ──────────────────────────────────────
  if (!session.initializeReceived) {
    return buildResult('WAITING_FOR_CLAUDE', {
      ...commonAliveFields,
      errorStage: 'no_initialize',
      errorMessage: 'MCP server is running but Claude has not sent an initialize request yet.',
    });
  }

  // ── STAGE 9: tools/list ────────────────────────────────────────────────────
  if (!session.toolsListRequested) {
    return buildResult('HANDSHAKE_VERIFIED', {
      ...commonAliveFields,
      isLiveConnected: false,
      liveStatus: 'Configured (Idle)',
      lastActiveAt: session.lastActivityAt,
      errorStage: null,
      errorMessage: null,
    });
  }

  // ── STAGE 10: Tool count (correction #1: TOOLS_UNAVAILABLE error code) ─────
  if (session.registeredToolCount === 0) {
    return buildResult('ERROR', {
      ...commonAliveFields,
      isLiveConnected: false,
      liveStatus: 'Disconnected',
      lastActiveAt: session.lastActivityAt,
      errorStage: 'tools_list',
      errorMessage: 'tools/list completed but zero tools are registered. Check server startup logs.',
      errorCode: 'TOOLS_UNAVAILABLE',
    });
  }

  // tools/list requested with tools discovered → TOOLS_DISCOVERED transition
  // (correction #5: explicit TOOLS_DISCOVERED state before CONNECTED)
  // CONNECTED requires all evidence + transport open + heartbeat fresh + tools > 0.

  // Live MCP activity timestamp (backend in-memory, from tool calls)
  const mcpActivityTime = userLastMcpActivity.get(userId);
  const lastActiveAt = mcpActivityTime ? new Date(mcpActivityTime).toISOString() : session.lastActivityAt;

  return buildResult('CONNECTED', {
    ...commonAliveFields,
    isLiveConnected: true,
    liveStatus: 'Active (Connected)',
    lastActiveAt,
    errorStage: null,
    errorMessage: null,
  });
}

// ---------------------------------------------------------------------------
// Legacy getClaudeConfigStatus — kept for internal callers; maps to new machine
// ---------------------------------------------------------------------------

export async function getClaudeConfigStatus(
  userId: string,
  validateApiKey: (rawKey: string) => Promise<boolean | { valid: boolean; isOtherUser?: boolean }>
): Promise<ClaudeConfigStatus> {
  const truth = await getTruthfulClaudeStatus(userId, validateApiKey);
  const mcpStatus = (truth.serverPid && truth.heartbeatFresh) ? 'Running' : 'Stopped';
  return {
    status: truth.status,
    liveStatus: truth.liveStatus as ClaudeConfigStatus['liveStatus'],
    isLiveConnected: truth.isLiveConnected,
    lastActiveAt: truth.lastActiveAt,
    mcpStatus,
    path: truth.path,
    maskedKey: truth.maskedKey,
    error: truth.errorMessage || undefined,
  };
}

// ---------------------------------------------------------------------------
// Diagnostic: full stage-by-stage verification
// ---------------------------------------------------------------------------

export interface DiagnosticStage {
  stage: string;
  passed: boolean;
  detail: string;
}

export interface DiagnosticResult {
  stages: DiagnosticStage[];
  finalState: ConnectionState;
  recommendedAction: string;
  mcpStatusFilePath: string;
  claudeConfigPath: string;
  resolution: ClaudeInstallationInfo;
}

export async function runConnectionDiagnostic(
  userId: string,
  validateApiKey: (rawKey: string) => Promise<boolean | { valid: boolean; isOtherUser?: boolean }>
): Promise<DiagnosticResult> {
  const stages: DiagnosticStage[] = [];
  
  const resolution = await resolveActiveClaudeConfig();
  const configPath = resolution.configPath || 'Unknown';
  const mcpStatusFilePath = getMcpStatusFilePath();

  const pass = (stage: string, detail: string) => stages.push({ stage, passed: true, detail });
  const fail = (stage: string, detail: string) => stages.push({ stage, passed: false, detail });

  // 0. Path Resolution
  if (resolution.status === 'AMBIGUOUS_MULTIPLE_INSTALLATIONS' || resolution.status === 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES') {
    fail('config_resolution', resolution.recommendedAction || 'Ambiguous installation state.');
    return { stages, finalState: 'NOT_CONFIGURED', recommendedAction: resolution.recommendedAction || 'Select Claude installation.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  } else if (resolution.status === 'NOT_INSTALLED') {
    fail('config_resolution', 'No Claude Desktop installations found.');
    return { stages, finalState: 'NOT_CONFIGURED', recommendedAction: 'Install Claude Desktop.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  } else {
    pass('config_resolution', `Resolved canonical installation: ${resolution.installationType} at ${resolution.configPath}`);
  }

  // 1. Config file
  let configContent = '';
  try {
    configContent = await fs.readFile(configPath, 'utf-8');
    pass('config_file', `Config file found: ${configPath}`);
  } catch {
    fail('config_file', `Config file not found: ${configPath}`);
    return { stages, finalState: 'NOT_CONFIGURED', recommendedAction: 'Install Claude Desktop and run Connect.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 2. Config JSON
  let config: any;
  try {
    config = JSON.parse(configContent);
    pass('config_json', 'Config file is valid JSON.');
  } catch {
    fail('config_json', 'Config file contains invalid JSON.');
    return { stages, finalState: 'ERROR', recommendedAction: 'Run "Repair Config" to rewrite a valid config.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 3. AgentMark entry
  const server = config?.mcpServers?.agentmark;
  if (!server) {
    fail('agentmark_entry', 'No agentmark entry in mcpServers.');
    return { stages, finalState: 'NOT_CONFIGURED', recommendedAction: 'Run Connect Claude Desktop.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }
  pass('agentmark_entry', 'AgentMark entry found in mcpServers.');

  // 4. Command/path existence
  const cmd: string = server.command || '';
  const cmdExists = cmd === 'uvx' || cmd === 'python' || fsSync.existsSync(cmd);
  if (cmdExists) {
    pass('command_path', `Command exists: ${cmd}`);
  } else {
    fail('command_path', `Command not found on filesystem: ${cmd}`);
  }

  // 5. API key
  const apiKey = server.env?.AGENTMARK_API_KEY;
  if (!apiKey) {
    fail('api_key_present', 'AGENTMARK_API_KEY is missing from env.');
  } else {
    pass('api_key_present', 'API key present in config.');
    try {
      const kr = await validateApiKey(apiKey);
      const valid = typeof kr === 'boolean' ? kr : kr.valid;
      if (valid) {
        pass('api_key_valid', 'API key is active in database.');
      } else {
        fail('api_key_valid', 'API key is revoked or belongs to another user.');
      }
    } catch {
      fail('api_key_valid', 'Could not validate API key against database.');
    }
  }

  // 6. MCP session status file
  const { session, readError } = await readMcpSessionStatus();
  if (!session) {
    fail('session_file', readError || 'MCP session status file not found (server not yet started).');
    return { stages, finalState: 'WAITING_FOR_CLAUDE', recommendedAction: 'Open Claude Desktop. It will start the MCP server automatically.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }
  pass('session_file', `Session file found. PID: ${session.serverPid}, Session: ${session.sessionId}`);

  // 7. PID liveness
  const pidAlive = isPidAlive(session.serverPid, session.processStartedAt);
  if (pidAlive) {
    pass('pid_alive', `MCP server process PID ${session.serverPid} is alive.`);
  } else {
    fail('pid_alive', `MCP server process PID ${session.serverPid} is not running.`);
    return { stages, finalState: 'DISCONNECTED', recommendedAction: 'Open Claude Desktop to restart the MCP server.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 8. Heartbeat freshness
  const heartbeatAge = Date.now() - new Date(session.heartbeatAt).getTime();
  if (heartbeatAge < STALE_HEARTBEAT_MS) {
    pass('heartbeat', `Heartbeat fresh (${Math.round(heartbeatAge / 1000)}s ago).`);
  } else {
    fail('heartbeat', `Heartbeat stale (${Math.round(heartbeatAge / 1000)}s ago > ${STALE_HEARTBEAT_MS / 1000}s limit).`);
    return { stages, finalState: 'DISCONNECTED', recommendedAction: 'Restart Claude Desktop.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 9. Transport open
  if (session.transportOpen) {
    pass('transport_open', 'MCP stdio transport is open.');
  } else {
    fail('transport_open', `Transport closed: ${session.disconnectReason || 'unknown'}.`);
    return { stages, finalState: 'DISCONNECTED', recommendedAction: 'Restart Claude Desktop.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 10. Initialize
  if (session.initializeReceived) {
    pass('initialize', `Claude initialize received at ${session.initializeReceivedAt}. Client: ${session.clientInfo?.name} ${session.clientInfo?.version}`);
  } else {
    fail('initialize', 'Claude has not sent an MCP initialize request yet.');
    return { stages, finalState: 'WAITING_FOR_CLAUDE', recommendedAction: 'Ensure Claude Desktop has loaded and try a tool call.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 11. tools/list
  if (session.toolsListRequested) {
    pass('tools_list', `tools/list completed at ${session.toolsListRequestedAt}.`);
  } else {
    fail('tools_list', 'Claude has not requested tools/list yet.');
    return { stages, finalState: 'HANDSHAKE_VERIFIED', recommendedAction: 'Claude connected. Waiting for tools/list.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }

  // 12. Tool count
  if (session.registeredToolCount === 0) {
    fail('tool_count', 'Zero tools registered. Server may have an import error.');
    return { stages, finalState: 'ERROR', recommendedAction: 'Check MCP server logs for import errors.', mcpStatusFilePath, claudeConfigPath: configPath, resolution };
  }
  pass('tool_count', `${session.registeredToolCount} tools registered: ${session.registeredToolNames.join(', ')}`);

  return {
    stages,
    finalState: 'CONNECTED',
    recommendedAction: 'Connection verified. Claude Desktop can use AgentMark tools.',
    mcpStatusFilePath,
    claudeConfigPath: configPath,
    resolution,
  };
}

// ---------------------------------------------------------------------------
// Atomic config writer (preserved from original)
// ---------------------------------------------------------------------------

let writeLock = Promise.resolve();

export const acquireLockAndExecute = async <T>(fn: () => Promise<T>): Promise<T> => {
  const nextLock = writeLock.then(fn);
  writeLock = nextLock.then(() => {}).catch(() => {});
  return nextLock;
};

export async function writeClaudeConfig(apiKey: string): Promise<{ success: boolean; path: string }> {
  return acquireLockAndExecute(async () => {
    const resolution = await resolveActiveClaudeConfig();
    if (!resolution.configPath) {
      throw new Error(`Cannot write config: ${resolution.recommendedAction}`);
    }
    const configPath = resolution.configPath;

    const configDir = path.dirname(configPath);
    const backupPath = `${configPath}.bak`;
    const tempPath = `${configPath}.tmp`;

    await fs.mkdir(configDir, { recursive: true });

    let existingConfig: any = {};
    let backupCreated = false;

    try {
      await fs.access(configPath);
      const content = await fs.readFile(configPath, 'utf-8');
      await fs.writeFile(backupPath, content, 'utf-8');
      backupCreated = true;
      try {
        existingConfig = JSON.parse(content);
      } catch {
        existingConfig = {};
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    try {
      const mcpServers = existingConfig.mcpServers || {};
      const expectedUrl = `http://localhost:${process.env.PORT || 5003}`;
      const localMcpPath = path.resolve(process.cwd(), '../agentmark-mcp-server');
      const venvPythonPath = path.join(localMcpPath, '.venv', 'Scripts', 'python.exe');
      const pythonCommand = fsSync.existsSync(venvPythonPath) ? venvPythonPath : 'python';
      const srcPath = path.join(localMcpPath, 'src');

      const serverEnv: any = {
        AGENTMARK_API_URL: expectedUrl,
        AGENTMARK_API_KEY: apiKey,
        PYTHONPATH: srcPath,
      };
      if (process.env.AGENTMARK_MCP_STATUS_PATH) {
        serverEnv.AGENTMARK_MCP_STATUS_PATH = process.env.AGENTMARK_MCP_STATUS_PATH;
      }

      mcpServers.agentmark = {
        command: pythonCommand,
        args: ['-m', 'agentmark_mcp.server'],
        env: serverEnv,
      };

      const updatedConfig = { ...existingConfig, mcpServers };
      const jsonString = JSON.stringify(updatedConfig, null, 2);

      await fs.writeFile(tempPath, jsonString, 'utf-8');
      const parsedTemp = JSON.parse(await fs.readFile(tempPath, 'utf-8'));
      if (!parsedTemp?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY) {
        throw new Error('Verification failed: Written JSON missing key.');
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

      if (backupCreated) await fs.unlink(backupPath).catch(() => {});
    } catch (err: any) {
      await fs.unlink(tempPath).catch(() => {});
      if (backupCreated) {
        await fs.copyFile(backupPath, configPath).catch(() => {});
        await fs.unlink(backupPath).catch(() => {});
      }
      throw err;
    }

    return { success: true, path: configPath };
  });
}

export async function removeClaudeConfig(): Promise<{ success: boolean; path: string }> {
  return acquireLockAndExecute(async () => {
    const resolution = await resolveActiveClaudeConfig();
    
    // Fallback: If not resolved, just look through discovered candidates and remove from all
    // to be safe when disconnecting.
    const targets = resolution.status === 'RESOLVED' && resolution.configPath 
      ? [resolution.configPath] 
      : resolution.detectedCandidates.map(c => c.configPath);

    for (const configPath of targets) {
      const backupPath = `${configPath}.bak`;
      const tempPath = `${configPath}.tmp`;

      try {
        await fs.access(configPath);
      } catch {
        continue;
      }

      const content = await fs.readFile(configPath, 'utf-8');
      let existingConfig: any = {};
      let backupCreated = false;

      try {
        await fs.writeFile(backupPath, content, 'utf-8');
        backupCreated = true;
        existingConfig = JSON.parse(content);
      } catch {
        existingConfig = {};
      }

      try {
        if (existingConfig.mcpServers) {
          delete existingConfig.mcpServers.agentmark;
          if (Object.keys(existingConfig.mcpServers).length === 0) {
            delete existingConfig.mcpServers;
          }
        }

        const jsonString = JSON.stringify(existingConfig, null, 2);
        await fs.writeFile(tempPath, jsonString, 'utf-8');
        const parsedTemp = JSON.parse(await fs.readFile(tempPath, 'utf-8'));
        if (parsedTemp?.mcpServers?.agentmark) {
          throw new Error('Verification failed: Failed to delete agentmark config block.');
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

        if (backupCreated) await fs.unlink(backupPath).catch(() => {});
      } catch (err: any) {
        await fs.unlink(tempPath).catch(() => {});
        if (backupCreated) {
          await fs.copyFile(backupPath, configPath).catch(() => {});
          await fs.unlink(backupPath).catch(() => {});
        }
        throw new Error(`Disconnect failed: ${err.message}`);
      }
    }

    return { success: true, path: targets[0] || '' };
  });
}
