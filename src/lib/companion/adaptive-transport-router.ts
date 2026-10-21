/**
 * Adaptive Protocol Fallback Router (Contribution 236)
 *
 * Dynamically selects and automatically fails over between WebRTC DataChannel (<30ms),
 * full-duplex WebSocket (<60ms), and Server-Sent Events (SSE) based on network conditions.
 */

import type {
  TransportProtocol,
  TransportQualityMetrics,
} from '../types/live-transport.ts';

export class AdaptiveTransportRouter {
  private currentProtocol: TransportProtocol = 'webrtc';
  private connectionAttempts: number = 0;
  private qualityHistory: TransportQualityMetrics[] = [];

  constructor(initialProtocol: TransportProtocol = 'webrtc') {
    this.currentProtocol = initialProtocol;
  }

  /**
   * Evaluates if current transport quality has degraded and requires fallback.
   */
  public shouldDegrade(metrics: TransportQualityMetrics): boolean {
    // If WebRTC RTT exceeds 80ms or packet loss exceeds 5%, degrade to WebSocket
    if (metrics.protocol === 'webrtc') {
      return metrics.rttLatencyMs > 80 || metrics.packetLossRate > 0.05;
    }

    // If WebSocket RTT exceeds 200ms or disconnected, degrade to SSE
    if (metrics.protocol === 'websocket') {
      return metrics.rttLatencyMs > 200 || metrics.packetLossRate > 0.15;
    }

    return false;
  }

  /**
   * Selects next fallback protocol in order: WebRTC -> WebSocket -> SSE.
   */
  public getFallbackProtocol(current: TransportProtocol): TransportProtocol {
    if (current === 'webrtc') return 'websocket';
    if (current === 'websocket') return 'sse';
    return 'sse';
  }

  /**
   * Reports live telemetry metrics and triggers protocol failover if necessary.
   */
  public reportQualityMetrics(metrics: TransportQualityMetrics): {
    protocol: TransportProtocol;
    degraded: boolean;
  } {
    this.qualityHistory.push(metrics);

    if (this.shouldDegrade(metrics)) {
      const fallback = this.getFallbackProtocol(metrics.protocol);
      this.currentProtocol = fallback;
      return { protocol: fallback, degraded: true };
    }

    this.currentProtocol = metrics.protocol;
    return { protocol: metrics.protocol, degraded: false };
  }

  /**
   * Negotiates the best protocol based on preferred request and environment support.
   */
  public negotiateTransport(
    requested?: TransportProtocol,
    capabilities: { supportsWebRtc: boolean; supportsWebSocket: boolean } = {
      supportsWebRtc: true,
      supportsWebSocket: true,
    }
  ): TransportProtocol {
    this.connectionAttempts++;

    if (requested === 'webrtc' && capabilities.supportsWebRtc) {
      this.currentProtocol = 'webrtc';
      return 'webrtc';
    }

    if (requested === 'websocket' && capabilities.supportsWebSocket) {
      this.currentProtocol = 'websocket';
      return 'websocket';
    }

    if (capabilities.supportsWebRtc) {
      this.currentProtocol = 'webrtc';
      return 'webrtc';
    }

    if (capabilities.supportsWebSocket) {
      this.currentProtocol = 'websocket';
      return 'websocket';
    }

    this.currentProtocol = 'sse';
    return 'sse';
  }

  public getCurrentProtocol(): TransportProtocol {
    return this.currentProtocol;
  }

  public getQualityHistory(): TransportQualityMetrics[] {
    return [...this.qualityHistory];
  }

  public reset(): void {
    this.currentProtocol = 'webrtc';
    this.connectionAttempts = 0;
    this.qualityHistory = [];
  }
}

export const globalAdaptiveTransportRouter = new AdaptiveTransportRouter();
