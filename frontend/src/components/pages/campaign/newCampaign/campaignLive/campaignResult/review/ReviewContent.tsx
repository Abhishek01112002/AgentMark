import React, { useMemo, useState } from 'react';
import {
  Shield, CheckCircle, AlertCircle, Award, Activity,
  Clock, User, Zap, BarChart2, Eye, FileText, Image,
  TrendingUp, ChevronRight, Info, XCircle, BookOpen, Layers,
  Filter, Sparkles, ArrowUpRight, CheckSquare, Square
} from 'lucide-react';

interface ReviewContentProps {
  data?: any;
  reviewScore?: number | null;
  campaignOutputs?: any; // full aiOutputs for hook matrix fallback
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toHundred = (v: any): number | null => {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n) || n <= 0) return null;
  return n <= 10 ? Math.round(n * 10) : Math.round(n);
};

const scoreColor = (s: number) => {
  if (s >= 80) return { text: '#4edea3', bg: 'rgba(78,222,163,0.12)', border: 'rgba(78,222,163,0.25)', glow: 'rgba(78,222,163,0.3)' };
  if (s >= 65) return { text: '#F59E0B', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.3)' };
  return { text: '#F43F5E', bg: 'rgba(244,63,94,0.12)', border: 'rgba(244,63,94,0.25)', glow: 'rgba(244,63,94,0.3)' };
};

const label = (s: number) => {
  if (s >= 90) return 'EXCEPTIONAL';
  if (s >= 80) return 'HIGH QUALITY';
  if (s >= 70) return 'ABOVE AVERAGE';
  if (s >= 60) return 'NEEDS WORK';
  return 'CRITICAL';
};

const formatDate = (iso: string) => {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso));
  } catch { return iso; }
};

// ─── Radial Score Ring ────────────────────────────────────────────────────────

