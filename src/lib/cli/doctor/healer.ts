/**
 * PROOFix CLI Doctor Auto-Healer
 * Automatically resolves missing browser binaries using `npx playwright install chromium`.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { checkPlaywrightChromium } from './playwright-check.ts';
import type { DoctorCheckResult } from '../types.ts';

const execAsync = promisify(exec);

export interface AutoHealOptions {
  mockSuccess?: boolean;
  mockError?: string;
  timeoutMs?: number;
  onProgress?: (message: string) => void;
}

export interface AutoHealResult {
  success: boolean;
  command: string;
  healedCheck?: DoctorCheckResult;
  error?: string;
  output?: string;
}

export async function autoHealPlaywrightChromium(options: AutoHealOptions = {}): Promise<AutoHealResult> {
  const cmd = 'npx playwright install chromium';

  if (options.onProgress) {
    options.onProgress(`Running '${cmd}' to resolve missing browser dependencies...`);
  }

  if (options.mockError) {
    return {
      success: false,
      command: cmd,
      error: options.mockError,
    };
  }

  if (options.mockSuccess) {
    const healedCheck: DoctorCheckResult = {
      id: 'playwright_chromium',
      name: 'Playwright Chromium Binary',
      category: 'browser',
      status: 'healed',
      message: 'Playwright Chromium binary automatically installed and verified.',
    };
    return {
      success: true,
      command: cmd,
      output: 'Chromium binary successfully downloaded and extracted.',
      healedCheck,
    };
  }

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: options.timeoutMs ?? 120000,
      env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0' },
    });

    const verifyCheck = await checkPlaywrightChromium();
    const isNowPresent = verifyCheck.status === 'passed';

    const healedCheck: DoctorCheckResult = {
      id: 'playwright_chromium',
      name: 'Playwright Chromium Binary',
      category: 'browser',
      status: isNowPresent ? 'healed' : 'failed',
      message: isNowPresent
        ? 'Playwright Chromium binary successfully auto-healed.'
        : 'Playwright install finished but binary validation failed.',
      details: { stdout, stderr },
    };

    return {
      success: isNowPresent,
      command: cmd,
      output: stdout,
      healedCheck,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      command: cmd,
      error: errorMsg,
    };
  }
}
