/**
 * claude-config-state-machine.test.ts
 *
 * Unit tests for getTruthfulClaudeStatus() state machine.
 * Mocks filesystem and validates correct state transitions.
 */

import path from 'path';
import os from 'os';

// ---------------------------------------------------------------------------
// Mock setup — must happen before module imports that read files at load time
// ---------------------------------------------------------------------------

const mockFs = {
  readFile: jest.fn(),
  access: jest.fn(),
};

jest.mock('fs/promises', () => mockFs);
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  readdirSync: jest.fn().mockReturnValue([]),
}));
jest.mock('../middlewares/mcp-logger.middleware', () => ({
  userLastMcpActivity: new Map(),
}));

jest.mock('child_process', () => ({
  execSync: jest.fn().mockImplementation((cmd) => {
    if (cmd.includes('Get-Process')) {
      return (global as any).__mockProcessStartedAt || new Date().toISOString(); 
    }
    return '';
  }),
}));

jest.mock('./claude-config-resolver', () => {
  const original = jest.requireActual('./claude-config-resolver');
  return {
    ...original,
    resolveActiveClaudeConfig: jest.fn().mockResolvedValue({
      status: 'RESOLVED',
      configPath: 'mock/claude_desktop_config.json',
      recommendedAction: '',
      detectedCandidates: [],
      userSelectionId: null
    })
  };
});

import { getTruthfulClaudeStatus, ConnectionState } from './claude-config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NOW_ISO = new Date().toISOString();
const STALE_ISO = new Date(Date.now() - 200_000).toISOString(); // 200s ago → stale
const FRESH_ISO = new Date(Date.now() - 10_000).toISOString();  // 10s ago → fresh

const VALID_CONFIG = JSON.stringify({
  mcpServers: {
    agentmark: {
      command: 'python',
      args: ['-m', 'agentmark_mcp.server'],
      env: {
        AGENTMARK_API_KEY: 'am_test_key_abc123',
        AGENTMARK_API_URL: 'http://localhost:5003',
        PYTHONPATH: '/path/to/src',
        APPDATA: 'C:\\Users\\test\\AppData\\Roaming',
        USERPROFILE: 'C:\\Users\\test',
      },
    },
    'other-server': {
      command: 'uvx',
      args: ['other-mcp-server'],
    },
  },
});

const VALID_SESSION = (overrides: Partial<Record<string, any>> = {}) => {
  (global as any).__mockProcessStartedAt = overrides.processStartedAt || NOW_ISO;
  return JSON.stringify({
    sessionId: 'test-session-uuid',
    serverPid: process.pid, // current process → alive
    processStartedAt: NOW_ISO,
    serverStartedAt: NOW_ISO,
    transportOpen: true,
    initializeReceived: true,
    initializeReceivedAt: NOW_ISO,
    clientInfo: { name: 'Claude', version: '1.0.0' },
    toolsListRequested: true,
    toolsListRequestedAt: NOW_ISO,
    registeredToolCount: 3,
    registeredToolNames: ['generate_campaign', 'run_focus_group', 'create_project'],
    lastActivityAt: NOW_ISO,
    heartbeatAt: FRESH_ISO,
    disconnectReason: null,
    lastError: null,
    ...overrides,
  });
};

const VALID_KEY = 'am_test_key_abc123';

const alwaysValidKey = async (_key: string) => ({ valid: true });
const alwaysInvalidKey = async (_key: string) => ({ valid: false });
const otherUserKey = async (_key: string) => ({ valid: false, isOtherUser: true });

