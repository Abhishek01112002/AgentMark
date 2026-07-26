import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { Campaign } from '../types';

interface UseCampaignSocketProps {
  campaignId: string | undefined;
  setCampaign: React.Dispatch<React.SetStateAction<Campaign | null>>;
  setFocusGroupReport: (report: any) => void;
  setFocusGroupFetched: (fetched: boolean) => void;
  setFocusGroupError: (error: string | null) => void;
  setFocusGroupUpdatedViaMcp: (updated: boolean) => void;
  setShowHumanReview: (show: boolean) => void;
  setQualityScore: (score: number | null) => void;
}

export const useCampaignSocket = ({
  campaignId,
  setCampaign,
  setFocusGroupReport,
  setFocusGroupFetched,
  setFocusGroupError,
  setFocusGroupUpdatedViaMcp,
  setShowHumanReview,
  setQualityScore,
}: UseCampaignSocketProps) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    const controller = new AbortController();
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5003';
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

    let mounted = true;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!mounted) return;

        const socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 2000,
          reconnectionAttempts: 5,
          auth: { token },
        });
        socketRef.current = socket;

        socket.on('connect', () => {
          socket.emit('join_campaign', campaignId);
        });

        socket.on('agent_update', (data: any) => {
          if (data && data.outputs && typeof data.outputs === 'object') {
            setCampaign(prev => {
              if (!prev) return null;
              const currentOutputs = prev.aiOutputs
                ? (typeof prev.aiOutputs === 'string' ? JSON.parse(prev.aiOutputs) : prev.aiOutputs)
                : {};
              return {
                ...prev,
                aiOutputs: {
                  ...currentOutputs,
                  ...data.outputs,
                },
              };
            });
          }
        });

        socket.on('focus_group_complete', (data: any) => {
          if (data?.report) {
            setFocusGroupReport(data.report);
            setFocusGroupFetched(true);
            setFocusGroupError(null);
            setFocusGroupUpdatedViaMcp(true);

            setCampaign(prev => {
              if (!prev) return null;
              const currentOutputs = prev.aiOutputs || {};
              const currentOutputsMap = currentOutputs.focus_group_outputs || {};
              const hashKey = data.hashKey || currentOutputs.focus_group_output_hash || 'mcp';
              return {
                ...prev,
                aiOutputs: {
                  ...currentOutputs,
                  focus_group_output: data.report,
                  focus_group_output_hash: hashKey,
                  focus_group_outputs: { ...currentOutputsMap, [hashKey]: data.report },
                },
              };
            });

            const score = data.score ?? data.report?.overall_score;
            toast.success(
              score != null
                ? `Focus Group updated — Score: ${score}/100`
                : 'Focus Group results updated',
              { duration: 4000 }
            );
          }
        });

        socket.on('campaign_data_updated', async (data: any) => {
          if (data?.campaignId === campaignId && data?.updatedField !== 'focus_group') {
            try {
              const response = await api.get(`/campaigns/${campaignId}`, { signal: controller.signal });
              setCampaign(response.data.campaign);
            } catch (err: any) {
              if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
              console.error('Failed to refresh campaign after MCP update:', err);
            }
          }
        });

        socket.on('human_approval_required', async () => {
          try {
            const response = await api.get(`/campaigns/${campaignId}`, { signal: controller.signal });
            const campaignData = response.data.campaign;
            setCampaign(campaignData);
            setShowHumanReview(true);
            if (campaignData.reviewScore) setQualityScore(campaignData.reviewScore);
            toast.success('Copy revision complete — ready for review', { duration: 4000 });
          } catch (err: any) {
            if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
            console.error('Failed to refresh campaign after revision:', err);
          }
        });
      } catch (err) {
        console.error('Failed to initialize socket connection:', err);
      }
    };

    connectSocket();

    return () => {
      mounted = false;
      controller.abort();
      if (socketRef.current) {
        socketRef.current.emit('leave_campaign', campaignId);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [
    campaignId,
    setCampaign,
    setFocusGroupReport,
    setFocusGroupFetched,
    setFocusGroupError,
    setFocusGroupUpdatedViaMcp,
    setShowHumanReview,
    setQualityScore,
  ]);

  return { socketRef };
};
