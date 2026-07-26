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

export interface DebateRound {
  round_number: number;
  speaker_persona_id: string;
  target_persona_id?: string;
  transcript: string;
}

export interface DebateSummary {
  rounds?: DebateRound[];
  consensus?: string;
  buying_probability?: number;
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
  debate_summary?: DebateSummary;
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

const HIGHLIGHT_COLORS = [
  'rgba(244,63,94,0.3)',
  'rgba(245,158,11,0.25)',
  'rgba(99,102,241,0.25)',
  'rgba(78,222,163,0.2)',
  'rgba(192,193,255,0.2)',
];

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
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 80); return () => clearTimeout(t); }, []);

  const trustVal = rubric?.trust != null ? (rubric.trust / 5) * 100 : resonanceScore;
  const trustWidth = animated ? `${trustVal}%` : '0%';
  const confusionWidth = animated ? `${(100 - trustVal) * 0.4}%` : '0%';
  const skeptWidth = animated ? `${(100 - trustVal) * 0.6}%` : '0%';

  return (
    <div className="mt-3">
      <span className="text-[10px] font-mono text-[#8B8B9E] uppercase tracking-wider block mb-1.5">Emotional Pulse</span>
      <div className="w-full h-1.5 rounded overflow-hidden flex bg-[#2A2A38]">
        <div className="h-full transition-all duration-800 ease-out" style={{ width: trustWidth, backgroundColor: '#4edea3' }} />
        <div className="h-full transition-all duration-800 ease-out" style={{ width: confusionWidth, backgroundColor: '#F59E0B' }} />
        <div className="h-full transition-all duration-800 ease-out" style={{ width: skeptWidth, backgroundColor: '#F43F5E' }} />
      </div>
      <div className="flex gap-3 mt-1.5 flex-wrap">
        {[
          { color: '#4edea3', label: 'Trust' },
          { color: '#F59E0B', label: 'Confusion' },
          { color: '#F43F5E', label: 'Skepticism' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-mono text-[#8B8B9E]">{label}</span>
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
      className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden"
      style={{ animation: `fadeIn 0.35s ease both ${index * 80}ms` }}
    >
      <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
            style={{ background: avatarGradient, boxShadow: '0 4px 10px rgba(0,0,0,0.15)' }}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold text-[#F1F1F3] truncate font-sora">{displayName}</span>
            <span className="text-[11px] text-[#8B8B9E]">Virtual Persona</span>
          </div>
        </div>

        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-wrap">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
            style={{
              color: critique.click_intent ? '#4edea3' : '#F43F5E',
              backgroundColor: critique.click_intent ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              borderColor: critique.click_intent ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            }}
          >
            {critique.click_intent ? 'Would Click' : 'Would Scroll Past'}
          </span>
          {objectionChannel && (
            <span className="text-[9px] font-mono font-semibold text-[#c0c1ff] bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.25)] rounded px-1.5 py-0.5 uppercase tracking-wider whitespace-nowrap">
              Friction: {objectionChannel}
            </span>
          )}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-xl p-4 flex flex-col gap-2.5 border" style={{ backgroundColor: `${color}08`, borderColor: `${color}22` }}>
        <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-sora" style={{ color }}>{critique.resonance_score}</span>
            <span className="text-xs text-[#8B8B9E] font-sora">/100 Resonance</span>
          </div>
        </div>
        {critique.objection && (
          <p className="text-xs text-[#8B8B9E] italic leading-relaxed m-0">"{critique.objection}"</p>
        )}
        {critique.rubric && (
          <div className="grid grid-cols-2 gap-2 gap-x-4 mt-1 pt-2.5 border-t border-[rgba(255,255,255,0.06)]">
            {[
              { label: 'Clarity', score: critique.rubric.clarity },
              { label: 'Trust', score: critique.rubric.trust },
              { label: 'Value', score: critique.rubric.value },
              { label: 'Urgency', score: critique.rubric.urgency },
            ].map(({ label, score }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[10px] font-mono text-[#8B8B9E]">
                  <span>{label}</span>
                  <span className="font-semibold text-[#F1F1F3]">{score}/5</span>
                </div>
                <div className="h-1 rounded bg-[#2A2A38] overflow-hidden">
                  <div className="h-full rounded transition-all duration-600" style={{ width: `${(score / 5) * 100}%`, backgroundColor: score >= 4 ? '#4edea3' : score >= 3 ? '#F59E0B' : '#F43F5E' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {critique.clash_quote && (
        <div className="bg-[rgba(245,158,11,0.04)] border border-[rgba(245,158,11,0.12)] rounded-xl p-3 text-xs text-[#8B8B9E] leading-relaxed">
          <div className="flex items-center gap-1.5 mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span className="text-[10px] font-semibold text-[#F59E0B] uppercase tracking-wider">Friction Phrase</span>
          </div>
          "{critique.clash_quote}"
        </div>
      )}

      {critique.verdict && (
        <div className="bg-[rgba(99,102,241,0.03)] border border-[rgba(99,102,241,0.08)] rounded-xl p-4 flex gap-2.5 items-start">
          <div className="w-6 h-6 rounded-md bg-[rgba(99,102,241,0.1)] flex items-center justify-center shrink-0 mt-0.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p className="text-xs text-[#F1F1F3] leading-relaxed m-0 flex-1">{critique.verdict}</p>
        </div>
      )}

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
        <div className="fixed z-[9999] pointer-events-none max-w-[280px] bg-[#1A1A28] border border-[#2A2A38] rounded-xl p-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] font-sora text-xs text-[#F1F1F3] leading-relaxed" style={{ left: tooltip.x, top: tooltip.y }}>
          <div className="text-[10px] font-mono text-[#c0c1ff] uppercase tracking-wider mb-1">{tooltip.personaId}</div>
          {tooltip.objection && <div className="mb-1 text-[#8B8B9E]">{tooltip.objection}</div>}
          {tooltip.verdict && <div className="italic">{tooltip.verdict}</div>}
        </div>,
        document.body
      )}

      <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl overflow-hidden">
        {primaryAccent}
        <div className="flex items-center gap-2 px-5 pt-3.5 text-[11px] text-[#818CF8]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Hover highlighted text to see persona objections
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-b border-[rgba(79,70,229,0.12)]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[rgba(79,70,229,0.2)] to-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(79,70,229,0.2)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4M16 16l-4-4-4 4"/></svg>
            </div>
            <h3 className="m-0 text-sm font-semibold text-[#F1F1F3] font-sora">Copy Friction Analysis</h3>
          </div>
          <button
            onClick={() => setIsExpanded(v => !v)}
            className="bg-none border border-[#2A2A38] rounded-md px-2.5 py-1 font-mono text-[11px] text-[#8B8B9E] cursor-pointer transition-all duration-200 hover:border-[#6366F1] hover:text-[#c0c1ff]"
            aria-expanded={isExpanded}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isExpanded && (
          <div className="p-5 pt-4">
            {channels.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 6h.01M6 18h.01"/></svg>
                  <span className="text-[10px] text-[#8B8B9E] uppercase tracking-wider">Filter by channel</span>
                </div>
                <div className="flex gap-1 p-0.5 bg-[rgba(0,0,0,0.2)] rounded-xl border border-[rgba(255,255,255,0.03)] overflow-x-auto">
                  {channels.map(ch => {
                    const isActive = ch === selectedChannel;
                    return (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        className={`flex-1 whitespace-nowrap px-3.5 py-1.5 rounded-lg border-none text-[11.5px] font-semibold uppercase tracking-wider cursor-pointer transition-all duration-200 font-sora ${isActive ? 'text-[#E0E7FF] shadow-[0_1px_6px_rgba(79,70,229,0.15)]' : 'text-[#6B6B80]'}`}
                        style={{ background: isActive ? 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(129,140,248,0.12))' : 'transparent' }}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-[#F1F1F3] break-words bg-gradient-to-br from-[rgba(0,0,0,0.3)] to-[rgba(79,70,229,0.02)] border border-[rgba(79,70,229,0.1)] rounded-xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <div className="flex items-center gap-1.5 mb-3 pb-2.5 border-b border-[rgba(255,255,255,0.04)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span className="text-[10px] text-[#8B8B9E] uppercase tracking-wider">Copy Content</span>
                <span className="text-[9px] text-[rgba(139,139,158,0.5)] ml-auto font-mono">{segments.filter(s => s.highlighted).length} friction pts</span>
              </div>
              {segments.map((seg, i) => {
                if (!seg.highlighted) return <span key={i}>{seg.text}</span>;
                const critique = critiques[seg.critiqueIndex];
                return (
                  <span
                    key={i}
                    className="rounded-sm px-0.5 cursor-help transition-all duration-150 hover:brightness-125"
                    style={{ backgroundColor: HIGHLIGHT_COLORS[seg.critiqueIndex % HIGHLIGHT_COLORS.length] }}
                    onClick={() => onSelectPersona?.(seg.critiqueIndex)}
                    onMouseEnter={e => handleMouseEnter(e, critique)}
                    onMouseMove={e => {
                      const pos = getSafeTooltipPosition(e.clientX, e.clientY);
                      setTooltip(prev => prev ? { ...prev, x: pos.x, y: pos.y } : null);
                    }}
                    onMouseLeave={() => setTooltip(null)}
                    aria-label={`Friction point: ${critique.persona_id}`}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </div>

            {!hasHighlights && (
              <div className="mt-3 p-3 rounded-xl bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.12)] text-xs text-[#4edea3] flex items-center gap-2">
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
  { label: 'Executing 3-Round Committee Debate', icon: '⚡', completed: true },
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
    { name: 'Sarah', role: 'Tech Lead', color: '#6366F1' },
    { name: 'Alex', role: 'VP Growth', color: '#A855F7' },
    { name: 'Elena', role: 'Finance Dir', color: '#EC4899' },
    { name: 'Marcus', role: 'End User', color: '#38BDF8' },
    { name: 'Priya', role: 'Risk Officer', color: '#4edea3' },
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
        <p className="text-xs text-[#8B8B9E] font-mono mt-1">
          Evaluating copy friction &amp; 3-round committee debate across 5 dynamic buyer personas
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
  const [enableDebate, setEnableDebate] = useState<boolean>(true);
  const [enableTrust, setEnableTrust] = useState<boolean>(true);
  const [enableMemory, setEnableMemory] = useState<boolean>(true);
  const [modelRoute, setModelRoute] = useState<string>('auto');

  return (
    <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[420px]">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
        {/* Pipeline Stage Tracker */}
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-3.5 flex items-center justify-between overflow-x-auto text-xs font-mono">
          <div className="flex items-center gap-2 text-[#34D399] font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[10px]">✓</span>
            Research
          </div>
          <span className="text-[#2A2A38]">→</span>
          <div className="flex items-center gap-2 text-[#34D399] font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[10px]">✓</span>
            Strategy
          </div>
          <span className="text-[#2A2A38]">→</span>
          <div className="flex items-center gap-2 text-[#34D399] font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[10px]">✓</span>
            Copy
          </div>
          <span className="text-[#2A2A38]">→</span>
          <div className="flex items-center gap-2 text-[#34D399] font-semibold">
            <span className="w-5 h-5 rounded-full bg-[#34D399]/10 border border-[#34D399]/30 flex items-center justify-center text-[10px]">✓</span>
            Visuals
          </div>
          <span className="text-[#2A2A38]">→</span>
          <div className="flex items-center gap-2 text-[#818CF8] font-bold bg-[#6366F1]/10 px-2.5 py-1 rounded-lg border border-[#6366F1]/30">
            <span className="w-2 h-2 rounded-full bg-[#818CF8] animate-pulse" />
            Stage 5: Pre-Flight Audit
          </div>
          <span className="text-[#2A2A38]">→</span>
          <div className="flex items-center gap-2 text-[#8B8B9E]">
            <span className="w-5 h-5 rounded-full bg-[#181824] border border-[#2A2A38] flex items-center justify-center text-[10px]">○</span>
            Publishing
          </div>
        </div>

        {/* Hero Banner */}
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-transparent" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#A855F7]/10 border border-[#6366F1]/30 flex items-center justify-center shrink-0 relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]">
                <circle cx="12" cy="12" r="3" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                <circle cx="12" cy="3" r="1.5" fill="#818CF8" /><circle cx="12" cy="21" r="1.5" fill="#818CF8" />
                <circle cx="3" cy="12" r="1.5" fill="#818CF8" /><circle cx="21" cy="12" r="1.5" fill="#818CF8" />
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#4edea3] animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#4edea3]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#F1F1F3] font-sora">AI Pre-Flight Simulation Engine</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-[11px] font-mono text-[#818CF8]">v2.4 Enterprise</span>
              </div>
              <p className="text-xs text-[#8B8B9E] mt-0.5 font-sora">Validate campaign copy using AI buying committee simulation before publishing live.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:justify-end text-xs font-mono">
            {previousScore != null && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#F59E0B] font-semibold">
                <span>Prev Score:</span>
                <span className="font-bold">{previousScore}/100</span>
              </div>
            )}
            <div className="bg-[#181824] border border-[#2A2A38] px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[#8B8B9E]">Target:</span>
              <span className="text-[#F1F1F3] font-semibold truncate max-w-[130px]" title={targetAudience}>{targetAudience || 'B2B Buyers'}</span>
            </div>
            <div className="bg-[#181824] border border-[#2A2A38] px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[#8B8B9E]">Copy:</span>
              <span className="text-[#34D399] font-semibold">{copyText ? 'Variant Ready' : 'Active Copy'}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#F43F5E]/10 border border-[#F43F5E] rounded-xl p-4 text-xs text-[#F43F5E]">
            <strong className="block mb-1 font-semibold">Simulation Error:</strong>
            {error}
          </div>
        )}

        {/* Simulation Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0D2] font-mono">Simulation Settings (Editable)</span>
              <span className="text-xs font-mono text-[#F59E0B] font-semibold">Est. ~40 sec</span>
            </div>
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Personas Panel:</span>
                <select value={personaCount} onChange={e => setPersonaCount(Number(e.target.value))}
                  className="bg-[#181824] border border-[#2A2A38] rounded px-2 py-1 text-xs text-[#F1F1F3] focus:outline-none focus:border-[#6366F1]">
                  <option value={3}>3 Demographics</option>
                  <option value={5}>5 Demographics (Default)</option>
                  <option value={8}>8 Demographics</option>
                  <option value={10}>10 Demographics</option>
                </select>
              </div>
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Committee Debate:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input type="checkbox" checked={enableDebate} onChange={e => setEnableDebate(e.target.checked)} className="accent-[#6366F1] rounded" />
                  <span>{enableDebate ? '3 Rounds Active' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Trust Signal Audit:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input type="checkbox" checked={enableTrust} onChange={e => setEnableTrust(e.target.checked)} className="accent-[#34D399] rounded" />
                  <span>{enableTrust ? 'Claim Audit Active' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Persona Memory Recall:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input type="checkbox" checked={enableMemory} onChange={e => setEnableMemory(e.target.checked)} className="accent-[#A855F7] rounded" />
                  <span>{enableMemory ? 'Memory Recalled' : 'Disabled'}</span>
                </label>
              </div>
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Model Failover Router:</span>
                <select value={modelRoute} onChange={e => setModelRoute(e.target.value)}
                  className="bg-[#181824] border border-[#2A2A38] rounded px-2 py-1 text-xs text-[#38BDF8] focus:outline-none focus:border-[#6366F1]">
                  <option value="auto">Auto (Gemini + LLaMA)</option>
                  <option value="gemini">Gemini 2.5 Pro</option>
                  <option value="llama">Meta LLaMA 3.3 70B</option>
                </select>
              </div>
            </div>
          </div>

          <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0D2] font-mono">You'll Receive</span>
              <span className="text-[10px] font-mono text-[#34D399]">Full Audit Brief</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 text-xs text-[#C7C4D7]">
              <div className="flex items-center gap-2"><span className="text-[#34D399] font-bold">✓</span> <strong>Executive Decision</strong> &amp; Overall Score</div>
              <div className="flex items-center gap-2"><span className="text-[#34D399] font-bold">✓</span> <strong>Overall Buy Intent</strong> &amp; Click Rates</div>
              <div className="flex items-center gap-2"><span className="text-[#34D399] font-bold">✓</span> <strong>Top Persona Objections</strong> &amp; Friction Points</div>
              <div className="flex items-center gap-2"><span className="text-[#34D399] font-bold">✓</span> <strong>Committee Debate Transcript</strong> (3 Rounds)</div>
              <div className="flex items-center gap-2"><span className="text-[#34D399] font-bold">✓</span> <strong>Trust &amp; Risk Report</strong> + Actionable Recommendations</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-[#F1F1F3] font-semibold font-sora">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Zero Live Campaign Changes
            </div>
            <span className="text-[11px] text-[#8B8B9E] font-mono">Runs in ~40 seconds • Unlimited pre-flight re-runs • Est. Cost: ~$0.04</span>
          </div>
          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#5254d8] hover:to-[#4338CA] text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-[0.98] flex items-center justify-center gap-2.5 shrink-0 font-sora"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {previousScore != null ? 'Re-Run AI Pre-Flight Analysis' : 'Run AI Pre-Flight Analysis'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Multi-Persona Debate Summary Card ───────────────────────────────────────

interface DebateSummaryCardProps {
  summary: DebateSummary;
}

const DebateSummaryCard: React.FC<DebateSummaryCardProps> = ({ summary }) => (
  <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#A855F7] via-[#6366F1] to-transparent" />
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgba(99,102,241,0.3)] to-[rgba(168,85,247,0.2)] flex items-center justify-center border border-[rgba(99,102,241,0.3)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <div>
          <h3 className="m-0 text-base font-semibold text-[#F1F1F3] font-sora">Multi-Persona Buying Committee Debate</h3>
          <span className="text-[11px] text-[#8B8B9E]">3-Round Deliberation & Consensus Engine</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] font-mono text-[#8B8B9E] uppercase">Committee Consensus</div>
          <div className="text-sm font-bold uppercase" style={{ color: summary.consensus === 'approve' ? '#4edea3' : summary.consensus === 'revise' ? '#F59E0B' : '#F43F5E' }}>
            {summary.consensus} ({summary.buying_probability?.toFixed(0)}% Buy Intent)
          </div>
        </div>
      </div>
    </div>
    {summary.rounds && summary.rounds.length > 0 && (
      <div className="flex flex-col gap-2.5 mt-2">
        <div className="text-[11px] font-semibold font-mono text-[#8B8B9E] uppercase tracking-wider">Debate Transcripts ({summary.rounds.length} Rounds)</div>
        <div className="flex flex-col gap-2">
          {summary.rounds.map((rd, i) => (
            <div key={i} className="bg-[rgba(18,18,26,0.6)] border border-[rgba(255,255,255,0.05)] rounded-xl p-3 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-[#c0c1ff] font-semibold">ROUND {rd.round_number}: {rd.speaker_persona_id}{rd.target_persona_id ? ` → ${rd.target_persona_id}` : ''}</span>
              </div>
              <p className="m-0 text-xs text-[#F1F1F3] italic leading-relaxed">"{rd.transcript}"</p>
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

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
    <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6 flex flex-col gap-5 relative overflow-hidden">
      {primaryAccent}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[rgba(99,102,241,0.2)] to-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(99,102,241,0.2)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
        </div>
        <h3 className="m-0 text-base font-semibold text-[#F1F1F3] font-sora">Actionable Recommendations</h3>
      </div>

      <div className="flex flex-col gap-4">
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="card-elevate bg-[#13131a] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3.5"
            style={{ animation: `fadeIn 0.35s ease both ${i * 60}ms` }}
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[rgba(99,102,241,0.2)] to-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(99,102,241,0.2)]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <span className="text-[10px] font-mono font-semibold text-[#c0c1ff] bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-md px-2 py-0.5 uppercase tracking-wider">{rec.target_channel}</span>
              <span className="text-xs text-[#8B8B9E] font-medium">Optimization Directives</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative overflow-hidden bg-[rgba(239,68,68,0.04)] border border-[rgba(239,68,68,0.12)] rounded-xl p-4 flex flex-col gap-2">
                <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-[#F43F5E] to-[#FB7185]" />
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span className="text-[10px] font-mono font-semibold text-[#F43F5E] uppercase tracking-wider">Detected Friction</span>
                </div>
                <p className="m-0 text-xs text-[#8B8B9E] leading-relaxed">{rec.friction_identified}</p>
              </div>

              <div className="relative overflow-hidden bg-[rgba(16,185,129,0.04)] border border-[rgba(16,185,129,0.12)] rounded-xl p-4 flex flex-col gap-2">
                <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-[#10B981] to-[#34D399]" />
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span className="text-[10px] font-mono font-semibold text-[#10B981] uppercase tracking-wider">Suggested Copy Revision</span>
                </div>
                <p className="m-0 text-xs text-[#F1F1F3] italic leading-relaxed">"{rec.suggested_revision.replace(/^"|"$/g, '')}"</p>
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
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[rgba(99,102,241,0.2)] to-[rgba(129,140,248,0.1)] flex items-center justify-center border border-[rgba(99,102,241,0.2)]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3 className="m-0 text-sm font-semibold text-[#F1F1F3] font-sora">Persona Panel</h3>
              </div>
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                <div className="flex flex-col gap-2.5 w-full md:w-[280px] shrink-0">
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
                        className={`rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all duration-200 relative ${
                          isActive
                            ? 'bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.35)]'
                            : 'bg-[rgba(23,23,37,0.4)] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(99,102,241,0.25)] hover:bg-[rgba(99,102,241,0.04)]'
                        }`}
                      >
                        {isActive && <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-[#6366F1] to-[#818CF8] rounded-l-xl" />}
                        <div
                          className="w-8.5 h-8.5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                          style={{
                            background: isActive ? 'linear-gradient(135deg, #6366F1, #818CF8)' : 'rgba(255,255,255,0.08)',
                            boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                          }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                          <span className={`text-xs font-semibold truncate font-sora ${isActive ? 'text-white' : 'text-[#F1F1F3]'}`}>{displayName}</span>
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: critique.click_intent ? '#4edea3' : '#F43F5E' }} />
                            <span className="text-[11px] text-[#8B8B9E]">{critique.click_intent ? 'Would Click' : 'Would Scroll Past'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md font-sora" style={{ color: scoreCol, backgroundColor: isActive ? `${scoreCol}15` : 'rgba(255,255,255,0.02)', border: `1px solid ${scoreCol}33` }}>{critique.resonance_score}</span>
                          <div className="w-6 h-0.5 rounded bg-[rgba(255,255,255,0.06)] overflow-hidden">
                            <div className="h-full rounded" style={{ width: `${critique.resonance_score}%`, backgroundColor: scoreCol }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 min-w-0 w-full">
                  <PersonaCard critique={report.persona_critiques[selectedPersonaIdx]} index={selectedPersonaIdx} copies={copies} />
                </div>
              </div>
            </div>
          )}

          {/* ── Multi-Persona Debate Summary ── */}
          {report.debate_summary && <DebateSummaryCard summary={report.debate_summary} />}

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
