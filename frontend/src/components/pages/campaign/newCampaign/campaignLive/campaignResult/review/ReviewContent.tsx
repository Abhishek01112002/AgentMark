import React from 'react';
import { CheckCircle, TrendingUp, AlertCircle, RotateCw, Send, Target, Shield } from 'lucide-react';

const ReviewContent: React.FC = () => {
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center gap-1.5 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />Review Complete
            </span>
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4A4A5E' }}>Project: Apollo Launch</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold mb-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Campaign Quality Assessment</h2>
          <p className="text-sm md:text-base max-w-2xl" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>AI analysis of copy, visual coherence, and strategic alignment against brand guidelines.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button className="px-4 py-2 rounded-lg border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1A1A24] flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <RotateCw size={16} />Re-Run Analysis
          </button>
          <button className="px-5 py-2 rounded-lg bg-[#6366F1] text-sm font-bold transition-all hover:scale-95 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
            <Send size={16} />Approve & Route
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-4 bg-[#111118] border border-[#2A2A38] rounded-xl p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-[#2A2A38]/80 transition-colors">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/50 to-transparent opacity-50" />
          <h3 className="text-xs uppercase tracking-wider absolute top-6 left-6" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>Overall Score</h3>
          <div className="mt-8 mb-4 relative">
            <div className="absolute inset-0 bg-[#4edea3]/10 blur-[40px] rounded-full" />
            <div className="relative z-10 leading-none" style={{ fontFamily: 'Sora, sans-serif', fontSize: '64px', fontWeight: 700, color: '#4edea3', textShadow: '0 0 12px rgba(78,222,163,0.3)' }}>
              8.7<span className="text-2xl opacity-50">/10</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-md bg-[#4edea3]/5 border border-[#4edea3]/10">
            <Shield size={14} className="text-[#4edea3]" />
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>High Confidence</span>
          </div>
        </div>

        <div className="col-span-1 md:col-span-8 bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative">
          <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
            <Target size={20} className="text-[#6366F1]" />Compliance & Alignment
          </h3>
          <div className="space-y-4">
            {[
              { title: 'No False Claims Detected', desc: 'Copy accurately reflects technical specifications provided in the product brief without exaggeration.' },
              { title: 'Brand Tone Alignment', desc: 'Tone analysis indicates an 92% match with \'Authoritative & Innovative\' brand voice parameters.' },
              { title: 'Visual Accessibility', desc: 'Contrast ratios on primary visual assets meet or exceed WCAG AA standards (4.5:1).' },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-[#0A0A0F] border border-[#2A2A38]/50 hover:border-[#2A2A38] transition-colors">
                <CheckCircle size={18} className="text-[#4edea3] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{item.title}</h4>
                  <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-1 md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-[#2A2A38] pb-4">
              <span className="w-8 h-8 rounded-md bg-[#4edea3]/10 flex items-center justify-center text-[#4edea3]"><TrendingUp size={18} /></span>
              <h3 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Core Strengths</h3>
            </div>
            <ul className="space-y-4">
              {[
                'Strong opening hook in the primary email sequence, driving immediate urgency.',
                'Excellent structural pacing in the landing page layout, naturally leading to the CTA.',
                'Consistent use of high-impact action verbs across all social media variations.',
              ].map((strength, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-[#4edea3] mt-0.5 flex-shrink-0">+</span>
                  <span className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#c7c4d7' }}>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F59E0B]/5 blur-[40px] rounded-full pointer-events-none" />
            <div className="flex items-center gap-2 mb-6 border-b border-[#2A2A38] pb-4 relative z-10">
              <span className="w-8 h-8 rounded-md bg-[#F59E0B]/10 flex items-center justify-center text-[#F59E0B]"><AlertCircle size={18} /></span>
              <h3 className="text-lg md:text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>Areas for Refinement</h3>
            </div>
            <ul className="space-y-4 relative z-10">
              {[
                { text: 'Secondary CTA on landing page competes visually with the primary action.', action: 'Auto-fix layout →' },
                { text: 'Subject line variant C exceeds optimal mobile viewing length by 14 characters.', action: 'Generate shorter variants →' },
              ].map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 group">
                  <span className="text-[#F59E0B] mt-0.5 flex-shrink-0">-</span>
                  <div className="min-w-0">
                    <span className="text-sm leading-relaxed block" style={{ fontFamily: 'Sora, sans-serif', color: '#c7c4d7' }}>{item.text}</span>
                    <button className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{item.action}</button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewContent;
