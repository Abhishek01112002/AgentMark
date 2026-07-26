import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PersonaRubric {
  clarity: number;
  trust: number;
  value: number;
  urgency: number;
}

interface PersonaCritique {
  persona_id: string;
  resonance_score: number;
  objection: string;
  clash_quote: string;
  click_intent: boolean;
  verdict: string;
  rubric?: PersonaRubric;
}

interface ActionableRecommendation {
  target_channel: string;
  friction_identified: string;
  suggested_revision: string;
}

interface PersonaProfile {
  id: string;
  name: string;
  age: number;
  occupation: string;
  income_bracket: string;
  buying_barriers: string[];
  trust_triggers: string[];
  cognitive_profile: string;
}

interface GatedReadiness {
  passed_gates: boolean;
  trust_score: number;
  evidence_score?: number;
  persona_perception_score?: number;
  cognitive_load?: number;
  failed_reasons?: string[];
}

interface DevilsAdvocateIssue {
  issue: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  evidence: string;
  recommended_fix: string;
}

interface DecisionExplanation {
  positive_drivers?: string[];
  negative_drivers?: string[];
  detected_signals?: string[];
  recommendations?: string[];
  confidence_factors?: string[];
  confidence_score?: number;
}

export interface TrustSignalAnalysis {
  verified_claims?: string[];
  missing_proofs?: string[];
  risk_level?: "LOW" | "MEDIUM" | "HIGH";
  overall_trust_score?: number;
}

export interface ExecutionTelemetry {
  provider?: string;
  model?: string;
  latency_ms?: number;
  tokens_used?: number;
  cost_usd?: number;
  cache_hit?: boolean;
}

export interface MemorySummary {
  historical_objections_recalled?: number;
  applied_brand_directives?: string[];
}

interface FocusGroupReport {
  overall_score: number;
  persona_critiques: PersonaCritique[];
  actionable_recommendations: ActionableRecommendation[];
  personas?: PersonaProfile[];
  gated_readiness?: GatedReadiness;
  devils_advocate_issues?: DevilsAdvocateIssue[];
  decision_explanation?: DecisionExplanation;
  trust_signal_analysis?: TrustSignalAnalysis;
  telemetry?: ExecutionTelemetry;
  memory_summary?: MemorySummary;
}

interface FocusGroupPanelProps {
  report: FocusGroupReport | null;
  copyText: string;
  copies?: Record<string, { headline?: string; body?: string }>;
  targetAudience?: string;
  isLoading?: boolean;
  onRunSimulation?: () => void;
  error?: string | null;
}

// ─── Highlight Segment Types ──────────────────────────────────────────────────

interface HighlightRange {
  start: number;
  end: number;
  critiqueIndex: number;
}

interface TextSegment {
  text: string;
  highlighted: boolean;
  critiqueIndex: number;
}

// ─── Tooltip State ────────────────────────────────────────────────────────────

interface TooltipState {
  x: number;
  y: number;
  personaId: string;
  objection: string;
  verdict: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────



const scoreColor = (score: number): string => {
  if (score < 40) return '#F43F5E';
  if (score < 70) return '#F59E0B';
  return '#4edea3';
};

const accentBar = (color: string) => (
  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
);

const primaryAccent = accentBar('#6366F1');

// ─── Overall Score Gauge ───────────────────────────────────────────────────────

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const [animated, setAnimated] = useState(false);
  const CIRCUMFERENCE = 2 * Math.PI * 48;

  const color = useMemo(() => scoreColor(score), [score]);
  const targetOffset = useMemo(() => CIRCUMFERENCE * (1 - score / 100), [score, CIRCUMFERENCE]);

  useEffect(() => {
    const t = requestAnimationFrame(() => setTimeout(() => setAnimated(true), 50));
    return () => cancelAnimationFrame(t);
  }, [score]);

  const dashOffset = animated ? targetOffset : CIRCUMFERENCE;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={120} height={120} viewBox="0 0 120 120" aria-label={`Overall score: ${score} out of 100`}>
        <circle cx={60} cy={60} r={48} stroke="#2A2A38" strokeWidth={8} fill="none" />
        <circle
          cx={60} cy={60} r={48} stroke={color} strokeWidth={8} fill="none"
          strokeLinecap="round" strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset} transform="rotate(-90, 60, 60)"
          style={{ transition: 'stroke-dashoffset 900ms ease-out, stroke 400ms ease' }}
        />
        <text x={60} y={56} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize={28} fontWeight={700} fontFamily="Sora, sans-serif">{score}</text>
        <text x={60} y={73} textAnchor="middle" dominantBaseline="middle" fill="#8B8B9E" fontSize={12} fontFamily="Sora, sans-serif">/100</text>
      </svg>
      <span className="text-[11px] font-mono text-[#8B8B9E] tracking-wider uppercase">Overall Score</span>
    </div>
  );
};

// ─── Emotional Pulse Bar ───────────────────────────────────────────────────────

interface PulseBarProps {
  resonanceScore: number;
  rubric?: PersonaRubric;
}

