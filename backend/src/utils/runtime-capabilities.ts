/**
 * runtime-capabilities.ts
 *
 * Single source of truth for which host-native capabilities are available
 * in the current runtime environment.
 *
 * Design principles:
 *  - Uses OS platform and environment signals to determine what is actually
 *    available, not merely what is configured.
 *  - `CLAUDE_DESKTOP_DISABLED=true` can force the capability off regardless
 *    of platform, useful for containerised Linux deployments and testing.
 *  - Native Windows/macOS: claudeDesktopManagement = true
 *  - Linux (container or native): claudeDesktopManagement = false
 *    unless CLAUDE_DESKTOP_DISABLED is explicitly overriding something else.
 *
 * This module must NOT import Prisma, Redis, or any other service — it is
 * read at request time and must remain synchronous and side-effect free.
 */

import os from 'os';

export interface RuntimeCapabilities {
  /**
   * True when the backend can safely call into Claude Desktop configuration
   * utilities: reading/writing claude_desktop_config.json, querying APPDATA,
   * inspecting running Claude processes, and killing stale MCP subprocesses.
   *
   * False on Linux (including containers) and when CLAUDE_DESKTOP_DISABLED=true.
   */
  claudeDesktopManagement: boolean;
}

/**
 * Resolves the current runtime capabilities.
 * Called once per request in the capability gate — kept cheap and synchronous.
 */
export function getRuntimeCapabilities(): RuntimeCapabilities {
  // Explicit opt-out wins over everything (useful in CI / Docker / tests).
  if (process.env.CLAUDE_DESKTOP_DISABLED === 'true') {
    return { claudeDesktopManagement: false };
  }

  // Claude Desktop only ships for Windows and macOS.
  // On Linux (the typical container OS), the capability is unavailable.
  const platform = os.platform();
  const claudeDesktopManagement = platform === 'win32' || platform === 'darwin';

  return { claudeDesktopManagement };
}

/**
 * Returns a stable, structured 501 response body for callers that need to
 * forward an "unavailable capability" response to the client.
 *
 * Using 501 Not Implemented per HTTP semantics: the server understands the
 * request but the feature is not available in this deployment configuration.
 */
export const HOST_CAPABILITY_UNAVAILABLE_RESPONSE = {
  success: false,
  code: 'HOST_CAPABILITY_UNAVAILABLE',
  message:
    'Claude Desktop configuration management is not available in this runtime environment. ' +
    'This feature requires running AgentMark natively on Windows or macOS.',
  capability: 'claude_desktop_management',
} as const;
