/**
 * runtime-capabilities.test.ts
 *
 * Verifies that getRuntimeCapabilities() returns the correct boolean values
 * for every supported platform/environment combination.
 *
 * All tests mock os.platform() and process.env and restore them after each
 * test so they cannot bleed into other suites.
 */

import os from 'os';

// We re-import the module inside each test after manipulating the environment
// to avoid module-level caching masking the correct behaviour.
const loadCapabilities = () => {
  jest.resetModules();
  return require('./runtime-capabilities');
};

describe('getRuntimeCapabilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Isolate env mutations
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  // ── Platform-based detection ───────────────────────────────────────────────

  it('returns claudeDesktopManagement=true on win32', () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    delete process.env.CLAUDE_DESKTOP_DISABLED;
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(true);
  });

  it('returns claudeDesktopManagement=true on darwin', () => {
    jest.spyOn(os, 'platform').mockReturnValue('darwin');
    delete process.env.CLAUDE_DESKTOP_DISABLED;
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(true);
  });

  it('returns claudeDesktopManagement=false on linux (container default)', () => {
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    delete process.env.CLAUDE_DESKTOP_DISABLED;
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(false);
  });

  // ── CLAUDE_DESKTOP_DISABLED explicit override ──────────────────────────────

  it('returns claudeDesktopManagement=false when CLAUDE_DESKTOP_DISABLED=true on win32', () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    process.env.CLAUDE_DESKTOP_DISABLED = 'true';
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(false);
  });

  it('returns claudeDesktopManagement=false when CLAUDE_DESKTOP_DISABLED=true on darwin', () => {
    jest.spyOn(os, 'platform').mockReturnValue('darwin');
    process.env.CLAUDE_DESKTOP_DISABLED = 'true';
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(false);
  });

  it('does NOT disable capability when CLAUDE_DESKTOP_DISABLED is absent', () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    delete process.env.CLAUDE_DESKTOP_DISABLED;
    const { getRuntimeCapabilities } = loadCapabilities();
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(true);
  });

  it('does NOT disable capability when CLAUDE_DESKTOP_DISABLED has a non-true value', () => {
    jest.spyOn(os, 'platform').mockReturnValue('win32');
    process.env.CLAUDE_DESKTOP_DISABLED = 'false';
    const { getRuntimeCapabilities } = loadCapabilities();
    // Only the literal string 'true' disables the capability
    expect(getRuntimeCapabilities().claudeDesktopManagement).toBe(true);
  });

  // ── Response shape ─────────────────────────────────────────────────────────

  it('HOST_CAPABILITY_UNAVAILABLE_RESPONSE has the expected stable shape', () => {
    const { HOST_CAPABILITY_UNAVAILABLE_RESPONSE } = loadCapabilities();
    expect(HOST_CAPABILITY_UNAVAILABLE_RESPONSE).toMatchObject({
      success: false,
      code: 'HOST_CAPABILITY_UNAVAILABLE',
      capability: 'claude_desktop_management',
    });
    expect(typeof HOST_CAPABILITY_UNAVAILABLE_RESPONSE.message).toBe('string');
  });
});
