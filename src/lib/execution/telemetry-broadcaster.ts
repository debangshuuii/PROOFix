/**
 * Unified Execution Telemetry Broadcaster & SSE Streaming Hub
 * Manages Server-Sent Events (SSE) subscribers for verification runs,
 * broadcasting structured progress events, logs, step metrics, and findings in real time.
 */

export interface TelemetryStreamEvent {
  type: 'log' | 'status' | 'step' | 'finding' | 'ping' | 'complete';
  runId: string;
  timestamp: string;
  data: any;
}

export type TelemetryListener = (event: TelemetryStreamEvent) => void;

class ExecutionTelemetryHub {
  private listeners = new Map<string, Set<TelemetryListener>>();
  private keepAlives = new Map<string, NodeJS.Timeout>();

  /**
   * Subscribes a listener function (e.g. Next.js SSE Response writer) to run telemetry events.
   */
  public subscribe(runId: string, listener: TelemetryListener): () => void {
    if (!this.listeners.has(runId)) {
      this.listeners.set(runId, new Set());
      this.startKeepAlive(runId);
    }

    this.listeners.get(runId)!.add(listener);

    // Initial connection ping
    listener({
      type: 'ping',
      runId,
      timestamp: new Date().toISOString(),
      data: { connected: true },
    });

    return () => {
      const set = this.listeners.get(runId);
      if (set) {
        set.delete(listener);
        if (set.size === 0) {
          this.listeners.delete(runId);
          this.stopKeepAlive(runId);
        }
      }
    };
  }

  /**
   * Broadcasts a telemetry event to all active subscribers for the run.
   */
  public broadcast(runId: string, type: TelemetryStreamEvent['type'], data: any): void {
    const set = this.listeners.get(runId);
    if (!set || set.size === 0) return;

    const event: TelemetryStreamEvent = {
      type,
      runId,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const listener of set) {
      try {
        listener(event);
      } catch {}
    }
  }

  /**
   * Formats an SSE standard string chunk (data: {...}\n\n).
   */
  public formatSseChunk(event: TelemetryStreamEvent): string {
    return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  }

  private startKeepAlive(runId: string): void {
    const timer = setInterval(() => {
      this.broadcast(runId, 'ping', { keepAlive: true });
    }, 15000);
    timer.unref();
    this.keepAlives.set(runId, timer);
  }

  private stopKeepAlive(runId: string): void {
    const timer = this.keepAlives.get(runId);
    if (timer) {
      clearInterval(timer);
      this.keepAlives.delete(runId);
    }
  }
}

export const globalTelemetryBroadcaster = new ExecutionTelemetryHub();
