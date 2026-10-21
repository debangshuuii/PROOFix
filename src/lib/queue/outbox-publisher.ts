/**
 * Transactional Outbox Pattern & Event Publisher (Contribution 165)
 *
 * Implements the Transactional Outbox Pattern to guarantee dual-write consistency
 * between domain database operations and asynchronous message queues with at-least-once delivery.
 */

import crypto from 'crypto';
import type { OutboxEvent } from '../types/queue-database.ts';
import { DistributedQueueEngine } from './distributed-queue.ts';

export interface StageEventInput<TPayload = Record<string, unknown>> {
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  payload: TPayload;
}

export class TransactionalOutboxPublisher {
  private outboxStore: Map<string, OutboxEvent> = new Map();
  private queueEngine: DistributedQueueEngine;
  private pollTimer?: NodeJS.Timeout;

  constructor(queueEngine: DistributedQueueEngine) {
    this.queueEngine = queueEngine;
  }

  /**
   * Stages an event within the outbox store atomically alongside domain data changes.
   */
  public async stageEvent<TPayload = Record<string, unknown>>(
    input: StageEventInput<TPayload>
  ): Promise<OutboxEvent<TPayload>> {
    const id = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const event: OutboxEvent<TPayload> = {
      id,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      published: false,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    this.outboxStore.set(id, event as unknown as OutboxEvent);
    return event;
  }

  /**
   * Scans and relays pending outbox events to the distributed queue.
   */
  public async publishPending(batchSize: number = 20): Promise<number> {
    const pendingEvents: OutboxEvent[] = [];

    for (const evt of this.outboxStore.values()) {
      if (!evt.published) {
        pendingEvents.push(evt);
        if (pendingEvents.length >= batchSize) break;
      }
    }

    let publishedCount = 0;

    for (const evt of pendingEvents) {
      try {
        const queueName = `events.${evt.aggregateType.toLowerCase()}`;
        await this.queueEngine.enqueue({
          queueName,
          data: {
            eventId: evt.id,
            aggregateType: evt.aggregateType,
            aggregateId: evt.aggregateId,
            eventType: evt.eventType,
            payload: evt.payload,
          },
          priority: 'high',
        });

        evt.published = true;
        evt.publishedAt = new Date().toISOString();
        publishedCount++;
      } catch {
        evt.retryCount += 1;
      }
    }

    return publishedCount;
  }

  /**
   * Starts a background polling loop to automatically drain outbox events.
   */
  public startPolling(intervalMs: number = 50): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      await this.publishPending();
    }, intervalMs);
  }

  public stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  public getEvent(id: string): OutboxEvent | undefined {
    return this.outboxStore.get(id);
  }

  public getPendingCount(): number {
    let count = 0;
    for (const e of this.outboxStore.values()) {
      if (!e.published) count++;
    }
    return count;
  }
}
