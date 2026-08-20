import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { UserCheck, X } from 'lucide-react';
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
          toast.custom(
            (t) => (
              <div
                className={`${
                  t.visible ? 'animate-enter opacity-100 translate-y-0 scale-100' : 'animate-leave opacity-0 -translate-y-2 scale-95'
                } transition-all duration-300 ease-out max-w-md w-full bg-[#12121A]/95 backdrop-blur-xl border border-[#6366F1]/40 shadow-[0_12px_40px_rgba(0,0,0,0.6),0_0_24px_rgba(99,102,241,0.2)] rounded-2xl pointer-events-auto flex items-center gap-3.5 p-4 text-[#F1F1F3]`}
              >
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1]/20 to-[#A855F7]/10 border border-[#6366F1]/30 flex items-center justify-center text-[#818CF8]">
                  <UserCheck className="w-5 h-5 text-[#818CF8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#818CF8] bg-[#6366F1]/15 px-2.5 py-0.5 rounded-full border border-[#6366F1]/25">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8] animate-pulse" />
                      Action Required
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-1 tracking-tight">
                    Campaign Requires Human Review
                  </p>
                </div>
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="text-gray-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
                  aria-label="Close notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ),
            { id: 'human-review-required', duration: 5000 }
          );
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
