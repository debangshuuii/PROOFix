import type { SecretFinding, SecurityPreflightReport } from '../types/security.ts';
import { redactSensitiveData } from './redactor.ts';
import { maskSecretValue } from './secret-scanner.ts';

export interface CreateSafeFindingParams {
  id?: string;
  detectorType: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  rawLine: string;
  rawSecret: string;
  confidence?: 'high' | 'medium';
  severity?: 'critical' | 'high';
}

/**
 * Creates a clean, safe SecretFinding record with file, line, detector type, and redacted excerpt.
 * The raw secret is strictly excluded from all stored fields.
 * "Done when: API responses, logs, reports, and test output do not expose the detected credential value."
 */
export function createSafeSecretFinding(params: CreateSafeFindingParams): SecretFinding {
  const {
    id = `sec_${params.detectorType.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${params.lineNumber}`,
    detectorType,
    filePath,
    lineNumber,
    columnNumber,
    rawLine,
    rawSecret,
    confidence = 'high',
    severity = 'critical',
  } = params;

  // Mask representation: e.g. "ghp_****...****34"
  const mask = maskSecretValue(rawSecret);

  // Redacted line excerpt: replace the raw secret with the safe mask
  const safeLine = rawLine.replace(rawSecret, mask).trim();

  return {
    id,
    detectorType,
    filePath,
    lineNumber,
    columnNumber,
    redactedExcerpt: safeLine,
    mask,
    confidence,
    severity,
  };
}

/**
 * Sanitizes any log string before broadcasting or printing to stdout/stderr.
 */
export function sanitizeLogOutput(message: string, forbiddenSecrets: string[] = []): string {
  let sanitized = redactSensitiveData(message);

  for (const secret of forbiddenSecrets) {
    if (secret && secret.length >= 4) {
      const mask = maskSecretValue(secret);
      sanitized = sanitized.split(secret).join(mask);
    }
  }

  return sanitized;
}

/**
 * Deeply inspects an object, array, or string to verify zero raw secret values leaked.
 * Used for automated verification and regression tests.
 */
export function assertZeroSecretLeakage(
  payload: unknown,
  forbiddenRawSecrets: string[]
): { isClean: boolean; leaks: string[] } {
  const leaks: string[] = [];
  const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);

  for (const raw of forbiddenRawSecrets) {
    if (raw && raw.trim().length >= 6 && serialized.includes(raw)) {
      leaks.push(`Detected leakage of raw secret "${raw.substring(0, 4)}..." in payload.`);
    }
  }

  return {
    isClean: leaks.length === 0,
    leaks,
  };
}

/**
 * Deeply sanitizes a SecurityPreflightReport object before returning it via API responses.
 */
export function sanitizeReportForApiResponse(report: SecurityPreflightReport): SecurityPreflightReport {
  return JSON.parse(JSON.stringify(report, (key, value) => {
    if (typeof value === 'string') {
      return redactSensitiveData(value);
    }
    return value;
  }));
}
