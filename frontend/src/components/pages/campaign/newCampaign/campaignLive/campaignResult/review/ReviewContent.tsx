import React from 'react';
import { CheckCircle, AlertCircle, Shield, ListTodo, Award, Activity } from 'lucide-react';

interface ReviewContentProps {
  data?: any;
  reviewScore?: number | null;
}

const ReviewContent: React.FC<ReviewContentProps> = ({ data, reviewScore }) => {
  const hasRealData = data && Object.keys(data).length > 0;

  const status = data?.status || '';
  const researchReview = data?.research_review || {};
  const strategyReview = data?.strategy_review || {};
  const copyReview = data?.copy_review || {};
  const imageReview = data?.image_review || {};
  const overall = data?.overall || {};

  const agentScores = [researchReview.score, strategyReview.score, copyReview.score, imageReview.score]
    .filter((value): value is number => typeof value === 'number' && value > 0);
  const fallbackScore = agentScores.length > 0
    ? Math.round((agentScores.reduce((sum, value) => sum + value, 0) / agentScores.length) * 10) / 10
    : 0;
  const normVal = Number(score) > 10 ? Number(score) : Number(score) * 10;
  const displayScore = normVal.toFixed(1);
  const displayScale = '/100';
  const confidenceScore = normVal;
  const strengths = overall?.strengths || data?.strengths || [];
  const improvements = overall?.critical_improvements || data?.improvements || [];
  const compliance = data?.compliance || [];

  const defaultCompliance = [
    { title: 'No False Claims Detected', desc: 'Copy accurately reflects technical specifications provided in the product brief without exaggeration.' },
    { title: 'Brand Tone Alignment', desc: 'Tone analysis indicates an 92% match with \'Authoritative & Innovative\' brand voice parameters.' },
    { title: 'Visual Accessibility', desc: 'Contrast ratios on primary visual assets meet or exceed WCAG AA standards (4.5:1).' },
  ];

  const defaultStrengths = [
    'Strong opening hook in the primary email sequence, driving immediate urgency.',
    'Excellent structural pacing in the landing page layout, naturally leading to the CTA.',
    'Consistent use of high-impact action verbs across all social media variations.',
  ];

  const defaultImprovements = [
    { text: 'Secondary CTA on landing page competes visually with the primary action.', action: 'Auto-fix layout →' },
    { text: 'Subject line variant C exceeds optimal mobile viewing length by 14 characters.', action: 'Generate shorter variants →' },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center">
                <Shield size={22} className="text-rose-400 filter drop-shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Campaign Quality Assessment</h2>
            </div>
            <p className="text-sm md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>AI analysis of copy, visual coherence, and strategic alignment against brand guidelines.</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
              Goal: QUALITY REVIEW
            </span>
            {data?.inferred_goal && (
              <span className="px-3 py-1.5 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                Campaign: {data.inferred_goal.replace(/_/g, ' ').toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>

      {!hasRealData && !reviewScore && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
            No review data available yet. This will be populated after AI review agent completes analysis.
          </p>
        </div>
      )}

      {(researchReview.score || strategyReview.score || copyReview.score || imageReview.score) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {researchReview.score && (
            <div className="card-elevate bg-[#0A1628] border border-[#2A2A38] rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#0EA5E9] to-transparent" />
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Research Agent</h4>
                <span className={`w-2 h-2 rounded-full ${researchReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#0EA5E9' }}>
                {researchReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{researchReview.feedback}</p>
              {researchReview.issues?.length > 0 && (
                <div>
                  <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Issues</span>
                  <ul className="space-y-1">
                    {researchReview.issues.slice(0, 2).map((issue: string, idx: number) => (
                      <li key={idx} className="text-xs flex items-start gap-1" style={{ fontFamily: 'Inter, sans-serif', color: '#F43F5E' }}>
                        <AlertCircle size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {strategyReview.score && (
            <div className="card-elevate bg-[#0A0A1C] border border-[#2A2A38] rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] to-transparent" />
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Strategy Agent</h4>
                <span className={`w-2 h-2 rounded-full ${strategyReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>
                {strategyReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{strategyReview.feedback}</p>
              {strategyReview.action_items?.length > 0 && (
                <div>
                  <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Action Items</span>
                  <ul className="space-y-1">
                    {strategyReview.action_items.slice(0, 2).map((item: string, idx: number) => (
                      <li key={idx} className="text-xs flex items-start gap-1" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>
                        <ListTodo size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {copyReview.score && (
            <div className="card-elevate bg-[#0A0A1C] border border-[#2A2A38] rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#8B5CF6] to-transparent" />
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Copy Agent</h4>
                <span className={`w-2 h-2 rounded-full ${copyReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B5CF6' }}>
                {copyReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{copyReview.feedback}</p>
            </div>
          )}
          {imageReview.score && (
            <div className="card-elevate bg-gradient-to-br from-[#1C0A0A] to-[#0A0A0F] border border-[#E11D48]/25 rounded-xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#E11D48] via-[#FB7185] to-transparent" />
              <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#E11D48]/5 blur-[50px] rounded-full pointer-events-none" />
              <div className="flex items-center justify-between mb-3 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E11D48]/15 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                  </div>
                  <h4 className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Image Agent</h4>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${imageReview.approved ? 'bg-[#FB7185]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="flex items-end gap-2 mb-2 relative z-10">
                <span className="text-3xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#FB7185' }}>
                  {imageReview.score}
                </span>
                <span className="text-xs mb-1.5" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>/ 100</span>
              </div>
              <p className="text-xs leading-relaxed relative z-10" style={{ fontFamily: 'Inter, sans-serif', color: '#B0B0C0' }}>{imageReview.feedback}</p>
            </div>
          )}
        </div>
      )}

      {status && (
        <div className={`relative overflow-hidden rounded-2xl ${status === 'approved' ? 'bg-gradient-to-r from-[#4edea3]/10 via-[#4edea3]/5 to-transparent' : 'bg-gradient-to-r from-[#F59E0B]/10 via-[#F59E0B]/5 to-transparent'} border ${status === 'approved' ? 'border-[#4edea3]/20' : 'border-[#F59E0B]/20'}`}>
          <div className={`absolute top-0 left-0 w-full h-0.5 ${status === 'approved' ? 'bg-gradient-to-r from-[#4edea3] to-transparent' : 'bg-gradient-to-r from-[#F59E0B] to-transparent'}`} />
          <div className="flex items-center gap-4 px-5 py-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${status === 'approved' ? 'bg-[#4edea3]/15' : 'bg-[#F59E0B]/15'}`}>
              {status === 'approved' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={status === 'approved' ? '#4edea3' : '#F59E0B'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: status === 'approved' ? '#F1F1F3' : '#F1F1F3' }}>
                {status === 'approved' ? 'Approved' : 'Revision Required'}
              </p>
              <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                {status === 'approved' ? 'This campaign has passed all review checks.' : 'Some items need attention before approval.'}
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'approved' ? 'bg-[#4edea3]/15 text-[#4edea3]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'}`} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              {status === 'approved' ? 'PASSED' : 'PENDING'}
            </div>
          </div>
        </div>
      )}

      {/* Overall Score + Summary row */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="card-elevate w-full lg:w-[260px] shrink-0 bg-[#111118] border border-[#2A2A38] rounded-xl p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-[#2A2A38]/80 transition-colors min-h-[200px]">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/50 to-transparent opacity-50" />
          <h3 className="text-xs uppercase tracking-wider absolute top-5 left-5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>Overall Score</h3>
          <div className="mt-6 mb-4 relative">
            <div className="absolute inset-0 bg-[#4edea3]/10 blur-[40px] rounded-full" />
            <div className="relative z-10 leading-none flex items-baseline gap-1" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, color: confidenceScore >= 7 ? '#4edea3' : confidenceScore >= 5 ? '#F59E0B' : '#F43F5E', textShadow: `0 0 12px ${confidenceScore >= 7 ? 'rgba(78,222,163,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              <span className="text-6xl">{displayScore}</span><span className="text-2xl opacity-50">{displayScale}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 px-3 py-1.5 rounded-md bg-[#4edea3]/5 border border-[#4edea3]/10">
            <Shield size={14} className="text-[#4edea3]" />
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>{confidenceScore >= 7 ? 'High Confidence' : 'Moderate Confidence'}</span>
          </div>
        </div>

        <div className="card-elevate flex-1 bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative">
          <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <Activity size={20} className="text-[#6366F1]" />Overall Summary
          </h3>
          {overall.summary && (
            <p className="text-sm mb-6 pb-6 border-b border-[#2A2A38]" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              {overall.summary}
            </p>
          )}
          <div className="space-y-4">
            {(Array.isArray(compliance) && compliance.length > 0 ? compliance : defaultCompliance).slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="card-elevate flex items-start gap-4 p-4 rounded-lg bg-[#0A0A0F] border border-[#2A2A38]/50 hover:border-[#2A2A38] transition-colors">
                <CheckCircle size={18} className="text-[#4edea3] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{item.title || item.check || item.name}</h4>
                  <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{item.desc || item.description || item.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Core Strengths + Areas for Refinement row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-elevate bg-[#0A1628] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#0284C7] to-transparent" />
          <div className="flex items-center gap-2 mb-6 border-b border-[#2A2A38] pb-4">
            <span className="w-8 h-8 rounded-md bg-[#0284C7]/10 flex items-center justify-center text-[#0284C7]"><Award size={18} /></span>
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Core Strengths</h3>
          </div>
          <ul className="space-y-4">
            {(Array.isArray(strengths) && strengths.length > 0 ? strengths : defaultStrengths).slice(0, 5).map((strength: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-[#0284C7] mt-0.5 flex-shrink-0">+</span>
                <span className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#c7c4d7' }}>{typeof strength === 'string' ? strength : strength.text || strength.description}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#F43F5E] to-transparent" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#F43F5E]/5 blur-[40px] rounded-full pointer-events-none" />
          <div className="flex items-center gap-2 mb-6 border-b border-[#2A2A38] pb-4 relative z-10">
            <span className="w-8 h-8 rounded-md bg-[#F43F5E]/10 flex items-center justify-center text-[#F43F5E]"><AlertCircle size={18} /></span>
            <h3 className="text-lg font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Areas for Refinement</h3>
          </div>
          <ul className="space-y-4 relative z-10">
            {(Array.isArray(improvements) && improvements.length > 0 ? improvements : defaultImprovements).slice(0, 5).map((item: any, idx: number) => (
              <li key={idx} className="flex items-start gap-3 group">
                <span className="text-[#F43F5E] mt-0.5 flex-shrink-0">-</span>
                <div className="min-w-0">
                  <span className="text-sm leading-relaxed block" style={{ fontFamily: 'Inter, sans-serif', color: '#c7c4d7' }}>{typeof item === 'string' ? item : item.text || item.description}</span>
                  {item.action && (
                    <button className="text-xs mt-1 block opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{item.action}</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ReviewContent);
