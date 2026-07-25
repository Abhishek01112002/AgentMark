import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
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

const COLORS = {
  bg: '#0A0A0F',
  bg2: '#111118',
  bg3: '#0F0F15',
  bg4: '#13131a',
  border: '#2A2A38',
  purple: '#6366F1',
  purpleLight: '#c0c1ff',
  green: '#4edea3',
  textPrimary: '#F1F1F3',
  textMuted: '#8B8B9E',
  danger: '#F43F5E',
  warning: '#F59E0B',
};

const HIGHLIGHT_COLORS = [
  'rgba(244,63,94,0.3)',
  'rgba(245,158,11,0.25)',
  'rgba(99,102,241,0.25)',
  'rgba(78,222,163,0.2)',
  'rgba(192,193,255,0.2)',
];

const scoreColor = (score: number): string => {
  if (score < 40) return COLORS.danger;
  if (score < 70) return COLORS.warning;
  return COLORS.green;
};

// ─── Global Styles ────────────────────────────────────────────────────────────

const GlobalStyles: React.FC = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @keyframes shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.3; }
    }

    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .fgp-shimmer {
      background: linear-gradient(90deg, #1A1A24 25%, #22222E 50%, #1A1A24 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }

    .fgp-fadeInUp {
      animation: fadeInUp 0.35s ease both;
    }

    .fgp-clamp2 {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .fgp-scroll::-webkit-scrollbar { width: 4px; }
    .fgp-scroll::-webkit-scrollbar-track { background: transparent; }
    .fgp-scroll::-webkit-scrollbar-thumb { background: #2A2A38; border-radius: 4px; }

    .fgp-highlight-span {
      border-radius: 3px;
      padding: 1px 2px;
      cursor: help;
      position: relative;
      transition: filter 0.15s;
    }
    .fgp-highlight-span:hover { filter: brightness(1.4); }

    .fgp-tooltip {
      position: fixed;
      z-index: 9999;
      pointer-events: none;
      max-width: 280px;
      background: #1A1A28;
      border: 1px solid #2A2A38;
      border-radius: 10px;
      padding: 10px 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      font-family: 'Sora', sans-serif;
      font-size: 12px;
      color: #F1F1F3;
      line-height: 1.5;
    }

    .fgp-btn {
      cursor: pointer;
      border: none;
      outline: none;
      font-family: 'Sora', sans-serif;
      transition: opacity 0.2s, transform 0.15s;
    }
    .fgp-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
    .fgp-btn:active:not(:disabled) { transform: translateY(0); }
    .fgp-btn:disabled { opacity: 0.45; cursor: not-allowed; }

    .fgp-expand-btn {
      background: none;
      border: 1px solid #2A2A38;
      border-radius: 6px;
      padding: 4px 10px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #8B8B9E;
      cursor: pointer;
      transition: border-color 0.2s, color 0.2s;
    }
    .fgp-expand-btn:hover { border-color: #6366F1; color: #c0c1ff; }

    .fgp-answer-expand {
      background: none;
      border: none;
      cursor: pointer;
      color: #6366F1;
      font-family: 'Sora', sans-serif;
      font-size: 12px;
      padding: 0;
      text-decoration: underline;
    }
  `}</style>
);

// ─── Overall Score Gauge ───────────────────────────────────────────────────────

interface ScoreGaugeProps {
  score: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score }) => {
  const [animated, setAnimated] = useState(false);
  const CIRCUMFERENCE = 2 * Math.PI * 48; // ≈ 301.59

  const color = useMemo(() => scoreColor(score), [score]);
  const targetOffset = useMemo(
    () => CIRCUMFERENCE * (1 - score / 100),
    [score, CIRCUMFERENCE]
  );

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      setTimeout(() => setAnimated(true), 50);
    });
    return () => cancelAnimationFrame(t);
  }, [score]);

  const dashOffset = animated ? targetOffset : CIRCUMFERENCE;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg
        width={120}
        height={120}
        viewBox="0 0 120 120"
        aria-label={`Overall score: ${score} out of 100`}
      >
        {/* Background circle */}
        <circle
          cx={60}
          cy={60}
          r={48}
          stroke={COLORS.border}
          strokeWidth={8}
          fill="none"
        />
        {/* Foreground arc */}
        <circle
          cx={60}
          cy={60}
          r={48}
          stroke={color}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          transform="rotate(-90, 60, 60)"
          style={{ transition: 'stroke-dashoffset 900ms ease-out, stroke 400ms ease' }}
        />
        {/* Score text */}
        <text
          x={60}
          y={56}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={28}
          fontWeight={700}
          fontFamily="'Sora', sans-serif"
        >
          {score}
        </text>
        <text
          x={60}
          y={73}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={COLORS.textMuted}
          fontSize={12}
          fontFamily="'Sora', sans-serif"
        >
          /100
        </text>
      </svg>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11,
          color: COLORS.textMuted,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        Overall Score
      </span>
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

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  // Use exact Trust percentage from rubric if available (rubric.trust / 5 * 100), otherwise fallback to resonanceScore
  const trustVal = rubric && typeof rubric.trust === 'number' ? (rubric.trust / 5) * 100 : resonanceScore;
  const trustWidth = animated ? `${trustVal}%` : '0%';
  const confusionWidth = animated ? `${(100 - trustVal) * 0.4}%` : '0%';
  const skeptWidth = animated ? `${(100 - trustVal) * 0.6}%` : '0%';

  const segmentStyle = (color: string, width: string): React.CSSProperties => ({
    height: '100%',
    width,
    backgroundColor: color,
    transition: 'width 800ms ease-out',
  });

  return (
    <div style={{ marginTop: 12 }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: COLORS.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          display: 'block',
          marginBottom: 6,
        }}
      >
        Emotional Pulse
      </span>
      <div
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          overflow: 'hidden',
          display: 'flex',
          backgroundColor: COLORS.border,
        }}
      >
        <div style={segmentStyle(COLORS.green, trustWidth)} />
        <div style={segmentStyle(COLORS.warning, confusionWidth)} />
        <div style={segmentStyle(COLORS.danger, skeptWidth)} />
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: COLORS.green, label: 'Trust' },
          { color: COLORS.warning, label: 'Confusion' },
          { color: COLORS.danger, label: 'Skepticism' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                color: COLORS.textMuted,
              }}
            >
              {label}
            </span>
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

  // Extract a clean display name
  const displayName = useMemo(() => {
    return critique.persona_id
      .replace(/[-_]/g, ' ')
      .replace(/\b\d+\b/g, '') // Remove age digits if present in slug
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }, [critique.persona_id]);

  const initials = displayName.charAt(0) || 'P';

  // Generate a premium gradient color for the avatar based on name length
  const avatarGradient = useMemo(() => {
    const gradients = [
      'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', // Indigo
      'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', // Blue
      'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)', // Pink
      'linear-gradient(135deg, #10B981 0%, #047857 100%)', // Green
      'linear-gradient(135deg, #F59E0B 0%, #B45309 100%)', // Amber
    ];
    return gradients[displayName.length % gradients.length];
  }, [displayName]);

  // Dynamically resolve which channel copy this objection applies to
  const objectionChannel = useMemo(() => {
    if (!copies || !critique.clash_quote) return null;
    const quote = critique.clash_quote.trim().toLowerCase();
    for (const [channel, data] of Object.entries(copies)) {
      if (!data) continue;
      const text = `${data.headline ?? ''} ${data.body ?? ''}`.toLowerCase();
      if (text.includes(quote)) {
        return channel;
      }
    }
    // Fallback: match words (for ellipses or truncated quotes)
    const words = quote.split(/\s+/).filter(w => w.length > 4);
    if (words.length === 0) return null;
    let bestChannel = null;
    let maxMatches = 0;
    for (const [channel, data] of Object.entries(copies)) {
      if (!data) continue;
      const text = `${data.headline ?? ''} ${data.body ?? ''}`.toLowerCase();
      const matches = words.filter(w => text.includes(w)).length;
      if (matches > maxMatches && matches >= 2) {
        maxMatches = matches;
        bestChannel = channel;
      }
    }
    return bestChannel;
  }, [copies, critique.clash_quote]);

  return (
    <div
      className="fgp-fadeInUp relative overflow-hidden p-4 sm:p-5 transition-all duration-200 shadow-[0_8px_32px_rgba(0,0,0,0.2)] hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(99,102,241,0.15)]"
      style={{
        backgroundColor: 'rgba(23, 23, 37, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        animationDelay: `${index * 80}ms`,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, transparent)` }} />
      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: avatarGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: 15,
              flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            }}
          >
            {initials}
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: COLORS.textPrimary,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 11,
                color: COLORS.textMuted,
              }}
            >
              Virtual Persona
            </span>
          </div>
        </div>
        
        {/* Click Intent & Channel Origin badges */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 flex-wrap">
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: critique.click_intent ? COLORS.green : COLORS.danger,
              backgroundColor: critique.click_intent ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '4px 10px',
              borderRadius: 20,
              border: `1px solid ${critique.click_intent ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              whiteSpace: 'nowrap',
            }}
          >
            {critique.click_intent ? 'Would Click' : 'Would Scroll Past'}
          </span>
          {objectionChannel && (
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 9,
                fontWeight: 600,
                color: COLORS.purpleLight,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: 4,
                padding: '2px 6px',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
              }}
            >
              Friction: {objectionChannel}
            </span>
          )}
        </div>
      </div>

      {/* Score and Objection Callout */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: color === COLORS.green ? 'rgba(16, 185, 129, 0.04)' : color === COLORS.warning ? 'rgba(245, 158, 11, 0.04)' : 'rgba(239, 68, 68, 0.04)',
          border: `1px solid ${color}22`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, ${color}, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}30` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "'Sora', sans-serif" }}>{critique.resonance_score}</span>
            <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Sora', sans-serif" }}>/100 Resonance</span>
          </div>
        </div>
        
        {critique.objection && (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              lineHeight: 1.6,
              color: COLORS.textMuted,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            "{critique.objection}"
          </p>
        )}

        {critique.rubric && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: 4, paddingTop: 10, borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {[
              { label: 'Clarity', score: critique.rubric.clarity },
              { label: 'Trust', score: critique.rubric.trust },
              { label: 'Value', score: critique.rubric.value },
              { label: 'Urgency', score: critique.rubric.urgency },
            ].map(({ label, score }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textMuted }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 600, color: COLORS.textPrimary }}>{score}/5</span>
                </div>
                <div style={{ height: 4, borderRadius: 2, backgroundColor: COLORS.border, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(score / 5) * 100}%`,
                      backgroundColor: score >= 4 ? COLORS.green : score >= 3 ? COLORS.warning : COLORS.danger,
                      borderRadius: 2,
                      transition: 'width 600ms ease-out',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Clash Quote block */}
      {critique.clash_quote && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
            border: '1px solid rgba(245, 158, 11, 0.12)',
            borderRadius: 10,
            padding: '12px 14px',
            fontSize: 12.5,
            fontFamily: "'Inter', sans-serif",
            color: COLORS.textMuted,
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span style={{ fontWeight: 600, fontSize: 10, color: COLORS.warning, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friction Phrase</span>
          </div>
          "{critique.clash_quote}"
        </div>
      )}

      {/* Verdict / Decision */}
      {critique.verdict && (
        <div
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.03)',
            border: '1px solid rgba(99, 102, 241, 0.08)',
            borderRadius: 10,
            padding: '14px 16px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}
        >
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 13,
              color: COLORS.textPrimary,
              lineHeight: 1.6,
              margin: 0,
              flex: 1,
            }}
          >
            {critique.verdict}
          </p>
        </div>
      )}

      {/* Emotional Pulse Bar */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
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

  const toggleExpanded = useCallback(() => setIsExpanded(v => !v), []);

  // Extract available channels from the copies prop
  const channels = useMemo(() => {
    if (!copies) return [];
    return Object.keys(copies).filter(ch => copies[ch]);
  }, [copies]);

  const [selectedChannel, setSelectedChannel] = useState(channels[0] || '');

  // Keep selected channel in sync if copies prop updates
  useEffect(() => {
    if (channels.length > 0 && (!selectedChannel || !channels.includes(selectedChannel))) {
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  // Compute active copy text for highlight matching
  const activeCopyText = useMemo(() => {
    if (copies && selectedChannel && copies[selectedChannel]) {
      const data = copies[selectedChannel];
      const headline = data.headline ? `${data.headline}\n\n` : '';
      const body = data.body ? data.body : '';
      return `${headline}${body}`;
    }
    return copyText;
  }, [copies, selectedChannel, copyText]);

  // Build highlight segments specifically for activeCopyText
  const segments = useMemo<TextSegment[]>(() => {
    const ranges: HighlightRange[] = [];

    critiques.forEach((critique, ci) => {
      const q = critique.clash_quote?.trim();
      if (!q) return;
      const idx = activeCopyText.indexOf(q);
      if (idx === -1) return;
      ranges.push({ start: idx, end: idx + q.length, critiqueIndex: ci });
    });

    // Sort by start
    ranges.sort((a, b) => a.start - b.start);

    // Remove overlaps
    const clean: HighlightRange[] = [];
    let prevEnd = -1;
    for (const r of ranges) {
      if (r.start < prevEnd) continue;
      clean.push(r);
      prevEnd = r.end;
    }

    // Build segment array
    const result: TextSegment[] = [];
    let cursor = 0;

    for (const r of clean) {
      if (cursor < r.start) {
        result.push({ text: activeCopyText.slice(cursor, r.start), highlighted: false, critiqueIndex: -1 });
      }
      result.push({ text: activeCopyText.slice(r.start, r.end), highlighted: true, critiqueIndex: r.critiqueIndex });
      cursor = r.end;
    }
    if (cursor < activeCopyText.length) {
      result.push({ text: activeCopyText.slice(cursor), highlighted: false, critiqueIndex: -1 });
    }

    return result;
  }, [activeCopyText, critiques]);

  const hasHighlights = segments.some(s => s.highlighted);

  const getSafeTooltipPosition = useCallback((clientX: number, clientY: number) => {
    const tooltipWidth = 300;  // Conservative estimate of tooltip width
    const tooltipHeight = 180; // Conservative estimate of tooltip height
    
    let x = clientX + 12;
    let y = clientY + 12;
    
    // If it overflows the right edge, position it to the left of the cursor
    if (x + tooltipWidth > window.innerWidth) {
      x = clientX - tooltipWidth - 12;
    }
    // If it overflows the bottom edge, position it above the cursor
    if (y + tooltipHeight > window.innerHeight) {
      y = clientY - tooltipHeight - 12;
    }
    
    // Guard against negative values (top/left edge)
    if (x < 10) x = 10;
    if (y < 10) y = 10;
    
    return { x, y };
  }, []);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent, critique: PersonaCritique) => {
      const pos = getSafeTooltipPosition(e.clientX, e.clientY);
      setTooltip({
        x: pos.x,
        y: pos.y,
        personaId: critique.persona_id,
        objection: critique.objection?.slice(0, 120) ?? '',
        verdict: critique.verdict?.slice(0, 80) ?? '',
      });
    },
    [getSafeTooltipPosition]
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip(prev => {
      if (!prev) return null;
      const pos = getSafeTooltipPosition(e.clientX, e.clientY);
      return { ...prev, x: pos.x, y: pos.y };
    });
  }, [getSafeTooltipPosition]);

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  return (
    <>
      {/* Tooltip portal */}
      {tooltip && createPortal(
        <div
          className="fgp-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          aria-hidden
        >
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10,
              color: COLORS.purpleLight,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: 4,
            }}
          >
            {tooltip.personaId}
          </div>
          {tooltip.objection && (
            <div style={{ marginBottom: 4, color: COLORS.textMuted }}>{tooltip.objection}</div>
          )}
          {tooltip.verdict && (
            <div style={{ color: COLORS.textPrimary, fontStyle: 'italic' }}>{tooltip.verdict}</div>
          )}
        </div>,
        document.body
      )}

      <div
        className="relative overflow-hidden"
        style={{
          backgroundColor: 'rgba(79, 70, 229, 0.03)',
          border: `1px solid rgba(79, 70, 229, 0.12)`,
          borderRadius: 16,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #4F46E5, #818CF8, transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 20px 0', fontFamily: "'Inter', sans-serif", fontSize: 11, color: '#818CF8' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          Hover highlighted text to see persona objections
        </div>
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 20px 14px',
            borderBottom: isExpanded ? `1px solid rgba(79, 70, 229, 0.12)` : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(79,70,229,0.2)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4M16 16l-4-4-4 4"/></svg>
            </div>
            <h3
              style={{
                margin: 0,
                fontFamily: "'Sora', sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: COLORS.textPrimary,
              }}
            >
              Copy Friction Analysis
            </h3>
          </div>
          <button
            className="fgp-expand-btn"
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            aria-label="Toggle copy friction analysis"
            style={{
              background: 'none',
              border: `1px solid ${isExpanded ? 'rgba(79, 70, 229, 0.3)' : '#2A2A38'}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: isExpanded ? '#818CF8' : '#8B8B9E',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isExpanded && (
          <div style={{ padding: '16px 20px 20px' }}>
            {/* Channel Tabs Selector */}
            {channels.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><path d="M6 6h.01M6 18h.01"/></svg>
                  <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Filter by channel</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    padding: 3,
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 10,
                    overflowX: 'auto',
                    border: '1px solid rgba(255,255,255,0.03)',
                  }}
                >
                  {channels.map(ch => {
                    const isActive = ch === selectedChannel;
                    return (
                      <button
                        key={ch}
                        onClick={() => setSelectedChannel(ch)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 7,
                          border: 'none',
                          background: isActive
                            ? 'linear-gradient(135deg, rgba(79,70,229,0.3), rgba(129,140,248,0.12))'
                            : 'transparent',
                          color: isActive ? '#E0E7FF' : '#6B6B80',
                          fontFamily: "'Sora', sans-serif",
                          fontSize: 11.5,
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          letterSpacing: '0.04em',
                          boxShadow: isActive ? '0 1px 6px rgba(79,70,229,0.15)' : 'none',
                          flex: 1,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {ch}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 1.9,
                whiteSpace: 'pre-wrap',
                color: COLORS.textPrimary,
                wordBreak: 'break-word',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.3), rgba(79,70,229,0.02))',
                border: '1px solid rgba(79, 70, 229, 0.1)',
                borderRadius: 12,
                padding: '18px 22px',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B8B9E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span style={{ fontSize: 10, color: COLORS.textMuted, fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.06em' }}>Copy Content</span>
                <span style={{ fontSize: 9, color: 'rgba(139,139,158,0.5)', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                  {segments.length > 0 ? `${segments.filter(s => s.highlighted).length} friction pts` : ''}
                </span>
              </div>
              {segments.map((seg, i) => {
                if (!seg.highlighted) {
                  return <span key={i}>{seg.text}</span>;
                }
                const critique = critiques[seg.critiqueIndex];
                const bgColor = HIGHLIGHT_COLORS[seg.critiqueIndex % HIGHLIGHT_COLORS.length];
                return (
                  <span
                    key={i}
                    className="fgp-highlight-span"
                    style={{ backgroundColor: bgColor, cursor: 'pointer' }}
                    onClick={() => onSelectPersona?.(seg.critiqueIndex)}
                    onMouseEnter={e => handleMouseEnter(e, critique)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    aria-label={`Friction point: ${critique.persona_id}`}
                  >
                    {seg.text}
                  </span>
                );
              })}
            </div>

            {!hasHighlights && (
              <div
                style={{
                  marginTop: 12,
                  padding: '12px 16px',
                  borderRadius: 10,
                  backgroundColor: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.12)',
                  fontSize: 12.5,
                  color: '#4edea3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
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


// ─── Shimmer Skeleton Cards ───────────────────────────────────────────────────

const SkeletonCard: React.FC<{ delay?: number }> = ({ delay = 0 }) => (
  <div
    style={{
      backgroundColor: COLORS.bg4,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      animationDelay: `${delay}ms`,
    }}
  >
    <div className="fgp-shimmer" style={{ height: 20, borderRadius: 6, width: '40%' }} />
    <div className="fgp-shimmer" style={{ height: 40, borderRadius: 6, width: '25%' }} />
    <div className="fgp-shimmer" style={{ height: 14, borderRadius: 6, width: '90%' }} />
    <div className="fgp-shimmer" style={{ height: 14, borderRadius: 6, width: '70%' }} />
    <div className="fgp-shimmer" style={{ height: 6, borderRadius: 3, width: '100%' }} />
  </div>
);

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
    <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[420px] text-center">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-6 text-left">
        
        {/* 1. Campaign Pipeline Stage Tracker (Integrated Lifecycle Step Bar) */}
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

        {/* 2. Top Campaign Context Hero Banner */}
        <div className="bg-[#111118] border border-[#2A2A38] rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] via-[#818CF8] to-transparent" />
          
          <div className="flex items-center gap-4">
            {/* Subtle Radar Committee Neural Network Graphic */}
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6366F1]/20 to-[#A855F7]/10 border border-[#6366F1]/30 flex items-center justify-center flex-shrink-0 relative">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="filter drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                <circle cx="12" cy="3" r="1.5" fill="#818CF8" />
                <circle cx="12" cy="21" r="1.5" fill="#818CF8" />
                <circle cx="3" cy="12" r="1.5" fill="#818CF8" />
                <circle cx="21" cy="12" r="1.5" fill="#818CF8" />
              </svg>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#4edea3] animate-ping opacity-75" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#4edea3]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-[#F1F1F3]" style={{ fontFamily: 'Sora, sans-serif' }}>
                  AI Pre-Flight Simulation Engine
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/30 text-[11px] font-mono text-[#818CF8]">
                  v2.4 Enterprise
                </span>
              </div>
              <p className="text-xs text-[#8B8B9E] mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Validate campaign copy using AI buying committee simulation before publishing live.
              </p>
            </div>
          </div>

          {/* Campaign Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 md:justify-end text-xs font-mono">
            {previousScore != null && (
              <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[#F59E0B] font-semibold">
                <span>Prev Score:</span>
                <span className="font-bold">{previousScore}/100</span>
              </div>
            )}
            <div className="bg-[#181824] border border-[#2A2A38] px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[#8B8B9E]">Target:</span>
              <span className="text-[#F1F1F3] font-semibold truncate max-w-[130px]" title={targetAudience}>
                {targetAudience || 'B2B Buyers'}
              </span>
            </div>
            <div className="bg-[#181824] border border-[#2A2A38] px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="text-[#8B8B9E]">Copy:</span>
              <span className="text-[#34D399] font-semibold">
                {copyText ? 'Variant Ready' : 'Active Copy'}
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-[#F43F5E]/10 border border-[#F43F5E] rounded-xl p-4 text-xs text-[#F43F5E]">
            <strong className="block mb-1 font-semibold">Simulation Error:</strong>
            {error}
          </div>
        )}

        {/* 3 & 4. Editable Interactive Simulation Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          
          {/* Editable Simulation Configuration */}
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0D2]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Simulation Settings (Editable)
              </span>
              <span className="text-xs font-mono text-[#F59E0B] font-semibold">Est. ~40 sec</span>
            </div>
            
            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Personas Panel:</span>
                <select
                  value={personaCount}
                  onChange={(e) => setPersonaCount(Number(e.target.value))}
                  className="bg-[#181824] border border-[#2A2A38] rounded px-2 py-1 text-xs text-[#F1F1F3] focus:outline-none focus:border-[#6366F1]"
                >
                  <option value={3}>3 Demographics</option>
                  <option value={5}>5 Demographics (Default)</option>
                  <option value={8}>8 Demographics</option>
                  <option value={10}>10 Demographics</option>
                </select>
              </div>

              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Committee Debate:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input
                    type="checkbox"
                    checked={enableDebate}
                    onChange={(e) => setEnableDebate(e.target.checked)}
                    className="accent-[#6366F1] rounded"
                  />
                  <span>{enableDebate ? '3 Rounds Active' : 'Disabled'}</span>
                </label>
              </div>

              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Trust Signal Audit:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input
                    type="checkbox"
                    checked={enableTrust}
                    onChange={(e) => setEnableTrust(e.target.checked)}
                    className="accent-[#34D399] rounded"
                  />
                  <span>{enableTrust ? 'Claim Audit Active' : 'Disabled'}</span>
                </label>
              </div>

              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Persona Memory Recall:</span>
                <label className="flex items-center gap-2 cursor-pointer text-[#F1F1F3]">
                  <input
                    type="checkbox"
                    checked={enableMemory}
                    onChange={(e) => setEnableMemory(e.target.checked)}
                    className="accent-[#A855F7] rounded"
                  />
                  <span>{enableMemory ? 'Memory Recalled' : 'Disabled'}</span>
                </label>
              </div>

              <div className="flex justify-between items-center text-[#8B8B9E]">
                <span>Model Failover Router:</span>
                <select
                  value={modelRoute}
                  onChange={(e) => setModelRoute(e.target.value)}
                  className="bg-[#181824] border border-[#2A2A38] rounded px-2 py-1 text-xs text-[#38BDF8] focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="auto">Auto (Gemini + LLaMA)</option>
                  <option value="gemini">Gemini 2.5 Pro</option>
                  <option value="llama">Meta LLaMA 3.3 70B</option>
                </select>
              </div>
            </div>
          </div>

          {/* You'll Receive (Output Deliverables) */}
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-[#2A2A38] pb-2.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#A0A0D2]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                You'll Receive
              </span>
              <span className="text-[10px] font-mono text-[#34D399]">Full Audit Brief</span>
            </div>
            
            <div className="grid grid-cols-1 gap-1.5 text-xs text-[#C7C4D7]">
              <div className="flex items-center gap-2">
                <span className="text-[#34D399] font-bold">✓</span> <strong>Executive Decision</strong> &amp; Overall Score
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#34D399] font-bold">✓</span> <strong>Overall Buy Intent</strong> &amp; Click Rates
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#34D399] font-bold">✓</span> <strong>Top Persona Objections</strong> &amp; Friction Points
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#34D399] font-bold">✓</span> <strong>Committee Debate Transcript</strong> (3 Rounds)
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#34D399] font-bold">✓</span> <strong>Trust &amp; Risk Report</strong> + Actionable Recommendations
              </div>
            </div>
          </div>

        </div>

        {/* 5. High-Confidence Action Area */}
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-left gap-1">
            <div className="flex items-center gap-2 text-xs text-[#F1F1F3] font-semibold" style={{ fontFamily: 'Sora, sans-serif' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Zero Live Campaign Changes
            </div>
            <span className="text-[11px] text-[#8B8B9E] font-mono">
              Runs in ~40 seconds • Unlimited pre-flight re-runs • Est. Cost: ~$0.04
            </span>
          </div>

          {onRunSimulation && (
            <button
              onClick={onRunSimulation}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#4F46E5] hover:from-[#5254d8] hover:to-[#4338CA] text-white text-sm font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.35)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] active:scale-[0.98] flex items-center justify-center gap-2.5 shrink-0"
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
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

const DebateSummaryCard: React.FC<DebateSummaryCardProps> = ({ summary }) => {
  return (
    <div
      className="fgp-fadeInUp border border-[#2A2A38] rounded-[16px] overflow-hidden"
      style={{
        backgroundColor: 'rgba(23, 23, 37, 0.5)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.3)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, color: COLORS.textPrimary }}>
              Multi-Persona Buying Committee Debate
            </h3>
            <span style={{ fontSize: 11, color: COLORS.textMuted }}>3-Round Deliberation & Consensus Engine</span>
          </div>
        </div>

        {/* Buying Committee Consensus Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textMuted, textTransform: 'uppercase' }}>Committee Consensus</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: summary.consensus === 'approve' ? COLORS.green : summary.consensus === 'revise' ? COLORS.warning : COLORS.danger, textTransform: 'uppercase' }}>
              {summary.consensus} ({summary.buying_probability?.toFixed(0)}% Buy Intent)
            </div>
          </div>
        </div>
      </div>

      {/* Debate Rounds Transcripts */}
      {summary.rounds && summary.rounds.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Debate Transcripts ({summary.rounds.length} Rounds)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {summary.rounds.map((rd: DebateRound, i: number) => (
              <div
                key={i}
                style={{
                  backgroundColor: 'rgba(18, 18, 26, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: COLORS.purpleLight, fontWeight: 600 }}>
                    ROUND {rd.round_number}: {rd.speaker_persona_id} {rd.target_persona_id ? `→ ${rd.target_persona_id}` : ''}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: COLORS.textPrimary, fontStyle: 'italic', lineHeight: 1.5 }}>
                  "{rd.transcript}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Actionable Recommendations List ───────────────────────────────────────────────

interface RecommendationsProps {
  recommendations: ActionableRecommendation[];
}

const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div
      className="relative overflow-hidden"
      style={{
        backgroundColor: 'rgba(99, 102, 241, 0.03)',
        border: `1px solid rgba(99, 102, 241, 0.12)`,
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366F1, #818CF8, transparent)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
        </div>
        <h3
          style={{
            margin: 0,
            fontFamily: "'Sora', sans-serif",
            fontSize: 16,
            fontWeight: 600,
            color: COLORS.textPrimary,
            letterSpacing: '-0.02em',
          }}
        >
          Actionable Recommendations
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="fgp-fadeInUp border border-[#2A2A38] rounded-[14px] transition-all duration-200 hover:border-[#6366F1]/20 hover:shadow-[0_6px_20px_rgba(99,102,241,0.04)]"
            style={{
              backgroundColor: 'rgba(23, 23, 37, 0.3)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              animationDelay: `${i * 60}ms`,
            }}
          >
            {/* Card Header: Channel Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: COLORS.purpleLight,
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.2)',
                  borderRadius: 6,
                  padding: '3px 8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                {rec.target_channel}
              </span>
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                  color: COLORS.textMuted,
                  fontWeight: 500,
                }}
              >
                Optimization Directives
              </span>
            </div>

            {/* Split Content: Issue vs. proposed fix */}
            <div
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {/* Friction Section */}
              <div
                className="relative overflow-hidden"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.04)',
                  border: '1px solid rgba(239, 68, 68, 0.12)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #F43F5E, #FB7185)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: COLORS.danger,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Detected Friction
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    color: COLORS.textMuted,
                    lineHeight: 1.6,
                  }}
                >
                  {rec.friction_identified}
                </p>
              </div>

              {/* Suggested Revision Section */}
              <div
                className="relative overflow-hidden"
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.04)',
                  border: '1px solid rgba(16, 185, 129, 0.12)',
                  borderRadius: 10,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, #10B981, #34D399)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: COLORS.green,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    Suggested Copy Revision
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 12.5,
                    color: COLORS.textPrimary,
                    lineHeight: 1.6,
                    fontStyle: 'italic',
                  }}
                >
                  "{rec.suggested_revision.replace(/^"|"$/g, '')}"
                </p>
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
  report,
  copyText,
  copies,
  targetAudience,
  isLoading = false,
  onRunSimulation,
  error,
}) => {
  const [selectedPersonaIdx, setSelectedPersonaIdx] = useState(0);

  return (
    <div
      className="p-4 sm:p-6"
      style={{
        backgroundColor: COLORS.bg,
        fontFamily: "'Sora', sans-serif",
        color: COLORS.textPrimary,
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        boxSizing: 'border-box',
      }}
      aria-label="Synthetic Focus Group Panel"
    >
      <GlobalStyles />

      {/* ── Section 1: Header ── */}
      <div
        className="p-4 sm:p-6 relative overflow-hidden"
        style={{
          backgroundColor: COLORS.bg4,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* indigo gradient bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366F1, transparent)' }} />
        {/* Title block */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.25)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h2
              style={{
                margin: 0,
                fontFamily: "'Sora', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                color: COLORS.textPrimary,
              }}
            >
              Synthetic Focus Group
            </h2>
          </div>
          {/* Advisory notice */}
          <p
            style={{
              margin: 0,
              fontFamily: "'Sora', sans-serif",
              fontSize: 12,
              color: COLORS.textMuted,
              lineHeight: 1.6,
              maxWidth: 480,
            }}
          >
            AI-generated personas simulate how your target audience reacts to this copy. Scores and
            objections are illustrative — validate with real audience data before major decisions.
          </p>
        </div>

        {/* Score Gauge */}
        {report && !isLoading && (
          <ScoreGauge score={report.overall_score} />
        )}
      </div>

      {/* ── Section 1.5: Onboarding Guide (Show only when report is loaded) ── */}
      {report && !isLoading && (
        <div
          className="p-4 sm:p-6 relative overflow-hidden"
          style={{
            backgroundColor: COLORS.bg4,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            fontSize: 13,
            color: COLORS.textMuted,
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}
        >
          {/* sky gradient bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0EA5E9, transparent)' }} />
          <h4
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            How to use the Focus Group simulation:
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <li><strong>Analyze Objections:</strong> Review the highlighted text sections below. These are specific phrases that caused friction for our target personas.</li>
            <li><strong>Objection Details:</strong> Hover over the highlighted phrases to see which buyer objected and read their detailed verdict.</li>
            <li><strong>Friction Pulse:</strong> Check the colored pulse indicators on each card to see the level of Trust, Confusion, and Skepticism per persona.</li>
            <li><strong>Interview Sandbox:</strong> Scroll to the bottom and ask a follow-up question (e.g. <em>"If we add fabric specs, does that help?"</em>) to directly chat with the panel.</li>
          </ul>
        </div>
      )}

      {/* ── Loading State ── */}
      {isLoading && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
            gap: 16,
          }}
          aria-label="Loading focus group results"
          aria-busy
        >
          {[0, 1, 2].map(i => (
            <SkeletonCard key={i} delay={i * 120} />
          ))}
        </div>
      )}

      {/* ── Empty State ── */}
      {!isLoading && !report && (
        <div
          style={{
            backgroundColor: COLORS.bg4,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
          }}
        >
          <EmptyState onRunSimulation={onRunSimulation} error={error} targetAudience={targetAudience} copyText={copyText} previousScore={report ? (report as any).overall_score : null} />
        </div>
      )}

      {/* ── Report Sections (only when report exists and not loading) ── */}
      {!isLoading && report && (
        <>
          {/* ── Metric Summary Badges ── */}
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-2"
          >
            {/* Resonance Score Card */}
            <div
              className="relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.04)',
                border: `1px solid rgba(99, 102, 241, 0.15)`,
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #6366F1, #818CF8, transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </div>
                <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Resonance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 42 }}>
                <span style={{ fontSize: 26, fontWeight: 700, color: scoreColor(report.overall_score), fontFamily: "'Sora', sans-serif" }}>{report.overall_score}</span>
                <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Sora', sans-serif" }}>/100</span>
              </div>
            </div>

            {/* Simulated CTR Card */}
            {(() => {
              const clickCount = report.persona_critiques?.filter(c => c.click_intent).length || 0;
              const totalCount = report.persona_critiques?.length || 5;
              const ctr = Math.round((clickCount / totalCount) * 100);
              return (
                <div
                  className="relative overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(13, 148, 136, 0.04)',
                    border: `1px solid rgba(13, 148, 136, 0.15)`,
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #0D9488, #14B8A6, transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(13,148,136,0.2), rgba(20,184,166,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(13,148,136,0.2)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulated CTR</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 42 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: ctr >= 50 ? COLORS.green : COLORS.danger, fontFamily: "'Sora', sans-serif" }}>{ctr}%</span>
                    <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Sora', sans-serif" }}>({clickCount}/{totalCount} would click)</span>
                  </div>
                </div>
              );
            })()}

            {/* Total Objections Card */}
            {(() => {
              const frictionCount = report.persona_critiques?.filter(c => c.objection || c.clash_quote).length || 0;
              return (
                <div
                  className="relative overflow-hidden"
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.04)',
                    border: `1px solid rgba(245, 158, 11, 0.15)`,
                    borderRadius: 12,
                    padding: '18px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #D97706, #F59E0B, transparent)' }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(251,191,36,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identified Objections</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: 42 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: frictionCount > 2 ? COLORS.warning : COLORS.green, fontFamily: "'Sora', sans-serif" }}>{frictionCount}</span>
                    <span style={{ fontSize: 13, color: COLORS.textMuted, fontFamily: "'Sora', sans-serif" }}>friction points</span>
                  </div>
                </div>
              );
            })()}

            {/* Target Demographics Verification Card */}
            <div
              className="relative overflow-hidden"
              style={{
                backgroundColor: 'rgba(124, 58, 237, 0.04)',
                border: `1px solid rgba(124, 58, 237, 0.15)`,
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #7C3AED, #A78BFA, transparent)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(167,139,250,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Demographics</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 42 }}>
                <span
                  style={{
                    fontSize: 14,
                    color: COLORS.textPrimary,
                    fontWeight: 600,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: 240,
                    fontFamily: "'Sora', sans-serif"
                  }}
                  title={targetAudience}
                >
                  {targetAudience || 'General Audience'}
                </span>
                <span style={{ fontSize: 11, color: COLORS.green }}>✓ Verified alignment</span>
              </div>
            </div>
          </div>

          {/* ── Section 2: Copy Friction Analysis ── */}
          {copyText && report.persona_critiques?.length > 0 && (
            <CopyHighlightOverlay
              copyText={copyText}
              copies={copies}
              critiques={report.persona_critiques}
              onSelectPersona={setSelectedPersonaIdx}
            />
          )}

          {/* ── Section 3: Persona Panel (Split Pane) ── */}
          {report.persona_critiques?.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(129,140,248,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818CF8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontFamily: "'Sora', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                  }}
                >
                  Persona Panel
                </h3>
              </div>
              
              <div className="flex flex-col md:flex-row gap-6 items-stretch">
                {/* Left side: Persona list stack */}
                <div className="flex flex-col gap-2.5 w-full md:w-[280px] shrink-0">
                  {report.persona_critiques.map((critique, idx) => {
                    const isActive = idx === selectedPersonaIdx;
                    // Extract display name
                    const displayName = critique.persona_id
                      .replace(/[-_]/g, ' ')
                      .replace(/\b\d+\b/g, '') // Remove age digits if present in slug
                      .replace(/\s+/g, ' ')
                      .trim()
                      .split(' ')
                      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(' ');
                    
                    const initials = displayName.charAt(0) || 'P';
                    const scoreCol = scoreColor(critique.resonance_score);

                    return (
                      <div
                        key={critique.persona_id}
                        onClick={() => setSelectedPersonaIdx(idx)}
                        className="relative"
                        style={{
                          backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(23, 23, 37, 0.4)',
                          border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255, 255, 255, 0.06)'}`,
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {isActive && <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 2.5, background: 'linear-gradient(180deg, #6366F1, #818CF8)', borderRadius: '12px 0 0 12px' }} />}
                        {/* Avatar initials with circular frame */}
                        <div
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: isActive ? 'linear-gradient(135deg, #6366F1, #818CF8)' : 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                            boxShadow: isActive ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isActive ? '#fff' : COLORS.textPrimary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontFamily: "'Sora', sans-serif",
                            }}
                          >
                            {displayName}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: critique.click_intent ? '#4edea3' : '#F43F5E', flexShrink: 0 }} />
                            <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                              {critique.click_intent ? 'Would Click' : 'Would Scroll Past'}
                            </span>
                          </div>
                        </div>
                        {/* Resonance Score Badge */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: scoreCol,
                              backgroundColor: isActive ? `${scoreCol}15` : 'rgba(255, 255, 255, 0.02)',
                              padding: '1px 8px',
                              borderRadius: 6,
                              border: `1px solid ${scoreCol}33`,
                              fontFamily: "'Sora', sans-serif",
                              lineHeight: '20px',
                            }}
                          >
                            {critique.resonance_score}
                          </span>
                          <div style={{ width: 24, height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                            <div style={{ width: `${critique.resonance_score}%`, height: '100%', borderRadius: 2, backgroundColor: scoreCol }} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Right side: Detailed Persona Critique View */}
                <div className="flex-1 min-w-0 w-full">
                  <PersonaCard
                    critique={report.persona_critiques[selectedPersonaIdx]}
                    index={selectedPersonaIdx}
                    copies={copies}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Section 4: Multi-Persona Debate Summary ── */}
          {report.debate_summary && (
            <DebateSummaryCard summary={report.debate_summary} />
          )}

          {/* ── Section 5: Actionable Recommendations ── */}
          {report.actionable_recommendations?.length > 0 && (
            <Recommendations recommendations={report.actionable_recommendations} />
          )}
        </>
      )}

    </div>
  );
};

export default FocusGroupPanel;
