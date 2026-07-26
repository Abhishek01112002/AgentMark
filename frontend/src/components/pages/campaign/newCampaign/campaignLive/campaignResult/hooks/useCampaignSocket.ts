import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../../../../../../../services/api';
import { CampaignAction } from '../reducers/campaignReducer';

interface UseCampaignSocketProps {
  campaignId: string | undefined;
  dispatch: React.Dispatch<CampaignAction>;
  setShowHumanReview: (show: boolean) => void;
}

export const useCampaignSocket = ({
  campaignId,
  dispatch,
  setShowHumanReview,
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
            dispatch({
              type: 'AGENT_OUTPUT_MERGED',
              payload: data.outputs,
            });
          }
        });

        socket.on('focus_group_complete', (data: any) => {
          if (data?.report) {
            dispatch({
              type: 'FOCUS_GROUP_COMPLETE',
              payload: {
                report: data.report,
                hashKey: data.hashKey,
                score: data.score ?? data.report?.overall_score,
              },
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
              if (response.data?.campaign) {
                dispatch({
                  type: 'CAMPAIGN_LOADED',
                  payload: response.data.campaign,
                });
              }
            } catch (err: any) {
              if (err?.name === 'AbortError' || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
              console.error('Failed to refresh campaign after MCP update:', err);
            }
          }
        });

        socket.on('human_approval_required', async () => {
          try {
            const response = await api.get(`/campaigns/${campaignId}`, { signal: controller.signal });
            const campaignData = response.data?.campaign;
            if (campaignData) {
              dispatch({
                type: 'CAMPAIGN_LOADED',
                payload: campaignData,
              });
              setShowHumanReview(true);
              toast.success('Copy revision complete — ready for review', { duration: 4000 });
            }
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
  }, [campaignId, dispatch, setShowHumanReview]);

  return { socketRef };
};
