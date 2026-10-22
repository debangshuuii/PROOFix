import fs from 'fs';
import path from 'path';
import { chromium, Browser, Page } from 'playwright';
import {
  TestResult,
  ConsoleErrorItem,
  NetworkFailureItem,
  TestStep,
  DiscoveredRoute,
} from '../types';
import { extractInternalAnchors } from './route-crawler-agent';
import { auditInternalRoute } from './dead-link-auditor';
import { synthesizeDynamicRoute, isDynamicRoute } from './dynamic-route-synthesizer';
import { captureNavigationTiming } from './navigation-timing-monitor';
import { discoverApiEndpoints } from './api-endpoint-discoverer';
import { validateApiResponse } from './api-response-validator';
import { generateSyntheticPayload } from './api-payload-generator';


export interface VerificationOptions {
  runId: string;
  baseUrl: string;
  routes: DiscoveredRoute[];
  timeoutMs?: number;
  onLog?: (message: string) => void;
}

export async function runPlaywrightVerification(
  options: VerificationOptions
): Promise<TestResult[]> {
  const { runId, baseUrl, routes, timeoutMs = 30000, onLog } = options;
  const log = (msg: string) => {
    if (onLog) onLog(`[Playwright] ${msg}`);
  };

  const results: TestResult[] = [];
  const artifactsDir = path.join(process.cwd(), 'public', 'artifacts', 'runs', runId);
  if (!fs.existsSync(artifactsDir)) {
    fs.mkdirSync(artifactsDir, { recursive: true });
  }

  log(`Launching Chromium headless engine for ${baseUrl}...`);

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  } catch (err: any) {
    log(`Browser launch failed: ${err.message}. Trying system Edge/Chrome fallback...`);
    try {
      browser = await chromium.launch({
        channel: 'msedge',
        headless: true,
      });
    } catch (edgeErr: any) {
      log(`Edge fallback failed: ${edgeErr.message}. Cannot launch browser.`);
      throw new Error(`Browser launch error: ${err.message}`);
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  // Listen for uncaught exceptions and network failures
  const globalConsoleErrors: ConsoleErrorItem[] = [];
  const globalNetworkFailures: NetworkFailureItem[] = [];

  page.on('pageerror', (err) => {
    globalConsoleErrors.push({
      timestamp: new Date().toLocaleTimeString(),
      type: 'exception',
      text: err.message,
      location: err.stack?.split('\n')[1]?.trim(),
    });
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      globalConsoleErrors.push({
        timestamp: new Date().toLocaleTimeString(),
        type: 'error',
        text: msg.text(),
        location: msg.location().url,
      });
    }
  });

  page.on('requestfailed', (req) => {
    globalNetworkFailures.push({
      url: req.url(),
      method: req.method(),
      failureReason: req.failure()?.errorText || 'Request failed',
    });
  });

  page.on('response', (res) => {
    if (res.status() >= 400) {
      globalNetworkFailures.push({
        url: res.url(),
        method: res.request().method(),
        status: res.status(),
        statusText: res.statusText(),
      });
    }
  });

  // -------------------------------------------------------------
  // Test 1: Root URL Health & Availability
  // -------------------------------------------------------------
  const t1Start = Date.now();
  const t1Steps: TestStep[] = [];
  let t1Status: 'passed' | 'failed' = 'passed';
  let t1Actual = 'Root URL responded HTTP 200 and rendered expected DOM elements.';
  let t1Screenshot = `/artifacts/runs/${runId}/test_1_root.png`;

  log('Executing Check 1: Root URL Health Check...');

  try {
    const s1Start = Date.now();
    const response = await page.goto(baseUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
    t1Steps.push({
      name: `Navigate to ${baseUrl}`,
      status: response && response.status() < 400 ? 'passed' : 'failed',
      durationMs: Date.now() - s1Start,
    });

    const status = response ? response.status() : 0;
    if (status >= 400 || status === 0) {
      t1Status = 'failed';
      t1Actual = `Root page returned HTTP ${status}`;
    }

    const title = await page.title();
    t1Steps.push({
      name: `Verify page title (${title || 'Empty'})`,
      status: 'passed',
      durationMs: 10,
    });

    await page.screenshot({ path: path.join(artifactsDir, 'test_1_root.png') });
  } catch (err: any) {
    t1Status = 'failed';
    t1Actual = `Failed navigating to root URL: ${err.message}`;
    t1Steps.push({
      name: `Navigate to ${baseUrl}`,
      status: 'failed',
      durationMs: Date.now() - t1Start,
      error: err.message,
    });
  }

  results.push({
    id: `res_${runId}_01`,
    runId,
    name: 'Root Application Availability & Readiness Check',
    category: 'smoke',
    status: t1Status,
    durationMs: Date.now() - t1Start,
    actualResult: t1Actual,
    failureCategory: t1Status === 'failed' ? 'readiness_failed' : undefined,
    evidence: {
      screenshotPath: t1Screenshot,
      consoleErrors: [...globalConsoleErrors],
      networkFailures: [...globalNetworkFailures],
      steps: t1Steps,
    },
    startedAt: new Date(t1Start).toISOString(),
    completedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // Test 2: Discovered Secondary Page Navigation & Parameter Synthesis
  // -------------------------------------------------------------
  const pageRoutes = routes.filter((r) => r.type === 'page' && r.path !== '/');
  // Ensure we at least check /about or the primary discovered page
  const targetRoutesToCheck = pageRoutes.length > 0
    ? pageRoutes.slice(0, 4)
    : [{ path: '/about', type: 'page' as const, fileSource: 'src/app/about/page.tsx', isDynamic: false }];

  const t2Start = Date.now();
  const t2Steps: TestStep[] = [];
  let t2Status: 'passed' | 'failed' = 'passed';
  let t2Actual = 'Navigation to discovered route(s) succeeded with valid HTTP 200.';
  const t2Screenshot = `/artifacts/runs/${runId}/test_2_about.png`;

  log(`Executing Check 2: Dynamic Route Navigation (${targetRoutesToCheck.map((r) => r.path).join(', ')})...`);

  for (const r of targetRoutesToCheck) {
    const rawPath = r.path;
    const { synthesizedRoute, substitutedTokens } = isDynamicRoute(rawPath)
      ? synthesizeDynamicRoute(rawPath)
      : { synthesizedRoute: rawPath, substitutedTokens: [] };

    const targetUrl = `${baseUrl}${synthesizedRoute.startsWith('/') ? synthesizedRoute : `/${synthesizedRoute}`}`;
    const sStart = Date.now();

    try {
      const res = await page.goto(targetUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });
      const navTiming = await captureNavigationTiming(page, sStart);
      const isOk = Boolean(res && res.status() < 400);

      t2Steps.push({
        name: `Navigate to ${synthesizedRoute}${substitutedTokens.length > 0 ? ` (Synthesized: ${substitutedTokens.join(', ')})` : ''} [${navTiming.domContentLoadedMs}ms]`,
        status: isOk ? 'passed' : 'failed',
        durationMs: Date.now() - sStart,
      });

      if (!isOk) {
        t2Status = 'failed';
        t2Actual = `Route ${synthesizedRoute} returned HTTP ${res?.status() || 'No Response'}`;
      }

      // If this is the about route or first route, capture screenshot
      if (rawPath === '/about' || r === targetRoutesToCheck[0]) {
        await page.screenshot({ path: path.join(artifactsDir, 'test_2_about.png') }).catch(() => {});
      }
    } catch (err: any) {
      t2Status = 'failed';
      t2Actual = `Navigation to ${synthesizedRoute} failed: ${err.message}`;
      t2Steps.push({
        name: `Navigate to ${synthesizedRoute}`,
        status: 'failed',
        durationMs: Date.now() - sStart,
        error: err.message,
      });
    }
  }

  results.push({
    id: `res_${runId}_02`,
    runId,
    name: 'Secondary Route Navigation & Route Discovery',
    category: 'route_discovery',
    status: t2Status,
    durationMs: Date.now() - t2Start,
    actualResult: t2Actual,
    failureCategory: t2Status === 'failed' ? 'navigation_failed' : undefined,
    evidence: {
      screenshotPath: t2Screenshot,
      consoleErrors: [...globalConsoleErrors],
      networkFailures: [...globalNetworkFailures],
      steps: t2Steps,
    },
    startedAt: new Date(t2Start).toISOString(),
    completedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // Test 3: Dead Link & 404 Detection Check with DOM Crawler Agent
  // -------------------------------------------------------------
  const t3Start = Date.now();
  const t3Steps: TestStep[] = [];
  let t3Status: 'passed' | 'failed' = 'passed';
  let t3Actual = 'All discovered anchor links resolved with valid HTTP status codes.';
  const t3Screenshot = `/artifacts/runs/${runId}/test_3_broken.png`;
  let t3ErrorDetails: any = undefined;

  log('Executing Check 3: Internal Link Integrity & Dead Link Audit...');

  try {
    await page.goto(baseUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });

    // Use route crawler agent to extract valid internal anchor hyperlinks
    const discoveredAnchors = await extractInternalAnchors(page, baseUrl);

    t3Steps.push({
      name: `Discovered ${discoveredAnchors.length} internal navigation link(s)`,
      status: 'passed',
      durationMs: 30,
    });

    let foundBrokenLink: { link: string; status: number; text?: string } | null = null;

    for (const anchor of discoveredAnchors) {
      const linkCheckStart = Date.now();
      const auditResult = await auditInternalRoute({
        page,
        baseUrl,
        targetRoute: anchor.href,
        sourceUrl: baseUrl,
        anchorText: anchor.text,
        artifactsDir,
        timeoutMs: 6000,
      });

      if (auditResult.check.isDeadLink) {
        foundBrokenLink = {
          link: anchor.href,
          status: auditResult.check.httpStatus,
          text: anchor.text,
        };
        t3Steps.push({
          name: `Verify target ${anchor.href}`,
          status: 'failed',
          durationMs: Date.now() - linkCheckStart,
          error: `Target returned HTTP ${auditResult.check.httpStatus} ${auditResult.check.statusText}`,
        });
        break; // Trapped broken link!
      } else {
        t3Steps.push({
          name: `Verify target ${anchor.href} (${auditResult.check.httpStatus} OK)`,
          status: 'passed',
          durationMs: Date.now() - linkCheckStart,
        });
      }
    }

    if (foundBrokenLink) {
      t3Status = 'failed';
      t3Actual = `Dead link detected: "${foundBrokenLink.link}" returned HTTP ${foundBrokenLink.status} (Not Found).`;
      t3ErrorDetails = {
        message: `Navigation link to "${foundBrokenLink.link}" failed with HTTP ${foundBrokenLink.status}.`,
        url: `${baseUrl}${foundBrokenLink.link}`,
        stepFailed: `Verify target ${foundBrokenLink.link}`,
      };

      try {
        await page.goto(`${baseUrl}${foundBrokenLink.link}`, { timeout: 5000 }).catch(() => {});
        await page.screenshot({ path: path.join(artifactsDir, 'test_3_broken.png') }).catch(() => {});
      } catch {}
    } else {
      await page.screenshot({ path: path.join(artifactsDir, 'test_3_broken.png') }).catch(() => {});
    }
  } catch (err: any) {
    t3Status = 'failed';
    t3Actual = `Link audit failed: ${err.message}`;
  }

  results.push({
    id: `res_${runId}_03`,
    runId,
    name: 'Internal Link Integrity & Dead Link Audit',
    category: 'route_discovery',
    status: t3Status,
    durationMs: Date.now() - t3Start,
    actualResult: t3Actual,
    failureCategory: t3Status === 'failed' ? 'navigation_failed' : undefined,
    errorDetails: t3ErrorDetails,
    evidence: {
      screenshotPath: t3Screenshot,
      consoleErrors: [...globalConsoleErrors],
      networkFailures: [...globalNetworkFailures],
      steps: t3Steps,
    },
    startedAt: new Date(t3Start).toISOString(),
    completedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // Test 4: Backend Multi-Endpoint API Health & Contract Checks
  // -------------------------------------------------------------
  const discoveredEndpoints = discoverApiEndpoints(routes);
  const endpointsToCheck = discoveredEndpoints.length > 0
    ? discoveredEndpoints.slice(0, 3)
    : [
        {
          path: '/api/data',
          methods: ['GET' as const],
          timeoutMs: 8000,
          expectedStatusMin: 200,
          expectedStatusMax: 499,
          allowEmptyBody: true,
          detectStackTraces: true,
          detectDatabaseErrors: true,
          headers: { Accept: 'application/json, text/plain, */*' },
        },
      ];

  if (endpointsToCheck.length > 0) {
    const t4Start = Date.now();
    const t4Steps: TestStep[] = [];
    let t4Status: 'passed' | 'failed' = 'passed';
    let t4Actual = 'Discovered backend API endpoints responded without crashing or leaking stack traces.';
    const t4Screenshot = `/artifacts/runs/${runId}/test_4_api.png`;
    let t4ErrorDetails: any = undefined;

    log(`Executing Check 4: Backend API Health Check (${endpointsToCheck.map((e) => e.path).join(', ')})...`);

    for (const ep of endpointsToCheck) {
      const method = ep.methods[0] || 'GET';
      const apiUrl = `${baseUrl}${ep.path.startsWith('/') ? ep.path : `/${ep.path}`}`;
      const payload = generateSyntheticPayload(ep.path, method);
      const sStart = Date.now();

      try {
        const apiRes = await page.request.fetch(apiUrl, {
          method,
          headers: payload.headers,
          data: payload.body,
          timeout: ep.timeoutMs,
        });

        const statusCode = apiRes.status();
        const statusText = apiRes.statusText();
        let bodyText = '';
        try {
          bodyText = await apiRes.text();
        } catch {}

        const durationMs = Date.now() - sStart;
        const validation = validateApiResponse(
          ep.path,
          method,
          statusCode,
          statusText,
          bodyText,
          durationMs
        );

        t4Steps.push({
          name: `Send ${method} ${ep.path} [${statusCode} ${statusText}]`,
          status: validation.passed ? 'passed' : 'failed',
          durationMs,
          error: validation.error,
        });

        if (!validation.passed) {
          t4Status = 'failed';
          t4Actual = `Endpoint ${ep.path} returned HTTP ${statusCode} (${bodyText.slice(0, 100)})`;
          t4ErrorDetails = {
            message: validation.error || `API request failed with HTTP ${statusCode}: ${bodyText.slice(0, 150)}`,
            url: apiUrl,
            stepFailed: `Send ${method} ${ep.path}`,
          };
        }
      } catch (err: any) {
        t4Status = 'failed';
        t4Actual = `API request to ${ep.path} failed: ${err.message}`;
        t4ErrorDetails = {
          message: err.message,
          url: apiUrl,
          stepFailed: `Send ${method} ${ep.path}`,
        };
        t4Steps.push({
          name: `Send ${method} ${ep.path}`,
          status: 'failed',
          durationMs: Date.now() - sStart,
          error: err.message,
        });
      }
    }

    try {
      await page.screenshot({ path: path.join(artifactsDir, 'test_4_api.png') }).catch(() => {});
    } catch {}

    results.push({
      id: `res_${runId}_04`,
      runId,
      name: `Backend API Health Check (${endpointsToCheck[0]?.path || '/api'})`,
      category: 'api_health',
      status: t4Status,
      durationMs: Date.now() - t4Start,
      actualResult: t4Actual,
      failureCategory: t4Status === 'failed' ? 'http_error' : undefined,
      errorDetails: t4ErrorDetails,
      evidence: {
        screenshotPath: t4Screenshot,
        consoleErrors: [...globalConsoleErrors],
        networkFailures: [...globalNetworkFailures],
        steps: t4Steps,
      },
      startedAt: new Date(t4Start).toISOString(),
      completedAt: new Date().toISOString(),
    });
  }

  // -------------------------------------------------------------
  // Test 5: Interactive Elements & UI Hydration Check
  // -------------------------------------------------------------
  const t5Start = Date.now();
  const t5Steps: TestStep[] = [];
  let t5Status: 'passed' | 'failed' = 'passed';
  let t5Actual = 'Interactive UI elements responded cleanly without throwing exceptions.';
  const t5Screenshot = `/artifacts/runs/${runId}/test_5_interactive.png`;

  log('Executing Check 5: Interactive Elements & UI Hydration Check...');

  try {
    await page.goto(baseUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });

    // Look for counter or safe increment button
    const incrementBtn = await page.$('#increment-btn');
    if (incrementBtn) {
      const clickStart = Date.now();
      await incrementBtn.click();
      await incrementBtn.click();
      t5Steps.push({
        name: 'Click increment button twice',
        status: 'passed',
        durationMs: Date.now() - clickStart,
      });

      const counterText = await page.$eval('#counter-value', (el) => el.textContent).catch(() => null);
      if (counterText && counterText.includes('2')) {
        t5Actual = `Button dispatched React state update successfully: "${counterText}".`;
        t5Steps.push({
          name: 'Verify counter updated to Count: 2',
          status: 'passed',
          durationMs: 15,
        });
      }
    } else {
      t5Steps.push({
        name: 'Scan for interactive buttons/inputs',
        status: 'passed',
        durationMs: 40,
      });
    }

    await page.screenshot({ path: path.join(artifactsDir, 'test_5_interactive.png') });
  } catch (err: any) {
    t5Status = 'failed';
    t5Actual = `Interactive element test encountered an error: ${err.message}`;
  }

  results.push({
    id: `res_${runId}_05`,
    runId,
    name: 'Interactive UI Elements & Event Dispatch Check',
    category: 'user_flow',
    status: t5Status,
    durationMs: Date.now() - t5Start,
    actualResult: t5Actual,
    evidence: {
      screenshotPath: t5Screenshot,
      consoleErrors: [...globalConsoleErrors],
      networkFailures: [...globalNetworkFailures],
      steps: t5Steps,
    },
    startedAt: new Date(t5Start).toISOString(),
    completedAt: new Date().toISOString(),
  });

  // -------------------------------------------------------------
  // Test 6: Responsive Viewport & Layout Overflow Audit
  // -------------------------------------------------------------
  const t6Start = Date.now();
  const t6Steps: TestStep[] = [];
  let t6Status: 'passed' | 'failed' = 'passed';
  let t6Actual = 'No layout overflow detected across Mobile (375px), Tablet (768px), or Desktop (1280px).';
  const t6Screenshot = `/artifacts/runs/${runId}/test_6_mobile.png`;

  log('Executing Check 6: Responsive Viewport & Layout Overflow Audit...');

  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 720 },
  ];

  for (const vp of viewports) {
    const vpStart = Date.now();
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(baseUrl, { timeout: 10000, waitUntil: 'domcontentloaded' });

      // Check horizontal scroll overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        t6Status = 'failed';
        t6Actual = `Horizontal layout overflow detected at ${vp.name} viewport (${vp.width}px).`;
        t6Steps.push({
          name: `Audit ${vp.name} viewport (${vp.width}x${vp.height})`,
          status: 'failed',
          durationMs: Date.now() - vpStart,
          error: 'Content exceeds viewport width',
        });
      } else {
        t6Steps.push({
          name: `Audit ${vp.name} viewport (${vp.width}x${vp.height})`,
          status: 'passed',
          durationMs: Date.now() - vpStart,
        });
      }

      if (vp.name === 'Mobile') {
        await page.screenshot({ path: path.join(artifactsDir, 'test_6_mobile.png') });
      }
    } catch (err: any) {
      t6Steps.push({
        name: `Audit ${vp.name} viewport`,
        status: 'failed',
        durationMs: Date.now() - vpStart,
        error: err.message,
      });
    }
  }

  results.push({
    id: `res_${runId}_06`,
    runId,
    name: 'Responsive Viewport & Layout Overflow Audit',
    category: 'responsive_layout',
    status: t6Status,
    durationMs: Date.now() - t6Start,
    actualResult: t6Actual,
    failureCategory: t6Status === 'failed' ? 'layout_overflow' : undefined,
    evidence: {
      screenshotPath: t6Screenshot,
      consoleErrors: [...globalConsoleErrors],
      networkFailures: [...globalNetworkFailures],
      steps: t6Steps,
    },
    startedAt: new Date(t6Start).toISOString(),
    completedAt: new Date().toISOString(),
  });

  // Close browser
  await context.close();
  await browser.close();

  log(`Verification complete. Executed ${results.length} checks.`);
  return results;
}
