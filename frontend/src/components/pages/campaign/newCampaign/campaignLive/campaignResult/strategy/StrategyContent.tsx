import React, { useRef, useState } from 'react';
import { Compass, Columns, Calendar, MessageSquare, KeyRound, Users, BarChart3, Award, DollarSign, Share2, PlayCircle, FileDown, AlertTriangle } from 'lucide-react';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import toast from 'react-hot-toast';

interface StrategyContentProps {
  data?: any;
  campaign?: any;
}

const getChannelDisplayName = (ch: any): string => {
  if (!ch) return '';
  const rawName = typeof ch === 'object' ? (ch.name || ch.channel || '') : String(ch);
  const name = rawName.toLowerCase().trim();
  if (name.includes('linkedin')) return 'LinkedIn';
  if (name.includes('facebook')) return 'Facebook';
  if (name.includes('youtube')) return 'YouTube';
  if (name.includes('twitter') || name === 'x') return 'Twitter / X';
  if (name.includes('tiktok')) return 'TikTok';
  if (name.includes('instagram')) return 'Instagram';
  if (name.includes('google') || name.includes('adwords')) return 'Google Ads';
  if (name.includes('email') || name.includes('newsletter') || name.includes('mail')) return 'Email';
  if (name.includes('pinterest')) return 'Pinterest';
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
};

