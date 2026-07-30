import React, { useState } from 'react';
import { ArrowLeft, AlertTriangle, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface SetupGuideProps {
  onBack: () => void;
  isLocal: boolean;
}

export const SetupGuide: React.FC<SetupGuideProps> = ({ onBack, isLocal }) => {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'Claude does not show the AgentMark tools. What should I check?',
      a: 'First, ensure Claude Desktop has been completely restarted. On Windows, check your system tray (next to the clock) and choose "Quit Claude", then open it again. Second, verify that your backend server is running on port 5001.',
    },
    {
      q: 'I get a "Permission Denied" or "Write Error" when connecting.',
      a: 'This happens if the Claude configuration directory or JSON file is set to read-only or owned by another administrator account. Run AgentMark as an administrator or manually check write permissions on `%APPDATA%\\Claude` (Windows) or `~/Library/Application Support/Claude` (macOS).',
    },
    {
      q: 'Can I use this integration in the cloud/hosted version of AgentMark?',
      a: 'Yes! While cloud servers cannot directly modify your local files, you can click "Download Config File" on the integration tab and save it directly in your local Claude configuration folder.',
    },
    {
      q: 'What should my `claude_desktop_config.json` look like?',
      a: 'It should contain an "agentmark" entry under the "mcpServers" key, specifying "uvx" as the command, "agentmark-mcp-server" in the arguments, and your unique API key in the environment variables block.',
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl text-sm leading-relaxed" style={{ color: '#F1F1F3' }}>
      {/* Back Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-lg border border-[#2A2A38] bg-[#111118] hover:bg-[#1B1B25] transition-colors text-text-muted hover:text-text-primary"
          style={{ cursor: 'pointer', color: '#8B8B9E' }}
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
            Claude Desktop Connection Guide
          </h2>
          <p className="text-xs text-text-secondary mt-0.5" style={{ color: '#8B8B9E' }}>
            Learn how Model Context Protocol connects Claude directly to your campaign dashboard.
          </p>
        </div>
      </div>

      {/* Intro card */}
      <div className="p-6 rounded-2xl border border-[#2A2A38] bg-[#111118] space-y-4">
        <div className="flex items-center gap-2 text-[#c0c1ff]">
          <HelpCircle size={18} />
          <h3 className="font-semibold text-sm uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            What is MCP?
          </h3>
        </div>
        <p className="text-text-secondary leading-relaxed" style={{ color: '#8B8B9E' }}>
          Model Context Protocol (MCP) is an open standard created by Anthropic that allows local AI applications (like Claude Desktop) to connect securely to your workspace services and datasets.
        </p>
        <p className="text-text-secondary leading-relaxed" style={{ color: '#8B8B9E' }}>
          By enabling this connection, Claude gains full awareness of your projects, can generate Strategy Campaigns in real-time, execute simulated Focus Group persona interviews, and broadcast live feedback cycles directly onto your AgentMark Dashboard.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-6">
        <h3 className="text-base font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
          Connection Steps
        </h3>

        <div className="relative border-l border-[#2A2A38] ml-3 pl-8 space-y-8">
          {/* Step 1 */}
          <div className="relative">
            <span className="absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ color: '#6366F1', borderColor: '#2A2A38', backgroundColor: '#0e0e13', border: '1px solid #2A2A38' }}>
              1
            </span>
            <div className="space-y-2">
              <h4 className="font-semibold text-text-primary">Open Integrations Page</h4>
              <p className="text-text-secondary" style={{ color: '#8B8B9E' }}>
                Navigate to **Settings &gt; Integrations &gt; Claude Desktop** inside your AgentMark dashboard.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <span className="absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ color: '#6366F1', borderColor: '#2A2A38', backgroundColor: '#0e0e13', border: '1px solid #2A2A38' }}>
              2
            </span>
            <div className="space-y-2">
              <h4 className="font-semibold text-text-primary">
                {isLocal ? 'Click Connect Claude Desktop' : 'Download Configuration File'}
              </h4>
              <p className="text-text-secondary" style={{ color: '#8B8B9E' }}>
                {isLocal
                  ? 'Click the Connect button. AgentMark will automatically detect your operating system, verify your credentials, and write the connection definition directly to your local configuration folder.'
                  : 'Click "Download Config" to obtain your customized config file containing your unique API credentials.'}
              </p>
              {!isLocal && (
                <div className="p-3 bg-[#161622] border border-[#2A2A38] rounded-xl text-xs space-y-1">
                  <p className="text-text-primary font-medium">Local Configuration Paths:</p>
                  <p className="font-mono text-text-muted text-[11px]" style={{ color: '#8B8B9E' }}>
                    Windows: %APPDATA%\Claude\claude_desktop_config.json
                  </p>
                  <p className="font-mono text-text-muted text-[11px]" style={{ color: '#8B8B9E' }}>
                    macOS: ~/Library/Application Support/Claude/claude_desktop_config.json
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <span className="absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ color: '#6366F1', borderColor: '#2A2A38', backgroundColor: '#0e0e13', border: '1px solid #2A2A38' }}>
              3
            </span>
            <div className="space-y-2">
              <h4 className="font-semibold text-text-primary">Restart Claude Desktop</h4>
              <p className="text-text-secondary" style={{ color: '#8B8B9E' }}>
                Fully restart the Claude Desktop application. Closing the active window is not sufficient — you must right-click the Claude tray icon and select **Quit**, then relaunch the app. This triggers Claude to load the new config definitions.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative">
            <span className="absolute -left-[45px] top-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style={{ color: '#6366F1', borderColor: '#2A2A38', backgroundColor: '#0e0e13', border: '1px solid #2A2A38' }}>
              4
            </span>
            <div className="space-y-2">
              <h4 className="font-semibold text-text-primary">Verify Live Integration</h4>
              <p className="text-text-secondary" style={{ color: '#8B8B9E' }}>
                Open Claude and type a test query like *"Show my profile details"* or *"Connect to AgentMark tools"*. You will see the tool execution pill pop up inside Claude. At the same time, the **Claude Activity Feed** on your dashboard will update in real-time!
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting FAQ */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
          Troubleshooting & FAQs
        </h3>

        <div className="divide-y divide-[#2A2A38] border border-[#2A2A38] rounded-2xl bg-[#111118] overflow-hidden">
          {faqs.map((faq, i) => {
            const isOpen = openFaq === i;
            return (
              <div key={i} className="transition-all">
                <button
                  onClick={() => toggleFaq(i)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#161622] transition-colors"
                  style={{ border: 'none', background: 'none', cursor: 'pointer' }}
                >
                  <span className="font-semibold text-text-primary" style={{ color: isOpen ? '#c0c1ff' : '#F1F1F3' }}>
                    {faq.q}
                  </span>
                  {isOpen ? (
                    <ChevronUp size={16} className="text-text-muted" style={{ color: '#8B8B9E' }} />
                  ) : (
                    <ChevronDown size={16} className="text-text-muted" style={{ color: '#8B8B9E' }} />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-xs text-text-secondary leading-relaxed border-t border-[#2A2A38]/30 pt-3" style={{ color: '#8B8B9E' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer warning */}
      <div className="flex gap-3 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-200">
        <AlertTriangle size={16} className="shrink-0 text-yellow-500" />
        <div>
          <p className="font-semibold text-yellow-400">Security Warning</p>
          <p className="mt-0.5 leading-relaxed">
            Never share your `claude_desktop_config.json` file or your `AGENTMARK_API_KEY` credentials with anyone. This key grants full programmatic access to your active projects and campaign details.
          </p>
        </div>
      </div>
    </div>
  );
};
