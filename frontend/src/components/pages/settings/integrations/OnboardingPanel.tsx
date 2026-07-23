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
      label: 'Open Integrations',
      desc: 'Verify that the local AgentMark server is running.',
      done: true,
    },
    {
      label: isLocal ? 'Connect Claude Desktop' : 'Download Configuration',
      desc: isLocal ? 'Click the primary CTA to write config files.' : 'Download and drop config in the Claude folder.',
      done: status === 'Connected' || status === 'Configuration Outdated',
    },
    {
      label: 'Restart Claude Desktop',
      desc: 'Quit Claude from the system tray, then restart the app.',
      done: status === 'Connected',
    },
    {
      label: 'Verify Tools',
      desc: 'Type "Run a focus group for my campaign" or "Create a project" in Claude to test tools.',
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
    <div className="space-y-6">
      
      {/* Onboarding Checklist */}
      <div className="p-5 rounded-xl border border-[#2A2A38] bg-[#111118] space-y-4">
        <div className="flex items-center gap-2 border-b border-[#2A2A38]/40 pb-3">
          <BookOpen size={14} className="text-[#c0c1ff]" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-text-secondary" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
            Setup Checklist
          </h4>
        </div>
        
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold ${
                    step.done
                      ? 'border-[#10B981] bg-[#10B981]/10 text-[#10B981]'
                      : 'border-[#2A2A38] bg-[#0E0E13] text-[#8B8B9E]'
                  }`}
                >
                  {step.done ? <Check size={10} strokeWidth={3} /> : idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-[1px] h-8 bg-[#2A2A38] mt-1" />
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-text-primary leading-tight">
                  {step.label}
                </p>
                <p className="text-[11px] text-text-secondary leading-normal" style={{ color: '#8B8B9E' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting Accordions */}
      <div className="p-5 rounded-xl border border-[#2A2A38] bg-[#111118] space-y-4">
        <div className="flex items-center gap-2 border-b border-[#2A2A38]/40 pb-3">
          <ShieldAlert size={14} className="text-[#c0c1ff]" />
          <h4 className="font-semibold text-xs uppercase tracking-wider text-text-secondary" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
            Troubleshooting
          </h4>
        </div>

        <div className="divide-y divide-[#2A2A38]/40 space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="pt-2 first:pt-0">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  className="w-full flex items-center justify-between text-left hover:text-[#c0c1ff] transition-colors"
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                >
                  <span className="text-xs font-medium text-text-primary">
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={12} className="text-text-muted" style={{ color: '#8B8B9E' }} />
                  ) : (
                    <ChevronDown size={12} className="text-text-muted" style={{ color: '#8B8B9E' }} />
                  )}
                </button>
                {isOpen && (
                  <div className="text-[11px] text-text-secondary mt-1.5 leading-relaxed bg-[#0E0E13] p-2.5 rounded-lg border border-[#2A2A38]/40" style={{ color: '#8B8B9E' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
