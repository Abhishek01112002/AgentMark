import toast from 'react-hot-toast';

export interface CampaignExportData {
  campaignName?: string;
  brandName?: string;
  industry?: string;
  primaryGoal?: string;
  copyVariants?: Record<string, any[]>;
  creativeHooks?: any[];
  imagePrompts?: any[];
  aiOutputs?: any;
}

export function generateCampaignJson(data: CampaignExportData): string {
  const exportPayload = {
    exportedAt: new Date().toISOString(),
    campaignName: data.campaignName || 'Campaign Deliverables',
    brandName: data.brandName || '',
    industry: data.industry || '',
    primaryGoal: data.primaryGoal || '',
    deliverables: {
      copyVariants: data.copyVariants || data.aiOutputs?.copyVariants || {},
      creativeHooks: data.creativeHooks || data.aiOutputs?.creativeHooks || [],
      imagePrompts: data.imagePrompts || data.aiOutputs?.imagePrompts || [],
    },
  };
  return JSON.stringify(exportPayload, null, 2);
}

export function generateCampaignCsv(data: CampaignExportData): string {
  const rows: string[][] = [
    ['Type', 'Channel / Category', 'Headline / Title', 'Body / Content', 'CTAs / Notes']
  ];

  const variants = data.copyVariants || data.aiOutputs?.copyVariants || {};
  Object.entries(variants).forEach(([channel, list]) => {
    if (Array.isArray(list)) {
      list.forEach((v: any, idx: number) => {
        const headline = v.headline || `Variant ${idx + 1}`;
        const body = v.body_copy || v.caption || '';
        const ctas = v.ctas ? JSON.stringify(v.ctas) : '';
        rows.push(['Copy Variant', channel, headline, body, ctas]);
      });
    }
  });

  const hooks = data.creativeHooks || data.aiOutputs?.creativeHooks || [];
  if (Array.isArray(hooks)) {
    hooks.forEach((h: any) => {
      rows.push([
        'Creative Hook',
        h.angle || 'General',
        h.hook_title || h.hook || 'Hook',
        h.script_outline || h.description || '',
        h.visual_direction || ''
      ]);
    });
  }

  const prompts = data.imagePrompts || data.aiOutputs?.imagePrompts || [];
  if (Array.isArray(prompts)) {
    prompts.forEach((p: any) => {
      rows.push([
        'Image Prompt',
        p.aspectRatio || '1:1',
        p.concept || 'Visual Concept',
        p.prompt || p.fullPrompt || '',
        p.negativePrompt || ''
      ]);
    });
  }

  return rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
}

export function downloadCampaignDeliverables(data: CampaignExportData, format: 'json' | 'csv'): void {
  try {
    const filename = `${(data.campaignName || 'campaign').toLowerCase().replace(/[^a-z0-9]/g, '_')}_deliverables.${format}`;
    const content = format === 'json' ? generateCampaignJson(data) : generateCampaignCsv(data);
    const mimeType = format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;';
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported campaign deliverables as ${format.toUpperCase()}`);
  } catch (err) {
    console.error('Failed to export deliverables:', err);
    toast.error('Failed to export campaign deliverables');
  }
}
