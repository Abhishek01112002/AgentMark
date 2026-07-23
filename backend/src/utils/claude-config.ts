import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

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
    // fallback if where.exe fails
  }
  return 'uvx';
}

export interface ClaudeConfigStatus {
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';
  mcpStatus: 'Running' | 'Stopped';
  path: string;
  maskedKey: string | null;
  error?: string;
}

// Simple in-memory lock to serialize config file write/rename operations
let writeLock = Promise.resolve();

export const acquireLockAndExecute = async <T>(fn: () => Promise<T>): Promise<T> => {
  const nextLock = writeLock.then(fn);
  writeLock = nextLock.then(() => {}).catch(() => {});
  return nextLock;
};

/**
 * Returns all OS-specific paths to the Claude Desktop configuration file.
 * On Windows, handles both standard Win32 (%APPDATA%\Claude) and UWP Microsoft Store app paths.
 */
export function getAllClaudeConfigPaths(): string[] {
  const platform = os.platform();
  const paths: string[] = [];

  if (platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    paths.push(path.join(roaming, 'Claude', 'claude_desktop_config.json'));

    // Check UWP Store App package directories
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    const packagesDir = path.join(localAppData, 'Packages');

    try {
      if (fsSync.existsSync(packagesDir)) {
        const entries = fsSync.readdirSync(packagesDir);
        for (const entry of entries) {
          if (entry.toLowerCase().startsWith('claude_')) {
            const uwpConfigPath = path.join(packagesDir, entry, 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json');
            if (fsSync.existsSync(path.join(packagesDir, entry))) {
              paths.push(uwpConfigPath);
            }
          }
        }
      }
    } catch {
      // Ignore directory enumeration errors
    }
  } else if (platform === 'darwin') {
    paths.push(path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'));
  } else {
    paths.push(path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json'));
  }

  return paths;
}

/**
 * Returns the primary OS-specific path to the Claude Desktop configuration file.
 */
export function getClaudeConfigPath(): string {
  return getAllClaudeConfigPaths()[0];
}

/**
 * Generates a masked version of the API key for secure frontend rendering.
 * Example: am_247f830a8...f830a -> am_live_************************f830a
 */
export function maskApiKey(key: string): string {
  if (!key.startsWith('am_') || key.length < 12) {
    return 'am_****************';
  }
  return `am_live_************************${key.slice(-5)}`;
}

/**
 * Gets the current connection status of the local Claude Desktop config.
 * Receives validateApiKey callback to decouple database layer from utilities.
 */
export async function getClaudeConfigStatus(
  userId: string,
  validateApiKey: (rawKey: string) => Promise<boolean | { valid: boolean; isOtherUser?: boolean }>
): Promise<ClaudeConfigStatus> {
  const configPath = getClaudeConfigPath();
  const mcpStatus = 'Running';

  try {
    // Check file existence
    try {
      await fs.access(configPath);
    } catch {
      return {
        status: 'Not Connected',
        mcpStatus,
        path: configPath,
        maskedKey: null,
      };
    }

    const content = await fs.readFile(configPath, 'utf-8');
    let config: any;
    try {
      config = JSON.parse(content);
    } catch {
      return {
        status: 'Configuration Error',
        mcpStatus,
        path: configPath,
        maskedKey: null,
        error: 'Claude Desktop configuration file contains invalid JSON syntax.',
      };
    }

    const server = config?.mcpServers?.agentmark;
    if (!server) {
      return {
        status: 'Not Connected',
        mcpStatus,
        path: configPath,
        maskedKey: null,
      };
    }

    const apiKey = server.env?.AGENTMARK_API_KEY;
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        status: 'Configuration Error',
        mcpStatus,
        path: configPath,
        maskedKey: null,
        error: 'AgentMark API key is missing from the configuration file.',
      };
    }

    const keyResult = await validateApiKey(apiKey);
    const isValid = typeof keyResult === 'boolean' ? keyResult : keyResult.valid;
    const isOtherUser = typeof keyResult === 'object' && keyResult.isOtherUser;

    if (!isValid) {
      return {
        status: 'Configuration Error',
        mcpStatus,
        path: configPath,
        maskedKey: maskApiKey(apiKey),
        error: isOtherUser
          ? 'Claude Desktop is currently configured for a different AgentMark user account. Click "Connect Claude Desktop" to automatically switch the connection to this account.'
          : 'The configured AgentMark API key is invalid or has been revoked.',
      };
    }

    // Verify command parameters and server target configurations
    const expectedUrl = `http://localhost:${process.env.PORT || 5003}`;
    const actualUrl = server.env?.AGENTMARK_API_URL || '';
    const actualCmd = server.command || '';
    const actualArgs = Array.isArray(server.args) ? server.args.join(' ') : '';

    const isCmdOutdated = (!actualCmd.includes('python') && !actualCmd.includes('uvx')) || !server.env?.APPDATA;
    const isUrlOutdated = actualUrl.replace(/\/$/, '') !== expectedUrl.replace(/\/$/, '');

    if (isCmdOutdated || isUrlOutdated) {
      return {
        status: 'Configuration Outdated',
        mcpStatus,
        path: configPath,
        maskedKey: maskApiKey(apiKey),
        error: isCmdOutdated
          ? 'The MCP server launch command has been upgraded.'
          : `The server endpoint URL mismatch: expected ${expectedUrl}, found ${actualUrl}.`,
      };
    }

    return {
      status: 'Connected',
      mcpStatus,
      path: configPath,
      maskedKey: maskApiKey(apiKey),
    };
  } catch (err: any) {
    return {
      status: 'Configuration Error',
      mcpStatus,
      path: configPath,
      maskedKey: null,
      error: `Failed to check configuration status: ${err.message}`,
    };
  }
}

/**
 * Writes or merges the AgentMark server definition into the Claude Desktop config.
 * Implements atomic writes, cross-drive EXDEV handling, safety backups, and structural validation.
 */
export async function writeClaudeConfig(apiKey: string): Promise<{ success: boolean; path: string }> {
  return acquireLockAndExecute(async () => {
    const allPaths = getAllClaudeConfigPaths();
    let primaryPath = allPaths[0];

    for (const configPath of allPaths) {
      const configDir = path.dirname(configPath);
      const backupPath = `${configPath}.bak`;
      const tempPath = `${configPath}.tmp`;

      // Ensure the parent directory exists
      await fs.mkdir(configDir, { recursive: true });

      let existingConfig: any = {};
      let backupCreated = false;

      // Check if configuration already exists to make backup and load existing servers
      try {
        await fs.access(configPath);
        const content = await fs.readFile(configPath, 'utf-8');

        // Attempt backup copy
        await fs.writeFile(backupPath, content, 'utf-8');
        backupCreated = true;

        try {
          existingConfig = JSON.parse(content);
        } catch {
          existingConfig = {};
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          continue;
        }
      }

      try {
        const mcpServers = existingConfig.mcpServers || {};
        const expectedUrl = `http://localhost:${process.env.PORT || 5003}`;

        const localMcpPath = path.resolve(process.cwd(), '../agentmark-mcp-server');
        const venvPythonPath = path.join(localMcpPath, '.venv', 'Scripts', 'python.exe');
        const pythonCommand = fsSync.existsSync(venvPythonPath) ? venvPythonPath : 'python';
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

        const updatedConfig = {
          ...existingConfig,
          mcpServers,
        };

        const jsonString = JSON.stringify(updatedConfig, null, 2);

        await fs.writeFile(tempPath, jsonString, 'utf-8');
        const tempContent = await fs.readFile(tempPath, 'utf-8');
        const parsedTemp = JSON.parse(tempContent);
        if (!parsedTemp?.mcpServers?.agentmark?.env?.AGENTMARK_API_KEY) {
          throw new Error('Verification failed: Written JSON was malformed or missing key parameters.');
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

        if (backupCreated) {
          await fs.unlink(backupPath).catch(() => {});
        }
      } catch (err: any) {
        await fs.unlink(tempPath).catch(() => {});
        if (backupCreated) {
          await fs.copyFile(backupPath, configPath).catch(() => {});
          await fs.unlink(backupPath).catch(() => {});
        }
      }
    }

    return {
      success: true,
      path: primaryPath,
    };
  });
}

/**
 * Removes the AgentMark server definition from the Claude Desktop config.
 * Performs atomic writes, safeties, and cleanup.
 */
export async function removeClaudeConfig(): Promise<{ success: boolean; path: string }> {
  return acquireLockAndExecute(async () => {
    const allPaths = getAllClaudeConfigPaths();
    let primaryPath = allPaths[0];

    for (const configPath of allPaths) {
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

        const tempContent = await fs.readFile(tempPath, 'utf-8');
        const parsedTemp = JSON.parse(tempContent);
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

        if (backupCreated) {
          await fs.unlink(backupPath).catch(() => {});
        }
      } catch (err: any) {
        await fs.unlink(tempPath).catch(() => {});
        if (backupCreated) {
          await fs.copyFile(backupPath, configPath).catch(() => {});
          await fs.unlink(backupPath).catch(() => {});
        }
        throw new Error(`Disconnect failed during configuration write: ${err.message}`);
      }
    }

    return {
      success: true,
      path: primaryPath,
    };
  });
}

