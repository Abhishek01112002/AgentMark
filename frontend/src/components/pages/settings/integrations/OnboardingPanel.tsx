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
      desc: isLocal ? 'Verify that AgentMark server is running locally on port 5001.' : 'Verify AgentMark Cloud instance is active.',
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
      a: 'Ensure you completely Quit Claude from your OS system tray (not just closing the window) and restart it. Also, verify the local backend server is running on port 5001.',
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
        <div className="relative overflow-hidden p-5 rounded-2xl border border-[#10B981]/25 bg-gradient-to-br from-[#10B981]/[0.08] to-[#12121A]/95 backdrop-blur-xl space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.06)]">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#10B981]/70 to-transparent" />
          <div className="flex items-center justify-between border-b border-[#10B981]/20 pb-3">
            <div className="flex items-center gap-2 text-[#10B981]">
              <div className="w-7 h-7 rounded-lg bg-[#10B981]/15 border border-[#10B981]/25 flex items-center justify-center shrink-0">
                <BookOpen size={14} />
              </div>
              <h4 className="font-semibold text-xs uppercase tracking-wider font-mono">Integration Active</h4>
            </div>
            <span className="text-[10px] font-mono text-[#10B981] px-2 py-0.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
              CONNECTED
            </span>
          </div>
          <p className="text-xs text-[#8B8B9E] leading-relaxed">
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
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#818CF8]/40 via-transparent to-transparent opacity-70" />
        <div className="flex items-center gap-2 border-b border-[#262636] pb-3">
          <div className="w-6 h-6 rounded-lg bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0">
            <BookOpen size={12} className="text-[#818CF8]" />
          </div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#94A3B8] font-mono">
            Setup Checklist
          </h4>
        </div>

        <div className="space-y-1">
          {steps.map((s, i) => (
            <div key={i} className="relative flex items-start gap-3.5 text-xs font-sans pb-4">
              {i < steps.length - 1 && (
                <span className="absolute left-[7.5px] top-6 bottom-0 w-px bg-gradient-to-b from-[#2A2A38] via-[#2A2A38]/60 to-transparent" />
              )}
              <div className={`relative z-10 mt-0.5 w-[15px] h-[15px] rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                s.done ? 'bg-gradient-to-br from-[#10B981]/25 to-[#059669]/10 text-[#10B981] border border-[#10B981]/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]' : 'bg-white/5 text-[#94A3B8] border border-white/10'
              }`}>
                {s.done ? <Check size={9} strokeWidth={3} /> : i + 1}
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className={`font-semibold font-sora ${s.done ? 'text-white' : 'text-[#CBD5E1]'}`}>{s.label}</p>
                <p className="text-[11px] text-[#94A3B8] leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting & FAQ Card */}
      <div className="relative overflow-hidden p-6 rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#F59E0B]/40 via-transparent to-transparent opacity-70" />
        <div className="flex items-center gap-2 border-b border-[#262636] pb-3">
          <div className="w-6 h-6 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/20 flex items-center justify-center shrink-0">
            <ShieldAlert size={12} className="text-[#FBBF24]" />
          </div>
          <h4 className="font-semibold text-xs uppercase tracking-wider text-[#94A3B8] font-mono">
            Troubleshooting & FAQ
          </h4>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`border rounded-xl overflow-hidden bg-[#0B0B12] transition-all duration-300 ${openFaq === idx ? 'border-[#818CF8]/30' : 'border-[#262636] hover:border-[#333348]'}`}>
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full text-left p-3.5 flex items-center justify-between gap-2 text-xs font-semibold font-sora text-white hover:bg-white/[0.02] transition-colors border-none bg-transparent cursor-pointer"
              >
                <span className="pr-2 leading-snug">{faq.q}</span>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${openFaq === idx ? 'bg-[#6366F1]/10 border-[#6366F1]/25' : 'border-white/10'}`}>
                  {openFaq === idx ? <ChevronUp size={12} className="text-[#818CF8]" /> : <ChevronDown size={12} className="text-[#94A3B8]" />}
                </div>
              </button>
              {openFaq === idx && (
                <div className="px-3.5 pb-3.5 pt-1 text-[11px] text-[#94A3B8] font-sans leading-relaxed border-t border-[#262636]/60">
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
