import fs from 'fs';
import path from 'path';
import type { BrowserContext, Page } from 'playwright';
import type { VideoProcessingStatus } from '../types/video.ts';

export interface VideoSessionHandle {
  id: string;
  runId: string;
  testId?: string;
  status: VideoProcessingStatus;
  tempDir: string;
  rawVideoPath?: string;
  finalVideoPath?: string;
  sizeBytes?: number;
  durationMs?: number;
  error?: string;
  startedAt: number;
  finalizedAt?: number;
  page?: Page;
  context?: BrowserContext;
}

export interface FinalizeOptions {
  destinationPath: string;
  minSizeBytes?: number;
  timeoutMs?: number;
}

export class VideoLifecycleManager {
  private sessions: Map<string, VideoSessionHandle> = new Map();

  /**
   * Registers a new recording session in 'initializing' or 'recording' state.
   */
  startSession(
    sessionId: string,
    options: {
      runId: string;
      testId?: string;
      tempDir: string;
      page?: Page;
      context?: BrowserContext;
    }
  ): VideoSessionHandle {
    const session: VideoSessionHandle = {
      id: sessionId,
      runId: options.runId,
      testId: options.testId,
      status: 'recording',
      tempDir: options.tempDir,
      page: options.page,
      context: options.context,
      startedAt: Date.now(),
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): VideoSessionHandle | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Checks whether a video is strictly finalized, verified, and ready for playback.
   * "Done when: videos are not marked ready before they have been finalized and verified."
   */
  isReady(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;
    if (session.status !== 'ready') return false;
    if (!session.finalVideoPath) return false;

    // Verify on disk
    try {
      if (!fs.existsSync(session.finalVideoPath)) return false;
      const stats = fs.statSync(session.finalVideoPath);
      return stats.size > 0;
    } catch {
      return false;
    }
  }

  /**
   * Transitions session to 'finalizing' state while context is closed and buffer is flushed.
   */
  markFinalizing(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'finalizing';
    }
  }

  /**
   * Finalizes recording:
   * 1. Closes page and context to flush video stream to disk.
   * 2. Locates generated video file.
   * 3. Verifies file integrity (non-empty, exceeds minimum size).
   * 4. Copies/moves to final destination path.
   * 5. Marks status as 'ready' only after verification succeeds.
   */
  async finalizeSession(sessionId: string, options: FinalizeOptions): Promise<VideoSessionHandle> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Video recording session "${sessionId}" not found.`);
    }

    // Step 1: Transition to finalizing (cannot be ready during this transition)
    session.status = 'finalizing';

    const minSizeBytes = options.minSizeBytes || 500;
    const destDir = path.dirname(options.destinationPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    try {
      // Step 2: Ensure Playwright context and page are cleanly closed
      if (session.page && !session.page.isClosed()) {
        try {
          await session.page.close();
        } catch {}
      }

      if (session.context) {
        try {
          await session.context.close();
        } catch {}
      }

      // Step 3: Find generated video file in temporary directory
      const rawDir = session.tempDir;
      let rawFilePath: string | null = null;

      // Allow brief wait for file system flush
      const deadline = Date.now() + (options.timeoutMs || 5000);
      while (Date.now() < deadline) {
        if (fs.existsSync(rawDir)) {
          const entries = fs.readdirSync(rawDir);
          const found = entries.find((e) => e.endsWith('.webm'));
          if (found) {
            rawFilePath = path.join(rawDir, found);
            break;
          }
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      if (!rawFilePath || !fs.existsSync(rawFilePath)) {
        throw new Error(`No video recording file was flushed to disk in ${rawDir}`);
      }

      session.rawVideoPath = rawFilePath;
      const stats = fs.statSync(rawFilePath);

      // Step 4: Verify non-empty and minimum size
      if (stats.size < minSizeBytes) {
        throw new Error(
          `Video file size (${stats.size} bytes) is below minimum threshold (${minSizeBytes} bytes). Stream may be corrupt.`
        );
      }

      // Step 5: Transfer to destination path
      fs.copyFileSync(rawFilePath, options.destinationPath);

      // Verify destination copy
      const destStats = fs.statSync(options.destinationPath);
      if (destStats.size === 0) {
        throw new Error(`Finalized destination video file is empty: ${options.destinationPath}`);
      }

      // Step 6: Mark ready and record metrics
      session.finalVideoPath = options.destinationPath;
      session.sizeBytes = destStats.size;
      session.durationMs = Date.now() - session.startedAt;
      session.finalizedAt = Date.now();
      session.status = 'ready';

      // Clean up raw temp file
      try {
        if (fs.existsSync(rawFilePath)) {
          fs.unlinkSync(rawFilePath);
        }
        if (fs.existsSync(rawDir) && fs.readdirSync(rawDir).length === 0) {
          fs.rmdirSync(rawDir);
        }
      } catch {}

      return session;
    } catch (err: any) {
      session.status = 'failed';
      session.error = err.message || String(err);
      this.cleanupSessionFiles(session);
      throw err;
    }
  }

  /**
   * Discards a session recording (e.g. if test passed and policy is 'only-on-failure').
   */
  async discardSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'discarded';

    if (session.page && !session.page.isClosed()) {
      try {
        await session.page.close();
      } catch {}
    }

    if (session.context) {
      try {
        await session.context.close();
      } catch {}
    }

    this.cleanupSessionFiles(session);
  }

  /**
   * Safely handles error during execution, marks session 'failed', and cleans up.
   */
  async handleError(sessionId: string, err: Error | string): Promise<VideoSessionHandle> {
    const session = this.sessions.get(sessionId);
    const errorMsg = err instanceof Error ? err.message : String(err);

    if (session) {
      session.status = 'failed';
      session.error = errorMsg;

      if (session.page && !session.page.isClosed()) {
        try {
          await session.page.close();
        } catch {}
      }

      if (session.context) {
        try {
          await session.context.close();
        } catch {}
      }

      this.cleanupSessionFiles(session);
      return session;
    }

    const fallback: VideoSessionHandle = {
      id: sessionId,
      runId: 'unknown',
      status: 'failed',
      tempDir: '',
      error: errorMsg,
      startedAt: Date.now(),
    };
    this.sessions.set(sessionId, fallback);
    return fallback;
  }

  private cleanupSessionFiles(session: VideoSessionHandle): void {
    try {
      if (session.rawVideoPath && fs.existsSync(session.rawVideoPath)) {
        fs.unlinkSync(session.rawVideoPath);
      }
      if (session.tempDir && fs.existsSync(session.tempDir)) {
        fs.rmSync(session.tempDir, { recursive: true, force: true });
      }
    } catch {}
  }
}

export const videoLifecycleManager = new VideoLifecycleManager();
