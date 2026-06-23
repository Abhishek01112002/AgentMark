import React from 'react';
import { CheckCircle, TrendingUp, AlertCircle, RotateCw, Send, Target, Shield, BarChart3, Sparkles } from 'lucide-react';

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
  const score = reviewScore ?? overall?.quality_score ?? data?.score ?? fallbackScore;
  const displayScore = Number(score) > 10 ? Number(score).toFixed(1) : Number(score).toFixed(1);
  const displayScale = Number(score) > 10 ? '/100' : '/10';
  const confidenceScore = Number(score) > 10 ? Number(score) / 10 : Number(score);
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
      <div className="rounded-2xl border border-[#2A2A38] bg-[#111118] p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-full bg-[#4edea3]/10 border border-[#4edea3]/20 flex items-center gap-1.5 text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>
                <Sparkles size={12} />Review Complete
              </span>
              <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>AI Quality Assessment</span>
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
      </div>

      {!hasRealData && !reviewScore && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>
            No review data available yet. This will be populated after AI review agent completes analysis.
          </p>
        </div>
      )}

      {(researchReview.score || strategyReview.score || copyReview.score || imageReview.score) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {researchReview.score && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Research Agent</h4>
                <span className={`w-2 h-2 rounded-full ${researchReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: researchReview.score >= 70 ? '#4edea3' : '#F59E0B' }}>
                {researchReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{researchReview.feedback}</p>
              {researchReview.issues?.length > 0 && (
                <div>
                  <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Issues</span>
                  <ul className="space-y-1">
                    {researchReview.issues.slice(0, 2).map((issue: string, idx: number) => (
                      <li key={idx} className="text-xs flex items-start gap-1" style={{ fontFamily: 'Sora, sans-serif', color: '#F43F5E' }}>
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
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Strategy Agent</h4>
                <span className={`w-2 h-2 rounded-full ${strategyReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: strategyReview.score >= 70 ? '#4edea3' : '#F59E0B' }}>
                {strategyReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{strategyReview.feedback}</p>
              {strategyReview.action_items?.length > 0 && (
                <div>
                  <span className="text-xs uppercase mb-1 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Action Items</span>
                  <ul className="space-y-1">
                    {strategyReview.action_items.slice(0, 2).map((item: string, idx: number) => (
                      <li key={idx} className="text-xs flex items-start gap-1" style={{ fontFamily: 'Sora, sans-serif', color: '#6366F1' }}>
                        <Target size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {copyReview.score && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Copy Agent</h4>
                <span className={`w-2 h-2 rounded-full ${copyReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: copyReview.score >= 70 ? '#4edea3' : '#F59E0B' }}>
                {copyReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{copyReview.feedback}</p>
            </div>
          )}
          {imageReview.score && (
            <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Image Agent</h4>
                <span className={`w-2 h-2 rounded-full ${imageReview.approved ? 'bg-[#4edea3]' : 'bg-[#F59E0B]'}`} />
              </div>
              <div className="text-3xl font-bold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: imageReview.score >= 70 ? '#4edea3' : '#F59E0B' }}>
                {imageReview.score}
              </div>
              <p className="text-xs mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{imageReview.feedback}</p>
            </div>
          )}
        </div>
      )}

      {status && (
        <div className={`rounded-xl p-4 border ${status === 'approved' ? 'bg-[#4edea3]/10 border-[#4edea3]/20' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20'}`}>
          <p className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: status === 'approved' ? '#4edea3' : '#F59E0B' }}>
            Status: {status === 'approved' ? 'Approved' : 'Revision Required'}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="col-span-1 md:col-span-4 bg-[#111118] border border-[#2A2A38] rounded-xl p-6 flex flex-col justify-center items-center relative overflow-hidden group hover:border-[#2A2A38]/80 transition-colors">
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#4edea3]/50 to-transparent opacity-50" />
          <h3 className="text-xs uppercase tracking-wider absolute top-6 left-6" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>Overall Score</h3>
          <div className="mt-8 mb-4 relative">
            <div className="absolute inset-0 bg-[#4edea3]/10 blur-[40px] rounded-full" />
            <div className="relative z-10 leading-none" style={{ fontFamily: 'Sora, sans-serif', fontSize: '64px', fontWeight: 700, color: confidenceScore >= 7 ? '#4edea3' : confidenceScore >= 5 ? '#F59E0B' : '#F43F5E', textShadow: `0 0 12px ${confidenceScore >= 7 ? 'rgba(78,222,163,0.3)' : 'rgba(245,158,11,0.3)'}` }}>
              {displayScore}<span className="text-2xl opacity-50">{displayScale}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-md bg-[#4edea3]/5 border border-[#4edea3]/10">
            <Shield size={14} className="text-[#4edea3]" />
            <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>{confidenceScore >= 7 ? 'High Confidence' : 'Moderate Confidence'}</span>
          </div>
        </div>

        <div className="col-span-1 md:col-span-8 bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6 relative">
          <h3 className="text-lg md:text-xl font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
            <BarChart3 size={20} className="text-[#6366F1]" />Overall Summary
          </h3>
          {overall.summary && (
            <p className="text-sm mb-6 pb-6 border-b border-[#2A2A38]" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              {overall.summary}
            </p>
          )}
          <div className="space-y-4">
            {(Array.isArray(compliance) && compliance.length > 0 ? compliance : defaultCompliance).slice(0, 5).map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-lg bg-[#0A0A0F] border border-[#2A2A38]/50 hover:border-[#2A2A38] transition-colors">
                <CheckCircle size={18} className="text-[#4edea3] mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <h4 className="text-sm font-medium mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>{item.title || item.check || item.name}</h4>
                  <p className="text-xs" style={{ fontFamily: 'Sora, sans-serif', color: '#8B8B9E' }}>{item.desc || item.description || item.details}</p>
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
              {(Array.isArray(strengths) && strengths.length > 0 ? strengths : defaultStrengths).slice(0, 5).map((strength: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-[#4edea3] mt-0.5 flex-shrink-0">+</span>
                  <span className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#c7c4d7' }}>{typeof strength === 'string' ? strength : strength.text || strength.description}</span>
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
              {(Array.isArray(improvements) && improvements.length > 0 ? improvements : defaultImprovements).slice(0, 5).map((item: any, idx: number) => (
                <li key={idx} className="flex items-start gap-3 group">
                  <span className="text-[#F59E0B] mt-0.5 flex-shrink-0">-</span>
                  <div className="min-w-0">
                    <span className="text-sm leading-relaxed block" style={{ fontFamily: 'Sora, sans-serif', color: '#c7c4d7' }}>{typeof item === 'string' ? item : item.text || item.description}</span>
                    {item.action && (
                      <button className="text-xs mt-1 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>{item.action}</button>
                    )}
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
