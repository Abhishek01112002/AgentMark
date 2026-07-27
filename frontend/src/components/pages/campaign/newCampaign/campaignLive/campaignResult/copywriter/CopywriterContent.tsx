import React, { useState, useEffect } from 'react';
import { Link, BookOpen, Copy, Target, Plus, Loader2, EyeOff, Star, GitBranch, TrendingUp, TrendingDown, Minus, Users, PenLine, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';
import api from '../../../../../../../services/api';
import { CopyVariant, CopyVariantsMap } from '../../../../../../../types/variants';
import { copyAsPlainText, copyAsMarkdown } from '../../../../../../../utils/copyFormatting';

interface CopywriterContentProps {
  data?: any;
  campaignId?: string;
  campaign?: any;
  onCopyVariantsUpdate?: (variants: CopyVariantsMap) => void;
  showCreativeHooksBanner?: boolean;
  onOpenCreativeHooks?: () => void;
}

const platforms = [
  { id: 'linkedin', label: 'LinkedIn' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'facebook', label: 'Facebook' },
  { id: 'twitter', label: 'Twitter' },
  { id: 'tiktok', label: 'TikTok' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'email', label: 'Email' },
  { id: 'google_ads', label: 'Google Ads' },
  { id: 'general', label: 'General' },
];

function getVariantsForChannel(
  channel: string,
  copyVariants: CopyVariantsMap | null,
  legacyCopyData: any
): CopyVariant[] {
  if (copyVariants?.[channel]?.length) {
    return copyVariants[channel];
  }
  const legacyCopy = legacyCopyData?.copies?.[channel] || legacyCopyData?.[channel];
  if (!legacyCopy) return [];
  return [{
    id: 'legacy-' + channel,
    headline: legacyCopy.headline || '',
    body_copy: legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption || '',
    ctas: legacyCopy.ctas || {},
    tags: ['Original'],
    isChampion: true,
    isHidden: false,
    createdAt: new Date().toISOString(),
    generationNote: ''
  }];
}

const CopywriterContent: React.FC<CopywriterContentProps> = ({ data, campaignId, campaign, onCopyVariantsUpdate, showCreativeHooksBanner, onOpenCreativeHooks }) => {
  const createVariantSignature = (variant: Partial<CopyVariant>) =>
    [
      (variant.headline || '').trim().toLowerCase(),
      (variant.body_copy || '').trim().toLowerCase(),
      Object.values(variant.ctas || {}).map(v => String(v).trim().toLowerCase()).join('|'),
    ].join('::');

  const parsedData = React.useMemo(() => {
    if (!data) return null;
    if (typeof data === 'string') {
      try { return JSON.parse(data); } catch { return data; }
    }
    return data;
  }, [data]);

  const flatData = React.useMemo(() => {
    if (!parsedData) return null;
    return parsedData.copies ? { ...parsedData, ...parsedData.copies } : parsedData;
  }, [parsedData]);

  const hasRealData = flatData && Object.keys(flatData).length > 0;

  // Extract data from AI output
  const messagingFramework = flatData?.messaging_framework || {};
  const strategicAlignment = flatData?.strategic_alignment || {};
  const copyReadiness = flatData?.copy_readiness || {};

  // Extract copy version history from campaign aiOutputs and include current active draft
  const copyVersions: any[] = React.useMemo(() => {
    if (!campaign?.aiOutputs) return [];
    const outputs = typeof campaign.aiOutputs === 'string'
      ? (() => { try { return JSON.parse(campaign.aiOutputs); } catch { return {}; } })()
      : campaign.aiOutputs;
    
    const rawVersions = (outputs?.copy_versions || []) as any[];

    // Ensure all saved versions have normalized numerical scores
    const versions = rawVersions.map((v: any) => {
      const fgScore = v.focus_group_score != null ? Number(v.focus_group_score) : null;
      const cpScore = v.copy_score != null ? Number(v.copy_score) : null;
      return {
        ...v,
        focus_group_score: (fgScore != null && !isNaN(fgScore)) ? Math.round(fgScore) : null,
        copy_score: (cpScore != null && !isNaN(cpScore)) ? Math.round(cpScore) : null,
      };
    });

    // Extract current FG score ONLY if focus_group_output_hash matches current copy_output hash,
    // or if a report exists for current copy hash in focus_group_outputs map
    let currentFgScore: number | null = null;
    if (outputs?.copy_output) {
      const copyStr = typeof outputs.copy_output === 'string' ? outputs.copy_output : JSON.stringify(outputs.copy_output);
      let hash = 0;
      for (let i = 0; i < Math.min(copyStr.length, 500); i++) {
        const chr = copyStr.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }
      const currentCopyHash = 'h_' + Math.abs(hash).toString(36);
      const outputsMap = outputs.focus_group_outputs || {};
      const matchingReport = outputsMap[currentCopyHash] || (outputs.focus_group_output_hash === currentCopyHash ? outputs.focus_group_output : null);
      
      if (matchingReport) {
        const parsedFg = typeof matchingReport === 'string' ? (() => { try { return JSON.parse(matchingReport); } catch { return null; } })() : matchingReport;
        const rawFgScore = parsedFg?.overall_score;
        if (rawFgScore != null && !isNaN(Number(rawFgScore))) {
          currentFgScore = Math.round(Number(rawFgScore));
        }
      }
    }

    // Extract current reviewer copy score
    const reviewOutput = outputs?.review_output;
    const parsedReview = typeof reviewOutput === 'string' ? (() => { try { return JSON.parse(reviewOutput); } catch { return null; } })() : reviewOutput;
    const rawCpScore = parsedReview?.agent_scores?.copywriter ?? parsedReview?.copy_review?.score ?? parsedReview?.overall?.quality_score;
    const currentCopyScore: number | null = rawCpScore != null && !isNaN(Number(rawCpScore)) ? Math.round(Number(rawCpScore)) : null;

    // Always include current active draft as the latest entry
    const lastSavedVerNum = versions.length > 0 ? (versions[versions.length - 1]?.version || 0) : 0;
    const currentVerNum = lastSavedVerNum + 1;

    const currentDraft = {
      version: currentVerNum,
      timestamp: (campaign as any).updatedAt || new Date().toISOString(),
      copy: outputs?.copy_output,
      focus_group_score: currentFgScore,
      copy_score: currentCopyScore,
      feedback_used: outputs?.latest_human_feedback || outputs?.last_feedback_used || 'Current Active Copy',
      isCurrentDraft: true,
    };

    // Only show if there's at least one version OR the current draft has copy content
    if (versions.length === 0 && !outputs?.copy_output) return [];
    return [...versions, currentDraft];
  }, [campaign?.aiOutputs, (campaign as any)?.updatedAt, flatData]);

  // Get available platforms from data
  const availablePlatforms = platforms.filter(p => flatData?.[p.id]);

  const tabs = availablePlatforms.length > 0 ? availablePlatforms : platforms.slice(0, 4);

  // Set default active tab to instagram if available, otherwise first available platform
  const defaultTab = availablePlatforms.find(p => p.id === 'instagram')?.id || tabs[0]?.id || 'instagram';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Variants state management
  const [localVariants, setLocalVariants] = useState<CopyVariantsMap>({});
  const [steeringInput, setSteeringInput] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [variantPageByChannel, setVariantPageByChannel] = useState<Record<string, number>>({});

  const getBridgesForChannel = (channel: string) => {
    const list = [];
    const ch = channel.toLowerCase();
    
    if (ch === 'twitter' || ch === 'x') {
      list.push({ 
        name: 'X (Twitter)', 
        label: 'Post on X (Twitter)', 
        icon: (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        ) 
      });
    } else if (ch === 'linkedin') {
      list.push({ 
        name: 'LinkedIn', 
        label: 'Share on LinkedIn', 
        icon: (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#0077B5] fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
          </svg>
        ) 
      });
    } else if (ch === 'email') {
      list.push(
        { 
          name: 'Gmail Web', 
          label: 'Compose in Gmail', 
          icon: <ChannelIcon channel="gmail" size={14} /> 
        },
        { 
          name: 'Email App', 
          label: 'Default Mail Client', 
          icon: (
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#818CF8] fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
          ) 
        }
      );
    } else if (ch === 'facebook') {
      list.push({ 
        name: 'Meta Ads Manager', 
        label: 'Open Meta Ads Manager', 
        icon: (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#1877F2] fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1V12h3v3h-3v6.8c4.56-.93 8-4.96 8-9.8z"/>
          </svg>
        ) 
      });
    } else if (ch === 'instagram') {
      list.push({ 
        name: 'Meta Ads Manager', 
        label: 'Open Meta Ads Manager', 
        icon: (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#E1306C] fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
          </svg>
        ) 
      });
    } else if (ch === 'youtube' || ch === 'tiktok') {
      list.push({ 
        name: ch === 'youtube' ? 'YouTube Studio' : 'TikTok Upload', 
        label: ch === 'youtube' ? 'Open YouTube Studio' : 'Open TikTok Studio', 
        icon: ch === 'youtube' ? (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#FF0000] fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.74 4.29 1.84V9.9c-2.07-.03-4.11-.83-5.69-2.2-.08.06-.09.15-.09.24v9.06c.01 4.54-3.53 8.35-8.07 8.52-4.9.29-9.15-3.37-9.12-8.29.04-4.57 3.58-8.4 8.15-8.54v3.91a4.34 4.34 0 0 0-4.22 4.6c.16 2.37 2.19 4.22 4.57 4.15 2.39-.07 4.26-2.13 4.19-4.52V.02z"/>
          </svg>
        ) 
      });
    } else if (ch === 'google_ads') {
      list.push({ 
        name: 'Google Ads', 
        label: 'Open Google Ads', 
        icon: (
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.02 15.84l9.16-15.06c.4-.66 1.25-.87 1.91-.47l4.58 2.78c.66.4.87 1.25.47 1.91L7.98 20.06c-.4.66-1.25.87-1.91.47L1.49 17.75c-.66-.4-.87-1.25-.47-1.91z" fill="#F4B400"/>
            <path d="M16.48 16.59l4.58 2.78c.66.4.87 1.25.47 1.91l-2.29 3.76c-.4.66-1.25.87-1.91.47l-4.58-2.78c-.66-.4-.87-1.25-.47-1.91l2.29-3.76c.4-.66 1.25-.87 1.91-.47z" fill="#4285F4"/>
          </svg>
        ) 
      });
    }

    return list;
  };

  const getCopywriterBridgeUrl = (name: string, copyText: string, variant: CopyVariant) => {
    const encoded = encodeURIComponent(copyText);
    const encodedSubject = encodeURIComponent(variant.headline || '');
    const encodedBody = encodeURIComponent(variant.body_copy || '');

    if (name === 'X (Twitter)') {
      return `https://x.com/intent/post?text=${encoded}`;
    }
    if (name === 'LinkedIn') {
      return `https://www.linkedin.com/sharing/share-offsite/`;
    }
    if (name === 'Gmail Web') {
      return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&su=${encodedSubject}&body=${encodedBody}`;
    }
    if (name === 'Email App') {
      return `mailto:?subject=${encodedSubject}&body=${encodedBody}`;
    }
    if (name === 'Meta Ads Manager') {
      return 'https://adsmanager.facebook.com/';
    }
    if (name === 'YouTube Studio') {
      return 'https://studio.youtube.com/';
    }
    if (name === 'TikTok Upload') {
      return 'https://www.tiktok.com/upload';
    }
    if (name === 'Google Ads') {
      return 'https://ads.google.com/';
    }
    return '';
  };

  const getVariantFormattedText = (variant: CopyVariant): string => {
    const parts: string[] = [];
    if (variant.headline) {
      parts.push(variant.headline);
      parts.push('');
    }
    if (variant.body_copy) {
      parts.push(variant.body_copy);
    }
    return parts.join('\n');
  };

  const handleOpenCopywriterBridge = async (variant: CopyVariant, bridgeName: string) => {
    const copyText = getVariantFormattedText(variant);
    if (!copyText || !copyText.trim()) {
      toast.error('No copy text available to share.');
      return;
    }
    try {
      await navigator.clipboard.writeText(copyText);
      const url = getCopywriterBridgeUrl(bridgeName, copyText, variant);
      toast.success('Copy text copied to clipboard — opening bridge...', { duration: 2500 });
      if (url) {
        setTimeout(() => {
          if (url.startsWith('mailto:')) {
            window.location.href = url;
          } else {
            window.open(url, '_blank', 'noopener,noreferrer');
          }
        }, 400);
      }
    } catch {
      toast.error('Failed to copy text');
    }
  };

  // Keep a ref to copy_variants so the seeding effect can read it without
  // re-running every time the parent updates campaign (which would cause a loop).
  const copyVariantsRef = React.useRef<CopyVariantsMap>(campaign?.aiOutputs?.copy_variants || {});
  useEffect(() => {
    copyVariantsRef.current = campaign?.aiOutputs?.copy_variants || {};
  }, [campaign?.aiOutputs?.copy_variants]);

  // Seed localVariants once when parsedData is available.
  useEffect(() => {
    if (!parsedData) return;

    const existingVariants: CopyVariantsMap = copyVariantsRef.current;

    // Build a seeded map that guarantees the legacy original is slot-0 for every channel
    const seeded: CopyVariantsMap = {};

    platforms.forEach(({ id: channel }) => {
      const legacyCopy =
        parsedData?.copies?.[channel] ||
        parsedData?.[channel];

      const dbVariants: CopyVariant[] = existingVariants[channel] || [];

      // Only seed the legacy copy if it isn't already persisted in DB variants
      const alreadySeeded = dbVariants.some(v => v.id === `legacy-${channel}`);

      if (legacyCopy && !alreadySeeded) {
        const legacyVariant: CopyVariant = {
          id: `legacy-${channel}`,
          headline: legacyCopy.headline || '',
          body_copy: legacyCopy.body || legacyCopy.body_copy || legacyCopy.caption || '',
          ctas: legacyCopy.ctas || {},
          tags: ['Original'],
          isChampion: dbVariants.length === 0 || !dbVariants.some(v => v.isChampion),
          isHidden: false,
          createdAt: new Date().toISOString(),
          generationNote: '',
        };
        seeded[channel] = [legacyVariant, ...dbVariants];
      } else if (dbVariants.length > 0) {
        seeded[channel] = dbVariants;
      }
    });

    setLocalVariants(seeded);
  // Only re-seed when the source AI data changes, not when parent campaign updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedData]);

  const activeChannelVariants = React.useMemo(() => {
    return getVariantsForChannel(activeTab, localVariants, parsedData);
  }, [activeTab, localVariants, parsedData]);

  const activeVariantsCount = React.useMemo(() => {
    return activeChannelVariants.filter(v => !v.isHidden).length;
  }, [activeChannelVariants]);

  const activeVisibleVariants = React.useMemo(() => {
    return activeChannelVariants.filter(v => !v.isHidden);
  }, [activeChannelVariants]);

  const activeVariantPage = Math.min(
    variantPageByChannel[activeTab] || 1,
    Math.max(activeVisibleVariants.length, 1)
  );

  const currentVariant = activeVisibleVariants[activeVariantPage - 1] || null;

  const handleGenerateVariant = async (channel: string) => {
    if (!campaignId) {
      toast.error('Campaign ID not found');
      return;
    }
    const note = steeringInput[channel] || '';
    setIsGenerating(prev => ({ ...prev, [channel]: true }));
    const currentVariants = (localVariants[channel] || []).filter(v => !v.isHidden);
    const currentVariantPayload = currentVariants.map(v => ({
      id: v.id,
      headline: v.headline,
      body_copy: v.body_copy,
      ctas: v.ctas,
      generationNote: v.generationNote,
    }));

    const MAX_ATTEMPTS = 3;
    let lastErr: any = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          // Show a subtle retrying toast on subsequent attempts
          toast.loading(`Retrying… (attempt ${attempt}/${MAX_ATTEMPTS})`, {
            id: 'variant-retry',
            duration: 8000,
          });
          // Small back-off before retry: 2s on attempt 2, 4s on attempt 3
          await new Promise(res => setTimeout(res, (attempt - 1) * 2000));
        }

        const response = await api.post(
          `/campaigns/${campaignId}/variants/copy`,
          {
            channel,
            steeringNote: note,
            existing_copy: JSON.stringify(currentVariantPayload),
          },
          // Override the global 10-second timeout — LLM calls can take 30-60s
          { timeout: 90000 },
        );

        toast.dismiss('variant-retry');

        const updatedVariants = response.data.variants || [];
        const responseCopyData = response.data.copy_data || response.data.copyData || null;
        setLocalVariants(prev => {
          const prevChannelVariants: CopyVariant[] = prev[channel] || [];
          const legacyVar = prevChannelVariants.find((v: CopyVariant) => v.id.startsWith('legacy-'));

          const normalizedUpdated = [...updatedVariants];
          if (!normalizedUpdated.length && responseCopyData) {
            const candidateVariant: CopyVariant = {
              id: `generated-${channel}-${Date.now()}`,
              headline: responseCopyData.headline || '',
              body_copy: responseCopyData.body_copy || responseCopyData.body || '',
              ctas: responseCopyData.ctas || {},
              tags: responseCopyData.tags || ['✨ Generated'],
              isChampion: false,
              isHidden: false,
              createdAt: responseCopyData.createdAt || new Date().toISOString(),
              generationNote: responseCopyData.generationNote || note,
            };
            const candidateSignature = createVariantSignature(candidateVariant);
            const existingSignatures = prevChannelVariants.map(createVariantSignature);
            if (!existingSignatures.includes(candidateSignature)) {
              normalizedUpdated.push(candidateVariant);
            }
          }

          let newChannelVariants = normalizedUpdated;
          if (legacyVar) {
            const hasLegacy = normalizedUpdated.some((v: CopyVariant) => v.id === legacyVar.id);
            if (!hasLegacy) {
              newChannelVariants = [legacyVar, ...normalizedUpdated];
            }
          }
          if (!newChannelVariants.length && responseCopyData) {
            newChannelVariants = prevChannelVariants.length > 0 ? [...prevChannelVariants] : [];
          }
          const deduped: CopyVariant[] = [];
          const seen = new Set<string>();
          [...newChannelVariants].forEach(v => {
            const sig = createVariantSignature(v);
            if (seen.has(sig)) return;
            seen.add(sig);
            deduped.push(v);
          });
          newChannelVariants = deduped.slice(0, 4);
          const next = { ...prev, [channel]: newChannelVariants };
          // Call outside updater via setTimeout to avoid render-phase setState
          if (onCopyVariantsUpdate) setTimeout(() => onCopyVariantsUpdate(next), 0);
          return next;
        });
        setSteeringInput(prev => ({ ...prev, [channel]: '' }));
        toast.success('New copy variant generated!');
        // Success — break out of retry loop
        lastErr = null;
        break;
      } catch (err: any) {
        lastErr = err;
        toast.dismiss('variant-retry');

        const status = err.response?.status;
        const isRetryable =
          !status || // network/timeout — no HTTP response
          status === 408 ||
          status === 429 ||
          status >= 500;

        // 409 means lock is already held — no point retrying immediately
        if (status === 409 || !isRetryable || attempt === MAX_ATTEMPTS) break;

        console.warn(`Variant generation attempt ${attempt} failed, retrying…`, err.message);
      }
    }

    if (lastErr) {
      console.error('Failed to generate variant:', lastErr);
      const rawErr = lastErr.response?.data?.error;
      const errMsg =
        typeof rawErr === 'string'
          ? rawErr
          : Array.isArray(rawErr)
          ? rawErr[0]?.message || JSON.stringify(rawErr)
          : rawErr?.message ||
            (lastErr.code === 'ECONNABORTED' || lastErr.message?.includes('timeout')
              ? 'Request timed out — please try again'
              : lastErr.message || 'Failed to generate variant');
      toast.error(errMsg);
    }

    setIsGenerating(prev => ({ ...prev, [channel]: false }));
  };

  const handleUpdateMeta = async (channel: string, variantId: string, action: 'pin' | 'hide' | 'unhide') => {
    if (!campaignId) {
      toast.error('Campaign ID not found');
      return;
    }
    const loadingToast = toast.loading(`${action === 'pin' ? 'Pinning champion...' : action === 'hide' ? 'Hiding variant...' : 'Showing variant...'}`);
    try {
      const response = await api.patch(`/campaigns/${campaignId}/variants/copy`, {
        channel,
        variantId,
        action,
      });
      const updatedVariants = response.data.variants || [];
      setLocalVariants(prev => {
        const prevChannelVariants: CopyVariant[] = prev[channel] || [];
        const legacyVar = prevChannelVariants.find((v: CopyVariant) => v.id.startsWith('legacy-'));
        
        let newChannelVariants = [...updatedVariants];
        if (legacyVar) {
          let updatedLegacy = { ...legacyVar };
          if (action === 'pin') {
            updatedLegacy.isChampion = (variantId === legacyVar.id);
          } else if (action === 'hide' && variantId === legacyVar.id) {
            updatedLegacy.isHidden = true;
          } else if (action === 'unhide' && variantId === legacyVar.id) {
            updatedLegacy.isHidden = false;
          }
          
          const hasLegacy = updatedVariants.some((v: CopyVariant) => v.id === legacyVar.id);
          if (!hasLegacy) {
            newChannelVariants = [updatedLegacy, ...updatedVariants];
          }
        }
        const next = { ...prev, [channel]: newChannelVariants };
        if (onCopyVariantsUpdate) setTimeout(() => onCopyVariantsUpdate(next), 0);
        return next;
      });
      toast.dismiss(loadingToast);
      toast.success(`Successfully updated variant!`);
    } catch (err: any) {
      console.error('Failed to update metadata:', err);
      toast.dismiss(loadingToast);
      const rawErr = err.response?.data?.error;
      const errMsg = typeof rawErr === 'string'
        ? rawErr
        : (Array.isArray(rawErr)
            ? rawErr[0]?.message || JSON.stringify(rawErr)
            : (rawErr?.message || err.message || 'Failed to update variant'));
      toast.error(errMsg);
    }
  };

  const handleCopyVariantToClipboard = async (variant: CopyVariant, platformLabel: string) => {
    const parts: string[] = [];
    parts.push(`=== ${platformLabel.toUpperCase()} COPY ===`);
    parts.push('');
    if (variant.headline) {
      parts.push(`Headline: ${variant.headline}`);
      parts.push('');
    }
    if (variant.body_copy) {
      parts.push(variant.body_copy);
      parts.push('');
    }
    if (variant.ctas && Object.keys(variant.ctas).length > 0) {
      parts.push('CTAs:');
      Object.entries(variant.ctas).forEach(([key, val]) => {
        if (val) parts.push(`  ${key.toUpperCase()}: ${val}`);
      });
    }
    const text = parts.join('\n');
    await copyAsMarkdown(text, 'Copy option copied to clipboard!');
  };

  const handleCopyVariantAsPlainText = async (variant: CopyVariant, platformLabel: string) => {
    const parts: string[] = [];
    parts.push(`=== ${platformLabel.toUpperCase()} COPY ===`);
    parts.push('');
    if (variant.headline) {
      parts.push(`Headline: ${variant.headline}`);
      parts.push('');
    }
    if (variant.body_copy) {
      parts.push(variant.body_copy);
      parts.push('');
    }
    if (variant.ctas && Object.keys(variant.ctas).length > 0) {
      parts.push('CTAs:');
      Object.entries(variant.ctas).forEach(([key, val]) => {
        if (val) parts.push(`  ${key.toUpperCase()}: ${val}`);
      });
    }
    const text = parts.join('\n');
    await copyAsPlainText(text, 'Copy option copied as plain text!');
  };

  const handleCopyField = async (value: string, label: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard!`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const handleSingleCtaCopy = (text: string) => {
    if (!text.trim()) return;
    try {
      navigator.clipboard.writeText(text);
      toast.success(`Copied CTA: "${text}"`, { id: `cta-copy-${text.slice(0, 10)}` });
    } catch {
      toast.error('Failed to copy CTA');
    }
  };



  const platformLabel = tabs.find(t => t.id === activeTab)?.label || 'Copy';
  const hasRightPanelContent = Boolean(
    messagingFramework?.brand_promise ||
    messagingFramework?.value_proposition ||
    messagingFramework?.segment_messaging?.length > 0
  );

  return (
    <div className="space-y-6 md:space-y-6">
      {/* ── PAGE HEADER (Apple Pro Luxury Header) ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#12121A]/95 p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 border border-[#10B981]/20 flex items-center justify-center">
                <PenLine size={20} className="text-[#34D399]" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight font-sora text-white">Campaign Copywriter</h2>
            </div>
            <p className="text-xs sm:text-sm text-[#94A3B8] font-sans">
              {hasRealData ? 'AI-optimized channel marketing copy, A/B variants, and messaging frameworks' : 'Generating AI-optimized copy for your campaign.'}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <span className="px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-xs font-mono text-[#6EE7B7]">
              Goal: CONTENT CREATION
            </span>
          </div>
        </div>

        {/* Platform Selection Segmented Control */}
        <div className="mt-6 pt-5 border-t border-[#262636]">
          <div className="flex items-center gap-1.5 p-1.5 bg-[#0D0D14] rounded-2xl border border-[#262636] overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 whitespace-nowrap px-4 py-2.5 rounded-xl text-xs font-semibold font-sora transition-all duration-200 cursor-pointer border-none flex items-center justify-center gap-2 ${
                    isActive
                      ? 'bg-[#6366F1] text-white shadow-sm font-semibold'
                      : 'text-[#94A3B8] hover:text-[#E2E8F0] hover:bg-white/[0.04]'
                  }`}
                >
                  <ChannelIcon channel={tab.id} className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showCreativeHooksBanner && (
        <button
          onClick={onOpenCreativeHooks}
          className="w-full rounded-2xl border border-[#6366F1]/25 bg-[#111118] px-5 py-4 text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-[#818CF8]/50 transition-all"
        >
          <span>
            <span className="block text-sm font-semibold text-[#F8FAFC]">Explore Creative Hook Matrix</span>
            <span className="block text-xs text-[#94A3B8] mt-1">Turn psychological hook angles into copy variants without leaving the campaign workflow.</span>
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#A5B4FC]">
            Open hooks
            <GitBranch size={14} />
          </span>
        </button>
      )}

      <div className={`grid grid-cols-1 ${hasRightPanelContent ? 'xl:grid-cols-12' : 'xl:grid-cols-1'} gap-5`}>
        {/* Channel Strategy Angle - Full Width */}
        {(() => {
          const framework = parsedData?.messaging_framework || {};
          const activeChannelMessaging = framework.channel_messaging?.find(
            (ch: any) => {
              if (!ch?.channel_name) return false;
              const name = ch.channel_name.toLowerCase().replace(/[^a-z0-9]/g, '');
              const tab = activeTab.toLowerCase().replace(/[^a-z0-9]/g, '');
              return name === tab || name.includes(tab) || tab.includes(name);
            }
          );
          if (!activeChannelMessaging) return null;
          return (
            <div className="xl:col-span-12">
              <div className="rounded-xl bg-[#111118] border border-[#2A2A38] p-5 md:p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-[#6366F1]/10 flex items-center justify-center">
                    <Target size={16} className="text-[#6366F1]" />
                  </div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                    Channel Strategy & Angle
                  </h3>
                </div>
                <div className="bg-[#0A0A0F] border border-[#2A2A38] rounded-lg p-4 mb-4">
                  <p className="text-sm leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                    {activeChannelMessaging.approach}
                  </p>
                </div>
                {activeChannelMessaging.key_points?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {activeChannelMessaging.key_points.map((point: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full bg-[#1A1A24] border border-[#2A2A38] text-xs"
                        style={{ fontFamily: 'Inter, sans-serif', color: '#C0C0D0' }}
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Left Column - Variants Stack Feed */}
        <div className={`${hasRightPanelContent ? 'xl:col-span-7' : 'xl:col-span-1'} space-y-5`}>

          {/* Variants Pagination Feed */}
          {currentVariant ? (
            <div 
              key={currentVariant.id} 
              className={`card-elevate bg-[#111118] border rounded-xl p-5 md:p-6 relative overflow-hidden transition-all duration-300 ${
                currentVariant.isChampion ? 'champion-card' : 'border-[#2A2A38]'
              }`}
            >
              {currentVariant.isChampion && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#6366F1] to-transparent opacity-70" />
              )}

              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((page) => {
                    const exists = activeVisibleVariants[page - 1];
                    const isActive = activeVariantPage === page;
                    return (
                      <button
                        key={page}
                        onClick={() => setVariantPageByChannel(prev => ({ ...prev, [activeTab]: page }))}
                        disabled={!exists && page > activeVisibleVariants.length}
                        className={`w-8 h-8 rounded-full border text-[10px] font-bold transition-all ${
                          isActive
                            ? 'bg-[#6366F1] border-[#6366F1] text-white'
                            : exists
                              ? 'bg-[#0A0A0F] border-[#2A2A38] text-[#8B8B9E] hover:text-white hover:border-[#3A3A4A]'
                              : 'bg-[#0A0A0F] border-[#1F1F2B] text-[#49495A] cursor-not-allowed'
                        }`}
                        aria-label={`Variant page ${page}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                <span className="text-[10px] text-[#5A5A6E] font-mono">
                  Variant {activeVariantPage} of {Math.min(activeVisibleVariants.length, 4)}
                </span>
              </div>

              {/* Card Header Actions */}
              <div className="flex justify-between items-start mb-5 flex-wrap gap-2">
                <div className="flex flex-wrap gap-1.5 items-center">
                  {currentVariant.tags?.map((tag, tIdx) => {
                    const isOriginal = tag === 'Original';
                    return (
                      <span 
                        key={tIdx} 
                        className={`px-2.5 py-1 rounded inline-flex items-center gap-1.5 text-[10px] font-bold ${
                          isOriginal 
                            ? 'bg-gradient-to-r from-[#F59E0B]/15 to-[#D97706]/10 border border-[#F59E0B]/30 text-[#FBBF24] shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                            : 'bg-[#6366F1]/10 border border-[#6366F1]/20 text-[#8083ff]'
                        }`}
                        style={{ fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {isOriginal && <Award size={11} className="text-[#FBBF24]" />}
                        {isOriginal ? 'Original Copy' : tag}
                      </span>
                    );
                  })}
                  {currentVariant.generationNote && (
                    <span 
                      className="px-2.5 py-1 rounded bg-[#1A1A24] border border-[#2A2A38] text-[10px] text-[#8B8B9E] italic max-w-[150px] truncate"
                      title={`Staging Note: ${currentVariant.generationNote}`}
                    >
                      "{currentVariant.generationNote}"
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => handleCopyVariantToClipboard(currentVariant, platformLabel)}
                    className="px-2 py-1.5 min-h-[32px] flex items-center justify-center rounded bg-transparent border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-white hover:border-[#6366F1]/40 text-xs gap-1 font-mono"
                    title="Copy as Markdown"
                  >
                    <Copy size={12} />
                    <span>MD</span>
                  </button>
                  <button
                    onClick={() => handleCopyVariantAsPlainText(currentVariant, platformLabel)}
                    className="px-2 py-1.5 min-h-[32px] flex items-center justify-center rounded bg-transparent border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-white hover:border-[#6366F1]/40 text-xs gap-1 font-mono"
                    title="Copy as Plain Text"
                  >
                    <Copy size={12} />
                    <span>TXT</span>
                  </button>
                  <button
                    onClick={() => handleUpdateMeta(activeTab, currentVariant.id, 'pin')}
                    className={`p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded border transition-all cursor-pointer ${
                      currentVariant.isChampion 
                        ? 'bg-[#6366F1]/20 border-[#6366F1] text-[#8083ff]' 
                        : 'bg-transparent border-[#2A2A38] text-[#8B8B9E] hover:bg-[#1A1A24] hover:text-white'
                    }`}
                    title={currentVariant.isChampion ? 'Active Champion' : 'Pin as Champion'}
                  >
                    <Star size={13} fill={currentVariant.isChampion ? '#6366F1' : 'none'} />
                  </button>
                  <button
                    onClick={() => handleUpdateMeta(activeTab, currentVariant.id, 'hide')}
                    className="p-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center rounded bg-transparent border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-red-400 hover:border-red-400/40"
                    title="Hide variant"
                  >
                    <EyeOff size={13} />
                  </button>
                </div>
              </div>

              {/* Card Fields */}
              <div className="space-y-4">
                {currentVariant.headline && (
                    <div className="bg-[#0e0e13] border border-[#6366F1]/15 rounded-xl p-4 focus-within:border-[#6366F1]/50 transition-colors relative">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#6366F1]/5 to-transparent pointer-events-none" />
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1.5 text-[10px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#818CF8' }}>Headline</label>
                      <div className="flex items-start gap-3 relative">
                        <p className="text-sm md:text-base outline-none flex-1 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#E2E8F0' }}>{currentVariant.headline}</p>
                        <button
                          onClick={() => handleCopyField(currentVariant.headline, 'Headline')}
                          className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-white hover:border-[#6366F1]/40"
                          title="Copy headline"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                )}

                {activeTab === 'email' && currentVariant.headline && (
                    <div className="bg-[#0e0e13] border border-[#6366F1]/10 rounded-xl p-4 focus-within:border-[#6366F1]/40 transition-colors relative">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#818CF8]/3 to-transparent pointer-events-none" />
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1.5 text-[10px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#818CF8' }}>Subject</label>
                      <p className="text-sm md:text-base font-semibold outline-none leading-relaxed relative" style={{ fontFamily: 'Inter, sans-serif', color: '#FFFFFF' }}>{currentVariant.headline}</p>
                    </div>
                )}

                {currentVariant.body_copy && (
                    <div className="bg-[#0e0e13] border border-[#6366F1]/10 rounded-xl p-4 focus-within:border-[#6366F1]/40 transition-colors relative">
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#818CF8]/3 to-transparent pointer-events-none" />
                      <label className="absolute -top-2.5 left-3 bg-[#0e0e13] px-1.5 text-[10px] font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#818CF8' }}>Body</label>
                      <div className="flex items-start gap-3 relative">
                        <div className="text-sm md:text-base outline-none min-h-[80px] whitespace-pre-wrap flex-1 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#C8C8D8' }}>
                          {currentVariant.body_copy}
                        </div>
                        <button
                          onClick={() => handleCopyField(currentVariant.body_copy, 'Body')}
                          className="p-2 min-w-[34px] min-h-[34px] flex items-center justify-center rounded border border-[#2A2A38] text-[#8B8B9E] transition-all hover:bg-[#1A1A24] hover:text-white hover:border-[#6366F1]/40"
                          title="Copy body"
                        >
                          <Copy size={13} />
                        </button>
                      </div>
                    </div>
                )}

                {/* CTAs */}
                {currentVariant.ctas && Object.keys(currentVariant.ctas).length > 0 && (
                    <div className="space-y-2">
                      <label className="text-[10px]" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Call to Actions</label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(currentVariant.ctas)
                          .filter(([, val]) => Boolean(val))
                          .slice(0, 4)
                          .map(([key, val], idx) => {
                            const isHero = key === 'primary' || key === 'hero_cta';
                            return (
                              <button
                                key={key}
                                onClick={() => handleSingleCtaCopy(val)}
                                className={`group inline-flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs font-semibold border active:scale-95 transition-all cursor-pointer min-h-[44px] ${
                                  isHero
                                    ? 'bg-[#6366F1]/15 hover:bg-[#6366F1]/25 border-[#6366F1]/30 text-[#818CF8]'
                                    : 'bg-[#1A1A24] border-[#2A2A38] hover:bg-[#1C1C28] text-[#F1F1F3]'
                                }`}
                                style={{ fontFamily: 'JetBrains Mono, monospace' }}
                                title="Click to copy CTA"
                              >
                                <span className="truncate text-left">{val}</span>
                                <span className="flex items-center gap-1 shrink-0">
                                  <span className="text-[10px] opacity-60">{idx + 1}</span>
                                  <Copy size={10} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                </span>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                )}
                {/* Highlighted Direct Action Buttons at bottom */}
                {(() => {
                  const bridges = getBridgesForChannel(activeTab);
                  if (bridges.length === 0) return null;
                  return (
                    <div className="pt-4 mt-5 border-t border-[#2A2A38]/50 flex flex-wrap gap-3 justify-end">
                      {bridges.map(bridge => (
                        <button
                          key={bridge.name}
                          onClick={() => handleOpenCopywriterBridge(currentVariant, bridge.name)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-semibold border bg-gradient-to-r from-[#6366F1]/15 to-[#8B5CF6]/15 hover:from-[#6366F1]/25 hover:to-[#8B5CF6]/25 text-[#a3a5fc] border-[#6366F1]/30 hover:border-[#6366F1]/50 transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-900/10"
                        >
                          <span className="flex items-center justify-center shrink-0 w-5 h-5 bg-[#1F1F2E] border border-[#2A2A38]/60 rounded">
                            {bridge.icon}
                          </span>
                          <span>{bridge.label}</span>
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="card-elevate bg-[#111118] border border-[#2A2A38] rounded-xl p-5 md:p-6">
              <p className="text-sm text-[#8B8B9E]">No visible variants yet.</p>
            </div>
          )}

          {/* Shimmering Skeleton Card (while generating) */}
          {isGenerating[activeTab] && (
            <div className="skeleton-card border border-[#2A2A38]/30 rounded-xl p-5 md:p-6 flex flex-col justify-between" style={{ height: '220px' }}>
              <div className="flex justify-between items-center">
                <div className="h-4 w-28 bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-4 w-12 bg-[#2A2A38]/50 rounded animate-pulse" />
              </div>
              <div className="space-y-3 mt-4 flex-1">
                <div className="h-5 w-3/4 bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-3 w-full bg-[#2A2A38]/50 rounded animate-pulse" />
                <div className="h-3 w-5/6 bg-[#2A2A38]/50 rounded animate-pulse" />
              </div>
              <div className="h-6 w-36 bg-[#2A2A38]/50 rounded mt-4 animate-pulse" />
            </div>
          )}

          {/* Steering Controls Panel */}
          <div className="p-4 rounded-xl bg-[#0d0d14] border border-[#2A2A38]/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#8B8B9E] uppercase tracking-wider" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                Co-Creation Workbench
              </span>
              <span className="text-[10px] text-[#5A5A6E] font-mono">
                Variants: {activeVariantsCount}/4
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <input 
                type="text"
                placeholder="Tweak prompt instructions... (e.g. 'Make it shorter and funnier')"
                value={steeringInput[activeTab] || ''}
                onChange={(e) => setSteeringInput(prev => ({ ...prev, [activeTab]: e.target.value }))}
                disabled={isGenerating[activeTab] || activeVariantsCount >= 4}
                className="flex-1 bg-[#0A0A0F] border border-[#2A2A38] rounded-xl px-4 py-3 min-h-[44px] text-sm text-[#D1D1E0] placeholder-[#8B8B9E]/30 focus:border-[#6366F1]/50 focus:outline-none disabled:opacity-40"
              />
              
              {activeVariantsCount >= 4 ? (
                <button
                  disabled
                  className="px-4 py-3 min-h-[44px] rounded-xl border border-[#2A2A38] text-[#8B8B9E] text-xs font-mono disabled:opacity-50 cursor-not-allowed bg-transparent"
                >
                  Limit Reached (4/4)
                </button>
              ) : (
                <button
                  onClick={() => handleGenerateVariant(activeTab)}
                  disabled={isGenerating[activeTab]}
                  className="px-5 py-3 min-h-[44px] bg-[#6366F1] hover:bg-[#5254d8] disabled:bg-[#6366F1]/40 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shadow-[#6366F1]/10"
                >
                  {isGenerating[activeTab] ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Generating Variant...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={13} />
                      <span>Give Me More Options</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Messaging Framework & Segment Messaging */}
        {hasRightPanelContent && (
          <div className="xl:col-span-5 space-y-5">
          {/* Messaging Framework */}
          {messagingFramework.brand_promise && (
            <div className="card-elevate bg-[#0A0A1C] border border-[#6366F1]/25 rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#6366F1] to-transparent" />
              <h4 className="text-base md:text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>
                <BookOpen size={20} className="text-[#6366F1]" />
                Messaging Framework
              </h4>
              <div className="space-y-4">
                <div>
                  <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Brand Promise</span>
                  <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#D1D1E0' }}>{messagingFramework.brand_promise}</p>
                </div>
                {messagingFramework.value_proposition && (
                  <div>
                    <span className="text-xs uppercase mb-2 block" style={{ fontFamily: 'JetBrains Mono, monospace', color: '#A0A0D2' }}>Value Proposition</span>
                    <p className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#D1D1E0' }}>{messagingFramework.value_proposition}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Segment Messaging */}
          {messagingFramework.segment_messaging?.length > 0 && (
            <div className="card-elevate rounded-xl p-5 relative overflow-hidden shadow-[0_4px_24px_rgba(20,184,166,0.06)]" style={{ background: 'linear-gradient(135deg, rgba(17,17,24,0.95) 0%, rgba(17,24,23,0.95) 100%)', border: '1px solid rgba(20,184,166,0.15)' }}>
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#14B8A6]/4 via-transparent to-[#0EA5E9]/2 pointer-events-none" />
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#14B8A6] via-[#2DD4BF] to-transparent" />
              <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#14B8A6]/4 blur-[60px] pointer-events-none" />
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#14B8A6]/20 to-[#0EA5E9]/10 flex items-center justify-center shrink-0 border border-[#14B8A6]/20">
                  <Users size={14} className="text-[#2DD4BF]" />
                </div>
                <h4 className="m-0 text-sm font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
                  Segment Messaging
                </h4>
              </div>
              <div className="space-y-3">
                {messagingFramework.segment_messaging.map((seg: any, idx: number) => (
                  <div key={idx} className="rounded-xl p-4 border" style={{ background: 'rgba(17,17,24,0.6)', borderColor: 'rgba(20,184,166,0.1)' }}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#14B8A6]/20 to-[#0EA5E9]/10 flex items-center justify-center border border-[#14B8A6]/20">
                          <Users size={11} className="text-[#2DD4BF]" />
                        </div>
                        <h5 className="m-0 text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>{seg.segment_name}</h5>
                      </div>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full font-mono tracking-wide" style={{ background: 'rgba(20,184,166,0.1)', border: '1px solid rgba(20,184,166,0.2)', color: '#5EEAD4' }}>{seg.tone}</span>
                    </div>
                    <p className="text-sm leading-relaxed m-0" style={{ fontFamily: 'Sora, sans-serif', color: '#C4D4D0' }}>{seg.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Strategic Alignment */}
      {strategicAlignment.positioning_used && (
        <div className="card-elevate rounded-xl p-5 relative overflow-hidden shadow-[0_4px_24px_rgba(139,92,246,0.06)]" style={{ background: 'linear-gradient(135deg, rgba(17,17,24,0.95) 0%, rgba(22,20,30,0.95) 100%)', border: '1px solid rgba(139,92,246,0.15)' }}>
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-[#8B5CF6]/4 via-transparent to-[#6366F1]/2 pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#8B5CF6] via-[#A78BFA] to-transparent" />
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[#8B5CF6]/4 blur-[60px] pointer-events-none" />
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#8B5CF6]/20 to-[#6366F1]/10 flex items-center justify-center shrink-0 border border-[#8B5CF6]/20">
              <Link size={14} className="text-[#A78BFA]" />
            </div>
            <h4 className="m-0 text-sm font-semibold tracking-tight" style={{ fontFamily: 'Sora, sans-serif', color: '#F1F1F3' }}>
              Strategic Alignment
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-[#111118]/60 border border-[#2A2A38]/60 rounded-xl p-4">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0A0D2] block mb-1.5">Positioning Used</span>
              <p className="text-sm leading-relaxed" style={{ fontFamily: 'Sora, sans-serif', color: '#E4E1E9' }}>{strategicAlignment.positioning_used}</p>
            </div>
            {strategicAlignment.key_messages_count && (
              <div className="flex items-center gap-3 px-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0A0D2]">Key Messages Integrated:</span>
                <span className="px-3 py-1 rounded-md bg-gradient-to-br from-[#8B5CF6]/15 to-[#6366F1]/10 text-sm font-bold font-mono text-[#A78BFA] border border-[#8B5CF6]/20">{strategicAlignment.key_messages_count}</span>
              </div>
            )}
            {strategicAlignment.deliverables?.length > 0 && (
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#A0A0D2] block mb-2">Deliverables Covered</span>
                <div className="flex flex-wrap gap-2">
                  {strategicAlignment.deliverables.map((del: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 rounded-lg text-xs font-mono tracking-wide" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: '#C4B5FD' }}>{del}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Copy Version History */}
      {copyVersions.length > 0 && (
        <div className="mt-8 rounded-2xl p-6 border shadow-xl relative overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(18, 18, 28, 0.8) 0%, rgba(12, 12, 18, 0.9) 100%)', borderColor: '#262638' }}>
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#0EA5E9] to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold flex items-center gap-2.5 tracking-tight" style={{ fontFamily: 'Inter, sans-serif', color: '#F8FAFC' }}>
              <div className="w-7 h-7 rounded-lg bg-[#0EA5E9]/15 border border-[#0EA5E9]/30 flex items-center justify-center">
                <GitBranch size={15} className="text-[#0EA5E9]" />
              </div>
              Copy Version History & Score Progression
            </h3>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider uppercase" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.25)', fontFamily: 'JetBrains Mono, monospace' }}>
              {copyVersions.length}/5 versions archived
            </span>
          </div>

          {/* Score Progression Bar */}
          {copyVersions.length >= 1 && (() => {
            // Find oldest and newest versions that have a non-null FG score
            const versionsWithScore = copyVersions.filter((v: any) => v.focus_group_score != null);
            if (versionsWithScore.length < 1) return null;

            const firstFG = versionsWithScore[0]?.focus_group_score;
            const lastFG  = versionsWithScore[versionsWithScore.length - 1]?.focus_group_score;
            const delta   = versionsWithScore.length > 1 ? Math.round(lastFG - firstFG) : null;

            return (
              <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-inner" style={{ background: delta != null && delta > 0 ? 'rgba(52,211,153,0.06)' : delta != null && delta < 0 ? 'rgba(244,63,94,0.06)' : 'rgba(99,102,241,0.06)', borderColor: delta != null && delta > 0 ? 'rgba(52,211,153,0.25)' : delta != null && delta < 0 ? 'rgba(244,63,94,0.25)' : 'rgba(99,102,241,0.25)' }}>
                {delta == null
                  ? <Users size={18} className="text-[#818cf8]" />
                  : delta > 0 ? <TrendingUp size={18} className="text-[#34d399]" /> : delta < 0 ? <TrendingDown size={18} className="text-[#f43f5e]" /> : <Minus size={18} className="text-[#818cf8]" />
                }
                <span className="text-xs font-semibold tracking-wide" style={{ fontFamily: 'Inter, sans-serif', color: delta != null && delta > 0 ? '#34d399' : delta != null && delta < 0 ? '#f43f5e' : '#A0A0D2' }}>
                  {delta == null
                    ? `Focus Group score: ${Math.round(lastFG)}/100`
                    : `Focus Group Score Progression: ${Math.round(firstFG)}/100 → ${Math.round(lastFG)}/100${delta > 0 ? ` (+${delta} Improvement)` : delta < 0 ? ` (${delta} — Needs Offer Tuning)` : ' (No change)'}`
                  }
                </span>
              </div>
            );
          })()}

          {/* Version Timeline */}
          <div className="space-y-3">
            {[...copyVersions].reverse().map((ver: any, idx: number) => {
              const isLatest = idx === 0;
              const vNum = ver.version;
              const ts = ver.timestamp ? new Date(ver.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'N/A';
              const fgScore: number | null = ver.focus_group_score;
              const cpScore: number | null = ver.copy_score;
              const feedback: string = ver.feedback_used || 'Initial version';

              const fgColor = fgScore != null ? (fgScore >= 70 ? '#34d399' : fgScore >= 50 ? '#fbbf24' : '#f43f5e') : '#64748B';

              return (
                <div key={vNum} className="flex items-start gap-3.5 p-3.5 rounded-xl transition-all" style={{ background: isLatest ? 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(168,85,247,0.04) 100%)' : 'rgba(10,10,16,0.6)', border: `1px solid ${isLatest ? 'rgba(99,102,241,0.3)' : '#1E1E2C'}` }}>
                  {/* Version badge */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shadow-inner" style={{ background: isLatest ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(168,85,247,0.2) 100%)' : 'rgba(30,30,44,0.8)', color: isLatest ? '#a5a6ff' : '#94A3B8', fontFamily: 'JetBrains Mono, monospace' }}>
                    V{vNum}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      {isLatest && (
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase" style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>CURRENT ACTIVE</span>
                      )}
                      <span className="text-[10px] text-[#64748B]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{ts}</span>

                      {/* Scores */}
                      <div className="ml-auto flex items-center gap-2">
                        {cpScore != null && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md font-medium inline-flex items-center gap-1" style={{ background: 'rgba(99,102,241,0.12)', color: '#a5a6ff', border: '1px solid rgba(99,102,241,0.2)', fontFamily: 'JetBrains Mono, monospace' }}>
                            <PenLine size={12} />
                            Quality: {Math.round(cpScore)}/100
                          </span>
                        )}
                        {fgScore != null ? (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold inline-flex items-center gap-1" style={{ background: `${fgColor}18`, color: fgColor, border: `1px solid ${fgColor}35`, fontFamily: 'JetBrains Mono, monospace' }}>
                            <Users size={12} />
                            Focus Group: {Math.round(fgScore)}/100
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-md font-medium text-[#64748B] border border-[#27273A] inline-flex items-center gap-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                            <Users size={12} />
                            Pending Evaluation
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Feedback preview */}
                    <p className="text-xs text-[#94A3B8] leading-relaxed line-clamp-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {feedback.length > 130 ? feedback.slice(0, 130) + '…' : feedback}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Copy Readiness Overview */}
      {Object.keys(copyReadiness).length > 0 && (
        <div className="mt-6 bg-[#0A0A1C] border border-[#7C3AED40] rounded-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#7C3AED] to-transparent" />
          <h3 className="text-base font-semibold mb-3" style={{ fontFamily: 'Inter, sans-serif', color: '#F1F1F3' }}>Copy Readiness Status</h3>
          
          {/* Messaging Framework Status */}
          {copyReadiness.messaging_framework_complete !== undefined && (
            <div className="mb-4 pb-4 border-b border-[#2A2A38]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg" style={{ backgroundColor: copyReadiness.messaging_framework_complete ? 'rgba(78, 222, 163, 0.15)' : 'rgba(139, 139, 158, 0.15)' }}>
                  <span className={`w-2 h-2 rounded-full ${copyReadiness.messaging_framework_complete ? 'bg-[#4edea3]' : 'bg-[#8B8B9E]'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold" style={{ fontFamily: 'JetBrains Mono, monospace', color: copyReadiness.messaging_framework_complete ? '#4edea3' : '#8B8B9E' }}>
                    MESSAGING FRAMEWORK
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#8B8B9E' }}>
                    {copyReadiness.messaging_framework_complete ? 'Brand promise, value proposition & segment messaging ready' : 'Messaging framework not yet generated'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Channel Readiness Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            {Object.entries(copyReadiness)
              .filter(([channel]) => channel !== 'messaging_framework_complete')
              .map(([channel, ready]: [string, any]) => (
              <div key={channel} className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ready ? 'bg-[#4edea3]' : 'bg-[#8B8B9E]'}`} />
                <ChannelIcon channel={channel} size={12} className={`flex-shrink-0 ${ready ? 'text-[#4edea3]' : 'text-[#8B8B9E]'}`} />
                <span className="text-xs capitalize truncate" style={{ fontFamily: 'JetBrains Mono, monospace', color: ready ? '#4edea3' : '#8B8B9E' }}>
                  {channel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CopywriterContent);
