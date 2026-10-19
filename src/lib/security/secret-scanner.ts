import fs from 'fs';
import path from 'path';
import type { SecretFinding } from '../types/security.ts';

export interface SecretDetectorRule {
  id: string;
  name: string;
  pattern: RegExp;
  confidence: 'high' | 'medium';
  severity: 'critical' | 'high';
  formatMask: (raw: string) => string;
}

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.svgz',
  '.pdf', '.zip', '.gz', '.tar', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp4', '.webm', '.mov', '.mp3', '.wav',
  '.pyc', '.pyo', '.class',
]);

const EXCLUDED_DIRS = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', 'out',
  'coverage', '.venv', 'venv', '__pycache__', '.pytest_cache',
]);

export function maskSecretValue(raw: string, visiblePrefix = 4, visibleSuffix = 2): string {
  if (raw.length <= visiblePrefix + visibleSuffix) {
    return '****';
  }
  const prefix = raw.substring(0, visiblePrefix);
  const suffix = raw.substring(raw.length - visibleSuffix);
  return `${prefix}${'*'.repeat(Math.max(4, raw.length - visiblePrefix - visibleSuffix))}${suffix}`;
}

export const SECRET_DETECTOR_RULES: SecretDetectorRule[] = [
  {
    id: 'aws_access_key',
    name: 'AWS Access Key ID',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    confidence: 'high',
    severity: 'critical',
    formatMask: (raw) => maskSecretValue(raw, 4, 2),
  },
  {
    id: 'github_token',
    name: 'GitHub Token',
    pattern: /\b(gh[pousr]_[A-Za-z0-9_]{36,255})\b/g,
    confidence: 'high',
    severity: 'critical',
    formatMask: (raw) => maskSecretValue(raw, 4, 2),
  },
  {
    id: 'openai_api_key',
    name: 'OpenAI API Key',
    pattern: /\b(sk-[a-zA-Z0-9_\-]{20,})\b/g,
    confidence: 'high',
    severity: 'high',
    formatMask: (raw) => maskSecretValue(raw, 3, 2),
  },
  {
    id: 'google_api_key',
    name: 'Google API Key',
    pattern: /\b(AIza[0-9A-Za-z\-_]{35})\b/g,
    confidence: 'high',
    severity: 'high',
    formatMask: (raw) => maskSecretValue(raw, 4, 2),
  },
  {
    id: 'slack_token',
    name: 'Slack Bot / Webhook Token',
    pattern: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    confidence: 'high',
    severity: 'high',
    formatMask: (raw) => maskSecretValue(raw, 4, 2),
  },
  {
    id: 'private_key_header',
    name: 'Private Encryption Key Header',
    pattern: /(-----BEGIN (?:RSA|EC|OPENSSH|DSA|PGP|PRIVATE) KEY-----)/g,
    confidence: 'high',
    severity: 'critical',
    formatMask: () => '-----BEGIN [REDACTED_PRIVATE_KEY]-----',
  },
  {
    id: 'database_credentials_uri',
    name: 'Database Connection URI with Password',
    pattern: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?):\/\/[^:\s]+:([^@\s]+)@/gi,
    confidence: 'high',
    severity: 'critical',
    formatMask: () => '[REDACTED_DB_PASSWORD]',
  },
];

export interface SecretScanOptions {
  maxFileSizeBytes?: number; // default: 1MB (1048576 bytes)
  customRules?: SecretDetectorRule[];
}

export interface SecretScanResult {
  findings: SecretFinding[];
  scannedFilesCount: number;
  skippedFilesCount: number;
  errors: string[];
}

/**
 * Checks whether a buffer represents binary content by scanning for null bytes in initial sample.
 */
export function isBinaryBuffer(buf: Buffer): boolean {
  const checkLen = Math.min(buf.length, 512);
  for (let i = 0; i < checkLen; i++) {
    if (buf[i] === 0x00) {
      return true;
    }
  }
  return false;
}

/**
 * Scans a file's content line-by-line for secret patterns and returns sanitized finding metadata.
 * Complete secret values are NEVER recorded or exposed.
 */
export function scanContentForSecrets(
  content: string,
  filePath: string,
  rules: SecretDetectorRule[] = SECRET_DETECTOR_RULES
): SecretFinding[] {
  const findings: SecretFinding[] = [];
  const lines = content.split('\n');

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];

    for (const rule of rules) {
      rule.pattern.lastIndex = 0; // Reset regex state
      let match: RegExpExecArray | null;

      while ((match = rule.pattern.exec(line)) !== null) {
        const rawSecret = match[1] || match[0];
        const mask = rule.formatMask(rawSecret);

        // Build safe redacted excerpt: replace matched secret in the line with the safe mask
        const redactedExcerpt = line.replace(rawSecret, mask).trim();

        findings.push({
          id: `sec_${rule.id}_${lineIdx + 1}_${match.index}`,
          detectorType: rule.name,
          filePath,
          lineNumber: lineIdx + 1,
          columnNumber: match.index + 1,
          redactedExcerpt,
          mask,
          confidence: rule.confidence,
          severity: rule.severity,
        });
      }
    }
  }

  return findings;
}

/**
 * Recursively scans directory text files for credential patterns while excluding binary files
 * and applying safe file size limits.
 * "Done when: known synthetic secrets are detected without printing their complete values."
 */
export async function scanDirectoryForSecrets(
  targetDir: string,
  options: SecretScanOptions = {}
): Promise<SecretScanResult> {
  const maxSizeBytes = options.maxFileSizeBytes || 1024 * 1024; // 1MB limit
  const rules = options.customRules || SECRET_DETECTOR_RULES;

  const result: SecretScanResult = {
    findings: [],
    scannedFilesCount: 0,
    skippedFilesCount: 0,
    errors: [],
  };

  if (!fs.existsSync(targetDir)) {
    return result;
  }

  function walk(currentDir: string) {
    try {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(targetDir, fullPath).replace(/\\/g, '/');

        if (entry.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry.name)) {
            continue;
          }
          walk(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();

          // 1. Skip known binary extensions
          if (BINARY_EXTENSIONS.has(ext)) {
            result.skippedFilesCount++;
            continue;
          }

          try {
            const stat = fs.statSync(fullPath);

            // 2. Skip files exceeding maximum size limit
            if (stat.size > maxSizeBytes) {
              result.skippedFilesCount++;
              continue;
            }

            // 3. Inspect buffer header for binary content
            const buffer = fs.readFileSync(fullPath);
            if (isBinaryBuffer(buffer)) {
              result.skippedFilesCount++;
              continue;
            }

            // 4. Scan valid text file
            const textContent = buffer.toString('utf-8');
            const fileFindings = scanContentForSecrets(textContent, relativePath, rules);
            result.findings.push(...fileFindings);
            result.scannedFilesCount++;
          } catch (fileErr: any) {
            result.errors.push(`Could not scan file ${relativePath}: ${fileErr.message}`);
          }
        }
      }
    } catch (dirErr: any) {
      result.errors.push(`Directory read error ${currentDir}: ${dirErr.message}`);
    }
  }

  walk(targetDir);
  return result;
}
