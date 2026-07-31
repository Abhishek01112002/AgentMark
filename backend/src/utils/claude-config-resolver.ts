import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export type ClaudeInstallationType = 'standard' | 'uwp' | 'mac' | 'linux' | 'unknown';

export interface ClaudeCandidate {
  id: string; // Unique identifier for the installation (e.g. package family name or "standard")
  type: ClaudeInstallationType;
  installationPath: string;
  configPath: string;
  isRunning: boolean;
  activePids: number[];
}

export type ResolutionStatus = 
  | 'RESOLVED' 
  | 'NOT_INSTALLED' 
  | 'AMBIGUOUS_MULTIPLE_INSTALLATIONS' 
  | 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES';

export interface ClaudeInstallationInfo {
  status: ResolutionStatus;
  
  // If RESOLVED, the following fields are populated for the canonical installation
  installationType: ClaudeInstallationType | null;
  installationPath: string | null;
  configPath: string | null;
  
  // Config state for the canonical config
  configExists: boolean;
  agentmarkEntryPresent: boolean;
  isCanonicalActiveConfig: boolean;
  
  // Metadata about detection
  detectedCandidates: ClaudeCandidate[];
  activeProcessPid: number | null;
  activeProcessExecutable: string | null;
  
  recommendedAction: string | null;
}

// Persist the user's explicit selection if ambiguous
function getSelectionFilePath(): string {
  const platform = os.platform();
  if (platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(roaming, 'AgentMark', 'claude_selection.json');
  } else if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'AgentMark', 'claude_selection.json');
  } else {
    const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
    return path.join(xdg, 'AgentMark', 'claude_selection.json');
  }
}

export function resetResolverCacheForTesting(): void {
  // Clear any internal cached state if added later
}

async function getUserSelection(): Promise<string | null> {
  try {
    const content = await fs.readFile(getSelectionFilePath(), 'utf-8');
    const data = JSON.parse(content);
    return data.selectedId || null;
  } catch {
    return null;
  }
}

export async function setUserSelection(selectedId: string): Promise<void> {
  const file = getSelectionFilePath();
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ selectedId }), 'utf-8');
}

export async function clearUserSelection(): Promise<void> {
  try {
    await fs.unlink(getSelectionFilePath());
  } catch (err: any) {
    if (err.code !== 'ENOENT') throw err;
  }
}

// OS-specific path helpers
function getWin32StandardConfigPath(): string {
  return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json');
}

function getWin32UwpConfigPath(packageName: string): string {
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
  return path.join(localAppData, 'Packages', packageName, 'LocalCache', 'Roaming', 'Claude', 'claude_desktop_config.json');
}

// Discover all installed candidates
function discoverWindowsCandidates(): ClaudeCandidate[] {
  const candidates: ClaudeCandidate[] = [];
  const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');

  // Check Standard Installation
  const standardExe = path.join(localAppData, 'Programs', 'Claude', 'Claude.exe');
  if (fsSync.existsSync(standardExe)) {
    candidates.push({
      id: 'windows_standard',
      type: 'standard',
      installationPath: path.dirname(standardExe),
      configPath: getWin32StandardConfigPath(),
      isRunning: false,
      activePids: []
    });
  } else if (fsSync.existsSync(getWin32StandardConfigPath())) {
    // If the config exists but executable doesn't, maybe it was installed elsewhere.
    candidates.push({
      id: 'windows_standard',
      type: 'standard',
      installationPath: path.dirname(standardExe), // best guess
      configPath: getWin32StandardConfigPath(),
      isRunning: false,
      activePids: []
    });
  }

  // Check UWP Installations
  const packagesDir = path.join(localAppData, 'Packages');
  try {
    if (fsSync.existsSync(packagesDir)) {
      const entries = fsSync.readdirSync(packagesDir);
      for (const entry of entries) {
        if (entry.toLowerCase().startsWith('claude_')) {
          const uwpConfigPath = getWin32UwpConfigPath(entry);
          candidates.push({
            id: `windows_uwp_${entry}`,
            type: 'uwp',
            installationPath: path.join(packagesDir, entry),
            configPath: uwpConfigPath,
            isRunning: false,
            activePids: []
          });
        }
      }
    }
  } catch {
    // Ignore permissions/read errors
  }

  return candidates;
}

function discoverMacLinuxCandidates(): ClaudeCandidate[] {
  const platform = os.platform();
  const candidates: ClaudeCandidate[] = [];
  
  if (platform === 'darwin') {
    const configPath = path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    const appPath = '/Applications/Claude.app';
    if (fsSync.existsSync(appPath) || fsSync.existsSync(configPath)) {
      candidates.push({
        id: 'mac_standard',
        type: 'mac',
        installationPath: appPath,
        configPath,
        isRunning: false,
        activePids: []
      });
    }
  } else {
    // Linux Fallback
    const configPath = path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
    if (fsSync.existsSync(configPath) || fsSync.existsSync(path.dirname(configPath))) {
      candidates.push({
        id: 'linux_standard',
        type: 'linux',
        installationPath: configPath,
        configPath,
        isRunning: false,
        activePids: []
      });
    }
  }
  
  return candidates;
}

