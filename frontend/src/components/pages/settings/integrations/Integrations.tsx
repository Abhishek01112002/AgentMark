import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw,
  Copy,
  Check,
  Terminal,
  FileDown,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  Activity,
  ShieldCheck,
  Cloud,
  CheckCircle2,
  Clock,
  Wifi,
  WifiOff,
  Loader2,
  ClipboardList,
  FileJson,
  KeyRound,
  Cpu,
  Wrench,
  Unplug,
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { OnboardingPanel } from './OnboardingPanel';

// ---------------------------------------------------------------------------
// Types — mirrors backend TruthfulClaudeStatus
// ---------------------------------------------------------------------------

type ConnectionState =
  | 'NOT_CONFIGURED'
  | 'CONFIGURED'
  | 'SERVER_START_FAILED'
  | 'WAITING_FOR_CLAUDE'
  | 'HANDSHAKE_VERIFIED'
  | 'TOOLS_DISCOVERED'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

interface ClaudeInstallationInfo {
  id: string;
  type: 'standard' | 'uwp';
  version: string | null;
  configPath: string;
  executablePath: string | null;
  isRunning: boolean;
}

interface ResolutionResult {
  status: 'RESOLVED' | 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES' | 'AMBIGUOUS_MULTIPLE_INSTALLATIONS' | 'NO_INSTALLATION_FOUND';
  configPath: string | null;
  recommendedAction: string;
  detectedCandidates: ClaudeInstallationInfo[];
  userSelectionId: string | null;
}

interface TruthfulClaudeStatus {
  state: ConnectionState;
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';
  configPath: string;
  configValid: boolean;
  maskedKey: string | null;
  apiKeyValid: boolean;
  apiKeyError?: string;
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
  errorCode: string | null;
  errorStage: string | null;
  errorMessage: string | null;
  isLiveConnected: boolean;
  liveStatus: string;
  lastActiveAt: string | null;
  mcpStatus: 'Running' | 'Stopped';
  path: string;
  resolution?: ResolutionResult;
}

interface DiagnosticStage {
  stage: string;
  passed: boolean;
  detail: string;
}

interface DiagnosticResult {
  stages: DiagnosticStage[];
  finalState: ConnectionState;
  recommendedAction: string;
  mcpStatusFilePath: string;
  claudeConfigPath: string;
}

// ---------------------------------------------------------------------------
// State metadata
// ---------------------------------------------------------------------------

