import crypto from 'crypto';
import type {
  NotificationChannelType,
  NotificationEventPayload,
} from '../types/notification.ts';

export interface NotificationDeliveryRecord {
  id: string;
  deduplicationKey: string;
  eventId: string;
  projectId: string;
  channelId: string;
  channelType: NotificationChannelType;
  status: 'delivered' | 'failed' | 'skipped_duplicate';
  attemptsCount: number;
  deliveredAt?: string;
  lastAttemptAt: string;
  error?: string;
}

// In-memory sliding delivery attempt store with bounded retention (max 2000 entries)
const deliveryLog: Map<string, NotificationDeliveryRecord> = new Map();
const MAX_LOG_ENTRIES = 2000;
const DEFAULT_DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Computes a deterministic deduplication key for an event and channel pair.
 */
export function computeDeduplicationKey(
  event: NotificationEventPayload,
  channelId: string
): string {
  const parts = [
    event.projectId,
    event.runId || '',
    event.eventType,
    event.commitHash || '',
    channelId,
  ].join('::');

  return crypto.createHash('sha256').update(parts).digest('hex').slice(0, 32);
}

/**
 * Checks whether an event has already been successfully delivered to the specified channel within the deduplication window.
 * "Done when: repeated event processing does not produce unintended duplicate notifications."
 */
export function checkIsDuplicate(
  deduplicationKey: string,
  windowMs: number = DEFAULT_DEDUP_WINDOW_MS
): { isDuplicate: boolean; previousRecord?: NotificationDeliveryRecord } {
  const existing = deliveryLog.get(deduplicationKey);
  if (!existing) {
    return { isDuplicate: false };
  }

  // Only successful deliveries or recent in-flight records qualify for deduplication
  if (existing.status !== 'delivered') {
    return { isDuplicate: false };
  }

  const recordTime = new Date(existing.deliveredAt || existing.lastAttemptAt).getTime();
  const ageMs = Date.now() - recordTime;

  if (ageMs > windowMs) {
    // Expired from deduplication window
    deliveryLog.delete(deduplicationKey);
    return { isDuplicate: false };
  }

  return { isDuplicate: true, previousRecord: existing };
}

/**
 * Records a delivery attempt in the tracking store and prunes oldest entries if capacity exceeded.
 */
export function recordDeliveryAttempt(record: NotificationDeliveryRecord): void {
  // Prune oldest if at capacity
  if (deliveryLog.size >= MAX_LOG_ENTRIES) {
    const oldestKey = deliveryLog.keys().next().value;
    if (oldestKey) deliveryLog.delete(oldestKey);
  }

  deliveryLog.set(record.deduplicationKey, record);
}

/**
 * Retrieves delivery records for a project or event.
 */
export function getDeliveryRecords(projectId?: string, eventId?: string): NotificationDeliveryRecord[] {
  const records = Array.from(deliveryLog.values());
  return records.filter((r) => {
    if (projectId && r.projectId !== projectId) return false;
    if (eventId && r.eventId !== eventId) return false;
    return true;
  });
}

/**
 * Clears the deduplication store (primarily for test execution isolation).
 */
export function resetDeduplicationStore(): void {
  deliveryLog.clear();
}
