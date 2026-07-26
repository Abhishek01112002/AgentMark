import React, { useState, useCallback } from 'react';
import { Calendar, Send, FileDown, ThumbsUp, FileText, LineChart, Map } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import { displayDate } from '../../../../../../../utils/formatDate';


interface PublisherContentProps {
  data?: any;
  campaignName?: string;
  campaign?: any;
}

const PublisherContent: React.FC<PublisherContentProps> = ({ data, campaignName, campaign }) => {
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

    const section = (title: string, inner: string, accentColor = '#475569') => `
      <div class="section" style="--accent:${accentColor}">
        <div class="section-title" style="border-bottom-color:${accentColor};color:#0f172a">${escRaw(title)}</div>
        ${inner}
      </div>`;

    const card = (inner: string) => `<div class="card">${inner}</div>`;
    const grid2 = (items: string[]) => `<div class="grid-2">${items.join('')}</div>`;
    const grid4 = (items: string[]) => `<div class="grid-4">${items.join('')}</div>`;
    const badge = (t: string, color = '#475569') =>
      `<span class="badge" style="color:${color};background:${color}0c;border-color:${color}22">${escRaw(t)}</span>`;

    let sections = '';

    // Campaign Briefing (Context Info)
    const brandName = campaign?.brandName || campaign?.brand_name || 'N/A';
    const industry = campaign?.industry || 'N/A';
    const primaryGoal = campaign?.primaryGoal || 'N/A';
    const targetAudience = campaign?.targetAudience || 'N/A';

    sections += section('Campaign Briefing', `
      <div class="brief-grid">
        <div class="brief-cell"><strong>Brand Name:</strong> <span>${esc(brandName)}</span></div>
        <div class="brief-cell"><strong>Industry:</strong> <span>${esc(industry)}</span></div>
        <div class="brief-cell"><strong>Primary Goal:</strong> <span>${esc(primaryGoal)}</span></div>
        <div class="brief-cell"><strong>Target Audience:</strong> <span>${esc(targetAudience)}</span></div>
      </div>
    `, '#1e293b');

    // Decision banner
    if (publishingDecision) {
      const isApproved = publishingDecision === 'APPROVED_FOR_PUBLISHING';
      const isHold = publishingDecision === 'HOLD';
      const color = isApproved ? '#059669' : isHold ? '#DC2626' : '#D97706';
      const bg = isApproved ? '#ECFDF5' : isHold ? '#FEF2F2' : '#FFFBEB';
      const label = isApproved ? 'Approved for Publishing' : isHold ? 'Hold' : 'Revisions Needed';
      sections += `
        <div class="decision-banner" style="background:${bg};border-color:${color}33;color:${color}">
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
        <div style="font-size:22px;font-weight:800;color:#059669;line-height:1;margin-top:6px">${Number(qualityScore).toFixed(1)}<span style="font-size:13px;font-weight:500;color:#6B7280">/10</span></div>
        <div style="font-size:10px;color:#9CA3AF;margin-top:4px">AI Quality Assessment</div>
      `));
    }
    if (projectedMetrics.total_reach) metricCards.push(card(`<div class="card-label">Total Reach</div><div class="metric-val" style="color:#4F46E5">${escRaw(projectedMetrics.total_reach)}</div>`));
    if (projectedMetrics.lead_target) metricCards.push(card(`<div class="card-label">Lead Target</div><div class="metric-val" style="color:#059669">${escRaw(projectedMetrics.lead_target)}</div>`));
    if (projectedMetrics.estimated_ctr) metricCards.push(card(`<div class="card-label">Est. CTR</div><div class="metric-val" style="color:#D97706">${escRaw(projectedMetrics.estimated_ctr)}</div>`));
    if (projectedMetrics.estimated_cost) metricCards.push(card(`<div class="card-label">Est. Cost</div><div class="metric-val" style="color:#475569">${escRaw(projectedMetrics.estimated_cost)}</div>`));
    if (projectedMetrics.roi_projection) metricCards.push(card(`<div class="card-label">ROI Projection</div><div class="metric-val" style="color:#059669">${escRaw(projectedMetrics.roi_projection)}</div>`));
    
    if (metricCards.length > 0) {
      let metricsInner = grid4(metricCards);
      if (projectedMetrics.timeline_to_results) {
        metricsInner += `
          <div style="display:flex;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280">
            <span>Timeline to Results: <strong>${escRaw(projectedMetrics.timeline_to_results)}</strong></span>
          </div>`;
      }
      sections += section('Metrics & Projections', metricsInner, '#059669');
    }

    // Publishing Plan (Redesigned as structured Table)
    if (publishingPlan.length > 0) {
      const tableRows = publishingPlan.map((plan: any) => {
        const statusColor = plan.status === 'ready' ? '#059669' : '#D97706';
        return `
          <tr>
            <td style="font-weight: 700; color: #0f172a">
              ${escRaw(plan.channel)}
              <div style="font-size: 10px; color: #6b7280; font-weight: 400; margin-top: 2px">${escRaw(plan.content_type)} (${escRaw(plan.publish_frequency)})</div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start">
                ${badge(plan.priority + ' Priority', '#4f46e5')}
                ${badge(plan.status, statusColor)}
              </div>
            </td>
            <td style="font-size: 11px">${escRaw(fmtDate(plan.optimal_timing))}</td>
            <td style="font-size: 11px">${escRaw(fmtDate(plan.launch_date))}</td>
            <td>
              <div style="font-size: 10px; color: #475569; line-height: 1.4">
                ${plan.copy_asset_used ? `<div><strong>Copy:</strong> ${escRaw(plan.copy_asset_used)}</div>` : ''}
                ${plan.visual_asset_used ? `<div><strong>Visual:</strong> ${escRaw(plan.visual_asset_used)}</div>` : ''}
              </div>
              ${plan.kpi_targets && Object.keys(plan.kpi_targets).length > 0 ? `
                <div style="margin-top: 6px; display: flex; flex-wrap: wrap; gap: 4px">
                  ${Object.entries(plan.kpi_targets).map(([k, v]) => `
                    <span style="font-size: 9px; padding: 1px 4px; border-radius: 3px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #334155">${escRaw(k)}: ${escRaw(String(v))}</span>
                  `).join('')}
                </div>` : ''}
            </td>
          </tr>`;
      }).join('');

      const tableHtml = `
        <table class="plan-table">
          <thead>
            <tr>
              <th style="width: 20%">Channel & Type</th>
              <th style="width: 15%">Priority/Status</th>
              <th style="width: 18%">Optimal Timing</th>
              <th style="width: 18%">Launch Date</th>
              <th style="width: 29%">Assets & Targets</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>`;
      sections += section('Publishing Plan', tableHtml, '#4f46e5');
    }

    // Placements (Redesigned as Grid 2 for better horizontal width in print)
    if (displayAssets.length > 0) {
      const placementCards = displayAssets.slice(0, 8).map((asset: any) => {
        const platformColor = asset.color || '#4f46e5';
        return `<div class="placement-card">
          <div class="placement-header" style="background:${platformColor}08;border-bottom:1px solid ${platformColor}18">
            <div class="placement-platform" style="color:${platformColor}">${escRaw(asset.platform || asset.channel || '')}</div>
            <span class="placement-type">${escRaw(asset.type || 'Asset')}</span>
          </div>
          <div class="placement-body">
            ${asset.subject ? `<div class="placement-subject">${esc(asset.subject)}</div>` : ''}
            <div class="placement-preview">${esc((asset.preview || asset.content || '').substring(0, 260))}${(asset.preview || asset.content || '').length > 260 ? '…' : ''}</div>
            ${asset.hashtags?.length ? `<div class="hashtags">${asset.hashtags.map((h: string) => `<span class="hashtag">${escRaw(h)}</span>`).join('')}</div>` : ''}
            ${asset.replies ? `<div style="font-size:10px;color:#9CA3AF;margin-top:6px">${escRaw(asset.replies)}</div>` : ''}
          </div>
        </div>`;
      }).join('');
      sections += section('Generated Placements', `<div class="grid-2">${placementCards}</div>`, '#4f46e5');
    }

    // Asset Checklist
    if (assetChecklist.copy_assets || assetChecklist.visual_assets) {
      const checklistHtml = grid2([
        assetChecklist.copy_assets ? `
          <div>
            <div class="card-label" style="margin-bottom:8px">Copy Assets Checklist</div>
            ${assetChecklist.copy_assets.map((a: any) => `
              <div class="checklist-row">
                <span class="check-icon" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${a.status === 'complete' ? '✓' : '○'}</span>
                <span class="check-label">${escRaw(a.asset)}</span>
                <span class="check-status" style="color:${a.status === 'complete' ? '#059669' : '#D97706'}">${escRaw(a.status)}</span>
              </div>`).join('')}
          </div>` : '<div></div>',
        assetChecklist.visual_assets ? `
          <div>
            <div class="card-label" style="margin-bottom:8px">Visual Assets Checklist</div>
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
              <span class="activity-desc"><strong>${escRaw(a.channel)}:</strong> ${escRaw(a.description)}</span>
            </div>`).join('')}
        </div>`).join('');
      sections += section('Content Calendar', weekRows, '#4f46e5');
    }

    const CSS = `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f8f8fc; color: #1e293b; font-size: 12px; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { max-width: 960px; margin: 0 auto; padding: 32px 40px 60px; }

      /* Cover */
      .cover { display: flex; align-items: center; justify-content: space-between; padding: 24px 32px; margin-bottom: 24px; background: #1e293b; border-radius: 12px; color: white; }
      .cover-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; opacity: .75; margin-bottom: 4px; }
      .cover-title { font-size: 22px; font-weight: 800; line-height: 1.2; }
      .cover-sub { font-size: 11px; opacity: .7; margin-top: 4px; }
      .cover-right { text-align: right; }
      .cover-date { font-size: 10px; opacity: .7; margin-bottom: 6px; }
      .cover-campaign { font-size: 13px; font-weight: 700; }
      .cover-score { display: inline-flex; align-items: baseline; gap: 2px; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.2); border-radius: 8px; padding: 4px 10px; margin-top: 6px; }
      .cover-score-num { font-size: 18px; font-weight: 800; }
      .cover-score-denom { font-size: 11px; opacity: .75; }

      /* Brief Grid */
      .brief-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 11px; }
      .brief-cell { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; }
      .brief-cell strong { color: #64748b; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px; letter-spacing: .05em; }
      .brief-cell span { color: #0f172a; font-weight: 500; }

      /* Decision Banner */
      .decision-banner { border: 1px solid; border-radius: 10px; padding: 14px 18px; margin-bottom: 18px; }
      .decision-label { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
      .decision-rationale { font-size: 11px; line-height: 1.5; margin-top: 4px; }

      /* Section */
      .section { background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; break-inside: auto; }
      .section-title { font-size: 12px; font-weight: 700; padding-bottom: 8px; margin-bottom: 12px; border-bottom: 2px solid; letter-spacing: .02em; page-break-after: avoid; break-after: avoid; }
      .summary-text { font-size: 11.5px; color: #334155; line-height: 1.6; }

      /* Grids */
      .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

      /* Card */
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; break-inside: avoid; }
      .card-label { font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 3px; }
      .metric-val { font-size: 18px; font-weight: 800; margin-top: 2px; line-height: 1.2; }

      /* Meta */
      .meta-row { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 7px; font-size: 11px; }
      .meta-label { font-size: 9px; font-weight: 600; letter-spacing: .07em; text-transform: uppercase; color: #94a3b8; min-width: 90px; padding-top: 1px; flex-shrink: 0; }

      /* Badge */
      .badge { font-size: 9px; font-weight: 600; padding: 2px 6px; border-radius: 4px; border: 1px solid; display: inline-block; }

      /* Structured Plan Table */
      .plan-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
      .plan-table th { background: #f8fafc; padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 700; text-transform: uppercase; color: #475569; border-bottom: 2px solid #e2e8f0; }
      .plan-table td { padding: 10px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; vertical-align: top; }
      .plan-table tr:nth-child(even) td { background: #fafbfc; }

      /* Placements */
      .placement-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; break-inside: avoid; }
      .placement-header { padding: 8px 12px; display: flex; align-items: center; justify-content: space-between; }
      .placement-platform { font-size: 11px; font-weight: 700; }
      .placement-type { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(0,0,0,.04); color: #64748b; }
      .placement-body { padding: 10px 12px; }
      .placement-subject { font-size: 11px; font-weight: 600; color: #0f172a; margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; }
      .placement-preview { font-size: 10px; color: #334155; line-height: 1.5; }
      .hashtags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .hashtag { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: #eff6ff; color: #1d4ed8; }

      /* Checklist */
      .checklist-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
      .check-icon { font-size: 12px; font-weight: 700; flex-shrink: 0; }
      .check-label { flex: 1; color: #334155; }
      .check-status { font-size: 9px; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }

      /* Calendar */
      .week-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; break-inside: avoid; }
      .week-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
      .week-label { font-size: 11px; font-weight: 700; color: #0f172a; }
      .week-date { font-size: 9px; color: #94a3b8; }
      .week-theme { font-size: 10px; color: #64748b; margin-bottom: 6px; font-style: italic; }
      .activity-row { display: flex; gap: 6px; align-items: flex-start; margin-bottom: 3px; font-size: 10px; }
      .activity-day { background: #eff6ff; color: #1d4ed8; border-radius: 3px; padding: 1px 4px; font-weight: 600; min-width: 45px; text-align: center; flex-shrink: 0; }
      .activity-desc { color: #334155; line-height: 1.4; }

      /* Footer */
      .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; }

      /* Bullet */
      .bullet { display: flex; align-items: flex-start; gap: 6px; font-size: 11px; color: #475569; margin-bottom: 4px; }
      .dot { width: 5px; height: 5px; border-radius: 50%; background: #4f46e5; flex-shrink: 0; margin-top: 5px; }

      @page { size: A4; margin: 0; }
      @media print {
        body { background: white; }
        .page { padding: 15mm 15mm; max-width: 100%; margin: 0; }
        .section { box-shadow: none; border-color: #e2e8f0; }
        .grid-2, .grid-4 { display: block !important; }
        .card, .placement-card, .week-block { margin-bottom: 10px !important; }
        tr { page-break-inside: avoid; break-inside: avoid; }
      }
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
      {/* ── Header (Apple Pro Luxury Header) ── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-[#14B8A6]/10 border border-[#14B8A6]/20 flex items-center justify-center">
                <Send size={20} className="text-[#2DD4BF]" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight font-sora text-white">Campaign Publisher</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans">Autonomous multi-channel publishing strategy, placement schedules, and readiness metrics</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <span className="px-3 py-1.5 rounded-full bg-[#14B8A6]/10 border border-[#14B8A6]/20 text-xs font-mono text-[#2DD4BF]">
              Goal: PUBLISHING
            </span>
            <button
              onClick={handleExportPDF}
              disabled={exportingPdf}
              className="px-4 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#5254d8] text-xs font-semibold text-white transition-all shadow-md active:scale-[0.98] flex items-center gap-2 disabled:opacity-50 font-sora"
            >
              <FileDown size={14} />
              <span>{exportingPdf ? 'Preparing…' : 'Export PDF'}</span>
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
        <div className={`card-elevate rounded-xl p-6 border relative overflow-hidden ${publishingDecision === 'APPROVED_FOR_PUBLISHING' ? 'bg-[#4edea3]/10 border-[#4edea3]/20' : publishingDecision === 'HOLD' ? 'bg-[#F43F5E]/10 border-[#F43F5E]/20' : 'bg-[#F59E0B]/10 border-[#F59E0B]/20'}`}>
          <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: `linear-gradient(90deg, ${publishingDecision === 'APPROVED_FOR_PUBLISHING' ? '#4edea3' : publishingDecision === 'HOLD' ? '#F43F5E' : '#F59E0B'}, transparent)` }} />
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
        <div className="card-elevate bg-[#0A0A1C] border border-[#6366F1]/25 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] to-transparent" />
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <FileText size={20} className="text-[#6366F1]" />
            Executive Summary
          </h3>
          <p className="text-base leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{executiveSummary}</p>
        </div>
      )}

      {/* Projected Metrics */}
      {projectedMetrics.total_reach && (
        <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#4338CA] via-[#0D9488] via-[#D97706] to-[#7C3AED]" />
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
            <LineChart size={20} className="text-[#818CF8]" />
            Projected Metrics
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {projectedMetrics.total_reach && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl p-4 min-w-0">
                <span className="text-xs uppercase mb-2 block truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Total Reach</span>
                <p className="text-xl font-bold break-words leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#6366F1' }}>{projectedMetrics.total_reach}</p>
              </div>
            )}
            {projectedMetrics.lead_target && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl p-4 min-w-0">
                <span className="text-xs uppercase mb-2 block truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Lead Target</span>
                <p className="text-xl font-bold break-words leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{projectedMetrics.lead_target}</p>
              </div>
            )}
            {projectedMetrics.estimated_ctr && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl p-4 min-w-0">
                <span className="text-xs uppercase mb-2 block truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. CTR</span>
                <p className="text-xl font-bold break-words leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#F59E0B' }}>{projectedMetrics.estimated_ctr}</p>
              </div>
            )}
            {projectedMetrics.estimated_cost && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl p-4 min-w-0">
                <span className="text-xs uppercase mb-2 block truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Est. Cost</span>
                <p className="text-xl font-bold break-words leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>{projectedMetrics.estimated_cost}</p>
              </div>
            )}
            {projectedMetrics.roi_projection && (
              <div className="bg-[#0A0A0F] border border-[#2A2A38]/60 rounded-xl p-4 min-w-0">
                <span className="text-xs uppercase mb-2 block truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>ROI Projection</span>
                <p className="text-xl font-bold break-words leading-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#4edea3' }}>{projectedMetrics.roi_projection}</p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 items-center justify-between text-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '16px' }}>
            {projectedMetrics.timeline_to_results && (
              <div className="flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
                <Calendar size={14} className="text-[#6366F1]" />
                <span>Timeline: <strong style={{ color: '#F1F1F3' }}>{projectedMetrics.timeline_to_results}</strong></span>
              </div>
            )}
            
            {projectedMetrics.projection_confidence && (
              <div className="flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span style={{ color: '#8B8B9E' }}>Confidence:</span>
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#4edea3]/10 border border-[#4edea3]/20" style={{ color: '#4edea3', fontFamily: 'JetBrains Mono, monospace' }}>
                  {projectedMetrics.projection_confidence}
                </span>
                {projectedMetrics.confidence_explanation && (
                  <span className="text-[#8B8B9E] text-xs">({projectedMetrics.confidence_explanation})</span>
                )}
              </div>
            )}
          </div>

          {projectedMetrics.projection_note && (
            <div className="mt-4 p-3.5 rounded-lg bg-[#0d0d14] border border-[#2A2A38]/50 text-xs italic" style={{ fontFamily: 'Inter, sans-serif', color: '#8B8B9E' }}>
              <span className="font-semibold uppercase tracking-wider text-[#A0A0D2] not-italic block mb-1" style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px' }}>Analyst Note</span>
              "{projectedMetrics.projection_note}"
            </div>
          )}
        </div>
      )}

      {/* Publishing Plan */}
      {publishingPlan.length > 0 && (
        <div className="card-elevate bg-[#0A0A1C] border border-[#8B5CF6]/25 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#8B5CF6] to-transparent" />
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
              <Map size={20} className="text-[#8B5CF6]" />
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
                    {missingCount > 0 && <span className="ml-1.5" style={{ color: '#FCA5A5' }}>{missingCount} missing</span>}
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
