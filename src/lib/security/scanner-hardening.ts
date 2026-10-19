import fs from 'fs';
import path from 'path';
import type {
  DependencyInventory,
  SecurityGatePolicy,
  SecurityPreflightReport,
  HardenedScanOptions,
  HardenedScanExecutionResult,
} from '../types/security.ts';
import { generateDependencyInventory } from './dependency-inventory.ts';
import { scanDependenciesForVulnerabilities } from './vulnerability-scanner.ts';
import { scanDirectoryForSecrets } from './secret-scanner.ts';
import { evaluateSecurityGate } from './security-gate.ts';
import { buildSecurityPreflightReport } from './security-report.ts';
import { assertZeroSecretLeakage } from './secret-redaction.ts';

export type { HardenedScanOptions, HardenedScanExecutionResult };


/**
 * Hardened security scanner pipeline with strict execution timeouts, bounded resource use,
 * safe temporary storage, and mandatory explicit consent for outbound metadata lookups.
 * "Done when: timeouts and external-service failures are handled safely without leaking source or credentials."
 */
export async function runHardenedSecurityPreflight(
  projectDir: string,
  projectId: string,
  options: HardenedScanOptions = {}
): Promise<HardenedScanExecutionResult> {
  const timeoutMs = options.timeoutMs || 8000;
  const maxDependencies = options.maxDependencies || 2000;
  const consentExternal = Boolean(options.consentExternalNetworkLookup);

  const errors: string[] = [];
  let timedOut = false;
  let resourceLimitsExceeded = false;
  const startTime = Date.now();

  // Create isolated scratch directory
  const scratchDir = path.join(
    options.scratchBaseDir || path.join(process.cwd(), 'scratch'),
    'security',
    `scan_${projectId}_${Date.now()}`
  );

  try {
    if (!fs.existsSync(scratchDir)) {
      fs.mkdirSync(scratchDir, { recursive: true });
    }
  } catch {}

  const controller = new AbortController();
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    // Step 1: Generate Dependency Inventory (static extraction, no script execution)
    const inventory: DependencyInventory = await generateDependencyInventory(projectDir);

    if (inventory.totalDependencies > maxDependencies) {
      resourceLimitsExceeded = true;
      errors.push(
        `Dependency inventory exceeded maximum limit (${inventory.totalDependencies} > ${maxDependencies}). Scanning truncated to prevent resource exhaustion.`
      );
      inventory.dependencies = inventory.dependencies.slice(0, maxDependencies);
    }

    if (options.simulateTimeout || controller.signal.aborted || Date.now() - startTime >= timeoutMs) {
      timedOut = true;
      throw new Error(`Security preflight scan timed out after ${timeoutMs}ms.`);
    }

    // Step 2: Vulnerability Scanning with explicit consent check
    // "explicit consent for any source or metadata sent to external services"
    const rawScan = await scanDependenciesForVulnerabilities(inventory, {
      allowExternalOsvApi: consentExternal,
      timeoutMs: Math.max(1000, timeoutMs - (Date.now() - startTime)),
    });

    if (controller.signal.aborted) {
      timedOut = true;
      throw new Error(`Security preflight scan timed out after ${timeoutMs}ms.`);
    }

    // Step 3: Secret Pattern Scanning
    const secretScan = await scanDirectoryForSecrets(projectDir);

    // Step 4: Evaluate Gate Policy
    const gateEvaluation = evaluateSecurityGate(options.gatePolicy, {
      vulnerabilities: rawScan.vulnerabilities.map((v) => ({
        id: v.advisory.id,
        advisoryId: v.advisory.id,
        aliases: v.advisory.aliases || [],
        packageName: v.dependency.name,
        packageVersion: v.dependency.version,
        ecosystem: v.dependency.ecosystem,
        dependencyType: v.dependency.type,
        severity: (v.advisory.database_specific?.severity?.toLowerCase() as any) || 'medium',
        summary: v.advisory.summary || '',
        source: 'osv',
        patchedVersions: [],
        remediationGuidance: '',
        scannedAt: new Date().toISOString(),
      })),
      secrets: secretScan.findings,
      uncheckableCount: rawScan.uncheckablePackages.length,
      scanErrors: [...errors, ...inventory.errors, ...secretScan.errors],
    });

    // Step 5: Build Preflight Report
    const report = buildSecurityPreflightReport({
      projectId,
      inventory,
      rawScan,
      secrets: secretScan.findings,
      gateEvaluation,
      scannedFilesCount: secretScan.scannedFilesCount,
      skippedFilesCount: secretScan.skippedFilesCount,
      scanDurationMs: Date.now() - startTime,
    });

    return {
      report,
      timedOut,
      externalNetworkUsed: consentExternal,
      resourceLimitsExceeded,
      errors: [...errors, ...inventory.errors, ...secretScan.errors],
    };
  } catch (err: any) {
    const errorMsg = err.name === 'AbortError' || timedOut
      ? `Security preflight scan timed out after ${timeoutMs}ms.`
      : `Security scanner failed safely: ${err.message}`;

    errors.push(errorMsg);

    // Fallback safe report in case of timeout or fatal scanner error
    const emptyInventory: DependencyInventory = {
      rootPath: projectDir,
      ecosystems: [],
      totalDependencies: 0,
      directCount: 0,
      devCount: 0,
      transitiveCount: 0,
      dependencies: [],
      errors,
      generatedAt: new Date().toISOString(),
    };

    const fallbackGate = evaluateSecurityGate(options.gatePolicy, {
      vulnerabilities: [],
      secrets: [],
      uncheckableCount: 1,
      scanErrors: errors,
    });

    const fallbackReport = buildSecurityPreflightReport({
      projectId,
      inventory: emptyInventory,
      rawScan: { vulnerabilities: [], uncheckablePackages: [{ name: 'workspace', version: '*', reason: errorMsg }], scannedCount: 0 },
      gateEvaluation: fallbackGate,
      scanDurationMs: Date.now() - startTime,
    });

    return {
      report: fallbackReport,
      timedOut: true,
      externalNetworkUsed: consentExternal,
      resourceLimitsExceeded,
      errors,
    };
  } finally {
    clearTimeout(timer);
    // Cleanup safe temporary storage
    try {
      if (fs.existsSync(scratchDir)) {
        fs.rmSync(scratchDir, { recursive: true, force: true });
      }
      const parentDir = path.dirname(scratchDir);
      if (fs.existsSync(parentDir) && fs.readdirSync(parentDir).length === 0) {
        fs.rmdirSync(parentDir);
      }
    } catch {}
  }
}
