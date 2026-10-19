import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { VideoRecordingConfig, VideoResolution } from '../types/video.ts';
import { validateVideoConfig } from './recording-config.ts';

export interface RecordedContextResult {
  context: BrowserContext;
  videoDir: string;
  isRecording: boolean;
  tempVideoId: string;
}

export interface SetupRecordingOptions {
  runId: string;
  testId?: string;
  artifactsDir?: string;
  viewport?: { width: number; height: number };
}

/**
 * Creates and configures a Playwright browser context with video recording
 * enabled or disabled according to the provided VideoRecordingConfig.
 */
export async function createRecordedBrowserContext(
  browser: Browser,
  config: VideoRecordingConfig,
  options: SetupRecordingOptions
): Promise<RecordedContextResult> {
  const { runId, testId = 'default', artifactsDir } = options;
  const tempVideoId = `vid_${runId}_${testId}_${Date.now()}`;

  // If recording is disabled or mode is 'off', create standard context
  if (!config.enabled || config.mode === 'off') {
    const context = await browser.newContext({
      viewport: options.viewport || { width: 1280, height: 720 },
      ignoreHTTPSErrors: true,
    });
    return {
      context,
      videoDir: '',
      isRecording: false,
      tempVideoId,
    };
  }

  // Determine video directory
  const baseDir = artifactsDir || path.join(process.cwd(), 'public', 'artifacts', 'runs', runId);
  const videoDir = path.join(baseDir, 'videos', 'raw', tempVideoId);

  if (!fs.existsSync(videoDir)) {
    fs.mkdirSync(videoDir, { recursive: true });
  }

  const context = await browser.newContext({
    viewport: options.viewport || { width: config.resolution.width, height: config.resolution.height },
    ignoreHTTPSErrors: true,
    recordVideo: {
      dir: videoDir,
      size: {
        width: config.resolution.width,
        height: config.resolution.height,
      },
    },
  });

  return {
    context,
    videoDir,
    isRecording: true,
    tempVideoId,
  };
}

export interface SessionRecordingResult {
  videoPath: string;
  sizeBytes: number;
  durationMs: number;
  resolution: VideoResolution;
  isPlayable: boolean;
}

/**
 * Integration helper that executes a real browser session and captures a playable video recording.
 */
export async function recordBrowserSession(options: {
  url?: string;
  html?: string;
  config?: Partial<VideoRecordingConfig>;
  runId?: string;
  testId?: string;
  actions?: (page: Page) => Promise<void>;
}): Promise<SessionRecordingResult> {
  const runId = options.runId || `run_session_${Date.now()}`;
  const testId = options.testId || 'rec_test';
  const config = validateVideoConfig({
    mode: 'all',
    ...options.config,
    enabled: true,
  });

  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: true,
    });
  }

  const startMs = Date.now();
  const { context, videoDir } = await createRecordedBrowserContext(browser, config, {
    runId,
    testId,
  });

  const page = await context.newPage();

  try {
    if (options.html) {
      await page.setContent(options.html, { waitUntil: 'load' });
    } else if (options.url) {
      await page.goto(options.url, { timeout: 15000, waitUntil: 'load' });
    } else {
      await page.setContent('<html><body style="background:#0f172a;color:#fff;"><h1>PROOFix Session</h1></body></html>');
    }

    // Small interaction to ensure visual frames are generated
    await page.evaluate(() => {
      document.body.style.backgroundColor = '#1e293b';
    });

    if (options.actions) {
      await options.actions(page);
    }

    // Allow frames to flush
    await page.waitForTimeout(300);
  } finally {
    // Crucial Playwright step: closing context flushes and finalizes the video file!
    await page.close();
    await context.close();
  }

  const durationMs = Date.now() - startMs;
  await browser.close();

  // Find the generated video file in videoDir
  const files = fs.existsSync(videoDir) ? fs.readdirSync(videoDir) : [];
  const videoFile = files.find((f) => f.endsWith('.webm'));

  if (!videoFile) {
    throw new Error(`Video file was not generated in directory: ${videoDir}`);
  }

  const fullPath = path.join(videoDir, videoFile);
  const stats = fs.statSync(fullPath);

  return {
    videoPath: fullPath,
    sizeBytes: stats.size,
    durationMs,
    resolution: config.resolution,
    isPlayable: stats.size > 0 && fullPath.endsWith('.webm'),
  };
}
