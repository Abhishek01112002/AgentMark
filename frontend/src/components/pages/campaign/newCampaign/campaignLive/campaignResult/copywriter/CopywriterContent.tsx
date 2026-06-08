import React, { useState } from 'react';
import { Share2, Copy, Plus, Hash, FileText } from 'lucide-react';

const CopywriterContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('linkedin');
  const tabs = [
    { id: 'linkedin', label: 'LinkedIn' },
    { id: 'email', label: 'Email' },
    { id: 'blog', label: 'Blog' },
    { id: 'ad', label: 'Ad Copy' },
  ];
  const hashtags = ['#B2BMarketing', '#ProductLaunch', '#MarketingTech'];

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Campaign Copywriter</h2>
          <p className="text-sm md:text-base" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>Generating AI-optimized copy for "Q4 Product Launch".</p>
        </div>
        <div className="flex items-center gap-2 bg-[#111118] p-1 rounded-lg border border-[#2A2A38]">
          <div className="w-2 h-2 rounded-full bg-[#6366F1] ml-2" style={{ animation: 'pulse 2s infinite' }} />
          <span className="text-xs px-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>AI Active</span>
        </div>
      </header>

      <div className="mb-8 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-[#8083ff] text-[#0d0096] font-bold' : 'bg-[#111118] border border-[#2A2A38] text-[#F1F1F3] hover:bg-[#35343a]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-7 space-y-6">
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-50" />
            <div className="flex justify-between items-start mb-6 flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Share2 size={20} className="text-[#6366F1]" />
                <h3 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>LinkedIn Post</h3>
              </div>
              <button className="flex items-center gap-2 text-xs px-3 py-1.5 rounded bg-transparent border border-[#2A2A38] transition-colors hover:text-[#F1F1F3]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                <Copy size={14} />Copy to Clipboard
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Hook</label>
                <p className="text-sm md:text-base outline-none" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>The future of B2B marketing isn't more data. It's better decisions.</p>
              </div>

              <div className="bg-[#0e0e13] border border-[#2A2A38] rounded-lg p-4 focus-within:border-[#6366F1] transition-colors relative">
                <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Body</label>
                <div className="text-sm md:text-base outline-none min-h-[120px]" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
                  We just launched our Q4 product suite, designed specifically to cut through the noise. Instead of bombarding you with another dashboard of vanity metrics, we've focused on predictive intelligence.<br /><br />
                  Stop guessing what your audience wants.<br />Start knowing what they need.
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {hashtags.map((tag, idx) => (
                  <span key={idx} className="bg-[#1A1A24] border border-[#2A2A38] px-3 py-1 rounded-full text-xs cursor-pointer transition-colors hover:bg-[#35343a]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{tag}</span>
                ))}
                <span className="border border-dashed border-[#2A2A38] px-3 py-1 rounded-full text-xs cursor-pointer transition-colors hover:text-[#F1F1F3] flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>
                  <Plus size={12} />Add Tag
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="xl:col-span-5 space-y-6">
          <div className="bg-[#F9FAFB] rounded-xl p-1 overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-[#2A2A38] transition-all hover:border-[#6366F1]">
            <div className="bg-white rounded-lg p-4 md:p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Hash size={18} className="text-gray-400" />
                  <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6B7280' }}>Email Preview</span>
                </div>
                <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#9CA3AF' }}>Light Theme</span>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-xs block mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#9CA3AF' }}>Subject</span>
                  <p className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#111827' }}>Your Q4 Strategy: Upgraded.</p>
                </div>
                <div>
                  <span className="text-xs block mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#9CA3AF' }}>Preview</span>
                  <p className="text-sm truncate" style={{ fontFamily: 'Sora, sans-serif', color: '#6B7280' }}>See how our new predictive intelligence tools can streamline your...</p>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <div className="h-2 bg-gray-100 rounded w-3/4 mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-full mb-2" />
                  <div className="h-2 bg-gray-100 rounded w-5/6" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-[#6366F1]" />
              <h4 className="text-base md:text-lg font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Blog Outline</h4>
            </div>
            <ul className="space-y-3 text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
              <li className="flex items-start gap-2">
                <span className="text-xs mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>H1</span>
                <span>The Shift from Data to Decisions in Q4</span>
              </li>
              <li className="flex items-start gap-2 pl-4">
                <span className="text-xs mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>H2</span>
                <span>Why Vanity Metrics are Failing Teams</span>
              </li>
              <li className="flex items-start gap-2 pl-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2A2A38] mt-2 flex-shrink-0" />
                <span>Case study: ACME Corp's pivot.</span>
              </li>
              <li className="flex items-start gap-2 pl-4">
                <span className="text-xs mt-0.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>H2</span>
                <span>Introducing Predictive Intelligence</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopywriterContent;
