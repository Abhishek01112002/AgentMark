import React, { useState, useEffect, useCallback } from 'react';
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
  Cloud
} from 'lucide-react';
import api from '../../../../services/api';
import toast from 'react-hot-toast';
import { OnboardingPanel } from './OnboardingPanel';

interface ClaudeStatusData {
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';
  liveStatus?: 'Active (Connected)' | 'Configured (Idle)' | 'Disconnected' | 'Configuration Error';
  isLiveConnected?: boolean;
  lastActiveAt?: string | null;
  mcpStatus: 'Running' | 'Stopped';
  path: string;
  maskedKey: string | null;
  error?: string;
}

export const Integrations: React.FC = () => {
  const [status, setStatus] = useState<ClaudeStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [pinging, setPinging] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [showRestartAlert, setShowRestartAlert] = useState(false);

  const [newlyGeneratedKey, setNewlyGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);
  const [selectedOs, setSelectedOs] = useState<'windows' | 'mac' | 'linux'>('windows');

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handlePing = async () => {
    if (pinging) return;
    setPinging(true);
    try {
      const res = await api.post('/developer/claude-ping');
      if (res.data.isLiveConnected) {
        toast.success(res.data.message || 'Live MCP heartbeat verified! Tool calls actively processing.');
      } else {
        toast(res.data.message || 'Configured on disk. Awaiting first tool command from Claude Desktop.');
      }
      await fetchStatus();
    } catch (err: any) {
      toast.error('Failed to verify live connection');
    } finally {
      setPinging(false);
    }
  };

  const fetchStatus = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await api.get('/developer/claude-status', { signal });
      setStatus(res.data);
    } catch (err: any) {
      if (err.name !== 'CanceledError' && err.code !== 'ERR_CANCELED') {
        console.error('[Integrations] Failed to fetch Claude connection status:', err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchStatus(abortController.signal);
    return () => abortController.abort();
  }, [fetchStatus]);

  const [installerOpen, setInstallerOpen] = useState(false);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installerStatus, setInstallerStatus] = useState<'installing' | 'success' | 'failed'>('installing');
  const [installerError, setInstallerError] = useState<string | null>(null);
  
  const [stepStates, setStepStates] = useState<Record<string, 'idle' | 'pending' | 'success' | 'failed'>>({
    detect: 'idle',
    backup: 'idle',
    key: 'idle',
    terminate: 'idle',
    merge: 'idle',
    relaunch: 'idle',
  });

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    setNewlyGeneratedKey(null);
    setShowRestartAlert(false);
    setInstallerOpen(true);
    setInstallerStatus('installing');
    setInstallerError(null);
    setInstallLogs([]);
    setStepStates({
      detect: 'idle',
      backup: 'idle',
      key: 'idle',
      terminate: 'idle',
      merge: 'idle',
      relaunch: 'idle',
    });

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5003';
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/developer/claude-connect-flow`, {
        headers: {
          'Authorization': `Bearer ${token || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('ReadableStream not supported by browser.');
      }

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
              const { step, status, message } = eventData;

              if (step) {
                setStepStates((prev) => ({
                  ...prev,
                  [step]: status,
                }));
              }

              if (message) {
                const logPrefix = status === 'success' ? '[✓]' : status === 'failed' ? '[❌]' : '[~]';
                setInstallLogs((prev) => [...prev, `${logPrefix} ${message}`]);
              }

              if (status === 'failed') {
                setInstallerStatus('failed');
                setInstallerError(message || 'Onboarding installation failed.');
              }

              if (step === 'complete' && status === 'success') {
                setTimeout(async () => {
                  setInstallerStatus('success');
                  setShowRestartAlert(false);
                  toast.success('AgentMark connected successfully!');
                  await fetchStatus();
                }, 1200);
              }
            } catch (jsonErr) {
              // ignore malformed chunks
            }
          }
        }
      }
    } catch (err: any) {
      setInstallerStatus('failed');
      setInstallerError(err.message || 'Failed to establish connection to the backend installer.');
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
      const data = res.data;
      if (data.success) {
        toast.success(data.message || 'Disconnected successfully!');
        setNewlyGeneratedKey(null);
        setShowRestartAlert(true);
        await fetchStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to disconnect Claude Desktop';
      toast.error(msg);
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
      const data = res.data;
      if (data.success) {
        toast.success('API Key rotated successfully!');
        if (data.key) {
          setNewlyGeneratedKey(data.key);
        }
        setConfirmRegen(false);
        setShowRestartAlert(true);
        await fetchStatus();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to rotate key';
      toast.error(msg);
    } finally {
      setRegenerating(false);
    }
  };

  const configJsonString = JSON.stringify({
    mcpServers: {
      agentmark: {
        command: "uvx",
        args: ["agentmark-mcp-server"],
        env: {
          AGENTMARK_API_URL: 'http://localhost:5003',
          AGENTMARK_API_KEY: newlyGeneratedKey || (status?.maskedKey ? "PASTE_YOUR_API_KEY_HERE" : "GENERATING...")
        }
      }
    }
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
    a.href = url;
    a.download = 'claude_desktop_config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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



  return (
    <div className="space-y-6 max-w-6xl text-sm" style={{ color: '#F1F1F3', fontFamily: 'Sora, sans-serif' }}>
      
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left main controls column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Cloud vs Local Environment Notice */}
          {!isLocal && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200 shadow-md">
              <Info size={18} className="shrink-0 text-indigo-400 mt-0.5" />
              <div className="space-y-1.5">
                <p className="font-bold text-white flex items-center gap-2">
                  <Cloud size={15} className="shrink-0 text-indigo-400" />
                  <span>Hosted Cloud Environment Detected</span>
                  <span className="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                    Manual Local Setup Required
                  </span>
                </p>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  Cloud hosted instances running on remote servers cannot access your local computer's filesystem. To connect Claude Desktop or Cursor on your laptop to this AgentMark instance:
                </p>
                <ol className="list-decimal list-inside text-[11px] space-y-1 text-zinc-300 font-mono">
                  <li>Click <strong className="text-white">"Download Settings"</strong> or <strong className="text-white">"Copy Config JSON"</strong> below.</li>
                  <li>Save the file to your local Claude folder: <code className="text-indigo-300">%APPDATA%\Claude\claude_desktop_config.json</code> (Win) or <code className="text-indigo-300">~/Library/Application Support/Claude/claude_desktop_config.json</code> (Mac).</li>
                  <li>Completely quit and restart Claude Desktop.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Dynamic Situation-based Alert Banner */}
          {showRestartAlert ? (
            <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 text-xs text-[#ffc875]">
              <div className="flex gap-2.5">
                <Info size={16} className="shrink-0 text-[#F59E0B] mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-white">Action Required: Relaunch Claude</p>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    Claude Desktop loads MCP configuration changes on startup. Please close Claude completely from your taskbar or tray icon, then restart the application to apply AgentMark tools.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestartAlert(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss notice"
                style={{ cursor: 'pointer', border: 'none', background: 'none' }}
              >
                <X size={14} />
              </button>
            </div>
          ) : status?.status === 'Configuration Outdated' ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 text-xs text-[#ffc875]">
              <AlertTriangle size={16} className="shrink-0 text-[#F59E0B] mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-white">Configuration Outdated</p>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  {status.error || 'The local MCP launcher command or server endpoint URL is outdated. Click "Connect Claude Desktop" to update your settings.'}
                </p>
              </div>
            </div>
          ) : status?.status === 'Configuration Error' ? (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs text-rose-300">
              <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-semibold text-white">Configuration Error</p>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  {status.error || 'The configured API key is missing or revoked. Click "Connect Claude Desktop" to re-authenticate.'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Main Info Card */}
          <div className="p-6 rounded-xl space-y-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)] relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(17,17,24,1) 0%, rgba(12,12,18,0.95) 100%)', border: '1px solid #2A2A38' }}>
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] to-transparent opacity-60" />
            
            <div className="flex items-start justify-between border-b border-[#2A2A38]/40 pb-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-primary">
                  Claude Desktop MCP Configuration
                </h3>
                <p className="text-xs text-text-secondary" style={{ color: '#8B8B9E' }}>
                  Enable Claude Desktop to run commands and access project metrics locally.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-[#181824] border border-[#2E2E42] hover:bg-[#202030] hover:border-indigo-500/60 text-indigo-300 transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <Activity size={13} className={pinging ? 'animate-spin text-indigo-400' : 'text-indigo-400'} />
                    {pinging ? 'Verifying...' : 'Verify Live Ping'}
                  </button>

                  {/* World-Class SaaS Status Badge */}
                  {status?.isLiveConnected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>CONNECTED</span>
                    </div>
                  ) : status?.status === 'Connected' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono font-bold tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.15)]" title="Config file is valid. Waiting for Claude tool request or restart.">
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                      <span>STANDBY</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-mono font-bold tracking-wide">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                      <span>OFFLINE</span>
                    </div>
                  )}
                </div>

                {status?.isLiveConnected ? (
                  <span className="text-[10px] font-mono text-emerald-400/90 flex items-center gap-1.5">
                    <ShieldCheck size={11} className="text-emerald-400" />
                    Live telemetry stream active • Ping verified at {new Date(status.lastActiveAt!).toLocaleTimeString()}
                  </span>
                ) : status?.lastActiveAt ? (
                  <span className="text-[10px] font-mono text-[#8B8B9E] flex items-center gap-1.5">
                    <ShieldCheck size={11} className="text-amber-400" />
                    Standby mode • Config verified • Last activity: {new Date(status.lastActiveAt).toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[#8B8B9E]">
                    Standby mode • Config verified • Awaiting client prompt
                  </span>
                )}
              </div>
            </div>

            {/* Path and Key Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-text-muted" style={{ color: '#A0A0D2', fontFamily: 'JetBrains Mono, monospace' }}>
                  Configuration File Location
                </span>
                <div className="flex items-center gap-2 rounded-lg font-mono text-[11px] overflow-hidden select-all" style={{ background: 'linear-gradient(135deg, rgba(14,14,19,0.9), rgba(10,10,15,0.7))', border: '1px solid rgba(42,42,56,0.5)', padding: '8px 12px' }}>
                  <span className="truncate flex-1" style={{ color: '#E2E8F0' }}>{status?.path || 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: '#A0A0D2', fontFamily: 'JetBrains Mono, monospace' }}>
                  Active Access Token
                </span>
                <div className="flex items-center justify-between rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(14,14,19,0.9), rgba(10,10,15,0.7))', border: '1px solid rgba(42,42,56,0.5)', padding: '6px 12px' }}>
                  <code className="font-mono text-[11px] text-[#E2E8F0]">
                    {status?.maskedKey || 'No token active'}
                  </code>
                  {status?.maskedKey && (
                    <button
                      onClick={() => setConfirmRegen(true)}
                      className="px-2 py-1 border border-[#2A2A38] bg-[#1B1B25] hover:bg-[#252535] rounded-md text-[10px] font-semibold transition-all hover:text-red-400"
                      style={{ color: '#F1F1F3', cursor: 'pointer' }}
                    >
                      Rotate
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Error alerts */}
            {status?.error && (
              <div className="flex gap-2.5 p-3 rounded-lg border border-[#EF4444]/20 bg-[#EF4444]/5 text-xs text-red-200">
                <AlertTriangle size={15} className="shrink-0 text-[#EF4444] mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-[#EF4444]">Config Error</p>
                  <p className="text-[11px] leading-relaxed text-text-secondary" style={{ color: '#8B8B9E' }}>
                    {status.error}
                  </p>
                </div>
              </div>
            )}

            {/* Action footer */}
            <div className="border-t border-[#2A2A38]/40 pt-4 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="font-semibold text-xs text-text-primary">
                  {isLocal ? 'Configure Integration' : 'Download Settings'}
                </h4>
                <p className="text-[11px] text-text-secondary" style={{ color: '#8B8B9E' }}>
                  {isLocal
                    ? 'Write connections directly to your desktop folders.'
                    : 'Download the configuration file and place it in the Claude folders.'}
                </p>
              </div>

              {isLocal ? (
                <div className="flex items-center gap-2">
                  {(status?.status === 'Connected' || status?.status === 'Configuration Outdated') && (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-3.5 py-2 border border-red-500/25 bg-red-950/10 hover:bg-red-950/20 disabled:opacity-50 text-red-400 hover:text-red-300 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                      style={{ cursor: disconnecting ? 'not-allowed' : 'pointer' }}
                    >
                      {disconnecting ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        <span className="text-[14px] leading-[12px] font-bold">×</span>
                      )}
                      Disconnect
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-4 py-2 bg-[#6366F1] hover:bg-[#5053df] disabled:opacity-50 text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                    style={{ cursor: connecting ? 'not-allowed' : 'pointer', border: 'none' }}
                  >
                    {connecting ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Terminal size={12} />
                    )}
                    {status?.status === 'Connected' || status?.status === 'Configuration Outdated' ? 'Reconnect' : 'Connect Claude Desktop'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={downloadConfigFile}
                  className="px-4 py-2 bg-[#6366F1] hover:bg-[#5053df] text-white rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5"
                  style={{ cursor: 'pointer', border: 'none' }}
                >
                  <FileDown size={12} />
                  Download Config File
                </button>
              )}
            </div>

          </div>

          {/* Newly Generated API key show block */}
          {newlyGeneratedKey && (
            <div className="p-5 rounded-xl space-y-3 shadow-[0_4px_20px_rgba(16,185,129,0.1)]" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(16,185,129,0.02) 100%)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <div className="flex items-center gap-2 text-[#10B981]">
                <Info size={14} />
                <h4 className="font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  Plaintext API Key Copy
                </h4>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed" style={{ color: '#8B8B9E' }}>
                Copy this API key now. It is hashed securely in the database and **cannot be retrieved again** after you leave this page.
              </p>
              <div className="flex items-center gap-3">
                <code className="block flex-1 bg-[#0E0E13] border border-[#2A2A38] px-3 py-2 rounded-lg font-mono text-[11px] text-[#10B981] select-all truncate">
                  {newlyGeneratedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyGeneratedKey, setCopiedKey)}
                  className="px-3 py-2 border border-[#2A2A38] bg-[#1B1B25] hover:bg-[#252535] rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={{ color: '#F1F1F3', cursor: 'pointer' }}
                >
                  {copiedKey ? <Check size={12} className="text-[#10B981]" /> : <Copy size={12} />}
                  Copy Key
                </button>
              </div>
            </div>
          )}

          {/* Interactive DX OS & Client Config Helper Box */}
          <div className="p-6 rounded-xl space-y-4 shadow-[0_8px_40px_rgba(0,0,0,0.2)]" style={{ background: 'linear-gradient(180deg, rgba(17,17,24,1) 0%, rgba(14,14,20,0.95) 100%)', border: '1px solid #2A2A38' }}>
            
            {/* Header with Client Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#2A2A38]/40 pb-3 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  OS Path & Config Guidance
                </h4>
                <p className="text-[11px] text-[#8B8B9E] mt-0.5">
                  Select your OS to get exact file paths & formatted JSON for Claude Desktop.
                </p>
              </div>
            </div>

            {/* OS Path Guidance Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400">
                  Target Config Directory (Claude Desktop):
                </span>
                
                {/* OS Selector Pills */}
                <div className="flex items-center gap-1">
                  {(['windows', 'mac', 'linux'] as const).map((osKey) => (
                    <button
                      key={osKey}
                      type="button"
                      onClick={() => setSelectedOs(osKey)}
                      className={`px-2.5 py-0.5 text-[10px] font-mono rounded-full uppercase font-bold transition-all cursor-pointer ${
                        selectedOs === osKey
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                          : 'text-[#8B8B9E] hover:text-white'
                      }`}
                    >
                      {osKey === 'mac' ? 'macOS' : osKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copyable Path Row */}
              <div className="flex items-center gap-2 bg-[#0E0E13] border border-[#2A2A38] px-3 py-2 rounded-lg font-mono text-[11px] text-[#E2E8F0]">
                <span className="truncate flex-1 select-all text-indigo-300">
                  {selectedOs === 'windows'
                    ? '%APPDATA%\\Claude\\claude_desktop_config.json'
                    : selectedOs === 'mac'
                    ? '~/Library/Application Support/Claude/claude_desktop_config.json'
                    : '~/.config/Claude/claude_desktop_config.json'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const targetPath = selectedOs === 'windows'
                      ? '%APPDATA%\\Claude\\claude_desktop_config.json'
                      : selectedOs === 'mac'
                      ? '~/Library/Application Support/Claude/claude_desktop_config.json'
                      : '~/.config/Claude/claude_desktop_config.json';
                    copyToClipboard(targetPath, setCopiedPath);
                  }}
                  className="px-2.5 py-1 bg-[#1B1B25] hover:bg-[#252535] border border-[#2A2A38] rounded text-[10px] font-mono text-white flex items-center gap-1 transition-all cursor-pointer"
                >
                  {copiedPath ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                  Copy Path
                </button>
              </div>
            </div>

            {/* Code Block with Copy JSON Button */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>Configuration Snippet:</span>
                <button
                  onClick={() => copyToClipboard(configJsonString, setCopiedConfig)}
                  className="px-2.5 py-1 bg-[#1B1B25] hover:bg-[#252535] border border-[#2A2A38] rounded-md text-[10px] font-semibold transition-all flex items-center gap-1.5 text-white cursor-pointer"
                >
                  {copiedConfig ? <Check size={11} className="text-[#10B981]" /> : <Copy size={11} />}
                  Copy JSON
                </button>
              </div>
              
              <div className="rounded-lg overflow-hidden border border-[#2A2A38]/50 bg-[#0E0E13]">
                <pre className="p-4 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed select-all">
                  {configJsonString}
                </pre>
              </div>
            </div>

          </div>

        </div>

        {/* Right side onboarding panel */}
        <div className="space-y-6">
          <OnboardingPanel isLocal={isLocal} status={status?.status || 'Not Connected'} />
        </div>

      </div>

      {/* Confirmation Modal for key regeneration */}
      {confirmRegen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setConfirmRegen(false)}
        >
          <div
            className="bg-[#111118] border border-[#2A2A38] rounded-xl shadow-2xl p-5 max-w-sm w-full space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-[#EF4444]">
              <AlertTriangle size={18} />
              <h4 className="font-bold text-sm text-text-primary" style={{ fontFamily: 'Sora, sans-serif' }}>
                Rotate Integration Key?
              </h4>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed" style={{ color: '#8B8B9E' }}>
              This rotates your Claude Desktop API Key and writes the fresh token to the config file. Active connections using the old key will fail.
            </p>
            <div className="flex justify-end gap-2.5 pt-1">
              <button
                onClick={() => setConfirmRegen(false)}
                className="px-3.5 py-1.5 border border-[#2A2A38] rounded-md text-xs font-semibold hover:bg-[#1B1B25] transition-all"
                style={{ color: '#F1F1F3', cursor: 'pointer', backgroundColor: '#111118' }}
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-md text-xs font-semibold transition-all disabled:opacity-50"
                style={{ cursor: regenerating ? 'not-allowed' : 'pointer', border: 'none' }}
              >
                {regenerating ? 'Rotating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel-Level One-Click Onboarding Installer Modal */}
      {installerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl rounded-2xl border border-indigo-500/20 bg-[#0C0C14] p-7 shadow-[0_0_60px_rgba(99,102,241,0.18)] relative overflow-hidden flex flex-col space-y-6 text-slate-100"
            style={{ minHeight: '460px' }}
          >
            {/* Glowing Accent Ring */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-[1px]" />
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Area */}
            <div className="flex items-center gap-3.5 pb-2 border-b border-white/5">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/10 border border-indigo-500/30 flex items-center justify-center shadow-inner">
                <Terminal size={20} className="text-indigo-400 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-white tracking-tight">Claude Desktop Connection</h3>
                <p className="text-xs text-zinc-400 font-medium">Automating configuration and process initialization</p>
              </div>
            </div>

            {/* Main State Switcher */}
            {installerStatus === 'installing' && (
              <div className="space-y-5 py-1 flex-1 flex flex-col justify-between">
                {/* Step List Checkpoints */}
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
                      <div 
                        key={step.id} 
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                          state === 'pending'
                            ? 'bg-indigo-500/10 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.1)]'
                            : state === 'success'
                            ? 'bg-emerald-500/5 border-emerald-500/25'
                            : state === 'failed'
                            ? 'bg-rose-500/10 border-rose-500/30'
                            : 'bg-white/[0.02] border-white/5 opacity-60'
                        }`}
                      >
                        {/* Status Icon Indicator */}
                        <div className="shrink-0 flex items-center justify-center">
                          {state === 'success' && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-bold text-xs">
                              ✓
                            </div>
                          )}
                          {state === 'failed' && (
                            <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 font-bold text-xs">
                              !
                            </div>
                          )}
                          {state === 'pending' && (
                            <div className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                              <RefreshCw size={12} className="animate-spin" />
                            </div>
                          )}
                          {state === 'idle' && (
                            <div className="w-5 h-5 rounded-full border border-zinc-700 bg-zinc-900/50 flex items-center justify-center text-zinc-500 font-mono text-[10px]">
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-semibold tracking-wide ${
                              state === 'idle' ? 'text-zinc-400' : state === 'pending' ? 'text-indigo-200' : 'text-zinc-100'
                            }`}>
                              {step.title}
                            </h4>
                            {state === 'pending' && (
                              <span className="text-[10px] font-mono font-medium text-indigo-400 animate-pulse uppercase tracking-wider">In Progress</span>
                            )}
                            {state === 'success' && (
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Done</span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Real-Time Activity Terminal Logs */}
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 font-mono flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                      Real-Time Process Output
                    </span>
                  </div>
                  <div 
                    className="h-28 bg-[#050508] border border-indigo-500/20 rounded-xl p-3 font-mono text-[11px] text-zinc-200 overflow-y-auto leading-relaxed space-y-1.5 shadow-inner"
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                  >
                    {installLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-400 select-none font-bold">❯</span>
                        <span className="text-zinc-200 font-mono">{log}</span>
                      </div>
                    ))}
                    {installLogs.length === 0 && (
                      <div className="text-zinc-500 italic">Initializing installation pipeline...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {installerStatus === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
                {/* Glowing Success Ring */}
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-md animate-pulse" />
                  <span className="text-emerald-400 font-bold text-3xl select-none relative z-10">✓</span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">AgentMark Configured Successfully</h3>
                  <p className="text-xs text-zinc-300 max-w-md leading-relaxed mx-auto">
                    Claude Desktop has been restarted with the AgentMark MCP integration active. You can now use AI commands to query local metrics, projects, and focus groups directly.
                  </p>
                </div>

                <button
                  onClick={() => setInstallerOpen(false)}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all border-none"
                  style={{ cursor: 'pointer' }}
                >
                  Start Using AgentMark
                </button>
              </div>
            )}

            {installerStatus === 'failed' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6">
                {/* Red Error Icon */}
                <div className="w-16 h-16 rounded-full bg-rose-500/15 border border-rose-400/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(244,63,94,0.2)]">
                  <AlertTriangle size={28} className="text-rose-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-rose-400">Connection Failed</h3>
                  <p className="text-xs text-zinc-300 max-w-md leading-relaxed mx-auto">
                    {installerError || 'An error occurred during onboarding configuration.'}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setInstallerOpen(false)}
                    className="px-5 py-2.5 border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-xs font-semibold text-zinc-200 transition-all"
                    style={{ cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all border-none flex items-center gap-2 shadow-lg shadow-indigo-600/25"
                    style={{ cursor: 'pointer' }}
                  >
                    <RefreshCw size={14} />
                    Retry Setup
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
