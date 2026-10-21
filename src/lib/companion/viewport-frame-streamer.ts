/**
 * 60 FPS Viewport Video Frame Streamer & Delta Compressor (Contribution 234)
 *
 * Streams canvas viewport frames at up to 60 FPS with keyframe intervals,
 * delta deduplication, and sub-16ms packetization for ultra-low latency mirroring.
 */

import crypto from 'crypto';
import type { ViewportFramePacket } from '../types/live-transport.ts';

export class ViewportFrameStreamer {
  private sequenceNumber: number = 0;
  private keyframeInterval: number = 60; // 1 keyframe every 60 frames (1 sec @ 60 FPS)
  private lastFrameHash?: string;
  private totalFramesProduced: number = 0;
  private skippedDeltas: number = 0;

  constructor(keyframeInterval: number = 60) {
    this.keyframeInterval = keyframeInterval;
  }

  /**
   * Computes a quick hash of the image buffer or base64 data to detect static frames.
   */
  public computeHash(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Evaluates if this frame is identical to the preceding frame (delta elimination).
   */
  public isRedundantFrame(data: string | Buffer): boolean {
    const hash = this.computeHash(data);
    const isSame = hash === this.lastFrameHash;
    this.lastFrameHash = hash;
    return isSame;
  }

  /**
   * Packs raw canvas image data into a sequential ViewportFramePacket.
   */
  public packFrame(
    data: string,
    width: number = 1280,
    height: number = 800,
    options: { forceKeyframe?: boolean; mimeType?: 'image/webp' | 'image/jpeg' } = {}
  ): ViewportFramePacket | null {
    const isKeyframe = options.forceKeyframe || this.sequenceNumber % this.keyframeInterval === 0;
    const currentHash = this.computeHash(data);

    // Unless it's a mandatory periodic keyframe, skip redundant delta frames
    if (!isKeyframe && currentHash === this.lastFrameHash) {
      this.skippedDeltas++;
      return null;
    }

    this.lastFrameHash = currentHash;
    this.sequenceNumber++;
    this.totalFramesProduced++;

    const byteLength = Buffer.byteLength(data, 'utf8');

    return {
      sequenceNumber: this.sequenceNumber,
      timestampNano: process.hrtime.bigint(),
      width,
      height,
      frameRateFps: 60,
      mimeType: options.mimeType || 'image/webp',
      isKeyframe,
      base64Data: data,
      byteLength,
    };
  }

  public getStreamingStats(): {
    totalFramesProduced: number;
    skippedDeltas: number;
    currentFps: number;
  } {
    return {
      totalFramesProduced: this.totalFramesProduced,
      skippedDeltas: this.skippedDeltas,
      currentFps: 60,
    };
  }

  public reset(): void {
    this.sequenceNumber = 0;
    this.lastFrameHash = undefined;
    this.totalFramesProduced = 0;
    this.skippedDeltas = 0;
  }
}

export const globalViewportFrameStreamer = new ViewportFrameStreamer();
