import React, { useState, useCallback } from 'react';
import { Calendar, ShieldCheck, FileDown, ThumbsUp, FileText, LineChart, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import { formatDDMonYYYY, displayDate } from '../../../../../../../utils/formatDate';


interface PublisherContentProps {
  data?: any;
  campaignName?: string;
}

const PublisherContent: React.FC<PublisherContentProps> = ({ data, campaignName }) => {
  const hasRealData = data && Object.keys(data).length > 0;
  const publishingDecision = data?.publishing_decision || '';
  const decisionRationale = data?.decision_rationale || '';
  const publishingPlan = data?.publishing_plan || [];
  const contentCalendar = data?.content_calendar || {};
  const assetChecklist = data?.asset_checklist || {};
  const projectedMetrics = data?.projected_metrics || {};
  const executiveSummary = data?.executive_summary || '';

  const assets = data?.assets || data?.placements || [];
  const qualityScore = data?.quality_score || data?.score || 0;
  const generatedDate = data?.generated_date || formatDDMonYYYY(new Date());

  const [exportingPdf, setExportingPdf] = useState(false);
  const [channelTasks, setChannelTasks] = useState<Record<string, boolean[]>>({});

  const toggleTask = useCallback((channel: string, taskIdx: number) => {
    setChannelTasks(prev => {
      const key = channel.toLowerCase();
      const current = prev[key] || [false, false, false];
      const updated = [...current];
      updated[taskIdx] = !updated[taskIdx];
      if (taskIdx < 2 && !updated[taskIdx]) {
        updated[2] = false;
      }
      return { ...prev, [key]: updated };
    });
  }, []);

  const displayAssets = Array.isArray(assets) && assets.length > 0 ? assets : [];

  // ─── Build beautiful PDF HTML ─────────────────────────────────────────────
  const buildPublisherPdfHTML = (): string => {
    const today = `${String(new Date().getDate()).padStart(2,'0')}-${new Date().toLocaleDateString('en-US',{month:'long'})}-${new Date().getFullYear()}`;
    const esc = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
    const escRaw = (s: string) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtDate = (s: string) => {
      const m = (s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m) {
        const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${m[3]}-${months[parseInt(m[2])-1]}-${m[1]}`;
      }
      return s || '';
    };

    const section = (title: string, inner: string, accentColor = '#6366F1') => `
      <div class="section" style="--accent:${accentColor}">
        <div class="section-title" style="border-bottom-color:${accentColor};color:#111">${escRaw(title)}</div>
        ${inner}
      </div>`;

    const card = (inner: string) => `<div class="card">${inner}</div>`;
    const grid2 = (items: string[]) => `<div class="grid-2">${items.join('')}</div>`;
    const grid4 = (items: string[]) => `<div class="grid-4">${items.join('')}</div>`;
    const metaRow = (label: string, value: string) =>
      `<div class="meta-row"><span class="meta-label">${escRaw(label)}</span><span>${esc(value)}</span></div>`;
    const badge = (t: string, color = '#6B7280') =>
      `<span class="badge" style="color:${color};background:${color}14;border-color:${color}33">${escRaw(t)}</span>`;

    let sections = '';

    // Decision banner
    if (publishingDecision) {
      const isApproved = publishingDecision === 'APPROVED_FOR_PUBLISHING';
      const isHold = publishingDecision === 'HOLD';
      const color = isApproved ? '#059669' : isHold ? '#DC2626' : '#D97706';
      const bg = isApproved ? '#ECFDF5' : isHold ? '#FEF2F2' : '#FFFBEB';
      const label = isApproved ? '✅ Approved for Publishing' : isHold ? '🔴 Hold' : '⚠️ Revisions Needed';
      sections += `
        <div class="decision-banner" style="background:${bg};border-color:${color}44;color:${color}">
          <div class="decision-label">${label}</div>
          ${decisionRationale ? `<div class="decision-rationale" style="color:#374151">${esc(decisionRationale)}</div>` : ''}
        </div>`;
    }

    // Executive Summary
    if (executiveSummary) {
      sections += section('Executive Summary', `<div class="summary-text">${esc(executiveSummary)}</div>`);
    }

    // Quality Score + Metrics
    const metricCards: string[] = [];
    if (qualityScore > 0) {
      metricCards.push(card(`
        <div class="card-label">Quality Score</div>
        <div style="font-size:36px;font-weight:800;color:#059669;line-height:1;margin-top:6px">${Number(qualityScore).toFixed(1)}<span style="font-size:16px;font-weight:500;color:#6B7280">/10</span></div>
        <div style="font-size:11px;color:#9CA3AF;margin-top:4px">AI Quality Assessment</div>
      `));
    }
    if (projectedMetrics.total_reach) metricCards.push(card(`<div class="card-label">Total Reach</div><div class="metric-val" style="color:#6366F1">${escRaw(projectedMetrics.total_reach)}</div>`));
    if (projectedMetrics.lead_target) metricCards.push(card(`<div class="card-label">Lead Target</div><div class="metric-val" style="color:#059669">${escRaw(projectedMetrics.lead_target)}</div>`));
    if (projectedMetrics.estimated_ctr) metricCards.push(card(`<div class="card-label">Est. CTR</div><div class="metric-val" style="color:#D97706">${escRaw(projectedMetrics.estimated_ctr)}</div>`));
    if (projectedMetrics.estimated_cost) metricCards.push(card(`<div class="card-label">Est. Cost</div><div class="metric-val" style="color:#6B7280">${escRaw(projectedMetrics.estimated_cost)}</div>`));
    if (projectedMetrics.roi_projection) metricCards.push(card(`<div class="card-label">ROI Projection</div><div class="metric-val" style="color:#059669">${escRaw(projectedMetrics.roi_projection)}</div>`));
    if (metricCards.length > 0) {
      sections += section('Metrics & Projections', grid4(metricCards), '#059669');
      if (projectedMetrics.timeline_to_results) {
        sections = sections.replace('</div>\n      </div>', `
          <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:12px;color:#6B7280">
            <span>📅</span><span>Timeline to Results: <strong>${escRaw(projectedMetrics.timeline_to_results)}</strong></span>
          </div>
        </div>\n      </div>`);
      }
    }

    // Publishing Plan
    if (publishingPlan.length > 0) {
      const planCards = publishingPlan.map((plan: any) => {
        const statusColor = plan.status === 'ready' ? '#059669' : '#D97706';
        return `<div class="plan-card">
          <div class="plan-header">
            <div>
              <div class="plan-channel">${escRaw(plan.channel)}</div>
              <div class="plan-sub">${escRaw(plan.content_type)} · ${escRaw(plan.publish_frequency)}</div>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
              ${badge(plan.priority + ' Priority')}
              ${badge(plan.status, statusColor)}
            </div>
          </div>
          <div class="plan-grid">
            ${metaRow('Optimal Timing', fmtDate(plan.optimal_timing))}
            ${metaRow('Launch Date', fmtDate(plan.launch_date))}
            ${plan.copy_asset_used ? metaRow('Copy Asset', plan.copy_asset_used) : ''}
            ${plan.visual_asset_used ? metaRow('Visual Asset', plan.visual_asset_used) : ''}
          </div>
          ${plan.kpi_targets && Object.keys(plan.kpi_targets).length > 0 ? `
            <div style="margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb">
              <div class="meta-label" style="margin-bottom:6px">KPI Targets</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px">
                ${Object.entries(plan.kpi_targets).map(([k, v]) => `<span class="kpi-tag">${escRaw(k)}: ${escRaw(String(v))}</span>`).join('')}
              </div>
            </div>` : ''}
        </div>`;
      }).join('');
      sections += section('Publishing Plan', planCards, '#6366F1');
    }

    // Placements
    if (displayAssets.length > 0) {
      const placementCards = displayAssets.slice(0, 9).map((asset: any) => {
        const platformColor = asset.color || '#6366F1';
        return `<div class="placement-card">
          <div class="placement-header" style="background:${platformColor}12;border-bottom:1px solid ${platformColor}22">
            <div class="placement-platform" style="color:${platformColor}">${escRaw(asset.platform || asset.channel || '')}</div>
            <span class="placement-type">${escRaw(asset.type || 'Asset')}</span>
          </div>
          <div class="placement-body">
            ${asset.subject ? `<div class="placement-subject">${esc(asset.subject)}</div>` : ''}
            <div class="placement-preview">${esc((asset.preview || asset.content || '').substring(0, 280))}${(asset.preview || asset.content || '').length > 280 ? '…' : ''}</div>
            ${asset.hashtags?.length ? `<div class="hashtags">${asset.hashtags.map((h: string) => `<span class="hashtag">${escRaw(h)}</span>`).join('')}</div>` : ''}
            ${asset.replies ? `<div style="font-size:11px;color:#9CA3AF;margin-top:6px">${escRaw(asset.replies)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      sections += section('Generated Placements', `<div class="placements-grid">${placementCards}</div>`, '#6366F1');
    }

    // Asset Checklist
    if (assetChecklist.copy_assets || assetChecklist.visual_assets) {
      const checklistHtml = grid2([
        assetChecklist.copy_assets ? `
          <div>
            <div class="card-label" style="margin-bottom:10px">Copy Assets</div>
            ${assetChecklist.copy_assets.map((a: any) => `
              <div class="checklist-row">
                <span class="check-icon" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${a.status === 'complete' ? '✓' : '○'}</span>
                <span class="check-label">${escRaw(a.asset)}</span>
                <span class="check-status" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${escRaw(a.status)}</span>
              </div>`).join('')}
          </div>` : '<div></div>',
        assetChecklist.visual_assets ? `
          <div>
            <div class="card-label" style="margin-bottom:10px">Visual Assets</div>
            ${assetChecklist.visual_assets.map((a: any) => `
              <div class="checklist-row">
                <span class="check-icon" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${a.status === 'complete' ? '✓' : '○'}</span>
                <span class="check-label">${escRaw(a.asset)}</span>
                <span class="check-status" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${escRaw(a.status)}</span>
              </div>`).join('')}
          </div>` : '<div></div>',
      ]);
      sections += section('Asset Checklist', checklistHtml, '#059669');
    }

    // Content Calendar
    if (contentCalendar.weeks) {
      const weekRows = contentCalendar.weeks.slice(0, 8).map((week: any) => `
        <div class="week-block">
          <div class="week-header">
            <span class="week-label">${escRaw(week.week_label)}</span>
            <span class="week-date">${escRaw(fmtDate(week.week_start_date))}</span>
          </div>
          ${week.theme ? `<div class="week-theme">Theme: ${escRaw(week.theme)}</div>` : ''}
          ${(week.activities || []).map((a: any) => `
            <div class="activity-row">
              <span class="activity-day">${escRaw(a.day)}</span>
              <span class="activity-desc">${escRaw(a.channel)}: ${escRaw(a.description)}</span>
            </div>`).join('')}
        </div>`).join('');
      sections += section('Content Calendar', weekRows, '#6366F1');
    }

    const CSS = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', 'Segoe UI', sans-serif; background: #f8f8fc; color: #1a1a2e; font-size: 13px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: 980px; margin: 0 auto; padding: 32px 44px 60px; }

      /* Cover */
      .cover { display: flex; align-items: center; justify-content: space-between; padding: 28px 36px; margin-bottom: 28px; background: linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #059669 100%); border-radius: 16px; color: white; }
      .cover-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; opacity: .75; margin-bottom: 6px; }
      .cover-title { font-size: 26px; font-weight: 800; line-height: 1.2; }
      .cover-sub { font-size: 12px; opacity: .7; margin-top: 6px; }
      .cover-right { text-align: right; }
      .cover-date { font-size: 11px; opacity: .7; margin-bottom: 8px; }
      .cover-campaign { font-size: 14px; font-weight: 700; }
      .cover-score { display: inline-flex; align-items: baseline; gap: 2px; background: rgba(255,255,255,.18); border: 1px solid rgba(255,255,255,.3); border-radius: 10px; padding: 6px 14px; margin-top: 8px; }
      .cover-score-num { font-size: 22px; font-weight: 800; }
      .cover-score-denom { font-size: 13px; opacity: .75; }

      /* Decision Banner */
      .decision-banner { border: 1.5px solid; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; }
      .decision-label { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
      .decision-rationale { font-size: 12px; line-height: 1.6; margin-top: 6px; }

      /* Section */
      .section { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px 24px; margin-bottom: 18px; break-inside: auto; box-shadow: 0 1px 4px rgba(0,0,0,.06); }
      .section-title { font-size: 13px; font-weight: 700; padding-bottom: 10px; margin-bottom: 14px; border-bottom: 2.5px solid; letter-spacing: .02em; }
      .summary-text { font-size: 13px; color: #374151; line-height: 1.75; }

      /* Grids */
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }

      /* Card */
      .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; break-inside: avoid; }
      .card-label { font-size: 10px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #6366F1; margin-bottom: 5px; }
      .metric-val { font-size: 26px; font-weight: 800; margin-top: 4px; line-height: 1; }

      /* Meta */
      .meta-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 7px; font-size: 12px; }
      .meta-label { font-size: 10px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: #9CA3AF; min-width: 90px; padding-top: 1px; flex-shrink: 0; }

      /* Badge */
      .badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; border: 1px solid; display: inline-block; }

      /* Plan card */
      .plan-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 16px; margin-bottom: 12px; break-inside: avoid; }
      .plan-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
      .plan-channel { font-size: 13px; font-weight: 700; color: #111; }
      .plan-sub { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
      .plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
      .kpi-tag { font-size: 10px; padding: 3px 8px; border-radius: 4px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE; }

      /* Placements */
      .placements-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
      .placement-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; break-inside: avoid; }
      .placement-header { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
      .placement-platform { font-size: 12px; font-weight: 700; }
      .placement-type { font-size: 10px; padding: 2px 7px; border-radius: 4px; background: rgba(0,0,0,.06); color: #6B7280; }
      .placement-body { padding: 12px 14px; }
      .placement-subject { font-size: 12px; font-weight: 600; color: #111; margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
      .placement-preview { font-size: 11px; color: #4b5563; line-height: 1.6; }
      .hashtags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
      .hashtag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: #EEF2FF; color: #4338CA; }

      /* Checklist */
      .checklist-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
      .check-icon { font-size: 14px; font-weight: 700; flex-shrink: 0; }
      .check-label { flex: 1; color: #374151; }
      .check-status { font-size: 10px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }

      /* Calendar */
      .week-block { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px; break-inside: avoid; }
      .week-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .week-label { font-size: 12px; font-weight: 700; color: #111; }
      .week-date { font-size: 10px; color: #9CA3AF; }
      .week-theme { font-size: 11px; color: #6B7280; margin-bottom: 8px; font-style: italic; }
      .activity-row { display: flex; gap: 8px; align-items: flex-start; margin-bottom: 4px; font-size: 11px; }
      .activity-day { background: #EEF2FF; color: #4338CA; border-radius: 4px; padding: 1px 6px; font-weight: 600; min-width: 50px; text-align: center; flex-shrink: 0; }
      .activity-desc { color: #374151; line-height: 1.5; }

      /* Footer */
      .footer { margin-top: 40px; padding-top: 14px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 10px; color: #9CA3AF; }

      /* Bullet */
      .bullet { display: flex; align-items: flex-start; gap: 8px; font-size: 12px; color: #4b5563; margin-bottom: 6px; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #6366F1; flex-shrink: 0; margin-top: 5px; }

      @page { size: A4; margin: 12mm 12mm; }
      @media print { body { background: white; } .page { padding: 0; } .section, .plan-card, .placement-card, .week-block { box-shadow: none; } }
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${escRaw(campaignName || 'Campaign')} — Publisher Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/>
  <style>${CSS}</style>
</head>
<body>
<div class="page">

  <!-- Cover -->
  <div class="cover">
    <div>
      <div class="cover-eyebrow">AgentMark AI · Publisher Report</div>
      <div class="cover-title">${escRaw(campaignName || 'Campaign Assets')}</div>
      <div class="cover-sub">AI-generated publishing strategy &amp; placements</div>
    </div>
    <div class="cover-right">
      <div class="cover-date">${today}</div>
      ${qualityScore > 0 ? `
        <div class="cover-score">
          <span class="cover-score-num">${Number(qualityScore).toFixed(1)}</span>
          <span class="cover-score-denom">/10</span>
        </div>` : ''}
    </div>
  </div>

  ${sections}

  <div class="footer">
    <span>Generated by AgentMark AI</span>
    <span>${today}</span>
  </div>

</div>
<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 500);
  };
</script>
</body>
</html>`;
  };

  // ─── Export Publisher PDF via hidden iframe ───────────────────────────────
  const handleExportPDF = () => {
    setExportingPdf(true);
    toast.loading('Preparing PDF…', { id: 'pub-pdf', duration: 6000 });
    setTimeout(() => {
      try {
        const html = buildPublisherPdfHTML();
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;border:none;';
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!iframeDoc) {
          toast.error('PDF generation failed. Please try again.', { id: 'pub-pdf' });
          document.body.removeChild(iframe);
          setExportingPdf(false);
          return;
        }

        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();

        iframe.onload = () => {
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            toast.success('Save as PDF from the print dialog!', { id: 'pub-pdf' });
            setExportingPdf(false);
            setTimeout(() => {
              if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 60000);
          }, 700);
        };
      } catch {
        toast.error('PDF generation failed. Please try again.', { id: 'pub-pdf' });
        setExportingPdf(false);
      }
    }, 100);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <style>{`
        @keyframes taskCompletePulse {
          0%, 100% { box-shadow: 0 0 15px rgba(110,231,183,0.06), 0 0 30px rgba(110,231,183,0.03); }
          50% { box-shadow: 0 0 25px rgba(110,231,183,0.12), 0 0 50px rgba(110,231,183,0.06); }
        }
        .animate-task-complete {
          animation: taskCompletePulse 2s ease-in-out infinite;
        }
      `}</style>
      {/* ── Header ── */}
      <div className="rounded-2xl border border-[#2A2A38] bg-gradient-to-br from-[#111118] via-[#111118] to-[#0A0A0F] p-5 md:p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-[#4edea3]/10 border border-[#4edea3]/20 rounded-full px-3 py-1">
              <ShieldCheck size={14} className="text-[#4edea3]" />
              <span className="text-xs uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#4edea3' }}>Campaign Completed</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{campaignName || 'Campaign Assets'}</h1>
            <p className="text-sm md:text-base flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              <Calendar size={14} />Generated on {generatedDate}
            </p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {qualityScore > 0 && (
              <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-4 flex flex-col items-end shadow-lg">
                <span className="text-xs uppercase tracking-wider mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Quality Score</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{qualityScore.toFixed(1)}</span>
                  <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#A0A0D2' }}>/10</span>
                </div>
              </div>
            )}
            <button
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="px-4 py-2 rounded-lg bg-[#6366F1] hover:bg-[#5254d8] text-sm font-semibold transition-all shadow-md shadow-[#6366F1]/10 hover:shadow-[#6366F1]/20 active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
              style={{ fontFamily: 'Inter, sans-serif', color: '#FFFFFF' }}
            >
              <FileDown size={16} />
              {exportingPdf ? 'Preparing…' : 'Export PDF'}
            </button>
          </div>
        </div>
      </div>

      {!hasRealData && (
        <div className="bg-[#111118] border border-[#2A2A38] rounded-xl p-4">
          <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
            No publisher data available yet. This will be populated after AI publisher agent completes work.
          </p>
        </div>
      )}

      {/* Publishing Decision */}
      {publishingDecision && (
        <div className={`card-elevate rounded-xl p-6 border ${publishingDecision === 'APPROVED_FOR_PUBLISHING' ? 'bg-[#4edea3]/10 border-[#4edea3]/20' : publishingDecision === 'HOLD' ? 'bg-[#F43F5E]/10 border-[#F43F5E]/20' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20'}`}>
          <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: publishingDecision === 'APPROVED_FOR_PUBLISHING' ? '#4edea3' : publishingDecision === 'HOLD' ? '#F43F5E' : '#F59E0B' }}>
            <ThumbsUp size={20} />
            {publishingDecision === 'APPROVED_FOR_PUBLISHING' ? 'Approved for Publishing' : publishingDecision === 'HOLD' ? 'Hold' : 'Revisions Needed'}
          </h3>
          {decisionRationale && (
            <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>{decisionRationale}</p>
          )}
        </div>
      )}

      {/* Executive Summary */}
      {executiveSummary && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <FileText size={20} className="text-[#6366F1]" />
            Executive Summary
          </h3>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{executiveSummary}</p>
        </div>
      )}

      {/* Projected Metrics */}
      {projectedMetrics.total_reach && (
        <div className="card-elevate-green bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <LineChart size={20} className="text-[#6366F1]" />
            Projected Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {projectedMetrics.total_reach && (<div><span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Total Reach</span><p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>{projectedMetrics.total_reach}</p></div>)}
            {projectedMetrics.lead_target && (<div><span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Lead Target</span><p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{projectedMetrics.lead_target}</p></div>)}
            {projectedMetrics.estimated_ctr && (<div><span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. CTR</span><p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#F59E0B' }}>{projectedMetrics.estimated_ctr}</p></div>)}
            {projectedMetrics.estimated_cost && (<div><span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. Cost</span><p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{projectedMetrics.estimated_cost}</p></div>)}
            {projectedMetrics.roi_projection && (<div><span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>ROI Projection</span><p className="text-2xl font-bold" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{projectedMetrics.roi_projection}</p></div>)}
          </div>
          {projectedMetrics.timeline_to_results && (
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              <Calendar size={14} />Timeline: {projectedMetrics.timeline_to_results}
            </div>
          )}
        </div>
      )}

      {/* Publishing Plan */}
      {publishingPlan.length > 0 && (
        <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              <Map size={20} className="text-[#6366F1]" />
              Publishing Plan
            </h3>
            <div className="flex items-center gap-3">
              {/* Channel readiness progress bar */}
              {(() => {
                const total = publishingPlan.length;
                const ready = publishingPlan.filter((p: any) => {
                  if (p.status === 'ready') return true;
                  const key = p.channel?.toLowerCase();
                  const tasks = channelTasks[key] || [false, false, false, false];
                  return tasks.filter(Boolean).length === tasks.length && tasks.length > 0;
                }).length;
                if (!total) return null;
                const pct = Math.round((ready / total) * 100);
                return (
                  <div className="flex items-center gap-2.5">
                    <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#1A1A24' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${pct}%`,
                          background: pct === 100 ? '#4edea3' : 'linear-gradient(90deg, #6366F1, #4edea3)',
                          boxShadow: pct > 0 && pct < 100 ? '0 0 6px rgba(99,102,241,0.25)' : 'none',
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ fontFamily: 'JetBrains Mono, monospace', color: pct === 100 ? '#4edea3' : '#8B8B9E' }}>
                      {ready}/{total} ready
                    </span>
                  </div>
                );
              })()}
              {/* Asset summary */}
              {(() => {
                const copyCount = assetChecklist.copy_assets?.length || 0;
                const copyReady = assetChecklist.copy_assets?.filter((a: any) => a.status === 'complete' || a.status === 'READY').length || 0;
                const visualCount = assetChecklist.visual_assets?.length || 0;
                const visualReady = assetChecklist.visual_assets?.filter((a: any) => a.status === 'complete' || a.status === 'READY').length || 0;
                const missingCount = assetChecklist.missing_assets?.length || 0;
                if (!copyCount && !visualCount) return null;
                return (
                  <span className="text-xs px-2.5 py-1.5 rounded-md" style={{ fontFamily: 'JetBrains Mono, monospace', background: 'rgba(255,255,255,0.03)', color: '#6B6B80', border: '1px solid rgba(255,255,255,0.04)' }}>
                    {copyCount > 0 && (<span style={{ color: copyReady === copyCount ? '#6EE7B7' : '#C8C8D0' }}>{copyReady}/{copyCount} copy</span>)}
                    {copyCount > 0 && visualCount > 0 && <span className="mx-1" style={{ color: '#3A3A4E' }}>·</span>}
                    {visualCount > 0 && (<span style={{ color: visualReady === visualCount ? '#6EE7B7' : '#C8C8D0' }}>{visualReady}/{visualCount} visual</span>)}
                    {missingCount > 0 && <span className="ml-1.5" style={{ color: '#FCA5A5' }}>⚠ {missingCount} missing</span>}
                  </span>
                );
              })()}
            </div>
          </div>
          <div className="space-y-3">
            {publishingPlan.map((plan: any, idx: number) => {
              const key = plan.channel?.toLowerCase();
              const tasks = channelTasks[key] || [false, false, false, false];
              const doneCount = tasks.filter(Boolean).length;
              const totalTasks = tasks.length;
              const allDone = doneCount === totalTasks && totalTasks > 0;
              const isReady = plan.status === 'ready' || allDone;
              const isHigh = plan.priority === 'HIGH';
              const isMedium = plan.priority === 'MEDIUM';
              const statusColor = isReady ? '#6EE7B7' : '#FCD34D';
              const statusGlow = isReady ? 'rgba(110,231,183,0.06)' : 'rgba(252,211,77,0.06)';
              const priorityColor = isHigh ? '#FCA5A5' : isMedium ? '#FCD34D' : '#8B8B9E';
              const priorityBg = isHigh ? 'rgba(252,165,165,0.08)' : isMedium ? 'rgba(252,211,77,0.08)' : 'rgba(255,255,255,0.03)';
              return (
                <div
                  key={idx}
                  className={`rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 ${allDone ? 'animate-task-complete' : ''}`}
                  style={{
                    background: '#0A0A0F',
                    border: `1px solid ${allDone ? 'rgba(110,231,183,0.2)' : isReady ? 'rgba(110,231,183,0.08)' : 'rgba(252,211,77,0.06)'}`,
                    boxShadow: allDone
                      ? '0 0 20px rgba(110,231,183,0.08), 0 1px 3px rgba(0,0,0,0.3)'
                      : `0 1px 3px rgba(0,0,0,0.3), inset 0 0 60px ${statusGlow}`,
                  }}
                >
                  {/* Top accent glow line */}
                  <div
                    className="h-[2px] transition-all duration-300"
                    style={{
                      background: `linear-gradient(90deg, ${statusColor}, transparent)`,
                      boxShadow: `0 0 12px ${statusColor}`,
                    }}
                  />
                  <div className="p-5">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
                      <div>
                        <h4 className="text-lg font-semibold mb-1 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#FFFFFF' }}>
                          <ChannelIcon channel={plan.channel} size={16} className="shrink-0 text-[#818CF8]" />
                          {plan.channel}
                        </h4>
                        <span className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{plan.content_type} · {plan.publish_frequency}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs px-2.5 py-1 rounded-md font-medium"
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            background: priorityBg,
                            color: priorityColor,
                          }}
                        >
                          {plan.priority}
                        </span>
                        <span
                          className="text-xs px-2.5 py-1 rounded-md font-medium flex items-center gap-1.5"
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            background: isReady ? 'rgba(110,231,183,0.08)' : 'rgba(252,211,77,0.08)',
                            color: statusColor,
                            border: `1px solid ${isReady ? 'rgba(110,231,183,0.12)' : 'rgba(252,211,77,0.1)'}`,
                            boxShadow: isReady ? '0 0 12px rgba(110,231,183,0.08)' : 'none',
                          }}
                        >
                          <span style={{ fontSize: '10px' }}>{isReady ? '●' : '○'}</span>
                          {isReady ? 'Ready' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm mb-4">
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider mb-1 block" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>Timing</span>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#E8E8ED', fontSize: '14px' }}>{displayDate(plan.optimal_timing)}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium uppercase tracking-wider mb-1 block" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>Launch</span>
                        <p style={{ fontFamily: 'Inter, sans-serif', color: '#E8E8ED', fontSize: '14px' }}>{displayDate(plan.launch_date)}</p>
                      </div>
                      {plan.copy_asset_used && (
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider mb-1 block" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>Copy</span>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#E8E8ED', fontSize: '14px' }}>{plan.copy_asset_used}</p>
                        </div>
                      )}
                      {plan.visual_asset_used && (
                        <div>
                          <span className="text-xs font-medium uppercase tracking-wider mb-1 block" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>Visual</span>
                          <p style={{ fontFamily: 'Inter, sans-serif', color: '#E8E8ED', fontSize: '14px' }}>{plan.visual_asset_used}</p>
                        </div>
                      )}
                    </div>

                    {/* Task checklist */}
                    <div className="mb-4 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-medium uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>Preparation Tasks</span>
                        <span className="text-xs" style={{ fontFamily: 'Inter, sans-serif', color: doneCount === totalTasks ? '#6EE7B7' : '#8B8B9E' }}>{doneCount}/{totalTasks} ready</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {['Assets', 'Review', 'Approve'].map((label, tIdx) => {
                          const canApprove = tIdx === 2 && (!tasks[0] || !tasks[1]);
                          return (
                            <button
                              key={label}
                              onClick={() => {
                                if (tIdx === 2 && (!tasks[0] || !tasks[1])) return;
                                toggleTask(key, tIdx);
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150"
                              style={{
                                fontFamily: 'Inter, sans-serif',
                                background: tasks[tIdx] ? 'rgba(110,231,183,0.08)' : (canApprove ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)'),
                                color: tasks[tIdx] ? '#6EE7B7' : (canApprove ? '#3A3A4E' : '#8B8B9E'),
                                border: `1px solid ${tasks[tIdx] ? 'rgba(110,231,183,0.15)' : (canApprove ? 'transparent' : 'rgba(255,255,255,0.06)')}`,
                                cursor: canApprove ? 'not-allowed' : 'pointer',
                              }}
                            >
                              <span style={{ fontSize: '12px', lineHeight: '1' }}>{tasks[tIdx] ? '✓' : (canApprove ? '○' : '○')}</span>
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* KPI Targets */}
                    {plan.kpi_targets && Object.keys(plan.kpi_targets).length > 0 && (
                      <div className="pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <span className="text-xs font-medium uppercase tracking-wider mb-2 block" style={{ fontFamily: 'Inter, sans-serif', color: '#6B6B80', letterSpacing: '0.05em' }}>KPI Targets</span>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(plan.kpi_targets).map(([key, value]: [string, any], kidx: number) => (
                            <span
                              key={kidx}
                              className="text-xs px-2 py-1 rounded-md font-medium"
                              style={{
                                fontFamily: 'Inter, sans-serif',
                                background: 'rgba(165,180,252,0.06)',
                                color: '#A5B4FC',
                                border: '1px solid rgba(165,180,252,0.08)',
                              }}
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};

export default React.memo(PublisherContent);
