import type {
  CompanionTelemetryEvent,
  CompanionTelemetryEventType,
} from '../types/live-companion.ts';

export type TelemetryListener = (sseFormattedChunk: string) => void;

export interface TelemetryBroadcasterOptions {
  historyBufferLimit?: number;
  heartbeatIntervalMs?: number;
}

export class TelemetryBroadcaster {
  private channels: Map<string, Set<TelemetryListener>> = new Map();
  private eventHistory: Map<string, CompanionTelemetryEvent[]> = new Map();
  private historyLimit: number;
  private heartbeatIntervalMs: number;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(options: TelemetryBroadcasterOptions = {}) {
    this.historyLimit = options.historyBufferLimit ?? 100;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 15000;
  }

  /**
   * Formats a telemetry event into Server-Sent Events (SSE) protocol text.
   */
  public static formatSseEvent(event: CompanionTelemetryEvent): string {
    const jsonStr = JSON.stringify(event);
    return `id: ${event.id}\nevent: ${event.type}\ndata: ${jsonStr}\n\n`;
  }

  /**
   * Subscribes a listener to a specific run's telemetry stream.
   * Immediately replays recent event history if replayHistory is true.
   */
  public subscribe(
    runId: string,
    listener: TelemetryListener,
    replayHistory: boolean = true
  ): () => void {
    if (!this.channels.has(runId)) {
      this.channels.set(runId, new Set());
    }
    const subscribers = this.channels.get(runId)!;
    subscribers.add(listener);

    // Replay recent history to new subscriber
    if (replayHistory && this.eventHistory.has(runId)) {
      const history = this.eventHistory.get(runId)!;
      for (const event of history) {
        try {
          listener(TelemetryBroadcaster.formatSseEvent(event));
        } catch {
          // Subscriber might have disconnected early
        }
      }
    }

    // Return unsubscribe function
    return () => {
      subscribers.delete(listener);
      if (subscribers.size === 0) {
        this.channels.delete(runId);
      }
    };
  }

  /**
   * Broadcasts a telemetry event to all subscribers of the specified run.
   */
  public broadcast(
    runId: string,
    type: CompanionTelemetryEventType,
    payload: Record<string, any>
  ): CompanionTelemetryEvent {
    const event: CompanionTelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      runId,
      type,
      timestamp: new Date().toISOString(),
      payload,
    };

    // Store in ring buffer history
    if (!this.eventHistory.has(runId)) {
      this.eventHistory.set(runId, []);
    }
    const history = this.eventHistory.get(runId)!;
    history.push(event);
    if (history.length > this.historyLimit) {
      history.shift();
    }

    // Broadcast to active channel listeners
    const subscribers = this.channels.get(runId);
    if (subscribers && subscribers.size > 0) {
      const sseText = TelemetryBroadcaster.formatSseEvent(event);
      for (const listener of subscribers) {
        try {
          listener(sseText);
        } catch {
          // If listener fails, subscriber is removed during unsubscribe
        }
      }
    }

    return event;
  }

  /**
   * Gets number of active subscribers for a run.
   */
  public getSubscriberCount(runId: string): number {
    return this.channels.get(runId)?.size || 0;
  }

  /**
   * Retrieves buffered events for a run.
   */
  public getEventHistory(runId: string): CompanionTelemetryEvent[] {
    return [...(this.eventHistory.get(runId) || [])];
  }

  /**
   * Cleans up all resources and history for a finished run.
   */
  public clearRun(runId: string): void {
    this.channels.delete(runId);
    this.eventHistory.delete(runId);
  }
}

// Global shared singleton broadcaster instance
export const globalTelemetryBroadcaster = new TelemetryBroadcaster();
