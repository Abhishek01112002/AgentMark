import React, { useMemo, useState } from 'react';
import {
  Shield, CheckCircle, AlertCircle, Award, Activity,
  Clock, Zap, Eye, FileText, Image as ImageIcon,
  TrendingUp, ChevronRight, XCircle, BookOpen, Layers,
  Sparkles, ArrowUpRight, CheckSquare, Square,
  Target, Brain, ArrowRight, BarChart,
  Gauge, FlaskConical, Wand2, Flame,
  MessageSquare, ChevronDown, ChevronUp
} from 'lucide-react';

interface ReviewContentProps {
  data?: any;
  reviewScore?: number | null;
  campaignOutputs?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toHundred = (v: any): number | null => {
  if (v == null) return null;
  const n = Number(v);
  if (isNaN(n) || n <= 0) return null;
  return n <= 10 ? Math.round(n * 10) : Math.round(n);
};

const getStatusColor = (score: number) => {
  if (score >= 80) return 'text-[#4edea3]';
  if (score >= 65) return 'text-amber-400';
  return 'text-red-400';
};
const getStatusBg = (score: number) => {
  if (score >= 80) return 'bg-[#4edea3]/10';
  if (score >= 65) return 'bg-amber-500/10';
  return 'bg-red-500/10';
};
const getStatusBorder = (score: number) => {
  if (score >= 80) return 'border-[#4edea3]/20';
  if (score >= 65) return 'border-amber-500/20';
  return 'border-red-500/20';
};

const scoreLabel = (s: number) => {
  if (s >= 92) return 'EXCEPTIONAL';
  if (s >= 82) return 'HIGH QUALITY';
  if (s >= 72) return 'ABOVE AVERAGE';
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

// ─── Premium Components ───────────────────────────────────────────────────────

const MetricPill: React.FC<{
  icon: React.ReactNode; label: string; value: string; active?: boolean;
}> = ({ icon, label, value, active }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
    <div className={`flex-shrink-0 ${active ? 'text-[#22D3EE]' : 'text-gray-400'}`}>
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-semibold tracking-wider text-gray-500 uppercase font-sans">{label}</div>
      <div className="text-sm font-semibold text-gray-200 truncate font-sora">{value}</div>
    </div>
  </div>
);

const ScoreBar: React.FC<{
  label: string; score: number | null; weight: number; icon: React.ReactNode
}> = ({ label, score, weight, icon }) => {
  if (!score) return null;
  const colorClass = getStatusColor(score);
  
  return (
    <div className="group flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
      <div className="flex items-center gap-3 w-36 flex-shrink-0">
        <div className="text-gray-400">
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-300 font-sans">
          {label}
        </span>
      </div>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-white/5">
        <div
          className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 w-24 justify-end">
        <span className={`text-sm font-semibold tabular-nums font-mono ${colorClass}`}>
          {score}
        </span>
        {weight > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-gray-500 font-mono">
            {weight}%
          </span>
        )}
      </div>
    </div>
  );
};

interface AgentCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  score: number | null;
  approved: boolean | undefined;
  feedback: string;
  issues?: string[];
  actionItems?: string[];
  weight?: string;
}

