import crypto from 'crypto';
import type { ViewportFramePayload } from '../types/live-companion.ts';
import { globalTelemetryBroadcaster, TelemetryBroadcaster } from './telemetry-broadcaster.ts';

export interface FrameStreamerOptions {
  targetFps?: number; // Default 12 FPS
  keyframeInterval?: number; // Every N frames force a keyframe
  quality?: number; // 0.1 to 1.0
  broadcaster?: TelemetryBroadcaster;
}

export interface FrameStreamerStats {
  totalFramesIngested: number;
  framesBroadcasted: number;
  duplicateFramesDropped: number;
  fpsThrottledFramesDropped: number;
  bytesTransferred: number;
}

export class FrameStreamer {
  private targetFps: number;
  private minFrameIntervalMs: number;
  private keyframeInterval: number;
  private broadcaster: TelemetryBroadcaster;

  private frameIndexByRun: Map<string, number> = new Map();
  private lastFrameTimeByRun: Map<string, number> = new Map();
  private lastFrameHashByRun: Map<string, string> = new Map();

  private stats: FrameStreamerStats = {
    totalFramesIngested: 0,
    framesBroadcasted: 0,
    duplicateFramesDropped: 0,
    fpsThrottledFramesDropped: 0,
    bytesTransferred: 0,
  };

  constructor(options: FrameStreamerOptions = {}) {
    this.targetFps = options.targetFps ?? 12;
    this.minFrameIntervalMs = Math.round(1000 / this.targetFps);
    this.keyframeInterval = options.keyframeInterval ?? 15;
    this.broadcaster = options.broadcaster || globalTelemetryBroadcaster;
  }

  public setFps(fps: number): void {
    this.targetFps = Math.max(1, Math.min(30, fps));
    this.minFrameIntervalMs = Math.round(1000 / this.targetFps);
  }

  public getStats(): FrameStreamerStats {
    return { ...this.stats };
  }

  /**
   * Ingests a new browser screencast frame buffer and conditionally broadcasts it.
   */
  public pushFrame(
    runId: string,
    imageBuffer: Buffer,
    dimensions: { width: number; height: number },
    mimeType: string = 'image/jpeg'
  ): ViewportFramePayload | null {
    this.stats.totalFramesIngested++;
    const now = Date.now();
    const lastTime = this.lastFrameTimeByRun.get(runId) || 0;

    // 1. FPS Throttling: drop if received faster than minFrameInterval
    if (now - lastTime < this.minFrameIntervalMs) {
      this.stats.fpsThrottledFramesDropped++;
      return null;
    }

    // 2. Duplicate Detection via MD5 hash of buffer
    const hash = crypto.createHash('md5').update(imageBuffer).digest('hex');
    const lastHash = this.lastFrameHashByRun.get(runId);
    const currentIndex = (this.frameIndexByRun.get(runId) || 0) + 1;
    const isKeyframe = currentIndex % this.keyframeInterval === 1;

    // If frame is identical to previous and not a keyframe interval, skip broadcast
    if (lastHash === hash && !isKeyframe) {
      this.stats.duplicateFramesDropped++;
      return null;
    }

    // 3. Encode to Base64 Data URL
    const base64 = imageBuffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    const payload: ViewportFramePayload = {
      frameIndex: currentIndex,
      dataUrl,
      width: dimensions.width,
      height: dimensions.height,
      timestamp: new Date().toISOString(),
      isKeyframe,
    };

    // Update state
    this.frameIndexByRun.set(runId, currentIndex);
    this.lastFrameTimeByRun.set(runId, now);
    this.lastFrameHashByRun.set(runId, hash);

    this.stats.framesBroadcasted++;
    this.stats.bytesTransferred += imageBuffer.length;

    // Broadcast frame event
    this.broadcaster.broadcast(runId, 'viewport_frame', payload);

    return payload;
  }

  /**
   * Cleans up tracking data for completed run.
   */
  public clearRun(runId: string): void {
    this.frameIndexByRun.delete(runId);
    this.lastFrameTimeByRun.delete(runId);
    this.lastFrameHashByRun.delete(runId);
  }
}

export const globalFrameStreamer = new FrameStreamer();