// Detect running processes and map them to candidates
function mapRunningProcesses(candidates: ClaudeCandidate[]): void {
  if (os.platform() === 'win32') {
    try {
      const raw = execSync(
        `powershell -NoProfile -NonInteractive -Command ` +
        `"Get-CimInstance Win32_Process -Filter \\"Name = 'Claude.exe'\\" | Select-Object ProcessId, ExecutablePath | ConvertTo-Json"`,
        { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();
      
      if (raw) {
        let processes = JSON.parse(raw);
        if (!Array.isArray(processes)) processes = [processes];
        
        for (const proc of processes) {
          if (!proc.ExecutablePath) continue;
          
          const exePath = proc.ExecutablePath.toLowerCase();
          for (const candidate of candidates) {
            let matches = false;
            if (candidate.type === 'standard') {
              matches = exePath.includes('\\appdata\\local\\programs\\claude');
            } else if (candidate.type === 'uwp') {
              const pkgName = candidate.id.replace('windows_uwp_', '').toLowerCase(); // e.g. claude_pzs8sxrjxfjjc
              const parts = pkgName.split('_');
              const publisherId = parts.length > 1 ? parts[parts.length - 1] : pkgName;
              matches = exePath.includes('\\windowsapps\\') && exePath.includes('claude') && exePath.includes(publisherId);
            }
            
            if (matches) {
              candidate.isRunning = true;
              candidate.activePids.push(proc.ProcessId);
            }
          }
        }
      }
    } catch {
      // Ignore PS errors
    }
  } else if (os.platform() === 'darwin') {
    // Add MacOS process mapping if needed (using ps or pgrep)
  }
}

async function checkConfigHasAgentMark(configPath: string): Promise<boolean> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    return !!parsed?.mcpServers?.agentmark;
  } catch {
    return false;
  }
}

export async function resolveActiveClaudeConfig(): Promise<ClaudeInstallationInfo> {
  const customConfigDir = process.env.CLAUDE_CONFIG_DIR;
  
  // Custom directory override skips all detection logic
  if (customConfigDir) {
    const customConfigPath = path.join(customConfigDir, 'claude_desktop_config.json');
    let hasAgentMark = false;
    let exists = false;
    try {
      await fs.access(customConfigPath);
      exists = true;
      hasAgentMark = await checkConfigHasAgentMark(customConfigPath);
    } catch {}

    return {
      status: 'RESOLVED',
      installationType: 'unknown',
      installationPath: customConfigDir,
      configPath: customConfigPath,
      configExists: exists,
      agentmarkEntryPresent: hasAgentMark,
      isCanonicalActiveConfig: true,
      detectedCandidates: [],
      activeProcessPid: null,
      activeProcessExecutable: null,
      recommendedAction: null
    };
  }

  // 1. Discover all candidates
  const candidates = os.platform() === 'win32' ? discoverWindowsCandidates() : discoverMacLinuxCandidates();
  
  // 2. Detect running processes
  mapRunningProcesses(candidates);
  
  const runningCandidates = candidates.filter(c => c.isRunning);
  
  let selectedCandidate: ClaudeCandidate | null = null;
  let status: ResolutionStatus = 'RESOLVED';
  let recommendedAction: string | null = null;
  
  const userSelection = await getUserSelection();

  // Resolution Policy
  if (runningCandidates.length > 0) {
    if (runningCandidates.length === 1) {
      selectedCandidate = runningCandidates[0];
    } else {
      // Multiple distinct installations running simultaneously!
      if (userSelection) {
        const sel = runningCandidates.find(c => c.id === userSelection);
        if (sel) {
          selectedCandidate = sel;
        } else {
          status = 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES';
          recommendedAction = 'Multiple Claude Desktop installations are running. Please select which one to connect.';
        }
      } else {
        status = 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES';
        recommendedAction = 'Multiple Claude Desktop installations are running. Please select which one to connect.';
      }
    }
  } else {
    // None running
    if (candidates.length === 0) {
      status = 'NOT_INSTALLED';
      recommendedAction = 'Claude Desktop could not be found. Please install it.';
    } else if (candidates.length === 1) {
      selectedCandidate = candidates[0];
    } else {
      // Multiple installed, none running
      if (userSelection) {
        const sel = candidates.find(c => c.id === userSelection);
        if (sel) {
          selectedCandidate = sel;
        } else {
          status = 'AMBIGUOUS_MULTIPLE_INSTALLATIONS';
          recommendedAction = 'Multiple Claude Desktop installations found. Please select which one to connect.';
        }
      } else {
        status = 'AMBIGUOUS_MULTIPLE_INSTALLATIONS';
        recommendedAction = 'Multiple Claude Desktop installations found. Please select which one to connect.';
      }
    }
  }

  if (status !== 'RESOLVED' || !selectedCandidate) {
    return {
      status,
      installationType: null,
      installationPath: null,
      configPath: null,
      configExists: false,
      agentmarkEntryPresent: false,
      isCanonicalActiveConfig: false,
      detectedCandidates: candidates,
      activeProcessPid: null,
      activeProcessExecutable: null,
      recommendedAction
    };
  }

  // Evaluate config state for the resolved candidate
  let configExists = false;
  let hasAgentMark = false;
  try {
    await fs.access(selectedCandidate.configPath);
    configExists = true;
    hasAgentMark = await checkConfigHasAgentMark(selectedCandidate.configPath);
  } catch {}

  return {
    status: 'RESOLVED',
    installationType: selectedCandidate.type,
    installationPath: selectedCandidate.installationPath,
    configPath: selectedCandidate.configPath,
    configExists,
    agentmarkEntryPresent: hasAgentMark,
    isCanonicalActiveConfig: true,
    detectedCandidates: candidates,
    activeProcessPid: selectedCandidate.activePids.length > 0 ? selectedCandidate.activePids[0] : null,
    activeProcessExecutable: null,
    recommendedAction: null
  };
}
