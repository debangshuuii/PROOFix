export interface McpTelemetryEvent {
  type: 'run_started' | 'step_completed' | 'proof_certified' | 'error';
  timestamp: string;
  data: Record<string, any>;
}

export class McpTelemetryBroadcaster {
  private listeners: Array<(event: McpTelemetryEvent) => void> = [];

  public subscribe(cb: (event: McpTelemetryEvent) => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public broadcast(type: McpTelemetryEvent['type'], data: Record<string, any>): void {
    const event: McpTelemetryEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in telemetry listener:', err);
      }
    }
  }
}

export const globalMcpTelemetry = new McpTelemetryBroadcaster();
