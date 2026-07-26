import { StatusStyle } from '../types';

export const formatErrorText = (msg: string | null | undefined): string => {
  if (!msg) return '';
  const trimmed = msg.trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

export const getStatusStyle = (status: string): StatusStyle => {
  switch (status) {
    case 'completed':
      return { bg: 'rgba(78,222,163,0.1)', text: '#4edea3', label: 'Completed' };
    case 'processing':
      return { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', label: 'Processing' };
    case 'failed':
      return { bg: 'rgba(244,63,94,0.1)', text: '#F43F5E', label: 'Failed' };
    default:
      return { bg: '#1f1f25', text: '#8B8B9E', label: status };
  }
};

export const formatGoalLabel = (goal: string): string => {
  const normalized = (goal || '').replace(/_/g, ' ').trim();
  if (!normalized) return 'Not specified';
  const lower = normalized.toLowerCase();
  if (lower === 'lead gen' || lower === 'lead generation') return 'Lead Generation';
  if (lower === 'lead_gen') return 'Lead Generation';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const formatIndustryLabel = (industry: string): string => {
  const normalized = (industry || '').trim().toLowerCase();
  if (!normalized) return 'Not specified';
  const industryMap: Record<string, string> = {
    'saas': 'SaaS',
    'fintech': 'FinTech',
    'ai': 'AI',
    'ml': 'ML',
    'ios': 'iOS',
    'android': 'Android',
    'api': 'API',
    'b2b': 'B2B',
    'b2c': 'B2C',
  };
  if (industryMap[normalized]) return industryMap[normalized];
  return normalized
    .split(/[\s_-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const computeCopyHash = (activeCopyText: string, sliceLength: number = 4000): string => {
  const text = activeCopyText.slice(0, sliceLength);
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
};
