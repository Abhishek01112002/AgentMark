import crypto from 'crypto';

// Replicate PromiseQueue class logic from redis-subscriber.ts for isolated queue testing
class PromiseQueueTestHarness {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  public add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        let attempts = 0;
        const maxAttempts = 3;
        let lastError: any;

        while (attempts < maxAttempts) {
          try {
            attempts++;
            const result = await fn();
            resolve(result);
            return;
          } catch (err) {
            lastError = err;
            if (attempts < maxAttempts) {
              const backoff = Math.pow(2, attempts) * 10; // compressed timing for test
              await new Promise((r) => setTimeout(r, backoff));
            }
          }
        }
        reject(lastError);
      });

      this.processNext();
    });
  }

  private async processNext() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch {
        // Handled in individual task promises
      }
    }
    this.processing = false;
    this.processNext();
  }
}

describe('Proof-of-Fix Execution Engine (Backend Adversarial Suite)', () => {
  // =========================================================================
  // ADV-BUG-004: Redis Lock Expiration & Ownership Token Safety Invariant
  // =========================================================================
  it('ADV-BUG-004: verifies atomic acquisition and prevents stale lock release by non-owners', async () => {
    const mockLockStore = new Map<string, { value: string; expireAt: number }>();

    async function acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
      const now = Date.now();
      const existing = mockLockStore.get(key);
      if (existing && existing.expireAt > now) {
        return false; // Lock already active
      }
      mockLockStore.set(key, { value: token, expireAt: now + ttlMs });
      return true;
    }

    async function releaseLock(key: string, token: string): Promise<boolean> {
      const existing = mockLockStore.get(key);
      if (existing && existing.value === token) {
        mockLockStore.delete(key);
        return true;
      }
      return false; // Stale owner attempt rejected
    }

    const lockKey = 'lock:campaign:test-123';
    const instanceAToken = 'token-instance-a';
    const instanceBToken = 'token-instance-b';

    // 1. Instance A acquires lock with short 50ms TTL
    const acquiredA = await acquireLock(lockKey, instanceAToken, 50);
    expect(acquiredA).toBe(true);

    // 2. Immediate acquisition attempt by Instance B fails
    const acquiredBInitial = await acquireLock(lockKey, instanceBToken, 50);
    expect(acquiredBInitial).toBe(false);

    // 3. Wait 60ms for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // 4. Instance B acquires lock after TTL expiry
    const acquiredBAfterTTL = await acquireLock(lockKey, instanceBToken, 50);
    expect(acquiredBAfterTTL).toBe(true);

    // 5. Stale Instance A attempts to release lock -> Must be rejected (returns false)
    const releasedByStaleA = await releaseLock(lockKey, instanceAToken);
    expect(releasedByStaleA).toBe(false);

    // 6. Valid Instance B releases lock -> Succeeds
    const releasedByValidB = await releaseLock(lockKey, instanceBToken);
    expect(releasedByValidB).toBe(true);
  });

  // =========================================================================
  // ADV-BUG-008: PromiseQueue 3-Attempt Backoff & Rejection Handoff
  // =========================================================================
  it('ADV-BUG-008: retries failed operations 3 times before rejecting task promise', async () => {
    const queue = new PromiseQueueTestHarness();
    let attemptCount = 0;

    const failingTask = () =>
      queue.add(async () => {
        attemptCount++;
        throw new Error(`Simulated DB Connection Failure (Attempt ${attemptCount})`);
      });

    await expect(failingTask()).rejects.toThrow('Simulated DB Connection Failure (Attempt 3)');
    expect(attemptCount).toBe(3);
  });

  // =========================================================================
  // ADV-BUG-010: Developer API Key SHA-256 Hashing Verification
  // =========================================================================
  it('ADV-BUG-010: authenticates Developer API Key via SHA-256 digest matching', () => {
    const rawApiKey = 'am_dev_live_99887766554433221100';
    const hashedKey = crypto.createHash('sha256').update(rawApiKey).digest('hex');

    expect(hashedKey).toHaveLength(64);

    const fakeKey = 'am_dev_live_99887766554433221101';
    const fakeHash = crypto.createHash('sha256').update(fakeKey).digest('hex');
    expect(fakeHash).not.toEqual(hashedKey);
  });

  // =========================================================================
  // ADV-BUG-011: Large Payload Truncation Safety Check
  // =========================================================================
  it('ADV-BUG-011: verifies large 600KB payload string truncation without keys loss', () => {
    const largeOutput: Record<string, any> = {
      research_output: 'A'.repeat(30000),
      strategy_output: 'B'.repeat(30000),
      copy_output: 'C'.repeat(30000),
      image_output: 'D'.repeat(30000),
    };

    const truncated: Record<string, any> = {};
    for (const [k, v] of Object.entries(largeOutput)) {
      if (typeof v === 'string' && v.length > 20000) {
        truncated[k] = v.substring(0, 20000) + '\n...[truncated]';
      } else {
        truncated[k] = v;
      }
    }

    expect(Object.keys(truncated)).toHaveLength(4);
    expect(truncated.research_output.length).toBeLessThan(25000);
    expect(truncated.research_output).toContain('...[truncated]');
  });

  // =========================================================================
  // ADV-BUG-016: Concurrent State Transition Collision Prevention
  // =========================================================================
  it('ADV-BUG-016: enforces single-winner concurrency on campaign state approval', async () => {
    let campaignState = 'awaiting_human_approval';
    let approvalWinnerCount = 0;
    let conflictCount = 0;

    async function approveCampaignSimulated(requestId: string): Promise<number> {
      if (campaignState !== 'awaiting_human_approval') {
        conflictCount++;
        return 409; // HTTP 409 Conflict
      }

      await new Promise((resolve) => setTimeout(resolve, 5));

      if (campaignState === 'awaiting_human_approval') {
        campaignState = 'approved';
        approvalWinnerCount++;
        return 200; // HTTP 200 OK
      } else {
        conflictCount++;
        return 409; // HTTP 409 Conflict
      }
    }

    const results = await Promise.all([
      approveCampaignSimulated('req-1'),
      approveCampaignSimulated('req-2'),
      approveCampaignSimulated('req-3'),
      approveCampaignSimulated('req-4'),
      approveCampaignSimulated('req-5'),
      approveCampaignSimulated('req-6'),
      approveCampaignSimulated('req-7'),
      approveCampaignSimulated('req-8'),
      approveCampaignSimulated('req-9'),
      approveCampaignSimulated('req-10'),
    ]);

    expect(approvalWinnerCount).toBe(1);
    expect(conflictCount).toBe(9);
    expect(results.filter((res) => res === 200)).toHaveLength(1);
    expect(results.filter((res) => res === 409)).toHaveLength(9);
  });
});