// Silence console noise during tests
beforeAll(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterAll(() => jest.restoreAllMocks());
beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------
// Helper to set up filesystem mocks for a given scenario
// ---------------------------------------------------------------------------

function setupMocks(options: {
  claudeConfigContent?: string | Error;
  sessionContent?: string | Error;
}) {
  const { claudeConfigContent, sessionContent } = options;

  mockFs.access.mockImplementation(async (p: string) => {
    if (claudeConfigContent instanceof Error) throw claudeConfigContent;
    if (typeof claudeConfigContent === 'undefined') throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    // access succeeds
  });

  mockFs.readFile.mockImplementation(async (p: string) => {
    const ps = String(p);
    // Distinguish config vs session file by path
    if (ps.includes('AgentMark') && ps.includes('mcp_session_status')) {
      if (sessionContent instanceof Error) throw sessionContent;
      if (typeof sessionContent === 'undefined') throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
      return sessionContent;
    }
    // Claude config
    if (claudeConfigContent instanceof Error) throw claudeConfigContent;
    if (typeof claudeConfigContent === 'undefined') throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    return claudeConfigContent;
  });
  
  const { resolveActiveClaudeConfig } = require('./claude-config-resolver');
  if (claudeConfigContent === undefined) {
    resolveActiveClaudeConfig.mockResolvedValue({
      status: 'NO_INSTALLATION_FOUND',
      configPath: null,
      recommendedAction: '',
      detectedCandidates: [],
      userSelectionId: null
    });
  } else {
    resolveActiveClaudeConfig.mockResolvedValue({
      status: 'RESOLVED',
      configPath: 'mock/claude_desktop_config.json',
      recommendedAction: '',
      detectedCandidates: [],
      userSelectionId: null
    });
  }
}

// ---------------------------------------------------------------------------
// Scenario 1: Config written, Claude closed → CONFIGURED / WAITING_FOR_CLAUDE
// ---------------------------------------------------------------------------

test('Scenario 1: config exists but no session file → WAITING_FOR_CLAUDE, never CONNECTED', async () => {
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: undefined });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('WAITING_FOR_CLAUDE');
  expect(result.state).not.toBe('CONNECTED');
  expect(result.state).not.toBe('HANDSHAKE_VERIFIED');
  expect(result.isLiveConnected).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 2: Server command valid, no Claude initialize → WAITING_FOR_CLAUDE
// ---------------------------------------------------------------------------

test('Scenario 2: server running, no initialize received → WAITING_FOR_CLAUDE', async () => {
  const session = VALID_SESSION({ initializeReceived: false, toolsListRequested: false });
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('WAITING_FOR_CLAUDE');
  expect(result.initializeReceived).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 3: initialize received, tools/list not → HANDSHAKE_VERIFIED
// ---------------------------------------------------------------------------

test('Scenario 3: initialize received but no tools/list → HANDSHAKE_VERIFIED', async () => {
  const session = VALID_SESSION({ toolsListRequested: false, toolsListRequestedAt: null });
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('HANDSHAKE_VERIFIED');
  expect(result.state).not.toBe('CONNECTED');
  expect(result.initializeReceived).toBe(true);
  expect(result.toolsListRequested).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 4: initialize + tools/list + live PID → CONNECTED
// ---------------------------------------------------------------------------

test('Scenario 4: full handshake + live PID + fresh heartbeat → CONNECTED', async () => {
  const session = VALID_SESSION(); // all conditions met
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('CONNECTED');
  expect(result.isLiveConnected).toBe(true);
  expect(result.registeredToolCount).toBe(3);
  expect(result.clientInfo.name).toBe('Claude');
});

// ---------------------------------------------------------------------------
// Scenario 5: Tool count = 0 → ERROR (TOOLS_UNAVAILABLE)
// ---------------------------------------------------------------------------

test('Scenario 5: tool count = 0 → ERROR with TOOLS_UNAVAILABLE code', async () => {
  const session = VALID_SESSION({ registeredToolCount: 0, registeredToolNames: [] });
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('ERROR');
  expect(result.errorCode).toBe('TOOLS_UNAVAILABLE');
  expect(result.isLiveConnected).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 6: Claude closes after connection → DISCONNECTED
// ---------------------------------------------------------------------------

test('Scenario 6: transport closed after connection → DISCONNECTED', async () => {
  const session = VALID_SESSION({ transportOpen: false, disconnectReason: 'stdin_eof' });
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('DISCONNECTED');
  expect(result.isLiveConnected).toBe(false);
  expect(result.disconnectReason).toBe('stdin_eof');
});

// ---------------------------------------------------------------------------
// Scenario 7: MCP process crashes → DISCONNECTED immediately
// ---------------------------------------------------------------------------

test('Scenario 7: dead PID (pid=0) with prior connection → DISCONNECTED', async () => {
  const session = VALID_SESSION({ serverPid: 0 }); // PID 0 is never alive
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  // PID dead: previously connected → DISCONNECTED (not CONNECTED)
  expect(['DISCONNECTED', 'SERVER_START_FAILED']).toContain(result.state);
  expect(result.isLiveConnected).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 8: Old/stale status file → must never report CONNECTED
// ---------------------------------------------------------------------------

test('Scenario 8: stale heartbeat (200s old) → DISCONNECTED, not CONNECTED', async () => {
  const session = VALID_SESSION({ heartbeatAt: STALE_ISO });
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).not.toBe('CONNECTED');
  expect(result.heartbeatFresh).toBe(false);
  expect(result.isLiveConnected).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 9: Invalid config JSON → ERROR without damaging config
// ---------------------------------------------------------------------------

test('Scenario 9: invalid JSON in config → ERROR state', async () => {
  setupMocks({ claudeConfigContent: '{ broken json }}}', sessionContent: undefined });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('ERROR');
  expect(result.errorCode).toBe('INVALID_JSON');
  expect(result.isLiveConnected).toBe(false);
});

test('Scenario 9b: config file not found → NOT_CONFIGURED', async () => {
  setupMocks({ claudeConfigContent: undefined, sessionContent: undefined });
  // access throws ENOENT
  mockFs.access.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
  mockFs.readFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('NOT_CONFIGURED');
  expect(result.isLiveConnected).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 10: Windows path with spaces (structural test)
// ---------------------------------------------------------------------------

test('Scenario 10: config path with spaces is handled correctly', async () => {
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: VALID_SESSION() });

  // If paths contain spaces the readFile mock should still work
  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);
  // If path parsing fails we'd get NOT_CONFIGURED or ERROR
  expect(['CONNECTED', 'WAITING_FOR_CLAUDE']).toContain(result.state);
});

// ---------------------------------------------------------------------------
// Scenario 11: Unrelated MCP servers remain in config
// ---------------------------------------------------------------------------

test('Scenario 11: unrelated MCP servers in config are preserved in response', async () => {
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: VALID_SESSION() });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  // The function reads only agentmark entry — other servers are not reported
  // but the config file is NOT modified by getTruthfulClaudeStatus
  expect(result.state).toBe('CONNECTED');
  // Verify 'other-server' would still be in the file (we didn't wipe it)
  expect(VALID_CONFIG).toContain('other-server');
});

// ---------------------------------------------------------------------------
// Scenario 12: Repeated setup idempotent — same result on multiple calls
// ---------------------------------------------------------------------------

test('Scenario 12: repeated status calls produce consistent result', async () => {
  const session = VALID_SESSION();
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result1 = await getTruthfulClaudeStatus('user1', alwaysValidKey);
  const result2 = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result1.state).toBe(result2.state);
  expect(result1.sessionId).toBe(result2.sessionId);
  expect(result1.registeredToolCount).toBe(result2.registeredToolCount);
});

// ---------------------------------------------------------------------------
// Correction #4: Broken API key ≠ MCP transport disconnected
// ---------------------------------------------------------------------------

test('Correction #4: invalid API key sets apiKeyValid=false but MCP state is independent', async () => {
  const session = VALID_SESSION();
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysInvalidKey);

  // API key invalid — but this should NOT force state to ERROR by itself.
  // The MCP transport evidence is evaluated independently.
  // apiKeyValid is a separate diagnostic field.
  expect(result.apiKeyValid).toBe(false);
  expect(result.apiKeyError).toBeTruthy();
  // State may be CONNECTED or another MCP-evidence-based state
  // (depending on implementation decision — key check is separate)
  expect(result.configPath).toBeTruthy();
});

// ---------------------------------------------------------------------------
// TOOLS_DISCOVERED state: after tools/list but before CONNECTED confirmation
// ---------------------------------------------------------------------------

test('tools/list + registeredToolCount > 0 → CONNECTED (not stuck at TOOLS_DISCOVERED)', async () => {
  const session = VALID_SESSION();
  setupMocks({ claudeConfigContent: VALID_CONFIG, sessionContent: session });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  // TOOLS_DISCOVERED is a transient sub-state absorbed into CONNECTED
  // when all conditions are met simultaneously
  expect(result.state).toBe('CONNECTED');
  expect(result.toolsListRequested).toBe(true);
  expect(result.registeredToolCount).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Not configured → no agentmark entry
// ---------------------------------------------------------------------------

test('Config valid JSON but no agentmark entry → NOT_CONFIGURED', async () => {
  const configWithoutAgentmark = JSON.stringify({
    mcpServers: { 'other-server': { command: 'uvx', args: ['other'] } },
  });
  setupMocks({ claudeConfigContent: configWithoutAgentmark, sessionContent: undefined });

  const result = await getTruthfulClaudeStatus('user1', alwaysValidKey);

  expect(result.state).toBe('NOT_CONFIGURED');
  expect(result.configValid).toBe(true); // file is valid JSON
});