const StrategyContent: React.FC<StrategyContentProps> = ({ data, campaign }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const hasRealData = data && Object.keys(data).length > 0;


  // Extract data from AI output
  const positioning = data?.positioning || '';
  const keyMessages = data?.key_messages || [];
  const contentPillars = data?.content_pillars || [];
  const channelStrategy = data?.channel_strategy || {};
  const audienceSegments = data?.audience_segments || [];
  const timeline = data?.timeline || {};
  const successMetrics = data?.success_metrics || {};
  const competitiveDiff = data?.competitive_differentiation || {};
  const budgetAllocation = data?.execution?.budget_allocation || {};
  const inferredGoal = data?.inferred_goal || campaign?.primaryGoal || '';

  const coreMessage = data?.core_message || data?.messaging_framework || data?.message || positioning || '';
  const valueProposition = data?.value_proposition || data?.value_prop || competitiveDiff.unique_value_proposition || competitiveDiff.primary_differentiation || '';
  const targetAudience = campaign?.targetAudience || data?.target_audience || data?.audience || '';
  const channels = data?.channels || data?.marketing_channels || [];
  const contentCalendar = data?.content_calendar || data?.content_plan || [];

  // Only use real data — no hardcoded fallbacks
  const displayCalendar = Array.isArray(contentCalendar) && contentCalendar.length > 0 ? contentCalendar : [];
  const displayChannels = Array.isArray(channels) && channels.length > 0 ? channels : [];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ready': return { bg: 'rgba(78, 222, 163, 0.1)', text: '#4edea3', dotBg: '#4edea3' };
      case 'review': return { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', dotBg: '#F59E0B' };
      case 'drafting': return { bg: '#1A1A24', text: '#A0A0D2', dotBg: '#A0A0D2' };
      case 'planned': return { bg: '#1A1A24', text: '#A0A0D2', dotBg: '#A0A0D2' };
      default: return { bg: '#1A1A24', text: '#8B8B9E', dotBg: '#8B8B9E' };
    }
  };

  // ─── Build self-contained print HTML in a new popup ───────────────────────
  const buildPrintHTML = (): string => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const sectionWrap = (title: string, inner: string) => `
      <div class="section">
        <div class="section-title">${esc(title)}</div>
        ${inner}
      </div>`;

    const card = (inner: string) => `<div class="card">${inner}</div>`;
    const grid2 = (items: string[]) => `<div class="grid-2">${items.join('')}</div>`;
    const grid4 = (items: string[]) => `<div class="grid-4">${items.join('')}</div>`;
    const tag = (t: string, color = '#6366F1') =>
      `<span class="tag" style="background:${color}18;color:${color};border:1px solid ${color}44">${esc(t)}</span>`;
    const bullet = (t: string) =>
      `<div class="bullet"><span class="dot"></span>${esc(t)}</div>`;

    let sections = '';

    if (positioning) {
      sections += `
        <div class="positioning-block">
          <div class="positioning-label">Positioning Statement</div>
          <div class="positioning-text">"${esc(positioning)}"</div>
        </div>`;
    }

    if (inferredGoal) {
      sections += `<div style="margin-bottom:18px">${tag(inferredGoal.replace('_', ' ').toUpperCase(), '#059669')}</div>`;
    }

    sections += sectionWrap('Core Messaging Framework', `
      <div class="quote-block">${esc(coreMessage || '"Empowering elite marketing teams with surgical precision and autonomous intelligence to scale campaigns faster than ever."')}</div>
      ${grid2([
        card(`<div class="card-label">Value Proposition</div><div class="card-body">${esc(valueProposition || 'Reduce campaign setup time by 80% while increasing creative output quality.')}</div>`),
        card(`<div class="card-label">Target Audience</div><div class="card-body">${esc(targetAudience || 'Enterprise CMOs and Growth Leads managing $1M+ quarterly budgets.')}</div>`),
      ])}
    `);

    if (keyMessages.length > 0) {
      sections += sectionWrap('Key Messages', grid2(
        keyMessages.map((msg: string, i: number) =>
          card(`<div style="display:flex;gap:10px;align-items:flex-start"><span class="num-badge">${i + 1}</span><div class="card-body">${esc(msg)}</div></div>`)
        )
      ));
    }

    if (contentPillars.length > 0) {
      sections += sectionWrap('Content Pillars', grid2(
        contentPillars.map((p: string) => card(`<div class="card-body" style="font-weight:600">${esc(p)}</div>`))
      ));
    }

    if (audienceSegments.length > 0) {
      sections += sectionWrap('Audience Segments', audienceSegments.map((seg: any) =>
        card(`
          <div class="card-title">${esc(seg.segment_name)}</div>
          <div class="meta-row"><span class="meta-label">Demographics</span><span>${esc(seg.demographics)}</span></div>
          <div class="meta-row"><span class="meta-label">Psychographics</span><span>${esc(seg.psychographics)}</span></div>
          <div class="meta-row"><span class="meta-label">Key Message</span><span style="font-weight:600">${esc(seg.key_message)}</span></div>
        `)
      ).join(''));
    }

    if (Object.keys(timeline).length > 0) {
      sections += sectionWrap('Campaign Timeline', grid2(
        Object.entries(timeline).map(([, phase]: [string, any]) => card(`
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;flex-wrap:wrap;gap:6px">
            <div class="card-title" style="margin:0">${esc(phase.phase_name)}</div>
            <span class="badge">${esc(phase.duration)}</span>
          </div>
          ${phase.start_date && phase.end_date ? `<div class="meta-label" style="margin-bottom:10px">${esc(phase.start_date)} → ${esc(phase.end_date)}</div>` : ''}
          ${(phase.activities || []).map((a: string) => bullet(a)).join('')}
        `))
      ));
    }

    if (successMetrics.kpis) {
      sections += sectionWrap('Success Metrics & KPIs', grid4(
        successMetrics.kpis.map((kpi: string) => card(`
          <div class="card-label">${esc(kpi)}</div>
          ${successMetrics.targets?.[kpi] ? `<div style="font-size:20px;font-weight:700;color:#059669;margin-top:6px">${esc(successMetrics.targets[kpi])}</div>` : ''}
        `))
      ));
    }

    if (competitiveDiff.unique_value_proposition) {
      const compCards = [
        card(`<div class="card-label">Unique Value Proposition</div><div class="card-body">${esc(competitiveDiff.unique_value_proposition)}</div>`),
        card(`<div class="card-label">Competitive Advantage</div><div class="card-body">${esc(competitiveDiff.competitive_advantage || '')}</div>`),
      ];
      if (competitiveDiff.primary_differentiation)
        compCards.push(card(`<div class="card-label">Primary Differentiation</div><div class="card-body">${esc(competitiveDiff.primary_differentiation)}</div>`));
      if (competitiveDiff.competitors?.length)
        compCards.push(card(`<div class="card-label">Main Competitors</div><div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${competitiveDiff.competitors.map((c: string) => tag(c, '#6366F1')).join('')}</div>`));
      sections += sectionWrap('Competitive Differentiation', grid2(compCards));
    }

    if (Object.keys(budgetAllocation).length > 0) {
      sections += sectionWrap('Budget Allocation', grid4(
        Object.entries(budgetAllocation).map(([key, val]: [string, any]) => card(`
          <div class="card-label">${esc(key.replace(/_/g, ' '))}</div>
          <div style="font-size:20px;font-weight:700;color:#6366F1;margin-top:6px">${esc(String(val))}</div>
        `))
      ));
    }

    if (Object.keys(channelStrategy).length > 0) {
      sections += sectionWrap('Channel Strategy', grid2(
        Object.entries(channelStrategy).map(([ch, plan]: [string, any]) => card(`
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div class="card-title" style="margin:0">${esc(ch)}</div>
            <span class="badge">${esc(plan.priority)} Priority</span>
          </div>
          <div class="card-body" style="margin-bottom:10px">${esc(plan.rationale || '')}</div>
          ${plan.tactics?.length ? `<div class="meta-label" style="margin-bottom:6px">Tactics</div>${plan.tactics.map((t: string) => bullet(t)).join('')}` : ''}
        `))
      ));
    }

    if (displayChannels.length > 0) {
      sections += sectionWrap('Active Channels', grid2(
        displayChannels.slice(0, 4).map((ch: any) => {
          const chDesc = typeof ch === 'object' ? (ch.desc || ch.description || '') : 'Channel strategy details';
          const chBadge = typeof ch === 'object' ? (ch.badge || 'Active') : 'Active';
          const chBadgeColor = typeof ch === 'object' ? (ch.badgeColor || '#6366F1') : '#6366F1';
          return card(`
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <div class="card-title" style="margin:0">${esc(getChannelDisplayName(ch))}</div>
              ${chBadge ? tag(chBadge, chBadgeColor) : ''}
            </div>
            <div class="card-body">${esc(chDesc)}</div>
          `);
        })
      ));
    }

    const calRows = (displayCalendar as any[]).slice(0, 12).map((row: any) => {
      const statusColors: Record<string, string> = { ready: '#059669', review: '#D97706', drafting: '#6366F1', planned: '#6B7280' };
      const color = statusColors[row.status] || '#6B7280';
      return `<tr>
        <td>${esc(row.week || row.timeframe || '')}</td>
        <td>${esc(row.channel || row.platform || '')}</td>
        <td><span class="badge">${esc(row.type || row.content_type || 'Content')}</span></td>
        <td>${esc(row.topic || row.title || row.asset || '')}</td>
        <td><span style="color:${color};font-weight:600">${esc(row.statusLabel || row.status || 'Planned')}</span></td>
      </tr>`;
    }).join('');

    if (calRows.length > 0) {
      sections += sectionWrap('Content Rollout Calendar', `
        <table>
          <thead><tr><th>Week</th><th>Channel</th><th>Content Type</th><th>Topic / Asset</th><th>Status</th></tr></thead>
          <tbody>${calRows}</tbody>
        </table>
      `);
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Campaign Strategy Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Inter','Segoe UI',sans-serif;background:#f8f8fc;color:#1a1a2e;font-size:13px;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .page{max-width:960px;margin:0 auto;padding:32px 40px 60px}
    .cover{display:flex;align-items:center;justify-content:space-between;padding:28px 36px;margin-bottom:28px;background:linear-gradient(135deg,#6366F1 0%,#4F46E5 60%,#312e81 100%);border-radius:16px;color:white}
    .cover-logo{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:8px}
    .cover-title{font-size:24px;font-weight:800;line-height:1.2}
    .cover-sub{font-size:12px;opacity:.75;margin-top:6px}
    .cover-right{text-align:right}
    .cover-date{font-size:11px;opacity:.7}
    .cover-goal{display:inline-block;margin-top:8px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:600;letter-spacing:.08em}
    .section{background:white;border:1px solid #e5e7eb;border-radius:12px;padding:20px 24px;margin-bottom:18px;break-inside:auto;box-shadow:0 1px 4px rgba(0,0,0,.06)}
    .section-title{font-size:13px;font-weight:700;color:#111;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #6366F1;letter-spacing:.02em}
    .positioning-block{background:linear-gradient(to right,#ede9fe,#f5f3ff);border-left:4px solid #6366F1;border-radius:10px;padding:18px 22px;margin-bottom:18px;break-inside:avoid}
    .positioning-label{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6366F1;margin-bottom:8px}
    .positioning-text{font-size:14px;font-style:italic;color:#312e81;line-height:1.7;font-weight:500}
    .quote-block{font-size:13px;font-style:italic;color:#374151;border-left:3px solid #6366F1;padding:10px 14px;margin-bottom:14px;background:#f5f3ff;border-radius:0 8px 8px 0}
    .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;break-inside:avoid}
    .card-title{font-size:12px;font-weight:700;color:#111;margin-bottom:8px}
    .card-label{font-size:10px;font-weight:600;letter-spacing:.09em;text-transform:uppercase;color:#6366F1;margin-bottom:5px}
    .card-body{font-size:12px;color:#4b5563;line-height:1.6}
    .meta-row{display:flex;gap:10px;align-items:flex-start;margin-bottom:7px;font-size:12px}
    .meta-label{font-size:10px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#9CA3AF;white-space:nowrap;min-width:88px;padding-top:1px}
    .badge{font-size:10px;font-weight:600;letter-spacing:.04em;padding:3px 8px;border-radius:4px;background:#f3f4f6;color:#374151;border:1px solid #e5e7eb}
    .tag{font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;display:inline-block;margin:2px}
    .num-badge{width:22px;height:22px;border-radius:50%;background:#ede9fe;color:#6366F1;font-size:11px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;margin-right:4px}
    .bullet{display:flex;align-items:flex-start;gap:8px;font-size:12px;color:#4b5563;margin-bottom:5px}
    .dot{width:6px;height:6px;border-radius:50%;background:#6366F1;flex-shrink:0;margin-top:5px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    thead tr{background:#f3f4f6}
    th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;border-bottom:2px solid #e5e7eb}
    td{padding:9px 12px;border-bottom:1px solid #f3f4f6;color:#374151;vertical-align:middle}
    tbody tr:nth-child(even) td{background:#fafafa}
    .footer{margin-top:36px;padding-top:14px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9CA3AF}
    @page{size:A4;margin:12mm 12mm}
    @media print{body{background:white}.page{padding:0}.section{box-shadow:none}}
  </style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div>
      <div class="cover-logo">AgentMark AI</div>
      <div class="cover-title">Campaign Strategy Report</div>
      <div class="cover-sub">AI-generated strategic framework</div>
    </div>
    <div class="cover-right">
      <div class="cover-date">${today}</div>
      ${inferredGoal ? `<div class="cover-goal">${esc(inferredGoal.replace('_', ' ').toUpperCase())}</div>` : ''}
    </div>
  </div>
  ${sections}
  <div class="footer">
    <span>Generated by AgentMark AI</span>
    <span>${today}</span>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},500);}</script>
</body>
</html>`;
  };

  const handleExportPDF = () => {
    toast.loading('Preparing PDF…', { id: 'pdf-export', duration: 5000 });
    setTimeout(() => {
      try {
        const html = buildPrintHTML();

        // Hidden iframe — no visible page opens, just the print dialog
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:none;';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          toast.error('PDF generation failed. Please try again.', { id: 'pdf-export' });
          document.body.removeChild(iframe);
          return;
        }

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        // Wait for fonts & images to load, then print
        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            toast.success('Save as PDF from the print dialog!', { id: 'pdf-export' });
            // Cleanup after dialog closes
            setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 60000);
          }, 600);
        };
      } catch {
        toast.error('PDF generation failed. Please try again.', { id: 'pdf-export' });
      }
    }, 100);
  };

  return (
    <>
      <style>{`
        .pulse-dot { animation: pulse 2s infinite ease-in-out; }
        @keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }

        /* ─── Beautiful Print / PDF Styles ─── */
        @media print {
          /* Hide everything except the strategy report */
          body > * { display: none !important; }
          #strategy-print-root,
          #strategy-print-root * { display: revert !important; }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff !important;
            color: #111118 !important;
            font-family: 'Sora', Georgia, serif !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          #strategy-print-root {
            display: block !important;
            width: 100%;
            max-width: 960px;
            margin: 0 auto;
            padding: 32px 40px;
            background: #ffffff !important;
            color: #111118 !important;
          }

          /* PDF Cover Header */
          .pdf-header {
            display: flex !important;
            align-items: center;
            justify-content: space-between;
            border-bottom: 3px solid #6366F1;
            padding-bottom: 16px;
            margin-bottom: 32px;
          }
          .pdf-header h1 {
            font-size: 28px;
            font-weight: 700;
            color: #111118 !important;
            margin: 0;
          }
          .pdf-header .pdf-meta {
            font-size: 11px;
            color: #555 !important;
            text-align: right;
          }
          .pdf-header .pdf-logo {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.05em;
            color: #6366F1 !important;
            font-family: 'JetBrains Mono', monospace;
          }

          /* Hide action buttons & badges in print */
          .pdf-no-print { display: none !important; }

          /* Section Cards */
          .pdf-section {
            border: 1px solid #E5E7EB !important;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 20px;
            background: #FAFAFA !important;
            break-inside: avoid;
          }
          .pdf-section h2 {
            font-size: 16px;
            font-weight: 700;
            color: #111118 !important;
            margin: 0 0 12px 0;
            padding-bottom: 8px;
            border-bottom: 1px solid #E5E7EB;
          }
          .pdf-section p,
          .pdf-section li,
          .pdf-section span {
            color: #374151 !important;
            font-size: 13px;
          }

          /* Positioning accent bar */
          .pdf-positioning {
            background: #F5F3FF !important;
            border-left: 4px solid #6366F1 !important;
            border-radius: 8px;
            padding: 16px 20px;
            margin-bottom: 20px;
          }
          .pdf-positioning p {
            font-size: 14px !important;
            font-style: italic;
            color: #1F1135 !important;
          }

          /* Two-column grid helpers */
          .pdf-grid-2 {
            display: grid !important;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          .pdf-grid-3 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .pdf-grid-4 {
            display: grid !important;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }

          /* Inline tags / badges */
          .pdf-tag {
            display: inline-block !important;
            padding: 2px 8px;
            border-radius: 4px;
            background: #EEF2FF !important;
            color: #4338CA !important;
            font-size: 11px;
            font-family: 'JetBrains Mono', monospace;
            margin: 2px;
          }

          /* Table in print */
          .pdf-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
          }
          .pdf-table th {
            background: #F3F4F6 !important;
            color: #374151 !important;
            padding: 8px 12px;
            text-align: left;
            font-weight: 600;
            border-bottom: 2px solid #E5E7EB;
          }
          .pdf-table td {
            padding: 8px 12px;
            border-bottom: 1px solid #F3F4F6;
            color: #374151 !important;
          }
          .pdf-table tr:nth-child(even) td {
            background: #FAFAFA !important;
          }

          /* Page number footer */
          @page {
            margin: 20mm 15mm;
            size: A4;
          }
          @page :first { margin-top: 10mm; }
        }
      `}</style>

      <div id="strategy-print-root" className="space-y-6 md:space-y-8" ref={printRef}>

        {/* ─── PDF-only cover header (hidden on screen) ─── */}
        <div className="pdf-header" style={{ display: 'none' }}>
          <div>
            <div className="pdf-logo">AgentMark AI</div>
            <h1>Campaign Strategy Report</h1>
          </div>
          <div className="pdf-meta">
            <div>Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
            {inferredGoal && <div>Goal: {inferredGoal.replace('_', ' ').toUpperCase()}</div>}
          </div>
        </div>

        {/* ─── Screen header (hidden in print) ─── */}
        <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-surface border border-[#2A2A38] flex items-center justify-center text-[#6366F1]">
                  <Compass size={22} />
                </div>
                <h2 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                  Campaign Strategy
                </h2>
              </div>
              <p className="text-sm md:text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                {hasRealData ? 'AI-generated strategic framework' : 'Strategic campaign framework'}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              {inferredGoal && (
                <span className="px-3 py-1.5 rounded-full bg-[#6366F1]/10 border border-[#6366F1]/20 text-sm" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
                  Goal: {inferredGoal.replace('_', ' ').toUpperCase()}
                </span>
              )}
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-lg border border-[#2A2A38] text-sm font-medium transition-colors hover:bg-[#1A1A24] flex items-center gap-2"
                style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}
              >
                <FileDown size={16} />Export PDF
              </button>
              <button className="px-4 py-2 rounded-lg bg-[#6366F1] text-sm font-medium transition-opacity hover:opacity-90 flex items-center gap-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                <PlayCircle size={16} />Execute
              </button>
            </div>
          </div>
        </div>

        {!hasRealData && (
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
            <p className="text-sm flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              <AlertTriangle size={16} className="text-[#F59E0B] flex-shrink-0" />
              No strategy data available yet. This will be populated after AI agents complete analysis.
            </p>
          </div>
        )}

        {/* Positioning Statement */}
        {positioning && (
          <div className="card-elevate relative bg-gradient-to-br from-[#6366F1]/15 via-[#111118] to-[#0A0A0F] border-l-4 border-[#6366F1] rounded-xl p-6 shadow-[0_0_40px_rgba(99,102,241,0.1)] overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#6366F1]/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2 relative" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}>
              <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 flex items-center justify-center"><Compass size={16} className="text-[#6366F1]" /></div>
              Positioning Statement
            </h3>
            <p className="text-lg md:text-xl leading-relaxed relative" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3', fontWeight: 500 }}>
              "{positioning}"
            </p>
            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-[#6366F1]/30 to-transparent" />
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-6">
          <div className="xl:col-span-7 space-y-6">
            <div className="card-elevate pdf-section rounded-xl p-5 md:p-6 relative overflow-hidden group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#6366F1] to-transparent opacity-50 pdf-no-print" />
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <MessageSquare size={20} className="text-[#6366F1] pdf-no-print" />Core Messaging Framework
              </h2>
              <div className="pl-6 border-l-2 border-[#6366F1] py-2 mb-6 relative">
                <span className="absolute -left-3 top-0 w-6 h-6 bg-[#111118] rounded-full flex items-center justify-center text-[#6366F1] pdf-no-print">"</span>
                <p className="text-base md:text-lg italic leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                  {coreMessage || '"Empowering elite marketing teams with surgical precision and autonomous intelligence to scale campaigns faster than ever."'}
                </p>
              </div>
              <div className="pdf-grid-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-elevate bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
                  <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Value Proposition</h3>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{valueProposition || 'Reduce campaign setup time by 80% while increasing creative output quality.'}</p>
                </div>
                <div className="bg-[#1A1A24] p-4 rounded-lg border border-[#2A2A38]/50">
                  <h3 className="text-sm font-medium mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>Target Audience</h3>
                  <p className="text-xs leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{targetAudience || 'Enterprise CMOs and Growth Leads managing $1M+ quarterly budgets.'}</p>
                </div>
              </div>
            </div>

            {contentPillars.length > 0 && (
              <div className="card-elevate pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                <h2 className="text-lg md:text-xl mb-5 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                  <Columns size={20} className="text-[#6366F1] pdf-no-print" />Content Pillars
                </h2>
                <div className="pdf-grid-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {contentPillars.map((pillar: string, idx: number) => (
                    <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg px-4 py-3">
                      <p className="text-sm font-medium leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{pillar}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {keyMessages.length > 0 && (
              <div className="card-elevate pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                  <KeyRound size={20} className="text-[#6366F1] pdf-no-print" />Key Messages
                </h2>
                <div className="pdf-grid-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keyMessages.map((msg: string, idx: number) => (
                    <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4 min-h-[96px]">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-[#6366F1]/10 flex items-center justify-center text-[#6366F1] flex-shrink-0 text-sm font-bold">{idx + 1}</span>
                        <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{msg}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="xl:col-span-5 space-y-6">
            {audienceSegments.length > 0 && (
              <div className="card-elevate pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                <h2 className="text-lg md:text-xl mb-5 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                  <Users size={20} className="text-[#6366F1] pdf-no-print" />Audience Segments
                </h2>
                <div className="space-y-4">
                {audienceSegments.map((segment: any, idx: number) => (
                    <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                    <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{segment.segment_name}</h3>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Demographics</span>
                        <p className="text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{segment.demographics}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Psychographics</span>
                        <p className="text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{segment.psychographics}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Key Message</span>
                        <p className="text-sm mt-1" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{segment.key_message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>

          {Object.keys(timeline).length > 0 && (
            <div className="card-elevate xl:col-span-12 pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Calendar size={20} className="text-[#6366F1] pdf-no-print" />Campaign Timeline
              </h2>
              <div className="pdf-grid-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(timeline).map(([, phase]: [string, any], idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5 min-h-[180px]">
                    <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                      <h3 className="text-base font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{phase.phase_name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{phase.duration}</span>
                        {phase.start_date && phase.end_date && (
                          <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{phase.start_date} - {phase.end_date}</span>
                        )}
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {phase.activities?.map((activity: string, aidx: number) => (
                        <li key={aidx} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] mt-1.5 flex-shrink-0" />
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {successMetrics.kpis && (
            <div className="card-elevate-green xl:col-span-12 pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <BarChart3 size={20} className="text-[#6366F1] pdf-no-print" />Success Metrics & KPIs
              </h2>
              <div className="pdf-grid-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {successMetrics.kpis.map((kpi: string, idx: number) => (
                  <div key={idx} className="card-elevate bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                    <p className="text-sm font-medium mb-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{kpi}</p>
                    {successMetrics.targets?.[kpi] && (
                      <p className="text-xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{successMetrics.targets[kpi]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {competitiveDiff.unique_value_proposition && (
            <div className="card-elevate xl:col-span-12 pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Award size={20} className="text-[#6366F1] pdf-no-print" />Competitive Differentiation
              </h2>
              <div className="pdf-grid-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Unique Value Proposition</h3>
                  <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.unique_value_proposition}</p>
                </div>
                <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                  <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Competitive Advantage</h3>
                  <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.competitive_advantage}</p>
                </div>
                {competitiveDiff.primary_differentiation && (
                  <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Primary Differentiation</h3>
                    <p className="text-base" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{competitiveDiff.primary_differentiation}</p>
                  </div>
                )}
                {competitiveDiff.competitors && (
                  <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                    <h3 className="text-sm font-medium mb-3" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Main Competitors</h3>
                    <div className="flex flex-wrap gap-2">
                      {competitiveDiff.competitors.map((comp: string, idx: number) => (
                        <span key={idx} className="pdf-tag px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{comp}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {Object.keys(budgetAllocation).length > 0 && (
            <div className="card-elevate xl:col-span-12 pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <DollarSign size={20} className="text-[#6366F1] pdf-no-print" />Budget Allocation
              </h2>
              <div className="pdf-grid-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(budgetAllocation).map(([key, value]: [string, any], idx: number) => (
                  <div key={idx} className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4">
                    <h3 className="text-xs uppercase mb-2" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>{key.replace(/_/g, ' ')}</h3>
                    <p className="text-lg font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Object.keys(channelStrategy).length > 0 && (
            <div className="card-elevate xl:col-span-12 pdf-section rounded-xl p-5 md:p-6" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
              <h2 className="text-lg md:text-xl mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
                <Share2 size={20} className="text-[#6366F1] pdf-no-print" />Channel Strategy
              </h2>
              <div className="pdf-grid-2 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(channelStrategy).map(([channel, plan]: [string, any], idx: number) => (
                  <div key={idx} className="card-elevate bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-semibold flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                        <ChannelIcon channel={channel} size={16} className="text-[#6366F1] shrink-0" />
                        {channel}
                      </h3>
                      <span className="text-xs px-2 py-1 rounded bg-[#1A1A24] border border-[#2A2A38]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#8B8B9E' }}>{plan.priority} Priority</span>
                    </div>
                    <p className="text-sm mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{plan.rationale}</p>
                    {plan.tactics && (
                      <div>
                        <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Tactics</span>
                        <ul className="space-y-1">
                          {plan.tactics.map((tactic: string, tidx: number) => (
                            <li key={tidx} className="flex items-start gap-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1] mt-1.5 flex-shrink-0" />
                              {tactic}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {displayChannels.length > 0 && (
          <div className="xl:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            {displayChannels.slice(0, 3).map((ch: any, idx: number) => {
              const chName = typeof ch === 'object' ? (ch.name || ch.channel || '') : String(ch);
              const chDesc = typeof ch === 'object' ? (ch.desc || ch.description || 'Channel strategy details') : 'Channel strategy details';
              const chBadge = typeof ch === 'object' ? (ch.badge || 'Active') : 'Active';
              const chBadgeColor = typeof ch === 'object' ? (ch.badgeColor || '#6366F1') : '#6366F1';

              return (
                <div key={idx} className="card-elevate rounded-xl p-5 cursor-pointer group transition-all" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center pdf-no-print" style={{ backgroundColor: (typeof ch === 'object' && ch.bg) || 'rgba(99, 102, 241, 0.1)', color: (typeof ch === 'object' && ch.color) || '#6366F1' }}>
                        {typeof ch === 'object' && typeof ch.icon === 'function' ? (
                          (() => {
                            const Icon = ch.icon;
                            return <Icon size={18} />;
                          })()
                        ) : (
                          <ChannelIcon channel={chName} size={18} />
                        )}
                      </div>
                      <h3 className="text-sm font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#F1F1F3' }}>
                        {getChannelDisplayName(ch)}
                      </h3>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full pdf-tag" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: `${chBadgeColor}1A`, color: chBadgeColor }}>{chBadge}</span>
                  </div>
                  <p className="text-xs mt-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{chDesc}</p>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Content Rollout Table */}
        <div className="card-elevate pdf-section rounded-xl overflow-hidden" style={{ background: '#111118', border: '1px solid #2A2A38' }}>
          <div className="p-5 md:p-6 border-b border-[#2A2A38] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h2 className="text-lg md:text-xl flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, color: '#F1F1F3' }}>
              <Calendar size={20} className="text-[#8B8B9E] pdf-no-print" />Content Rollout
            </h2>
            {displayCalendar.length > 10 && (
              <button 
                onClick={() => setIsTimelineExpanded(!isTimelineExpanded)} 
                className="text-sm hover:underline pdf-no-print" 
                style={{ fontFamily: 'JetBrains Mono, monospace', color: '#6366F1' }}
              >
                {isTimelineExpanded ? 'Collapse Timeline' : 'View Full Timeline'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="pdf-table w-full text-left border-collapse" style={{ minWidth: 640 }}>
              <thead>
                <tr className="bg-[#1A1A24] border-b border-[#2A2A38]">
                  {['Week', 'Channel', 'Content Type', 'Topic / Asset', 'Status'].map((header, idx) => (
                    <th key={idx} className={`py-3 px-4 md:px-6 text-xs uppercase tracking-wider ${idx === 4 ? 'text-right' : ''}`} style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 500, color: '#A0A0D2' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[#2A2A38]/50">
                {(isTimelineExpanded ? displayCalendar : displayCalendar.slice(0, 10)).map((row: any, idx: number) => {
                  const statusStyle = getStatusStyle(row.status || 'planned');
                  return (
                    <tr key={idx} className="hover:bg-[#111118] transition-colors">
                      <td className="py-4 px-4 md:px-6 font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{row.week || row.timeframe || `Week ${idx + 1}`}</td>
                      <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{row.channel || row.platform || 'N/A'}</td>
                      <td className="py-4 px-4 md:px-6">
                        <span className="px-2 py-1 bg-[#1A1A24] rounded text-xs border border-[#2A2A38]" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{row.type || row.content_type || 'Content'}</span>
                      </td>
                      <td className="py-4 px-4 md:px-6" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{row.topic || row.title || row.asset || 'Untitled'}</td>
                      <td className="py-4 px-4 md:px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs pdf-tag" style={{ fontFamily: 'JetBrains Mono, monospace', backgroundColor: statusStyle.bg, color: statusStyle.text, fontWeight: 500 }}>
                          <span className={`w-1.5 h-1.5 rounded-full pdf-no-print ${row.status === 'review' ? 'pulse-dot' : ''}`} style={{ backgroundColor: statusStyle.dotBg }} />
                          {row.statusLabel || row.status || 'Planned'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        {displayCalendar.length === 0 && (
          <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
            <p className="text-sm flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              No content calendar data yet. This will be populated after the AI publisher agent completes the campaign publication plan.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default StrategyContent;
