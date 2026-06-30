import React, { useState } from 'react';
import { Brain, AlertTriangle, BarChart2, CheckCircle2 } from 'lucide-react';

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

const MemoryInsightsCard: React.FC<MemoryInsightsCardProps> = ({ insights, count, projectId }) => {
  const [open, setOpen] = useState(true);

  if (!insights?.length) return null;

  return (
    <div
      data-project-id={projectId}
      className="rounded-2xl border overflow-hidden transition-all duration-300"
      style={{
        background: '#111118/80',
        backdropFilter: 'blur(8px)',
        borderColor: open ? 'rgba(99,102,241,0.25)' : '#2A2A38',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        style={{
          fontFamily: 'Inter, sans-serif', cursor: 'pointer',
          background: 'none', border: 'none', color: '#F1F1F3',
        }}
      >
        <div className="flex items-center gap-2.5">
          <Brain size={18} color="#E8E8F0" />
          <span className="text-sm font-semibold">Memory-Informed Decisions</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
            style={{
              background: 'rgba(99,102,241,0.1)', color: '#818CF8',
              border: '0.5px solid rgba(99,102,241,0.2)',
            }}
          >
            {count} past {count === 1 ? 'campaign' : 'campaigns'}
          </span>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 animate-fadeIn">
          {insights.map((s, idx) => (
            <div key={idx}>
              {s.rejectionReasons?.map((r, ri) => (
                <div
                  key={ri}
                  className="flex items-start gap-2.5"
                  style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(244,63,94,0.04)',
                    border: '0.5px solid rgba(244,63,94,0.08)',
                    marginBottom: '8px',
                  }}
                >
                  <AlertTriangle size={14} color="#FCA5A5" className="mt-[1px] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#F87171', fontFamily: 'Inter, sans-serif' }}>
                      Previously rejected {r.targetAgent}:
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: '#8B8B9E', fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
                      &quot;{r.feedbackText}&quot;
                    </p>
                    <span className="text-xs mt-1" style={{ color: '#4edea3', fontFamily: 'Inter, sans-serif' }}>
                      &rarr; Applied this time &check;
                    </span>
                  </div>
                </div>
              ))}

              {s.approvedOnFirstTry && (
                <div
                  className="flex items-start gap-2.5"
                  style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(78,222,163,0.04)',
                    border: '0.5px solid rgba(78,222,163,0.08)',
                    marginBottom: '8px',
                  }}
                >
                  <CheckCircle2 size={14} color="#4edea3" className="mt-[1px] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#4edea3', fontFamily: 'Inter, sans-serif' }}>
                      Approved on first try
                    </span>
                    {s.finalReviewScore != null && (
                      <p className="text-xs mt-0.5" style={{ color: '#8B8B9E', fontFamily: 'Inter, sans-serif' }}>
                        Scored {s.finalReviewScore}/100 with tone: {s.finalApprovedTone?.join(', ') || 'N/A'}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {s.finalChannelsUsed?.length > 0 && (
                <div
                  className="flex items-start gap-2.5"
                  style={{
                    padding: '8px 12px', borderRadius: '8px',
                    background: 'rgba(99,102,241,0.04)',
                    border: '0.5px solid rgba(99,102,241,0.08)',
                    marginBottom: '8px',
                  }}
                >
                  <BarChart2 size={14} color="#818CF8" className="mt-[1px] flex-shrink-0" />
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#818CF8', fontFamily: 'Inter, sans-serif' }}>
                      Channels used in past campaign
                    </span>
                    <p className="text-xs mt-0.5" style={{ color: '#8B8B9E', fontFamily: 'Inter, sans-serif' }}>
                      {s.finalChannelsUsed?.join(', ')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(MemoryInsightsCard);
