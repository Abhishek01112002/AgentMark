import React, { useMemo, useState } from 'react';
import { Archive, Check, Copy, Edit3, GitBranch, Heart, Lock, Plus, Search, Table2, ThumbsDown, Unlock, View } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { ChannelIcon } from '../../../../../../shared/ChannelIcon';

interface CreativeHooksContentProps {
  data?: any;
  campaignId?: string;
  channels: string[];
  copyVariants: Record<string, any[]>;
  onCreativeHooksUpdate: (updatedMatrix: any) => void;
  onCopyVariantsUpdate: (updatedCopyVariants: any) => void;
}

const categories = ['Question', 'Fear', 'Negative', 'Contrarian', 'Social Proof', 'Statistic', 'Story', 'Curiosity', 'Urgency', 'Benefit'];
const stages = ['awareness', 'consideration', 'conversion', 'retention'];
const statusFilters = ['all', 'favorite', 'pinned', 'approved', 'rejected', 'archived'];

const normalizeHook = (hook: any) => ({
  ...hook,
  id: hook.id || `${hook.category}-${hook.headline}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  ctas: Array.isArray(hook.ctas) ? hook.ctas : [],
  platform_suitability: Array.isArray(hook.platform_suitability) ? hook.platform_suitability : [],
  status: hook.status || 'draft',
});

const CreativeHooksContent: React.FC<CreativeHooksContentProps> = ({
  data,
  campaignId,
  channels,
  copyVariants,
  onCreativeHooksUpdate,
  onCopyVariantsUpdate,
}) => {
  const hooks = useMemo(() => (Array.isArray(data?.hooks) ? data.hooks.map(normalizeHook) : []), [data]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [stage, setStage] = useState('all');
  const [status, setStatus] = useState('all');
  const [sortBy, setSortBy] = useState('quality');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ headline: string; psychologicalAngle: string }>({ headline: '', psychologicalAngle: '' });
  const [channelByHook, setChannelByHook] = useState<Record<string, string>>({});
  const [busyHook, setBusyHook] = useState<string | null>(null);

  const filteredHooks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return hooks
      .filter((hook: any) => category === 'all' || hook.category === category)
      .filter((hook: any) => stage === 'all' || hook.funnel_stage === stage)
      .filter((hook: any) => {
        if (status === 'all') return hook.status !== 'archived';
        if (status === 'favorite') return hook.is_favorite;
        if (status === 'pinned') return hook.is_pinned;
        return hook.status === status;
      })
      .filter((hook: any) => {
        if (!q) return true;
        return [
          hook.headline,
          hook.category,
          hook.psychological_angle,
          ...(hook.ctas || []).map((cta: any) => cta.text),
        ].filter(Boolean).join(' ').toLowerCase().includes(q);
      })
      .sort((a: any, b: any) => {
        if (sortBy === 'virality') return Number(b.virality_score || 0) - Number(a.virality_score || 0);
        if (sortBy === 'category') return String(a.category).localeCompare(String(b.category));
        return Number(b.quality_score || 0) - Number(a.quality_score || 0);
      });
  }, [hooks, query, category, stage, status, sortBy]);

  const updateHook = async (hook: any, action: string, payload: Record<string, any> = {}) => {
    if (!campaignId) return;
    setBusyHook(hook.id);
    try {
      const res = await api.patch(`/campaigns/${campaignId}/hooks/${hook.id}`, { action, ...payload });
      onCreativeHooksUpdate(res.data.creative_hook_matrix_output);
      toast.success('Hook updated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update hook');
    } finally {
      setBusyHook(null);
    }
  };

  const copyHook = async (hook: any) => {
    const ctas = hook.ctas.map((cta: any) => cta.text).filter(Boolean).join(', ');
    await navigator.clipboard.writeText(`${hook.headline}\n${hook.psychological_angle}\nCTAs: ${ctas}`);
    toast.success('Hook copied');
  };

  const startEdit = (hook: any) => {
    setEditingId(hook.id);
    setEditDraft({
      headline: hook.headline || '',
      psychologicalAngle: hook.psychological_angle || '',
    });
  };

  const selectedChannelFor = (hook: any) => (
    channelByHook[hook.id] ||
    hook.platform_suitability?.[0] ||
    channels[0] ||
    'linkedin'
  );

  const generateVariantFromHook = async (hook: any, mode: 'variant' | 'more') => {
    if (!campaignId) return;
    const channel = selectedChannelFor(hook);
    const ctas = hook.ctas.map((cta: any) => cta.text).filter(Boolean).join(', ');
    const steeringNote = mode === 'variant'
      ? `Create a copy variant from this Creative Hook Matrix item. Use headline: "${hook.headline}". Psychological angle: "${hook.psychological_angle}". CTA options: ${ctas}.`
      : `Generate one more copy option using the same hook psychology without duplicating existing wording. Category: ${hook.category}. Angle: "${hook.psychological_angle}". CTA options: ${ctas}.`;

    setBusyHook(hook.id);
    try {
      const res = await api.post(`/campaigns/${campaignId}/variants/copy`, { channel, steeringNote }, { timeout: 90000 });
      onCopyVariantsUpdate({ ...copyVariants, [channel]: res.data.variants || [] });
      toast.success(mode === 'variant' ? 'Variant created from hook' : 'More copy generated from hook');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to generate variant');
    } finally {
      setBusyHook(null);
    }
  };

  if (!hooks.length) {
    return (
      <div className="py-14 text-center">
        <p className="text-sm text-[#94A3B8]">Creative hooks are not available for this campaign yet.</p>
      </div>
    );
  }

  const renderActions = (hook: any) => {
    const disabled = busyHook === hook.id;
    return (
      <div className="flex flex-wrap gap-2">
        <button title="Copy" disabled={disabled} onClick={() => copyHook(hook)} className="hook-action"><Copy size={14} /></button>
        <button title="Edit" disabled={disabled || hook.is_locked} onClick={() => startEdit(hook)} className="hook-action"><Edit3 size={14} /></button>
        <button title="Favorite" disabled={disabled} onClick={() => updateHook(hook, 'favorite')} className="hook-action"><Heart size={14} className={hook.is_favorite ? 'fill-current text-[#F472B6]' : ''} /></button>
        <button title="Approve" disabled={disabled} onClick={() => updateHook(hook, 'approve')} className="hook-action"><Check size={14} /></button>
        <button title="Reject" disabled={disabled} onClick={() => updateHook(hook, 'reject')} className="hook-action"><ThumbsDown size={14} /></button>
        <button title="Lock" disabled={disabled} onClick={() => updateHook(hook, 'lock')} className="hook-action">{hook.is_locked ? <Lock size={14} /> : <Unlock size={14} />}</button>
        <button title="Archive" disabled={disabled} onClick={() => updateHook(hook, 'archive')} className="hook-action"><Archive size={14} /></button>
        <button title="Generate More" disabled={disabled} onClick={() => generateVariantFromHook(hook, 'more')} className="hook-action"><Plus size={14} /></button>
        <button title="Create Variant from Hook" disabled={disabled} onClick={() => generateVariantFromHook(hook, 'variant')} className="hook-action"><GitBranch size={14} /></button>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <style>{`.hook-action{height:32px;width:32px;border-radius:10px;border:1px solid #2A2A38;background:#111118;color:#CBD5E1;display:inline-flex;align-items:center;justify-content:center}.hook-action:hover:not(:disabled){border-color:#6366F1;color:#fff}.hook-action:disabled{opacity:.4;cursor:not-allowed}`}</style>

      <div className="flex flex-col xl:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search hooks..." className="w-full h-11 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] pl-9 pr-3 text-sm text-[#EDEDF5] outline-none focus:border-[#6366F1]" />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-11 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] px-3 text-sm text-[#EDEDF5]">
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={stage} onChange={(e) => setStage(e.target.value)} className="h-11 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] px-3 text-sm text-[#EDEDF5]">
          <option value="all">All stages</option>
          {stages.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] px-3 text-sm text-[#EDEDF5]">
          {statusFilters.map((item) => <option key={item} value={item}>{item.replace('-', ' ')}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="h-11 rounded-xl bg-[#0A0A0F] border border-[#2A2A38] px-3 text-sm text-[#EDEDF5]">
          <option value="quality">Quality</option>
          <option value="virality">Virality</option>
          <option value="category">Category</option>
        </select>
        <button onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')} className="h-11 px-4 rounded-xl bg-[#111118] border border-[#2A2A38] text-[#CBD5E1] flex items-center gap-2 text-sm">
          {viewMode === 'card' ? <Table2 size={15} /> : <View size={15} />}
          {viewMode === 'card' ? 'Table' : 'Cards'}
        </button>
      </div>

      {viewMode === 'table' ? (
        <div className="overflow-x-auto rounded-xl border border-[#2A2A38]">
          <table className="w-full text-sm">
            <thead className="bg-[#111118] text-[#94A3B8]">
              <tr>
                <th className="p-3 text-left">Hook</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Scores</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHooks.map((hook: any) => (
                <tr key={hook.id} className="border-t border-[#2A2A38]">
                  <td className="p-3 text-[#F8FAFC] max-w-md">{hook.headline}</td>
                  <td className="p-3 text-[#CBD5E1]">{hook.category}</td>
                  <td className="p-3 text-[#CBD5E1]">Q {hook.quality_score} / V {hook.virality_score}</td>
                  <td className="p-3">{renderActions(hook)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredHooks.map((hook: any) => (
            <div key={hook.id} className="rounded-xl border border-[#2A2A38] bg-[#0A0A0F] p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-lg bg-[#6366F1]/12 text-[#A5B4FC] text-[11px]">{hook.category}</span>
                    <span className="px-2 py-1 rounded-lg bg-[#111118] text-[#94A3B8] text-[11px]">{hook.funnel_stage}</span>
                    {hook.status !== 'draft' && <span className="px-2 py-1 rounded-lg bg-[#111118] text-[#CBD5E1] text-[11px]">{hook.status}</span>}
                  </div>
                  {editingId === hook.id ? (
                    <div className="space-y-2">
                      <input value={editDraft.headline} onChange={(e) => setEditDraft((prev) => ({ ...prev, headline: e.target.value }))} className="w-full rounded-lg bg-[#111118] border border-[#2A2A38] px-3 py-2 text-sm text-[#F8FAFC]" />
                      <textarea value={editDraft.psychologicalAngle} onChange={(e) => setEditDraft((prev) => ({ ...prev, psychologicalAngle: e.target.value }))} className="w-full rounded-lg bg-[#111118] border border-[#2A2A38] px-3 py-2 text-sm text-[#CBD5E1]" rows={3} />
                      <div className="flex gap-2">
                        <button onClick={() => { updateHook(hook, 'edit', editDraft); setEditingId(null); }} className="px-3 py-2 rounded-lg bg-[#6366F1] text-white text-xs">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg bg-[#111118] border border-[#2A2A38] text-[#CBD5E1] text-xs">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-base font-semibold text-[#F8FAFC] leading-snug">{hook.headline}</h3>
                      <p className="mt-2 text-sm text-[#94A3B8] leading-relaxed">{hook.psychological_angle}</p>
                    </>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-[#94A3B8]">Quality</p>
                  <p className="text-lg font-bold text-[#34D399]">{hook.quality_score}</p>
                  <p className="text-xs text-[#94A3B8] mt-2">Virality</p>
                  <p className="text-lg font-bold text-[#FBBF24]">{hook.virality_score}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {hook.ctas.map((cta: any, index: number) => (
                  <span key={`${hook.id}-cta-${index}`} className="px-2.5 py-1 rounded-lg border border-[#2A2A38] text-xs text-[#CBD5E1]">{cta.text}</span>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <select value={selectedChannelFor(hook)} onChange={(e) => setChannelByHook((prev) => ({ ...prev, [hook.id]: e.target.value }))} className="h-9 rounded-lg bg-[#111118] border border-[#2A2A38] px-2 text-xs text-[#EDEDF5]">
                  {[...new Set([...(hook.platform_suitability || []), ...channels, 'linkedin'])].map((channel: string) => (
                    <option key={channel} value={channel}>{channel.replace('_', ' ')}</option>
                  ))}
                </select>
                <div className="flex flex-wrap gap-1.5">
                  {hook.platform_suitability.slice(0, 4).map((channel: string) => (
                    <span key={`${hook.id}-${channel}`} className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8]">
                      <ChannelIcon channel={channel} size={12} />
                      {channel.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {renderActions(hook)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(CreativeHooksContent);