const AgentCard: React.FC<AgentCardProps> = ({
  title, subtitle, icon, score, approved, feedback, issues = [], actionItems = [], weight
}) => {
  const [expanded, setExpanded] = useState(false);
  const norm = score != null ? toHundred(score) : null;
  const colorClass = norm != null ? getStatusColor(norm) : 'text-gray-500';
  const bgClass = norm != null ? getStatusBg(norm) : 'bg-gray-500/10';
  const borderClass = norm != null ? getStatusBorder(norm) : 'border-gray-500/20';
  const lbl = norm != null ? scoreLabel(norm) : null;
  const hasDetails = feedback || issues.length > 0 || actionItems.length > 0;

  return (
    <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bgClass} ${borderClass}`}>
            <div className={colorClass}>{icon}</div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-100 font-sora">
              {title}
            </h4>
            <span className="text-xs text-gray-500 font-sans">
              {subtitle}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {approved != null && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono ${approved ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {approved ? <CheckCircle size={10} /> : <XCircle size={10} />}
              {approved ? 'PASSED' : 'FAILED'}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            {lbl ? (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider font-mono ${bgClass} ${colorClass}`}>
                {lbl}
              </span>
            ) : <span />}
            
            {norm != null ? (
              <div className="text-right font-mono">
                <span className={`text-xl font-bold tabular-nums ${colorClass}`}>
                  {norm}
                </span>
                <span className="text-xs text-gray-500 ml-1">/100</span>
              </div>
            ) : (
              <span className="text-sm font-medium text-gray-500 font-sans">N/A</span>
            )}
          </div>
          
          {norm != null && (
            <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/5">
              <div
                className={`h-full rounded-full ${colorClass.replace('text-', 'bg-')}`}
                style={{ width: `${norm}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {issues.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          <AlertCircle size={12} className="text-red-400" />
          <span className="text-xs font-semibold text-red-400 font-sans">
            {issues.length} issue{issues.length !== 1 ? 's' : ''} found
          </span>
        </div>
      )}

      {hasDetails && (
        <button
          onClick={() => setExpanded(x => !x)}
          className={`flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-gray-300 font-sans ${colorClass}`}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'Hide details' : 'View details'}
        </button>
      )}

      {expanded && hasDetails && (
        <div className="mt-4 pt-4 border-t border-white/[0.04] space-y-4">
          {feedback && (
            <div className="rounded-xl p-4 bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-start gap-3">
                <MessageSquare size={14} className={`mt-0.5 flex-shrink-0 ${colorClass}`} />
                <p className="text-sm text-gray-300 font-sans leading-relaxed">
                  {feedback}
                </p>
              </div>
            </div>
          )}
          {issues.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-400 font-sora">
                Issues Found
              </p>
              {issues.map((issue, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl p-3 bg-red-500/5 border border-red-500/10">
                  <XCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
                  <span className="text-sm text-red-300 font-sans leading-relaxed">{issue}</span>
                </div>
              ))}
            </div>
          )}
          {actionItems.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 font-sora">
                Action Items
              </p>
              {actionItems.map((item, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl p-3 bg-amber-500/5 border border-amber-500/10">
                  <ArrowRight size={14} className="mt-0.5 flex-shrink-0 text-amber-400" />
                  <span className="text-sm text-amber-300 font-sans leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ThresholdRow: React.FC<{ label: string; met: boolean; detail: string; description?: string }> = ({
  label, met, detail, description
}) => (
  <div className="flex items-center justify-between py-3.5 border-b border-white/[0.04] last:border-0 group">
    <div className="flex items-center gap-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${met ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-red-500/10 text-red-400'}`}>
        {met ? <CheckCircle size={14} /> : <XCircle size={14} />}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-200 font-sans">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5 font-sans">{description}</p>}
      </div>
    </div>
    <span className={`text-xs font-bold px-2.5 py-1 rounded-md font-mono ${met ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
      {detail}
    </span>
  </div>
);

interface ActionableRec {
  id: string;
  category: 'Strategy' | 'Copywriting' | 'Research' | 'Visuals' | 'Overall';
  agentName: string;
  impact: 'HIGH IMPACT' | 'MEDIUM IMPACT' | 'QUICK WIN';
  impactColor: string;
  impactBg: string;
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
      try { return JSON.parse(data); } catch { return {}; }
    }
    return data;
  }, [data]);

  const hasRealData = parsedData && Object.keys(parsedData).length > 0;

  const researchReview = parsedData?.research_review || parsedData?.researchReview || {};
  const strategyReview = parsedData?.strategy_review || parsedData?.strategyReview || {};
  const copyReview = parsedData?.copy_review || parsedData?.copyReview || {};
  const hookReview = parsedData?.creative_hook_matrix_review || parsedData?.creativeHookMatrixReview || parsedData?.hook_review || parsedData?.hookReview || {};
  const imageReview = parsedData?.image_review || parsedData?.imageReview || {};
  const overall = parsedData?.overall || {};
  const reviewedAt = parsedData?.reviewed_at || parsedData?.reviewedAt;
  const reviewer = parsedData?.reviewer || 'AgentMark Reviewer';
  const canPublish = parsedData?.can_publish ?? parsedData?.canPublish;
  const overallThreshold = parsedData?.overall_threshold_met ?? parsedData?.overallThresholdMet;
  const individualThreshold = parsedData?.individual_threshold_met ?? parsedData?.individualThresholdMet;

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

  const overallNorm = useMemo(() => {
    const v = parsedData?.overall_quality_score ?? overall?.quality_score ?? parsedData?.quality_score;
    const directScore = toHundred(v);
    if (directScore !== null) return directScore;

    const subReviews = [
      { score: toHundred(researchReview.score), weight: 25 },
      { score: toHundred(strategyReview.score), weight: 30 },
      { score: toHundred(copyReview.score), weight: 25 },
      { score: toHundred(imageReview.score), weight: 20 },
    ];
    let weightedSum = 0, totalWeight = 0;
    for (const item of subReviews) {
      if (item.score !== null && item.score > 0) {
        weightedSum += item.score * item.weight;
        totalWeight += item.weight;
      }
    }
    if (totalWeight > 0) return Math.round(weightedSum / totalWeight);
    return toHundred(reviewScore) ?? null;
  }, [data, overall, reviewScore, researchReview.score, strategyReview.score, copyReview.score, imageReview.score]);

  const displayScore = overallNorm ?? 0;
  const cColor = getStatusColor(displayScore);
  const cBg = getStatusBg(displayScore);
  const lbl = scoreLabel(displayScore);
  const strengths = Array.isArray(overall?.strengths) ? overall.strengths : [];
  const improvements = Array.isArray(overall?.critical_improvements) ? overall.critical_improvements : (Array.isArray(overall?.criticalImprovements) ? overall.criticalImprovements : []);

  // Count passing agents
  const agentScores = [
    toHundred(researchReview.score),
    toHundred(strategyReview.score),
    toHundred(copyReview.score),
    toHundred(imageReview.score),
  ].filter(s => s !== null) as number[];
  const passingAgents = agentScores.filter(s => s >= 70).length;
  const totalAgents = agentScores.length;

  const actionableRecs: ActionableRec[] = useMemo(() => {
    const recs: ActionableRec[] = [];
    let counter = 1;

    const addRec = (
      textRaw: any,
      category: 'Strategy' | 'Copywriting' | 'Research' | 'Visuals' | 'Overall',
      agentName: string,
      defaultImpact: 'HIGH IMPACT' | 'MEDIUM IMPACT' | 'QUICK WIN' = 'MEDIUM IMPACT'
    ) => {
      if (!textRaw) return;
      const str = typeof textRaw === 'string' ? textRaw : textRaw.text || textRaw.description || JSON.stringify(textRaw);
      if (!str || str.length < 5) return;

      const lower = str.toLowerCase();
      let impact: 'HIGH IMPACT' | 'MEDIUM IMPACT' | 'QUICK WIN' = defaultImpact;
      let impactColor = 'text-amber-400';
      let impactBg = 'bg-amber-500/10 border-amber-500/20';

      if (lower.includes('critical') || lower.includes('must') || lower.includes('boost') || lower.includes('conversion')) {
        impact = 'HIGH IMPACT';
        impactColor = 'text-red-400';
        impactBg = 'bg-red-500/10 border-red-500/20';
      } else if (lower.includes('quick') || lower.includes('format') || lower.includes('minor')) {
        impact = 'QUICK WIN';
        impactColor = 'text-[#4edea3]';
        impactBg = 'bg-[#4edea3]/10 border-[#4edea3]/20';
      }

      recs.push({
        id: `rec-${counter++}`,
        category, agentName, impact, impactColor, impactBg,
        title: str.slice(0, 75) + (str.length > 75 ? '…' : ''),
        prescription: str,
      });
    };

    improvements.forEach((item: any) => addRec(item, 'Overall', 'Reviewer Agent', 'HIGH IMPACT'));
    (strategyReview.action_items || strategyReview.actionItems || []).forEach((item: any) => addRec(item, 'Strategy', 'Strategy Agent'));
    (copyReview.action_items || copyReview.actionItems || []).forEach((item: any) => addRec(item, 'Copywriting', 'Copywriter Agent'));
    (copyReview.issues || []).forEach((item: any) => addRec(item, 'Copywriting', 'Copywriter Agent', 'HIGH IMPACT'));
    (researchReview.action_items || researchReview.actionItems || []).forEach((item: any) => addRec(item, 'Research', 'Research Agent'));
    (researchReview.issues || []).forEach((item: any) => addRec(item, 'Research', 'Research Agent'));
    (imageReview.action_items || imageReview.actionItems || []).forEach((item: any) => addRec(item, 'Visuals', 'Image Agent'));

    if (recs.length === 0) {
      addRec('Emphasize specific price-point advantages across primary headlines to strengthen value proposition.', 'Strategy', 'Strategy Agent', 'HIGH IMPACT');
      addRec('Incorporate platform-specific CTA triggers tailored for high-intent mobile users.', 'Copywriting', 'Copywriter Agent', 'MEDIUM IMPACT');
      addRec('Ensure visual assets specify camera lighting parameters for realistic D2C texture rendering.', 'Visuals', 'Image Agent', 'QUICK WIN');
      addRec('Add emotional testimonial hooks sourced from verified customer pain points on G2/Reddit.', 'Research', 'Research Agent', 'MEDIUM IMPACT');
    }

    return recs;
  }, [improvements, strategyReview, copyReview, researchReview, imageReview]);

  const filteredRecs = useMemo(() => {
    if (activeCategory === 'ALL') return actionableRecs;
    return actionableRecs.filter(r => r.category.toUpperCase() === activeCategory.toUpperCase());
  }, [actionableRecs, activeCategory]);

  const categories = ['ALL', 'STRATEGY', 'COPYWRITING', 'RESEARCH', 'VISUALS', 'OVERALL'];

  const agentConfigs = [
    { key: 'research', title: 'Research Agent', subtitle: 'Market Intelligence', icon: <BookOpen size={18} />, rev: researchReview, weight: '25%' },
    { key: 'strategy', title: 'Strategy Agent', subtitle: 'Campaign Architecture', icon: <Layers size={18} />, rev: strategyReview, weight: '30%' },
    { key: 'copy', title: 'Copywriter Agent', subtitle: 'Copy Quality & Specificity', icon: <FileText size={18} />, rev: copyReview, weight: '25%' },
    { key: 'image', title: 'Image Agent', subtitle: 'Visual Prompt Quality', icon: <ImageIcon size={18} />, rev: imageReview, weight: '20%' },
  ];

  // ─── Empty State ────────────────────────────────────────────────────────────
  if (!hasRealData && !reviewScore) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
          <Shield size={24} className="text-gray-400" />
        </div>
        <div className="text-center max-w-xs">
          <p className="text-base font-semibold text-gray-200 mb-2 font-sora">
            Review Pending
          </p>
          <p className="text-sm text-gray-500 font-sans leading-relaxed">
            The AI Review Agent will analyse your campaign across research, strategy, copy & visuals and populate this section upon completion.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">

      {/* ── 1. HERO HEADER ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center">
                <Shield size={20} className="text-[#22D3EE]" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight font-sora text-white">Campaign Quality Review</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans">
              Multi-agent quality assurance across research, strategy, copy & visuals
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {reviewedAt && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <Clock size={12} className="text-gray-400" />
                <span className="text-xs font-mono text-gray-300">
                  {formatDate(reviewedAt)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Brain size={12} className="text-gray-400" />
              <span className="text-xs font-mono text-gray-300">
                {reviewer}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. VERDICT BANNER ─────────────────────────────────────────────────── */}
      {canPublish != null && (
        <div className={`rounded-2xl border p-5 ${canPublish ? 'bg-[#4edea3]/5 border-[#4edea3]/20' : 'bg-red-500/5 border-red-500/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${canPublish ? 'bg-[#4edea3]/10 text-[#4edea3]' : 'bg-red-500/10 text-red-400'}`}>
              {canPublish ? <CheckCircle size={22} /> : <AlertCircle size={22} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base text-gray-100 font-sora mb-1">
                {canPublish ? 'Cleared for Publication' : 'Revision Required Before Publishing'}
              </p>
              <p className="text-sm text-gray-400 font-sans leading-relaxed">
                {canPublish
                  ? 'All quality thresholds passed. This campaign meets the standard for human review and deployment to live audiences.'
                  : 'One or more quality thresholds were not met. Review the agent-specific feedback below and address identified issues before proceeding.'}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-xs font-mono flex-shrink-0 ${canPublish ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
              {canPublish ? 'PUBLISH READY' : 'REVISE FIRST'}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SCORE HERO + METRICS GRID ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Big Score Card */}
        <div className="lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-8 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
          {/* Subtle atmospheric glow based on score */}
          <div className={`absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20 blur-[80px] pointer-events-none ${cColor}`} style={{ backgroundColor: 'currentColor' }} />
          <div className={`absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-10 blur-[80px] pointer-events-none ${cColor}`} style={{ backgroundColor: 'currentColor' }} />
          
          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="flex items-center gap-2 mb-8">
              <div className={`w-2 h-2 rounded-full animate-pulse ${cColor}`} style={{ backgroundColor: 'currentColor' }} />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 font-sans">
                Overall Quality Score
              </p>
            </div>
            
            <div className="flex items-baseline justify-center mb-8 relative">
              <span className={`text-[6rem] leading-none font-black tabular-nums tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-500 drop-shadow-lg`}>
                {displayScore}
              </span>
              <span className="text-2xl text-gray-600 font-medium ml-2 font-sora">/100</span>
            </div>
            
            <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-6" />

            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-md shadow-sm`}>
              <div className={`w-1.5 h-1.5 rounded-full ${cColor}`} style={{ backgroundColor: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
              <span className={`text-[11px] font-semibold tracking-[0.2em] uppercase font-sora ${cColor}`}>
                {lbl}
              </span>
            </div>
          </div>
        </div>

        {/* Right column: KPI metrics + summary */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* KPI Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <MetricPill
              icon={<Target size={16} />}
              label="Overall"
              value={`${displayScore}/100`}
              active={true}
            />
            <MetricPill
              icon={<CheckCircle size={16} />}
              label="Agents Passing"
              value={`${passingAgents}/${totalAgents}`}
            />
            <MetricPill
              icon={<Flame size={16} />}
              label="Prescriptions"
              value={`${actionableRecs.length} items`}
            />
            <MetricPill
              icon={<Sparkles size={16} />}
              label="Hook Count"
              value={hookCount > 0 ? `${hookCount} hooks` : 'N/A'}
            />
          </div>

          {/* Executive Summary */}
          {overall.summary && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Activity size={16} className="text-indigo-400" />
                </div>
                <h3 className="text-base font-semibold text-white font-sora">
                  Executive Summary
                </h3>
              </div>
              <p className="text-sm text-gray-300 font-sans leading-relaxed">
                {overall.summary}
              </p>
            </div>
          )}

          {/* Thresholds */}
          {(overallThreshold != null || individualThreshold != null || canPublish != null) && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center">
                  <Gauge size={16} className="text-gray-300" />
                </div>
                <h3 className="text-base font-semibold text-white font-sora">
                  Quality Thresholds
                </h3>
              </div>
              <div className="flex flex-col">
                {overallThreshold != null && (
                  <ThresholdRow
                    label="Overall Quality Threshold"
                    description="Minimum score of 75 required"
                    met={overallThreshold}
                    detail={`${displayScore}/100`}
                  />
                )}
                {individualThreshold != null && (
                  <ThresholdRow
                    label="Individual Agent Minimums"
                    description="All agents must score ≥ 70"
                    met={individualThreshold}
                    detail={individualThreshold ? 'All passed' : 'Some failed'}
                  />
                )}
                {canPublish != null && (
                  <ThresholdRow
                    label="Publication Clearance"
                    description="Both thresholds must pass"
                    met={canPublish}
                    detail={canPublish ? 'Ready' : 'Blocked'}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>



      {/* ── 6. STRENGTHS & IMPROVEMENTS ─────────────────────────────────────── */}
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {strengths.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/[0.04]">
                <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/20 flex items-center justify-center">
                  <Award size={18} className="text-[#22D3EE]" />
                </div>
                <h3 className="text-base font-semibold text-white font-sora flex-1">
                  Core Strengths
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md font-mono bg-[#06B6D4]/10 text-[#22D3EE] border border-[#06B6D4]/20">
                  {strengths.length}
                </span>
              </div>
              <ul className="space-y-3">
                {strengths.map((s: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-[#06B6D4]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle size={12} className="text-[#22D3EE]" />
                    </div>
                    <span className="text-sm text-gray-300 font-sans leading-relaxed">
                      {typeof s === 'string' ? s : s.text || s.description || JSON.stringify(s)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {improvements.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
              <div className="flex items-center gap-3 mb-5 pb-5 border-b border-white/[0.04]">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <AlertCircle size={18} className="text-red-400" />
                </div>
                <h3 className="text-base font-semibold text-white font-sora flex-1">
                  Areas for Refinement
                </h3>
                <span className="text-xs font-bold px-2.5 py-1 rounded-md font-mono bg-red-500/10 text-red-400 border border-red-500/20">
                  {improvements.length}
                </span>
              </div>
              <ul className="space-y-3">
                {improvements.map((item: any, i: number) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ChevronRight size={12} className="text-red-400" />
                    </div>
                    <span className="text-sm text-gray-300 font-sans leading-relaxed">
                      {typeof item === 'string' ? item : item.text || item.description || JSON.stringify(item)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── 7. STRATEGIC ACTION PLAN ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl mt-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6 pb-6 border-b border-white/[0.04]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Wand2 size={20} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white font-sora">
                Strategic Action Plan
              </h3>
              <p className="text-sm text-gray-400 font-sans mt-0.5">
                Prioritised prescriptions from the multi-agent review engine
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(cat => {
              const isActive = activeCategory === cat;
              const count = cat === 'ALL'
                ? actionableRecs.length
                : actionableRecs.filter(r => r.category.toUpperCase() === cat).length;
              if (cat !== 'ALL' && count === 0) return null;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all duration-200 flex items-center gap-1.5 font-sans ${isActive ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'bg-white/[0.02] text-gray-400 border border-white/[0.04] hover:bg-white/[0.05]'}`}
                >
                  {cat}
                  <span className="opacity-60 text-[10px]">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {filteredRecs.length > 0 ? filteredRecs.map(rec => {
            const isChecked = completedRecs[rec.id];
            return (
              <div
                key={rec.id}
                className={`group rounded-xl p-5 transition-all duration-200 border ${isChecked ? 'bg-[#4edea3]/5 border-[#4edea3]/20 opacity-60' : 'bg-white/[0.02] border-white/[0.04] hover:border-white/[0.08]'}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => setCompletedRecs(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                    className="mt-1 flex-shrink-0 transition-colors hover:scale-110"
                  >
                    {isChecked
                      ? <CheckSquare size={20} className="text-[#4edea3]" />
                      : <Square size={20} className="text-gray-500 hover:text-gray-400" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${rec.impactColor}`} style={{ backgroundColor: 'currentColor', boxShadow: '0 0 6px currentColor' }} />
                        <span className={`text-[10px] font-bold uppercase tracking-widest font-sora ${rec.impactColor}`}>
                          {rec.impact}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                        <Brain size={10} className="text-indigo-400/80" />
                        <span className="text-[10px] font-medium text-gray-300 font-sans">
                          {rec.agentName}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-gray-400 border border-white/[0.06] font-mono">
                        {rec.category}
                      </span>
                    </div>
                    <p className={`text-sm font-sans leading-relaxed ${isChecked ? 'line-through text-gray-500' : 'text-gray-300'}`}>
                      {rec.prescription}
                    </p>
                  </div>
                  <button
                    onClick={() => setCompletedRecs(prev => ({ ...prev, [rec.id]: !prev[rec.id] }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 transition-all font-sans ${isChecked ? 'bg-[#4edea3]/10 text-[#4edea3] border border-[#4edea3]/20' : 'bg-white/[0.04] text-gray-400 border border-white/[0.08] hover:bg-white/[0.08]'}`}
                  >
                    {isChecked ? 'Done' : 'Mark Done'}
                    <ArrowUpRight size={14} className="opacity-60" />
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="py-16 text-center">
              <FlaskConical size={32} className="text-gray-600 mx-auto mb-4" />
              <p className="text-sm text-gray-400 font-sans">
                No prescriptions for "{activeCategory}"
              </p>
            </div>
          )}
        </div>

        {actionableRecs.length > 0 && (
          <div className="mt-8 pt-5 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs text-gray-400 font-sans">
              {Object.values(completedRecs).filter(Boolean).length} of {actionableRecs.length} addressed
            </span>
            <div className="flex items-center gap-3">
              <div className="w-32 h-1.5 rounded-full overflow-hidden bg-white/5">
                <div
                  className="h-full rounded-full bg-[#4edea3]"
                  style={{
                    width: `${(Object.values(completedRecs).filter(Boolean).length / actionableRecs.length) * 100}%`,
                    transition: 'width 0.4s ease'
                  }}
                />
              </div>
              <span className="text-xs font-bold tabular-nums font-mono text-[#4edea3]">
                {Math.round((Object.values(completedRecs).filter(Boolean).length / actionableRecs.length) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default React.memo(ReviewContent);
