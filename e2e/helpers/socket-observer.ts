import { io, Socket } from 'socket.io-client';

export interface CapturedSocketEvent {
  event: string;
  data: Record<string, any>;
  timestamp: number;
}

export class SocketObserver {
  private socket: Socket | null = null;
  public capturedEvents: CapturedSocketEvent[] = [];

  connect(backendUrl: string, campaignId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(backendUrl, {
        transports: ['websocket'],
        reconnection: true,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Socket.IO connection timeout'));
      }, 5000);

      this.socket.on('connect', () => {
        clearTimeout(timeout);
        this.socket?.emit('join_campaign', campaignId);
        resolve();
      });

      this.socket.onAny((event: string, data: any) => {
        this.capturedEvents.push({
          event,
          data: typeof data === 'object' ? data : { raw: data },
          timestamp: Date.now(),
        });
      });

      this.socket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  simulateDisconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  reconnect(): void {
    if (this.socket) {
      this.socket.connect();
    }
  }

  clearEvents(): void {
    this.capturedEvents = [];
  }
}
