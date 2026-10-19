import type {
  DependencyInventory,
  SecurityGateEvaluation,
  SecurityPreflightReport,
  SecretFinding,
  VulnerabilityFinding,
} from '../types/security.ts';
import type { RawScanResult } from './vulnerability-scanner.ts';
import { normalizeOsvAdvisory } from './vulnerability-normalizer.ts';

export interface BuildReportParams {
  id?: string;
  projectId: string;
  runId?: string;
  inventory: DependencyInventory;
  rawScan: RawScanResult;
  secrets?: SecretFinding[];
  gateEvaluation?: SecurityGateEvaluation;
  scannedFilesCount?: number;
  skippedFilesCount?: number;
  scanDurationMs?: number;
}

/**
 * Builds a structured, auditable SecurityPreflightReport separating known findings
 * from packages that could not be checked.
 * "Done when: users can distinguish known findings from packages that could not be checked."
 */
export function buildSecurityPreflightReport(params: BuildReportParams): SecurityPreflightReport {
  const {
    id = `sec_rep_${params.runId || params.projectId}_${Date.now()}`,
    projectId,
    runId,
    inventory,
    rawScan,
    secrets = [],
    gateEvaluation = {
      passed: true,
      blocked: false,
      action: 'proceed',
      reasons: [],
      isIncomplete: false,
      totalVulnerabilities: 0,
      blockingVulnerabilitiesCount: 0,
      totalSecrets: 0,
      blockingSecretsCount: 0,
      evaluatedAt: new Date().toISOString(),
    },
    scannedFilesCount = 0,
    skippedFilesCount = 0,
    scanDurationMs = 0,
  } = params;

  const now = new Date().toISOString();

  // 1. Normalize all discovered vulnerabilities
  const vulnerabilities: VulnerabilityFinding[] = rawScan.vulnerabilities.map(({ dependency, advisory }) =>
    normalizeOsvAdvisory(advisory, dependency, now)
  );

  // 2. Separate uncheckable packages
  const uncheckablePackages = [...rawScan.uncheckablePackages];

  return {
    id,
    projectId,
    runId,
    gateEvaluation,
    inventory,
    vulnerabilities,
    secrets,
    uncheckablePackages,
    scannedFilesCount,
    skippedFilesCount,
    scanDurationMs,
    createdAt: now,
  };
}

/**
 * Generates an accessible, structured Markdown document for export or CI logging.
 */
export function renderSecurityReportMarkdown(report: SecurityPreflightReport): string {
  const lines: string[] = [];

  lines.push('# Dependency & Security Preflight Report');
  lines.push(`- **Project ID**: \`${report.projectId}\``);
  if (report.runId) lines.push(`- **Run ID**: \`${report.runId}\``);
  lines.push(`- **Scan Timestamp**: ${report.createdAt}`);
  lines.push(`- **Gate Status**: **${report.gateEvaluation.action.toUpperCase()}** (${report.gateEvaluation.passed ? 'PASSED' : 'BLOCKED'})`);
  lines.push(`- **Total Dependencies Inspected**: ${report.inventory.totalDependencies}`);
  lines.push('');

  // Section 1: Known Vulnerabilities
  lines.push(`## 1. Known Vulnerabilities Detected (${report.vulnerabilities.length})`);
  if (report.vulnerabilities.length === 0) {
    lines.push('No known vulnerable dependencies detected among verifiable packages.');
  } else {
    lines.push('| Severity | Package | Affected Version | Advisory | Remediation Guidance |');
    lines.push('| :--- | :--- | :--- | :--- | :--- |');
    for (const v of report.vulnerabilities) {
      lines.push(
        `| **${v.severity.toUpperCase()}** | \`${v.packageName}\` | \`${v.packageVersion}\` | [${v.advisoryId}](https://osv.dev/vulnerability/${v.advisoryId}) | ${v.remediationGuidance} |`
      );
    }
  }
  lines.push('');

  // Section 2: Packages That Could Not Be Checked
  lines.push(`## 2. Packages That Could Not Be Checked (${report.uncheckablePackages.length})`);
  if (report.uncheckablePackages.length === 0) {
    lines.push('All dependencies were successfully resolved and verified against the advisory database.');
  } else {
    lines.push('> [!WARNING]');
    lines.push('> The following packages could not be verified against the vulnerability database. Do NOT assume uncheckable packages are secure.');
    lines.push('');
    lines.push('| Package | Version Specified | Reason Why Package Could Not Be Checked |');
    lines.push('| :--- | :--- | :--- |');
    for (const u of report.uncheckablePackages) {
      lines.push(`| \`${u.name}\` | \`${u.version}\` | ${u.reason} |`);
    }
  }
  lines.push('');

  // Section 3: Exposed Secrets
  if (report.secrets.length > 0) {
    lines.push(`## 3. Accidental Secrets & Token Leaks Detected (${report.secrets.length})`);
    lines.push('| Severity | Detector | File | Line | Redacted Excerpt |');
    lines.push('| :--- | :--- | :--- | :--- | :--- |');
    for (const s of report.secrets) {
      lines.push(`| **${s.severity.toUpperCase()}** | ${s.detectorType} | \`${s.filePath}\` | ${s.lineNumber} | \`${s.redactedExcerpt}\` |`);
    }
  }

  return lines.join('\n');
}
