/**
 * Prohibited Code Pattern Scanner & AST Security Guard for Patches (Contribution 12)
 *
 * Enforces zero-trust code scanning on all proposed diffs before sandbox execution,
 * blocking remote command execution, prototype pollution, secret writes, and protected file mutations.
 */

export interface SecurityViolation {
  rule: string;
  severity: 'critical' | 'high' | 'medium';
  message: string;
  matchedText?: string;
}

export interface SecurityGuardScanResult {
  allowed: boolean;
  violations: SecurityViolation[];
  scannedLinesCount: number;
}

export class SecurityPatchGuard {
  private static readonly CRITICAL_PATTERNS: Array<{ rule: string; regex: RegExp; message: string }> = [
    {
      rule: 'security/shell-spawn',
      regex: /\b(child_process|execSync|spawnSync|execFile|fork)\b/i,
      message: 'Direct child process execution or command spawning is prohibited in patches.',
    },
    {
      rule: 'security/dynamic-eval',
      regex: /\b(eval\s*\(|new\s+Function\s*\()/i,
      message: 'Dynamic code evaluation via eval() or new Function() is strictly blocked.',
    },
    {
      rule: 'security/prototype-pollution',
      regex: /(__proto__|constructor\s*\[\s*['"]prototype['"]\s*\])/i,
      message: 'Potential prototype pollution pattern detected.',
    },
    {
      rule: 'security/remote-downloader',
      regex: /\b(curl\s+|wget\s+|powershell\s+-enc|bash\s+-c)\b/i,
      message: 'Suspicious remote download or shell interpreter invocation detected.',
    },
    {
      rule: 'security/path-traversal-system',
      regex: /(\/etc\/passwd|C:\\Windows\\System32|\.\.\/\.\.\/)/i,
      message: 'System directory path traversal or escaping repository boundary detected.',
    },
    {
      rule: 'security/secret-credential-hardcode',
      regex: /\b(sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{30,}|AIza[0-9A-Za-z-_]{35})\b/,
      message: 'Attempted hardcoding of sensitive API key or token in source diff.',
    },
  ];

  private static readonly PROTECTED_FILES: string[] = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.development',
    '.git',
    '.github/workflows',
    'id_rsa',
    'package-lock.json', // Protected from arbitrary direct manual diffs
  ];

  /**
   * Scans a patch and its target files for security policy violations.
   */
  public static scanPatch(
    unifiedDiff: string,
    targetFiles: string[] = []
  ): SecurityGuardScanResult {
    const violations: SecurityViolation[] = [];
    const lines = unifiedDiff.split('\n');

    // 1. Protected Files Boundary Check
    for (const file of targetFiles) {
      const normalized = file.replace(/\\/g, '/').toLowerCase();
      for (const protectedPattern of this.PROTECTED_FILES) {
        if (normalized === protectedPattern || normalized.startsWith(`${protectedPattern}/`)) {
          violations.push({
            rule: 'security/protected-file-target',
            severity: 'critical',
            message: `Patch targets protected configuration file or directory: "${file}".`,
          });
        }
      }
    }

    // 2. Scan added lines against critical security patterns
    for (const line of lines) {
      if (!line.startsWith('+') || line.startsWith('+++')) {
        continue;
      }
      const code = line.substring(1);

      for (const pattern of this.CRITICAL_PATTERNS) {
        const match = code.match(pattern.regex);
        if (match) {
          violations.push({
            rule: pattern.rule,
            severity: 'critical',
            message: pattern.message,
            matchedText: match[0],
          });
        }
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      scannedLinesCount: lines.length,
    };
  }
}
