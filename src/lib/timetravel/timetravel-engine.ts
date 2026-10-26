/**
 * Time-Travel Execution Scrubber Engine
 * Synchronizes millisecond-by-millisecond scrubber offsets with:
 * - DOM Snapshots
 * - Network Waterfall requests
 * - Filtered Console Logs
 * - Active UI Step & Click coordinates
 */

export interface TimeTravelFrame {
  offsetMs: number;
  stepId: string;
  stepTitle: string;
  status: 'passed' | 'failed' | 'running';
  domSnapshot: string;
  activeSelector?: string;
  clickCoordinates?: { x: number; y: number };
  screenshotUrl?: string;
  networkRequests: Array<{
    id: string;
    url: string;
    method: string;
    status: number;
    durationMs: number;
    timestampMs: number;
  }>;
  consoleLogs: Array<{
    timestampMs: number;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
  }>;
}

export interface TimeTravelTimeline {
  totalDurationMs: number;
  frames: TimeTravelFrame[];
}

export class TimeTravelEngine {
  private timeline: TimeTravelTimeline;

  constructor(customTimeline?: TimeTravelTimeline) {
    this.timeline = customTimeline || this.createDefaultTimeline();
  }

  /**
   * Evaluates the full execution state at any given millisecond offset.
   */
  public getStateAtOffset(offsetMs: number): {
    currentFrame: TimeTravelFrame;
    activeLogs: TimeTravelFrame['consoleLogs'];
    activeNetwork: TimeTravelFrame['networkRequests'];
    progress: number;
  } {
    const clampedOffset = Math.max(
      0,
      Math.min(offsetMs, this.timeline.totalDurationMs)
    );
    const progress =
      this.timeline.totalDurationMs > 0
        ? clampedOffset / this.timeline.totalDurationMs
        : 0;

    // Find closest frame at or before the requested offset
    let matchedFrame = this.timeline.frames[0];
    for (const frame of this.timeline.frames) {
      if (frame.offsetMs <= clampedOffset) {
        matchedFrame = frame;
      } else {
        break;
      }
    }

    // Accumulate all logs up to this offset
    const activeLogs: TimeTravelFrame['consoleLogs'] = [];
    const activeNetwork: TimeTravelFrame['networkRequests'] = [];

    for (const frame of this.timeline.frames) {
      if (frame.offsetMs <= clampedOffset) {
        for (const log of frame.consoleLogs) {
          if (log.timestampMs <= clampedOffset) {
            activeLogs.push(log);
          }
        }
        for (const net of frame.networkRequests) {
          if (net.timestampMs <= clampedOffset) {
            activeNetwork.push(net);
          }
        }
      }
    }

    return {
      currentFrame: matchedFrame,
      activeLogs,
      activeNetwork,
      progress,
    };
  }

  public getTotalDurationMs(): number {
    return this.timeline.totalDurationMs;
  }

  public getFrames(): TimeTravelFrame[] {
    return this.timeline.frames;
  }

