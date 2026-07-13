import React, { useState } from 'react';
import { Brain, TrendingUp, CheckCircle2, RotateCcw, Hash } from 'lucide-react';

interface Insight {
  completedAt: string;
  finalReviewScore: number | null;
  approvedOnFirstTry: boolean;
  rejectionReasons: Array<{ targetAgent: string; feedbackText: string }> | null;
  finalApprovedTone: string[];
  finalChannelsUsed: string[];
}

interface MemoryInsightsCardProps {
  insights: Insight[];
  count: number;
  projectId?: string;
}

const formatAgentName = (raw: string) =>
  raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const MemoryInsightsCard: React.FC<MemoryInsightsCardProps> = ({ insights, count, projectId }) => {
  const [open, setOpen] = useState(false);

  if (!insights?.length) return null;

  const allRejections = insights.flatMap(s => s.rejectionReasons || []);
  const firstTryCount = insights.filter(s => s.approvedOnFirstTry).length;
  const allChannels = [...new Set(insights.flatMap(s => s.finalChannelsUsed || []))];
  const avgScore = insights.filter(s => s.finalReviewScore != null).reduce((acc, s, _, arr) => acc + (s.finalReviewScore! / arr.length), 0);

  return (
    <div
      data-project-id={projectId}
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{ background: '#111118', borderColor: open ? 'rgba(99,102,241,0.25)' : '#2A2A38' }}
    >
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{ background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <div className="flex items-center gap-2.5">
          <Brain size={18} color="#818CF8" />
          <span className="text-sm font-semibold" style={{ color: '#F1F1F3', fontFamily: 'Inter, sans-serif' }}>Memory-Informed Decisions</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'rgba(99,102,241,0.1)', color: '#818CF8', border: '0.5px solid rgba(99,102,241,0.2)' }}>
            {count} past {count === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3">

          {/* Summary stats row */}
          <div className="grid grid-cols-3 gap-2 mb-1">
            {[
              { icon: <Hash size={12} />, label: 'Campaigns', value: count, color: '#818CF8' },
              { icon: <CheckCircle2 size={12} />, label: 'First-try approvals', value: firstTryCount, color: '#4edea3' },
              { icon: <TrendingUp size={12} />, label: 'Avg score', value: avgScore > 0 ? `${Math.round(avgScore)}/100` : '—', color: '#F59E0B' },
            ].map((stat, i) => (
              <div key={i} className="rounded-lg px-3 py-2.5 text-center" style={{ background: '#1A1A24', border: '1px solid #2A2A38' }}>
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: stat.color }}>{stat.icon}</div>
                <div className="text-sm font-bold" style={{ color: stat.color, fontFamily: 'Inter, sans-serif' }}>{stat.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: '#6B6B7E', fontFamily: 'Inter, sans-serif' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Rejection learnings */}
          {allRejections.length > 0 && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(244,63,94,0.12)' }}>
              <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'rgba(244,63,94,0.06)' }}>
                <RotateCcw size={12} color="#F87171" />
                <span className="text-[11px] font-semibold" style={{ color: '#F87171', fontFamily: 'Inter, sans-serif' }}>Learned from past rejections</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(244,63,94,0.08)' }}>
                {allRejections.map((r, i) => (
                  <div key={i} className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(244,63,94,0.08)', color: '#FCA5A5', fontFamily: 'JetBrains Mono, monospace' }}>
                        {formatAgentName(r.targetAgent)}
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: '#4edea3', fontFamily: 'Inter, sans-serif' }}>✓ Applied this time</span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: '#8B8B9E', fontFamily: 'Inter, sans-serif' }}>{r.feedbackText}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channels used */}
          {allChannels.length > 0 && (
            <div className="rounded-lg px-3 py-2.5" style={{ background: '#1A1A24', border: '1px solid #2A2A38' }}>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={12} color="#818CF8" />
                <span className="text-[11px] font-semibold" style={{ color: '#818CF8', fontFamily: 'Inter, sans-serif' }}>Channels from past campaigns</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {allChannels.map((ch, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.08)', color: '#A5B4FC', border: '0.5px solid rgba(99,102,241,0.15)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {ch}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default React.memo(MemoryInsightsCard);