const ScoreRing: React.FC<{ score: number; size?: number; stroke?: number; color: string }> = ({
  score, size = 80, stroke = 7, color,
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 6px ${color})` }}
      />
    </svg>
  );
};

// ─── Per-Agent Card ───────────────────────────────────────────────────────────

interface AgentCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  score: number | null;
  approved: boolean | undefined;
  feedback: string;
  issues?: string[];
  actionItems?: string[];
  weight?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({
  title, subtitle, icon, accentColor, score, approved, feedback, issues = [], actionItems = [], weight,
}) => {
  const norm = score != null ? toHundred(score) : null;
  const c = norm != null ? scoreColor(norm) : { text: '#8B8B9E', bg: 'rgba(139,139,158,0.08)', border: 'rgba(139,139,158,0.2)', glow: 'transparent' };

  return (
    <div
      className="relative overflow-hidden rounded-2xl border transition-all duration-300 hover:scale-[1.01]"
      style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)', borderColor: c.border }}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
      {/* Glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none" style={{ background: accentColor, opacity: 0.04, filter: 'blur(40px)' }} />

      <div className="p-5 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}30` }}>
              {icon}
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{title}</h4>
              <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{subtitle}</span>
            </div>
          </div>
          {/* Approved badge */}
          {approved != null && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                background: approved ? 'rgba(78,222,163,0.12)' : 'rgba(244,63,94,0.12)',
                color: approved ? '#4edea3' : '#F43F5E',
                border: `1px solid ${approved ? 'rgba(78,222,163,0.25)' : 'rgba(244,63,94,0.25)'}`,
              }}
            >
              {approved ? <CheckCircle size={9} /> : <XCircle size={9} />}
              {approved ? 'PASSED' : 'FAILED'}
            </div>
          )}
        </div>

        {/* Score + Ring */}
        <div className="flex items-center gap-4 mb-4">
          {norm != null ? (
            <div className="relative flex-shrink-0">
              <ScoreRing score={norm} size={72} stroke={6} color={c.text} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold leading-none" style={{ fontFamily: 'Inter, sans-serif', color: c.text }}>{norm}</span>
                <span className="text-[9px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>/100</span>
              </div>
            </div>
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-[#2A2A38] flex items-center justify-center flex-shrink-0">
              <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>N/A</span>
            </div>
          )}
          <div className="flex-1">
            {norm != null && (
              <div className="mb-2">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ fontFamily: 'JetBrains Mono, monospace', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
                >
                  {label(norm)}
                </span>
              </div>
            )}
            {weight && (
              <div className="text-[10px] mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                WEIGHT: {weight}
              </div>
            )}
            {/* Score bar */}
            {norm != null && (
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{ width: `${norm}%`, background: `linear-gradient(90deg, ${accentColor}, ${c.text})` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="rounded-xl p-3 mb-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-start gap-2">
              <Info size={12} className="mt-0.5 flex-shrink-0" style={{ color: accentColor }} />
              <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D0' }}>{feedback}</p>
            </div>
          </div>
        )}

        {/* Issues */}
        {issues.length > 0 && (
          <div className="space-y-1 mb-3">
            <span className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F43F5E' }}>
              ⚠ Issues Found
            </span>
            {issues.map((issue, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#F43F5E' }}>
                <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-widest block mb-1.5" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F59E0B' }}>
              → Action Items
            </span>
            {actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#D4A22A' }}>
                <ChevronRight size={11} className="mt-0.5 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Threshold Row ────────────────────────────────────────────────────────────

const ThresholdRow: React.FC<{ label: string; met: boolean; detail: string }> = ({ label, met, detail }) => (
  <div className="flex items-center justify-between py-3 border-b border-[#1A1A28] last:border-0">
    <div className="flex items-center gap-3">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: met ? 'rgba(78,222,163,0.15)' : 'rgba(244,63,94,0.15)' }}
      >
        {met ? <CheckCircle size={13} color="#4edea3" /> : <XCircle size={13} color="#F43F5E" />}
      </div>
      <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#D0D0E0' }}>{label}</span>
    </div>
    <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: met ? '#4edea3' : '#F43F5E' }}>
      {detail}
    </span>
  </div>
);

// ─── Structured Recommendation Item Interface ───────────────────────────────

interface ActionableRec {
  id: string;
  category: 'Strategy' | 'Copywriting' | 'Research' | 'Visuals' | 'Overall';
  agentName: string;
  impact: 'HIGH IMPACT (+5 pts)' | 'MEDIUM IMPACT (+3 pts)' | 'QUICK WIN';
  impactColor: string;
  title: string;
  prescription: string;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ReviewContent: React.FC<ReviewContentProps> = ({ data, reviewScore, campaignOutputs }) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [completedRecs, setCompletedRecs] = useState<Record<string, boolean>>({});

  const parsedData = useMemo(() => {
    if (!data) return {};
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return {};
      }
    }
    return data;
  }, [data]);

  const hasRealData = parsedData && Object.keys(parsedData).length > 0;

  const researchReview  = parsedData?.research_review  || {};
  const strategyReview  = parsedData?.strategy_review  || {};
  const copyReview      = parsedData?.copy_review      || {};
  const hookReview      = parsedData?.creative_hook_matrix_review || parsedData?.hook_review || {};
  const imageReview     = parsedData?.image_review     || {};
  const overall         = parsedData?.overall          || {};
  const reviewedAt      = parsedData?.reviewed_at;
  const reviewer        = parsedData?.reviewer || 'AgentMark Reviewer (LLM-Powered)';
  const canPublish      = parsedData?.can_publish;
  const overallThreshold    = parsedData?.overall_threshold_met;
  const individualThreshold = parsedData?.individual_threshold_met;

  // Derive hook count & resolved hook score for 100% parity with HITL inspector panel
  const hookCount = useMemo(() => {
    try {
      const raw = campaignOutputs?.creative_hook_matrix_output;
      const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : null;
      const arr = parsed?.hooks ?? parsed?.creative_hooks ?? [];
      return Array.isArray(arr) ? arr.length : 0;
    } catch { return 0; }
  }, [campaignOutputs]);

  const resolvedHookScore = useMemo(() => {
    const direct = toHundred(hookReview.score);
    if (direct !== null) return direct;
    if (hookCount > 0) return Math.min(80 + hookCount, 100);
    return null;
  }, [hookReview.score, hookCount]);

  // Overall score resolution (Synchronous calculation to prevent flickering and match score-extractor.ts)
  const overallNorm = useMemo(() => {
    // 1. Try to get direct score
    const v = parsedData?.overall_quality_score ?? overall?.quality_score ?? parsedData?.quality_score;
    const directScore = toHundred(v);
    if (directScore !== null) return directScore;

    // 2. Synchronous weighted average calculation (Single Source of Truth match with backend)
    const subReviews = [
      { score: toHundred(researchReview.score), weight: 25 },
      { score: toHundred(strategyReview.score), weight: 30 },
      { score: toHundred(copyReview.score), weight: 25 },
      { score: toHundred(imageReview.score), weight: 20 },
    ];

    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of subReviews) {
      if (item.score !== null && item.score > 0) {
        weightedSum += item.score * item.weight;
        totalWeight += item.weight;
      }
    }

    if (totalWeight > 0) {
      return Math.round(weightedSum / totalWeight);
    }

    // 3. Fallback to parent prop
    return toHundred(reviewScore) ?? null;
  }, [data, overall, reviewScore, researchReview.score, strategyReview.score, copyReview.score, imageReview.score]);

  const displayScore = overallNorm ?? 0;
  const c = scoreColor(displayScore);

  const strengths     = Array.isArray(overall?.strengths) ? overall.strengths : [];
  const improvements  = Array.isArray(overall?.critical_improvements) ? overall.critical_improvements : [];

  // Parse and aggregate all actionable prescriptions into structured objects
  const actionableRecs: ActionableRec[] = useMemo(() => {
    const recs: ActionableRec[] = [];
    let counter = 1;

    const addRec = (
      textRaw: any,
      category: 'Strategy' | 'Copywriting' | 'Research' | 'Visuals' | 'Overall',
      agentName: string,
      defaultImpact: 'HIGH IMPACT (+5 pts)' | 'MEDIUM IMPACT (+3 pts)' | 'QUICK WIN' = 'MEDIUM IMPACT (+3 pts)'
    ) => {
      if (!textRaw) return;
      const str = typeof textRaw === 'string' ? textRaw : textRaw.text || textRaw.description || JSON.stringify(textRaw);
      if (!str || str.length < 5) return;

      const lower = str.toLowerCase();
      let impact = defaultImpact;
      let impactColor = '#F59E0B';

      if (lower.includes('critical') || lower.includes('must') || lower.includes('boost') || lower.includes('conversion') || lower.includes('moat')) {
        impact = 'HIGH IMPACT (+5 pts)';
        impactColor = '#F43F5E';
      } else if (lower.includes('quick') || lower.includes('format') || lower.includes('short') || lower.includes('minor')) {
        impact = 'QUICK WIN';
        impactColor = '#4edea3';
      }

      recs.push({
        id: `rec-${counter++}`,
        category,
        agentName,
        impact,
        impactColor,
        title: str.slice(0, 75) + (str.length > 75 ? '...' : ''),
        prescription: str,
      });
    };

    // 1. Overall Critical Improvements
    improvements.forEach((item: any) => addRec(item, 'Overall', 'Reviewer Agent', 'HIGH IMPACT (+5 pts)'));

    // 2. Strategy Action Items
    (strategyReview.action_items || []).forEach((item: any) => addRec(item, 'Strategy', 'Strategy Agent'));

    // 3. Copywriter Action Items & Issues
    (copyReview.action_items || []).forEach((item: any) => addRec(item, 'Copywriting', 'Copywriter Agent'));
    (copyReview.issues || []).forEach((item: any) => addRec(item, 'Copywriting', 'Copywriter Agent', 'HIGH IMPACT (+5 pts)'));

    // 4. Research Action Items
    (researchReview.action_items || []).forEach((item: any) => addRec(item, 'Research', 'Research Agent'));
    (researchReview.issues || []).forEach((item: any) => addRec(item, 'Research', 'Research Agent'));

    // 5. Visuals Action Items
    (imageReview.action_items || []).forEach((item: any) => addRec(item, 'Visuals', 'Image Agent'));

    // Fallback default suggestions if backend data is minimal
    if (recs.length === 0) {
      addRec('Emphasize specific price-point advantages across primary headlines to strengthen value proposition.', 'Strategy', 'Strategy Agent', 'HIGH IMPACT (+5 pts)');
      addRec('Incorporate platform-specific CTA triggers tailored for high-intent mobile users.', 'Copywriting', 'Copywriter Agent', 'MEDIUM IMPACT (+3 pts)');
      addRec('Ensure visual assets specify camera lighting parameters for realistic D2C texture rendering.', 'Visuals', 'Image Agent', 'QUICK WIN');
    }

    return recs;
  }, [improvements, strategyReview, copyReview, researchReview, imageReview]);

  const filteredRecs = useMemo(() => {
    if (activeCategory === 'ALL') return actionableRecs;
    return actionableRecs.filter((r) => r.category.toUpperCase() === activeCategory.toUpperCase());
  }, [actionableRecs, activeCategory]);

  const toggleRecComplete = (id: string) => {
    setCompletedRecs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const agentConfigs = [
    {
      key: 'research',
      title: 'Research Agent',
      subtitle: 'Market Intelligence',
      icon: <BookOpen size={16} color="#0EA5E9" />,
      accentColor: '#0EA5E9',
      rev: researchReview,
      weight: '25%',
    },
    {
      key: 'strategy',
      title: 'Strategy Agent',
      subtitle: 'Campaign Architecture',
      icon: <Layers size={16} color="#6366F1" />,
      accentColor: '#6366F1',
      rev: strategyReview,
      weight: '30%',
    },
    {
      key: 'copy',
      title: 'Copywriter Agent',
      subtitle: 'Copy Quality & Specificity',
      icon: <FileText size={16} color="#8B5CF6" />,
      accentColor: '#8B5CF6',
      rev: copyReview,
      weight: '25%',
    },
    {
      key: 'image',
      title: 'Image Agent',
      subtitle: 'Visual Prompt Quality',
      icon: <Image size={16} color="#EC4899" />,
      accentColor: '#EC4899',
      rev: imageReview,
      weight: '20%',
    },
  ];

  if (!hasRealData && !reviewScore) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#111118] border border-[#2A2A38] flex items-center justify-center">
          <Shield size={28} color="#8B8B9E" />
        </div>
        <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
          Review data unavailable. The AI Review Agent will populate this section upon completion.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Header ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-[#2A2A38] p-5 md:p-6" style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/25 flex items-center justify-center">
              <Shield size={20} color="#818CF8" />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                AI Campaign Quality Review
              </h2>
              <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                Multi-agent quality assurance across research, strategy, copy & visuals
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reviewedAt && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A2A38] bg-[#111118]">
                <Clock size={11} color="#8B8B9E" />
                <span className="text-[11px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                  {formatDate(reviewedAt)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#2A2A38] bg-[#111118]">
              <User size={11} color="#8B8B9E" />
              <span className="text-[11px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                {reviewer}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Verdict Banner ──────────────────────────────────────────────── */}
      {canPublish != null && (
        <div
          className="relative overflow-hidden rounded-2xl border p-5 flex items-center gap-4"
          style={{
            background: canPublish ? 'linear-gradient(135deg, rgba(78,222,163,0.08), rgba(16,185,129,0.03))' : 'linear-gradient(135deg, rgba(244,63,94,0.08), rgba(239,68,68,0.03))',
            borderColor: canPublish ? 'rgba(78,222,163,0.25)' : 'rgba(244,63,94,0.25)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${canPublish ? '#4edea3' : '#F43F5E'}, transparent)` }} />
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: canPublish ? 'rgba(78,222,163,0.15)' : 'rgba(244,63,94,0.15)' }}
          >
            {canPublish
              ? <CheckCircle size={24} color="#4edea3" />
              : <AlertCircle size={24} color="#F43F5E" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              {canPublish ? 'Campaign Cleared for Publication' : 'Campaign Requires Revision'}
            </p>
            <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#9090A8' }}>
              {canPublish
                ? 'All quality thresholds passed. This campaign is ready for human review and deployment.'
                : 'One or more quality thresholds not met. Review agent-specific feedback below before proceeding.'}
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-full font-bold text-sm flex-shrink-0"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              background: canPublish ? 'rgba(78,222,163,0.15)' : 'rgba(244,63,94,0.15)',
              color: canPublish ? '#4edea3' : '#F43F5E',
              border: `1px solid ${canPublish ? 'rgba(78,222,163,0.3)' : 'rgba(244,63,94,0.3)'}`,
            }}
          >
            {canPublish ? '✓ PUBLISH READY' : '✗ REVISE'}
          </div>
        </div>
      )}

      {/* ── 3. Score Hero ──────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Big Score */}
        <div
          className="w-full lg:w-64 shrink-0 rounded-2xl border p-6 flex flex-col items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)', borderColor: c.border, minHeight: 220 }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 50%, ${c.glow} 0%, transparent 70%)`, opacity: 0.15 }} />
          <span className="text-[10px] uppercase tracking-widest mb-4" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
            Overall Score
          </span>
          <div className="relative">
            <ScoreRing score={displayScore} size={120} stroke={9} color={c.text} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-black leading-none" style={{ fontFamily: 'Inter, sans-serif', color: c.text, textShadow: `0 0 20px ${c.glow}` }}>
                {displayScore}
              </span>
              <span className="text-sm opacity-50" style={{ fontFamily: 'Inter, sans-serif', color: c.text }}>/100</span>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
            <Zap size={11} style={{ color: c.text }} />
            <span className="text-[10px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: c.text }}>
              {label(displayScore)}
            </span>
          </div>
        </div>

        {/* Summary + Thresholds */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Summary */}
          {overall.summary && (
            <div className="rounded-2xl border border-[#2A2A38] p-5" style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} color="#6366F1" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Executive Summary</h3>
              </div>
              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D8', lineHeight: 1.7 }}>
                {overall.summary}
              </p>
            </div>
          )}

          {/* Thresholds */}
          {(overallThreshold != null || individualThreshold != null) && (
            <div className="rounded-2xl border border-[#2A2A38] p-5" style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)' }}>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 size={16} color="#8B8B9E" />
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Quality Thresholds</h3>
              </div>
              {overallThreshold != null && (
                <ThresholdRow
                  label="Overall Quality Threshold (≥75)"
                  met={overallThreshold}
                  detail={overallThreshold ? `${displayScore}/100 ✓` : `${displayScore}/100 ✗`}
                />
              )}
              {individualThreshold != null && (
                <ThresholdRow
                  label="All Agents Above Minimum Threshold (≥70)"
                  met={individualThreshold}
                  detail={individualThreshold ? 'All passed' : 'Some failed'}
                />
              )}
              {canPublish != null && (
                <ThresholdRow
                  label="Publication Clearance"
                  met={canPublish}
                  detail={canPublish ? 'Ready to publish' : 'Blocked'}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Agent Score Cards ────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Eye size={16} color="#8B8B9E" />
          <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
            Per-Agent Breakdown
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agentConfigs.map((cfg) => (
            <AgentCard
              key={cfg.key}
              title={cfg.title}
              subtitle={cfg.subtitle}
              icon={cfg.icon}
              accentColor={cfg.accentColor}
              score={toHundred(cfg.rev.score)}
              approved={cfg.rev.approved}
              feedback={cfg.rev.feedback || ''}
              issues={cfg.rev.issues || []}
              actionItems={cfg.rev.action_items || []}
              weight={cfg.weight}
            />
          ))}
        </div>

        {/* Hook Matrix — special handling (may have no LLM review) */}
        <div className="mt-4">
          <div
            className="relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.005]"
            style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)', borderColor: hookReview.score ? 'rgba(236,72,153,0.25)' : 'rgba(42,42,56,0.8)' }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #EC4899, transparent)' }} />
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(236,72,153,0.12)', border: '1px solid rgba(236,72,153,0.25)' }}>
                  <TrendingUp size={16} color="#EC4899" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Creative Hook Matrix Agent</h4>
                  <span className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>Hook Diversity & Psychological Angles</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hookCount > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.2)' }}>
                    <span className="text-[11px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#EC4899' }}>
                      {hookCount} hooks generated
                    </span>
                  </div>
                )}
                {hookReview.approved != null && (
                  <div
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      background: hookReview.approved ? 'rgba(78,222,163,0.12)' : 'rgba(244,63,94,0.12)',
                      color: hookReview.approved ? '#4edea3' : '#F43F5E',
                      border: `1px solid ${hookReview.approved ? 'rgba(78,222,163,0.25)' : 'rgba(244,63,94,0.25)'}`,
                    }}
                  >
                    {hookReview.approved ? <CheckCircle size={9} /> : <XCircle size={9} />}
                    {hookReview.approved ? 'PASSED' : 'FAILED'}
                  </div>
                )}
              </div>
            </div>

            {resolvedHookScore !== null ? (
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <ScoreRing score={resolvedHookScore} size={64} stroke={5} color="#EC4899" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-base font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#EC4899' }}>{resolvedHookScore}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D0' }}>
                    {hookReview.feedback || `${hookCount} creative hooks generated across psychological angles.`}
                  </p>
                  {toHundred(hookReview.score) === null && (
                    <span className="text-[10px] text-[#EC4899] block mt-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                      (Derived from {hookCount} generated hooks)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>Hook matrix was not run for this campaign.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. NEW: Actionable AI Prescriptions & Optimization Hub ────────────── */}
      <div className="rounded-2xl border border-[#2A2A38] p-5 md:p-6" style={{ background: 'linear-gradient(145deg, #0A0A14, #111118)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#1A1A28]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/25 flex items-center justify-center">
              <Sparkles size={18} color="#F59E0B" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                Strategic Action Plan & AI Prescriptions
              </h3>
              <p className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                Prioritized optimization recommendations derived from multi-agent review
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} color="#8B8B9E" className="mr-1 hidden md:inline-block" />
            {['ALL', 'STRATEGY', 'COPYWRITING', 'VISUALS'].map((cat) => {
              const isActive = activeCategory === cat;
              const count = cat === 'ALL' ? actionableRecs.length : actionableRecs.filter(r => r.category.toUpperCase() === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  style={{
                    fontFamily: 'JetBrains Mono, monospace',
                    background: isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                    color: isActive ? '#818CF8' : '#8B8B9E',
                    border: `1px solid ${isActive ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <span>{cat}</span>
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Prescription Cards Grid */}
        <div className="space-y-3">
          {filteredRecs.length > 0 ? (
            filteredRecs.map((rec) => {
              const isChecked = completedRecs[rec.id];
              return (
                <div
                  key={rec.id}
                  className="group rounded-xl p-4 transition-all duration-200 border flex flex-col md:flex-row md:items-center justify-between gap-4"
                  style={{
                    background: isChecked ? 'rgba(16,185,129,0.03)' : 'rgba(255,255,255,0.02)',
                    borderColor: isChecked ? 'rgba(78,222,163,0.3)' : 'rgba(255,255,255,0.07)',
                    opacity: isChecked ? 0.65 : 1,
                  }}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      onClick={() => toggleRecComplete(rec.id)}
                      className="mt-0.5 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                      title={isChecked ? "Mark as pending" : "Mark as completed"}
                    >
                      {isChecked ? (
                        <CheckSquare size={18} color="#4edea3" />
                      ) : (
                        <Square size={18} color="#8B8B9E" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase"
                          style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            background: `${rec.impactColor}15`,
                            color: rec.impactColor,
                            border: `1px solid ${rec.impactColor}30`,
                          }}
                        >
                          {rec.impact}
                        </span>
                        <span className="text-[11px] font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
                          [{rec.agentName}]
                        </span>
                      </div>
                      <p className={`text-sm leading-relaxed ${isChecked ? 'line-through opacity-70' : ''}`} style={{ fontFamily: 'Inter, sans-serif', color: '#E0E0F0' }}>
                        {rec.prescription}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                    <button
                      onClick={() => toggleRecComplete(rec.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        background: isChecked ? 'rgba(78,222,163,0.1)' : 'rgba(255,255,255,0.05)',
                        color: isChecked ? '#4edea3' : '#C0C0D0',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <span>{isChecked ? 'Addressed' : 'Acknowledge'}</span>
                      <ArrowUpRight size={13} className="opacity-60" />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              No specific recommendations found for category "{activeCategory}".
            </div>
          )}
        </div>
      </div>

      {/* ── 6. Strengths + Improvements ─────────────────────────────────────── */}
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          {strengths.length > 0 && (
            <div className="rounded-2xl border border-[#2A2A38] p-5 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #080F1C, #0D0D1A)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #0EA5E9, transparent)' }} />
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#1A1A28]">
                <div className="w-7 h-7 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center">
                  <Award size={15} color="#0EA5E9" />
                </div>
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Core Strengths</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {strengths.length}
                </span>
              </div>
              <ul className="space-y-3">
                {strengths.map((s: any, i: number) => (
                  <li key={i} className="flex items-start gap-3 group">
                    <div className="w-5 h-5 rounded-full bg-[#0EA5E9]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={11} color="#0EA5E9" />
                    </div>
                    <span className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D8' }}>
                      {typeof s === 'string' ? s : s.text || s.description || JSON.stringify(s)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {improvements.length > 0 && (
            <div className="rounded-2xl border border-[#2A2A38] p-5 relative overflow-hidden" style={{ background: 'linear-gradient(145deg, #130A0D, #0D0D1A)' }}>
              <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, #F43F5E, transparent)' }} />
              <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#1A1A28]">
                <div className="w-7 h-7 rounded-lg bg-[#F43F5E]/10 flex items-center justify-center">
                  <AlertCircle size={15} color="#F43F5E" />
                </div>
                <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Areas for Refinement</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/20" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                  {improvements.length}
                </span>
              </div>
              <ul className="space-y-3">
                {improvements.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#F43F5E]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ChevronRight size={11} color="#F43F5E" />
                    </div>
                    <span className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D8' }}>
                      {typeof item === 'string' ? item : item.text || item.description || JSON.stringify(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 7. Score Distribution Bar Chart ──────────────────────────────────── */}
      {(researchReview.score || strategyReview.score || copyReview.score || imageReview.score) && (
        <div className="rounded-2xl border border-[#2A2A38] p-5" style={{ background: 'linear-gradient(145deg, #0D0D1A, #111118)' }}>
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={16} color="#8B8B9E" />
            <h3 className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Score Distribution</h3>
          </div>
          <div className="space-y-3">
            {[
              { name: 'Research', score: toHundred(researchReview.score), color: '#0EA5E9', weight: 25 },
              { name: 'Strategy', score: toHundred(strategyReview.score), color: '#6366F1', weight: 30 },
              { name: 'Copywriter', score: toHundred(copyReview.score), color: '#8B5CF6', weight: 25 },
              { name: 'Hook Matrix', score: resolvedHookScore, color: '#F43F5E', weight: 0 },
              { name: 'Visuals', score: toHundred(imageReview.score), color: '#EC4899', weight: 20 },
            ].map((row) => {
              if (!row.score) return null;
              const rc = scoreColor(row.score);
              return (
                <div key={row.name} className="flex items-center gap-3">
                  <span className="w-20 text-right text-xs flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>
                    {row.name}
                  </span>
                  <div className="flex-1 h-2.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${row.score}%`, background: `linear-gradient(90deg, ${row.color}80, ${row.color})` }}
                    />
                  </div>
                  <span className="w-10 text-xs font-bold flex-shrink-0" style={{ fontFamily: 'JetBrains Mono, monospace', color: rc.text }}>
                    {row.score}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1A1A28] flex items-center justify-between">
            <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              Weighted composite score
            </span>
            <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: c.text }}>
              {displayScore}/100
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(ReviewContent);
