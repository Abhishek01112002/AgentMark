import React from 'react';
import { TrendingUp, Users, Key, Target } from 'lucide-react';

const ResearchContent: React.FC = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 fade-in">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center text-[#6366F1]">
              <Target size={24} />
            </div>
            <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Research - AgentMark
            </h2>
          </div>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>
            Real-time market intelligence powered by autonomous agents.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#111118] border border-[#2A2A38] text-xs md:text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
            GPT-4o-mini
          </span>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Market Trends */}
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all" style={{ animationDelay: '0.1s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <TrendingUp size={20} className="text-[#6366F1]" />
            Market Trends
          </h3>
          <ul className="space-y-4">
            {[
              {
                title: 'AI Automation Integration',
                desc: 'High adoption in enterprise workflows reducing operational drag.',
              },
              {
                title: 'Zero-Party Data Collection',
                desc: 'Shift towards direct consumer engagement for privacy compliance.',
              },
              {
                title: 'Hyper-Personalization',
                desc: 'Dynamic content generation based on real-time user behavior.',
              },
            ].map((trend, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <TrendingUp size={18} className="text-[#6366F1] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                    {trend.title}
                  </h4>
                  <p className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                    {trend.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Competitor Analysis */}
        <div className="rounded-xl p-5 md:p-6 fade-in transition-all" style={{ animationDelay: '0.2s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Target size={20} className="text-[#6366F1]" />
            Competitor Analysis
          </h3>
          <div className="space-y-6">
            {[
              {
                name: 'Globex',
                desc: 'Enterprise all-in-one solution. High trust, complex onboarding.',
                weakness: 'Slow feature velocity, outdated UI, expensive entry tier.',
              },
              {
                name: 'Acme Corp',
                desc: 'AI-first, niche focus. Fast growth, aggressive pricing.',
                weakness: 'Shallow integrations, buggy core features, poor support.',
              },
            ].map((competitor, idx) => (
              <div key={idx}>
                <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                  {competitor.name}
                </h4>
                <p className="text-xs italic mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                  {competitor.desc}
                </p>
                <p className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                  <span className="font-semibold" style={{ color: '#F43F5E' }}>Weakness:</span> {competitor.weakness}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Insights (Full Width) */}
        <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all" style={{ animationDelay: '0.3s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Users size={20} className="text-[#6366F1]" />
            Audience Insights
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pain Points */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Pain Points
              </h4>
              <ul className="space-y-2">
                {['Time scarcity', 'Data silos', 'Inconsistent ROI'].map((point, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                    <span className="w-3 h-3 rounded-full bg-[#F43F5E] flex-shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Motivations */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Motivations
              </h4>
              <ul className="space-y-2">
                {['Workflow automation', 'Predictable growth'].map((motivation, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                    <span className="w-3 h-3 rounded-full bg-[#4edea3] flex-shrink-0" />
                    {motivation}
                  </li>
                ))}
              </ul>
            </div>

            {/* Preferred Channels */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Preferred Channels
              </h4>
              <div className="flex flex-wrap gap-2">
                {['LinkedIn', 'Email', 'Twitter'].map((channel, idx) => (
                  <span key={idx} className="px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            {/* Language Style */}
            <div>
              <h4 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                Language Style
              </h4>
              <p className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                Professional, data-driven, concise, focusing on outcomes and efficiency.
              </p>
            </div>
          </div>
        </div>

        {/* Keywords */}
        <div className="rounded-xl p-5 md:p-6 lg:col-span-2 fade-in transition-all" style={{ animationDelay: '0.4s', background: '#111118', border: '1px solid #2A2A38' }}>
          <h3 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Key size={20} className="text-[#6366F1]" />
            Keywords
          </h3>
          <div className="flex flex-wrap gap-3">
            {[
              'marketing automation',
              'ai tools',
              'b2b lead gen',
              'email sequences',
              'predictive analytics',
              'crm integration',
              'growth hacking',
              'content roi',
            ].map((keyword, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-sm font-medium cursor-pointer transition-colors hover:border-[#6366F1]"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearchContent;
