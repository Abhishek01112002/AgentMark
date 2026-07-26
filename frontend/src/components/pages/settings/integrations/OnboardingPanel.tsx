import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Check, BookOpen, ShieldAlert } from 'lucide-react';

interface OnboardingPanelProps {
  isLocal: boolean;
  status: 'Connected' | 'Not Connected' | 'Configuration Outdated' | 'Configuration Error';
}

export const OnboardingPanel: React.FC<OnboardingPanelProps> = ({ isLocal, status }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showGuides, setShowGuides] = useState(status !== 'Connected');

  useEffect(() => {
    if (status !== 'Connected') {
      setShowGuides(true);
    }
  }, [status]);

  const steps = [
    {
      label: 'Open Integrations Settings',
      desc: isLocal ? 'Verify that AgentMark server is running locally on port 5003.' : 'Verify AgentMark Cloud instance is active.',
      done: true,
    },
    {
      label: isLocal ? '1-Click Auto Connect' : 'Download & Copy Local Config',
      desc: isLocal
        ? 'Click "Connect Claude Desktop" to automatically write the local config file.'
        : 'Download settings file and place in %APPDATA%\\Claude\\ (Win) or ~/Library/Application Support/Claude/ (Mac).',
      done: status === 'Connected' || status === 'Configuration Outdated',
    },
    {
      label: 'Relaunch Claude Desktop',
      desc: 'Completely quit Claude from system tray or menu bar, then relaunch.',
      done: status === 'Connected',
    },
    {
      label: 'Verify Live Tools',
      desc: 'Type "Run a focus group for my campaign" or "Synthesize brand memory" in Claude to test live MCP tools.',
      done: status === 'Connected',
    },
  ];

  const faqs = [
    {
      q: 'Claude cannot find the AgentMark tools',
      a: 'Ensure you completely Quit Claude from your OS system tray (not just closing the window) and restart it. Also, verify the local backend server is running on port 5003.',
    },
    {
      q: 'Write permissions or locked file error',
      a: 'Verify that your user account has write permissions to the Claude directory. If the file is locked, close Claude Desktop and try connecting again.',
    },
    {
      q: 'Does this work in cloud environments?',
      a: 'Hosted environments cannot write to local files. You must download the config file and drop it in your local Claude configuration directory manually.',
    },
  ];

  if (!showGuides && status === 'Connected') {
    return (
      <div className="space-y-6">
        <div className="p-5 rounded-xl border border-[#10B981]/25 bg-[#10B981]/5 space-y-3">
          <div className="flex items-center justify-between border-b border-[#10B981]/20 pb-3">
            <div className="flex items-center gap-2 text-[#10B981]">
              <BookOpen size={14} />
              <h4 className="font-semibold text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Integration Active
              </h4>
            </div>
            <span className="text-[10px] font-mono text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10">
              CONNECTED
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed" style={{ color: '#8B8B9E' }}>
            Claude Desktop is configured and ready. Local campaigns, metrics, and MCP operations are linked.
          </p>
          <button
            onClick={() => setShowGuides(true)}
            className="w-full text-center px-3 py-2 border border-[#2A2A38] bg-[#1B1B25] hover:bg-[#252535] rounded-lg text-xs font-semibold transition-all"
            style={{ color: '#F1F1F3', cursor: 'pointer' }}
          >
            Show Onboarding Guide & FAQ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Onboarding Checklist Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 border-b border-[#262636] pb-3">
          <BookOpen size={14} className="text-[#818CF8]" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#94A3B8] font-mono">
            Setup Checklist
          </h4>
        </div>
        
        <div className="space-y-3">
          {steps.map((s, i) => (
            <div key={i} className="flex items-start gap-3 text-xs font-sans">
              <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                s.done ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'bg-white/5 text-[#94A3B8] border border-white/10'
              }`}>
                {s.done ? <Check size={10} /> : i + 1}
              </div>
              <div className="space-y-0.5">
                <p className={`font-semibold font-sora ${s.done ? 'text-white' : 'text-[#CBD5E1]'}`}>{s.label}</p>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting & FAQ Card */}
      <div className="p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2 border-b border-[#262636] pb-3">
          <ShieldAlert size={14} className="text-[#F59E0B]" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#94A3B8] font-mono">
            Troubleshooting & FAQ
          </h4>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-[#262636] rounded-xl overflow-hidden bg-[#0B0B12]">
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-3 flex items-center justify-between text-xs font-semibold font-sora text-white hover:bg-white/[0.02] transition-colors border-none bg-transparent cursor-pointer"
              >
                <span className="pr-2">{faq.q}</span>
                {openFaq === idx ? <ChevronUp size={14} className="text-[#818CF8] shrink-0" /> : <ChevronDown size={14} className="text-[#94A3B8] shrink-0" />}
              </button>
              {openFaq === idx && (
                <div className="px-3 pb-3 pt-1 text-[11px] text-[#94A3B8] font-sans leading-relaxed border-t border-[#262636]/60">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
