import React from 'react';
import { Lightbulb, Calendar, PlayCircle, FileDown, Briefcase, Mail, Target } from 'lucide-react';

const StrategyContent: React.FC = () => {
  const contentCalendar = [
    { week: 'Week 1', channel: 'LinkedIn', type: 'Infographic', topic: 'The Cost of Manual Marketing', status: 'ready', statusLabel: 'Ready' },
    { week: 'Week 1', channel: 'Email', type: 'Newsletter', topic: 'Launch Announcement & Offer', status: 'ready', statusLabel: 'Ready' },
    { week: 'Week 2', channel: 'LinkedIn', type: 'Video Snippet', topic: 'Feature Spotlight: Automation', status: 'review', statusLabel: 'In Review' },
    { week: 'Week 3', channel: 'Google Ads', type: 'Search Ad', topic: 'Competitor Conquesting', status: 'drafting', statusLabel: 'Drafting' },
    { week: 'Week 4', channel: 'Email', type: 'Case Study', topic: 'Enterprise Success Story', status: 'planned', statusLabel: 'Planned' },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ready': return { bg: 'rgba(78, 222, 163, 0.1)', text: '#4edea3', dotBg: '#4edea3' };
      case 'review': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', dotBg: '#F59E0B' };
      case 'drafting': return { bg: '#1A1A24', text: '#4A4A5E', dotBg: '#4A4A5E' };
      case 'planned': return { bg: '#1A1A24', text: '#4A4A5E', dotBg: '#4A4A5E' };
      default: return { bg: '#1A1A24', text: '#8B8B9E', dotBg: '#8B8B9E' };
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <style>{`.pulse-dot { animation: pulse 2s infinite ease-in-out; } @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] pulse-dot" />
              AI Strategy Active
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Campaign Strategy</h1>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Q3 Product Launch Blueprint</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-lg border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1A1A24] flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <FileDown size={16} />Export PDF
          </button>
          <button className="px-4 py-2 rounded-lg bg-[#6366F1] text-sm font-medium transition-opacity hover:opacity-90 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <PlayCircle size={16} />Execute
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-xl p-5 md:p-6 relative overflow-hidden group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-transparent opacity-50" />
          <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Lightbulb size={20} className="text-[#6366F1]" />Core Messaging Framework
          </h2>
          <div className="pl-6 border-l-2 border-[#6366F1] py-2 mb-8 relative">
            <span className="absolute -left-3 top-0 w-6 h-6 bg-[#111118] rounded-full flex items-center justify-center text-[#6366F1]">"</span>
            <p className="text-base md:text-lg italic" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              "Empowering elite marketing teams with surgical precision and autonomous intelligence to scale campaigns faster than ever."
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
              <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Value Proposition</h3>
              <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Reduce campaign setup time by 80% while increasing creative output quality.</p>
            </div>
            <div className="bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
              <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Target Audience</h3>
              <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Enterprise CMOs and Growth Leads managing $1M+ quarterly budgets.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {[
            { name: 'LinkedIn', icon: Briefcase, bg: 'rgba(10, 102, 194, 0.1)', color: '#0A66C2', badge: 'Primary', badgeColor: '#4edea3', desc: 'Thought leadership and B2B case studies targeting decision makers.' },
            { name: 'Email', icon: Mail, bg: '#1A1A24', color: '#F1F1F3', badge: 'Nurture', badgeColor: '#4A4A5E', desc: 'Segmented weekly sequences focusing on ROI and feature deep-dives.' },
            { name: 'Google Ads', icon: Target, bg: 'rgba(234, 67, 53, 0.1)', color: '#EA4335', badge: 'Conversion', badgeColor: '#4A4A5E', desc: 'High-intent keyword targeting for bottom-of-funnel capture.' },
          ].map((channel, idx) => (
            <div key={idx} className="rounded-xl p-5 cursor-pointer group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: channel.bg, color: channel.color }}>
                    <channel.icon size={18} />
                  </div>
                  <h3 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{channel.name}</h3>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: `${channel.badgeColor}1A`, color: channel.badgeColor }}>{channel.badge}</span>
              </div>
              <p className="text-xs mt-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{channel.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
        <div className="p-5 md:p-6 border-b border-[#2A2A38] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg md:text-xl flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
            <Calendar size={20} className="text-[#8B8B9E]" />Content Rollout
          </h2>
          <button className="text-sm hover:underline" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>View Full Timeline</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: 640 }}>
            <thead>
              <tr className="bg-[#1A1A24] border-b border-[#2A2A38]">
                {['Week', 'Channel', 'Content Type', 'Topic / Asset', 'Status'].map((header, idx) => (
                  <th key={idx} className={`py-3 px-4 md:px-6 text-xs uppercase tracking-wider ${idx === 4 ? 'text-right' : ''}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: '#4A4A5E' }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-[#2A2A38]/50">
              {contentCalendar.map((row, idx) => {
                const statusStyle = getStatusStyle(row.status);
                return (
                  <tr key={idx} className="hover:bg-[#111118] transition-colors">
                    <td className="py-4 px-4 md:px-6 font-medium" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{row.week}</td>
                    <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{row.channel}</td>
                    <td className="py-4 px-4 md:px-6">
                      <span className="px-2 py-1 bg-[#1A1A24] rounded text-xs border border-[#2A2A38]" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{row.type}</span>
                    </td>
                    <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{row.topic}</td>
                    <td className="py-4 px-4 md:px-6 text-right">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: statusStyle.bg, color: statusStyle.text, fontWeight: 500 }}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status === 'review' ? 'pulse-dot' : ''}`} style={{ backgroundColor: statusStyle.dotBg }} />
                        {row.statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StrategyContent;