  /**
   * Pre-packaged deterministic testbed timeline for interactive verification demo.
   */
  private createDefaultTimeline(): TimeTravelTimeline {
    return {
      totalDurationMs: 4000,
      frames: [
        {
          offsetMs: 0,
          stepId: 'step_init',
          stepTitle: 'Initialize Sandbox & Launch Chromium',
          status: 'passed',
          domSnapshot: '<!DOCTYPE html><html><head><title>Loading...</title></head><body><div id="root"></div></body></html>',
          screenshotUrl: '/artifacts/frame_0ms.png',
          networkRequests: [
            { id: 'req_1', url: 'http://localhost:3000/', method: 'GET', status: 200, durationMs: 120, timestampMs: 50 },
          ],
          consoleLogs: [
            { timestampMs: 0, level: 'info', message: '[Chromium] DevTools remote debugging port bound to 9222.' },
            { timestampMs: 80, level: 'info', message: '[Page] Navigation to http://localhost:3000/ initiated.' },
          ],
        },
        {
          offsetMs: 950,
          stepId: 'step_hydrate',
          stepTitle: 'Page Loaded & React State Hydrated',
          status: 'passed',
          domSnapshot: '<div id="root"><header class="navbar"><a href="/cart">Cart (0)</a></header><main><button id="add-to-cart">Add to Cart</button></main></div>',
          activeSelector: 'button#add-to-cart',
          screenshotUrl: '/artifacts/frame_950ms.png',
          networkRequests: [
            { id: 'req_2', url: 'http://localhost:3000/_next/static/chunks/app.js', method: 'GET', status: 200, durationMs: 240, timestampMs: 450 },
          ],
          consoleLogs: [
            { timestampMs: 900, level: 'info', message: '[React 19] Client tree hydrated in 84ms.' },
          ],
        },
        {
          offsetMs: 1850,
          stepId: 'step_click',
          stepTitle: 'User Interaction: Click Add to Cart',
          status: 'passed',
          domSnapshot: '<div id="root"><header class="navbar"><a href="/cart">Cart (1)</a></header><main><button id="checkout" class="btn-primary">Proceed to Checkout</button></main></div>',
          activeSelector: 'button#checkout',
          clickCoordinates: { x: 480, y: 320 },
          screenshotUrl: '/artifacts/frame_1850ms.png',
          networkRequests: [
            { id: 'req_3', url: 'http://localhost:3000/api/cart/add', method: 'POST', status: 200, durationMs: 85, timestampMs: 1860 },
          ],
          consoleLogs: [
            { timestampMs: 1852, level: 'info', message: '[Playwright] page.click("button#add-to-cart") dispatched @ (480, 320).' },
            { timestampMs: 1890, level: 'info', message: '[Cart API] Item SKU_PROOFIX added successfully.' },
          ],
        },
        {
          offsetMs: 2750,
          stepId: 'step_checkout_fail',
          stepTitle: 'Submit Checkout Form: Catch HTTP 404 Route Failure',
          status: 'failed',
          domSnapshot: '<div id="root"><div class="error-banner">Error: HTTP 404 missing route /api/checkout</div></div>',
          activeSelector: 'div.error-banner',
          clickCoordinates: { x: 512, y: 440 },
          screenshotUrl: '/artifacts/frame_2750ms.png',
          networkRequests: [
            { id: 'req_4', url: 'http://localhost:3000/api/checkout', method: 'POST', status: 404, durationMs: 42, timestampMs: 2750 },
          ],
          consoleLogs: [
            { timestampMs: 2750, level: 'error', message: '[Network Interceptor] POST /api/checkout failed with HTTP 404 Not Found.' },
            { timestampMs: 2780, level: 'error', message: '[Unhandled Exception] Uncaught (in promise) Error: Failed to complete checkout.' },
          ],
        },
        {
          offsetMs: 3850,
          stepId: 'step_healed',
          stepTitle: 'AI Self-Healing Patch Applied & Verified Clean',
          status: 'passed',
          domSnapshot: '<div id="root"><div class="success-banner">Order #ORD_9918 Confirmed! Thank you.</div></div>',
          activeSelector: 'div.success-banner',
          screenshotUrl: '/artifacts/frame_3850ms.png',
          networkRequests: [
            { id: 'req_5', url: 'http://localhost:3000/api/checkout', method: 'POST', status: 200, durationMs: 35, timestampMs: 3860 },
          ],
          consoleLogs: [
            { timestampMs: 3855, level: 'info', message: '[PROOFix Prover] Self-healing patch applied to route /api/checkout.' },
            { timestampMs: 3890, level: 'info', message: '[Verification Prover] Zero regressions detected. 100% pass rate.' },
          ],
        },
      ],
    };
  }
}

export const globalTimeTravelEngine = new TimeTravelEngine();
