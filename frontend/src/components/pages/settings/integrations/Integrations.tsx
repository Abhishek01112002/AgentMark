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
    <div className="space-y-6 max-w-6xl font-sans text-slate-200">
      
      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left main controls column */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Cloud vs Local Environment Notice */}
          {!isLocal && (
            <div className="flex items-start gap-3.5 p-5 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-indigo-200 shadow-lg backdrop-blur-xl">
              <Cloud size={18} className="shrink-0 text-[#818CF8] mt-0.5" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold font-sora text-white text-xs">Hosted Cloud Environment Detected</span>
                  <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300">
                    Manual Setup Required
                  </span>
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
          )}

          {/* Dynamic Alert Banner */}
          {showRestartAlert ? (
            <div className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xs text-[#FCD34D] shadow-lg backdrop-blur-xl">
              <div className="flex gap-3">
                <Info size={16} className="shrink-0 text-[#F59E0B] mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold font-sora text-white text-xs">Action Required: Relaunch Claude Desktop</p>
                  <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                    Claude Desktop loads MCP configuration changes on startup. Please quit Claude completely from your OS tray/menu bar, then restart it to activate AgentMark.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowRestartAlert(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors border-none bg-transparent cursor-pointer"
                title="Dismiss notice"
              >
                <X size={14} />
              </button>
            </div>
          ) : status?.status === 'Configuration Outdated' ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-xs text-[#FCD34D] shadow-lg backdrop-blur-xl">
              <AlertTriangle size={16} className="shrink-0 text-[#F59E0B] mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold font-sora text-white text-xs">Configuration Outdated</p>
                <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                  {status.error || 'The local MCP launcher command or server endpoint URL is outdated. Click "Connect Claude Desktop" to update.'}
                </p>
              </div>
            </div>
          ) : status?.status === 'Configuration Error' ? (
            <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-xs text-[#FDA4AF] shadow-lg backdrop-blur-xl">
              <AlertCircle size={16} className="shrink-0 text-[#F43F5E] mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold font-sora text-white text-xs">Configuration Error</p>
                <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                  {status.error || 'The configured API key is missing or revoked. Click "Connect Claude Desktop" to re-authenticate.'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Main Info Card (Apple Pro Glassmorphic Card) */}
          <div className="p-6 sm:p-7 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] to-transparent opacity-60" />
            
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
                  <button
                    onClick={handlePing}
                    disabled={pinging}
                    className="px-3.5 py-1.5 text-xs font-mono font-semibold rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#202030] text-[#818CF8] hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    <Activity size={13} className={pinging ? 'animate-spin text-[#818CF8]' : 'text-[#818CF8]'} />
                    <span>{pinging ? 'Verifying...' : 'Verify Live Ping'}</span>
                  </button>

                  {/* Status Badge */}
                  {status?.isLiveConnected ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-bold tracking-wider">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span>CONNECTED</span>
                    </div>
                  ) : status?.status === 'Connected' ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-300 text-[10px] font-mono font-bold tracking-wider">
                      <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                      <span>STANDBY</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[10px] font-mono font-bold tracking-wider">
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
                  <span className="text-[10px] font-mono text-[#94A3B8] flex items-center gap-1.5">
                    <ShieldCheck size={11} className="text-amber-400" />
                    Standby mode • Config verified • Last activity: {new Date(status.lastActiveAt).toLocaleTimeString()}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[#94A3B8]">
                    Standby mode • Config verified • Awaiting client prompt
                  </span>
                )}
              </div>
            </div>

            {/* Path and Key Metadata Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium font-sans text-[#94A3B8] uppercase tracking-wider">
                  Configuration File Location
                </span>
                <div className="bg-[#0B0B12] border border-[#262636] rounded-xl px-3.5 py-2 font-mono text-xs text-slate-200 select-all truncate">
                  {status?.path || 'N/A'}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-medium font-sans text-[#94A3B8] uppercase tracking-wider">
                  Active Access Token
                </span>
                <div className="bg-[#0B0B12] border border-[#262636] rounded-xl px-3.5 py-2 font-mono text-xs text-slate-200 flex items-center justify-between gap-2">
                  <code className="truncate">{status?.maskedKey || 'No token active'}</code>
                  {status?.maskedKey && (
                    <button
                      onClick={() => setConfirmRegen(true)}
                      className="px-2.5 py-1 rounded-lg bg-[#1A1A26] hover:bg-[#252535] border border-white/10 text-[10px] font-semibold text-slate-300 hover:text-white transition-colors border-none cursor-pointer font-sora shrink-0"
                    >
                      Rotate
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error alerts */}
            {status?.error && (
              <div className="flex gap-3 p-3.5 rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 text-xs text-[#FDA4AF]">
                <AlertTriangle size={15} className="shrink-0 text-[#F43F5E] mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold font-sora text-white text-xs">Config Error</p>
                  <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">{status.error}</p>
                </div>
              </div>
            )}

            {/* Action footer */}
            <div className="border-t border-[#262636] pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h4 className="font-semibold font-sora text-xs text-white">
                  {isLocal ? 'Configure Integration' : 'Download Settings'}
                </h4>
                <p className="text-xs text-[#94A3B8] font-sans">
                  {isLocal
                    ? 'Write connections directly to your desktop folders.'
                    : 'Download the configuration file and place it in the Claude folders.'}
                </p>
              </div>

              {isLocal ? (
                <div className="flex items-center gap-2 shrink-0">
                  {(status?.status === 'Connected' || status?.status === 'Configuration Outdated') && (
                    <button
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                      className="px-4 py-2 rounded-xl bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 border border-[#F43F5E]/20 text-[#F43F5E] text-xs font-semibold font-sora transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {disconnecting ? <RefreshCw size={12} className="animate-spin" /> : <span className="font-bold">×</span>}
                      <span>Disconnect</span>
                    </button>
                  )}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border-none disabled:opacity-50"
                  >
                    {connecting ? <RefreshCw size={12} className="animate-spin" /> : <Terminal size={12} />}
                    <span>{status?.status === 'Connected' || status?.status === 'Configuration Outdated' ? 'Reconnect' : 'Connect Claude Desktop'}</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={downloadConfigFile}
                  className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] flex items-center gap-1.5 cursor-pointer border-none"
                >
                  <FileDown size={12} />
                  <span>Download Config File</span>
                </button>
              )}
            </div>

          </div>

          {/* Newly Generated API key show block */}
          {newlyGeneratedKey && (
            <div className="p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 space-y-3 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-2 text-emerald-400 font-sora font-semibold text-xs">
                <Info size={14} />
                <span>Plaintext API Key Copy</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
                Copy this API key now. It is hashed securely in the database and **cannot be retrieved again** after you leave this page.
              </p>
              <div className="flex items-center gap-3">
                <code className="block flex-1 bg-[#0B0B12] border border-[#262636] px-3.5 py-2 rounded-xl font-mono text-xs text-emerald-400 select-all truncate">
                  {newlyGeneratedKey}
                </code>
                <button
                  onClick={() => copyToClipboard(newlyGeneratedKey, setCopiedKey)}
                  className="px-3.5 py-2 rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer font-sora"
                >
                  {copiedKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy Key</span>
                </button>
              </div>
            </div>
          )}

          {/* Interactive DX OS & Client Config Helper Box */}
          <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            
            {/* Header with Client Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#262636] pb-3 gap-3">
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  OS Path & Config Guidance
                </h4>
                <p className="text-xs text-[#94A3B8] font-sans">
                  Select your OS to get exact file paths & formatted JSON for Claude Desktop
                </p>
              </div>
            </div>

            {/* OS Path Guidance Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#94A3B8]">
                  Target Config Directory (Claude Desktop):
                </span>
                
                {/* OS Selector Pills */}
                <div className="flex items-center gap-1 bg-[#0D0D14] border border-[#262636] p-1 rounded-full">
                  {(['windows', 'mac', 'linux'] as const).map((osKey) => (
                    <button
                      key={osKey}
                      type="button"
                      onClick={() => setSelectedOs(osKey)}
                      className={`px-3 py-1 text-[10px] font-mono rounded-full uppercase font-bold transition-all cursor-pointer border-none ${
                        selectedOs === osKey
                          ? 'bg-[#6366F1] text-white shadow-sm'
                          : 'text-[#94A3B8] hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      {osKey === 'mac' ? 'macOS' : osKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Copyable Path Row */}
              <div className="flex items-center gap-2 bg-[#0B0B12] border border-[#262636] px-3.5 py-2.5 rounded-xl font-mono text-xs text-slate-200">
                <span className="truncate flex-1 select-all text-[#818CF8]">
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
                  className="px-3 py-1.5 rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-[11px] font-mono text-white flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  {copiedPath ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy Path</span>
                </button>
              </div>
            </div>

            {/* Code Block with Copy JSON Button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#94A3B8]">
                <span>Configuration Snippet:</span>
                <button
                  onClick={() => copyToClipboard(configJsonString, setCopiedConfig)}
                  className="px-3 py-1.5 rounded-xl bg-[#1A1A26] border border-white/10 hover:bg-[#252535] text-xs font-sora font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedConfig ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>Copy JSON</span>
                </button>
              </div>
              
              <div className="rounded-xl overflow-hidden border border-[#262636] bg-[#0B0B12]">
                <pre className="p-4 text-[11px] font-mono text-[#E2E8F0] overflow-x-auto leading-relaxed select-all">
                  {configJsonString}
                </pre>
              </div>
            </div>

          </div>

        </div>

        {/* Right side onboarding panel */}
        <div className="lg:col-span-4 space-y-6">
          <OnboardingPanel isLocal={isLocal} status={status?.status || 'Not Connected'} />
        </div>

      </div>

      {/* Confirmation Modal for key regeneration */}
      {confirmRegen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setConfirmRegen(false)}
        >
          <div
            className="bg-[#12121A]/95 border border-white/[0.12] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] p-6 max-w-sm w-full space-y-4 backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-[#F43F5E]">
              <AlertTriangle size={18} />
              <h4 className="font-semibold font-sora text-sm text-white">
                Rotate Access Token?
              </h4>
            </div>
            <p className="text-xs text-[#94A3B8] font-sans leading-relaxed">
              This action revokes your existing token and writes a fresh token to your Claude Desktop config file. Existing active sessions will need to re-authenticate.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRegen(false)}
                className="px-4 py-2 rounded-xl bg-[#1A1A26] hover:bg-[#252535] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sora"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerate}
                disabled={regenerating}
                className="px-4 py-2 rounded-xl bg-[#F43F5E] hover:bg-[#E11D48] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] cursor-pointer border-none disabled:opacity-50"
              >
                {regenerating ? 'Rotating...' : 'Rotate Token'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vercel-Level One-Click Onboarding Installer Modal */}
      {/* Installer Progress Modal */}
      {installerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div 
            className="w-full max-w-xl rounded-2xl border border-white/[0.12] bg-[#12121A]/95 p-7 shadow-[0_25px_60px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden flex flex-col space-y-6 text-slate-100"
            style={{ minHeight: '460px' }}
          >
            {/* Header Area */}
            <div className="flex items-center gap-3.5 pb-4 border-b border-[#262636]">
              <div className="w-10 h-10 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8] shrink-0">
                <Terminal size={18} className="animate-pulse text-[#818CF8]" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-semibold font-sora text-white tracking-tight">Claude Desktop Integration Pipeline</h3>
                <p className="text-xs text-[#94A3B8] font-sans">Automating local config file writing and process initialization</p>
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
                            ? 'bg-[#6366F1]/10 border-[#6366F1]/40'
                            : state === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20'
                            : state === 'failed'
                            ? 'bg-rose-500/10 border-rose-500/20'
                            : 'bg-[#0B0B12] border-[#262636] opacity-60'
                        }`}
                      >
                        <div className="shrink-0 flex items-center justify-center">
                          {state === 'success' && (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 font-bold text-xs">
                              ✓
                            </div>
                          )}
                          {state === 'failed' && (
                            <div className="w-5 h-5 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-400 font-bold text-xs">
                              !
                            </div>
                          )}
                          {state === 'pending' && (
                            <div className="w-5 h-5 rounded-full bg-[#6366F1]/20 border border-[#818CF8]/40 flex items-center justify-center text-[#818CF8]">
                              <RefreshCw size={12} className="animate-spin" />
                            </div>
                          )}
                          {state === 'idle' && (
                            <div className="w-5 h-5 rounded-full border border-[#262636] bg-[#111118] flex items-center justify-center text-[#94A3B8] font-mono text-[10px]">
                              {idx + 1}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 font-sans">
                          <div className="flex items-center justify-between">
                            <h4 className={`text-xs font-semibold font-sora ${
                              state === 'idle' ? 'text-[#94A3B8]' : state === 'pending' ? 'text-[#818CF8]' : 'text-white'
                            }`}>
                              {step.title}
                            </h4>
                            {state === 'pending' && (
                              <span className="text-[10px] font-mono font-medium text-[#818CF8] uppercase tracking-wider">In Progress</span>
                            )}
                            {state === 'success' && (
                              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Done</span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-snug">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Real-Time Terminal Log Box */}
                <div className="space-y-2 mt-2">
                  <div className="flex items-center justify-between text-xs font-mono text-[#818CF8]">
                    <span className="uppercase tracking-wider font-bold text-[10px] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-ping" />
                      Real-Time Process Output
                    </span>
                  </div>
                  <div 
                    className="h-28 bg-[#0B0B12] border border-[#262636] rounded-xl p-3 font-mono text-[11px] text-slate-200 overflow-y-auto leading-relaxed space-y-1.5 shadow-inner"
                    ref={(el) => { if (el) el.scrollTop = el.scrollHeight; }}
                  >
                    {installLogs.map((log, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-[#818CF8] select-none font-bold">❯</span>
                        <span className="text-slate-200 font-mono">{log}</span>
                      </div>
                    ))}
                    {installLogs.length === 0 && (
                      <div className="text-[#94A3B8] italic">Initializing installation pipeline...</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {installerStatus === 'success' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-5 py-8">
                <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold text-2xl shadow-lg">
                  ✓
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-lg font-semibold font-sora text-white">AgentMark Configured Successfully</h3>
                  <p className="text-xs text-[#94A3B8] font-sans max-w-md leading-relaxed mx-auto">
                    Claude Desktop has been restarted with the AgentMark MCP integration active. You can now execute natural language marketing commands directly in Claude.
                  </p>
                </div>

                <button
                  onClick={() => setInstallerOpen(false)}
                  className="px-6 py-2.5 bg-[#6366F1] hover:bg-[#5254D8] text-white rounded-xl text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] cursor-pointer border-none"
                >
                  Start Using Integration
                </button>
              </div>
            )}

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
                  <button
                    onClick={() => setInstallerOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[#1A1A26] border border-white/10 text-xs font-semibold text-white transition-all cursor-pointer font-sora"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] flex items-center gap-2 cursor-pointer border-none"
                  >
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