const PulseBar: React.FC<PulseBarProps> = ({ resonanceScore, rubric }) => {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 150); return () => clearTimeout(t); }, []);

  const trustVal = rubric?.trust != null ? Math.round((rubric.trust / 5) * 100) : resonanceScore;
  const trustWidth = animated ? `${trustVal}%` : '0%';
  const confusionWidth = animated ? `${(100 - trustVal) * 0.4}%` : '0%';
  const skeptWidth = animated ? `${(100 - trustVal) * 0.6}%` : '0%';

  return (
    <div className="mt-3 bg-[#181826]/80 border border-white/[0.06] rounded-xl p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold text-[#A5B4FC] uppercase tracking-wider">Emotional Pulse Assessment</span>
        <span className="text-[10px] font-mono text-[#94A3B8]">{trustVal}% Trust Metric</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden flex bg-[#0D0D14] p-0.5 border border-white/[0.04]">
        <div className="h-full rounded-full transition-all duration-800 ease-out" style={{ width: trustWidth, backgroundColor: '#4edea3' }} />
        <div className="h-full rounded-full transition-all duration-800 ease-out" style={{ width: confusionWidth, backgroundColor: '#F59E0B' }} />
        <div className="h-full rounded-full transition-all duration-800 ease-out" style={{ width: skeptWidth, backgroundColor: '#F43F5E' }} />
      </div>
      <div className="flex gap-2.5 mt-1 flex-wrap">
        {[
          { color: '#4edea3', label: 'Trust' },
          { color: '#F59E0B', label: 'Confusion' },
          { color: '#F43F5E', label: 'Skepticism' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] px-2.5 py-1 rounded-full">
            <div className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: color }} />
            <span className="text-[11px] font-mono font-medium text-[#E2E8F0]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Persona Card ─────────────────────────────────────────────────────────────

interface PersonaCardProps {
  critique: PersonaCritique;
  index: number;
  copies?: Record<string, { headline?: string; body?: string }>;
}

const PersonaCard: React.FC<PersonaCardProps> = ({ critique, index, copies }) => {
  const color = useMemo(() => scoreColor(critique.resonance_score), [critique.resonance_score]);

  const displayName = useMemo(() =>
    critique.persona_id
      .replace(/[-_]/g, ' ').replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim()
      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    [critique.persona_id]
  );

  const initials = displayName.charAt(0) || 'P';

  const avatarGradient = useMemo(() => {
    const gradients = [
      'linear-gradient(135deg, #6366F1, #4F46E5)',
      'linear-gradient(135deg, #3B82F6, #1D4ED8)',
      'linear-gradient(135deg, #EC4899, #BE185D)',
      'linear-gradient(135deg, #10B981, #047857)',
      'linear-gradient(135deg, #F59E0B, #B45309)',
    ];
    return gradients[displayName.length % gradients.length];
  }, [displayName]);

  const objectionChannel = useMemo(() => {
    if (!copies || !critique.clash_quote) return null;
    const quote = critique.clash_quote.trim().toLowerCase();
    for (const [channel, data] of Object.entries(copies)) {
      if (!data) continue;
      if (`${data.headline ?? ''} ${data.body ?? ''}`.toLowerCase().includes(quote)) return channel;
    }
    const words = quote.split(/\s+/).filter(w => w.length > 4);
    if (!words.length) return null;
    let best: string | null = null;
    let max = 0;
    for (const [channel, data] of Object.entries(copies)) {
      if (!data) continue;
      const text = `${data.headline ?? ''} ${data.body ?? ''}`.toLowerCase();
      const matches = words.filter(w => text.includes(w)).length;
      if (matches > max && matches >= 2) { max = matches; best = channel; }
    }
    return best;
  }, [copies, critique.clash_quote]);

  return (
    <div
      className="card-elevate bg-[#12121A]/95 border border-white/[0.08] rounded-2xl p-6 sm:p-7 flex flex-col gap-6 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl"
      style={{ animation: `fadeIn 0.35s ease both ${index * 80}ms` }}
    >
      {/* Top Hairline Ambient Accent */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px]" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Hero Persona Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#262636]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md ring-1 ring-white/20"
            style={{ background: avatarGradient }}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="m-0 text-lg font-semibold text-[#E2E8F0] truncate font-sora tracking-tight">{displayName}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-[#94A3B8]">Target Buyer Persona</span>
              {objectionChannel && (
                <span className="text-[10px] font-mono font-semibold text-[#A5B4FC] bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-md px-2.5 py-0.5 uppercase tracking-wider">
                  Friction: {objectionChannel}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Intent Badge */}
        <div className="flex items-center">
          <span
            className="text-xs font-mono font-semibold px-3.5 py-1.5 rounded-full border whitespace-nowrap shadow-sm flex items-center gap-1.5"
            style={{
              color: critique.click_intent ? '#4edea3' : '#F43F5E',
              backgroundColor: critique.click_intent ? 'rgba(78,222,163,0.1)' : 'rgba(244,63,94,0.1)',
              borderColor: critique.click_intent ? 'rgba(78,222,163,0.3)' : 'rgba(244,63,94,0.3)',
            }}
          >
            {critique.click_intent ? '✓ Would Click Ad' : '✕ Would Scroll Past'}
          </span>
        </div>
      </div>

      {/* Score & Rubric Hero Metric Box */}
      <div className="relative overflow-hidden rounded-xl p-5 flex flex-col gap-4 border bg-[#161622]/90" style={{ borderColor: `${color}30` }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 shadow-sm" style={{ backgroundColor: `${color}15`, borderColor: `${color}40` }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8]">Resonance Assessment Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold font-sora tracking-tight" style={{ color }}>{critique.resonance_score}</span>
                <span className="text-xs font-mono text-[#94A3B8]">/ 100 Overall Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Primary Buyer Objection Block - Executive Left Accent Quote */}
        {critique.objection && (
          <div className="pt-3 border-t border-[#262636]">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-[#94A3B8] block mb-2">Primary Buyer Objection</span>
            <div className="border-l-3 border-[#6366F1] bg-[#181826]/90 rounded-r-xl p-4 shadow-inner">
              <p className="text-sm text-[#E2E8F0] font-sans leading-relaxed m-0 italic">
                "{critique.objection}"
              </p>
            </div>
          </div>
        )}

        {/* Apple System Sliders Rubric */}
        {critique.rubric && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-3 border-t border-[#262636]">
            {[
              { label: 'Clarity', score: critique.rubric.clarity },
              { label: 'Trust', score: critique.rubric.trust },
              { label: 'Value', score: critique.rubric.value },
              { label: 'Urgency', score: critique.rubric.urgency },
            ].map(({ label, score }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs font-mono text-[#94A3B8]">
                  <span>{label}</span>
                  <span className="font-semibold text-[#E2E8F0]">{score}/5</span>
                </div>
                <div className="h-2 rounded-full bg-[#0D0D14] overflow-hidden p-0.5 border border-white/[0.04]">
                  <div className="h-full rounded-full transition-all duration-600 shadow-sm" style={{ width: `${(score / 5) * 100}%`, backgroundColor: score >= 4 ? '#4edea3' : score >= 3 ? '#F59E0B' : '#F43F5E' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Friction Phrase Highlight Box (Apple Warning Callout Card) */}
      {critique.clash_quote && (
        <div className="bg-amber-500/[0.07] border border-amber-500/25 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <span className="text-xs font-mono font-semibold text-amber-300 uppercase tracking-wider">
                Detected Copy Friction Phrase
              </span>
            </div>
            <span className="text-[11px] font-mono text-[#94A3B8]">
              High-Objection Segment
            </span>
          </div>

          <div className="bg-[#0D0D14]/90 border border-amber-500/15 rounded-lg p-4 shadow-inner">
            <p className="m-0 text-sm text-amber-100 font-sans italic leading-relaxed">
              "{critique.clash_quote}"
            </p>
          </div>
        </div>
      )}

      {/* Detailed Persona Verdict Card */}
      {critique.verdict && (
        <div className="bg-indigo-500/[0.05] border border-indigo-500/20 rounded-xl p-5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-indigo-300">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider">Detailed Persona Verdict</span>
          </div>
          <p className="text-sm text-[#CBD5E1] font-sans leading-relaxed m-0">{critique.verdict}</p>
        </div>
      )}

      {/* Emotional Pulse Footer */}
      <div className="mt-auto pt-2">
        <PulseBar resonanceScore={critique.resonance_score} rubric={critique.rubric} />
      </div>
    </div>
  );
};

// ─── Copy Highlight Overlay ───────────────────────────────────────────────────

interface CopyHighlightOverlayProps {
  copyText: string;
  copies?: Record<string, { headline?: string; body?: string }>;
  critiques: PersonaCritique[];
  onSelectPersona?: (personaIndex: number) => void;
}

const CopyHighlightOverlay: React.FC<CopyHighlightOverlayProps> = ({ copyText, copies, critiques, onSelectPersona }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const channels = useMemo(() => copies ? Object.keys(copies).filter(ch => copies[ch]) : [], [copies]);
  const [selectedChannel, setSelectedChannel] = useState(channels[0] || '');

  useEffect(() => {
    if (channels.length && (!selectedChannel || !channels.includes(selectedChannel)))
      setSelectedChannel(channels[0]);
  }, [channels, selectedChannel]);

  const activeCopyText = useMemo(() => {
    if (copies && selectedChannel && copies[selectedChannel]) {
      const data = copies[selectedChannel];
      return `${data.headline ? data.headline + '\n\n' : ''}${data.body ?? ''}`;
    }
    return copyText;
  }, [copies, selectedChannel, copyText]);

  const segments = useMemo<TextSegment[]>(() => {
    const ranges: HighlightRange[] = [];
    critiques.forEach((critique, ci) => {
      const q = critique.clash_quote?.trim();
      if (!q) return;
      const idx = activeCopyText.indexOf(q);
      if (idx === -1) return;
      ranges.push({ start: idx, end: idx + q.length, critiqueIndex: ci });
    });
    ranges.sort((a, b) => a.start - b.start);
    const clean: HighlightRange[] = [];
    let prevEnd = -1;
    for (const r of ranges) {
      if (r.start < prevEnd) continue;
      clean.push(r);
      prevEnd = r.end;
    }
    const result: TextSegment[] = [];
    let cursor = 0;
    for (const r of clean) {
      if (cursor < r.start) result.push({ text: activeCopyText.slice(cursor, r.start), highlighted: false, critiqueIndex: -1 });
      result.push({ text: activeCopyText.slice(r.start, r.end), highlighted: true, critiqueIndex: r.critiqueIndex });
      cursor = r.end;
    }
    if (cursor < activeCopyText.length) result.push({ text: activeCopyText.slice(cursor), highlighted: false, critiqueIndex: -1 });
    return result;
  }, [activeCopyText, critiques]);

  const hasHighlights = segments.some(s => s.highlighted);

  const getSafeTooltipPosition = useCallback((clientX: number, clientY: number) => {
    let x = clientX + 12, y = clientY + 12;
    if (x + 300 > window.innerWidth) x = clientX - 312;
    if (y + 180 > window.innerHeight) y = clientY - 192;
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    return { x, y };
  }, []);

  const handleMouseEnter = useCallback((e: React.MouseEvent, critique: PersonaCritique) => {
    const pos = getSafeTooltipPosition(e.clientX, e.clientY);
    setTooltip({ x: pos.x, y: pos.y, personaId: critique.persona_id, objection: critique.objection?.slice(0, 120) ?? '', verdict: critique.verdict?.slice(0, 80) ?? '' });
  }, [getSafeTooltipPosition]);

  return (
    <>
      {tooltip && createPortal(
        <div className="fixed z-[9999] pointer-events-none max-w-[320px] bg-[#161622]/95 border border-[#262636] rounded-xl p-4 shadow-[0_16px_40px_rgba(0,0,0,0.7)] backdrop-blur-2xl font-sans text-xs text-[#E2E8F0] leading-relaxed" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="text-[11px] font-mono font-semibold text-[#A5B4FC] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
            {tooltip.personaId.replace(/[-_]/g, ' ')}
          </div>
          {tooltip.objection && <div className="mb-2 text-[#CBD5E1] font-medium">"{tooltip.objection}"</div>}
          {tooltip.verdict && <div className="text-[#94A3B8] italic border-t border-[#262636] pt-1.5 mt-1.5">{tooltip.verdict}</div>}
        </div>,
        document.body
      )}

      <div className="card-elevate bg-[#12121A]/90 border border-[#262636] rounded-2xl overflow-hidden shadow-xl backdrop-blur-xl">
        {primaryAccent}

        {/* Card Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 px-6 py-4 border-b border-[#262636] bg-[#161622]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4M16 16l-4-4-4 4"/></svg>
            </div>
            <div>
              <h3 className="m-0 text-base font-semibold text-[#E2E8F0] font-sora">Copy Friction Analysis</h3>
              <p className="m-0 text-xs text-[#94A3B8] font-sora mt-0.5">Interactive heatmap of persona objections across ad copy channels</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#6366F1]/10 border border-[#6366F1]/20 px-3 py-1 rounded-full text-xs font-mono text-[#A5B4FC]">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
              Hover highlighted text to see objections
            </div>

            <button
              onClick={() => setIsExpanded(v => !v)}
              className="bg-[#181824] border border-[#262636] rounded-lg px-3 py-1.5 font-mono text-xs text-[#94A3B8] cursor-pointer transition-all duration-200 hover:border-[#6366F1]/50 hover:text-[#E2E8F0]"
              aria-expanded={isExpanded}
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-6 flex flex-col gap-5">
            {/* Channel Selection Segmented Control */}
            {channels.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-mono text-[#94A3B8] uppercase tracking-wider">Filter by Ad Channel</span>
                <div className="flex gap-1.5 p-1 bg-[#0D0D14] rounded-xl border border-[#262636] overflow-x-auto">
                  {channels.map(ch => {
                    const isActive = ch === selectedChannel;
                    return (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className={`flex-1 whitespace-nowrap px-4 py-2 rounded-lg border-none text-xs font-semibold capitalize cursor-pointer transition-all duration-200 font-sora ${
                          isActive
                            ? 'bg-[#6366F1] text-white shadow-sm font-semibold'
                            : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/[0.04]'
                        }`}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Ad Copy Text Box - High Readability Proportional Sans-Serif */}
            <div className="bg-[#161622] border border-[#262636] rounded-xl p-5 sm:p-6 font-sans text-sm leading-relaxed text-[#CBD5E1] whitespace-pre-wrap break-words relative">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#262636]">
                <div className="flex items-center gap-2 text-xs font-mono text-[#94A3B8]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="uppercase font-semibold tracking-wider">Copy Content</span>
                </div>
                <span className="text-xs font-mono font-semibold text-[#FBBF24] bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2.5 py-0.5 rounded-full">
                  {segments.filter(s => s.highlighted).length} Friction Point{segments.filter(s => s.highlighted).length !== 1 ? 's' : ''} Detected
                </span>
              </div>

              {segments.map((seg, i) => {
                if (!seg.highlighted) return <span key={i}>{seg.text}</span>;
                const critique = critiques[seg.critiqueIndex];
                const score = critique?.resonance_score ?? 50;

                // Situation & Severity-based Dynamic Highlight Palette
                const highlightStyle = score < 40
                  ? 'bg-[#F43F5E]/15 text-[#FDA4AF] border-b-2 border-[#F43F5E] hover:bg-[#F43F5E]/30'
                  : score < 70
                    ? 'bg-[#F59E0B]/15 text-[#FDE68A] border-b-2 border-[#F59E0B] hover:bg-[#F59E0B]/30'
                    : 'bg-[#6366F1]/15 text-[#C7D2FE] border-b-2 border-[#6366F1] hover:bg-[#6366F1]/30';

                return (
                  <span
                    key={i}
                    className={`${highlightStyle} px-1 py-0.5 rounded-sm cursor-help transition-all duration-150 font-medium`}
                    onClick={() => onSelectPersona?.(seg.critiqueIndex)}
                    onMouseEnter={e => handleMouseEnter(e, critique)}
                    onMouseMove={e => {
                      const pos = getSafeTooltipPosition(e.clientX, e.clientY);
                      setTooltip(prev => prev ? { ...prev, x: pos.x, y: pos.y } : null);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    aria-label={`Friction point: ${critique?.persona_id}`}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </div>

            {!hasHighlights && (
              <div className="p-3.5 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-xs text-[#4edea3] flex items-center gap-2 font-sora">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                No direct friction points identified in this channel's copy.
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

// ─── Premium Loading Experience ─────────────────────────────────────────────

const loadingStages = [
  { label: 'Synthesizing 5 Buyer Persona Profiles', icon: '🧬', completed: true },
  { label: 'Evaluating Copy Friction & Objections', icon: '🎯', completed: true },
  { label: 'Auditing Trust Signals & Claims', icon: '🛡️', completed: false },
  { label: 'Calibrating Empirical Bayes Benchmarks', icon: '📊', completed: false },
];

const LoadingState: React.FC = () => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(12);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; delay: number; duration: number }[]>([]);

  useEffect(() => {
    const p = Array.from({ length: 24 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      delay: Math.random() * 3,
      duration: Math.random() * 4 + 3,
    }));
    setParticles(p);

    const interval = setInterval(() => {
      setStage(s => (s < loadingStages.length - 1 ? s + 1 : s));
    }, 700);

    const progressInterval = setInterval(() => {
      setProgress(prev => (prev < 95 ? prev + Math.floor(Math.random() * 4) + 1 : 95));
    }, 250);

    return () => {
      clearInterval(interval);
      clearInterval(progressInterval);
    };
  }, []);

  const personas = [
    { name: 'Arjun', role: 'Tech Lead', color: '#6366F1' },
    { name: 'Ananya', role: 'VP Growth', color: '#A855F7' },
    { name: 'Ravi', role: 'Finance Dir', color: '#EC4899' },
    { name: 'Kavya', role: 'End User', color: '#38BDF8' },
    { name: 'Vikram', role: 'Risk Officer', color: '#4edea3' },
  ];

  return (
    <div className="relative overflow-hidden bg-[#0A0A12] border border-[#2A2A38] rounded-2xl p-8 md:p-12 flex flex-col items-center justify-center min-h-[560px] shadow-[0_0_50px_rgba(99,102,241,0.08)]">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#2A2A38_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

      {/* Floating Particles */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: 'rgba(129, 140, 248, 0.25)',
            boxShadow: '0 0 10px rgba(129, 140, 248, 0.5)',
            animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      {/* Ambient Neon Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#6366F1]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#A855F7]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }} />

      {/* 🌟 ULTRA-FUTURISTIC HOLOGRAPHIC QUANTUM SPINNER CORE */}
      <div className="relative mb-10 w-48 h-48 flex items-center justify-center">
        {/* Outer Conic Rotating Holographic Glow Ring */}
        <div className="absolute inset-0 rounded-full p-[2px] animate-hologram-rotate" style={{ background: 'conic-gradient(from 0deg, #6366F1, #A855F7, #EC4899, #38BDF8, #4edea3, #6366F1)' }}>
          <div className="w-full h-full bg-[#0A0A12] rounded-full" />
        </div>

        {/* Counter-Rotating Cyber Laser Ring */}
        <div className="absolute inset-2 rounded-full border border-dashed border-[#818CF8]/40 animate-hologram-reverse" />

        {/* Inner Sweeping Radar Beam */}
        <div className="absolute inset-4 rounded-full overflow-hidden animate-radar-sweep opacity-30">
          <div className="w-full h-full bg-gradient-to-tr from-transparent via-[#818CF8]/30 to-[#A855F7]/60" />
        </div>

        {/* 3D Pulsing Glass Core Sphere */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#6366F1] via-[#A855F7] to-[#EC4899] p-[1.5px] shadow-[0_0_40px_rgba(99,102,241,0.6)] animate-pulse-soft flex items-center justify-center">
          <div className="w-full h-full rounded-full bg-[#0E0E18]/90 backdrop-blur-md flex flex-col items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#F1F1F3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter drop-shadow-[0_0_10px_rgba(241,241,243,0.8)]">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <span className="text-[11px] font-mono font-bold text-[#34D399] mt-0.5">{progress}%</span>
          </div>
        </div>

        {/* 👥 ORBITING BUYER PERSONA SYNAPSE BADGES */}
        {personas.map((p, i) => {
          const angle = (i / personas.length) * (2 * Math.PI);
          const radius = 88; // px orbit distance
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          return (
            <div
              key={p.name}
              className="absolute flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#13131F]/90 border border-[#2A2A38] backdrop-blur-md shadow-lg transition-transform duration-500 hover:scale-110"
              style={{
                transform: `translate(${x}px, ${y}px)`,
                boxShadow: `0 0 15px ${p.color}33`,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}` }} />
              <span className="text-[10px] font-mono font-semibold text-[#F1F1F3]">{p.name}</span>
            </div>
          );
        })}
      </div>

      {/* Main Title & Status */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-[#F1F1F3] font-sora flex items-center justify-center gap-2">
          <span>AI Pre-Flight Simulation Running</span>
          <span className="px-2 py-0.5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 text-[10px] font-mono text-[#34D399]">
            Live Neural Stream
          </span>
        </h3>
        <p className="text-xs text-[#8B8B9E] font-sora mb-6 text-center max-w-sm">
          Evaluating copy friction &amp; audit metrics across 5 dynamic buyer personas
        </p>
      </div>

      {/* Live Progress Bar Indicator */}
      <div className="w-full max-w-md mb-6">
        <div className="flex justify-between items-center text-xs font-mono text-[#8B8B9E] mb-1.5">
          <span>Execution Progress</span>
          <span className="text-[#818CF8] font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[#181824] border border-[#2A2A38] overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6366F1] via-[#A855F7] to-[#34D399] transition-all duration-300 shadow-[0_0_12px_rgba(99,102,241,0.5)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Real-Time Processing Stages Matrix */}
      <div className="w-full max-w-md flex flex-col gap-2.5">
        {loadingStages.map((s, i) => {
          const isActive = stage === i;
          const isDone = stage > i;
          return (
            <div
              key={s.label}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-500 ${
                isActive
                  ? 'bg-[#6366F1]/10 border-[#6366F1]/40 shadow-[0_0_20px_rgba(99,102,241,0.15)] scale-[1.01]'
                  : isDone
                    ? 'bg-[#34D399]/5 border-[#34D399]/20'
                    : 'bg-[#111118]/50 border-[#2A2A38]/50 opacity-60'
              }`}
            >
              {/* Status Icon */}
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-mono transition-all duration-500 ${
                isDone
                  ? 'bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/30'
                  : isActive
                    ? 'bg-[#6366F1]/20 text-[#818CF8] border border-[#6366F1]/40'
                    : 'bg-[#181824] text-[#8B8B9E] border border-[#2A2A38]'
              }`}>
                {isDone ? '✓' : s.icon}
              </div>

              {/* Stage Label */}
              <span className={`text-xs font-mono transition-all duration-500 ${
                isDone ? 'text-[#34D399] font-medium' : isActive ? 'text-[#F1F1F3] font-semibold' : 'text-[#8B8B9E]'
              }`}>
                {s.label}
              </span>

              <div className="ml-auto">
                {isActive && (
                  <div className="flex gap-0.5">
                    {[0, 1, 2].map(d => (
                      <div
                        key={d}
                        className="w-1 h-1 rounded-full bg-[#818CF8] animate-bounce-dot"
                        style={{ animationDelay: `${d * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
                {isDone && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4edea3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Est. Time Badge */}
      <div className="mt-6 flex items-center gap-2 text-[10px] font-mono text-[#8B8B9E] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] rounded-full px-4 py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
        Est. ~40 seconds • Using Auto (Gemini + LLaMA)
      </div>
    </div>
  );
};

// ─── Empty State ──────────────────────────────────────────────────────────────

interface EmptyStateProps {
  onRunSimulation?: () => void;
  error?: string | null;
  targetAudience?: string;
  copyText?: string;
  previousScore?: number | null;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onRunSimulation, error, targetAudience, copyText, previousScore }) => {
  const [personaCount, setPersonaCount] = useState<number>(5);
  const [enableTrust, setEnableTrust] = useState<boolean>(true);
  const [enableMemory, setEnableMemory] = useState<boolean>(true);
  const [modelRoute, setModelRoute] = useState<string>('auto');

  return (
    <div className="py-4 sm:py-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-4xl mx-auto space-y-5">
        {/* Apple Segmented Pipeline Stage Tracker */}
        <div className="bg-[#0D0D14] border border-[#262636] rounded-2xl p-2 flex items-center justify-between overflow-x-auto text-xs font-sora shadow-sm">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
            <span>✓</span>
            <span>Research</span>
          </div>
          <span className="text-[#334155] shrink-0 font-mono">→</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
            <span>✓</span>
            <span>Strategy</span>
          </div>
          <span className="text-[#334155] shrink-0 font-mono">→</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
            <span>✓</span>
            <span>Copy</span>
          </div>
          <span className="text-[#334155] shrink-0 font-mono">→</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[11px] font-semibold shrink-0">
            <span>✓</span>
            <span>Visuals</span>
          </div>
          <span className="text-[#334155] shrink-0 font-mono">→</span>
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#6366F1] text-white font-sora text-xs font-semibold shadow-sm shrink-0">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span>Stage 5: Pre-Flight Audit</span>
          </div>
          <span className="text-[#334155] shrink-0 font-mono">→</span>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[#64748B] font-mono text-[11px] shrink-0">
            <span>○</span>
            <span>Publishing</span>
          </div>
        </div>

        {/* Apple Pro Hero Banner Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-transparent" />
          
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center shrink-0 text-[#818CF8] relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                <circle cx="12" cy="3" r="1.5" fill="#818CF8" /><circle cx="12" cy="21" r="1.5" fill="#818CF8" />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping" />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#10B981]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-semibold font-sora text-white tracking-tight">AI Pre-Flight Simulation Engine</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-[10px] font-mono font-bold text-[#818CF8] uppercase tracking-wider">v2.4 Enterprise</span>
              </div>
              <p className="text-xs text-[#94A3B8] font-sans mt-0.5 leading-relaxed">Validate campaign copy using AI buying committee simulation before publishing live</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {previousScore != null && (
              <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-300 font-mono text-xs">
                <span>Prev Score:</span>
                <span className="font-bold">{previousScore}/100</span>
              </div>
            )}
            <div className="bg-[#0B0B12] border border-[#262636] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-sans text-slate-200">
              <span className="text-[#94A3B8]">Target:</span>
              <span className="font-semibold text-white truncate max-w-[140px]" title={targetAudience}>{targetAudience || 'B2B Buyers'}</span>
            </div>
            <div className="bg-[#0B0B12] border border-[#262636] px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-sans text-slate-200">
              <span className="text-[#94A3B8]">Copy:</span>
              <span className="text-emerald-400 font-semibold">{copyText ? 'Variant Ready' : 'Active Copy'}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#F43F5E]/10 border border-[#F43F5E]/30 rounded-2xl p-4 text-xs text-[#FDA4AF] font-sans">
            <strong className="block mb-1 font-sora font-semibold text-white">Simulation Error:</strong>
            {error}
          </div>
        )}

        {/* Simulation Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Settings Tile */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-[#262636] pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] font-mono">Simulation Settings (Editable)</span>
              <span className="text-xs font-mono text-amber-400 font-semibold">Est. ~40 sec</span>
            </div>
            
            <div className="space-y-3 text-xs font-sans">
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Personas Panel:</span>
                <select value={personaCount} onChange={e => setPersonaCount(Number(e.target.value))}
                  className="bg-[#0B0B12] border border-[#262636] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#6366F1] font-sora cursor-pointer">
                  <option value={3}>3 Demographics</option>
                  <option value={5}>5 Demographics (Default)</option>
                  <option value={8}>8 Demographics</option>
                  <option value={10}>10 Demographics</option>
                </select>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Trust Signal Audit:</span>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" checked={enableTrust} onChange={e => setEnableTrust(e.target.checked)} className="accent-[#6366F1] w-4 h-4 rounded border-[#262636] bg-[#0B0B12]" />
                  <span>{enableTrust ? 'Claim Audit Active' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Persona Memory Recall:</span>
                <label className="flex items-center gap-2 cursor-pointer text-white">
                  <input type="checkbox" checked={enableMemory} onChange={e => setEnableMemory(e.target.checked)} className="accent-[#6366F1] w-4 h-4 rounded border-[#262636] bg-[#0B0B12]" />
                  <span>{enableMemory ? 'Memory Recalled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex justify-between items-center text-[#94A3B8]">
                <span>Model Failover Router:</span>
                <select value={modelRoute} onChange={e => setModelRoute(e.target.value)}
                  className="bg-[#0B0B12] border border-[#262636] rounded-xl px-3 py-1.5 text-xs text-[#818CF8] focus:outline-none focus:border-[#6366F1] font-mono cursor-pointer">
                  <option value="auto">Auto (Gemini + LLaMA)</option>
                  <option value="gemini">Gemini 2.5 Pro</option>
                  <option value="llama">Meta LLaMA 3.3 70B</option>
                </select>
              </div>
            </div>
          </div>

          {/* You'll Receive Benefits Tile */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-5 space-y-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between border-b border-[#262636] pb-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] font-mono">You'll Receive</span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">FULL AUDIT BRIEF</span>
            </div>
            <div className="space-y-2 text-xs text-slate-200 font-sans leading-relaxed">
              <div className="flex items-center gap-2.5"><span className="text-emerald-400 font-bold">✓</span> <span><strong>Executive Decision</strong> &amp; Overall Score</span></div>
              <div className="flex items-center gap-2.5"><span className="text-emerald-400 font-bold">✓</span> <span><strong>Overall Buy Intent</strong> &amp; Click Rates</span></div>
              <div className="flex items-center gap-2.5"><span className="text-emerald-400 font-bold">✓</span> <span><strong>Top Persona Objections</strong> &amp; Friction Points</span></div>
              <div className="flex items-center gap-2.5"><span className="text-emerald-400 font-bold">✓</span> <span><strong>Trust &amp; Risk Report</strong> + Actionable Recommendations</span></div>
            </div>
          </div>
        </div>

        {/* Apple Pro Launch CTA Card */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-white font-semibold font-sora">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Zero Live Campaign Changes</span>
            </div>
            <p className="text-[11px] text-[#94A3B8] font-mono">Runs in ~40 seconds • Unlimited pre-flight re-runs • Est. Cost: ~$0.04</p>
          </div>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5254D8] text-white text-xs font-semibold font-sora transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer border-none shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              <span>{previousScore != null ? 'Re-Run AI Pre-Flight Analysis' : 'Run AI Pre-Flight Analysis'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};



// ─── Metric Badge Card ───────────────────────────────────────────────────────

interface MetricBadgeProps {
  icon: React.ReactNode;
  label: string;
  gradient: string;
  children: React.ReactNode;
}

const MetricBadge: React.FC<MetricBadgeProps> = ({ icon, label, gradient, children }) => (
  <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-2.5 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${gradient}, transparent)` }} />
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}>
        {icon}
      </div>
      <span className="text-[11px] text-[#8B8B9E] uppercase tracking-wider">{label}</span>
    </div>
    {children}
  </div>
);

// ─── Actionable Recommendations List ─────────────────────────────────────────

interface RecommendationsProps {
  recommendations: ActionableRecommendation[];
}

const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden shadow-lg">
      {primaryAccent}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
        </div>
        <div>
          <h3 className="m-0 text-base font-semibold text-[#F1F1F3] font-sora">Actionable Copy Optimization Directives</h3>
          <p className="m-0 text-xs text-[#8B8B9E] font-sora mt-0.5">High-impact revisions to increase conversion resonance &amp; eliminate objections</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="card-elevate bg-[#151520] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-4"
            style={{ animation: `fadeIn 0.35s ease both ${i * 60}ms` }}
          >
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#2A2A38]">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-[#818CF8] bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-md px-3 py-1 uppercase tracking-wider">
                  {rec.target_channel}
                </span>
                <span className="text-xs text-[#8B8B9E] font-mono">Target Channel Optimization</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="relative overflow-hidden bg-[#F43F5E]/5 border border-[#F43F5E]/20 rounded-xl p-4 flex flex-col gap-2">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#F43F5E] to-[#FB7185]" />
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span className="text-xs font-mono font-semibold text-[#F43F5E] uppercase tracking-wider">Detected Copy Friction</span>
                </div>
                <p className="m-0 text-sm text-[#E2E8F0] font-sans leading-relaxed">{rec.friction_identified}</p>
              </div>

              <div className="relative overflow-hidden bg-[#34D399]/5 border border-[#34D399]/20 rounded-xl p-4 flex flex-col gap-2">
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#10B981] to-[#34D399]" />
                <div className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-xs font-mono font-semibold text-[#34D399] uppercase tracking-wider">Recommended Copy Revision</span>
                </div>
                <p className="m-0 text-sm text-[#F1F1F3] font-sans font-medium leading-relaxed">"{rec.suggested_revision.replace(/^"|"$/g, '')}"</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const FocusGroupPanel: React.FC<FocusGroupPanelProps> = ({
  report, copyText, copies, targetAudience,
  isLoading = false, onRunSimulation, error,
}) => {
  const [selectedPersonaIdx, setSelectedPersonaIdx] = useState(0);

  return (
    <div className="p-4 sm:p-6 bg-[#131318] text-[#F1F1F3] min-h-full flex flex-col gap-6 box-border" aria-label="Synthetic Focus Group Panel">
      {/* ── Section 1: Header ── */}
      <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-wrap items-center gap-5 relative overflow-hidden">
        {primaryAccent}
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[rgba(99,102,241,0.25)] to-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(99,102,241,0.25)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h2 className="m-0 text-xl font-bold text-[#F1F1F3] font-sora">Synthetic Focus Group</h2>
          </div>
          <p className="m-0 text-xs text-[#8B8B9E] leading-relaxed max-w-[480px] font-sora">
            AI-generated personas simulate how your target audience reacts to this copy. Scores and
            objections are illustrative — validate with real audience data before major decisions.
          </p>
        </div>
        {report && !isLoading && <ScoreGauge score={report.overall_score} />}
      </div>

      {/* ── Onboarding Guide ── */}
      {report && !isLoading && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#0EA5E9] to-transparent" />
          <h4 className="m-0 text-sm font-semibold text-[#F1F1F3] flex items-center gap-2 font-sora">How to use the Focus Group simulation:</h4>
          <ul className="m-0 pl-5 mt-2.5 flex flex-col gap-1.5 text-xs text-[#8B8B9E] leading-relaxed">
            <li><strong className="text-[#F1F1F3]">Analyze Objections:</strong> Review the highlighted text sections below. These are specific phrases that caused friction for our target personas.</li>
            <li><strong className="text-[#F1F1F3]">Objection Details:</strong> Hover over the highlighted phrases to see which buyer objected and read their detailed verdict.</li>
            <li><strong className="text-[#F1F1F3]">Friction Pulse:</strong> Check the colored pulse indicators on each card to see the level of Trust, Confusion, and Skepticism per persona.</li>
            <li><strong className="text-[#F1F1F3]">Interview Sandbox:</strong> Scroll to the bottom and ask a follow-up question to directly chat with the panel.</li>
          </ul>
        </div>
      )}

      {/* ── Premium Loading Experience ── */}
      {isLoading && (
        <div aria-label="Loading focus group results" aria-busy>
          <LoadingState />
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && !report && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl">
          <EmptyState
            onRunSimulation={onRunSimulation}
            error={error}
            targetAudience={targetAudience}
            copyText={copyText}
            previousScore={report ? (report as any).overall_score : null}
          />
        </div>
      )}

      {/* ── Report Sections ── */}
      {!isLoading && report && (
        <>
          {/* ── Metric Summary Badges ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricBadge
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
              label="Overall Resonance"
              gradient="#6366F1, #818CF8"
            >
              <div className="flex items-baseline gap-1.5 pl-10">
                <span className="text-2xl font-bold font-sora" style={{ color: scoreColor(report.overall_score) }}>{report.overall_score}</span>
                <span className="text-xs text-[#8B8B9E] font-sora">/100</span>
              </div>
            </MetricBadge>

            {(() => {
              const clickCount = report.persona_critiques?.filter(c => c.click_intent).length || 0;
              const totalCount = report.persona_critiques?.length || 5;
              const ctr = Math.round((clickCount / totalCount) * 100);
              const ctrColor = ctr >= 50 ? '#4edea3' : '#F43F5E';
              return (
                <MetricBadge
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>}
                  label="Simulated CTR"
                  gradient="#0D9488, #14B8A6"
                >
                  <div className="flex items-baseline gap-1.5 pl-10">
                    <span className="text-2xl font-bold font-sora" style={{ color: ctrColor }}>{ctr}%</span>
                    <span className="text-xs text-[#8B8B9E] font-sora">({clickCount}/{totalCount} would click)</span>
                  </div>
                </MetricBadge>
              );
            })()}

            {(() => {
              const frictionCount = report.persona_critiques?.filter(c => c.objection || c.clash_quote).length || 0;
              return (
                <MetricBadge
                  icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>}
                  label="Identified Objections"
                  gradient="#D97706, #F59E0B"
                >
                  <div className="flex items-baseline gap-1.5 pl-10">
                    <span className="text-2xl font-bold font-sora" style={{ color: frictionCount > 2 ? '#F59E0B' : '#4edea3' }}>{frictionCount}</span>
                    <span className="text-xs text-[#8B8B9E] font-sora">friction points</span>
                  </div>
                </MetricBadge>
              );
            })()}

            <MetricBadge
              icon={<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
              label="Target Demographics"
              gradient="#7C3AED, #A78BFA"
            >
              <div className="flex flex-col gap-1 pl-10">
                <span className="text-sm text-[#F1F1F3] font-semibold truncate max-w-[240px] font-sora" title={targetAudience}>{targetAudience || 'General Audience'}</span>
                <span className="text-[11px] text-[#4edea3]">✓ Verified alignment</span>
              </div>
            </MetricBadge>
          </div>

          {/* ── Copy Friction Analysis ── */}
          {copyText && report.persona_critiques?.length > 0 && (
            <CopyHighlightOverlay
              copyText={copyText}
              copies={copies}
              critiques={report.persona_critiques}
              onSelectPersona={setSelectedPersonaIdx}
            />
          )}

          {/* ── Persona Panel ── */}
          {report.persona_critiques?.length > 0 && (
            <div className="flex flex-col gap-4 mt-2 pt-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#6366F1]/10 border border-[#6366F1]/20 flex items-center justify-center text-[#818CF8]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                  <h3 className="m-0 text-base font-semibold text-[#E2E8F0] font-sora">Persona Evaluation Panel</h3>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 items-stretch mt-0">
                {/* Master Left Selector List */}
                <div className="flex flex-col gap-3 w-full lg:w-[320px] shrink-0 pt-1">
                  {report.persona_critiques.map((critique, idx) => {
                    const isActive = idx === selectedPersonaIdx;
                    const displayName = critique.persona_id
                      .replace(/[-_]/g, ' ').replace(/\b\d+\b/g, '').replace(/\s+/g, ' ').trim()
                      .split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    const initials = displayName.charAt(0) || 'P';
                    const scoreCol = scoreColor(critique.resonance_score);

                    return (
                      <div
                        key={critique.persona_id}
                        onClick={() => setSelectedPersonaIdx(idx)}
                        className={`rounded-2xl p-4 flex items-center gap-3.5 cursor-pointer transition-all duration-200 relative border ${
                          isActive
                            ? 'bg-[#6366F1]/15 border-[#6366F1]/40 shadow-[0_4px_16px_rgba(99,102,241,0.2)]'
                            : 'bg-[#12121A]/70 border-[#262636] hover:border-[#6366F1]/30 hover:bg-[#6366F1]/5'
                        }`}
                      >
                        {isActive && <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[#6366F1] to-[#A855F7] rounded-l-2xl" />}

                        {/* Avatar */}
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-md"
                          style={{
                            background: isActive
                              ? 'linear-gradient(135deg, #6366F1, #A855F7)'
                              : 'rgba(255,255,255,0.08)',
                          }}
                        >
                          {initials}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className={`text-sm font-semibold truncate font-sora ${isActive ? 'text-white' : 'text-[#E2E8F0]'}`}>
                            {displayName}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: critique.click_intent ? '#4edea3' : '#F43F5E' }} />
                            <span className="text-xs text-[#94A3B8] font-mono">
                              {critique.click_intent ? 'Would Click' : 'Would Scroll Past'}
                            </span>
                          </div>
                        </div>

                        {/* Score Pill */}
                        <div className="flex flex-col items-center gap-0.5">
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-lg font-sora border"
                            style={{ color: scoreCol, backgroundColor: `${scoreCol}15`, borderColor: `${scoreCol}30` }}
                          >
                            {critique.resonance_score}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Detail Right Panel (Shifted Upward) */}
                <div className="flex-1 min-w-0 w-full lg:-mt-9">
                  <PersonaCard critique={report.persona_critiques[selectedPersonaIdx]} index={selectedPersonaIdx} copies={copies} />
                </div>
              </div>
            </div>
          )}

          {/* ── Actionable Recommendations ── */}
          {report.actionable_recommendations?.length > 0 && (
            <Recommendations recommendations={report.actionable_recommendations} />
          )}
        </>
      )}
    </div>
  );
};

export default FocusGroupPanel;
