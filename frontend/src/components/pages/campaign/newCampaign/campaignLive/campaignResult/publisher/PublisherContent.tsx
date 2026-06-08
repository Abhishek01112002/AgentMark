import React from 'react';
import { Download, Calendar, Copy, Code, Package } from 'lucide-react';

const PublisherContent: React.FC = () => {

  const assets = [
    { platform: 'LinkedIn', type: 'Post', icon: '💼', color: '#0A66C2', preview: '🚀 The rules of high-performance marketing just changed. Say hello to "Velocity" - the tool that cuts campaign generation time by 80%. If you\'re still doing manual audience research, you\'re falling behind...', hashtags: ['#MarketingTech', '#AI'], action: 'Copy to Clipboard' },
    { platform: 'Email', type: 'Newsletter', icon: '📧', color: '#d97721', preview: 'Hi [Name], we know how long it takes to build a cohesive campaign. That\'s why we built Velocity. Join our exclusive webinar to see it live...', subject: 'Unlock 5x Marketing Speed ⚡️', action: 'View HTML' },
    { platform: 'Twitter', type: 'Thread', icon: '🐦', color: '#1DA1F2', preview: '1/5 Marketing teams are broken. 🧵\n\nToo much time on manual tasks, not enough on strategy. We\'re fixing that today with Velocity. Here\'s how it works 👇', replies: '4 replies included', action: 'Copy All' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#4edea3]/10 border border-[#4edea3]/20 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
            <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>Campaign Completed</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Q4 Product Launch: "Velocity"</h1>
          <p className="text-sm md:text-base flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            <Calendar size={14} />Generated on Oct 24, 2024
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4 flex flex-col items-end shadow-lg">
            <span className="text-xs uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Quality Score</span>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#4edea3' }}>8.7</span>
              <span className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>/10</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#6366F1]/5 to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 z-10">
          <div className="w-12 h-12 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1]">
            <Package size={26} />
          </div>
          <div>
            <h3 className="text-base md:text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>All Campaign Assets Ready</h3>
            <p className="text-xs md:text-sm mt-1" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Includes copy docs, image variants, and strategic framework.</p>
          </div>
        </div>
        <button className="w-full sm:w-auto bg-[#6366F1] px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-opacity hover:opacity-90 z-10 text-sm font-medium shadow-[0_0_20px_rgba(99,102,241,0.3)]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
          <Download size={18} />Download All (.zip)
        </button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Generated Placements</h2>
          <span className="bg-[#111118] border border-[#2A2A38] px-3 py-1 rounded-full text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{assets.length} Assets</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset, idx) => (
            <div key={idx} className="bg-[#111118] border border-[#2A2A38] rounded-xl overflow-hidden group hover:border-[#464554] transition-colors flex flex-col">
              <div className="p-4 border-b border-[#2A2A38] bg-[#1f1f25] flex items-center gap-3">
                <span className="text-2xl">{asset.icon}</span>
                <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{asset.platform} {asset.type}</span>
              </div>
              <div className="p-5 flex-1 space-y-4">
                {asset.subject && (
                  <div>
                    <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Subject</span>
                    <p className="text-sm mt-1 font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{asset.subject}</p>
                  </div>
                )}
                {asset.subject && <div className="w-full h-px bg-[#2A2A38]" />}
                <p className="text-sm line-clamp-4" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{asset.preview}</p>
                {asset.hashtags && (
                  <div className="flex flex-wrap gap-2">
                    {asset.hashtags.map((tag, tidx) => (
                      <span key={tidx} className="bg-[#35343a] px-2 py-1 rounded text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>{tag}</span>
                    ))}
                  </div>
                )}
                {asset.replies && <span className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#4A4A5E' }}>{asset.replies}</span>}
              </div>
              <div className="p-4 border-t border-[#2A2A38] mt-auto">
                <button className="w-full bg-transparent border border-[#2A2A38] px-4 py-2 rounded-lg transition-colors hover:bg-[#1A1A24] flex justify-center items-center gap-2 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                  {asset.action === 'View HTML' ? <Code size={16} /> : <Copy size={16} />}
                  {asset.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PublisherContent;
