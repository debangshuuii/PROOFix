/**
 * PROOFix CLI Doctor Diagnostic Suite
 * Runs all environmental pre-flight checks and orchestrates self-healing.
 */

import { checkNodeVersion } from './node-check.ts';
import { checkPlaywrightChromium } from './playwright-check.ts';
import { checkEphemeralPortAllocation } from './port-check.ts';
import { checkAiProviderKeys } from './keys-check.ts';
import { autoHealPlaywrightChromium } from './healer.ts';
import type { DoctorReport, DoctorCheckResult } from '../types.ts';

export interface RunDoctorOptions {
  heal?: boolean;
  onCheckComplete?: (check: DoctorCheckResult) => void;
  onHealingProgress?: (msg: string) => void;
  mockNodeVersion?: string;
  mockPlaywrightError?: string;
  mockPortError?: string;
  mockEnv?: Record<string, string | undefined>;
}

export async function runDoctorSuite(options: RunDoctorOptions = {}): Promise<DoctorReport> {
  const checks: DoctorCheckResult[] = [];

  // Check 1: Node.js version
  const nodeCheck = checkNodeVersion(options.mockNodeVersion);
  checks.push(nodeCheck);
  options.onCheckComplete?.(nodeCheck);

  // Check 2: Playwright Chromium
  let playwrightCheck = await checkPlaywrightChromium(
    options.mockPlaywrightError ? { error: options.mockPlaywrightError } : undefined
  );

  // Auto-heal if requested and missing/warning
  let autoHealed = false;
  if (options.heal && playwrightCheck.status !== 'passed' && playwrightCheck.autoFixAvailable) {
    const healRes = await autoHealPlaywrightChromium({
      onProgress: options.onHealingProgress,
      mockSuccess: Boolean(options.mockPlaywrightError), // in test mode
    });
    if (healRes.healedCheck) {
      playwrightCheck = healRes.healedCheck;
      autoHealed = true;
    }
  }

  checks.push(playwrightCheck);
  options.onCheckComplete?.(playwrightCheck);

  // Check 3: Ephemeral port allocation
  const portCheck = await checkEphemeralPortAllocation(options.mockPortError);
  checks.push(portCheck);
  options.onCheckComplete?.(portCheck);

  // Check 4: AI provider keys
  const keysCheck = checkAiProviderKeys(options.mockEnv);
  checks.push(keysCheck);
  options.onCheckComplete?.(keysCheck);

  // Compute overall status
  const hasFailure = checks.some((c) => c.status === 'failed');
  const hasWarning = checks.some((c) => c.status === 'warning');
  const overallStatus = hasFailure ? 'unhealthy' : hasWarning ? 'degraded' : 'healthy';

  return {
    timestamp: new Date().toISOString(),
    overallStatus,
    hostInfo: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
    },
    checks,
    autoHealed,
  };
}
