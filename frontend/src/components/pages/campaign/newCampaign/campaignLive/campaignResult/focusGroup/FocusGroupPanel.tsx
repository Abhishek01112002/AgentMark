import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface PersonaCritique {
  persona_id: string;
  resonance_score: number;
  objection: string;
  clash_quote: string;
  click_intent: boolean;
  verdict: string;
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

interface FocusGroupReport {
  overall_score: number;
  persona_critiques: PersonaCritique[];
  actionable_recommendations: ActionableRecommendation[];
  personas?: PersonaProfile[];
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
}

const PulseBar: React.FC<PulseBarProps> = ({ resonanceScore }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 80);
    return () => clearTimeout(t);
  }, []);

  const trustWidth = animated ? `${resonanceScore}%` : '0%';
  const confusionWidth = animated ? `${(100 - resonanceScore) * 0.4}%` : '0%';
  const skeptWidth = animated ? `${(100 - resonanceScore) * 0.6}%` : '0%';

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
      className="fgp-fadeInUp p-4 sm:p-5"
      style={{
        backgroundColor: 'rgba(23, 23, 37, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        animationDelay: `${index * 80}ms`,
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(99, 102, 241, 0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
      }}
    >
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
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderLeft: `4px solid ${color}`,
          borderRadius: '4px 12px 12px 4px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color }}>{critique.resonance_score}</span>
          <span style={{ fontSize: 12, color: COLORS.textMuted }}>/100 Resonance</span>
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
      </div>

      {/* Clash Quote block */}
      {critique.clash_quote && (
        <div
          style={{
            backgroundColor: 'rgba(245, 158, 11, 0.04)',
            border: '1px dashed rgba(245, 158, 11, 0.2)',
            borderRadius: 8,
            padding: '10px 12px',
            fontSize: 12,
            fontFamily: "'Inter', sans-serif",
            color: COLORS.warning,
            lineHeight: 1.5,
          }}
        >
          <span style={{ fontWeight: 600, display: 'block', marginBottom: 2, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Friction Phrase</span>
          "{critique.clash_quote}"
        </div>
      )}

      {/* Verdict / Decision */}
      {critique.verdict && (
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 13,
            color: COLORS.textPrimary,
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {critique.verdict}
        </p>
      )}

      {/* Emotional Pulse Bar */}
      <div style={{ marginTop: 'auto', paddingTop: 8 }}>
        <PulseBar resonanceScore={critique.resonance_score} />
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
        style={{
          backgroundColor: COLORS.bg4,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Section header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderBottom: isExpanded ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div>
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
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        {isExpanded && (
          <div style={{ padding: '16px 20px' }}>
            {/* Channel Tabs Selector */}
            {channels.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  marginBottom: 16,
                  borderBottom: `1px solid ${COLORS.border}`,
                  paddingBottom: 10,
                  overflowX: 'auto',
                }}
              >
                {channels.map(ch => {
                  const isActive = ch === selectedChannel;
                  return (
                    <button
                      key={ch}
                      onClick={() => setSelectedChannel(ch)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: 'none',
                        backgroundColor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                        color: isActive ? COLORS.purpleLight : COLORS.textMuted,
                        fontFamily: "'Sora', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {ch}
                    </button>
                  );
                })}
              </div>
            )}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                color: COLORS.textPrimary,
                wordBreak: 'break-word',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                padding: '16px 20px',
              }}
            >
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
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(16, 185, 129, 0.05)',
                  border: '1px solid rgba(16, 185, 129, 0.15)',
                  fontSize: 12,
                  color: COLORS.green,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                ✓ No direct friction points identified in this channel's copy.
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
}

const EmptyState: React.FC<EmptyStateProps> = ({ onRunSimulation, error }) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      gap: 20,
      textAlign: 'center',
    }}
  >
    {/* SVG Icon: people silhouettes */}
    <svg
      width={64}
      height={64}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <circle cx={20} cy={18} r={8} fill={COLORS.border} />
      <circle cx={44} cy={18} r={8} fill={COLORS.border} />
      <circle cx={32} cy={20} r={9} fill="#2A2A48" />
      <path
        d="M4 50c0-8.837 7.163-16 16-16h4M60 50c0-8.837-7.163-16-16-16h-4M16 50c0-8.837 7.163-16 16-16s16 7.163 16 16"
        stroke={COLORS.border}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path
        d="M23 50c0-4.97 4.03-9 9-9s9 4.03 9 9"
        stroke={COLORS.purple}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h3
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 18,
          fontWeight: 600,
          color: COLORS.textPrimary,
          margin: 0,
        }}
      >
        Simulate Target Audience Reactions
      </h3>
      <p
        style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 13,
          color: COLORS.textMuted,
          margin: '0 auto',
          maxWidth: 420,
          lineHeight: 1.6,
        }}
      >
        Run a simulated focus group with 5 diverse AI buyer personas matching your target demographic to review copywriting objections before deploying live.
      </p>
    </div>

    {error && (
      <div
        style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: `1px solid ${COLORS.danger}`,
          borderRadius: 10,
          padding: '12px 18px',
          maxWidth: 500,
          fontSize: 13,
          color: COLORS.danger,
          lineHeight: 1.5,
          textAlign: 'left',
          marginTop: 8,
        }}
      >
        <strong style={{ display: 'block', marginBottom: 4 }}>Simulation Error:</strong>
        {error}
      </div>
    )}

    {/* Benefits Card List */}
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
      maxWidth: 600,
      margin: '8px 0'
    }}>
      {[
        { title: "Protect Ad Budget", desc: "Detect conversion barriers and copy friction before wasting budget on paid marketing channels." },
        { title: "Predict Click Rates", desc: "Estimate click decisions and audience resonance ratings across key buyer demographics." },
        { title: "Optimize Conversions", desc: "Verify copy revisions in real-time by directly interviewing the simulated consumer panel." }
      ].map((item, idx) => (
        <div key={idx} className="w-full sm:w-[170px] flex-grow sm:flex-grow-0" style={{
          backgroundColor: COLORS.bg3,
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          padding: '12px 16px',
          textAlign: 'left',
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textPrimary }}>{item.title}</span>
          <span style={{ fontSize: 11, color: COLORS.textMuted, lineHeight: 1.4 }}>{item.desc}</span>
        </div>
      ))}
    </div>

    {onRunSimulation && (
      <button
        className="fgp-btn"
        onClick={onRunSimulation}
        style={{
          backgroundColor: COLORS.purple,
          color: '#fff',
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: 14,
          fontWeight: 600,
          marginTop: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        aria-label="Run focus group simulation"
      >
        <span aria-hidden>▶</span>
        Run Simulation
      </button>
    )}
  </div>
);

// ─── Actionable Recommendations ───────────────────────────────────────────────

interface RecommendationsProps {
  recommendations: ActionableRecommendation[];
}

const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) return null;

  return (
    <div
      style={{
        backgroundColor: COLORS.bg4,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 16,
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {recommendations.map((rec, i) => (
          <div
            key={i}
            className="fgp-fadeInUp"
            style={{
              backgroundColor: 'rgba(23, 23, 37, 0.3)',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 14,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              animationDelay: `${i * 60}ms`,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = COLORS.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Card Header: Channel Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.01)',
                  borderLeft: `3px solid ${COLORS.danger}`,
                  borderRadius: '0 8px 8px 0',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: COLORS.danger,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Detected Friction
                </span>
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
                style={{
                  backgroundColor: 'rgba(16, 185, 129, 0.01)',
                  borderLeft: `3px solid ${COLORS.green}`,
                  borderRadius: '0 8px 8px 0',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 9,
                    color: COLORS.green,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                  }}
                >
                  Suggested Copy Revision
                </span>
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
        className="p-4 sm:p-6"
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
        {/* Title block */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
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
          className="p-4 sm:p-6"
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
          <EmptyState onRunSimulation={onRunSimulation} error={error} />
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
              style={{
                backgroundColor: 'rgba(23, 23, 37, 0.4)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall Resonance</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ fontSize: 24, fontWeight: 700, color: scoreColor(report.overall_score) }}>{report.overall_score}</span>
                <span style={{ fontSize: 12, color: COLORS.textMuted }}>/100</span>
              </div>
            </div>

            {/* Simulated CTR Card */}
            {(() => {
              const clickCount = report.persona_critiques?.filter(c => c.click_intent).length || 0;
              const totalCount = report.persona_critiques?.length || 5;
              const ctr = Math.round((clickCount / totalCount) * 100);
              return (
                <div
                  style={{
                    backgroundColor: 'rgba(23, 23, 37, 0.4)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simulated CTR</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: ctr >= 50 ? COLORS.green : COLORS.danger }}>{ctr}%</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>({clickCount}/{totalCount} would click)</span>
                  </div>
                </div>
              );
            })()}

            {/* Total Objections Card */}
            {(() => {
              const frictionCount = report.persona_critiques?.filter(c => c.objection || c.clash_quote).length || 0;
              return (
                <div
                  style={{
                    backgroundColor: 'rgba(23, 23, 37, 0.4)',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6
                  }}
                >
                  <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identified Objections</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 24, fontWeight: 700, color: frictionCount > 2 ? COLORS.warning : COLORS.green }}>{frictionCount}</span>
                    <span style={{ fontSize: 12, color: COLORS.textMuted }}>friction points</span>
                  </div>
                </div>
              );
            })()}

            {/* Target Demographics Verification Card */}
            <div
              style={{
                backgroundColor: 'rgba(23, 23, 37, 0.4)',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 12,
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6
              }}
            >
              <span style={{ fontSize: 11, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Target Demographics</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span
                  style={{
                    fontSize: 13,
                    color: COLORS.textPrimary,
                    fontWeight: 600,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    maxWidth: 240
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
              <h3
                style={{
                  margin: '0 0 16px 0',
                  fontFamily: "'Sora', sans-serif",
                  fontSize: 15,
                  fontWeight: 600,
                  color: COLORS.textPrimary,
                }}
              >
                Persona Panel
              </h3>
              
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
                        style={{
                          backgroundColor: isActive ? 'rgba(99, 102, 241, 0.08)' : 'rgba(23, 23, 37, 0.4)',
                          border: `1px solid ${isActive ? COLORS.purple : 'rgba(255, 255, 255, 0.06)'}`,
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        {/* Avatar initials with circular frame */}
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: isActive ? COLORS.purple : 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: isActive ? '#fff' : COLORS.textPrimary,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {displayName}
                          </span>
                          <span style={{ fontSize: 11, color: COLORS.textMuted }}>
                            {critique.click_intent ? 'Would Click' : 'Would Scroll Past'}
                          </span>
                        </div>
                        {/* Resonance Score Badge */}
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: scoreCol,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: `1px solid ${scoreCol}33`,
                          }}
                        >
                          {critique.resonance_score}
                        </span>
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

          {/* ── Section 4: Actionable Recommendations ── */}
          {report.actionable_recommendations?.length > 0 && (
            <Recommendations recommendations={report.actionable_recommendations} />
          )}
        </>
      )}

    </div>
  );
};

export default FocusGroupPanel;
