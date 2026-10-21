/**
 * Distributed Locks with Auto-Renewing Leases & Fencing Tokens (Contribution 166)
 *
 * Implements distributed mutual exclusion with:
 * - Monotonically increasing fencing tokens (Martin Kleppmann fencing pattern)
 * - Auto-renewing heartbeat leases to prevent premature timeouts during long critical sections
 * - Safe release verification (owner token validation)
 * - Automatic resource cleanup wrapper (`withLock`)
 */

import crypto from 'crypto';
import type { DistributedLockLease, DistributedLockOptions } from '../types/queue-database.ts';

interface InternalLockEntry {
  lockKey: string;
  ownerToken: string;
  expiresAt: number;
  fencingToken: number;
  renewalTimer?: NodeJS.Timeout;
}

export class DistributedLockManager {
  private locks: Map<string, InternalLockEntry> = new Map();
  private globalFencingCounter: number = 1000;

  /**
   * Attempts to acquire a distributed lock with optional retries.
   */
  public async acquire(
    lockKey: string,
    options: DistributedLockOptions = { ttlMs: 10000 }
  ): Promise<DistributedLockLease | null> {
    const { ttlMs, retryIntervalMs = 50, maxRetries = 0 } = options;
    const ownerToken = `owner_${crypto.randomBytes(8).toString('hex')}`;

    let attempts = 0;
    while (attempts <= maxRetries) {
      const now = Date.now();
      const existing = this.locks.get(lockKey);

      // Lock is free or previous lease expired
      if (!existing || existing.expiresAt <= now) {
        if (existing?.renewalTimer) {
          clearInterval(existing.renewalTimer);
        }

        this.globalFencingCounter += 1;
        const fencingToken = this.globalFencingCounter;
        const expiresAt = now + ttlMs;

        const entry: InternalLockEntry = {
          lockKey,
          ownerToken,
          expiresAt,
          fencingToken,
        };

        // Start auto-renewal heartbeat at 1/3 TTL
        const renewInterval = Math.max(100, Math.floor(ttlMs / 3));
        entry.renewalTimer = setInterval(() => {
          const current = this.locks.get(lockKey);
          if (current && current.ownerToken === ownerToken) {
            current.expiresAt = Date.now() + ttlMs;
          }
        }, renewInterval);

        this.locks.set(lockKey, entry);

        return {
          lockKey,
          ownerToken,
          expiresAt,
          fencingToken,
          released: false,
        };
      }

      attempts += 1;
      if (attempts <= maxRetries) {
        await new Promise((r) => setTimeout(r, retryIntervalMs));
      }
    }

    return null;
  }

  /**
   * Releases an acquired lock safely verifying owner token match.
   */
  public async release(lease: DistributedLockLease): Promise<boolean> {
    if (lease.released) return true;

    const entry = this.locks.get(lease.lockKey);
    if (!entry) {
      lease.released = true;
      return true;
    }

    // Only owner can release
    if (entry.ownerToken !== lease.ownerToken) {
      return false; // Attempted to release someone else's lock
    }

    if (entry.renewalTimer) {
      clearInterval(entry.renewalTimer);
    }

    this.locks.delete(lease.lockKey);
    lease.released = true;
    return true;
  }

  /**
   * Helper utility executing a callback inside an automatically managed lock scope.
   */
  public async withLock<T>(
    lockKey: string,
    options: DistributedLockOptions,
    callback: (lease: DistributedLockLease) => Promise<T>
  ): Promise<T> {
    const lease = await this.acquire(lockKey, options);
    if (!lease) {
      throw new Error(`Failed to acquire distributed lock for key: ${lockKey}`);
    }

    try {
      return await callback(lease);
    } finally {
      await this.release(lease);
    }
  }

  public isLocked(lockKey: string): boolean {
    const entry = this.locks.get(lockKey);
    if (!entry) return false;
    return entry.expiresAt > Date.now();
  }

  public getCurrentFencingToken(lockKey: string): number | undefined {
    const entry = this.locks.get(lockKey);
    return entry?.fencingToken;
  }
}
