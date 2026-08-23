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

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location) {
    if (
      window.location.hostname.includes('workers.dev') ||
      window.location.hostname.includes('pages.dev') ||
      window.location.hostname.includes('onrender.com') ||
      window.location.hostname.includes('agentmark')
    ) {
      return 'https://agentmark-backend.onrender.com';
    }
    return `${window.location.protocol}//${window.location.hostname}:5003`;
  }
  return 'https://agentmark-backend.onrender.com';
};

export const useCampaignSocket = ({
  campaignId,
  dispatch,
  setShowHumanReview,
}: UseCampaignSocketProps) => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!campaignId) return;

    const controller = new AbortController();
    const SOCKET_URL = getSocketUrl();
    const token = localStorage.getItem('token') || sessionStorage.getItem('token') || '';

    let mounted = true;

    const connectSocket = async () => {
      try {
        const { io } = await import('socket.io-client');
        if (!mounted) return;

        const socket = io(SOCKET_URL, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 500,
          reconnectionDelayMax: 3000,
          reconnectionAttempts: 20,
          multiplex: true,
          auth: { token },
        });
        socketRef.current = socket;

        socket.on('reconnect_attempt', () => {
          const freshToken = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
          socket.auth = { token: freshToken };
        });

        socket.on('connect', () => {
          socket.emit('join_campaign', campaignId);
        });

        socket.on('connect_error', (err: Error) => {
          console.warn('[useCampaignSocket] Connect error:', err.message);
          const freshToken = localStorage.getItem('token') || sessionStorage.getItem('token') || '';
          if (freshToken) socket.auth = { token: freshToken };
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
                score: data.score,
              },
            });
            toast.success('Focus Group Simulation Completed!');
          }
        });

        socket.on('human_approval_required', async () => {
          setShowHumanReview(true);
          toast('Campaign ready for review — Human approval required', {
            icon: '📋',
            id: 'human-review-required',
            duration: 5000,
          });
          try {
            const res = await api.get(`/campaigns/${campaignId}`, { signal: controller.signal });
            if (res.data?.data && mounted) {
              dispatch({
                type: 'CAMPAIGN_LOADED',
                payload: res.data.data,
              });
            }
          } catch (err: any) {
            if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
            console.error('Failed to refetch campaign on human_approval_required:', err);
          }
        });

        socket.on('campaign_complete', async () => {
          setShowHumanReview(false);
          toast.success('Campaign Generation Complete!');
          try {
            const res = await api.get(`/campaigns/${campaignId}`, { signal: controller.signal });
            if (res.data?.data && mounted) {
              dispatch({
                type: 'CAMPAIGN_LOADED',
                payload: res.data.data,
              });
            }
          } catch (err: any) {
            if (err?.name === 'AbortError' || err?.name === 'CanceledError') return;
            console.error('Failed to refetch campaign on campaign_complete:', err);
          }
        });
      } catch (err) {
        console.error('Failed to load socket.io-client:', err);
      }
    };

    void connectSocket();

    return () => {
      mounted = false;
      controller.abort();
      if (socketRef.current) {
        socketRef.current.emit('leave_campaign', campaignId);
        socketRef.current.disconnect();
      }
    };
  }, [campaignId, dispatch, setShowHumanReview]);
};