const STATE_META: Record<ConnectionState, {
  badge: string;
  badgeColor: string;
  dotColor: string;
  dotAnimate: boolean;
  icon: React.ReactNode;
  message: string;
}> = {
  NOT_CONFIGURED: {
    badge: 'NOT CONFIGURED',
    badgeColor: 'border-zinc-500/30 bg-zinc-500/10 text-zinc-400',
    dotColor: 'bg-zinc-500',
    dotAnimate: false,
    icon: <WifiOff size={11} />,
    message: 'AgentMark is not configured in Claude Desktop.',
  },
  CONFIGURED: {
    badge: 'CONFIGURED',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dotColor: 'bg-amber-400',
    dotAnimate: false,
    icon: <Clock size={11} />,
    message: 'AgentMark has been added to Claude Desktop configuration. Connection has not yet been verified.',
  },
  SERVER_START_FAILED: {
    badge: 'START FAILED',
    badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    dotColor: 'bg-rose-500',
    dotAnimate: false,
    icon: <AlertCircle size={11} />,
    message: 'MCP server process failed to start. Check server logs.',
  },
  WAITING_FOR_CLAUDE: {
    badge: 'WAITING',
    badgeColor: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    dotColor: 'bg-amber-400',
    dotAnimate: true,
    icon: <Loader2 size={11} className="animate-spin" />,
    message: 'Configuration is valid. Waiting for Claude Desktop to initialize the AgentMark MCP server.',
  },
  HANDSHAKE_VERIFIED: {
    badge: 'HANDSHAKE',
    badgeColor: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
    dotColor: 'bg-blue-400',
    dotAnimate: true,
    icon: <Wifi size={11} />,
    message: 'Claude connected to the AgentMark MCP server. Verifying available tools.',
  },
  TOOLS_DISCOVERED: {
    badge: 'TOOLS FOUND',
    badgeColor: 'border-violet-500/30 bg-violet-500/10 text-violet-300',
    dotColor: 'bg-violet-400',
    dotAnimate: true,
    icon: <Activity size={11} />,
    message: 'Claude requested the AgentMark tool catalog. Finalizing connection verification.',
  },
  CONNECTED: {
    badge: 'CONNECTED',
    badgeColor: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    dotColor: 'bg-emerald-500',
    dotAnimate: true,
    icon: <CheckCircle2 size={11} />,
    message: 'Claude Desktop connection verified.',
  },
  DISCONNECTED: {
    badge: 'DISCONNECTED',
    badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    dotColor: 'bg-rose-500',
    dotAnimate: false,
    icon: <WifiOff size={11} />,
    message: 'Connection lost. Claude Desktop closed or MCP server stopped.',
  },
  ERROR: {
    badge: 'ERROR',
    badgeColor: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
    dotColor: 'bg-rose-500',
    dotAnimate: false,
    icon: <AlertCircle size={11} />,
    message: 'AgentMark could not connect to Claude Desktop.',
  },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export const Integrations: React.FC = () => {
  const [status, setStatus] = useState<TruthfulClaudeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [showRestartAlert, setShowRestartAlert] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [selectedOs, setSelectedOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  const [installerOpen, setInstallerOpen] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installerStatus, setInstallerStatus] = useState<'installing' | 'waiting' | 'failed'>('installing');
  const [installerError, setInstallerError] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, 'idle' | 'pending' | 'success' | 'failed' | 'waiting'>>({
    detect: 'idle', backup: 'idle', key: 'idle', terminate: 'idle', merge: 'idle', relaunch: 'idle',
  });

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // ── Status polling ────────────────────────────────────────────────────────

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/developer/claude-status', { signal });
      setStatus(res.data);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('[Integrations] Failed to fetch Claude status:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchStatus(abortController.signal);
    // Poll every 5 seconds for state transitions while installer is open or state is transient
    pollingRef.current = setInterval(() => fetchStatus(), 5000);
    return () => {
      abortController.abort();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchStatus]);

  // When we reach CONNECTED, dismiss the installer waiting screen
  useEffect(() => {
    if (status?.state === 'CONNECTED' && installerStatus === 'waiting') {
      setInstallerStatus('waiting'); // keep it — transition handled in JSX
    }
  }, [status?.state, installerStatus]);

  // ── Verify Claude Connection ──────────────────────────────────────────────

  const handleVerify = async () => {
    if (verifying) return;
    setVerifying(true);
    setShowDiagnostic(true);
    try {
      const res = await api.get('/developer/claude-verify');
      setDiagnostic(res.data);
      await fetchStatus();
    } catch (err: any) {
      toast.error('Diagnostic failed: ' + (err.message || 'Unknown error'));
    } finally {
      setVerifying(false);
    }
  };

  const handleSelectCandidate = async (selectedId: string) => {
    try {
      setLoading(true);
      await api.post('/developer/claude-selection', { selectedId });
      await fetchStatus();
    } catch (err) {
      console.error('[Integrations] Failed to set Claude selection', err);
      setLoading(false);
    }
  };

  // ── Connect flow ──────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setNewlyGeneratedKey(null);
    setShowRestartAlert(false);
    setInstallerOpen(true);
    setInstallerStatus('installing');
    setInstallerError(null);
    setInstallLogs([]);
    setStepStates({ detect: 'idle', backup: 'idle', key: 'idle', terminate: 'idle', merge: 'idle', relaunch: 'idle' });
    setDiagnostic(null);

    const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:5003` : 'http://localhost:5003');
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/developer/claude-connect-flow`, {
        headers: { 'Authorization': `Bearer ${token || ''}` },
      });
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported.');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawJSON = line.replace('data: ', '').trim();
            try {
              const eventData = JSON.parse(rawJSON);
              const { step, status: evtStatus, message } = eventData;

              if (step && step !== 'complete') {
                setStepStates((prev) => ({ ...prev, [step]: evtStatus }));
              }
              if (message) {
                const logPrefix = evtStatus === 'success' ? '[✓]' : evtStatus === 'failed' ? '[❌]' : '[~]';
                setInstallLogs((prev) => [...prev, `${logPrefix} ${message}`]);
              }
              if (evtStatus === 'failed') {
                setInstallerStatus('failed');
                setInstallerError(message || 'Installation failed.');
              }
              // complete/waiting = honest state: config written, waiting for handshake
              if (step === 'complete' && (evtStatus === 'waiting' || evtStatus === 'success')) {
                setInstallerStatus('waiting');
                setShowRestartAlert(false);
                await fetchStatus();
              }
            } catch {
              // ignore malformed chunks
            }
          }
        }
      }
    } catch (err: any) {
      setInstallerStatus('failed');
      setInstallerError(err.message || 'Failed to connect to backend installer.');
      setInstallLogs((prev) => [...prev, `[❌] Connection failed: ${err.message}`]);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (disconnecting) return;
    setDisconnecting(true);
    setShowRestartAlert(false);
    try {
      const res = await api.post('/developer/claude-disconnect');
      if (res.data.success) {
        toast.success(res.data.message || 'Disconnected successfully!');
        setNewlyGeneratedKey(null);
        setShowRestartAlert(true);
        await fetchStatus();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    setNewlyGeneratedKey(null);
    setShowRestartAlert(false);
    try {
      const res = await api.post('/developer/claude-regenerate');
      if (res.data.success) {
        toast.success('API Key rotated successfully!');
        if (res.data.key) setNewlyGeneratedKey(res.data.key);
        setConfirmRegen(false);
        setShowRestartAlert(true);
        await fetchStatus();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error || err.message || 'Failed to rotate key');
    } finally {
      setRegenerating(false);
    }
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location ? `${window.location.protocol}//${window.location.hostname}:5003` : 'http://localhost:5003');
  const configJsonString = JSON.stringify({
    mcpServers: {
      agentmark: {
        command: 'uvx',
        args: ['agentmark-mcp-server'],
        env: {
          AGENTMARK_API_URL: API_BASE_URL,
          AGENTMARK_API_KEY: newlyGeneratedKey || (status?.maskedKey ? 'PASTE_YOUR_API_KEY_HERE' : 'GENERATING...'),
        },
      },
    },
  }, null, 2);

  const copyToClipboard = (text: string, setCopiedState: React.Dispatch<React.SetStateAction<boolean>>) => {
    navigator.clipboard.writeText(text);
    setCopiedState(true);
    toast.success('Copied!');
    setTimeout(() => setCopiedState(false), 1500);
  };

  const downloadConfigFile = () => {
    const blob = new Blob([configJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'claude_desktop_config.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success('Downloaded config file!');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw size={20} className="animate-spin text-[#8B8B9E]" />
        <span className="text-xs text-text-secondary" style={{ color: '#8B8B9E', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading integration details...
        </span>
      </div>
    );
  }

  const currentState: ConnectionState = status?.state || 'NOT_CONFIGURED';
  const meta = STATE_META[currentState];
  const isConnected = currentState === 'CONNECTED';
  const isTransient = ['WAITING_FOR_CLAUDE', 'HANDSHAKE_VERIFIED', 'TOOLS_DISCOVERED'].includes(currentState);
  const isConfigured = !['NOT_CONFIGURED'].includes(currentState);

  return (
    <div className="space-y-6 max-w-6xl font-sans text-slate-200">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left main controls */}
        <div className="lg:col-span-8 space-y-6">

          {/* Cloud environment notice */}
          {!isLocal && (
            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.12] via-[#12121A]/90 to-[#12121A]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.07)]">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#818CF8]/70 to-transparent" />
              <div className="flex items-start gap-3.5 p-5">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(99,102,241,0.12)]">
                  <Cloud size={17} className="text-[#818CF8]" />
                </div>
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold font-sora text-white text-sm">Hosted Cloud Environment Detected</span>
                    <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">Manual Setup Required</span>
                  </div>
                  <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                    Remote server instances cannot access your laptop's filesystem. Download or copy your configuration file to connect Claude Desktop locally:
                  </p>
                  <ol className="list-decimal list-inside text-xs text-slate-300 font-mono space-y-1 pl-1">
                    <li>Click <strong className="text-white font-sans">"Download Settings"</strong> or <strong className="text-white font-sans">"Copy Config JSON"</strong> below.</li>
                    <li>Save file to <code className="text-[#818CF8] bg-black/40 px-1.5 py-0.5 rounded border border-white/5">%APPDATA%\Claude\claude_desktop_config.json</code></li>
                    <li>Relaunch Claude Desktop.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Ambiguity Alert */}
          {status?.resolution?.status && ['AMBIGUOUS_MULTIPLE_INSTALLATIONS', 'AMBIGUOUS_MULTIPLE_RUNNING_INSTANCES'].includes(status.resolution.status) && (
            <div className="relative overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/[0.12] via-[#12121A]/90 to-[#12121A]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(244,63,94,0.07)]">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-rose-500/70 to-transparent" />
              <div className="flex flex-col gap-4 p-5">
                <div className="flex gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(244,63,94,0.12)]">
                    <AlertCircle size={16} className="text-rose-400" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold font-sora text-sm text-white">Multiple Claude Installations Found</p>
                    <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                      {status.resolution.recommendedAction}
                    </p>
                  </div>
                </div>
                <div className="pl-[3.25rem] space-y-2">
                  {status.resolution.detectedCandidates.map(candidate => (
                    <div key={candidate.id} className="flex items-center justify-between bg-black/40 border border-white/5 rounded-lg p-3">
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">{candidate.type === 'uwp' ? 'Windows Store App' : 'Standard Desktop App'}</span>
                          {candidate.isRunning && <span className="px-1.5 py-[1px] rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 tracking-wider">RUNNING</span>}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate pr-4" title={candidate.configPath}>
                          {candidate.configPath}
                        </div>
                      </div>
                      <button
                        onClick={() => handleSelectCandidate(candidate.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-white transition-colors whitespace-nowrap shrink-0 border border-white/10"
                      >
                        Select
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Restart alert */}
          {showRestartAlert && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.12] via-[#12121A]/90 to-[#12121A]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(245,158,11,0.07)]">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F59E0B]/70 to-transparent" />
              <div className="flex items-start justify-between gap-3 p-5">
                <div className="flex gap-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.12)]">
                    <Info size={16} className="text-[#FBBF24]" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <p className="font-semibold font-sora text-sm text-white">Action Required: Relaunch Claude Desktop</p>
                    <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                      Claude Desktop loads MCP configuration changes on startup. Quit Claude completely from the OS tray, then restart it.
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowRestartAlert(false)} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer shrink-0" title="Dismiss">
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Main connection card */}
          <div className="p-6 sm:p-7 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] via-[#818CF8]/70 to-transparent opacity-80 shadow-[0_0_12px_rgba(99,102,241,0.35)]" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262636] pb-4 gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold font-sora text-white tracking-tight">
                  Claude Desktop MCP Configuration
                </h3>
                <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                  Enable Claude Desktop to execute campaign workflows and retrieve real-time metrics locally
                </p>
              </div>

              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Verify button */}
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#202030] text-[#818CF8] hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                    id="verify-connection-btn"
                  >
                    <Activity size={13} className={verifying ? 'animate-spin text-[#818CF8]' : 'text-[#818CF8]'} />
                    <span>{verifying ? 'Verifying...' : 'Verify Claude Connection'}</span>
                  </button>

                  {/* State badge */}
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono font-bold tracking-wider ${meta.badgeColor} ${isConnected ? 'shadow-[0_0_14px_rgba(16,185,129,0.2)]' : ''}`} id="connection-state-badge">
                    <span className="relative flex h-2 w-2">
                      {meta.dotAnimate && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${meta.dotColor} opacity-75`} />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${meta.dotColor}`} />
                    </span>
                    <span>{meta.badge}</span>
                  </div>
                </div>

                {/* State message */}
                <span className="text-[10px] font-mono text-[#94A3B8] flex items-center gap-1.5 max-w-xs text-right">
                  {isConnected
                    ? <><ShieldCheck size={11} className="text-emerald-400 shrink-0" />
                      {`Connection verified • ${status?.registeredToolCount ?? 0} tools • Client: ${status?.clientInfo?.name || 'Claude'} ${status?.clientInfo?.version || ''}`}</>
                    : isTransient
                    ? <><Loader2 size={11} className="animate-spin shrink-0" />{meta.message}</>
                    : meta.message}
                </span>
              </div>
            </div>

            {/* Metadata grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0B0B12] border border-[#262636] rounded-xl px-4 py-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
                    <FileJson size={12} className="text-[#818CF8]" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Configuration File Location</span>
                </div>
                <div className="font-mono text-xs text-slate-200 select-all truncate" title={status?.configPath || status?.path}>
                  {status?.configPath || status?.path || 'N/A'}
                </div>
              </div>
              <div className="bg-[#0B0B12] border border-[#262636] rounded-xl px-4 py-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <KeyRound size={12} className="text-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono font-semibold text-[#94A3B8] uppercase tracking-wider">Active Access Token</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="truncate font-mono text-xs text-slate-200">{status?.maskedKey || 'No token active'}</code>
                  {status?.maskedKey && (
                    <button onClick={() => setConfirmRegen(true)} className="px-2.5 py-1 rounded-lg bg-[#1A1A26] hover:bg-[#252535] border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer font-sora shrink-0">
                      Rotate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* MCP Evidence Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Config', value: status?.configValid ? 'Valid' : 'Invalid', ok: status?.configValid, icon: <Wrench size={12} className="text-[#818CF8]" /> },
                { label: 'MCP Process', value: status?.serverPid ? `PID ${status.serverPid}` : 'Not running', ok: !!status?.serverPid && status?.heartbeatFresh, icon: <Cpu size={12} className="text-[#38BDF8]" /> },
                { label: 'Handshake', value: status?.initializeReceived ? 'Received' : 'Pending', ok: status?.initializeReceived, icon: <Wifi size={12} className="text-[#34D399]" /> },
                { label: 'Tools', value: status?.registeredToolCount ? `${status.registeredToolCount} tools` : 'None', ok: (status?.registeredToolCount ?? 0) > 0, icon: <Activity size={12} className="text-[#A78BFA]" /> },
              ].map(({ label, value, ok, icon }) => (
                <div key={label} className="relative bg-[#0B0B12] border border-[#262636] rounded-xl px-3.5 py-3 space-y-2.5 transition-colors hover:border-[#333348]">
                  {ok && <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />}
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border ${ok ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-zinc-500/10 border-zinc-500/20'}`}>
                      {icon}
                    </div>
                    <span className="text-[10px] font-mono text-[#94A3B8] uppercase tracking-wider">{label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ok ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-zinc-600'}`} />
                    <span className="text-xs font-mono text-slate-200 truncate">{value}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* API key health (separate from MCP state) */}
            {status && !status.apiKeyValid && status.apiKeyError && (
              <div className="flex gap-3.5 p-4 rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.08] to-transparent">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
                  <AlertTriangle size={14} className="text-amber-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold font-sora text-xs text-white">API Key Issue (does not affect MCP transport state)</p>
                  <p className="text-xs text-[#94A3B8] font-sans">{status.apiKeyError}</p>
                </div>
              </div>
            )}

            {/* Error detail for ERROR state */}
            {currentState === 'ERROR' && status?.errorMessage && (
              <div className="flex gap-3.5 p-4 rounded-xl border border-[#F43F5E]/25 bg-gradient-to-br from-[#F43F5E]/[0.08] to-transparent">
                <div className="w-8 h-8 rounded-lg bg-[#F43F5E]/15 border border-[#F43F5E]/25 flex items-center justify-center shrink-0">
                  <AlertCircle size={14} className="text-[#F43F5E]" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold font-sora text-xs text-white">
                    {status.errorCode === 'TOOLS_UNAVAILABLE' ? 'No Tools Registered' : 'Connection Error'}
                    {status.errorStage ? ` — Stage: ${status.errorStage}` : ''}
                  </p>
                  <p className="text-xs text-[#94A3B8] font-sans">{status.errorMessage}</p>
                </div>
              </div>
            )}

            {/* Last verified / heartbeat */}
            {status?.heartbeatAt && (
              <p className="text-[10px] font-mono text-[#94A3B8]">
                Last MCP heartbeat: {new Date(status.heartbeatAt).toLocaleTimeString()}
                {status.lastActivityAt && ` • Last activity: ${new Date(status.lastActivityAt).toLocaleTimeString()}`}
              </p>
            )}

            {/* Diagnostic results */}
            {showDiagnostic && diagnostic && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                    <ClipboardList size={12} /> Diagnostic Report
                  </span>
                  <button onClick={() => setShowDiagnostic(false)} className="text-[#94A3B8] hover:text-white border-none bg-transparent cursor-pointer p-1">
                    <X size={13} />
                  </button>
                </div>
                <div className="bg-[#0B0B12] border border-[#262636] rounded-xl p-3.5 space-y-2 max-h-64 overflow-y-auto">
                  {diagnostic.stages.map((s, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs font-mono">
                      <span className={s.passed ? 'text-emerald-400' : 'text-rose-400'}>{s.passed ? '✓' : '✗'}</span>
                      <div>
                        <span className={s.passed ? 'text-slate-200' : 'text-rose-300'}>{s.stage}</span>
                        <p className="text-[#94A3B8] text-[10px] mt-0.5">{s.detail}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#262636] text-[10px] font-mono">
                    <span className="text-[#94A3B8]">Final state: </span>
                    <span className="text-white font-bold">{diagnostic.finalState}</span>
                    <p className="text-amber-300 mt-1">{diagnostic.recommendedAction}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(diagnostic, null, 2), setCopiedKey)}
                  className="text-[10px] font-mono text-[#818CF8] hover:text-white flex items-center gap-1.5 border-none bg-transparent cursor-pointer"
                >
                  {copiedKey ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  Copy Diagnostic Report
                </button>
              </div>
            )}

            {/* Action footer */}
            <div className="border-t border-[#262636] pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="font-semibold font-sora text-xs text-white">
                  {isLocal ? 'Configure Integration' : 'Download Settings'}
                </h4>
                <p className="text-xs text-[#94A3B8] font-sans">
                  {isLocal ? 'Write connections directly to your desktop folders.' : 'Download and place in Claude folders.'}
                </p>
              </div>

              {isLocal ? (
                <div className="flex items-center gap-2 shrink-0">
                  {isConfigured && currentState !== 'NOT_CONFIGURED' && (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-4 py-2 rounded-xl bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 border border-[#F43F5E]/25 text-[#FDA4AF] hover:text-[#F43F5E] text-xs font-semibold font-sora transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {disconnecting ? <RefreshCw size={12} className="animate-spin" /> : <Unplug size={12} />}
                      <span>Disconnect</span>
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#5254D8] hover:to-[#7178F5] text-white text-xs font-semibold font-sora transition-all shadow-[0_2px_14px_rgba(99,102,241,0.3)] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                    id="connect-claude-btn"
                  >
                    {connecting ? <RefreshCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                    <span>{isConfigured ? 'Reconnect' : 'Connect Claude Desktop'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={downloadConfigFile}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#818CF8] hover:from-[#5254D8] hover:to-[#7178F5] text-white text-xs font-semibold font-sora transition-all shadow-[0_2px_14px_rgba(99,102,241,0.3)] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border-none"
                >
                  <FileDown size={12} />
                  <span>Download Config File</span>
                </button>
              )}
            </div>
          </div>

          {/* Newly Generated API key */}
          {newlyGeneratedKey && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.08] to-[#12121A]/95 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.07)] p-5 space-y-3.5">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/70 to-transparent" />
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <KeyRound size={14} className="text-emerald-400" />
                </div>
                <span className="text-xs font-semibold font-sora text-emerald-300 tracking-wide">Plaintext API Key — Copy Now</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                This API key is hashed in the database and cannot be retrieved again after leaving this page.
              </p>
              <div className="flex items-center gap-3">
                <code className="block flex-1 bg-[#0B0B12] border border-[#262636] px-3.5 py-2.5 rounded-xl font-mono text-xs text-emerald-400 select-all truncate">
                  {newlyGeneratedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyGeneratedKey, setCopiedKey)}
                  className="px-3.5 py-2.5 rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer font-sora"
                >
                  {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy Key</span>
                </button>
              </div>
            </div>
          )}

          {/* OS & Config Guidance */}
          <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#818CF8]/40 via-transparent to-transparent opacity-70" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262636] pb-3 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">OS Path & Config Guidance</h4>
                <p className="text-xs text-[#94A3B8] font-sans">Select your OS for exact file paths & config JSON</p>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-mono text-[#94A3B8]">Target Config Directory (Claude Desktop):</span>
                <div className="flex items-center gap-1 bg-[#0D0D14] border border-[#262636] p-1 rounded-full self-start sm:self-auto shadow-inner">
                  {(['windows', 'mac', 'linux'] as const).map((osKey) => (
                    <button key={osKey} type="button" onClick={() => setSelectedOs(osKey)}
                      className={`px-3.5 py-1 text-[10px] font-mono rounded-full uppercase font-bold transition-all cursor-pointer border-none ${selectedOs === osKey ? 'bg-gradient-to-r from-[#6366F1] to-[#818CF8] text-white shadow-[0_1px_6px_rgba(99,102,241,0.35)]' : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'}`}
                    >
                      {osKey === 'mac' ? 'macOS' : osKey}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#0B0B12] border border-[#262636] px-4 py-2.5 rounded-xl font-mono text-xs text-slate-200">
                <span className="truncate flex-1 select-all text-[#818CF8]">
                  {selectedOs === 'windows' ? '%APPDATA%\\Claude\\claude_desktop_config.json' : selectedOs === 'mac' ? '~/Library/Application Support/Claude/claude_desktop_config.json' : '~/.config/Claude/claude_desktop_config.json'}
                </span>
                <button type="button" onClick={() => copyToClipboard(selectedOs === 'windows' ? '%APPDATA%\\Claude\\claude_desktop_config.json' : selectedOs === 'mac' ? '~/Library/Application Support/Claude/claude_desktop_config.json' : '~/.config/Claude/claude_desktop_config.json', setCopiedPath)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-[11px] font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer">
                  {copiedPath ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy Path</span>
                </button>
              </div>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>Configuration Snippet:</span>
                <button onClick={() => copyToClipboard(configJsonString, setCopiedConfig)}
                  className="px-3 py-1.5 rounded-lg bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-xs font-sora font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer">
                  {copiedConfig ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy JSON</span>
                </button>
              </div>
              <div className="rounded-xl overflow-hidden border border-[#262636] bg-[#0B0B12]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0F0F18] border-b border-[#262636]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]/80" />
                  </div>
                  <span className="text-[10px] font-mono text-[#6B6B80] tracking-wide">claude_desktop_config.json</span>
                  <span className="w-12" />
                </div>
                <pre className="p-4 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed select-all">{configJsonString}</pre>
              </div>
            </div>
          </div>
        </div>

        {/* Right onboarding panel */}
        <div className="lg:col-span-4 space-y-6">
          <OnboardingPanel isLocal={isLocal} status={status?.status || 'Not Connected'} />
        </div>
      </div>

      {/* Key rotation confirm modal */}
      {confirmRegen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setConfirmRegen(false)}>
          <div className="bg-[#12121A]/95 border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 max-w-sm w-full space-y-4 backdrop-blur-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2.5 text-[#F43F5E]">
              <AlertTriangle size={18} />
              <h4 className="font-semibold font-sora text-sm text-white">Rotate Access Token?</h4>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
              This revokes your existing token and writes a fresh one to your Claude Desktop config. Existing active sessions will need to re-authenticate.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setConfirmRegen(false)} className="px-4 py-2 rounded-xl bg-[#1A1A26] hover:bg-[#252535] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sora">Cancel</button>
              <button onClick={handleRegenerate} disabled={regenerating}
                className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] cursor-pointer border-none disabled:opacity-50">
                {regenerating ? 'Rotating...' : 'Rotate Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Installer / Connection Pipeline Modal */}
      {installerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl rounded-2xl border border-white/[0.12] bg-[#12121A]/95 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden flex flex-col space-y-6 text-slate-100" style={{ minHeight: '460px' }}>

            {/* Header */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#262636]">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8] shrink-0">
                <Terminal size={18} className="animate-pulse text-[#818CF8]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold font-sora text-white tracking-tight">Claude Desktop Integration Pipeline</h3>
                <p className="text-xs text-[#94A3B8] font-sans">Automating local config file writing and process initialization</p>
              </div>
            </div>

            {/* Installing state */}
            {installerStatus === 'installing' && (
              <div className="space-y-5 py-1 flex-1 flex flex-col justify-between">
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { id: 'detect', title: 'Detect Installation Context', desc: 'Scan environment paths and settings' },
                    { id: 'backup', title: 'Create Configuration Backup', desc: 'Preserves existing settings safely' },
                    { id: 'key', title: 'Resolve Access Credentials', desc: 'Link API keys for direct MCP proxy auth' },
                    { id: 'terminate', title: 'Shut Down Running Claude Instances', desc: 'Gracefully close current active processes' },
                    { id: 'merge', title: 'Integrate AgentMark Config Block', desc: 'Atomic merge without overwriting parameters' },
                    { id: 'relaunch', title: 'Relaunch Claude Desktop', desc: 'Rerun application to boot MCP servers' },
                  ].map((step, idx) => {
                    const state = stepStates[step.id];
                    return (
                      <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${state === 'pending' ? 'bg-[#6366F1]/10 border-[#6366F1]/40' : state === 'success' ? 'bg-emerald-500/10 border-emerald-500/20' : state === 'failed' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-[#0B0B12] border-[#262636] opacity-60'}`}>
                        <div className="shrink-0 flex items-center justify-center">
                          {state === 'success' && <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-xs">✓</div>}
                          {state === 'failed' && <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 font-bold text-xs">!</div>}
                          {state === 'pending' && <div className="w-5 h-5 rounded-full bg-[#6366F1]/20 border border-[#818CF8]/40 flex items-center justify-center text-[#818CF8]"><RefreshCw size={12} className="animate-spin" /></div>}
                          {state === 'idle' && <div className="w-5 h-5 rounded-full border border-[#262636] bg-[#111118] flex items-center justify-center text-[#94A3B8] font-mono text-[10px]">{idx + 1}</div>}
                        </div>
                        <div className="flex-1 min-w-0 font-sans">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-semibold font-sora ${state === 'idle' ? 'text-[#94A3B8]' : state === 'pending' ? 'text-[#818CF8]' : 'text-white'}`}>{step.title}</h4>
                            {state === 'pending' && <span className="text-[10px] font-mono font-medium text-[#818CF8] uppercase tracking-wider">In Progress</span>}
                            {state === 'success' && <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Done</span>}
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#818CF8]">
                    <span className="uppercase tracking-wider font-bold text-[10px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-ping" />
                      Real-Time Process Output
                    </span>
                  </div>
                  <div className="h-28 bg-[#0B0B12] border border-[#262636] rounded-xl p-3 font-mono text-[11px] text-slate-200 overflow-y-auto leading-relaxed space-y-1.5 shadow-inner"
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}>
                    {installLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#818CF8] select-none font-bold">❯</span>
                        <span className="text-slate-200 font-mono">{log}</span>
                      </div>
                    ))}
                    {installLogs.length === 0 && <div className="text-[#94A3B8] italic">Initializing installation pipeline...</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Waiting for handshake state — honest, not fake success */}
            {installerStatus === 'waiting' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-8">
                {status?.state === 'CONNECTED' ? (
                  // Real connection achieved
                  <>
                    <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-lg">
                      <CheckCircle2 size={28} />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-lg font-semibold font-sora text-white">Claude Desktop Connected</h3>
                      <p className="text-xs text-[#94A3B8] font-sans max-w-md leading-relaxed mx-auto">
                        {`${status.registeredToolCount} AgentMark tools discovered and verified. MCP handshake complete.`}
                      </p>
                      {status.clientInfo?.name && (
                        <p className="text-[10px] font-mono text-emerald-400">
                          Client: {status.clientInfo.name} {status.clientInfo.version}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setInstallerOpen(false)}
                      className="px-6 py-2.5 bg-[#6366F1] hover:bg-[#5254D8] text-white rounded-xl text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] cursor-pointer border-none"
                      id="start-using-integration-btn"
                    >
                      Start Using Integration
                    </button>
                  </>
                ) : (
                  // Waiting for Claude to initialize
                  <>
                    <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shadow-lg">
                      <Loader2 size={28} className="animate-spin text-amber-400" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-semibold font-sora text-white">
                        {currentState === 'HANDSHAKE_VERIFIED' ? 'Handshake Verified — Waiting for Tools' : currentState === 'TOOLS_DISCOVERED' ? 'Tools Discovered — Finalizing' : 'Waiting for Claude Desktop'}
                      </h3>
                      <p className="text-xs text-[#94A3B8] font-sans max-w-md leading-relaxed mx-auto">
                        {meta.message}
                      </p>
                    </div>
                    {/* Progress indicators */}
                    <div className="flex items-center gap-6 text-xs font-mono">
                      {[
                        { label: 'Config', done: isConfigured },
                        { label: 'Initialize', done: status?.initializeReceived },
                        { label: 'Tools', done: status?.toolsListRequested },
                        { label: 'Connected', done: isConnected },
                      ].map(({ label, done }) => (
                        <div key={label} className="flex flex-col items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${done ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                          <span className={done ? 'text-emerald-400' : 'text-[#94A3B8]'}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2.5 pt-2">
                      <button onClick={() => setInstallerOpen(false)}
                        className="px-4 py-2 rounded-xl bg-[#1A1A26] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sora">
                        Dismiss
                      </button>
                      <button onClick={handleVerify} disabled={verifying}
                        className="px-4 py-2 rounded-xl bg-[#6366F1]/20 border border-[#6366F1]/30 hover:bg-[#6366F1]/30 text-[#818CF8] text-xs font-semibold font-sora transition-all flex items-center gap-2 cursor-pointer border-solid disabled:opacity-50">
                        <Activity size={12} className={verifying ? 'animate-spin' : ''} />
                        <span>Run Diagnostic</span>
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-[#94A3B8]">
                      Polling every 5 seconds • Badge updates automatically
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Failed state */}
            {installerStatus === 'failed' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-6">
                <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-semibold font-sora text-rose-400">Connection Pipeline Failed</h3>
                  <p className="text-xs text-[#94A3B8] font-sans max-w-md leading-relaxed mx-auto">
                    {installerError || 'An error occurred during onboarding configuration.'}
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button onClick={() => setInstallerOpen(false)} className="px-4 py-2 rounded-xl bg-[#1A1A26] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sora">Cancel</button>
                  <button onClick={handleConnect} className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 cursor-pointer border-none">
                    <RefreshCw size={13} />
                    <span>Retry Setup</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Integrations;
