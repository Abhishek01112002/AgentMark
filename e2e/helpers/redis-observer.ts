import { redis } from '../../backend/src/utils/redis';

export interface CapturedRedisEvent {
  channel: string;
  payload: Record<string, any>;
  timestamp: number;
}

export class RedisObserver {
  public capturedEvents: CapturedRedisEvent[] = [];

  async connect(): Promise<void> {
    if (redis.status === 'wait') {
      await redis.connect();
    }
  }

  async disconnect(): Promise<void> {}

  async subscribeToCampaign(campaignId: string): Promise<void> {
    const channel = `campaign:${campaignId}`;
    await redis.subscribe(channel);
    redis.on('message', (chan, msg) => {
      if (chan === channel) {
        try {
          const parsed = JSON.parse(msg);
          this.capturedEvents.push({
            channel: chan,
            payload: parsed,
            timestamp: Date.now(),
          });
        } catch {}
      }
    });
  }

  async publishMockEvent(channel: string, payload: Record<string, any>): Promise<void> {
    await redis.publish(channel, JSON.stringify(payload));
  }

  async ping(): Promise<boolean> {
    try {
      const res = await redis.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  clearEvents(): void {
    this.capturedEvents = [];
  }
}
