import fs from 'fs/promises';
import { execSync } from 'child_process';
import {
  resolveActiveClaudeConfig,
  setUserSelection,
  clearUserSelection,
  resetResolverCacheForTesting
} from '../claude-config-resolver';

// Mock dependencies
jest.mock('fs/promises');
jest.mock('fs');
jest.mock('child_process');

describe('claude-config-resolver', () => {
  const originalPlatform = process.platform;
  
  beforeEach(async () => {
    jest.clearAllMocks();
    await clearUserSelection();
    resetResolverCacheForTesting();
    
    // Default to windows for these tests since path logic is Windows-heavy
    Object.defineProperty(process, 'platform', {
      value: 'win32'
    });
    
    const fsSync = require('fs');
    fsSync.existsSync.mockReturnValue(false);
    fsSync.readdirSync.mockReturnValue([]);
  });

  afterAll(() => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform
    });
  });

  const mockFsAccess = (existingPaths: string[]) => {
    const fsPromises = require('fs/promises');
    const fsSync = require('fs');
    
    let mockFiles: Record<string, string> = {};
    
    fsPromises.access.mockImplementation(async (path: string) => {
      if (existingPaths.includes(path) || mockFiles[path]) return Promise.resolve();
      throw new Error('ENOENT');
    });
    
    fsPromises.readFile.mockImplementation(async (path: string) => {
      if (mockFiles[path]) return mockFiles[path];
      if (existingPaths.includes(path)) return '{}';
      throw new Error('ENOENT');
    });
    
    fsPromises.writeFile.mockImplementation(async (path: string, content: string) => {
      mockFiles[path] = content;
    });
    
    fsPromises.mkdir.mockImplementation(async () => Promise.resolve());
    fsPromises.unlink.mockImplementation(async (path: string) => {
      delete mockFiles[path];
    });

    fsSync.existsSync.mockImplementation((path: string) => {
      // Simulate existing based on standard paths we check
      if (path.includes('Packages') && !path.includes('claude_desktop_config.json')) return true;
      if (path.includes('Claude.app')) return existingPaths.includes(path);
      return existingPaths.includes(path);
    });
  };

  const mockRunningProcesses = (processes: { executablePath: string }[]) => {
    const child_process = require('child_process');
    child_process.execSync.mockImplementation((cmd: string) => {
      if (cmd.includes('Get-CimInstance')) {
        if (processes.length === 0) return '';
        const mapped = processes.map((p, i) => ({ ProcessId: 1000 + i, ExecutablePath: p.executablePath }));
        return JSON.stringify(processes.length === 1 ? mapped[0] : mapped);
      }
      return '';
    });
  };

  const standardPath = process.env.APPDATA + '\\Claude\\claude_desktop_config.json';
  const uwpPath = process.env.LOCALAPPDATA + '\\Packages\\Claude_12345\\LocalCache\\Roaming\\Claude\\claude_desktop_config.json';
  const standardExe = process.env.LOCALAPPDATA + '\\Programs\\Claude\\Claude.exe';
  const uwpExe = 'C:\\Program Files\\WindowsApps\\Claude_12345\\Claude.exe';

  // Helper to mock the package discovery for UWP
  const mockUwpPackageDir = (packages = ['Claude_12345']) => {
    const fsSync = require('fs');
    fsSync.readdirSync.mockImplementation((dir: string) => {
      if (dir.includes('Packages')) {
        return packages;
      }
      return [];
    });
  };

  it('1. Returns NOT_INSTALLED when no configs exist', async () => {
    mockFsAccess([]);
    mockRunningProcesses([]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('NOT_INSTALLED');
    expect(result.configPath).toBeNull();
  });

  it('2. Standard only, not running -> resolves to standard', async () => {
    mockFsAccess([standardPath]);
    mockRunningProcesses([]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });

  it('3. Standard only, running -> resolves to standard', async () => {
    mockFsAccess([standardPath]);
    mockRunningProcesses([{ executablePath: standardExe }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });

  it('4. UWP only, not running -> resolves to UWP', async () => {
    mockUwpPackageDir();
    mockFsAccess([uwpPath]);
    mockRunningProcesses([]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(uwpPath);
  });

  it('5. UWP only, running -> resolves to UWP', async () => {
    mockUwpPackageDir();
    mockFsAccess([uwpPath]);
    mockRunningProcesses([{ executablePath: uwpExe }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(uwpPath);
  });

  it('6. Both installed, neither running -> AMBIGUOUS_MULTIPLE_INSTALLATIONS', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('AMBIGUOUS_MULTIPLE_INSTALLATIONS');
    expect(result.configPath).toBeNull();
    expect(result.detectedCandidates).toHaveLength(2);
  });

  it('7. Both installed, only standard running -> resolves to standard', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([{ executablePath: standardExe }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });

  it('8. Both installed, only UWP running -> resolves to UWP', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([{ executablePath: uwpExe }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(uwpPath);
  });

  it('9. Both installed, both running -> AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([{ executablePath: standardExe }, { executablePath: uwpExe }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES');
    expect(result.configPath).toBeNull();
  });

  it('10. User selection exists and is valid -> resolves to selection', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([]);
    
    await setUserSelection('windows_standard'); // Select standard
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });

  it('11. User selection points to non-existent install -> invalidates and re-resolves (fallback to ambiguous)', async () => {
    mockUwpPackageDir();
    mockFsAccess([uwpPath]); // only UWP installed
    mockRunningProcesses([]);
    
    // Try to select standard which is NOT installed
    await setUserSelection('windows_standard');
    
    const result = await resolveActiveClaudeConfig();
    // Since only UWP exists, it resolves to UWP despite the stale selection
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(uwpPath);
  });
  
  it('12. Ignores trailing whitespace in running process path matching', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath]);
    mockRunningProcesses([{ executablePath: standardExe + '   ' }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });

  it('13. Resolves to standard if running process matches its folder even if exe name case differs', async () => {
    mockFsAccess([standardPath]);
    mockRunningProcesses([{ executablePath: standardExe.toLowerCase() }]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(standardPath);
  });
  
  it('14. Resolves to standard on mac/linux based on single path check', async () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const os = require('os');
    jest.spyOn(os, 'platform').mockReturnValue('darwin');
    const macPath = require('path').join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    mockFsAccess([macPath]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(macPath);
    jest.restoreAllMocks();
  });
  
  it('15. On POSIX returns NOT_INSTALLED if config not found', async () => {
    Object.defineProperty(process, 'platform', { value: 'linux' });
    const os = require('os');
    jest.spyOn(os, 'platform').mockReturnValue('linux');
    mockFsAccess([]);
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('NOT_INSTALLED');
    expect(result.configPath).toBeNull();
    jest.restoreAllMocks();
  });

  it('16. Persisted user selection handles multiple running processes gracefully', async () => {
    mockUwpPackageDir();
    mockFsAccess([standardPath, uwpPath]);
    mockRunningProcesses([{ executablePath: standardExe }, { executablePath: uwpExe }]);
    
    await setUserSelection('windows_uwp_Claude_12345');
    
    const result = await resolveActiveClaudeConfig();
    expect(result.status).toBe('RESOLVED');
    expect(result.configPath).toBe(uwpPath);
  });
});
