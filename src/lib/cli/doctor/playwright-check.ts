/**
 * PROOFix CLI Doctor: Playwright Chromium Binary Check
 * Inspects Playwright installation and Chromium browser executable availability.
 */

import fs from 'fs';
import path from 'path';
import type { DoctorCheckResult } from '../types.ts';

export interface PlaywrightCheckMock {
  hasPackage?: boolean;
  hasExecutable?: boolean;
  executablePath?: string;
  error?: string;
}

export async function checkPlaywrightChromium(mock?: PlaywrightCheckMock): Promise<DoctorCheckResult> {
  if (mock) {
    if (mock.error) {
      return {
        id: 'playwright_chromium',
        name: 'Playwright Chromium Binary',
        category: 'browser',
        status: 'failed',
        message: `Failed to detect Chromium binary: ${mock.error}`,
        recommendation: 'Run npx playwright install chromium or npx proofix doctor --heal.',
        autoFixAvailable: true,
      };
    }
    if (mock.hasExecutable === false) {
      return {
        id: 'playwright_chromium',
        name: 'Playwright Chromium Binary',
        category: 'browser',
        status: 'warning',
        message: 'Playwright Chromium binary is missing in local browser cache.',
        recommendation: 'Run npx playwright install chromium or npx proofix doctor --heal.',
        autoFixAvailable: true,
      };
    }
    return {
      id: 'playwright_chromium',
      name: 'Playwright Chromium Binary',
      category: 'browser',
      status: 'passed',
      message: `Chromium binary verified at ${mock.executablePath || '/ms-playwright/chromium'}`,
      details: { executablePath: mock.executablePath || '/ms-playwright/chromium' },
    };
  }

  try {
    const { chromium } = await import('playwright');
    const execPath = chromium.executablePath();

    if (execPath && fs.existsSync(execPath)) {
      return {
        id: 'playwright_chromium',
        name: 'Playwright Chromium Binary',
        category: 'browser',
        status: 'passed',
        message: `Chromium binary verified at ${execPath}`,
        details: { executablePath: execPath },
      };
    }

    // Check if ms-playwright directory has any chromium folder
    const localAppData = process.env.LOCALAPPDATA || (process.env.HOME ? path.join(process.env.HOME, '.cache') : '');
    const defaultCacheDir = path.join(localAppData, 'ms-playwright');
    let foundDir = false;

    if (fs.existsSync(defaultCacheDir)) {
      const entries = fs.readdirSync(defaultCacheDir);
      foundDir = entries.some((e) => e.toLowerCase().startsWith('chromium-'));
    }

    if (foundDir) {
      return {
        id: 'playwright_chromium',
        name: 'Playwright Chromium Binary',
        category: 'browser',
        status: 'passed',
        message: `Chromium browser package found in ${defaultCacheDir}`,
        details: { cacheDir: defaultCacheDir },
      };
    }

    return {
      id: 'playwright_chromium',
      name: 'Playwright Chromium Binary',
      category: 'browser',
      status: 'warning',
      message: 'Playwright Chromium binary not installed.',
      recommendation: 'Run npx playwright install chromium or npx proofix doctor --heal.',
      autoFixAvailable: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      id: 'playwright_chromium',
      name: 'Playwright Chromium Binary',
      category: 'browser',
      status: 'warning',
      message: `Playwright Chromium check warning: ${message}`,
      recommendation: 'Run npx playwright install chromium or npx proofix doctor --heal.',
      autoFixAvailable: true,
    };
  }
}
