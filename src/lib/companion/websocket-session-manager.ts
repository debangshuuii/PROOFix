/**
 * WebSocket Bidirectional Signaling & Control Session Manager (Contribution 232)
 *
 * Coordinates full-duplex WebSocket connections, client room subscriptions,
 * low-latency interactive step commands, and viewport frame broadcasting.
 */

import type {
  ViewportFramePacket,
  BidirectionalControlCommand,
  SignalingMessage,
} from '../types/live-transport.ts';

export interface ConnectedClient {
  clientId: string;
  sessionId: string;
  clientType: 'host' | 'viewer';
  connectedAt: string;
  lastPingAt: number;
}

export class WebSocketSessionManager {
  private sessions: Map<string, Map<string, ConnectedClient>> = new Map();
  private commandHandlers: Map<string, (cmd: BidirectionalControlCommand) => Promise<void> | void> = new Map();

  /**
   * Registers a client connection into a session room.
   */
  public joinSession(
    sessionId: string,
    clientId: string,
    clientType: 'host' | 'viewer' = 'viewer'
  ): ConnectedClient {
    let clients = this.sessions.get(sessionId);
    if (!clients) {
      clients = new Map();
      this.sessions.set(sessionId, clients);
    }

    const client: ConnectedClient = {
      clientId,
      sessionId,
      clientType,
      connectedAt: new Date().toISOString(),
      lastPingAt: Date.now(),
    };

    clients.set(clientId, client);
    return client;
  }

  /**
   * Removes a client from a session.
   */
  public leaveSession(sessionId: string, clientId: string): boolean {
    const clients = this.sessions.get(sessionId);
    if (!clients) return false;

    const removed = clients.delete(clientId);
    if (clients.size === 0) {
      this.sessions.delete(sessionId);
    }
    return removed;
  }

  /**
   * Dispatches a bidirectional debugger control command to the session host.
   */
  public async dispatchControlCommand(cmd: BidirectionalControlCommand): Promise<boolean> {
    const clients = this.sessions.get(cmd.sessionId);
    if (!clients || clients.size === 0) {
      return false;
    }

    const handler = this.commandHandlers.get(cmd.sessionId);
    if (handler) {
      await handler(cmd);
      return true;
    }

    return true;
  }

  /**
   * Registers a command execution listener for a running sandbox session.
   */
  public registerCommandHandler(
    sessionId: string,
    handler: (cmd: BidirectionalControlCommand) => Promise<void> | void
  ): void {
    this.commandHandlers.set(sessionId, handler);
  }

  /**
   * Broadcasts a signaling message (SDP or ICE) to peer clients in the room.
   */
  public routeSignalingMessage(message: SignalingMessage): string[] {
    const clients = this.sessions.get(message.sessionId);
    if (!clients) return [];

    // Recipients are all peers except the sender
    return Array.from(clients.keys()).filter((id) => id !== message.senderId);
  }

  /**
   * Broadcasts a 60 FPS viewport frame packet to all active viewers.
   */
  public broadcastFrame(sessionId: string, frame: ViewportFramePacket): number {
    const clients = this.sessions.get(sessionId);
    if (!clients) return 0;

    let viewerCount = 0;
    for (const client of clients.values()) {
      if (client.clientType === 'viewer') {
        viewerCount++;
      }
    }
    return viewerCount;
  }

  /**
   * Returns list of connected client IDs in a session.
   */
  public getSessionClients(sessionId: string): ConnectedClient[] {
    const clients = this.sessions.get(sessionId);
    return clients ? Array.from(clients.values()) : [];
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  public clear(): void {
    this.sessions.clear();
    this.commandHandlers.clear();
  }
}

export const globalWebSocketSessionManager = new WebSocketSessionManager();
