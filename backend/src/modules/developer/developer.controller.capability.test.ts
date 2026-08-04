/**
 * developer.controller.capability.test.ts
 *
 * Verifies that every Claude Desktop endpoint in developer.controller.ts:
 *   (a) returns 501 HOST_CAPABILITY_UNAVAILABLE when claudeDesktopManagement=false
 *   (b) does NOT call any claude-config utility when the capability is absent
 *   (c) proceeds normally (calls through to existing logic) when capability=true
 *
 * We mock getRuntimeCapabilities and every claude-config function so that no
 * real filesystem, PowerShell, or Prisma operations occur.
 */

import { Request, Response } from 'express';

// ── Module-level mocks ─────────────────────────────────────────────────────

jest.mock('../../utils/runtime-capabilities', () => ({
  getRuntimeCapabilities: jest.fn(),
  HOST_CAPABILITY_UNAVAILABLE_RESPONSE: {
    success: false,
    code: 'HOST_CAPABILITY_UNAVAILABLE',
    message: 'Claude Desktop configuration management is not available in this runtime environment.',
    capability: 'claude_desktop_management',
  },
}));

jest.mock('../../utils/claude-config', () => ({
  resolveActiveClaudeConfig: jest.fn(),
  getClaudeConfigStatus: jest.fn(),
  getTruthfulClaudeStatus: jest.fn(),
  runConnectionDiagnostic: jest.fn(),
  writeClaudeConfig: jest.fn(),
  removeClaudeConfig: jest.fn(),
  setUserSelection: jest.fn(),
}));

// Prevent real Prisma connection during tests
jest.mock('../../db', () => ({
  default: {
    apiKey: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
    mcpActivity: { findMany: jest.fn() },
  },
}));

// Prevent MCP logger from requiring real Prisma
jest.mock('../../middlewares/mcp-logger.middleware', () => ({
  userLastMcpActivity: new Map(),
  mcpLoggerMiddleware: (_req: any, _res: any, next: any) => next(),
}));

// ── Import after mocks are set up ──────────────────────────────────────────

import {
  getClaudeStatus,
  pingClaude,
  verifyClaudeConnection,
  setClaudeSelection,
  connectClaude,
  regenerateClaudeKey,
  disconnectClaude,
  connectClaudeFlow,
} from './developer.controller';
import { getRuntimeCapabilities } from '../../utils/runtime-capabilities';
import {
  getTruthfulClaudeStatus,
  runConnectionDiagnostic,
  writeClaudeConfig,
  removeClaudeConfig,
  resolveActiveClaudeConfig,
  setUserSelection,
} from '../../utils/claude-config';

// ── Helpers ────────────────────────────────────────────────────────────────

const mockGetCapabilities = getRuntimeCapabilities as jest.Mock;
const mockGetTruthfulStatus = getTruthfulClaudeStatus as jest.Mock;
const mockRunDiagnostic = runConnectionDiagnostic as jest.Mock;
const mockWriteConfig = writeClaudeConfig as jest.Mock;
const mockRemoveConfig = removeClaudeConfig as jest.Mock;
const mockResolveConfig = resolveActiveClaudeConfig as jest.Mock;
const mockSetSelection = setUserSelection as jest.Mock;

function makeReqRes(overrides: Partial<Request> = {}) {
  const req = {
    userId: 'user-123',
    body: {},
    params: {},
    ...overrides,
  } as any;

  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { json, status, writeHead: jest.fn(), write: jest.fn(), end: jest.fn() } as any;

  // Chain: res.status(501).json({...})
  status.mockImplementation((_code: number) => ({ json }));

  return { req, res, json, status };
}

const next = jest.fn();

// ── Tests: capability=false (Linux / container) ────────────────────────────

describe('Claude Desktop endpoints — capability unavailable (Linux / container)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCapabilities.mockReturnValue({ claudeDesktopManagement: false });
  });

  const EXPECTED_STATUS = 501;
  const EXPECTED_CODE = 'HOST_CAPABILITY_UNAVAILABLE';

  it('getClaudeStatus returns 501 without calling getTruthfulClaudeStatus', async () => {
    const { req, res, status, json } = makeReqRes();
    await getClaudeStatus(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockGetTruthfulStatus).not.toHaveBeenCalled();
  });

  it('pingClaude returns 501 without calling getTruthfulClaudeStatus', async () => {
    const { req, res, status, json } = makeReqRes();
    await pingClaude(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockGetTruthfulStatus).not.toHaveBeenCalled();
  });

  it('verifyClaudeConnection returns 501 without calling runConnectionDiagnostic', async () => {
    const { req, res, status, json } = makeReqRes();
    await verifyClaudeConnection(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockRunDiagnostic).not.toHaveBeenCalled();
  });

  it('setClaudeSelection returns 501 without calling setUserSelection', async () => {
    const { req, res, status, json } = makeReqRes({ body: { selectedId: 'win32_standard' } });
    await setClaudeSelection(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockSetSelection).not.toHaveBeenCalled();
  });

  it('connectClaude returns 501 without calling writeClaudeConfig', async () => {
    const { req, res, status, json } = makeReqRes();
    await connectClaude(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });

  it('regenerateClaudeKey returns 501 without calling writeClaudeConfig', async () => {
    const { req, res, status, json } = makeReqRes();
    await regenerateClaudeKey(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });

  it('disconnectClaude returns 501 without calling removeClaudeConfig', async () => {
    const { req, res, status, json } = makeReqRes();
    await disconnectClaude(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    expect(mockRemoveConfig).not.toHaveBeenCalled();
  });

  it('connectClaudeFlow returns 501 JSON (not SSE) without opening an event stream', async () => {
    const { req, res, status, json } = makeReqRes();
    await connectClaudeFlow(req, res, next);
    expect(status).toHaveBeenCalledWith(EXPECTED_STATUS);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ code: EXPECTED_CODE }));
    // SSE write and end must NOT have been called before the 501
    expect(res.writeHead).not.toHaveBeenCalled();
  });
});

// ── Tests: capability=true (Windows native — call passes through) ───────────

describe('Claude Desktop endpoints — capability available (Windows native)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCapabilities.mockReturnValue({ claudeDesktopManagement: true });
  });

  it('getClaudeStatus proceeds past the guard and calls getTruthfulClaudeStatus', async () => {
    mockGetTruthfulStatus.mockResolvedValue({
      state: 'NOT_CONFIGURED',
      status: 'Not Connected',
      configPath: 'Unknown',
      configValid: false,
      maskedKey: null,
      apiKeyValid: false,
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
      errorCode: null,
      errorStage: null,
      errorMessage: null,
      isLiveConnected: false,
      liveStatus: 'Disconnected',
      lastActiveAt: null,
      mcpStatus: 'Stopped',
      path: 'Unknown',
    });

    const { req, res } = makeReqRes();
    await getClaudeStatus(req, res, next);

    // The guard did NOT return 501 — getTruthfulClaudeStatus was reached
    expect(mockGetTruthfulStatus).toHaveBeenCalled();
  });
});
