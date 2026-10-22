/**
 * Dead Link Auditor & Error State Screenshotter
 * Intercepts dead links, 404 routes, and 500 server errors, captures
 * visual error page screenshots, and formats structured findings.
 */

import path from 'path';
import type { Page } from 'playwright';
import type { DeadLinkFinding, RouteNavigationCheck } from '../types/navigation-crawler.ts';

export interface AuditRouteOptions {
  page: Page;
  baseUrl: string;
  targetRoute: string;
  sourceUrl: string;
  anchorText?: string;
  artifactsDir?: string;
  timeoutMs?: number;
}

/**
 * Navigates to a specific internal route and audits its HTTP status & DOM health.
 */
export async function auditInternalRoute(
  options: AuditRouteOptions
): Promise<{ check: RouteNavigationCheck; finding?: DeadLinkFinding }> {
  const {
    page,
    baseUrl,
    targetRoute,
    sourceUrl,
    anchorText,
    artifactsDir,
    timeoutMs = 10000,
  } = options;

  const fullUrl = `${baseUrl.replace(/\/$/, '')}${targetRoute.startsWith('/') ? targetRoute : `/${targetRoute}`}`;
  const start = Date.now();
  let statusCode = 0;
  let statusText = 'No Response';
  let title = '';
  let errorMessage: string | undefined;
  let screenshotPath: string | undefined;

  try {
    const response = await page.goto(fullUrl, {
      timeout: timeoutMs,
      waitUntil: 'domcontentloaded',
    });

    statusCode = response?.status() || 200;
    statusText = response?.statusText() || 'OK';
    title = await page.title().catch(() => '');

    if (statusCode >= 400 && artifactsDir) {
      const sanitizedName = `err_${targetRoute.replace(/[^a-zA-Z0-9_\-]/g, '_')}.png`;
      const absPath = path.join(artifactsDir, sanitizedName);
      await page.screenshot({ path: absPath, fullPage: false }).catch(() => {});
      screenshotPath = `/artifacts/runs/${path.basename(artifactsDir)}/${sanitizedName}`;
    }
  } catch (err: any) {
    statusCode = 0;
    statusText = 'Navigation Error';
    errorMessage = err?.message || 'Failed to navigate to target URL';
  }

  const durationMs = Date.now() - start;
  const isDead = statusCode >= 400 || statusCode === 0;

  const check: RouteNavigationCheck = {
    route: targetRoute,
    sourceUrl,
    depth: 1,
    httpStatus: statusCode,
    statusText,
    durationMs,
    passed: !isDead,
    title,
    error: errorMessage,
    screenshotPath,
    discoveredAnchorsCount: 0,
    isDeadLink: isDead,
  };

  let finding: DeadLinkFinding | undefined;
  if (isDead) {
    finding = {
      targetUrl: fullUrl,
      discoveredOnUrl: sourceUrl,
      anchorText,
      httpStatus: statusCode,
      errorMessage: errorMessage || `Target route returned HTTP ${statusCode} (${statusText})`,
      severity: statusCode >= 500 || statusCode === 0 ? 'critical' : 'high',
    };
  }

  return { check, finding };
}
